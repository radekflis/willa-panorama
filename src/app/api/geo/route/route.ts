import { NextResponse } from "next/server";

export type RouteMode = "DRIVE" | "WALK" | "BICYCLE";
export type RouteResult = { distanceMeters: number; durationSeconds: number };

type Point = { lat: number; lng: number };
type RoutesResponse = {
  routes?: Array<{ distanceMeters?: number; duration?: string }>;
};

function validPoint(value: unknown): value is Point {
  if (!value || typeof value !== "object" || !("lat" in value) || !("lng" in value)) return false;
  return typeof value.lat === "number" && Number.isFinite(value.lat) && value.lat >= -90 && value.lat <= 90
    && typeof value.lng === "number" && Number.isFinite(value.lng) && value.lng >= -180 && value.lng <= 180;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("origin" in body) || !("destination" in body) || !("mode" in body)
      || !validPoint(body.origin) || !validPoint(body.destination)
      || !["DRIVE", "WALK", "BICYCLE"].includes(String(body.mode))) {
    return NextResponse.json({ error: "Nieprawidłowa trasa." }, { status: 400 });
  }

  const key = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.error("Brak klucza Google Maps do Routes API.");
    return NextResponse.json({ error: "Wyznaczanie trasy jest niedostępne." }, { status: 503 });
  }

  const mode = body.mode as RouteMode;
  const waypoint = (point: Point) => ({ location: { latLng: { latitude: point.lat, longitude: point.lng } } });
  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
    },
    body: JSON.stringify({ origin: waypoint(body.origin), destination: waypoint(body.destination), travelMode: mode }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    console.error(`Routes API (${mode}): HTTP ${response.status}.`);
    return NextResponse.json({ error: "Nie udało się wyznaczyć trasy." }, { status: 502 });
  }

  const data = await response.json() as RoutesResponse;
  const route = data.routes?.[0];
  if (!route || typeof route.distanceMeters !== "number" || !route.duration) {
    return NextResponse.json({ error: "Nie znaleziono trasy." }, { status: 404 });
  }
  const seconds = Number.parseFloat(route.duration);
  if (!Number.isFinite(seconds)) return NextResponse.json({ error: "Nieprawidłowe dane trasy." }, { status: 502 });
  return NextResponse.json({ distanceMeters: route.distanceMeters, durationSeconds: seconds } satisfies RouteResult);
}
