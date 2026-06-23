import { buildStickerCatalog } from "@/lib/stickers/catalog";

export type OwnedSticker = { code: string; quantity: number };

const CATALOG_CODES = buildStickerCatalog().map((s) => s.code.toUpperCase());
const CATALOG_CODE_SET = new Set(CATALOG_CODES);

export function getCatalogCodes(): readonly string[] {
  return CATALOG_CODES;
}

/** Total de cópias marcadas em Tenho (qty 0 = não tem). */
export function ownedMapFromList(
  items: Array<{ code: string; quantity: number }>,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) {
    const code = item.code.toUpperCase();
    if (item.quantity > 0) map[code] = item.quantity;
  }
  return map;
}

/**
 * Converte dados legados (repetidas + preciso separados) para mapa Tenho.
 * Repetidas antigas = extras; total = extras + 1 cópia no álbum.
 */
export function ownedMapFromLegacy(
  duplicates: Array<{ code: string; quantity: number }>,
  needs: string[],
): Record<string, number> {
  const owned = ownedMapFromList(duplicates);
  if (needs.length === 0) return owned;

  for (const [code, qty] of Object.entries(owned)) {
    owned[code] = qty + 1;
  }
  return owned;
}

/** Repetidas trocáveis: extras além da 1ª cópia do álbum. */
export function deriveTradeDuplicates(
  owned: Record<string, number> | Array<{ code: string; quantity: number }>,
): OwnedSticker[] {
  const map = Array.isArray(owned) ? ownedMapFromList(owned) : owned;
  return Object.entries(map)
    .filter(([, qty]) => qty > 1)
    .map(([code, qty]) => ({ code, quantity: qty - 1 }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** Preciso = catálogo completo menos o que está em Tenho. */
export function deriveNeeds(
  owned: Record<string, number> | Array<{ code: string; quantity: number }>,
): string[] {
  const map = Array.isArray(owned) ? ownedMapFromList(owned) : owned;
  return CATALOG_CODES.filter((code) => (map[code] ?? 0) < 1);
}

export function deriveRepetidasExtras(
  owned: Record<string, number>,
): OwnedSticker[] {
  return deriveTradeDuplicates(owned);
}

export function countOwnedTypes(owned: Record<string, number>): number {
  return Object.values(owned).filter((q) => q > 0).length;
}

export function countRepetidasTotal(owned: Record<string, number>): number {
  return Object.values(owned).reduce(
    (sum, qty) => sum + Math.max(0, qty - 1),
    0,
  );
}

export function isValidCatalogCode(code: string): boolean {
  return CATALOG_CODE_SET.has(code.toUpperCase());
}

/** Quantidade disponível para entregar em troca (reserva 1 no álbum). */
export function tradeableQuantity(
  ownedQty: number,
  reserved = 0,
): number {
  return Math.max(0, Math.max(0, ownedQty - 1) - reserved);
}

export function userNeedsCode(owned: Record<string, number>, code: string): boolean {
  return (owned[code.toUpperCase()] ?? 0) < 1;
}
