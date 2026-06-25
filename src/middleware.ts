import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/middleware";
import { isAdminUser } from "@/lib/admin";
import {
  PENDING_INVITE_COOKIE,
  inviteCookieOptions,
  parseInviteFromPath,
} from "@/lib/invite-cookie";
import { normalizeInviteCode } from "@/lib/invite";

async function getSessionUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const user = await getSessionUser(request);
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", "/admin");
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdminUser(user)) {
      return new NextResponse(null, { status: 404 });
    }
  }

  // OAuth: encaminha ?code para /auth/callback
  if (searchParams.has("code") && pathname !== "/auth/callback") {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  // Magic link legado (?token_hash=)
  if (
    searchParams.has("token_hash") &&
    pathname !== "/auth/callback"
  ) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  const response = await updateSession(request);

  // Grava convite pendente ao abrir /join/CODIGO
  const inviteFromPath = parseInviteFromPath(pathname);
  if (inviteFromPath) {
    response.cookies.set(
      PENDING_INVITE_COOKIE,
      normalizeInviteCode(inviteFromPath),
      inviteCookieOptions,
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
