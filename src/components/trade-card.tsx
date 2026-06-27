import { TradeProposePanel } from "@/components/trade-propose-panel";
import type { TradeMatch } from "@/lib/types";
import type { GroupMarket } from "@/lib/group-intelligence";
import { getMarketInfo } from "@/lib/group-intelligence";
import { StickerChipList } from "@/components/sticker-heat-badge";
import { cn } from "@/lib/cn";

type TradeCardProps = {
  match: TradeMatch;
  rank: number;
  groupId: string;
  groupName?: string;
  market?: GroupMarket;
  hasPendingWithPartner?: boolean;
  editGivePool?: string[];
  editReceivePool?: string[];
};

function marketLevelsForCodes(codes: string[], market?: GroupMarket) {
  const map = new Map<
    string,
    { level: import("@/lib/types").HeatLevel; demand: number }
  >();
  if (!market) return map;
  for (const code of codes) {
    const info = getMarketInfo(market, code);
    if (info) map.set(code, { level: info.level, demand: info.demand });
  }
  return map;
}

export function TradeCard({
  match,
  rank,
  groupId,
  groupName,
  market,
  hasPendingWithPartner,
  editGivePool = match.give,
  editReceivePool = match.receive,
}: TradeCardProps) {
  const hasGoldenGive =
    market &&
    match.hotGive?.some((c) => getMarketInfo(market, c)?.level === "golden");
  const hasHotGive = (match.hotGive?.length ?? 0) > 0;
  const allCodes = [...match.give, ...match.receive];
  const levels = marketLevelsForCodes(allCodes, market);

  const cardClass = cn(
    "fluent-card p-5",
    hasGoldenGive &&
      "relative overflow-hidden border-2 border-golden/50 shadow-[0_4px_24px_rgba(212,160,23,0.12)]",
    !hasGoldenGive && hasHotGive && "border border-[#ffb366]/40",
  );

  return (
    <article className={cardClass}>
      {hasGoldenGive ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ffd966] via-[#ff8c00] to-golden" />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
              #{rank} melhor troca
            </p>
            {groupName ? (
              <span className="rounded-full bg-[#eaf3fb] px-2 py-0.5 text-[10px] font-semibold text-accent">
                {groupName}
              </span>
            ) : null}
            {hasGoldenGive ? (
              <span className="rounded-full bg-gradient-to-r from-[#fff3cc] to-[#ffe8a3] px-2 py-0.5 text-[10px] font-bold uppercase text-win-amber ring-1 ring-golden/40">
                Poder de ouro
              </span>
            ) : hasHotGive ? (
              <span className="rounded-full bg-[#fff4e6] px-2 py-0.5 text-[10px] font-bold uppercase text-[#c45c00]">
                Barganha quente
              </span>
            ) : null}
          </div>
          <h3 className="font-display mt-1 text-xl font-bold text-ink">
            {match.name}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            Score {match.score}
            {match.heatScore ? (
              <span className="text-[#c45c00]"> · +{match.heatScore} radar</span>
            ) : null}{" "}
            · Você recebe {match.receiveCount} · Você entrega {match.giveCount}
          </p>
        </div>
      </div>

      {match.bargainTip ? (
        <div className="mt-4 rounded-xl border border-golden/30 bg-gradient-to-r from-[#fffbeb] to-[#fff8e6] px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-win-amber">
            Dica de negociação
          </p>
          <p className="mt-1 text-sm leading-6 text-[#5c4a1a]">{match.bargainTip}</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#cfe9cf] bg-[#eef7ee] p-4">
          <p className="text-xs font-semibold uppercase text-win-green">
            Você recebe
          </p>
          <div className="mt-2">
            <StickerChipList
              codes={match.receive}
              marketLevels={levels}
              variant="receive"
              emptyLabel="Nada nesta troca"
            />
          </div>
        </div>
        <div className="rounded-xl border border-[#ecdfc0] bg-[#fbf6ea] p-4">
          <p className="text-xs font-semibold uppercase text-win-amber">
            Você entrega
          </p>
          <div className="mt-2">
            <StickerChipList
              codes={match.give}
              marketLevels={levels}
              variant="give"
              emptyLabel="Nada nesta troca"
            />
          </div>
        </div>
      </div>

      {match.receiveCount > 0 && match.giveCount > 0 ? (
        <div className="mt-4">
          <TradeProposePanel
            groupId={groupId}
            partnerId={match.userId}
            partnerName={match.name}
            suggestedGive={match.give}
            suggestedReceive={match.receive}
            givePool={editGivePool}
            receivePool={editReceivePool}
            market={market}
            hasPendingWithPartner={hasPendingWithPartner}
            accent={hasGoldenGive ? "golden" : "default"}
          />
        </div>
      ) : null}
    </article>
  );
}
