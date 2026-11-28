import { NextResponse } from "next/server";

export type GeoInsights = {
  restaurants: number;
  schools: number;
  health: number;
  shops: number;
  parks: number;
};

type InsightName = keyof GeoInsights;

function insightCount(data: unknown): number {
  if (!data || typeof data !== "object" || !("count" in data) ||
      (typeof data.count !== "string" && typeof data.count !== "number") ||
      !/^\d+$/.test(String(data.count))) {
    throw new Error("Nieprawidłowa odpowiedź Places Aggregate.");
  }
  const count = Number(data.count);
  if (!Number.isSafeInteger(count)) throw new Error("Nieprawidłowa liczba miejsc.");
  return count;
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
    console.error("Brak klucza Google Maps do Places Aggregate API.");
    return NextResponse.json({ error: "Statystyki miejsc są niedostępne." }, { status: 503 });
  }

  const categories: Array<{ name: InsightName; types: string[] }> = [
    { name: "restaurants", types: ["restaurant", "cafe"] },
    { name: "schools", types: ["school"] },
    { name: "health", types: ["pharmacy", "hospital"] },
    { name: "shops", types: ["supermarket"] },
    { name: "parks", types: ["park"] },
  ];
  const results = await Promise.allSettled(categories.map(async ({ types }) => {
    const response = await fetch("https://areainsights.googleapis.com/v1:computeInsights", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify({
        insights: ["INSIGHT_COUNT"],
        filter: {
          locationFilter: {
            circle: {
              latLng: { latitude: body.lat, longitude: body.lng },
              radius: 1000,
            },
          },
          typeFilter: { includedTypes: types },
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return insightCount(await response.json());
  }));

  const data: GeoInsights = { restaurants: 0, schools: 0, health: 0, shops: 0, parks: 0 };
  let failed = false;
  results.forEach((result, index) => {
    const category = categories[index];
    if (result.status === "fulfilled") data[category.name] = result.value;
    else {
      failed = true;
      console.error(`Places Aggregate: ${category.name} (${result.reason instanceof Error ? result.reason.message : "nieznany błąd"}).`);
    }
  });
  if (failed) return NextResponse.json({ error: "Nie udało się pobrać wszystkich statystyk infrastruktury." }, { status: 502 });
  return NextResponse.json(data);
}
