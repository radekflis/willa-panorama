import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { properties, propertyMedia } from "@/db/schema";
import { createClient } from "@/lib/auth/server";

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MAX_VIDEO_SIZE = 150 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

async function hasExpectedImageSignature(file: File, extension: string) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (extension === "jpg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (extension === "png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (extension === "webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return (
    String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" &&
    ["avif", "avis"].includes(String.fromCharCode(...bytes.slice(8, 12)))
  );
}

async function hasExpectedVideoSignature(file: File, extension: string) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (extension === "webm") {
    return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  }
  return String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await uploadPropertyMedia(request, params);
  } catch (error) {
    console.error("Unexpected property media upload failure:", error);
    return jsonError("Wystąpił nieoczekiwany błąd podczas przesyłania zdjęcia.", 500);
  }
}

async function uploadPropertyMedia(
  request: Request,
  params: Promise<{ id: string }>,
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Could not verify the user for property media upload:", authError);
    return jsonError("Nie udało się zweryfikować sesji użytkownika.", 500);
  }
  if (!user) return jsonError("Zaloguj się, aby dodać zdjęcie.", 401);

  const { id: propertyId } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      propertyId,
    )
  ) {
    return jsonError("Nieprawidłowy identyfikator nieruchomości.", 400);
  }

  const [property] = await db
    .select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.ownerId, user.id)))
    .limit(1);

  if (!property) return jsonError("Nie znaleziono tej nieruchomości.", 404);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Nie udało się odczytać danych formularza.", 400);
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("Wybierz plik graficzny do przesłania.", 400);
  }

  const photoExtension = IMAGE_TYPES[file.type];
  const videoExtension = VIDEO_TYPES[file.type];
  const mediaType = videoExtension ? "video" : "photo";
  const extension = photoExtension ?? videoExtension;
  if (!extension) return jsonError("Obsługiwane formaty: JPG, PNG, WebP, AVIF, MP4, WebM i MOV.", 415);
  const maxFileSize = mediaType === "video" ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;
  if (file.size === 0 || file.size > maxFileSize) {
    return jsonError(`Plik musi mieć rozmiar od 1 B do ${mediaType === "video" ? "150 MB" : "12 MB"}.`, 413);
  }
  const validSignature = mediaType === "video"
    ? await hasExpectedVideoSignature(file, extension)
    : await hasExpectedImageSignature(file, extension);
  if (!validSignature) return jsonError("Plik nie jest prawidłowym plikiem zadeklarowanego formatu.", 415);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket =
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "property-media";
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase Storage server configuration.");
    return jsonError("Przesyłanie zdjęć jest tymczasowo niedostępne.", 500);
  }

  const storage = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const storagePath = `${user.id}/${propertyId}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await storage.storage
    .from(bucket)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Supabase Storage upload failed:", uploadError);
    return jsonError("Nie udało się przesłać zdjęcia do magazynu.", 502);
  }

  const { data: publicUrl } = storage.storage.from(bucket).getPublicUrl(storagePath);
  try {
    const existingMedia = await db
      .select({ id: propertyMedia.id })
      .from(propertyMedia)
      .where(eq(propertyMedia.propertyId, propertyId));

    await db.insert(propertyMedia).values({
      propertyId,
      url: publicUrl.publicUrl,
      storagePath,
      mediaType,
      category: "inne",
      aiTags: [],
      isOriginal: true,
      isCover: existingMedia.length === 0,
      sortOrder: existingMedia.length,
    });
  } catch (databaseError) {
    const { error: cleanupError } = await storage.storage
      .from(bucket)
      .remove([storagePath]);
    if (cleanupError) {
      console.error("Could not clean up an unreferenced property image:", cleanupError);
    }
    console.error("Could not save uploaded property media in Neon:", databaseError);
    return jsonError("Plik przesłano, ale nie udało się zapisać go przy ofercie.", 500);
  }

  return NextResponse.json({ url: publicUrl.publicUrl, mediaType });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") {
    return jsonError("Nie udało się zweryfikować sesji użytkownika.", 500);
  }
  if (!user) return jsonError("Zaloguj się, aby zapisać wizytówkę.", 401);
  const { id: propertyId } = await params;
  const [property] = await db.select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.ownerId, user.id)))
    .limit(1);
  if (!property) return jsonError("Nie znaleziono tej nieruchomości.", 404);

  let body: { heroMediaIds?: unknown };
  try {
    body = await request.json() as { heroMediaIds?: unknown };
  } catch {
    return jsonError("Nieprawidłowe dane wizytówki.", 400);
  }
  if (!Array.isArray(body.heroMediaIds) || body.heroMediaIds.length > 30 ||
      !body.heroMediaIds.every((id) => typeof id === "string")) {
    return jsonError("Wizytówka może zawierać do 30 zdjęć.", 400);
  }
  const heroMediaIds = [...new Set(body.heroMediaIds)];
  if (heroMediaIds.length) {
    const matches = await db.select({ id: propertyMedia.id })
      .from(propertyMedia)
      .where(and(
        eq(propertyMedia.propertyId, propertyId),
        eq(propertyMedia.mediaType, "photo"),
        inArray(propertyMedia.id, heroMediaIds),
      ));
    if (matches.length !== heroMediaIds.length) {
      return jsonError("Wizytówka może zawierać tylko zdjęcia tej nieruchomości.", 400);
    }
  }
  await db.update(properties)
    .set({ heroMediaIds, updatedAt: new Date() })
    .where(and(eq(properties.id, propertyId), eq(properties.ownerId, user.id)));
  return NextResponse.json({ heroMediaIds });
}
