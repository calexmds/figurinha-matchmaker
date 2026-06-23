import type {
  GroupIntelligence,
  GroupMarket,
  HeatLevel,
  StickerMarketInfo,
  UserChaseSticker,
  UserPowerSticker,
} from "@/lib/types";

type MemberSnapshot = {
  userId: string;
  duplicates: Array<{ code: string; quantity: number }>;
  needs: string[];
};

const HEAT_WEIGHT: Record<HeatLevel, number> = {
  common: 0,
  wanted: 5,
  hot: 15,
  golden: 35,
};

export function getHeatWeight(level: HeatLevel): number {
  return HEAT_WEIGHT[level];
}

export function getHeatLabel(level: HeatLevel): string {
  switch (level) {
    case "golden":
      return "Ouro do grupo";
    case "hot":
      return "Quente";
    case "wanted":
      return "Procurada";
    default:
      return "";
  }
}

export function getHeatEmoji(level: HeatLevel): string {
  switch (level) {
    case "golden":
      return "👑";
    case "hot":
      return "🔥";
    case "wanted":
      return "✨";
    default:
      return "";
  }
}

function classifyHeat(
  demand: number,
  suppliers: number,
  memberCount: number,
): HeatLevel {
  if (demand === 0) return "common";

  const majority = demand >= Math.max(3, Math.ceil(memberCount * 0.45));
  const soleSupply = suppliers <= 1;

  if (majority && soleSupply && demand >= 3) return "golden";
  if (demand >= 3 && soleSupply) return "hot";
  if (demand >= 2 && demand > suppliers) return "wanted";
  return "common";
}

export function buildGroupMarket(members: MemberSnapshot[]): GroupMarket {
  const memberCount = members.length;
  const demandByCode = new Map<string, number>();
  const suppliersByCode = new Map<string, Set<string>>();

  for (const member of members) {
    const needSet = new Set(member.needs);
    for (const code of needSet) {
      demandByCode.set(code, (demandByCode.get(code) ?? 0) + 1);
    }
    for (const dup of member.duplicates) {
      if (dup.quantity <= 0) continue;
      const set = suppliersByCode.get(dup.code) ?? new Set<string>();
      set.add(member.userId);
      suppliersByCode.set(dup.code, set);
    }
  }

  const allCodes = new Set([
    ...demandByCode.keys(),
    ...suppliersByCode.keys(),
  ]);

  const byCode = new Map<string, StickerMarketInfo>();

  for (const code of allCodes) {
    const demand = demandByCode.get(code) ?? 0;
    const supplierIds = [...(suppliersByCode.get(code) ?? new Set<string>())];
    const suppliers = supplierIds.length;
    const scarcity = demand / Math.max(suppliers, 1);
    const soleSupplierId = suppliers === 1 ? supplierIds[0] : null;

    byCode.set(code, {
      code,
      demand,
      suppliers,
      supplierIds,
      scarcity,
      level: classifyHeat(demand, suppliers, memberCount),
      soleSupplierId,
    });
  }

  return { memberCount, byCode };
}

function suggestedAsk(level: HeatLevel, demand: number): number {
  if (level === "golden") return Math.min(3, Math.max(2, Math.ceil(demand / 3)));
  if (level === "hot") return 2;
  if (level === "wanted") return 2;
  return 1;
}

function buildBargainTip(
  code: string,
  info: StickerMarketInfo,
  memberCount: number,
): string {
  const ask = suggestedAsk(info.level, info.demand);
  if (info.level === "golden") {
    return `${info.demand} de ${memberCount} no grupo precisam de ${code} — só ${info.suppliers} pessoa tem repetida. Você pode pedir até ${ask} figurinhas por 1.`;
  }
  if (info.level === "hot") {
    return `${info.demand} pessoas precisam de ${code} e quase ninguém tem repetida. Peça ${ask} por 1 na negociação.`;
  }
  if (info.level === "wanted") {
    return `${code} está mais procurada que a oferta no grupo. Vale pedir um pouco mais.`;
  }
  return "";
}

export function buildGroupIntelligence(
  members: MemberSnapshot[],
  currentUserId: string,
): GroupIntelligence {
  const market = buildGroupMarket(members);
  const current = members.find((m) => m.userId === currentUserId);
  const powerStickers: UserPowerSticker[] = [];
  const chaseStickers: UserChaseSticker[] = [];

  if (current) {
    for (const dup of current.duplicates) {
      if (dup.quantity <= 0) continue;
      const info = market.byCode.get(dup.code);
      if (!info || info.level === "common") continue;
      const soleSupplier = info.soleSupplierId === currentUserId;
      powerStickers.push({
        code: dup.code,
        demand: info.demand,
        suppliers: info.suppliers,
        level: info.level,
        soleSupplier,
        suggestedAsk: suggestedAsk(info.level, info.demand),
        bargainTip: buildBargainTip(dup.code, info, market.memberCount),
      });
    }

    for (const code of current.needs) {
      const info = market.byCode.get(code);
      if (!info || info.level === "common") continue;
      const competitors = Math.max(0, info.demand - 1);
      let chaseTip = "";
      if (info.level === "golden") {
        chaseTip = `${competitors} colega${competitors === 1 ? "" : "s"} também precisam — só ${info.suppliers} tem repetida. Corra!`;
      } else if (info.level === "hot") {
        chaseTip = `Alta disputa por ${code}. ${info.suppliers} pessoa(s) com repetida no grupo.`;
      } else {
        chaseTip = `${code} está em falta no grupo. Negocie cedo.`;
      }
      chaseStickers.push({
        code,
        demand: info.demand,
        suppliers: info.suppliers,
        level: info.level,
        competitors,
        chaseTip,
      });
    }
  }

  const levelOrder: Record<HeatLevel, number> = {
    golden: 0,
    hot: 1,
    wanted: 2,
    common: 3,
  };

  powerStickers.sort(
    (a, b) =>
      levelOrder[a.level] - levelOrder[b.level] || b.demand - a.demand,
  );
  chaseStickers.sort(
    (a, b) =>
      levelOrder[a.level] - levelOrder[b.level] || b.competitors - a.competitors,
  );

  const hotCodes: string[] = [];
  const goldenCodes: string[] = [];
  for (const info of market.byCode.values()) {
    if (info.level === "golden") goldenCodes.push(info.code);
    else if (info.level === "hot") hotCodes.push(info.code);
  }

  return {
    market,
    powerStickers,
    chaseStickers,
    hotCodes: hotCodes.sort(),
    goldenCodes: goldenCodes.sort(),
  };
}

export function getMarketInfo(
  market: GroupMarket,
  code: string,
): StickerMarketInfo | null {
  return market.byCode.get(code) ?? null;
}

export function computeTradeHeatBonus(
  market: GroupMarket,
  give: string[],
  receive: string[],
): {
  heatScore: number;
  bargainPower: number;
  hotGive: string[];
  hotReceive: string[];
  bargainTip: string | null;
} {
  const hotGive: string[] = [];
  const hotReceive: string[] = [];
  let heatScore = 0;
  let bargainPower = 0;
  let topTip: { level: HeatLevel; tip: string } | null = null;

  for (const code of give) {
    const info = market.byCode.get(code);
    if (!info || info.level === "common") continue;
    hotGive.push(code);
    heatScore += getHeatWeight(info.level);
    bargainPower += info.demand;
    const tip = buildBargainTip(code, info, market.memberCount);
    if (
      tip &&
      (!topTip ||
        getHeatWeight(info.level) > getHeatWeight(topTip.level))
    ) {
      topTip = { level: info.level, tip };
    }
  }

  for (const code of receive) {
    const info = market.byCode.get(code);
    if (!info || info.level === "common") continue;
    hotReceive.push(code);
    heatScore += Math.round(getHeatWeight(info.level) * 0.6);
  }

  return {
    heatScore,
    bargainPower,
    hotGive,
    hotReceive,
    bargainTip: topTip?.tip ?? null,
  };
}

export function membersFromTradeData(tradeData: {
  currentUserId: string;
  currentDuplicates: Array<{ code: string; quantity: number }>;
  currentNeeds: string[];
  members: Array<{
    userId: string;
    duplicates: Array<{ code: string; quantity: number }>;
    needs: string[];
  }>;
}): MemberSnapshot[] {
  return [
    {
      userId: tradeData.currentUserId,
      duplicates: tradeData.currentDuplicates,
      needs: tradeData.currentNeeds,
    },
    ...tradeData.members.map((m) => ({
      userId: m.userId,
      duplicates: m.duplicates,
      needs: m.needs,
    })),
  ];
}

export type { UserPowerSticker, UserChaseSticker, GroupMarket, StickerMarketInfo };
