import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getOriginFromRequest } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next") ?? "/home";
  const origin = getOriginFromRequest(request);
  const safeNext = nextParam.startsWith("/") ? nextParam : "/home";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const pendingInvite = request.cookies.get("pending_invite_code")?.value;
  const redirectPath = pendingInvite ? `/join/${pendingInvite}` : safeNext;
  let response = NextResponse.redirect(new URL(redirectPath, origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback]", error.message);
    return NextResponse.redirect(
      new URL(
        `/login?error=auth&reason=${encodeURIComponent(error.message)}`,
        origin,
      ),
    );
  }

  if (pendingInvite) {
    response.cookies.delete("pending_invite_code");
  }

  return response;
}
