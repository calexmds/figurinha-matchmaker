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
    <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            #{rank} melhor troca
          </p>
          <h3 className="mt-1 text-xl font-bold text-white">{match.name}</h3>
          <p className="mt-1 text-sm text-slate-300">
            Score {match.score} · Você recebe {match.receiveCount} · Você entrega{" "}
            {match.giveCount}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-emerald-500/10 p-4">
          <p className="text-xs font-semibold uppercase text-emerald-200">
            Você recebe
          </p>
          <p className="mt-2 text-sm leading-6 text-white">
            {match.receive.length > 0
              ? match.receive.slice(0, 12).join(", ")
              : "Nada nesta troca"}
            {match.receive.length > 12 ? "…" : ""}
          </p>
        </div>
        <div className="rounded-2xl bg-amber-500/10 p-4">
          <p className="text-xs font-semibold uppercase text-amber-200">
            Você entrega
          </p>
          <p className="mt-2 text-sm leading-6 text-white">
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
