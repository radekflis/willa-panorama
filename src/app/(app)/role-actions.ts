"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createClient } from "@/lib/auth/server";

export async function changeRoleAction(formData: FormData) {
  const role = formData.get("role");
  if (role !== "buyer" && role !== "owner" && role !== "agency") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;

  await db
    .insert(users)
    .values({ id: user.id, email: user.email, role })
    .onConflictDoUpdate({
      target: users.id,
      set: { role, updatedAt: new Date() },
    });

  revalidatePath("/", "layout");
}
