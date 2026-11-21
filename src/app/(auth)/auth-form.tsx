"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthActionState } from "./actions";

type AuthFormProps = {
  mode: "login" | "register";
  action: (
    previousState: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
};

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const isRegister = mode === "register";

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 py-12">
      <section className="w-full max-w-md rounded-xl border border-[#EAEAEA] bg-white p-7 shadow-sm sm:p-9">
        <Link
          href="/"
          className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#6B0F1A]"
        >
          Willa Panorama
        </Link>
        <h1 className="mt-7 text-3xl font-semibold tracking-tight text-[#111111]">
          {isRegister ? "Utwórz konto" : "Witaj ponownie"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#525252]">
          {isRegister
            ? "Zarejestruj się, aby rozpocząć pracę z platformą."
            : "Zaloguj się do swojego panelu nieruchomości."}
        </p>

        <form action={formAction} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#222222]"
            >
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-11 w-full rounded-xl border border-[#D9D9D9] bg-white px-3.5 text-sm text-[#111111] outline-none transition focus:border-[#6B0F1A] focus:ring-4 focus:ring-[#6B0F1A]/10"
              placeholder="jan@example.com"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#222222]"
            >
              Hasło
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              className="h-11 w-full rounded-xl border border-[#D9D9D9] bg-white px-3.5 text-sm text-[#111111] outline-none transition focus:border-[#6B0F1A] focus:ring-4 focus:ring-[#6B0F1A]/10"
              placeholder="••••••••"
            />
          </div>

          {state.error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {state.error}
            </p>
          )}
          {state.success && (
            <p
              role="status"
              className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
            >
              {state.success}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full rounded-xl"
            disabled={pending}
          >
            {pending
              ? "Proszę czekać…"
              : isRegister
                ? "Zarejestruj się"
                : "Zaloguj się"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[#525252]">
          {isRegister ? "Masz już konto?" : "Nie masz jeszcze konta?"}{" "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="font-medium text-[#6B0F1A] underline-offset-4 hover:underline"
          >
            {isRegister ? "Zaloguj się" : "Zarejestruj się"}
          </Link>
        </p>
      </section>
    </main>
  );
}
