import type { TradeMatch } from "@/lib/types";
import {
  WhatsAppShareButton,
  buildTradeMessage,
} from "@/components/whatsapp-share";

type TradeCardProps = {
  match: TradeMatch;
  rank: number;
};

export function TradeCard({ match, rank }: TradeCardProps) {
  return (
    <article className="fluent-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#0067c0]">
            #{rank} melhor troca
          </p>
          <h3 className="mt-1 text-xl font-bold text-[#1b1b1b]">{match.name}</h3>
          <p className="mt-1 text-sm text-[#5f5f5f]">
            Score {match.score} · Você recebe {match.receiveCount} · Você entrega{" "}
            {match.giveCount}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[#cfe9cf] bg-[#eef7ee] p-4">
          <p className="text-xs font-semibold uppercase text-[#0f7b0f]">
            Você recebe
          </p>
          <p className="mt-2 text-sm leading-6 text-[#1b1b1b]">
            {match.receive.length > 0
              ? match.receive.slice(0, 12).join(", ")
              : "Nada nesta troca"}
            {match.receive.length > 12 ? "…" : ""}
          </p>
        </div>
        <div className="rounded-lg border border-[#ecdfc0] bg-[#fbf6ea] p-4">
          <p className="text-xs font-semibold uppercase text-[#9a6700]">
            Você entrega
          </p>
          <p className="mt-2 text-sm leading-6 text-[#1b1b1b]">
            {match.give.length > 0
              ? match.give.slice(0, 12).join(", ")
              : "Nada nesta troca"}
            {match.give.length > 12 ? "…" : ""}
          </p>
        </div>
      </div>

      {match.receiveCount > 0 || match.giveCount > 0 ? (
        <div className="mt-4">
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
