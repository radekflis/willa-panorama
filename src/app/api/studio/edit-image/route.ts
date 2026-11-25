import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      imageUrl?: string;
      prompt?: string;
      quality?: string;
    };
    const { imageUrl, prompt, quality = "4K" } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Wpisz polecenie zmiany." }, { status: 400 });
    }
    if (!imageUrl) {
      return NextResponse.json({ error: "Brak zdjęcia źródłowego." }, { status: 400 });
    }

    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return NextResponse.json(
        { error: "Dodaj klucz FAL_KEY w Vercel → Environment Variables (fal.ai), aby uruchomić otwarty model FLUX.1." },
        { status: 500 }
      );
    }

    const falRes = await fetch("https://fal.run/fal-ai/flux-kontext/dev", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `Photorealistic architectural photo edit (${quality}): ${prompt.trim()}. Preserve original building geometry, lighting and perspective.`,
        image_url: imageUrl,
        num_inference_steps: 24,
        guidance_scale: 3.5,
      }),
    });

    const data = await falRes.json().catch(() => ({}));
    if (!falRes.ok) {
      const msg = data?.detail || data?.message || `Błąd Fal.ai (HTTP ${falRes.status}).`;
      return NextResponse.json({ error: String(msg) }, { status: 502 });
    }

    const outUrl = data?.images?.[0]?.url;
    if (!outUrl) {
      return NextResponse.json({ error: "Model FLUX.1 nie zwrócił obrazu." }, { status: 502 });
    }

    return NextResponse.json({ url: outUrl, quality, engine: "FLUX.1 Kontext" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Błąd serwera Studia AI." },
      { status: 500 }
    );
  }
}
