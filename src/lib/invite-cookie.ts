import { normalizeInviteCode } from "@/lib/invite";

export const PENDING_INVITE_COOKIE = "pending_invite_code";

export const inviteCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24,
  path: "/",
};

export function parseInviteFromPath(path: string): string | null {
  const match = path.match(/^\/join\/([^/?#]+)/i);
  return match ? normalizeInviteCode(match[1]) : null;
}

export function buildAuthCallbackUrl(siteUrl: string, next?: string): string {
  const url = new URL("/auth/callback", siteUrl);
  if (next?.startsWith("/")) {
    url.searchParams.set("next", next);
  }
  return url.toString();
}
