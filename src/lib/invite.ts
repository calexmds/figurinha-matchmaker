import { randomBytes } from "crypto";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(prefix = "COPA"): string {
  let suffix = "";
  const bytes = randomBytes(4);
  for (let i = 0; i < 4; i++) {
    suffix += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  }
  return `${prefix}-${suffix}`;
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}
