"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StickerEdit } from "@/lib/stickers/persist-edits";
import type { GabaritoSection } from "@/lib/stickers/catalog";
import {
  countOwnedTypes,
  countRepetidasTotal,
  deriveNeeds,
} from "@/lib/stickers/collection";
import type { HeatLevel } from "@/lib/types";
import { getHeatEmoji } from "@/lib/group-intelligence";
import { TOTAL_STICKERS } from "@/lib/constants";

type ViewTab = "tenho" | "repetidas" | "preciso";
type SaveStatus = "idle" | "saving" | "saved" | "error";

type GabaritoProps = {
  sections: GabaritoSection[];
  initialOwned: Record<string, number>;
  initialReservedGive?: string[];
  initialReservedReceive?: string[];
  initialHeatLevels?: Record<string, HeatLevel>;
};

export function Gabarito({
  sections,
  initialOwned,
  initialReservedGive = [],
  initialReservedReceive = [],
  initialHeatLevels = {},
}: GabaritoProps) {
  const reservedGive = useRef(new Set(initialReservedGive));
  const reservedReceive = useRef(new Set(initialReservedReceive));
  const heatLevels = useRef(initialHeatLevels);
  const [tab, setTab] = useState<ViewTab>("tenho");
  const [owned, setOwned] = useState<Record<string, number>>(initialOwned);
  const [openSection, setOpenSection] = useState<string | null>(
    sections[1]?.id ?? sections[0]?.id ?? null,
  );
  const [sheetCode, setSheetCode] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const pending = useRef<Map<string, StickerEdit>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const derivedNeeds = useMemo(() => deriveNeeds(owned), [owned]);

  const postEdits = useCallback(
    async (edits: StickerEdit[], keepalive = false) => {
      const res = await fetch("/api/stickers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edits }),
        keepalive,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        return {
          error: data.error ?? "Erro ao salvar.",
          detail: data.detail,
        };
      }
      return { ok: true as const };
    },
    [],
  );

  const flush = useCallback(
    async (keepalive = false) => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (pending.current.size === 0) return;
      const edits = [...pending.current.values()];
      pending.current.clear();
      setStatus("saving");
      setErrorDetail(null);
      const result = await postEdits(edits, keepalive);
      if ("error" in result) {
        setStatus("error");
        setErrorDetail(result.detail ?? result.error ?? "Erro ao salvar.");
        edits.forEach((e) =>
          pending.current.set(`${e.kind}:${e.code}`, e),
        );
      } else {
        setStatus("saved");
      }
    },
    [postEdits],
  );

  const scheduleFlush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush();
    }, 700);
  }, [flush]);

  const queueEdit = useCallback(
    (code: string, quantity: number) => {
      pending.current.set(`have:${code}`, {
        kind: "have",
        code,
        quantity,
      });
      setStatus("saving");
      if (pending.current.size >= 40) {
        void flush();
      } else {
        scheduleFlush();
      }
    },
    [flush, scheduleFlush],
  );

  useEffect(() => {
    function onHide() {
      if (document.visibilityState === "hidden" && pending.current.size > 0) {
        void flush(true);
      }
    }
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      void flush(true);
    };
  }, [flush]);

  const setQuantity = useCallback(
    (code: string, quantity: number) => {
      const q = Math.max(0, Math.min(99, quantity));
      setOwned((prev) => {
        const next = { ...prev };
        if (q === 0) delete next[code];
        else next[code] = q;
        return next;
      });
      queueEdit(code, q);
    },
    [queueEdit],
  );

  const tapCell = useCallback(
    (code: string) => {
      if (tab !== "tenho") return;
      setOwned((prev) => {
        const next = { ...prev, [code]: (prev[code] ?? 0) + 1 };
        queueEdit(code, next[code]);
        return next;
      });
    },
    [tab, queueEdit],
  );

  function handlePointerDown(code: string) {
    if (tab !== "tenho") return;
    longPressFired.current = false;
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setSheetCode(code);
    }, 430);
  }
  function handlePointerEnd() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }
  function handleClick(code: string) {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    tapCell(code);
  }

  const ownedTypes = countOwnedTypes(owned);
  const repetidasTotal = countRepetidasTotal(owned);
  const repetidasTypes = Object.values(owned).filter((q) => q > 1).length;
  const needCount = derivedNeeds.length;
  const progressPct =
    TOTAL_STICKERS > 0
      ? Math.round((ownedTypes / TOTAL_STICKERS) * 100)
      : 0;

  const accent =
    tab === "tenho" ? "#0067c0" : tab === "repetidas" ? "#0f7b0f" : "#9a6700";

  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const q = normalize(query);
  const filteredSections = q
    ? sections.filter(
        (s) => normalize(s.title).includes(q) || normalize(s.id).includes(q),
      )
    : sections;

  const cellVisible = (code: string) => {
    const qty = owned[code] ?? 0;
    if (tab === "tenho") return true;
    if (tab === "repetidas") return qty > 1;
    return qty < 1;
  };

  const sectionCount = (section: GabaritoSection) =>
    section.cells.filter((c) => {
      const qty = owned[c.code] ?? 0;
      if (tab === "tenho") return qty > 0;
      if (tab === "repetidas") return qty > 1;
      return qty < 1;
    }).length;

  const reservedCount =
    reservedGive.current.size + reservedReceive.current.size;

  const statsLine =
    tab === "tenho"
      ? `${ownedTypes} de ${TOTAL_STICKERS} marcadas`
      : tab === "repetidas"
        ? `${repetidasTotal} repetida(s) · ${repetidasTypes} tipos`
        : `Faltam ${needCount} de ${TOTAL_STICKERS}`;

  const helperLine =
    tab === "tenho"
      ? "Toque para marcar que você tem (+1). Segure para ajustar a quantidade. O app calcula repetidas e preciso sozinho."
      : tab === "repetidas"
        ? "Somente leitura — figurinhas com mais de 1 cópia (extras para trocar)."
        : "Somente leitura — figurinhas que ainda não estão marcadas em Tenho.";

  return (
    <div className="space-y-4">
      {reservedCount > 0 ? (
        <div className="rounded-lg border border-dashed border-[#d4a017] bg-[#fffbf0] px-4 py-3 text-sm text-[#9a6700]">
          <strong>{reservedCount}</strong> figurinha
          {reservedCount === 1 ? "" : "s"} em troca combinada — borda{" "}
          <span className="font-semibold text-[#9a6700]">âmbar</span> (entrega) ou{" "}
          <span className="font-semibold text-[#7b5ea7]">lilás</span> (recebe).
          Confirme em{" "}
          <a href="/trocas" className="font-semibold underline">
            Trocas
          </a>
          .
        </div>
      ) : null}

      <div className="sticky top-[60px] z-10 -mx-4 border-b border-[#e6e6e6] bg-white px-4 py-2">
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-[#e6e6e6] bg-[#ededed] p-1">
          {(
            [
              { id: "tenho" as const, label: "Tenho", editable: true },
              { id: "repetidas" as const, label: "Repetidas", editable: false },
              { id: "preciso" as const, label: "Preciso", editable: false },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-10 rounded-md text-sm font-semibold transition ${
                tab === item.id
                  ? "bg-white text-[#0067c0] shadow-sm"
                  : "text-[#5f5f5f]"
              }`}
              style={
                tab === item.id
                  ? {
                      color:
                        item.id === "repetidas"
                          ? "#0f7b0f"
                          : item.id === "preciso"
                            ? "#9a6700"
                            : "#0067c0",
                    }
                  : undefined
              }
            >
              {item.label}
              {!item.editable ? (
                <span className="ml-1 text-[9px] font-normal opacity-60">👁</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-medium text-[#5f5f5f]">{statsLine}</span>
          {tab === "tenho" ? <SaveBadge status={status} /> : null}
        </div>
        {errorDetail ? (
          <p className="mt-1 rounded-md border border-[#f3c9c5] bg-[#fdf0ef] px-2 py-1.5 text-[11px] leading-4 text-[#c42b1c]">
            {errorDetail}
          </p>
        ) : null}
        {tab === "tenho" ? (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e6e6e6]">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: accent }}
            />
          </div>
        ) : null}

        <div className="relative mt-2">
          <input
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar seleção (ex.: Brasil, ARG)…"
            className="w-full rounded-md border border-[#d0d0d0] bg-white py-2 pl-9 pr-9 text-sm text-[#1b1b1b] placeholder:text-[#9a9a9a] focus:border-[#0067c0] focus:outline-none"
          />
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9a9a9a"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#8a8a8a]"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      <p className="text-xs leading-5 text-[#5f5f5f]">{helperLine}</p>

      {Object.keys(initialHeatLevels).length > 0 && tab !== "preciso" ? (
        <p className="text-[11px] leading-4 text-[#8a8a8a]">
          👑 ouro · 🔥 quente · ✨ procurada = demanda alta no grupo (poder de
          barganha).
        </p>
      ) : null}

      <div className="space-y-2">
        {filteredSections.length === 0 ? (
          <p className="rounded-lg border border-[#e6e6e6] bg-white p-4 text-center text-sm text-[#5f5f5f]">
            Nenhuma seleção encontrada para “{query}”.
          </p>
        ) : null}
        {filteredSections.map((section) => {
          const visibleCells = section.cells.filter((c) => cellVisible(c.code));
          if (visibleCells.length === 0 && (tab === "repetidas" || tab === "preciso")) {
            return null;
          }
          const isOpen = q ? true : openSection === section.id;
          const count = sectionCount(section);
          return (
            <div
              key={section.id}
              className="overflow-hidden rounded-lg border border-[#e6e6e6] bg-white"
            >
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : section.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="flex flex-col leading-tight">
                  <span className="font-bold tracking-wide text-[#1b1b1b]">
                    {section.kind === "team" ? section.id : section.title}
                  </span>
                  {section.kind === "team" ? (
                    <span className="text-xs text-[#8a8a8a]">{section.title}</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-2">
                  {count > 0 ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                      style={{ background: accent }}
                    >
                      {count}
                    </span>
                  ) : null}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9a9a9a"
                    strokeWidth="2.5"
                    className={`transition ${isOpen ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>

              {isOpen ? (
                <div className="grid grid-cols-3 gap-2 border-t border-[#eee] p-3 sm:grid-cols-4">
                  {visibleCells.map((cell) => {
                    const qty = owned[cell.code] ?? 0;
                    const marked =
                      tab === "tenho"
                        ? qty > 0
                        : tab === "repetidas"
                          ? qty > 1
                          : qty < 1;
                    const reservedOut =
                      tab === "tenho" &&
                      qty > 1 &&
                      reservedGive.current.has(cell.code);
                    const reservedIn =
                      tab === "preciso" &&
                      reservedReceive.current.has(cell.code);
                    const heat = heatLevels.current[cell.code];
                    const showHeat =
                      tab !== "preciso" &&
                      heat &&
                      heat !== "common" &&
                      qty > 0;
                    const heatRing =
                      heat === "golden"
                        ? "ring-2 ring-[#d4a017] ring-offset-1"
                        : heat === "hot"
                          ? "ring-2 ring-[#ff8c00]/70 ring-offset-1"
                          : heat === "wanted"
                            ? "ring-1 ring-[#0067c0]/50 ring-offset-1"
                            : "";
                    const reservedRing = reservedOut
                      ? "ring-2 ring-dashed ring-[#d4a017] ring-offset-1"
                      : reservedIn
                        ? "ring-2 ring-dashed ring-[#7b5ea7] ring-offset-1"
                        : "";
                    const activeRing = reservedRing || heatRing;
                    const badgeQty =
                      tab === "repetidas" ? qty - 1 : tab === "tenho" ? qty : 0;
                    const readOnly = tab !== "tenho";

                    return (
                      <button
                        key={cell.code}
                        type="button"
                        disabled={readOnly}
                        onPointerDown={() => handlePointerDown(cell.code)}
                        onPointerUp={handlePointerEnd}
                        onPointerLeave={handlePointerEnd}
                        onPointerCancel={handlePointerEnd}
                        onClick={() => handleClick(cell.code)}
                        className={`relative flex aspect-[4/3] select-none items-center justify-center rounded-md border px-0.5 text-center transition ${
                          marked
                            ? `border-transparent text-white ${activeRing}`
                            : activeRing
                              ? `border-[#e0e0e0] bg-[#fafafa] text-[#5f5f5f] ${activeRing}`
                              : "border-[#e0e0e0] bg-[#fafafa] text-[#5f5f5f]"
                        } ${readOnly ? "cursor-default opacity-95" : ""}`}
                        style={marked ? { background: accent } : undefined}
                      >
                        <span className="text-[10px] font-bold leading-tight tracking-tight sm:text-[11px]">
                          {cell.label}
                        </span>
                        {showHeat ? (
                          <span
                            className="absolute -left-1 -top-1 text-[10px] leading-none"
                            aria-hidden
                          >
                            {getHeatEmoji(heat)}
                          </span>
                        ) : null}
                        {badgeQty > 1 || (tab === "repetidas" && badgeQty >= 1) ? (
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1b1b1b] px-1 text-[10px] font-bold text-white">
                            ×{tab === "repetidas" ? badgeQty : qty}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
        {tab === "repetidas" &&
        filteredSections.every(
          (s) => s.cells.filter((c) => (owned[c.code] ?? 0) > 1).length === 0,
        ) ? (
          <p className="rounded-lg border border-[#e6e6e6] bg-white p-6 text-center text-sm text-[#5f5f5f]">
            Nenhuma repetida ainda. Marque figurinhas com quantidade 2 ou mais na
            aba Tenho.
          </p>
        ) : null}
        {tab === "preciso" && needCount === TOTAL_STICKERS ? (
          <p className="rounded-lg border border-[#ecdfc0] bg-[#fbf6ea] p-6 text-center text-sm text-[#5f5f5f]">
            Marque o que você já tem na aba Tenho — o Preciso será calculado
            automaticamente.
          </p>
        ) : null}
      </div>

      {sheetCode ? (
        <CellSheet
          code={sheetCode}
          quantity={owned[sheetCode] ?? 0}
          onSetQuantity={(q) => setQuantity(sheetCode, q)}
          onClose={() => setSheetCode(null)}
        />
      ) : null}
    </div>
  );
}

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === "saving")
    return <span className="text-[#5f5f5f]">Salvando…</span>;
  if (status === "saved")
    return <span className="font-medium text-[#0f7b0f]">Salvo ✓</span>;
  if (status === "error")
    return <span className="font-medium text-[#c42b1c]">Erro ao salvar</span>;
  return null;
}

function CellSheet({
  code,
  quantity,
  onSetQuantity,
  onClose,
}: {
  code: string;
  quantity: number;
  onSetQuantity: (q: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg animate-sheet-up rounded-t-2xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#d0d0d0]" />
        <p className="text-center text-lg font-bold text-[#1b1b1b]">{code}</p>
        <p className="mt-1 text-center text-sm text-[#5f5f5f]">
          Quantas cópias você tem?
        </p>
        <div className="mt-5 flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={() => onSetQuantity(quantity - 1)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d0d0d0] text-2xl font-bold text-[#1b1b1b] active:bg-[#f0f0f0]"
          >
            −
          </button>
          <span className="min-w-12 text-center text-3xl font-extrabold text-[#0067c0]">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => onSetQuantity(quantity + 1)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0067c0] text-2xl font-bold text-white active:bg-[#005aa8]"
          >
            +
          </button>
        </div>
        {quantity > 0 ? (
          <button
            type="button"
            onClick={() => {
              onSetQuantity(0);
              onClose();
            }}
            className="mt-5 w-full rounded-md py-2 text-sm font-medium text-[#c42b1c]"
          >
            Não tenho esta figurinha
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-md border border-[#d0d0d0] py-2.5 text-sm font-medium text-[#1b1b1b]"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
