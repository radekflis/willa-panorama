"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { creditWallets, users } from "@/db/schema";
import { createClient } from "@/lib/auth/server";

export type AuthActionState = {
  error?: string;
  success?: string;
};

function getCredentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || !email.trim()) {
    return { error: "Podaj prawidłowy adres e-mail." };
  }

  if (typeof password !== "string" || !password) {
    return { error: "Podaj hasło." };
  }

  return { email: email.trim(), password };
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentials = getCredentials(formData);
  if ("error" in credentials) return credentials;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(credentials);

  if (error) return { error: error.message };

  if (data.user) {
    try {
      await db.insert(users).values({
        id: data.user.id,
        email: credentials.email,
      });
      await db.insert(creditWallets).values({
        userId: data.user.id,
        balance: 5,
      });
    } catch (databaseError) {
      console.error("Failed to create user record and credit wallet after sign-up:", databaseError);
    }
  }

  if (data.session) redirect("/dashboard");

  return {
    success: "Konto utworzono. Sprawdź swoją skrzynkę, aby potwierdzić adres e-mail.",
  };
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentials = getCredentials(formData);
  if ("error" in credentials) return credentials;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
  redirect("/login");
}
