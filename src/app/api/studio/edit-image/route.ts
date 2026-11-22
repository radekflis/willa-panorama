import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { properties, propertyMedia } from "@/db/schema";
import { createClient } from "@/lib/auth/server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseDataUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  return match ? { mimeType: match[1], data: match[2] } : null;
}

export async function POST(request: Request) {
  const supabaseAuth = await createClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    return jsonError("Nie udało się zweryfikować sesji użytkownika.", 500);
  }
  if (!user) return jsonError("Zaloguj się, aby otworzyć Studio Aranżacji.", 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return jsonError("Nieprawidłowe dane żądania.", 400);
  }
  const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";
  const mediaId = typeof body.mediaId === "string" ? body.mediaId : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const quality = body.quality;
  if (!propertyId || !mediaId || !prompt || prompt.length > 1500) {
    return jsonError("Podaj zdjęcie i prompt (do 1500 znaków).", 400);
  }
  if (quality !== "2K" && quality !== "4K" && quality !== "8K") {
    return jsonError("Wybierz jakość 2K, 4K albo 8K.", 400);
  }

  const [source] = await db.select({
    id: propertyMedia.id,
    propertyId: propertyMedia.propertyId,
    storagePath: propertyMedia.storagePath,
    url: propertyMedia.url,
    category: propertyMedia.category,
    aiTags: propertyMedia.aiTags,
    mediaType: propertyMedia.mediaType,
  }).from(propertyMedia).where(and(
    eq(propertyMedia.id, mediaId),
    eq(propertyMedia.propertyId, propertyId),
  )).limit(1);
  const [property] = await db.select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.ownerId, user.id)))
    .limit(1);
  if (!property || !source || source.mediaType !== "photo") {
    return jsonError("Nie znaleziono zdjęcia tej nieruchomości.", 404);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonError("Magazyn zdjęć jest tymczasowo niedostępny.", 503);
  }
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "property-media";
  const storage = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: originalBlob, error: downloadError } = await storage.storage.from(bucket).download(source.storagePath);
  if (downloadError) {
    console.error("Could not read the source photo for AI editing:", downloadError);
    return jsonError("Nie udało się pobrać oryginalnego zdjęcia.", 502);
  }
  const original = Buffer.from(await originalBlob.arrayBuffer());
  const extension = source.storagePath.split(".").pop()?.toLowerCase() || "jpg";
  const sourceMime = extension === "png" ? "image/png"
    : extension === "webp" ? "image/webp" : extension === "avif" ? "image/avif" : "image/jpeg";
  const mask = parseDataUrl(body.mask);
  let output = original;
  let outputMime = sourceMime;
  let warning: string | undefined;
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);

  if (apiKey) {
    try {
      const parts: Array<Record<string, unknown>> = [
        { text: `Edytuj dostarczone zdjęcie nieruchomości zgodnie z poleceniem: "${prompt}". Zachowaj geometrię budynku i fotorealistyczny charakter. Docelowy poziom jakości: ${quality}. Jeśli dołączono maskę, białe obszary wskazują obszar do modyfikacji, zachowaj resztę obrazu bez zmian.` },
        { inlineData: { mimeType: sourceMime, data: original.toString("base64") } },
      ];
      if (mask) parts.push({ inlineData: { mimeType: mask.mimeType, data: mask.data } });
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
          signal: AbortSignal.timeout(25_000),
        },
      );
      if (!response.ok) { const errTxt = await response.text().catch(() => ""); throw new Error(`Gemini HTTP ${response.status}: ${errTxt.slice(0, 240)}`); }
      const result = await response.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }>;
      };
      const image = result.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData;
      if (!image?.data) throw new Error("Image generation returned no image.");
      output = Buffer.from(image.data, "base64");
      outputMime = image.mimeType || "image/png";
    } catch (error) {
      console.warn("AI photo edit unavailable; saving a safe original copy:", error);
      `Gemini error: ${error instanceof Error ? error.message : "brak obrazu w odpowiedzi"}`;
    }
  } else {
    warning = "Brak klucza GEMINI_API_KEY; zapisano kopię oryginału bez zmian.";
  }

  const outputExtension = outputMime === "image/webp" ? "webp"
    : outputMime === "image/jpeg" ? "jpg" : "png";
  const storagePath = `${user.id}/${propertyId}/${randomUUID()}.${outputExtension}`;
  const { error: uploadError } = await storage.storage.from(bucket).upload(storagePath, output, {
    contentType: outputMime,
    upsert: false,
  });
  if (uploadError) {
    console.error("Could not store the generated photo copy:", uploadError);
    return jsonError("Nie udało się zapisać nowej kopii zdjęcia.", 502);
  }
  const { data: publicUrl } = storage.storage.from(bucket).getPublicUrl(storagePath);
  try {
    const [copy] = await db.insert(propertyMedia).values({
      propertyId,
      url: publicUrl.publicUrl,
      storagePath,
      mediaType: "photo",
      category: source.category,
      aiTags: [...source.aiTags, "aranżacja AI"],
      aiDescription: `${source.aiTags.join(", ")} · prompt: ${prompt}`,
      isOriginal: false,
      parentMediaId: source.id,
      resolutionTier: quality,
      isCover: false,
      sortOrder: 0,
    }).returning({ id: propertyMedia.id, url: propertyMedia.url });
    return NextResponse.json({ ...copy, warning });
  } catch (error) {
    const { error: cleanupError } = await storage.storage.from(bucket).remove([storagePath]);
    if (cleanupError) console.error("Could not clean up an unreferenced generated image:", cleanupError);
    console.error("Could not save edited photo metadata:", error);
    return jsonError("Kopię zapisano w magazynie, ale nie udało się dodać jej do archiwum.", 500);
  }
}
