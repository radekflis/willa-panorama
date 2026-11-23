import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageUrl, prompt, quality = "4K" } = body as {
      imageUrl?: string;
      prompt?: string;
      quality?: string;
    };

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Brak polecenia (promptu)." }, { status: 400 });
    }
    if (!imageUrl) {
      return NextResponse.json({ error: "Brak adresu zdjęcia źródłowego." }, { status: 400 });
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Brak klucza GEMINI_API_KEY w zmiennych środowiskowych." },
        { status: 500 }
      );
    }

    // Pobranie obrazu źródłowego i konwersja do base64
    let base64Image = "";
    let mimeType = "image/jpeg";

    if (imageUrl.startsWith("data:")) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Image = match[2];
      }
    } else {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        return NextResponse.json(
          { error: `Nie udało się pobrać zdjęcia źródłowego (HTTP ${imgRes.status}).` },
          { status: 400 }
        );
      }
      mimeType = imgRes.headers.get("content-type") || "image/jpeg";
      const arrayBuf = await imgRes.arrayBuffer();
      base64Image = Buffer.from(arrayBuf).toString("base64");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    const geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Edit this real estate photograph photorealistically (${quality} architectural quality). Keep the original architecture, lighting, and perspective intact, and apply this exact edit: ${prompt.trim()}`,
              },
              {
                inlineData: {
                  mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
    });

    const geminiJson = await geminiRes.json().catch(() => ({}));

    if (!geminiRes.ok) {
      const msg =
        geminiJson?.error?.message ||
        `Błąd Gemini API (HTTP ${geminiRes.status}). Sprawdź czy GEMINI_API_KEY zaczyna się od AIza...`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const parts = geminiJson?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(
      (p: { inlineData?: { data?: string; mimeType?: string } }) => p?.inlineData?.data
    );

    if (!imagePart?.inlineData?.data) {
      return NextResponse.json(
        { error: "Model nie zwrócił zmodyfikowanego obrazu. Spróbuj doprecyzować polecenie." },
        { status: 502 }
      );
    }

    const outMime = imagePart.inlineData.mimeType || "image/png";
    const dataUrl = `data:${outMime};base64,${imagePart.inlineData.data}`;

    return NextResponse.json({
      url: dataUrl,
      quality,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nieznany błąd serwera.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
