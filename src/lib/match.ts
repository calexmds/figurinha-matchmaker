import type { TradeMatch } from "@/lib/types";
import type { GroupMarket } from "@/lib/group-intelligence";
import { computeTradeHeatBonus } from "@/lib/group-intelligence";

type TradeProfile = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  duplicateCodes: Set<string>;
  needCodes: Set<string>;
};

function buildTradeProfile(
  userId: string,
  name: string,
  avatarUrl: string | null,
  duplicates: Array<{ code: string; quantity: number }>,
  needs: string[],
): TradeProfile {
  const duplicateCodes = new Set<string>();
  for (const item of duplicates) {
    if (item.quantity > 0) {
      duplicateCodes.add(item.code);
    }
  }

  return {
    userId,
    name,
    avatarUrl,
    duplicateCodes,
    needCodes: new Set(needs),
  };
}

export function computeTradeMatches(
  currentUserId: string,
  currentDuplicates: Array<{ code: string; quantity: number }>,
  currentNeeds: string[],
  members: Array<{
    userId: string;
    name: string;
    avatarUrl: string | null;
    duplicates: Array<{ code: string; quantity: number }>;
    needs: string[];
  }>,
  market?: GroupMarket,
): TradeMatch[] {
  const current = buildTradeProfile(
    currentUserId,
    "Você",
    null,
    currentDuplicates,
    currentNeeds,
  );

  const matches: TradeMatch[] = [];

  for (const member of members) {
    if (member.userId === currentUserId) continue;

    const other = buildTradeProfile(
      member.userId,
      member.name,
      member.avatarUrl,
      member.duplicates,
      member.needs,
    );

    const receive = [...current.needCodes].filter((code) =>
      other.duplicateCodes.has(code),
    );
    const give = [...current.duplicateCodes].filter((code) =>
      other.needCodes.has(code),
    );

    if (receive.length === 0 && give.length === 0) continue;

    const balanceBonus =
      receive.length === 0 || give.length === 0
        ? 0
        : Math.min(receive.length, give.length) * 2;
    let score = receive.length * 10 + give.length * 5 + balanceBonus;

    let heatScore = 0;
    let bargainPower = 0;
    let hotGive: string[] = [];
    let hotReceive: string[] = [];
    let bargainTip: string | null = null;

    if (market) {
      const heat = computeTradeHeatBonus(market, give, receive);
      heatScore = heat.heatScore;
      bargainPower = heat.bargainPower;
      hotGive = heat.hotGive;
      hotReceive = heat.hotReceive;
      bargainTip = heat.bargainTip;
      score += heatScore;
    }

    matches.push({
      userId: other.userId,
      name: other.name,
      avatarUrl: other.avatarUrl,
      receive: receive.sort(),
      give: give.sort(),
      receiveCount: receive.length,
      giveCount: give.length,
      score,
      heatScore,
      bargainPower,
      hotGive,
      hotReceive,
      bargainTip,
    });
  }

  return matches.sort((a, b) => b.score - a.score);
}

export function computeTradeStats(
  duplicates: Array<{ code: string; quantity: number }>,
  needs: string[],
) {
  let duplicateCount = 0;
  for (const item of duplicates) {
    duplicateCount += item.quantity;
  }

  return {
    duplicateTypes: duplicates.length,
    duplicateCount,
    needCount: needs.length,
  };
}
