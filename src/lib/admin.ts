import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export function getAdminEmail(): string | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return email || null;
}

export function isAdminUser(user: Pick<User, "email"> | null | undefined): boolean {
  const adminEmail = getAdminEmail();
  if (!adminEmail || !user?.email) return false;
  return user.email.trim().toLowerCase() === adminEmail;
}

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (!isAdminUser(user)) {
    notFound();
  }

  return { supabase, user };
}
