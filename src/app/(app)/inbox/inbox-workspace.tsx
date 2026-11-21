"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { sendDirectMessageAction } from "../marketplace/actions";

type Pin = {
  id: string;
  title: string;
  city: string;
  ownerId: string;
  lockedByUserId: string | null;
  lockedUntil: string | null;
};

type Message = {
  id: string;
  pinId: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
};

export function InboxWorkspace({
  userId,
  initialPinId,
  pins,
  messages,
}: {
  userId: string;
  initialPinId: string | null;
  pins: Pin[];
  messages: Message[];
}) {
  const [selectedId, setSelectedId] = useState(initialPinId);
  const selected = pins.find((pin) => pin.id === selectedId);
  const selectedMessages = messages.filter((message) => message.pinId === selectedId);
  const receiverId = selected
    ? selected.ownerId === userId
      ? selected.lockedByUserId
      : selected.ownerId
    : null;

  return (
    <div className="mt-6 grid min-h-[620px] overflow-hidden rounded-2xl border border-white/10 bg-[#090C12]/70 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="border-b border-white/10 p-3 xl:border-b-0 xl:border-r">
        {pins.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Brak odblokowanych wątków.</p>
        ) : pins.map((pin) => (
          <button
            key={pin.id}
            type="button"
            onClick={() => setSelectedId(pin.id)}
            className={`mb-2 w-full rounded-xl border p-4 text-left ${
              selectedId === pin.id ? "border-cyan-300/20 bg-cyan-300/8" : "border-white/8 bg-white/[0.02]"
            }`}
          >
            <span className="block truncate text-sm font-medium text-slate-100">{pin.title}</span>
            <span className="mt-1 block text-xs text-slate-500">{pin.city}</span>
          </button>
        ))}
      </aside>
      <section className="flex min-h-[520px] flex-col">
        {selected ? (
          <>
            <header className="border-b border-white/10 px-5 py-4">
              <p className="font-medium text-slate-100">{selected.title}</p>
              {selected.lockedUntil && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Wyłączność do {new Date(selected.lockedUntil).toLocaleString("pl-PL")}
                </p>
              )}
            </header>
            <div className="flex-1 space-y-3 p-5">
              {selectedMessages.length === 0 ? (
                <p className="text-sm text-slate-500">Rozpocznij bezpośrednią rozmowę.</p>
              ) : selectedMessages.map((message) => (
                <div key={message.id} className={`flex ${message.senderId === userId ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl border px-4 py-3 text-sm ${
                    message.senderId === userId
                      ? "border-indigo-300/20 bg-indigo-300/10 text-indigo-50"
                      : "border-white/10 bg-white/[0.04] text-slate-200"
                  }`}>
                    {message.content}
                    <p className="mt-1 text-[9px] text-slate-500">{new Date(message.createdAt).toLocaleString("pl-PL")}</p>
                  </div>
                </div>
              ))}
            </div>
            {receiverId && (
              <form action={sendDirectMessageAction} className="flex gap-3 border-t border-white/10 p-4">
                <input type="hidden" name="pinId" value={selected.id} />
                <input type="hidden" name="receiverId" value={receiverId} />
                <input name="content" required className="spatial-input flex-1" placeholder="Napisz odpowiedź…" />
                <button type="submit" className="btn-lab-primary grid h-11 w-11 place-items-center rounded-xl" aria-label="Wyślij">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-sm text-slate-500">Wybierz wątek.</div>
        )}
      </section>
    </div>
  );
}
