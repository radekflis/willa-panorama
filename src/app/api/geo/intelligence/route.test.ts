import { strict as assert } from "node:assert";
import { test } from "node:test";
import { POST } from "./route";

test("analizuje niezależne usługi, buforuje wyniki i ponawia błędy", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  const originalKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  let now = 1_000_000;
  let failAir = false;
  let noSolar = false;
  process.env.GOOGLE_MAPS_SERVER_KEY = "test-key";
  Date.now = () => now;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes("/elevation/")) return Response.json({ status: "OK", results: [{ elevation: 125 }] });
    if (url.includes("solar.googleapis.com")) return noSolar ? new Response(null, { status: 404 }) : Response.json({ solarPotential: { maxSunshineHoursPerYear: 1200, wholeRoofStats: { areaMeters2: 90 }, maxArrayPanelsCount: 20 } });
    if (url.includes("airquality.googleapis.com")) {
      return failAir ? new Response(null, { status: 503 }) : Response.json({ indexes: [{ aqiDisplay: "42", category: "Dobra" }] });
    }
    if (url.includes("pollen.googleapis.com")) return Response.json({ dailyInfo: [{ pollenTypeInfo: [{ displayName: "Trawy", indexInfo: { category: "Niski" } }] }] });
    if (url.includes("weather.googleapis.com")) return Response.json({ temperature: { degrees: 18 }, weatherCondition: { description: { text: "Słonecznie" } } });
    throw new Error("Nieoczekiwany adres API");
  };
  const request = (lat: unknown, lng: unknown) => new Request("http://localhost/api/geo/intelligence", {
    method: "POST",
    body: JSON.stringify({ lat, lng }),
  });
  try {
    assert.equal((await POST(request(91, 20))).status, 400);
    assert.equal((await POST(request("51", 20))).status, 400);
    assert.equal(calls.length, 0);

    const [first, concurrent] = await Promise.all([POST(request(51.12341, 17.12341)), POST(request(51.12342, 17.12342))]);
    const data = await first.json();
    assert.deepEqual(await concurrent.json(), data);
    assert.deepEqual(data, {
      elevation: 125,
      solar: { maxSunshineHoursPerYear: 1200, areaMeters2: 90, maxArrayPanelsCount: 20 },
      airQuality: { aqiDisplay: "42", category: "Dobra" },
      pollen: [{ displayName: "Trawy", indexInfo: { category: "Niski" } }],
      weather: { temperature: 18, conditions: "Słonecznie" },
    });
    assert.equal(calls.length, 5);
    const airCall = calls.find(({ url }) => url.includes("airquality.googleapis.com"));
    assert.equal(airCall?.init?.method, "POST");
    assert.deepEqual(JSON.parse(String(airCall?.init?.body)), { location: { latitude: 51.12341, longitude: 17.12341 } });

    await POST(request(51.12342, 17.12342));
    assert.equal(calls.length, 5);
    now += 12 * 60 * 60 * 1000;
    await POST(request(51.12342, 17.12342));
    assert.equal(calls.length, 10);

    failAir = true;
    const partial = await (await POST(request(52, 18))).json();
    assert.equal(partial.airQuality, null);
    assert.equal(partial.elevation, 125);
    failAir = false;
    assert.equal((await (await POST(request(52, 18))).json()).airQuality.aqiDisplay, "42");
    assert.equal(calls.length, 20);
    noSolar = true;
    assert.equal((await (await POST(request(53, 19))).json()).solar, null);
    await POST(request(53, 19));
    assert.equal(calls.length, 25);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
    if (originalKey === undefined) delete process.env.GOOGLE_MAPS_SERVER_KEY;
    else process.env.GOOGLE_MAPS_SERVER_KEY = originalKey;
  }
});
