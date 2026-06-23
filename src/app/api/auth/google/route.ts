import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthCallbackUrl } from "@/lib/invite-cookie";
import { getOriginFromRequest } from "@/lib/site-url";

export async function GET(request: NextRequest) {
  const origin = getOriginFromRequest(request);
  const next = request.nextUrl.searchParams.get("next") ?? "/home";
  const safeNext = next.startsWith("/") ? next : "/home";

  const supabase = await createClient();
  const redirectTo = buildAuthCallbackUrl(origin, safeNext);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      new URL(
        `/login?error=auth&reason=${encodeURIComponent(error?.message ?? "oauth")}&next=${encodeURIComponent(safeNext)}`,
        origin,
      ),
    );
  }

  return NextResponse.redirect(data.url);
}
