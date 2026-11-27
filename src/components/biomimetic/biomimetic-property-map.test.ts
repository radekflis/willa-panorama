import { strict as assert } from "node:assert";
import { test } from "node:test";
import { heatmapTileUrl } from "./biomimetic-property-map";

test("adresy kafelków wskazują właściwe API, typ i znormalizowane współrzędne", () => {
  assert.equal(heatmapTileUrl("airquality", "UAQI_INDIGO_PERSIAN", { x: -1, y: 1 }, 2, "a+b"),
    "https://airquality.googleapis.com/v1/mapTypes/UAQI_INDIGO_PERSIAN/heatmapTiles/2/3/1?key=a%2Bb");
  for (const type of ["TREE_UPI", "GRASS_UPI", "WEED_UPI"]) {
    assert.equal(heatmapTileUrl("pollen", type, { x: 5, y: 2 }, 2, "key"),
      `https://pollen.googleapis.com/v1/mapTypes/${type}/heatmapTiles/2/1/2?key=key`);
  }
  assert.equal(heatmapTileUrl("pollen", "TREE_UPI", { x: 0, y: 0 }, 17, "key"), "");
  assert.equal(heatmapTileUrl("pollen", "TREE_UPI", { x: 0, y: -1 }, 2, "key"), "");
});
