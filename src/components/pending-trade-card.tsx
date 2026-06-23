import { cancelTrade, completeTrade } from "@/app/actions";
import type { PendingTrade } from "@/lib/trades";

type PendingTradeCardProps = {
  trade: PendingTrade;
};

export function PendingTradeCard({ trade }: PendingTradeCardProps) {
  return (
    <article className="fluent-card border-2 border-dashed border-[#d4a017] p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9a6700]">
          Troca combinada · aguardando encontro
        </p>
        <h3 className="mt-1 text-xl font-bold text-[#1b1b1b]">
          Com {trade.partnerName}
        </h3>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-dashed border-[#d4a017] bg-[#fffbf0] p-4">
          <p className="text-xs font-semibold uppercase text-[#9a6700]">
            Você entrega
          </p>
          <p className="mt-2 text-sm leading-6 text-[#1b1b1b]">
            {trade.give.length > 0
              ? trade.give.slice(0, 12).join(", ")
              : "—"}
            {trade.give.length > 12 ? "…" : ""}
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-[#7b5ea7] bg-[#f7f3fb] p-4">
          <p className="text-xs font-semibold uppercase text-[#7b5ea7]">
            Você recebe
          </p>
          <p className="mt-2 text-sm leading-6 text-[#1b1b1b]">
            {trade.receive.length > 0
              ? trade.receive.slice(0, 12).join(", ")
              : "—"}
            {trade.receive.length > 12 ? "…" : ""}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-[#5f5f5f]">
        As figurinhas ficam reservadas no gabarito até você confirmar a troca
        física ou cancelar.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <form action={completeTrade} className="flex-1">
          <input type="hidden" name="tradeId" value={trade.id} />
          <button
            type="submit"
            className="min-h-11 w-full rounded-md bg-[#0f7b0f] px-4 py-3 text-sm font-semibold text-white active:bg-[#0c640c]"
          >
            Troca feita ✓
          </button>
        </form>
        <form action={cancelTrade} className="flex-1">
          <input type="hidden" name="tradeId" value={trade.id} />
          <button
            type="submit"
            className="min-h-11 w-full rounded-md border border-[#d0d0d0] bg-white px-4 py-3 text-sm font-semibold text-[#5f5f5f] active:bg-[#f5f5f5]"
          >
            Cancelar combinação
          </button>
        </form>
      </div>
    </article>
  );
}
