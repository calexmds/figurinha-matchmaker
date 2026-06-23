import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthCallbackUrl } from "@/lib/invite-cookie";
import { getOriginFromRequest } from "@/lib/site-url";

export async function POST(request: NextRequest) {
  const origin = getOriginFromRequest(request);
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const next = String(formData.get("next") ?? "/home");
  const safeNext = next.startsWith("/") ? next : "/home";

  if (!email || !email.includes("@")) {
    return NextResponse.redirect(
      new URL(
        `/login?error=email&next=${encodeURIComponent(safeNext)}`,
        origin,
      ),
    );
  }

  const supabase = await createClient();
  const redirectTo = buildAuthCallbackUrl(origin, safeNext);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=email&reason=${encodeURIComponent(error.message)}&next=${encodeURIComponent(safeNext)}`,
        origin,
      ),
    );
  }

  return NextResponse.redirect(
    new URL(
      `/login?sent=1&email=${encodeURIComponent(email)}&next=${encodeURIComponent(safeNext)}`,
      origin,
    ),
  );
}
