import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { joinGroupForUser } from "@/lib/group-join";
import { normalizeInviteCode } from "@/lib/invite";
import { getOriginFromRequest } from "@/lib/site-url";
import {
  PENDING_INVITE_COOKIE,
  inviteCookieOptions,
} from "@/lib/invite-cookie";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const inviteCode = normalizeInviteCode(rawCode);
  const origin = getOriginFromRequest(request);

  let response = NextResponse.redirect(new URL("/login", origin));

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    response.cookies.set(PENDING_INVITE_COOKIE, inviteCode, inviteCookieOptions);
    response.headers.set(
      "Location",
      `${origin}/join/${inviteCode}?login=1`,
    );
    return response;
  }

  const result = await joinGroupForUser(supabase, user, inviteCode);

  if (!result.ok) {
    response.headers.set(
      "Location",
      `${origin}/join/${inviteCode}?error=${encodeURIComponent(result.error)}`,
    );
    return response;
  }

  response.cookies.delete(PENDING_INVITE_COOKIE);
  response.headers.set("Location", `${origin}/onboarding`);
  return response;
}
