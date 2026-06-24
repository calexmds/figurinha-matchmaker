import {
  acceptTradeAction,
  cancelTrade,
  completeTrade,
  rejectTradeAction,
} from "@/app/actions";
import type { PendingTrade } from "@/lib/trades";

type PendingTradeCardProps = {
  trade: PendingTrade;
};

export function PendingTradeCard({ trade }: PendingTradeCardProps) {
  const isIncomingProposal =
    trade.status === "proposed" && trade.role === "partner";
  const isWaitingAcceptance =
    trade.status === "proposed" && trade.role === "initiator";
  const isActive = trade.status === "active";
  const waitingPartnerConfirm = isActive && trade.myConfirmed && !trade.partnerConfirmed;
  const awaitingMyConfirm = isActive && !trade.myConfirmed;

  const statusLabel = isIncomingProposal
    ? "Nova proposta · aguardando sua resposta"
    : isWaitingAcceptance
      ? "Proposta enviada · aguardando aceite"
      : waitingPartnerConfirm
        ? "Você confirmou · aguardando parceiro"
        : "Troca aceita · confirme após o encontro";

  return (
    <article
      className={`fluent-card border-2 border-dashed p-5 ${
        isIncomingProposal
          ? "border-[#0067c0] bg-[#f7fbff]"
          : "border-[#d4a017] bg-white"
      }`}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9a6700]">
          {statusLabel}
          {trade.groupName ? (
            <span className="ml-2 normal-case text-[#0067c0]">
              · {trade.groupName}
            </span>
          ) : null}
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

      {isActive ? (
        <div className="mt-4 flex gap-2 text-xs">
          <span
            className={`rounded-full px-2.5 py-1 font-semibold ${
              trade.myConfirmed
                ? "bg-[#e8f5e9] text-[#0f7b0f]"
                : "bg-[#f5f5f5] text-[#5f5f5f]"
            }`}
          >
            Você {trade.myConfirmed ? "✓" : "—"}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 font-semibold ${
              trade.partnerConfirmed
                ? "bg-[#e8f5e9] text-[#0f7b0f]"
                : "bg-[#f5f5f5] text-[#5f5f5f]"
            }`}
          >
            {trade.partnerName} {trade.partnerConfirmed ? "✓" : "—"}
          </span>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-[#5f5f5f]">
        {isIncomingProposal
          ? "Aceite para reservar as figurinhas nos dois lados. Recuse se não quiser esta combinação."
          : isWaitingAcceptance
            ? "Quando o parceiro aceitar, as figurinhas ficam reservadas até a troca física."
            : waitingPartnerConfirm
              ? "Sua confirmação foi registrada. Quando o parceiro confirmar também, as coleções serão atualizadas."
              : "Após o encontro, cada um confirma do seu lado. Só quando os dois confirmarem as coleções são atualizadas."}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {isIncomingProposal ? (
          <>
            <form action={acceptTradeAction} className="flex-1">
              <input type="hidden" name="tradeId" value={trade.id} />
              <button
                type="submit"
                className="min-h-11 w-full rounded-md bg-[#0067c0] px-4 py-3 text-sm font-semibold text-white active:bg-[#005aa8]"
              >
                Aceitar troca
              </button>
            </form>
            <form action={rejectTradeAction} className="flex-1">
              <input type="hidden" name="tradeId" value={trade.id} />
              <button
                type="submit"
                className="min-h-11 w-full rounded-md border border-[#d0d0d0] bg-white px-4 py-3 text-sm font-semibold text-[#5f5f5f] active:bg-[#f5f5f5]"
              >
                Recusar
              </button>
            </form>
          </>
        ) : isWaitingAcceptance ? (
          <form action={cancelTrade} className="flex-1">
            <input type="hidden" name="tradeId" value={trade.id} />
            <button
              type="submit"
              className="min-h-11 w-full rounded-md border border-[#d0d0d0] bg-white px-4 py-3 text-sm font-semibold text-[#5f5f5f] active:bg-[#f5f5f5]"
            >
              Cancelar proposta
            </button>
          </form>
        ) : isActive ? (
          <>
            {awaitingMyConfirm ? (
              <form action={completeTrade} className="flex-1">
                <input type="hidden" name="tradeId" value={trade.id} />
                <button
                  type="submit"
                  className="min-h-11 w-full rounded-md bg-[#0f7b0f] px-4 py-3 text-sm font-semibold text-white active:bg-[#0c640c]"
                >
                  Confirmar troca ✓
                </button>
              </form>
            ) : (
              <p className="flex min-h-11 flex-1 items-center rounded-md border border-[#d4a017] bg-[#fffbf0] px-4 py-3 text-sm font-semibold text-[#9a6700]">
                Aguardando {trade.partnerName}
              </p>
            )}
            <form action={cancelTrade} className="flex-1">
              <input type="hidden" name="tradeId" value={trade.id} />
              <button
                type="submit"
                className="min-h-11 w-full rounded-md border border-[#d0d0d0] bg-white px-4 py-3 text-sm font-semibold text-[#5f5f5f] active:bg-[#f5f5f5]"
              >
                Cancelar
              </button>
            </form>
          </>
        ) : null}
      </div>
    </article>
  );
}
