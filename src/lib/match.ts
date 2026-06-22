import type { TradeMatch } from "@/lib/types";

type Inventory = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  owned: Set<string>;
  duplicates: Set<string>;
  missing: Set<string>;
};

function buildInventory(
  userId: string,
  name: string,
  avatarUrl: string | null,
  stickers: Array<{ code: string; quantity: number }>,
  allCodes: string[],
): Inventory {
  const owned = new Set<string>();
  const duplicates = new Set<string>();

  for (const sticker of stickers) {
    if (sticker.quantity <= 0) continue;
    owned.add(sticker.code);
    if (sticker.quantity > 1) {
      duplicates.add(sticker.code);
    }
  }

  const missing = new Set(
    allCodes.filter((code) => !owned.has(code)),
  );

  return { userId, name, avatarUrl, owned, duplicates, missing };
}

export function computeTradeMatches(
  currentUserId: string,
  currentStickers: Array<{ code: string; quantity: number }>,
  members: Array<{
    userId: string;
    name: string;
    avatarUrl: string | null;
    stickers: Array<{ code: string; quantity: number }>;
  }>,
  allCodes: string[],
): TradeMatch[] {
  const current = buildInventory(
    currentUserId,
    "Você",
    null,
    currentStickers,
    allCodes,
  );

  const matches: TradeMatch[] = [];

  for (const member of members) {
    if (member.userId === currentUserId) continue;

    const other = buildInventory(
      member.userId,
      member.name,
      member.avatarUrl,
      member.stickers,
      allCodes,
    );

    const receive = [...current.missing].filter((code) =>
      other.duplicates.has(code),
    );
    const give = [...current.duplicates].filter((code) =>
      other.missing.has(code),
    );

    if (receive.length === 0 && give.length === 0) continue;

    const balanceBonus =
      receive.length === 0 || give.length === 0
        ? 0
        : Math.min(receive.length, give.length) * 2;
    const score = receive.length * 10 + give.length * 5 + balanceBonus;

    matches.push({
      userId: other.userId,
      name: other.name,
      avatarUrl: other.avatarUrl,
      receive: receive.sort(),
      give: give.sort(),
      receiveCount: receive.length,
      giveCount: give.length,
      score,
    });
  }

  return matches.sort((a, b) => b.score - a.score);
}

export function computeCollectionStats(
  stickers: Array<{ code: string; quantity: number }>,
  totalStickers: number,
) {
  let owned = 0;
  let duplicates = 0;

  for (const sticker of stickers) {
    if (sticker.quantity > 0) {
      owned += 1;
    }
    if (sticker.quantity > 1) {
      duplicates += sticker.quantity - 1;
    }
  }

  const missing = totalStickers - owned;
  const percent = Math.round((owned / totalStickers) * 100);

  return { owned, missing, duplicates, percent };
}
