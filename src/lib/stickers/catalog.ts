import { SPECIAL_STICKERS, TEAMS, TOTAL_STICKERS } from "@/lib/constants";
import { getTeamInfo } from "@/lib/teams";

export type StickerCatalogEntry = {
  code: string;
  team: string | null;
  type: "team" | "special";
  number: number | null;
  sortOrder: number;
  name: string | null;
};

export function buildStickerCatalog(): StickerCatalogEntry[] {
  const stickers: StickerCatalogEntry[] = [];
  let sortOrder = 1;

  for (const special of SPECIAL_STICKERS) {
    stickers.push({
      code: special.code,
      team: null,
      type: "special",
      number: null,
      sortOrder: sortOrder++,
      name: special.name,
    });
  }

  for (const team of TEAMS) {
    for (let i = 1; i <= 20; i++) {
      const code = `${team}${String(i).padStart(2, "0")}`;
      stickers.push({
        code,
        team,
        type: "team",
        number: i,
        sortOrder: sortOrder++,
        name: i === 1 ? "Escudo" : i === 13 ? "Foto do time" : null,
      });
    }
  }

  if (stickers.length !== TOTAL_STICKERS) {
    throw new Error(`Expected ${TOTAL_STICKERS} stickers, got ${stickers.length}`);
  }

  return stickers;
}

export const STICKER_CODES = new Set(
  buildStickerCatalog().map((sticker) => sticker.code.toUpperCase()),
);

export type GabaritoCell = {
  code: string;
  number: number | null;
  label: string;
};

export type GabaritoSection = {
  id: string;
  kind: "special" | "team";
  title: string;
  flag: string;
  cells: GabaritoCell[];
};

export function buildGabaritoSections(): GabaritoSection[] {
  const sections: GabaritoSection[] = [];

  sections.push({
    id: "FWC",
    kind: "special",
    title: "Especiais",
    flag: "⭐",
    cells: SPECIAL_STICKERS.map((s) => ({
      code: s.code,
      number: null,
      label: s.code,
    })),
  });

  for (const team of TEAMS) {
    const info = getTeamInfo(team);
    const cells: GabaritoCell[] = [];
    for (let i = 1; i <= 20; i++) {
      const code = `${team}${String(i).padStart(2, "0")}`;
      cells.push({
        code,
        number: i,
        label: code,
      });
    }
    sections.push({
      id: team,
      kind: "team",
      title: info.name,
      flag: info.flag,
      cells,
    });
  }

  return sections;
}
