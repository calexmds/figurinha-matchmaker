export type GabaritoTab = "tenho" | "repetidas" | "preciso";

export type GabaritoCellVariant =
  | "owned-editable"
  | "owned-readonly"
  | "need"
  | "extra"
  | "empty"
  | "dimmed-sparse";

export function normalizeStickerCode(code: string): string {
  return code.trim().toUpperCase();
}

export function resolveStickerQty(
  owned: Record<string, number>,
  code: string,
  sparse: boolean,
): number {
  const key = normalizeStickerCode(code);
  return owned[key] ?? (sparse ? 1 : 0);
}

export function isGabaritoCellVisible(options: {
  tab: GabaritoTab;
  sparse: boolean;
  qty: number;
  showAlbum: boolean;
  searching: boolean;
}): boolean {
  const { tab, sparse, qty, showAlbum, searching } = options;

  if (tab === "tenho") return true;

  if (tab === "preciso") {
    if (searching || showAlbum) return true;
    return qty < 1;
  }

  if (tab === "repetidas") {
    if (sparse && (searching || showAlbum)) return true;
    return qty > 1;
  }

  return false;
}

export function getGabaritoCellVariant(options: {
  tab: GabaritoTab;
  sparse: boolean;
  qty: number;
}): GabaritoCellVariant {
  const { tab, sparse, qty } = options;

  if (tab === "tenho") {
    return qty > 0 ? "owned-editable" : "empty";
  }

  if (tab === "repetidas") {
    if (qty > 1) return "extra";
    if (sparse && qty >= 1) return "dimmed-sparse";
    return "empty";
  }

  // preciso
  if (qty >= 1) {
    return sparse ? "dimmed-sparse" : "owned-readonly";
  }
  return "need";
}

export function countSectionForTab(
  tab: GabaritoTab,
  owned: Record<string, number>,
  codes: string[],
  sparse: boolean,
): number {
  return codes.filter((code) => {
    const qty = resolveStickerQty(owned, code, sparse);
    if (tab === "tenho") return qty > 0;
    if (tab === "repetidas") return qty > 1;
    return qty < 1;
  }).length;
}
