import { strict as assert } from "node:assert";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntelligenceDetails } from "./prop-tech-workspace";
import type { GeoIntelligence } from "../../app/api/geo/intelligence/route";

const data: GeoIntelligence = {
  elevation: 125,
  solar: { maxSunshineHoursPerYear: 1200, areaMeters2: 90, maxArrayPanelsCount: 20, maxPowerKw: 8 },
  airQuality: { aqiDisplay: "42", category: "Dobra", dominantPollutant: "pm25" },
  pollen: [
    { code: "TREE", inSeason: false },
    { code: "GRASS", indexInfo: { value: 3, category: "Umiarkowane" } },
    { code: "WEED" },
  ],
  weather: { temperature: 18, conditions: "Słonecznie" },
  timeZone: null,
  aerialView: null,
};

test("HUD pokazuje pomiar, zanieczyszczacz i liczbę paneli", () => {
  const air = renderToStaticMarkup(<IntelligenceDetails tab="air" data={data} />);
  assert.match(air, /42 · Dobra/);
  assert.match(air, /PM25/);
  const solar = renderToStaticMarkup(<IntelligenceDetails tab="solar" data={data} />);
  assert.match(solar, /20 szt\./);
  assert.match(solar, /90 m²/);
});

test("HUD odróżnia sezon pylenia od brakujących danych", () => {
  const html = renderToStaticMarkup(<IntelligenceDetails tab="pollen" data={data} />);
  assert.match(html, /Drzewa: 0\/5 — poza sezonem pylenia/);
  assert.match(html, /Trawy: 3\/5 · Umiarkowane/);
  assert.match(html, /Chwasty: Brak danych/);
});
