import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  PENDING_INVITE_COOKIE,
  inviteCookieOptions,
  parseInviteFromPath,
} from "@/lib/invite-cookie";
import { normalizeInviteCode } from "@/lib/invite";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

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
