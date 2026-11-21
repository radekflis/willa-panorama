import { and, desc, eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { directMessages, marketplacePins, users } from "@/db/schema";
import { createClient } from "@/lib/auth/server";
import { InboxWorkspace } from "./inbox-workspace";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ pin?: string; receiver?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error?.name === "AuthSessionMissingError") redirect("/login");
  if (error) throw error;
  if (!user) redirect("/login");

  const pins = await db
    .select({
      id: marketplacePins.id,
      title: marketplacePins.title,
      city: marketplacePins.city,
      ownerId: marketplacePins.ownerId,
      lockedByUserId: marketplacePins.lockedByUserId,
      lockedUntil: marketplacePins.lockedUntil,
    })
    .from(marketplacePins)
    .where(or(
      eq(marketplacePins.ownerId, user.id),
      eq(marketplacePins.lockedByUserId, user.id),
    ))
    .orderBy(desc(marketplacePins.updatedAt));

  const pinIds = pins.map((pin) => pin.id);
  const messages = pinIds.length
    ? await db
        .select({
          id: directMessages.id,
          pinId: directMessages.pinId,
          senderId: directMessages.senderId,
          receiverId: directMessages.receiverId,
          content: directMessages.content,
          createdAt: directMessages.createdAt,
        })
        .from(directMessages)
        .where(or(
          eq(directMessages.senderId, user.id),
          eq(directMessages.receiverId, user.id),
        ))
        .orderBy(desc(directMessages.createdAt))
    : [];

  const params = await searchParams;
  const initialPinId = params.pin && pinIds.includes(params.pin) ? params.pin : pinIds[0] ?? null;

  return (
    <main className="mx-auto min-h-screen max-w-[1600px] px-5 py-10 sm:px-8 sm:py-12 xl:px-12">
      <header className="border-b border-white/10 pb-6">
        <span className="eyebrow">WILLA PANORAMA · SECURE EXCHANGE</span>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-white">Skrzynka Odbiorcza</h1>
        <p className="mt-2 text-sm text-slate-400">Bezpośrednie rozmowy po odblokowaniu kontaktu.</p>
      </header>
      <InboxWorkspace
        userId={user.id}
        initialPinId={initialPinId}
        pins={pins.map((pin) => ({ ...pin, lockedUntil: pin.lockedUntil?.toISOString() ?? null }))}
        messages={messages.map((message) => ({ ...message, createdAt: message.createdAt.toISOString() }))}
      />
    </main>
  );
}
