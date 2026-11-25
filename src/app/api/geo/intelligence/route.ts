import { NextResponse } from "next/server";

export type GeoIntelligence = {
  elevation: number | null;
  solar: {
    maxSunshineHoursPerYear: number | null;
    areaMeters2: number | null;
    maxArrayPanelsCount: number | null;
  } | null;
  airQuality: { aqiDisplay: string | null; category: string | null } | null;
  pollen: Array<{
    code?: string;
    displayName?: string;
    indexInfo?: { category?: string; value?: number };
    inSeason?: boolean;
  }> | null;
  weather: { temperature: number | null; conditions: string | null } | null;
};

const ttl = 12 * 60 * 60 * 1000;
const cache = new Map<string, { expires: number; data: GeoIntelligence }>();
const pending = new Map<string, Promise<GeoIntelligence>>();

async function lookup<T>(name: string, url: string, init?: RequestInit): Promise<T | null> {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function analyze(lat: number, lng: number, key: string): Promise<GeoIntelligence> {
  const location = `location.latitude=${lat}&location.longitude=${lng}`;
  const apiKey = encodeURIComponent(key);
  const results = await Promise.allSettled([
    lookup<{ status: string; results?: Array<{ elevation?: number }> }>(
      "Elevation", `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${apiKey}`,
    ).then((data) => {
      if (data && data.status !== "OK" && data.status !== "ZERO_RESULTS") throw new Error(`Elevation: ${data.status}`);
      return data?.results?.[0]?.elevation ?? null;
    }),
    lookup<{ solarPotential?: { maxSunshineHoursPerYear?: number; wholeRoofStats?: { areaMeters2?: number }; maxArrayPanelsCount?: number } }>(
      "Solar", `https://solar.googleapis.com/v1/buildingInsights:findClosest?${location}&requiredQuality=MEDIUM&key=${apiKey}`,
    ).then((data) => {
      const solar = data?.solarPotential;
      return solar ? {
        maxSunshineHoursPerYear: solar.maxSunshineHoursPerYear ?? null,
        areaMeters2: solar.wholeRoofStats?.areaMeters2 ?? null,
        maxArrayPanelsCount: solar.maxArrayPanelsCount ?? null,
      } : null;
    }),
    lookup<{ indexes?: Array<{ aqiDisplay?: string; category?: string }> }>(
      "Air Quality", `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: { latitude: lat, longitude: lng } }) },
    ).then((data) => {
      const index = data?.indexes?.[0];
      return index ? { aqiDisplay: index.aqiDisplay ?? null, category: index.category ?? null } : null;
    }),
    lookup<{ dailyInfo?: Array<{ pollenTypeInfo?: NonNullable<GeoIntelligence["pollen"]> }> }>(
      "Pollen", `https://pollen.googleapis.com/v1/forecast:lookup?${location}&days=1&languageCode=pl&key=${apiKey}`,
    ).then((data) => data?.dailyInfo?.[0]?.pollenTypeInfo ?? null),
    lookup<{ temperature?: { degrees?: number }; weatherCondition?: { description?: { text?: string } } }>(
      "Weather", `https://weather.googleapis.com/v1/currentConditions:lookup?${location}&languageCode=pl&key=${apiKey}`,
    ).then((data) => {
      if (!data || (!data.temperature && !data.weatherCondition)) return null;
      return { temperature: data.temperature?.degrees ?? null, conditions: data.weatherCondition?.description?.text ?? null };
    }),
  ] as const);

  const services = ["Elevation", "Solar", "Air Quality", "Pollen", "Weather"];
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      const detail = result.reason instanceof Error && /^(Elevation|Solar|Air Quality|Pollen|Weather): (HTTP \d{3}|[A-Z_]+)$/.test(result.reason.message)
        ? result.reason.message : services[index];
      console.error(`Analiza przestrzenna: nie udało się pobrać danych (${detail}).`);
    }
  }
  const data: GeoIntelligence = {
    elevation: results[0].status === "fulfilled" ? results[0].value : null,
    solar: results[1].status === "fulfilled" ? results[1].value : null,
    airQuality: results[2].status === "fulfilled" ? results[2].value : null,
    pollen: results[3].status === "fulfilled" ? results[3].value : null,
    weather: results[4].status === "fulfilled" ? results[4].value : null,
  };
  if (results.every((result) => result.status === "fulfilled")) {
    cache.set(`${lat.toFixed(4)},${lng.toFixed(4)}`, { expires: Date.now() + ttl, data });
  }
  return data;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("lat" in body) || !("lng" in body) ||
      typeof body.lat !== "number" || !Number.isFinite(body.lat) || body.lat < -90 || body.lat > 90 ||
      typeof body.lng !== "number" || !Number.isFinite(body.lng) || body.lng < -180 || body.lng > 180) {
    return NextResponse.json({ error: "Nieprawidłowe współrzędne." }, { status: 400 });
  }
  const key = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.error("Brak klucza Google Maps do analizy przestrzennej.");
    return NextResponse.json({ error: "Analiza przestrzenna jest niedostępna." }, { status: 503 });
  }

  const cacheKey = `${body.lat.toFixed(4)},${body.lng.toFixed(4)}`;
  for (const [entryKey, entry] of cache) {
    if (entry.expires <= Date.now()) cache.delete(entryKey);
  }
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return NextResponse.json(cached.data);
  let requestPromise = pending.get(cacheKey);
  if (!requestPromise) {
    requestPromise = analyze(body.lat, body.lng, key).finally(() => pending.delete(cacheKey));
    pending.set(cacheKey, requestPromise);
  }
  return NextResponse.json(await requestPromise);
}
