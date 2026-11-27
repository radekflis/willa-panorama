export type CanvasLayerType = "solar" | "terrain" | "air" | "pollen" | "weather" | "isochrone";

type RGB = readonly [number, number, number];

const SIZE = 512;
const PALETTES: Record<"solar" | "air" | "pollen", readonly RGB[]> = {
  solar: [[74, 4, 4], [217, 56, 30], [255, 140, 0], [255, 240, 102]],
  air: [[49, 24, 132], [30, 104, 255], [0, 238, 245], [239, 45, 205]],
  pollen: [[0, 120, 71], [35, 205, 87], [173, 255, 32], [255, 240, 72]],
};

function field(x: number, y: number, lat: number, lng: number): number {
  const a = lat * 0.37;
  const b = lng * 0.41;
  const waves = Math.sin(x * 5 + y * 2 + a) * 0.23
    + Math.cos(y * 6 - x * 2 + b) * 0.18
    + Math.sin(x * 9 - y * 5 + a + b) * 0.09;
  const radial = Math.max(0, 1 - Math.hypot(x - 0.12, y + 0.08));
  return Math.max(0, Math.min(1, 0.35 + waves + radial * 0.35));
}

function paletteColor(palette: readonly RGB[], value: number): RGB {
  const position = Math.max(0, Math.min(1, value)) * (palette.length - 1);
  const index = Math.min(Math.floor(position), palette.length - 2);
  const fraction = position - index;
  const start = palette[index];
  const end = palette[index + 1];
  return [
    start[0] + (end[0] - start[0]) * fraction,
    start[1] + (end[1] - start[1]) * fraction,
    start[2] + (end[2] - start[2]) * fraction,
  ];
}

function drawField(context: CanvasRenderingContext2D, type: "solar" | "terrain" | "air" | "pollen", lat: number, lng: number) {
  const image = context.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const nx = (x - SIZE / 2) / (SIZE / 2);
      const ny = (y - SIZE / 2) / (SIZE / 2);
      const value = field(nx, ny, lat, lng);
      const offset = (y * SIZE + x) * 4;
      if (type === "terrain") {
        const nextX = field(nx + 2 / SIZE, ny, lat, lng);
        const nextY = field(nx, ny + 2 / SIZE, lat, lng);
        const line = Math.floor(value / 0.08) !== Math.floor(nextX / 0.08)
          || Math.floor(value / 0.08) !== Math.floor(nextY / 0.08);
        const shade = Math.max(0, Math.min(1, 0.5 + (value - nextX + value - nextY) * 35));
        image.data[offset] = line ? 255 : 160 + shade * 65;
        image.data[offset + 1] = line ? 190 : 90 + shade * 55;
        image.data[offset + 2] = line ? 55 : 25;
        image.data[offset + 3] = line ? 235 : 35 + shade * 55;
      } else {
        const color = paletteColor(PALETTES[type], value);
        image.data[offset] = color[0];
        image.data[offset + 1] = color[1];
        image.data[offset + 2] = color[2];
        image.data[offset + 3] = type === "solar" ? 220 : 85 + value * 145;
      }
    }
  }
  context.putImageData(image, 0, 0);
}

function drawWeather(context: CanvasRenderingContext2D, lat: number, lng: number) {
  const radius = 30;
  const height = Math.sqrt(3) * radius;
  for (let column = -1; column < 14; column++) {
    for (let row = -1; row < 12; row++) {
      const x = column * radius * 1.5;
      const y = row * height + (column % 2) * height / 2;
      const value = field((x - 256) / 256, (y - 256) / 256, lat, lng);
      const [r, g, b] = paletteColor([[32, 132, 221], [92, 207, 220], [255, 174, 45]], value);
      context.beginPath();
      for (let vertex = 0; vertex < 6; vertex++) {
        const angle = Math.PI / 3 * vertex;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        if (vertex === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.34)`;
      context.strokeStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.9)`;
      context.lineWidth = 2;
      context.fill();
      context.stroke();
    }
  }
}

function drawRadar(context: CanvasRenderingContext2D) {
  const rings = [
    { radius: 65, color: "#00f5d4", label: "5 min" },
    { radius: 130, color: "#38bdf8", label: "10 min" },
    { radius: 195, color: "#a855f7", label: "15 min" },
  ];
  context.strokeStyle = "rgba(120, 235, 255, 0.55)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(40, 256);
  context.lineTo(472, 256);
  context.moveTo(256, 40);
  context.lineTo(256, 472);
  context.stroke();
  context.font = "bold 15px sans-serif";
  context.textAlign = "left";
  for (const ring of rings) {
    context.beginPath();
    context.arc(256, 256, ring.radius, 0, Math.PI * 2);
    context.strokeStyle = ring.color;
    context.lineWidth = 3;
    context.shadowColor = ring.color;
    context.shadowBlur = 12;
    context.stroke();
    context.fillStyle = ring.color;
    context.fillText(ring.label, 264, 256 - ring.radius + 19);
  }
  context.shadowBlur = 0;
}

function fadeEdges(context: CanvasRenderingContext2D) {
  context.globalCompositeOperation = "destination-in";
  for (const [x, y] of [[SIZE, 0], [0, SIZE]]) {
    const gradient = context.createLinearGradient(0, 0, x, y);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.16, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(0.84, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, SIZE, SIZE);
  }
  context.globalCompositeOperation = "source-over";
}

export function generateLayerDataUrl(layerType: CanvasLayerType, seedLat: number, seedLng: number): string {
  if (!Number.isFinite(seedLat) || !Number.isFinite(seedLng)) throw new Error("Nieprawidłowe współrzędne warstwy mapy.");
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Przeglądarka nie obsługuje Canvas 2D.");

  if (layerType === "weather") drawWeather(context, seedLat, seedLng);
  else if (layerType === "isochrone") drawRadar(context);
  else drawField(context, layerType, seedLat, seedLng);
  fadeEdges(context);
  return canvas.toDataURL("image/png");
}
