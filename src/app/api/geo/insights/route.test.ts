import { strict as assert } from "node:assert";
import { test } from "node:test";
import { POST } from "./route";

test("pobiera liczniki dla pięciu kategorii i sygnalizuje błędy usług", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  let fail = false;
  process.env.GOOGLE_MAPS_SERVER_KEY = "test-key";
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    const body = JSON.parse(String(init?.body));
    const types: string[] = body.filter.typeFilter.includedTypes;
    if (fail && types.includes("park")) return new Response(null, { status: 503 });
    return Response.json({ count: types.includes("school") ? "0" : "14" });
  };
  const request = (lat: unknown, lng: unknown) => new Request("http://localhost/api/geo/insights", {
    method: "POST",
    body: JSON.stringify({ lat, lng }),
  });
  try {
    assert.equal((await POST(request(91, 17))).status, 400);
    assert.equal(calls.length, 0);
    const response = await POST(request(51, 17));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { restaurants: 14, schools: 0, health: 14, shops: 14, parks: 14 });
    assert.equal(calls.length, 5);
    for (const call of calls) {
      assert.equal(call.url, "https://areainsights.googleapis.com/v1:computeInsights");
      assert.deepEqual(JSON.parse(String(call.init?.body)).filter.locationFilter.circle, {
        latLng: { latitude: 51, longitude: 17 }, radius: 1000,
      });
    }
    fail = true;
    assert.equal((await POST(request(51, 17))).status, 502);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GOOGLE_MAPS_SERVER_KEY;
    else process.env.GOOGLE_MAPS_SERVER_KEY = originalKey;
  }
});
