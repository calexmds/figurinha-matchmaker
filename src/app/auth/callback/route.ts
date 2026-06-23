import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { joinGroupForUser } from "@/lib/group-join";
import {
  PENDING_INVITE_COOKIE,
  parseInviteFromPath,
} from "@/lib/invite-cookie";
import { getOriginFromRequest } from "@/lib/site-url";

export const dynamic = "force-dynamic";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const nextParam = requestUrl.searchParams.get("next") ?? "/home";
  const origin = getOriginFromRequest(request);
  const safeNext = nextParam.startsWith("/") ? nextParam : "/home";

  const pendingInvite = request.cookies.get(PENDING_INVITE_COOKIE)?.value;
  const inviteFromNext = parseInviteFromPath(safeNext);
  const inviteCode = pendingInvite ?? inviteFromNext;

  const pendingCookies: CookieToSet[] = [];

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
            pendingCookies.push({ name, value, options });
          });
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] code exchange", error.message);
      return NextResponse.redirect(
        new URL(
          `/login?error=auth&reason=${encodeURIComponent(error.message)}&next=${encodeURIComponent(safeNext)}`,
          origin,
        ),
      );
    }
  } else if (tokenHash && type) {
    const otpType =
      type === "signup" ? "signup" : type === "recovery" ? "recovery" : "email";
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (error) {
      console.error("[auth/callback] verifyOtp", error.message);
      return NextResponse.redirect(
        new URL(
          `/login?error=auth&reason=${encodeURIComponent(error.message)}&next=${encodeURIComponent(safeNext)}`,
          origin,
        ),
      );
    }
  } else {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  let finalPath = safeNext;

  if (inviteCode) {
    const result = await joinGroupForUser(supabase, user, inviteCode);
    pendingCookies.push({
      name: PENDING_INVITE_COOKIE,
      value: "",
      options: { maxAge: 0, path: "/" },
    });

    if (result.ok) {
      finalPath = "/onboarding";
    } else {
      finalPath = `/join/${inviteCode}?error=${encodeURIComponent(result.error)}`;
    }
  }

  const response = NextResponse.redirect(new URL(finalPath, origin));
  for (const { name, value, options } of pendingCookies) {
    if (value === "" && options?.maxAge === 0) {
      response.cookies.delete(name);
    } else {
      response.cookies.set(name, value, options);
    }
  }

  return response;
}
