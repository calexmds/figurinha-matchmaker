import { STICKER_CODES } from "@/lib/stickers/catalog";

const CODE_PATTERN = /\b(?:00|FWC\d{1,2}|[A-Z]{3}\d{2})\b/gi;

export type ParsedStickerInput = {
  code: string;
  quantity: number;
};

export function normalizeStickerCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  if (!STICKER_CODES.has(code)) {
    return null;
  }
  return code;
}

export function parseStickerInput(text: string): ParsedStickerInput[] {
  const matches = text.toUpperCase().match(CODE_PATTERN) ?? [];
  const counts = new Map<string, number>();

  for (const match of matches) {
    const code = normalizeStickerCode(match);
    if (!code) continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([code, quantity]) => ({ code, quantity }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function parseStickerLines(text: string): ParsedStickerInput[] {
  const lines = text.split(/\r?\n/);
  const counts = new Map<string, number>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/[\s,;|]+/).filter(Boolean);
    if (parts.length === 0) continue;

    const code = normalizeStickerCode(parts[0]);
    if (!code) continue;

    const quantity = parts[1] ? Number.parseInt(parts[1], 10) : 1;
    if (!Number.isFinite(quantity) || quantity < 0) continue;

    counts.set(code, quantity);
  }

  return Array.from(counts.entries())
    .map(([code, quantity]) => ({ code, quantity }))
    .sort((a, b) => a.code.localeCompare(b.code));
}
