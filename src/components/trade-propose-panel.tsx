"use client";

import { useMemo, useState } from "react";
import { combineTrade } from "@/app/actions";
import type { GroupMarket } from "@/lib/group-intelligence";
import { getMarketInfo } from "@/lib/group-intelligence";
import { StickerHeatBadge } from "@/components/sticker-heat-badge";
import { WhatsAppShareButton } from "@/components/whatsapp-share";
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
    return "Selecione ao menos uma figurinha para propor.";
  }
  if (giveCount === 0 || receiveCount === 0) {
    return "Troca só de um lado — ok, mas trocas equilibradas costumam ser aceitas mais.";
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

  const canPropose = selectedGive.length > 0 || selectedReceive.length > 0;

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

  if (hasPendingWithPartner) {
    return (
      <p className="rounded-md border border-[#ecdfc0] bg-[#fffbf0] px-4 py-3 text-sm text-[#9a6700]">
        Já existe uma proposta ou troca aberta com {partnerName.split(" ")[0]}{" "}
        neste grupo.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {!open ? (
        <>
          <button
            type="button"
            onClick={() => {
              resetToSuggestion();
              setOpen(true);
            }}
            className={`min-h-11 w-full rounded-md px-4 py-3 text-sm font-semibold text-white active:opacity-90 ${
              accent === "golden"
                ? "bg-gradient-to-r from-[#9a6700] to-[#c45c00] shadow-md"
                : "bg-[#0067c0] active:bg-[#005aa8]"
            }`}
          >
            Ajustar e propor troca
          </button>
          <form action={combineTrade}>
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="partnerId" value={partnerId} />
            <input type="hidden" name="give" value={suggestedGive.join(",")} />
            <input
              type="hidden"
              name="receive"
              value={suggestedReceive.join(",")}
            />
            <button
              type="submit"
              className="min-h-11 w-full rounded-md border border-[#d0d0d0] bg-white px-4 py-3 text-sm font-semibold text-[#1b1b1b] active:bg-[#f5f5f5]"
            >
              Propor sugestão sem alterar
            </button>
          </form>
        </>
      ) : (
        <div className="rounded-lg border border-[#0067c0]/30 bg-[#f7fbff] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#1b1b1b]">
                Ajustar troca com {partnerName.split(" ")[0]}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#5f5f5f]">
                Marque o que entra na proposta. Só aparecem figurinhas válidas
                para vocês dois.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-md border border-[#d0d0d0] px-2 py-1 text-xs font-semibold text-[#5f5f5f]"
            >
              Fechar
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-[#9a6700]">
                Você entrega ({selectedGive.length})
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {givePool.length === 0 ? (
                  <p className="text-xs text-[#8a8a8a]">
                    Nada disponível para entregar.
                  </p>
                ) : (
                  givePool.map((code) => {
                    const selected = selectedGive.includes(code);
                    const info = market ? getMarketInfo(market, code) : null;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() =>
                          setSelectedGive((prev) => toggleCode(prev, code))
                        }
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
                          selected
                            ? "border-[#9a6700] bg-[#fffbf0] text-[#9a6700] ring-2 ring-[#d4a017]/40"
                            : "border-[#e6e6e6] bg-white text-[#5f5f5f]"
                        }`}
                      >
                        {code}
                        {info && info.level !== "common" ? (
                          <StickerHeatBadge
                            level={info.level}
                            demand={info.demand}
                            compact
                          />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-[#0f7b0f]">
                Você recebe ({selectedReceive.length})
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {receivePool.length === 0 ? (
                  <p className="text-xs text-[#8a8a8a]">
                    Nada disponível para receber.
                  </p>
                ) : (
                  receivePool.map((code) => {
                    const selected = selectedReceive.includes(code);
                    const info = market ? getMarketInfo(market, code) : null;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() =>
                          setSelectedReceive((prev) => toggleCode(prev, code))
                        }
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
                          selected
                            ? "border-[#0f7b0f] bg-[#eef7ee] text-[#0f7b0f] ring-2 ring-[#0f7b0f]/30"
                            : "border-[#e6e6e6] bg-white text-[#5f5f5f]"
                        }`}
                      >
                        {code}
                        {info && info.level !== "common" ? (
                          <StickerHeatBadge
                            level={info.level}
                            demand={info.demand}
                            compact
                          />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-[#5f5f5f]">{hint}</p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!canPropose || busy}
              onClick={() => void handlePropose()}
              className={`min-h-11 flex-1 rounded-md px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 ${
                accent === "golden"
                  ? "bg-gradient-to-r from-[#9a6700] to-[#c45c00]"
                  : "bg-[#0067c0] active:bg-[#005aa8]"
              }`}
            >
              {busy ? "Enviando…" : "Enviar proposta"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={resetToSuggestion}
              className="min-h-11 flex-1 rounded-md border border-[#d0d0d0] bg-white px-4 py-3 text-sm font-semibold text-[#1b1b1b]"
            >
              Restaurar sugestão
            </button>
          </div>
        </div>
      )}

      <WhatsAppShareButton
        message={buildTradeMessage(
          partnerName,
          open ? selectedReceive : suggestedReceive,
          open ? selectedGive : suggestedGive,
        )}
        label={`Combinar com ${partnerName.split(" ")[0]} no WhatsApp`}
        className="w-full"
      />
    </div>
  );
}
