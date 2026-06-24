import type { TradeMatch } from "@/lib/types";
import type { GroupMarket } from "@/lib/group-intelligence";
import {
  computeTradeHeatBonus,
  getHeatWeight,
} from "@/lib/group-intelligence";

type TradeProfile = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  duplicateCodes: Set<string>;
  needCodes: Set<string>;
};

const MAX_PER_SIDE = 8;
const MAX_RATIO = 2.5;
const MAX_ONE_SIDED = 3;

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

function stickerTradeValue(code: string, market?: GroupMarket): number {
  const info = market?.byCode.get(code);
  if (!info) return 1;
  return info.demand + getHeatWeight(info.level);
}

function selectBalancedSubset(
  receiveAll: string[],
  giveAll: string[],
  market?: GroupMarket,
): { receive: string[]; give: string[] } | null {
  if (receiveAll.length === 0 && giveAll.length === 0) return null;

  if (receiveAll.length === 0 || giveAll.length === 0) {
    const isReceiveOnly = receiveAll.length > 0;
    const codes = isReceiveOnly ? receiveAll : giveAll;
    const sorted = [...codes].sort(
      (a, b) => stickerTradeValue(b, market) - stickerTradeValue(a, market),
    );
    const capped = sorted.slice(0, Math.min(MAX_ONE_SIDED, MAX_PER_SIDE));
    return isReceiveOnly
      ? { receive: capped, give: [] }
      : { receive: [], give: capped };
  }

  const ratio =
    Math.max(receiveAll.length, giveAll.length) /
    Math.min(receiveAll.length, giveAll.length);

  let n = Math.min(receiveAll.length, giveAll.length, MAX_PER_SIDE);
  if (ratio > MAX_RATIO) {
    n = Math.min(
      n,
      Math.ceil(Math.min(receiveAll.length, giveAll.length) * MAX_RATIO),
      MAX_PER_SIDE,
    );
  }

  const receiveSorted = [...receiveAll].sort(
    (a, b) => stickerTradeValue(b, market) - stickerTradeValue(a, market),
  );
  const giveSorted = [...giveAll].sort(
    (a, b) => stickerTradeValue(a, market) - stickerTradeValue(b, market),
  );

  let selectedReceive = receiveSorted.slice(0, n);
  let selectedGive = giveSorted.slice(0, n);

  const goldenGive = selectedGive.filter(
    (code) => market?.byCode.get(code)?.level === "golden",
  );
  if (goldenGive.length > 0) {
    const hasWorthyReceive = selectedReceive.some((code) => {
      const level = market?.byCode.get(code)?.level;
      const demand = market?.byCode.get(code)?.demand ?? 0;
      return level === "golden" || level === "hot" || demand >= 3;
    });
    if (!hasWorthyReceive) {
      const giveWithoutGolden = selectedGive.filter(
        (code) => market?.byCode.get(code)?.level !== "golden",
      );
      const excluded = new Set(giveWithoutGolden);
      for (const code of giveSorted) {
        if (giveWithoutGolden.length >= n) break;
        if (!excluded.has(code) && market?.byCode.get(code)?.level !== "golden") {
          giveWithoutGolden.push(code);
          excluded.add(code);
        }
      }
      selectedGive = giveWithoutGolden.slice(0, n);
    }
  }

  return {
    receive: selectedReceive.sort(),
    give: selectedGive.sort(),
  };
}

/** Códigos que você pode incluir ao montar uma proposta manual com este parceiro. */
export function computeTradeEditPools(
  availableDuplicates: Array<{ code: string; quantity: number }>,
  availableNeeds: string[],
  partnerDuplicates: Array<{ code: string; quantity: number }>,
  partnerNeeds: string[],
): { givePool: string[]; receivePool: string[] } {
  const partnerNeedSet = new Set(
    partnerNeeds.map((code) => code.toUpperCase()),
  );
  const partnerDupSet = new Set(
    partnerDuplicates.map((item) => item.code.toUpperCase()),
  );

  const givePool = availableDuplicates
    .filter((item) => partnerNeedSet.has(item.code.toUpperCase()))
    .map((item) => item.code)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  const receivePool = availableNeeds
    .filter((code) => partnerDupSet.has(code.toUpperCase()))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  return { givePool, receivePool };
}

function scoreBalancedTrade(
  receive: string[],
  give: string[],
  market: GroupMarket | undefined,
  heatScore: number,
): number {
  const paired = Math.min(receive.length, give.length);
  let score = paired * 15;

  if (receive.length === give.length && paired > 0) {
    score += 12;
  }

  score -= Math.abs(receive.length - give.length) * 6;

  if (receive.length === 0 || give.length === 0) {
    score = Math.max(1, Math.floor(score * 0.35));
  }

  score += heatScore;
  return score;
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

    const receiveAll = [...current.needCodes].filter((code) =>
      other.duplicateCodes.has(code),
    );
    const giveAll = [...current.duplicateCodes].filter((code) =>
      other.needCodes.has(code),
    );

    const balanced = selectBalancedSubset(receiveAll, giveAll, market);
    if (!balanced) continue;
    if (balanced.receive.length === 0 && balanced.give.length === 0) continue;

    const { receive, give } = balanced;

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
    }

    const score = scoreBalancedTrade(receive, give, market, heatScore);

    matches.push({
      userId: other.userId,
      name: other.name,
      avatarUrl: other.avatarUrl,
      receive,
      give,
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
