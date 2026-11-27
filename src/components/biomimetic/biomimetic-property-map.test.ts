import { strict as assert } from "node:assert";
import { test } from "node:test";
import { ContourLayer, HeatmapLayer, HexagonLayer } from "@deck.gl/aggregation-layers";
import { ScatterplotLayer } from "@deck.gl/layers";
import { createLayers } from "./biomimetic-property-map";
import type { GeoIntelligence } from "../../app/api/geo/intelligence/route";

const center = { lat: 51, lng: 17 };
const data: GeoIntelligence = {
  elevation: 125,
  solar: { maxSunshineHoursPerYear: 1200, areaMeters2: 90, maxArrayPanelsCount: 20, maxPowerKw: 8 },
  airQuality: { aqiDisplay: "42", category: "Dobra" },
  pollen: [{ indexInfo: { value: 3 } }],
  weather: { temperature: 18, conditions: "Słonecznie" },
  timeZone: null,
  aerialView: null,
};

test("warstwy powstają natychmiast i uwzględniają dane punktowe", () => {
  for (const id of ["solar", "air", "pollen"] as const) {
    const fallback = createLayers(id, center)[0];
    const measured = createLayers(id, center, data)[0];
    assert.ok(fallback instanceof HeatmapLayer);
    assert.ok(measured instanceof HeatmapLayer);
    assert.ok(Array.isArray(measured.props.data));
    assert.ok(Array.isArray(fallback.props.data));
    const moved = createLayers(id, { lat: 52, lng: 18 }, data)[0];
    assert.ok(Array.isArray(moved.props.data));
    assert.equal(measured.props.data.length, 576);
    assert.notEqual(measured.props.data[0].weight, fallback.props.data[0].weight);
    assert.notDeepEqual(measured.props.data[0].position, moved.props.data[0].position);
  }
});

test("teren, pogoda i zasięg używają właściwych warstw i punktu", () => {
  const terrain = createLayers("terrain", center, data)[0];
  assert.ok(terrain instanceof ContourLayer);
  assert.ok(terrain.props.contours.some((contour: { threshold: number | [number, number] }) => contour.threshold === 125));
  assert.ok(terrain.props.contours.some((contour: { threshold: number | [number, number] }) => Array.isArray(contour.threshold)));
  const weather = createLayers("weather", center, data)[0];
  assert.ok(weather instanceof HexagonLayer);
  assert.equal(weather.props.extruded, true);
  const range = createLayers("range", center)[0];
  assert.ok(range instanceof ScatterplotLayer);
  assert.ok(Array.isArray(range.props.data));
  assert.deepEqual(range.props.data.map((zone: { radius: number }) => zone.radius), [1500, 1000, 500]);
  assert.deepEqual(createLayers("bicycling", center), []);
  assert.deepEqual(createLayers(null, center), []);
});

test("warstwy cieplne i terenowe mają niezerowe wagi", () => {
  for (const id of ["solar", "air", "pollen"] as const) {
    const layer = createLayers(id, center, {
      ...data,
      solar: { ...data.solar!, maxSunshineHoursPerYear: 0 },
      airQuality: { ...data.airQuality!, aqiDisplay: "0" },
      pollen: [{ indexInfo: { value: 0 } }],
    })[0];
    assert.ok(layer instanceof HeatmapLayer);
    assert.equal(layer.props.radiusPixels, 60);
    assert.ok(Array.isArray(layer.props.data));
    assert.equal(typeof layer.props.getWeight, "function");
    const getWeight = layer.props.getWeight;
    assert.ok(layer.props.data.every((point: { position: [number, number]; weight: number }) => getWeight(point, { index: 0, data: layer.props.data, target: [] }) > 0));
  }

  const terrain = createLayers("terrain", center, { ...data, elevation: 0 })[0];
  assert.ok(terrain instanceof ContourLayer);
  assert.equal(typeof terrain.props.getWeight, "function");
  const point = { position: [center.lng, center.lat] as [number, number], weight: 0 };
  const context = { index: 0, data: [point], target: [] };
  assert.notEqual(terrain.props.getWeight(point, context), 0);
  assert.equal(terrain.props.getWeight({ ...point, weight: -10 }, context), -10);
});
