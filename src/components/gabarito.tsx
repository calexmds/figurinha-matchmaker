"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StickerEdit } from "@/lib/stickers/persist-edits";
import type { GabaritoSection } from "@/lib/stickers/catalog";
import {
  countOwnedTypes,
  countRepetidasTotal,
  defaultGabaritoTab,
  deriveNeeds,
  isSparseMode,
  tradeableQuantity,
} from "@/lib/stickers/collection";
import type { CollectionEntryMode, HeatLevel } from "@/lib/types";
import { getHeatEmoji } from "@/lib/group-intelligence";
import { TOTAL_STICKERS } from "@/lib/constants";
import { EmptyState } from "@/components/ui/empty-state";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import { ChevronIcon, EyeIcon, Sheet } from "@/components/ui/sheet";
import { getInputClassName } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type ViewTab = "tenho" | "repetidas" | "preciso";
type SaveStatus = "idle" | "saving" | "saved" | "error";

type GabaritoProps = {
  sections: GabaritoSection[];
  initialOwned: Record<string, number>;
  entryMode?: CollectionEntryMode;
  initialReservedGive?: string[];
  initialReservedGiveCounts?: Record<string, number>;
  initialReservedReceive?: string[];
  initialHeatLevels?: Record<string, HeatLevel>;
};

export function Gabarito({
  sections,
  initialOwned,
  entryMode = "have",
  initialReservedGive = [],
  initialReservedGiveCounts = {},
  initialReservedReceive = [],
  initialHeatLevels = {},
}: GabaritoProps) {
  const sparse = isSparseMode(entryMode);
  const reservedGive = useRef(new Set(initialReservedGive));
  const reservedGiveQty = useRef(initialReservedGiveCounts);
  const reservedReceive = useRef(new Set(initialReservedReceive));
  const heatLevels = useRef(initialHeatLevels);
  const [tab, setTab] = useState<ViewTab>(defaultGabaritoTab(entryMode));
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

  const reservationBlock = useCallback((code: string, quantity: number) => {
    if (reservedReceive.current.has(code) && quantity > 0) {
      return "Reservada para receber em uma troca.";
    }
    const reserved = reservedGiveQty.current[code] ?? 0;
    if (reserved > 0 && tradeableQuantity(quantity) < reserved) {
      return "Quantidade menor que o reservado em troca.";
    }
    return null;
  }, []);

  const setQuantity = useCallback(
    (code: string, quantity: number) => {
      const q = Math.max(0, Math.min(99, quantity));
      const block = reservationBlock(code, q);
      if (block) {
        setErrorDetail(block);
        setStatus("error");
        return;
      }
      setOwned((prev) => {
        const next = { ...prev };
        if (sparse) {
          next[code] = q;
        } else if (q === 0) {
          delete next[code];
        } else {
          next[code] = q;
        }
        return next;
      });
      queueEdit(code, q);
    },
    [queueEdit, reservationBlock, sparse],
  );

  const tapCell = useCallback(
    (code: string) => {
      setOwned((prev) => {
        const current = prev[code] ?? (sparse ? 1 : 0);
        let nextQty = current;

        if (sparse && tab === "preciso") {
          nextQty = current >= 1 ? 0 : 1;
        } else if (sparse && tab === "repetidas") {
          if (current < 1) return prev;
          nextQty = current === 1 ? 2 : current + 1;
        } else if (tab === "tenho") {
          nextQty = current + 1;
        } else {
          return prev;
        }

        const block = reservationBlock(code, nextQty);
        if (block) {
          setErrorDetail(block);
          setStatus("error");
          return prev;
        }
        queueEdit(code, nextQty);
        if (sparse) {
          return { ...prev, [code]: nextQty };
        }
        if (nextQty === 0) {
          const next = { ...prev };
          delete next[code];
          return next;
        }
        return { ...prev, [code]: nextQty };
      });
    },
    [tab, queueEdit, reservationBlock, sparse],
  );

  const isEditableTab =
    tab === "tenho" ? !sparse : sparse && (tab === "preciso" || tab === "repetidas");

  const lastTapRef = useRef<{ code: string; at: number } | null>(null);

  function handlePointerDown(code: string) {
    if (!isEditableTab) return;
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
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.code === code && now - last.at < 450) {
      return;
    }
    lastTapRef.current = { code, at: now };
    tapCell(code);
  }

  const needCount = derivedNeeds.length;
  const ownedTypes = sparse
    ? TOTAL_STICKERS - needCount
    : countOwnedTypes(owned);
  const repetidasTotal = countRepetidasTotal(owned);
  const repetidasTypes = Object.values(owned).filter((q) => q > 1).length;
  const progressPct =
    TOTAL_STICKERS > 0
      ? Math.round((ownedTypes / TOTAL_STICKERS) * 100)
      : 0;

  const tabConfig = sparse
    ? ([
        { id: "preciso" as const, label: "Preciso", editable: true },
        { id: "repetidas" as const, label: "Repetidas", editable: true },
        { id: "tenho" as const, label: "Tenho", editable: false },
      ] as const)
    : ([
        { id: "tenho" as const, label: "Tenho", editable: true },
        { id: "repetidas" as const, label: "Repetidas", editable: false },
        { id: "preciso" as const, label: "Preciso", editable: false },
      ] as const);

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
    const qty = owned[code] ?? (sparse ? 1 : 0);
    if (sparse && (tab === "preciso" || tab === "repetidas")) return true;
    if (tab === "tenho") return true;
    if (tab === "repetidas") return qty > 1;
    return qty < 1;
  };

  const sectionCount = (section: GabaritoSection) =>
    section.cells.filter((c) => {
      const qty = owned[c.code] ?? (sparse ? 1 : 0);
      if (tab === "tenho") return qty > 0;
      if (tab === "repetidas") return qty > 1;
      return qty < 1;
    }).length;

  const reservedCount =
    reservedGive.current.size + reservedReceive.current.size;

  const statsLine =
    tab === "tenho"
      ? sparse
        ? `${ownedTypes} no álbum · ${repetidasTypes} com repetida`
        : `${ownedTypes} de ${TOTAL_STICKERS} marcadas`
      : tab === "repetidas"
        ? `${repetidasTotal} repetida(s) · ${repetidasTypes} tipos`
        : `Faltam ${needCount} de ${TOTAL_STICKERS}`;

  const helperLine = sparse
    ? tab === "preciso"
      ? "Toque nas figurinhas que você NÃO tem. Toque de novo para desmarcar."
      : tab === "repetidas"
        ? "Toque nas que você tem repetida (+1 extra). Segure para ajustar a quantidade."
        : "Resumo do álbum — assumimos que você tem tudo, exceto o marcado em Preciso."
    : tab === "tenho"
      ? "Toque para marcar que você tem (+1). Segure para ajustar a quantidade. O app calcula repetidas e preciso sozinho."
      : tab === "repetidas"
        ? "Somente leitura — figurinhas com mais de 1 cópia (extras para trocar)."
        : "Somente leitura — figurinhas que ainda não estão marcadas em Tenho.";

  return (
    <div className="space-y-4">
      {sparse ? (
        <Callout variant="success" title="Modo álbum quase completo" className="px-4 py-3">
          Comece em <strong className="text-win-amber">Preciso</strong> (o que falta) e
          depois <strong className="text-win-green">Repetidas</strong>. O resto já conta
          como no álbum.
        </Callout>
      ) : null}

      {reservedCount > 0 ? (
        <Callout variant="warning" className="px-4 py-3">
          <strong>{reservedCount}</strong> figurinha
          {reservedCount === 1 ? "" : "s"} em troca combinada — borda{" "}
          <span className="font-semibold text-win-amber">âmbar</span> (entrega) ou{" "}
          <span className="font-semibold text-reserve">lilás</span> (recebe). Confirme em{" "}
          <a href="/trocas" className="font-semibold underline">
            Trocas
          </a>
          .
        </Callout>
      ) : null}

      <div className="fluent-chrome sticky top-[var(--header-height)] z-10 -mx-4 border-b border-line px-4 py-2">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-mica p-1">
          {tabConfig.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "min-h-10 rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                tab === item.id
                  ? "bg-card shadow-sm"
                  : "text-ink-soft",
                tab === item.id &&
                  (item.id === "repetidas"
                    ? "text-win-green"
                    : item.id === "preciso"
                      ? "text-win-amber"
                      : "text-accent"),
              )}
            >
              {item.label}
              {!item.editable ? (
                <EyeIcon className="ml-1 inline opacity-60" />
              ) : null}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-medium text-ink-soft">{statsLine}</span>
          {isEditableTab ? <SaveBadge status={status} /> : null}
        </div>
        {errorDetail ? (
          <Callout variant="error" className="mt-1 p-2.5 text-[11px] leading-4">
            {errorDetail}
          </Callout>
        ) : null}
        {(tab === "tenho" || (sparse && tab === "preciso")) ? (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
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
            className={cn(getInputClassName(), "py-2 pl-9 pr-9")}
          />
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
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
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      <p className="text-xs leading-5 text-ink-soft">{helperLine}</p>

      {Object.keys(initialHeatLevels).length > 0 && tab !== "preciso" ? (
        <p className="text-[11px] leading-4 text-ink-muted">
          <span className="font-semibold text-golden">Ouro</span> ·{" "}
          <span className="font-semibold text-hot">Quente</span> ·{" "}
          <span className="font-semibold text-accent">Procurada</span> = demanda alta
          no grupo.
        </p>
      ) : null}

      <div className="space-y-2">
        {filteredSections.length === 0 ? (
          <EmptyState
            icon="album"
            title="Nada encontrado"
            description={`Nenhuma seleção encontrada para “${query}”.`}
            className="py-8"
          />
        ) : null}
        {filteredSections.map((section) => {
          const visibleCells = section.cells.filter((c) => cellVisible(c.code));
          if (visibleCells.length === 0 && tab === "repetidas" && !sparse) {
            return null;
          }
          if (visibleCells.length === 0 && tab === "preciso" && !sparse) {
            return null;
          }
          const isOpen = q ? true : openSection === section.id;
          const count = sectionCount(section);
          return (
            <div
              key={section.id}
              className="overflow-hidden rounded-lg border border-line bg-card"
            >
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : section.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="flex flex-col leading-tight">
                  <span className="font-bold tracking-wide text-ink">
                    {section.kind === "team" ? section.id : section.title}
                  </span>
                  {section.kind === "team" ? (
                    <span className="text-xs text-ink-muted">{section.title}</span>
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
                  <ChevronIcon expanded={isOpen} className={isOpen ? "rotate-90" : ""} />
                </span>
              </button>

              {isOpen ? (
                <div className="grid grid-cols-3 gap-2 border-t border-line p-3 sm:grid-cols-4">
                  {visibleCells.map((cell) => {
                    const qty = owned[cell.code] ?? (sparse ? 1 : 0);
                    const marked =
                      tab === "tenho"
                        ? qty > 0
                        : tab === "repetidas"
                          ? qty > 1
                          : qty < 1;
                    const dimmed =
                      sparse &&
                      tab === "preciso" &&
                      qty >= 1 &&
                      !marked;
                    const reservedOut =
                      (tab === "tenho" || tab === "repetidas") &&
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
                        ? "ring-2 ring-golden ring-offset-1"
                        : heat === "hot"
                          ? "ring-2 ring-hot/70 ring-offset-1"
                          : heat === "wanted"
                            ? "ring-1 ring-accent/50 ring-offset-1"
                            : "";
                    const reservedRing = reservedOut
                      ? "ring-2 ring-dashed ring-golden ring-offset-1"
                      : reservedIn
                        ? "ring-2 ring-dashed ring-reserve ring-offset-1"
                        : "";
                    const activeRing = reservedRing || heatRing;
                    const badgeQty =
                      tab === "repetidas" ? qty - 1 : tab === "tenho" ? qty : 0;
                    const readOnly = !isEditableTab;

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
                        className={`relative flex aspect-[4/3] select-none items-center justify-center rounded-md border px-0.5 text-center transition touch-manipulation ${
                          marked
                            ? `border-transparent text-white ${activeRing}`
                            : dimmed
                              ? `border-line bg-mica text-ink-muted ${activeRing}`
                              : activeRing
                                ? `border-line bg-mica text-ink-soft ${activeRing}`
                                : "border-line bg-mica text-ink-soft"
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
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-white">
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
        !sparse &&
        filteredSections.every(
          (s) => s.cells.filter((c) => (owned[c.code] ?? 0) > 1).length === 0,
        ) ? (
          <p className="rounded-lg border border-line bg-card p-6 text-center text-sm text-ink-soft">
            Nenhuma repetida ainda. Marque figurinhas com quantidade 2 ou mais na
            aba Tenho.
          </p>
        ) : null}
        {tab === "repetidas" && sparse && repetidasTypes === 0 ? (
          <p className="rounded-lg border border-line bg-card p-6 text-center text-sm text-ink-soft">
            Nenhuma repetida marcada. Toque nas figurinhas que você tem a mais —
            ou pule se não tiver repetidas agora.
          </p>
        ) : null}
        {tab === "preciso" && !sparse && needCount === TOTAL_STICKERS ? (
          <Callout variant="warning" className="p-6 text-center">
            Marque o que você já tem na aba Tenho — o Preciso será calculado
            automaticamente.
          </Callout>
        ) : null}
        {tab === "preciso" && sparse && needCount === 0 ? (
          <Callout variant="success" className="p-6 text-center">
            Álbum completo! Se faltar alguma figurinha, toque nela acima para marcar.
          </Callout>
        ) : null}
      </div>

      {sheetCode ? (
        <CellSheet
          code={sheetCode}
          quantity={owned[sheetCode] ?? (sparse ? 1 : 0)}
          sparse={sparse}
          activeTab={tab}
          onSetQuantity={(q) => setQuantity(sheetCode, q)}
          onClose={() => setSheetCode(null)}
        />
      ) : null}
    </div>
  );
}

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === "saving")
    return <span className="text-ink-soft">Salvando…</span>;
  if (status === "saved")
    return <span className="font-medium text-win-green">Salvo ✓</span>;
  if (status === "error")
    return <span className="font-medium text-error">Erro ao salvar</span>;
  return null;
}

function CellSheet({
  code,
  quantity,
  sparse,
  activeTab,
  onSetQuantity,
  onClose,
}: {
  code: string;
  quantity: number;
  sparse?: boolean;
  activeTab?: ViewTab;
  onSetQuantity: (q: number) => void;
  onClose: () => void;
}) {
  const minQty = sparse && activeTab === "preciso" ? 0 : 0;
  const label =
    sparse && activeTab === "preciso"
      ? "Você tem esta figurinha?"
      : sparse && activeTab === "repetidas"
        ? "Quantas cópias extras (repetidas)?"
        : "Quantas cópias você tem?";

  return (
    <Sheet open title={code} description={label} onClose={onClose}>
      <div className="flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => onSetQuantity(Math.max(minQty, quantity - 1))}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border-soft text-2xl font-bold text-ink active:bg-mica"
        >
          −
        </button>
        <span className="min-w-12 text-center text-3xl font-extrabold text-accent">
          {sparse && activeTab === "repetidas"
            ? Math.max(0, quantity - 1)
            : quantity}
        </span>
        <button
          type="button"
          onClick={() => onSetQuantity(quantity + 1)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white active:bg-accent-press"
        >
          +
        </button>
      </div>
      {quantity > minQty ? (
        <Button
          variant="ghost"
          fullWidth
          className="mt-5 text-error"
          onClick={() => {
            onSetQuantity(minQty);
            onClose();
          }}
        >
          {sparse && activeTab === "preciso"
            ? "Não tenho esta figurinha"
            : sparse && activeTab === "repetidas"
              ? "Sem repetida desta"
              : "Não tenho esta figurinha"}
        </Button>
      ) : null}
      {sparse && activeTab === "repetidas" && quantity <= 1 ? (
        <Button
          variant="success"
          fullWidth
          className="mt-3"
          onClick={() => onSetQuantity(2)}
        >
          Tenho 1 repetida (total 2)
        </Button>
      ) : null}
    </Sheet>
  );
}
