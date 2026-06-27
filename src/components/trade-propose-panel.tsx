"use client";

import { useMemo, useState } from "react";
import { combineTrade } from "@/app/actions";
import type { GroupMarket } from "@/lib/group-intelligence";
import { getMarketInfo } from "@/lib/group-intelligence";
import { StickerHeatBadge } from "@/components/sticker-heat-badge";
import { WhatsAppShareButton } from "@/components/whatsapp-share";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { buildTradeMessage } from "@/lib/whatsapp";

type TradeProposePanelProps = {
  groupId: string;
  partnerId: string;
  partnerName: string;
  suggestedGive: string[];
  suggestedReceive: string[];
  givePool: string[];
  receivePool: string[];
  market?: GroupMarket;
  hasPendingWithPartner?: boolean;
  accent?: "default" | "golden";
};

function toggleCode(list: string[], code: string) {
  return list.includes(code)
    ? list.filter((item) => item !== code)
    : [...list, code].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function balanceHint(giveCount: number, receiveCount: number) {
  if (giveCount === 0 && receiveCount === 0) {
    return "Selecione figurinhas dos dois lados para propor a troca.";
  }
  if (giveCount === 0 || receiveCount === 0) {
    return "Troca inválida — selecione o que você entrega e o que recebe.";
  }
  const ratio =
    Math.max(giveCount, receiveCount) / Math.min(giveCount, receiveCount);
  if (ratio > 2.5) {
    return "Pacote desequilibrado — considere equilibrar os lados para facilitar o aceite.";
  }
  if (giveCount === receiveCount) {
    return "Troca equilibrada — boa chance de aceite.";
  }
  return "Revise a combinação antes de enviar a proposta.";
}

function ChipToggle({
  code,
  selected,
  side,
  onToggle,
  market,
}: {
  code: string;
  selected: boolean;
  side: "give" | "receive";
  onToggle: () => void;
  market?: GroupMarket;
}) {
  const info = market ? getMarketInfo(market, code) : null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected
          ? side === "give"
            ? "border-win-amber bg-[#fffbf0] text-win-amber ring-2 ring-golden/40"
            : "border-win-green bg-[#eef7ee] text-win-green ring-2 ring-win-green/30"
          : "border-line bg-card text-ink-soft",
      )}
    >
      {code}
      {info && info.level !== "common" ? (
        <StickerHeatBadge level={info.level} demand={info.demand} compact />
      ) : null}
    </button>
  );
}

export function TradeProposePanel({
  groupId,
  partnerId,
  partnerName,
  suggestedGive,
  suggestedReceive,
  givePool,
  receivePool,
  market,
  hasPendingWithPartner,
  accent = "default",
}: TradeProposePanelProps) {
  const [open, setOpen] = useState(false);
  const [selectedGive, setSelectedGive] = useState(suggestedGive);
  const [selectedReceive, setSelectedReceive] = useState(suggestedReceive);
  const [busy, setBusy] = useState(false);

  const hint = useMemo(
    () => balanceHint(selectedGive.length, selectedReceive.length),
    [selectedGive.length, selectedReceive.length],
  );

  const canPropose = selectedGive.length > 0 && selectedReceive.length > 0;
  const partnerFirst = partnerName.split(" ")[0];

  async function handlePropose() {
    if (!canPropose || busy) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("groupId", groupId);
    fd.set("partnerId", partnerId);
    fd.set("give", selectedGive.join(","));
    fd.set("receive", selectedReceive.join(","));
    await combineTrade(fd);
  }

  function resetToSuggestion() {
    setSelectedGive(suggestedGive);
    setSelectedReceive(suggestedReceive);
  }

  function openEditor() {
    resetToSuggestion();
    setOpen(true);
  }

  if (hasPendingWithPartner) {
    return (
      <Callout variant="warning" className="p-4">
        Já existe uma proposta ou troca aberta com {partnerFirst} neste grupo.
      </Callout>
    );
  }

  const primaryClass =
    accent === "golden"
      ? "bg-gradient-to-r from-win-amber to-[#c45c00] shadow-md"
      : undefined;

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        onClick={openEditor}
        fullWidth
        className={primaryClass}
      >
        Ajustar e propor troca
      </Button>

      <form action={combineTrade}>
        <input type="hidden" name="groupId" value={groupId} />
        <input type="hidden" name="partnerId" value={partnerId} />
        <input type="hidden" name="give" value={suggestedGive.join(",")} />
        <input type="hidden" name="receive" value={suggestedReceive.join(",")} />
        <Button type="submit" variant="ghost" fullWidth>
          Propor sugestão sem alterar
        </Button>
      </form>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Ajustar troca com ${partnerFirst}`}
        description="Marque o que entra na proposta. Só aparecem figurinhas válidas para vocês dois."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-win-amber">
              Você entrega ({selectedGive.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {givePool.length === 0 ? (
                <p className="text-xs text-ink-muted">
                  Nada disponível para entregar.
                </p>
              ) : (
                givePool.map((code) => (
                  <ChipToggle
                    key={code}
                    code={code}
                    selected={selectedGive.includes(code)}
                    side="give"
                    market={market}
                    onToggle={() =>
                      setSelectedGive((prev) => toggleCode(prev, code))
                    }
                  />
                ))
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-win-green">
              Você recebe ({selectedReceive.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {receivePool.length === 0 ? (
                <p className="text-xs text-ink-muted">
                  Nada disponível para receber.
                </p>
              ) : (
                receivePool.map((code) => (
                  <ChipToggle
                    key={code}
                    code={code}
                    selected={selectedReceive.includes(code)}
                    side="receive"
                    market={market}
                    onToggle={() =>
                      setSelectedReceive((prev) => toggleCode(prev, code))
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs leading-5 text-ink-soft">{hint}</p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            disabled={!canPropose || busy}
            onClick={() => void handlePropose()}
            fullWidth
            className={cn("sm:flex-1", primaryClass)}
          >
            {busy ? "Enviando…" : "Enviar proposta"}
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={resetToSuggestion}
            variant="secondary"
            fullWidth
            className="sm:flex-1"
          >
            Restaurar sugestão
          </Button>
        </div>
      </Sheet>

      <WhatsAppShareButton
        message={buildTradeMessage(
          partnerName,
          open ? selectedReceive : suggestedReceive,
          open ? selectedGive : suggestedGive,
        )}
        label={`Combinar com ${partnerFirst} no WhatsApp`}
        className="w-full"
      />
    </div>
  );
}
