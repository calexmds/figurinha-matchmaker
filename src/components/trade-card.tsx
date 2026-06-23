import { combineTrade } from "@/app/actions";
import type { TradeMatch } from "@/lib/types";
import type { GroupMarket } from "@/lib/group-intelligence";
import { getMarketInfo } from "@/lib/group-intelligence";
import { StickerChipList } from "@/components/sticker-heat-badge";
import { WhatsAppShareButton } from "@/components/whatsapp-share";
import { buildTradeMessage } from "@/lib/whatsapp";

type TradeCardProps = {
  match: TradeMatch;
  rank: number;
  groupId: string;
  market?: GroupMarket;
  hasPendingWithPartner?: boolean;
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
  market,
  hasPendingWithPartner,
}: TradeCardProps) {
  const hasGoldenGive =
    market &&
    match.hotGive?.some((c) => getMarketInfo(market, c)?.level === "golden");
  const hasHotGive = (match.hotGive?.length ?? 0) > 0;
  const allCodes = [...match.give, ...match.receive];
  const levels = marketLevelsForCodes(allCodes, market);

  const cardClass = hasGoldenGive
    ? "fluent-card relative overflow-hidden border-2 border-[#d4a017]/50 p-5 shadow-[0_4px_24px_rgba(212,160,23,0.12)]"
    : hasHotGive
      ? "fluent-card border border-[#ffb366]/40 p-5"
      : "fluent-card p-5";

  return (
    <article className={cardClass}>
      {hasGoldenGive ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ffd966] via-[#ff8c00] to-[#d4a017]" />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#0067c0]">
              #{rank} melhor troca
            </p>
            {hasGoldenGive ? (
              <span className="rounded-full bg-gradient-to-r from-[#fff3cc] to-[#ffe8a3] px-2 py-0.5 text-[10px] font-bold uppercase text-[#9a6700] ring-1 ring-[#d4a017]/40">
                👑 Poder de ouro
              </span>
            ) : hasHotGive ? (
              <span className="rounded-full bg-[#fff4e6] px-2 py-0.5 text-[10px] font-bold uppercase text-[#c45c00]">
                🔥 Barganha quente
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 text-xl font-bold text-[#1b1b1b]">{match.name}</h3>
          <p className="mt-1 text-sm text-[#5f5f5f]">
            Score {match.score}
            {match.heatScore ? (
              <span className="text-[#c45c00]"> · +{match.heatScore} radar</span>
            ) : null}{" "}
            · Você recebe {match.receiveCount} · Você entrega {match.giveCount}
          </p>
        </div>
      </div>

      {match.bargainTip ? (
        <div className="mt-4 rounded-lg border border-[#d4a017]/30 bg-gradient-to-r from-[#fffbeb] to-[#fff8e6] px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#9a6700]">
            💡 Dica de negociação
          </p>
          <p className="mt-1 text-sm leading-6 text-[#5c4a1a]">{match.bargainTip}</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[#cfe9cf] bg-[#eef7ee] p-4">
          <p className="text-xs font-semibold uppercase text-[#0f7b0f]">
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
        <div className="rounded-lg border border-[#ecdfc0] bg-[#fbf6ea] p-4">
          <p className="text-xs font-semibold uppercase text-[#9a6700]">
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

      {match.receiveCount > 0 || match.giveCount > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          {hasPendingWithPartner ? (
            <p className="rounded-md border border-[#ecdfc0] bg-[#fffbf0] px-4 py-3 text-sm text-[#9a6700]">
              Já existe uma troca combinada com {match.name.split(" ")[0]}.
              Conclua ou cancele antes de combinar outra.
            </p>
          ) : (
            <form action={combineTrade}>
              <input type="hidden" name="groupId" value={groupId} />
              <input type="hidden" name="partnerId" value={match.userId} />
              <input type="hidden" name="give" value={match.give.join(",")} />
              <input
                type="hidden"
                name="receive"
                value={match.receive.join(",")}
              />
              <button
                type="submit"
                className={`min-h-11 w-full rounded-md px-4 py-3 text-sm font-semibold text-white active:opacity-90 ${
                  hasGoldenGive
                    ? "bg-gradient-to-r from-[#9a6700] to-[#c45c00] shadow-md"
                    : "bg-[#0067c0] active:bg-[#005aa8]"
                }`}
              >
                {hasGoldenGive ? "Combinar troca de ouro" : "Combinar esta troca"}
              </button>
            </form>
          )}
          <WhatsAppShareButton
            message={buildTradeMessage(match.name, match.receive, match.give)}
            label={`Combinar com ${match.name.split(" ")[0]} no WhatsApp`}
            className="w-full"
          />
        </div>
      ) : null}
    </article>
  );
}
