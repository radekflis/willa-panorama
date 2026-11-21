import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  creditTransactions,
  creditWallets,
  marketplacePins,
  users,
} from "@/db/schema";
import { createClient } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Zaloguj się, aby kontynuować." }, { status: 401 });
  }
  if (!user.email) {
    return NextResponse.json({ error: "Konto nie ma adresu e-mail." }, { status: 400 });
  }

  await db
    .insert(users)
    .values({ id: user.id, email: user.email })
    .onConflictDoNothing({ target: users.id });

  const body = await request.json().catch(() => ({})) as {
    action?: "add_pin" | "unlock_pin" | "package";
    pinId?: string;
    package?: "owner" | "agency";
    title?: string;
    city?: string;
    description?: string;
    pricePln?: number;
    areaM2?: number;
    rooms?: number;
    lat?: number;
    lng?: number;
    pinType?: "owner_offer" | "buyer_request";
    transactionType?: "sale" | "rent";
    contactPhone?: string;
    contactEmail?: string;
  };

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    let pinId = body.pinId ?? null;

    if (body.action === "add_pin") {
      if (!body.title || !body.city || !body.pinType || !body.transactionType) {
        return NextResponse.json({ error: "Uzupełnij wymagane dane pinu." }, { status: 400 });
      }
      const [pin] = await db.insert(marketplacePins).values({
        ownerId: user.id,
        pinType: body.pinType,
        transactionType: body.transactionType,
        title: body.title,
        city: body.city,
        description: body.description ?? "",
        pricePln: body.pricePln ?? 0,
        areaM2: body.areaM2 ?? null,
        rooms: body.rooms ?? null,
        lat: Number.isFinite(body.lat) ? body.lat : null,
        lng: Number.isFinite(body.lng) ? body.lng : null,
        contactPhone: body.contactPhone ?? "",
        contactEmail: body.contactEmail ?? user.email,
      }).returning({ id: marketplacePins.id });
      pinId = pin.id;
    } else if (body.action === "unlock_pin" && body.pinId) {
      await db
        .update(marketplacePins)
        .set({
          status: "locked",
          lockedByUserId: user.id,
          lockedUntil: new Date(Date.now() + 72 * 60 * 60 * 1000),
          updatedAt: new Date(),
        })
        .where(eq(marketplacePins.id, body.pinId));
    }

    let [wallet] = await db
      .select({ id: creditWallets.id, balance: creditWallets.balance })
      .from(creditWallets)
      .where(eq(creditWallets.userId, user.id))
      .limit(1);
    if (!wallet) {
      [wallet] = await db
        .insert(creditWallets)
        .values({ userId: user.id, balance: 5 })
        .returning({ id: creditWallets.id, balance: creditWallets.balance });
    }
    await db.insert(creditTransactions).values({
      walletId: wallet.id,
      amount: -5,
      type: "five_dollar_marketplace",
      description: body.action === "unlock_pin"
        ? "Wyłączność kontaktu 5$ (tryb testowy)"
        : "Dodanie pinu 5$ (tryb testowy)",
    });

    let unlocked: {
      contactPhone: string;
      contactEmail: string;
      ownerId: string;
    } | null = null;
    if (body.action === "unlock_pin" && pinId) {
      const [pin] = await db
        .select({
          contactPhone: marketplacePins.contactPhone,
          contactEmail: marketplacePins.contactEmail,
          ownerId: marketplacePins.ownerId,
        })
        .from(marketplacePins)
        .where(eq(marketplacePins.id, pinId))
        .limit(1);
      if (pin) unlocked = pin;
    }

    return NextResponse.json({
      simulated: true,
      pinId,
      redirectUrl: "/marketplace",
      unlocked,
    });
  }

  const stripe = new Stripe(secretKey);
  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const packageName = body.package === "agency"
    ? "Pakiet Agencja Marka Własna"
    : body.package === "owner"
      ? "Pakiet Właściciel Bezpośredni"
      : "Globalna mapa 5$";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "blik", "p24"],
    line_items: [{
      price_data: {
        currency: "pln",
        unit_amount: 2000,
        product_data: { name: packageName },
      },
      quantity: 1,
    }],
    metadata: {
      userId: user.id,
      action: body.action ?? "package",
      pinId: body.pinId ?? "",
      package: body.package ?? "",
    },
    success_url: `${origin}/marketplace?payment=success`,
    cancel_url: `${origin}/billing?payment=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
