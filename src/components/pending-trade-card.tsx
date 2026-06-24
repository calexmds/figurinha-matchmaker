import {
  acceptTradeAction,
  cancelTrade,
  completeTrade,
  rejectTradeAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { StickerChipList } from "@/components/sticker-heat-badge";
import type { PendingTrade } from "@/lib/trades";
import { cn } from "@/lib/cn";

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
      className={cn(
        "fluent-card border-2 border-dashed p-5",
        isIncomingProposal
          ? "border-accent bg-[#f7fbff]"
          : "border-golden bg-card",
      )}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-win-amber">
          {statusLabel}
          {trade.groupName ? (
            <span className="ml-2 normal-case text-accent">
              · {trade.groupName}
            </span>
          ) : null}
        </p>
        <h3 className="mt-1 text-xl font-bold text-ink">
          Com {trade.partnerName}
        </h3>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-dashed border-golden/60 bg-[#fffbf0] p-4">
          <p className="text-xs font-semibold uppercase text-win-amber">
            Você entrega
          </p>
          <div className="mt-2">
            <StickerChipList codes={trade.give} variant="give" />
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-reserve/50 bg-reserve/5 p-4">
          <p className="text-xs font-semibold uppercase text-reserve">
            Você recebe
          </p>
          <div className="mt-2">
            <StickerChipList codes={trade.receive} variant="receive" />
          </div>
        </div>
      </div>

      {isActive ? (
        <div className="mt-4 flex gap-2 text-xs">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-semibold",
              trade.myConfirmed
                ? "bg-[#e8f5e9] text-win-green"
                : "bg-mica text-ink-soft",
            )}
          >
            Você {trade.myConfirmed ? "✓" : "—"}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-semibold",
              trade.partnerConfirmed
                ? "bg-[#e8f5e9] text-win-green"
                : "bg-mica text-ink-soft",
            )}
          >
            {trade.partnerName} {trade.partnerConfirmed ? "✓" : "—"}
          </span>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-ink-soft">
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
              <Button type="submit" fullWidth>
                Aceitar troca
              </Button>
            </form>
            <form action={rejectTradeAction} className="flex-1">
              <input type="hidden" name="tradeId" value={trade.id} />
              <Button type="submit" variant="secondary" fullWidth>
                Recusar
              </Button>
            </form>
          </>
        ) : isWaitingAcceptance ? (
          <form action={cancelTrade} className="flex-1">
            <input type="hidden" name="tradeId" value={trade.id} />
            <Button type="submit" variant="secondary" fullWidth>
              Cancelar proposta
            </Button>
          </form>
        ) : isActive ? (
          <>
            {awaitingMyConfirm ? (
              <form action={completeTrade} className="flex-1">
                <input type="hidden" name="tradeId" value={trade.id} />
                <Button type="submit" variant="success" fullWidth>
                  Confirmar troca ✓
                </Button>
              </form>
            ) : (
              <p className="flex min-h-11 flex-1 items-center rounded-xl border border-golden/50 bg-[#fffbf0] px-4 py-3 text-sm font-semibold text-win-amber">
                Aguardando {trade.partnerName}
              </p>
            )}
            <form action={cancelTrade} className="flex-1">
              <input type="hidden" name="tradeId" value={trade.id} />
              <Button type="submit" variant="secondary" fullWidth>
                Cancelar
              </Button>
            </form>
          </>
        ) : null}
      </div>
    </article>
  );
}
