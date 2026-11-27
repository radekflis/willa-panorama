import { strict as assert } from "node:assert";
import { test, type TestContext } from "node:test";
import { fetchWeatherForecast, FuturisticMapLayers, openWeatherTileUrl } from "./futuristicLayers";

class FakeImageMapType {
  constructor(public options: google.maps.ImageMapTypeOptions) {}
}

function createMap(initialZoom = 14) {
  const overlays: FakeImageMapType[] = [];
  let tilt = 55;
  let zoom = initialZoom;
  const map = {
    overlayMapTypes: {
      getArray: () => overlays,
      push: (layer: FakeImageMapType) => overlays.push(layer),
      removeAt: (index: number) => overlays.splice(index, 1),
    },
    getTilt: () => tilt,
    setTilt: (value: number) => { tilt = value; },
    getZoom: () => zoom,
    setZoom: (value: number) => { zoom = value; },
  };
  return { map: map as unknown as google.maps.Map, overlays, getTilt: () => tilt, getZoom: () => zoom };
}

function mockGoogle(t: TestContext) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "google");
  Object.defineProperty(globalThis, "google", {
    configurable: true,
    value: { maps: { ImageMapType: FakeImageMapType, Size: class {} } },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "google", previous);
    else Reflect.deleteProperty(globalThis, "google");
  });
}

function withoutOpenWeatherKey(t: TestContext) {
  const previous = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
  delete process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
    else process.env.NEXT_PUBLIC_OPENWEATHER_KEY = previous;
  });
}

const point = { x: 2, y: 3, equals: () => false };
const transparentTile = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

test("radar uses RainViewer frames and stops without removing other overlays", async (t) => {
  mockGoogle(t);
  withoutOpenWeatherKey(t);
  t.mock.method(globalThis, "fetch", async () => Response.json({
    host: "https://tiles.example",
    radar: { past: [{ time: 1700000000, path: "/radar/frame" }], nowcast: [] },
  }));
  const { map, overlays, getZoom } = createMap();
  const other = new FakeImageMapType({});
  overlays.push(other);
  const layers = new FuturisticMapLayers(map);
  let timestamp = "";
  try {
    assert.equal(await layers.toggleLayer("weather", (value) => { timestamp = value; }), "weather");
    assert.equal(getZoom(), 6);
    const options = overlays[1].options;
    assert.equal(options.maxZoom, 7);
    assert.equal(options.getTileUrl?.(point, 7), "https://tiles.example/radar/frame/256/7/2/3/2/1_1.png");
    assert.equal(options.getTileUrl?.(point, 8), transparentTile);
    assert.equal(Reflect.apply(options.getTileUrl!, null, [null, 7]), transparentTile);
    assert.match(timestamp, /\(Na żywo\)$/);
    assert.equal(await layers.toggleLayer("weather", (value) => { timestamp = value; }), "none");
    assert.equal(timestamp, "");
    assert.deepEqual(overlays, [other]);
  } finally {
    layers.clearAll();
  }
});

test("NASA and terrain layers use their own overlays and restore tilt", async (t) => {
  mockGoogle(t);
  withoutOpenWeatherKey(t);
  const { map, overlays, getTilt } = createMap();
  const layers = new FuturisticMapLayers(map);
  try {
    await layers.toggleLayer("air");
    const date = new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0];
    assert.equal(overlays[0].options.getTileUrl?.(point, 9),
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/9/3/2.jpg`);
    assert.equal(overlays[0].options.getTileUrl?.(point, 10), transparentTile);
    assert.equal(Reflect.apply(overlays[0].options.getTileUrl!, null, [null, 9]), transparentTile);
    await layers.toggleLayer("terrain");
    assert.equal(overlays.length, 2);
    assert.equal(getTilt(), 45);
    await new Promise((resolve) => setTimeout(resolve, 450));
    assert.equal(overlays.length, 1);
    assert.equal(overlays[0].options.name, "ElevationContours");
    layers.clearAll();
    assert.equal(getTilt(), 55);
    assert.equal(overlays.length, 0);
  } finally {
    layers.clearAll();
  }
});

test("radar leaves supported zoom unchanged and ignores nowcast frames", async (t) => {
  mockGoogle(t);
  withoutOpenWeatherKey(t);
  t.mock.method(globalThis, "fetch", async () => Response.json({
    host: "https://tiles.example",
    radar: {
      past: [{ time: 1700000000, path: "/radar/past" }],
      nowcast: [{ time: 1700000600, path: "/radar/forecast" }],
    },
  }));
  const { map, overlays, getZoom } = createMap(7);
  const layers = new FuturisticMapLayers(map);
  let timestamp = "";
  try {
    await layers.toggleLayer("weather", (value) => { timestamp = value; });
    assert.equal(getZoom(), 7);
    await new Promise((resolve) => setTimeout(resolve, 750));
    assert.equal(overlays[0].options.name, "Weather_1700000000");
    assert.match(timestamp, /\(Na żywo\)$/);
  } finally {
    layers.clearAll();
  }
});

test("radar requires past frames even if a forecast is present", async (t) => {
  mockGoogle(t);
  withoutOpenWeatherKey(t);
  t.mock.method(globalThis, "fetch", async () => Response.json({
    host: "https://tiles.example",
    radar: { nowcast: [{ time: 1700000600, path: "/radar/forecast" }] },
  }));
  const { map, overlays } = createMap();
  const layers = new FuturisticMapLayers(map);
  await assert.rejects(layers.toggleLayer("weather"), /Brak klatek radaru/);
  assert.equal(overlays.length, 0);
});

test("late radar responses cannot replace a newer layer", async (t) => {
  mockGoogle(t);
  withoutOpenWeatherKey(t);
  let resolveResponse!: (response: Response) => void;
  t.mock.method(globalThis, "fetch", () => new Promise<Response>((resolve) => { resolveResponse = resolve; }));
  const { map, overlays, getZoom } = createMap();
  const layers = new FuturisticMapLayers(map);
  try {
    const pending = layers.toggleLayer("weather");
    assert.equal(getZoom(), 6);
    await layers.toggleLayer("air");
    resolveResponse(Response.json({
      host: "https://tiles.example",
      radar: { past: [{ time: 1700000000, path: "/radar/frame" }] },
    }));
    await pending;
    assert.equal(overlays.length, 1);
    assert.equal(overlays[0].options.name, "AirQualityNASA");
  } finally {
    layers.clearAll();
  }
});

test("radar failures are reported and do not leave a layer active", async (t) => {
  mockGoogle(t);
  withoutOpenWeatherKey(t);
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  const { map, overlays } = createMap();
  const layers = new FuturisticMapLayers(map);
  await assert.rejects(layers.toggleLayer("weather"), /HTTP 503/);
  assert.equal(overlays.length, 0);
  assert.equal(await layers.toggleLayer("weather").catch(() => "error"), "error");
});

test("OpenWeather tiles support every layer and replace overlays after double buffering", async (t) => {
  mockGoogle(t);
  const previous = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
  process.env.NEXT_PUBLIC_OPENWEATHER_KEY = "test-key";
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
    else process.env.NEXT_PUBLIC_OPENWEATHER_KEY = previous;
  });
  assert.equal(openWeatherTileUrl("temp_new", point, 14, "a key"),
    "https://tile.openweathermap.org/map/temp_new/14/2/3.png?appid=a%20key");
  assert.equal(openWeatherTileUrl("wind_new", { x: -1, y: 1 }, 2, "key"),
    "https://tile.openweathermap.org/map/wind_new/2/3/1.png?appid=key");
  const { map, overlays, getZoom } = createMap();
  const layers = new FuturisticMapLayers(map);
  try {
    await layers.toggleLayer("weather");
    assert.equal(getZoom(), 14);
    assert.equal(overlays[0].options.name, "OpenWeather_temp_new");
    assert.equal(overlays[0].options.getTileUrl?.(point, 14),
      "https://tile.openweathermap.org/map/temp_new/14/2/3.png?appid=test-key");
    await layers.setWeatherLayer("clouds_new");
    assert.equal(overlays.length, 2);
    assert.equal(overlays[1].options.name, "OpenWeather_clouds_new");
    await new Promise((resolve) => setTimeout(resolve, 450));
    assert.deepEqual(overlays.map((overlay) => overlay.options.name), ["OpenWeather_clouds_new"]);
  } finally {
    layers.clearAll();
  }
});

test("Open-Meteo requests hourly history and forecast for the map point", async (t) => {
  let requestUrl = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    requestUrl = String(input);
    return Response.json({
      utc_offset_seconds: 3600,
      hourly: {
        time: ["2025-01-01T00:00"],
        temperature_2m: [3.5],
        precipitation: [0.2],
        wind_speed_10m: [12],
        cloud_cover: [80],
      },
    });
  });
  const hours = await fetchWeatherForecast({ lat: 50.1, lng: 16.2 }, new AbortController().signal);
  const url = new URL(requestUrl);
  assert.equal(url.origin + url.pathname, "https://api.open-meteo.com/v1/forecast");
  assert.equal(url.searchParams.get("latitude"), "50.1");
  assert.equal(url.searchParams.get("longitude"), "16.2");
  assert.equal(url.searchParams.get("past_days"), "7");
  assert.equal(url.searchParams.get("forecast_days"), "8");
  assert.deepEqual(hours[0], {
    time: "2025-01-01T00:00",
    timestamp: Date.parse("2024-12-31T23:00:00Z"),
    temperature: 3.5,
    precipitation: 0.2,
    windSpeed: 12,
    cloudCover: 80,
  });
});
