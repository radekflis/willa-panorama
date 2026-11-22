import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { properties, propertyMedia, type MediaCategory, type PropertyParameter } from "@/db/schema";
import { createClient } from "@/lib/auth/server";

const categories: MediaCategory[] = ["wnetrza", "ogrod", "elewacja", "otoczenie", "widoki", "detale", "inne"];
const parameters: PropertyParameter[] = [
  { name: "Powierzchnia domu", value: "", description: "" },
  { name: "Powierzchnia ogrodu", value: "", description: "" },
  { name: "Ekspozycja", value: "", description: "" },
  { name: "Stan techniczny", value: "", description: "" },
  { name: "Standard wykończenia", value: "", description: "" },
  { name: "Prywatność", value: "", description: "" },
  { name: "Zieleń i drzewa", value: "", description: "" },
  { name: "Otoczenie i widoki", value: "", description: "" },
];

type MediaAnalysis = {
  category: MediaCategory;
  tags: string[];
  description: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getGeminiText(response: unknown) {
  const data = response as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

function parseJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Gemini returned no JSON object.");
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

async function callGemini(parts: Array<Record<string, unknown>>) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(12_000),
    },
  );
  if (!response.ok) throw new Error(`Gemini analysis failed with status ${response.status}.`);
  return parseJsonObject(getGeminiText(await response.json()));
}

function fallbackMediaAnalysis(): MediaAnalysis {
  return {
    category: "inne",
    tags: ["zdjęcie nieruchomości", "do weryfikacji"],
    description: "Automatyczna analiza obrazu jest niedostępna. Uzupełnij kategorię i opis ręcznie.",
  };
}

function normalizeMediaAnalysis(value: Record<string, unknown> | null): MediaAnalysis {
  if (!value) return fallbackMediaAnalysis();
  const category = categories.includes(value.category as MediaCategory)
    ? value.category as MediaCategory
    : "inne";
  const tags = Array.isArray(value.tags)
    ? value.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 20)
    : [];
  return {
    category,
    tags,
    description: typeof value.description === "string" ? value.description.slice(0, 3000) : "",
  };
}

function normalizeParameters(value: unknown): PropertyParameter[] {
  const output = Array.isArray(value) ? value : [];
  return parameters.map((parameter, index) => {
    const item = output[index];
    if (!item || typeof item !== "object") return { ...parameter, value: "Nie ustalono", description: "Brak wystarczających danych." };
    const candidate = item as Record<string, unknown>;
    return {
      name: parameter.name,
      value: typeof candidate.value === "string" ? candidate.value.slice(0, 250) : "Nie ustalono",
      description: typeof candidate.description === "string" ? candidate.description.slice(0, 600) : "Brak wystarczających danych.",
    };
  });
}

async function authenticate() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") throw error;
  return user;
}

export async function POST(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> },
) {
  const user = await authenticate();
  if (!user) return jsonError("Zaloguj się, aby analizować nieruchomość.", 401);
  const { id } = await routeParams;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return jsonError("Nieprawidłowy identyfikator nieruchomości.", 400);
  }
  const [property] = await db.select({
    id: properties.id,
    title: properties.title,
    city: properties.city,
    address: properties.address,
    description: properties.description,
    areaSqm: properties.areaSqm,
    rooms: properties.rooms,
    richHighlights: properties.richHighlights,
    locationPotential: properties.locationPotential,
    parametersJson: properties.parametersJson,
  }).from(properties).where(and(eq(properties.id, id), eq(properties.ownerId, user.id))).limit(1);
  if (!property) return jsonError("Nie znaleziono tej nieruchomości.", 404);

  let body: Record<string, unknown> = {};
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return jsonError("Nieprawidłowe dane żądania.", 400);
  }

  if (body.operation === "save") {
    if (typeof body.richHighlights !== "string" || typeof body.locationPotential !== "string" ||
        body.richHighlights.length > 30_000 || body.locationPotential.length > 30_000) {
      return jsonError("Opisy muszą być tekstem o długości do 30 000 znaków.", 400);
    }
    const values: PropertyParameter[] = normalizeParameters(body.parametersJson);
    await db.update(properties).set({
      richHighlights: body.richHighlights,
      locationPotential: body.locationPotential,
      parametersJson: values,
      updatedAt: new Date(),
    }).where(and(eq(properties.id, id), eq(properties.ownerId, user.id)));
    return NextResponse.json({ saved: true });
  }

  const media = await db.select({
    id: propertyMedia.id,
    mediaType: propertyMedia.mediaType,
    storagePath: propertyMedia.storagePath,
    category: propertyMedia.category,
  }).from(propertyMedia).where(eq(propertyMedia.propertyId, id));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "property-media";
  const storage = supabaseUrl && serviceRoleKey
    ? createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

  const mediaResults: MediaAnalysis[] = [];
  let usedAi = false;
  for (let offset = 0; offset < media.length; offset += 8) {
    const batch = await Promise.all(media.slice(offset, offset + 8).map(async (item, batchIndex) => {
      const index = offset + batchIndex;
      let result = item.mediaType === "video"
        ? {
            category: "inne" as const,
            tags: ["wideo nieruchomości", "do weryfikacji"],
            description: "Wideo dodane do archiwum. Materiał wymaga analizy klatek.",
          }
        : fallbackMediaAnalysis();
      if (storage && index < 12 && process.env.GEMINI_API_KEY) {
        try {
          let canAnalyze = true;
          if (item.mediaType === "video") {
            const segments = item.storagePath.split("/");
            const filename = segments.pop();
            const { data: objects, error } = await storage.storage.from(bucket).list(segments.join("/"), {
              search: filename,
              limit: 1,
            });
            if (error) throw error;
            const object = objects?.find((entry) => entry.name === filename);
            const fileSize = Number((object?.metadata as Record<string, unknown> | null)?.size);
            canAnalyze = Number.isFinite(fileSize) && fileSize <= 20 * 1024 * 1024;
          }
          if (canAnalyze) {
            const { data, error } = await storage.storage.from(bucket).download(item.storagePath);
            if (error) throw error;
            const bytes = Buffer.from(await data.arrayBuffer());
            const extension = item.storagePath.split(".").pop()?.toLowerCase();
            const mimeType = item.mediaType === "video"
              ? extension === "webm" ? "video/webm" : extension === "mov" ? "video/quicktime" : "video/mp4"
              : extension === "png" ? "image/png"
                : extension === "webp" ? "image/webp"
                  : extension === "avif" ? "image/avif" : "image/jpeg";
            const kind = item.mediaType === "video" ? "wideo" : "zdjęcie";
            const analysis = await callGemini([
              { text: `Przeanalizuj ${kind} nieruchomości. Zwróć JSON: {"category":"wnetrza|ogrod|elewacja|otoczenie|widoki|detale|inne","tags":["konkretne polskie tagi"],"description":"dokładny opis widocznych elementów, bez zgadywania"}.` },
              { inlineData: { mimeType, data: bytes.toString("base64") } },
            ]);
            if (analysis) usedAi = true;
            result = normalizeMediaAnalysis(analysis);
          }
        } catch (error) {
          console.warn("Gemini media analysis unavailable; using structural fallback:", error);
        }
      }
      await db.update(propertyMedia).set({
        category: result.category,
        aiTags: result.tags,
        aiDescription: result.description,
      }).where(eq(propertyMedia.id, item.id));
      return result;
    }));
    mediaResults.push(...batch);
  }

  const evidence = mediaResults.map(({ tags, description }) => `${tags.join(", ")}: ${description}`).join("\n");
  const parameterFallback = normalizeParameters([
    { value: `${property.areaSqm} m²`, description: "Powierzchnia z danych oferty." },
    {}, {}, {}, {}, {}, {}, {},
  ]);
  let richHighlights = `${property.title} — ${property.city}\n\n${property.description || "Opis oferty wymaga uzupełnienia."}\n\nNajważniejsze atuty:\n${mediaResults.flatMap((item) => item.tags).slice(0, 8).map((tag) => `• ${tag}`).join("\n") || "• Uzupełnij atuty po weryfikacji materiałów."}`;
  let locationPotential = `Lokalizacja: ${property.address}, ${property.city}.\n\nPotencjał lokalizacji wymaga uzupełnienia na podstawie zweryfikowanych informacji o komunikacji, usługach i otoczeniu. Analiza zdjęć nie potwierdza odległości ani dostępności infrastruktury.`;
  let propertyParameters = parameterFallback;

  if (process.env.GEMINI_API_KEY) {
    try {
      const generated = await callGemini([{
        text: `Przygotuj profesjonalne, rozbudowane opisy nieruchomości wyłącznie na podstawie podanych faktów. Nie wymyślaj udogodnień ani parametrów. Zwróć JSON z richHighlights (tekst ciągły plus punktowana lista), locationPotential (tekst z zastrzeżeniem brakujących faktów) oraz parametersJson: dokładnie 8 obiektów {name,value,description} z nazwami w podanej kolejności: ${parameters.map((item) => item.name).join("; ")}. Jeśli wartość nie wynika z faktów, wpisz "Nie ustalono". Fakty: ${JSON.stringify({
          title: property.title,
          city: property.city,
          address: property.address,
          description: property.description,
          areaSqm: property.areaSqm,
          rooms: property.rooms,
          mediaEvidence: evidence.slice(0, 14_000),
        })}`,
      }]);
      if (generated) usedAi = true;
      if (typeof generated?.richHighlights === "string") richHighlights = generated.richHighlights.slice(0, 30_000);
      if (typeof generated?.locationPotential === "string") locationPotential = generated.locationPotential.slice(0, 30_000);
      propertyParameters = normalizeParameters(generated?.parametersJson);
    } catch (error) {
      console.warn("Gemini property analysis unavailable; using structural fallback:", error);
    }
  }

  await db.update(properties).set({
    richHighlights,
    locationPotential,
    parametersJson: propertyParameters,
    updatedAt: new Date(),
  }).where(and(eq(properties.id, id), eq(properties.ownerId, user.id)));

  return NextResponse.json({
    richHighlights,
    locationPotential,
    parametersJson: propertyParameters,
    mediaCount: media.length,
    usedAi,
  });
}
