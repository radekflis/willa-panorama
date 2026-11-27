import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { generateLayerDataUrl, type CanvasLayerType } from "./map-layer-canvas";

function withCanvas(run: (capture: {
  pixels: Uint8ClampedArray | null;
  arcs: number[];
  labels: string[];
  gradients: number;
  stops: Array<[number, string]>;
  masks: string[];
  paths: number;
}) => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  const capture = {
    pixels: null as Uint8ClampedArray | null, arcs: [] as number[], labels: [] as string[],
    gradients: 0, stops: [] as Array<[number, string]>, masks: [] as string[], paths: 0,
  };
  const context = {
    globalCompositeOperation: "source-over",
    createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData: (image: { data: Uint8ClampedArray }) => { capture.pixels = image.data; },
    createLinearGradient: () => {
      capture.gradients++;
      return { addColorStop: (offset: number, color: string) => { capture.stops.push([offset, color]); } };
    },
    beginPath: () => { capture.paths++; },
    moveTo: () => {}, lineTo: () => {}, closePath: () => {}, fill: () => {}, stroke: () => {},
    fillRect: () => { capture.masks.push(context.globalCompositeOperation); },
    arc: (_x: number, _y: number, radius: number) => { capture.arcs.push(radius); },
    fillText: (text: string) => { capture.labels.push(text); },
  };
  const canvas = {
    width: 0, height: 0,
    getContext: (type: string) => { assert.equal(type, "2d"); return context; },
    toDataURL: (type: string) => {
      assert.equal(type, "image/png");
      assert.equal(canvas.width, 512);
      assert.equal(canvas.height, 512);
      return "data:image/png;base64,test";
    },
  };
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: (tag: string) => {
    assert.equal(tag, "canvas");
    return canvas;
  } } });
  try {
    run(capture);
  } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  }
}

test("warstwy pikselowe zależą od punktu i zanikają na krawędziach", () => {
  for (const layer of ["solar", "terrain", "air", "pollen"] as const) {
    const hashes: string[] = [];
    for (const lat of [51, 51, 52]) {
      withCanvas((capture) => {
        assert.equal(generateLayerDataUrl(layer, lat, 17), "data:image/png;base64,test");
        assert.equal(capture.gradients, 2);
        assert.deepEqual(capture.masks, ["destination-in", "destination-in"]);
        assert.deepEqual(capture.stops.filter(([offset]) => offset === 0 || offset === 1).map(([, color]) => color),
          Array(4).fill("rgba(0, 0, 0, 0)"));
        assert.ok(capture.pixels);
        assert.ok(capture.pixels.some((value, index) => index % 4 === 3 && value > 0));
        hashes.push(createHash("sha256").update(capture.pixels).digest("hex"));
      });
    }
    assert.equal(hashes[0], hashes[1]);
    assert.notEqual(hashes[0], hashes[2]);
  }
});

test("pogoda rysuje heksagony, a radar trzy podpisane pierścienie", () => {
  withCanvas((capture) => {
    generateLayerDataUrl("weather", 51, 17);
    assert.ok(capture.paths > 100);
    assert.equal(capture.gradients, 2);
  });
  withCanvas((capture) => {
    generateLayerDataUrl("isochrone", 51, 17);
    assert.deepEqual(capture.arcs, [65, 130, 195]);
    assert.deepEqual(capture.labels, ["5 min", "10 min", "15 min"]);
    assert.equal(capture.gradients, 2);
  });
});

test("nieprawidłowe współrzędne i brak Canvas 2D zgłaszają błędy", () => {
  assert.throws(() => generateLayerDataUrl("solar", NaN, 17), /współrzędne/);
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: {
    createElement: () => ({ getContext: () => null }),
  } });
  try {
    for (const layer of ["solar", "terrain", "air", "pollen", "weather", "isochrone"] satisfies CanvasLayerType[]) {
      assert.throws(() => generateLayerDataUrl(layer, 51, 17), /Canvas 2D/);
    }
  } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
