"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyStickerEdits, type StickerEdit } from "@/app/actions";
import type { GabaritoSection } from "@/lib/stickers/catalog";

type Mode = "dup" | "need";
type SaveStatus = "idle" | "saving" | "saved" | "error";

type GabaritoProps = {
  sections: GabaritoSection[];
  initialDuplicates: Record<string, number>;
  initialNeeds: string[];
};

export function Gabarito({
  sections,
  initialDuplicates,
  initialNeeds,
}: GabaritoProps) {
  const [mode, setMode] = useState<Mode>("dup");
  const [dup, setDup] = useState<Record<string, number>>(initialDuplicates);
  const [need, setNeed] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialNeeds.map((c) => [c, 1])),
  );
  const [openSection, setOpenSection] = useState<string | null>(
    sections[1]?.id ?? sections[0]?.id ?? null,
  );
  const [sheetCode, setSheetCode] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [query, setQuery] = useState("");

  const pending = useRef<Map<string, StickerEdit>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current.size === 0) return;
    const edits = [...pending.current.values()];
    pending.current.clear();
    setStatus("saving");
    const result = await applyStickerEdits(edits);
    setStatus(result && "error" in result ? "error" : "saved");
  }, []);

  const scheduleFlush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush();
    }, 700);
  }, [flush]);

  const queueEdit = useCallback(
    (kind: Mode, code: string, quantity: number) => {
      pending.current.set(`${kind}:${code}`, { kind, code, quantity });
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
      if (document.visibilityState === "hidden") void flush();
    }
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [flush]);

  const tapCell = useCallback(
    (code: string) => {
      if (mode === "dup") {
        setDup((prev) => {
          const next = { ...prev, [code]: (prev[code] ?? 0) + 1 };
          queueEdit("dup", code, next[code]);
          return next;
        });
      } else {
        setNeed((prev) => {
          const isOn = (prev[code] ?? 0) > 0;
          const next = { ...prev };
          if (isOn) delete next[code];
          else next[code] = 1;
          queueEdit("need", code, isOn ? 0 : 1);
          return next;
        });
      }
    },
    [mode, queueEdit],
  );

  const setDupQuantity = useCallback(
    (code: string, quantity: number) => {
      const q = Math.max(0, Math.min(99, quantity));
      setDup((prev) => {
        const next = { ...prev };
        if (q === 0) delete next[code];
        else next[code] = q;
        return next;
      });
      queueEdit("dup", code, q);
    },
    [queueEdit],
  );

  const removeNeed = useCallback(
    (code: string) => {
      setNeed((prev) => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
      queueEdit("need", code, 0);
    },
    [queueEdit],
  );

  function handlePointerDown(code: string) {
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

  const isMarked = (code: string) =>
    mode === "dup" ? (dup[code] ?? 0) > 0 : (need[code] ?? 0) > 0;

  const totalRepetidas = Object.values(dup).reduce((a, b) => a + b, 0);
  const distinctDup = Object.keys(dup).length;
  const needCount = Object.keys(need).length;

  const totalCells = sections.reduce((a, s) => a + s.cells.length, 0);
  const covered = mode === "dup" ? distinctDup : needCount;
  const progressPct =
    totalCells > 0 ? Math.round((covered / totalCells) * 100) : 0;

  const sectionCount = (section: GabaritoSection) =>
    section.cells.filter((c) =>
      mode === "dup" ? (dup[c.code] ?? 0) > 0 : (need[c.code] ?? 0) > 0,
    ).length;

  const accent = mode === "dup" ? "#0f7b0f" : "#0067c0";

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

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="sticky top-[60px] z-10 -mx-4 px-4 py-2 fluent-acrylic">
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#e6e6e6] bg-[#ededed] p-1">
          <button
            type="button"
            onClick={() => setMode("dup")}
            className={`min-h-10 rounded-md text-sm font-semibold transition ${
              mode === "dup"
                ? "bg-white text-[#0f7b0f] shadow-sm"
                : "text-[#5f5f5f]"
            }`}
          >
            Repetidas
          </button>
          <button
            type="button"
            onClick={() => setMode("need")}
            className={`min-h-10 rounded-md text-sm font-semibold transition ${
              mode === "need"
                ? "bg-white text-[#0067c0] shadow-sm"
                : "text-[#5f5f5f]"
            }`}
          >
            Preciso
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-medium text-[#5f5f5f]">
            {mode === "dup"
              ? `${totalRepetidas} repetida(s) · ${distinctDup} tipos`
              : `Faltam ${needCount} de ${totalCells}`}
          </span>
          <SaveBadge status={status} />
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e6e6e6]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progressPct}%`, background: accent }}
          />
        </div>

        {/* Search */}
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

      <p className="text-xs leading-5 text-[#5f5f5f]">
        {mode === "dup"
          ? "Toque para marcar uma repetida. Toque de novo soma mais. Segure para ajustar a quantidade."
          : "Toque para marcar o que falta. Toque de novo para desmarcar."}
      </p>

      {/* Sections */}
      <div className="space-y-2">
        {filteredSections.length === 0 ? (
          <p className="rounded-lg border border-[#e6e6e6] bg-white p-4 text-center text-sm text-[#5f5f5f]">
            Nenhuma seleção encontrada para “{query}”.
          </p>
        ) : null}
        {filteredSections.map((section) => {
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
                <span className="flex items-center gap-3">
                  <span className="text-xl">{section.flag}</span>
                  <span className="font-semibold text-[#1b1b1b]">
                    {section.title}
                  </span>
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
                <div className="grid grid-cols-4 gap-2 border-t border-[#eee] p-3 sm:grid-cols-5">
                  {section.cells.map((cell) => {
                    const marked = isMarked(cell.code);
                    const qty = dup[cell.code] ?? 0;
                    return (
                      <button
                        key={cell.code}
                        type="button"
                        onPointerDown={() => handlePointerDown(cell.code)}
                        onPointerUp={handlePointerEnd}
                        onPointerLeave={handlePointerEnd}
                        onPointerCancel={handlePointerEnd}
                        onClick={() => handleClick(cell.code)}
                        className={`relative flex aspect-square select-none flex-col items-center justify-center rounded-md border text-center transition ${
                          marked
                            ? "border-transparent text-white"
                            : "border-[#e0e0e0] bg-[#fafafa] text-[#8a8a8a]"
                        }`}
                        style={marked ? { background: accent } : undefined}
                      >
                        <span className="text-sm font-bold leading-none">
                          {cell.label}
                        </span>
                        {section.kind === "team" ? (
                          <span
                            className={`mt-0.5 text-[9px] leading-none ${
                              marked ? "text-white/70" : "text-[#b0b0b0]"
                            }`}
                          >
                            {section.id}
                          </span>
                        ) : null}
                        {mode === "dup" && qty > 1 ? (
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1b1b1b] px-1 text-[10px] font-bold text-white">
                            ×{qty}
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
      </div>

      {/* Long-press sheet */}
      {sheetCode ? (
        <CellSheet
          code={sheetCode}
          mode={mode}
          quantity={dup[sheetCode] ?? 0}
          isNeeded={(need[sheetCode] ?? 0) > 0}
          onSetQuantity={(q) => setDupQuantity(sheetCode, q)}
          onToggleNeed={() => {
            if ((need[sheetCode] ?? 0) > 0) removeNeed(sheetCode);
            else {
              setNeed((prev) => ({ ...prev, [sheetCode]: 1 }));
              queueEdit("need", sheetCode, 1);
            }
          }}
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
  mode,
  quantity,
  isNeeded,
  onSetQuantity,
  onToggleNeed,
  onClose,
}: {
  code: string;
  mode: Mode;
  quantity: number;
  isNeeded: boolean;
  onSetQuantity: (q: number) => void;
  onToggleNeed: () => void;
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

        {mode === "dup" ? (
          <>
            <p className="mt-1 text-center text-sm text-[#5f5f5f]">
              Quantas você tem repetidas?
            </p>
            <div className="mt-5 flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => onSetQuantity(quantity - 1)}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d0d0d0] text-2xl font-bold text-[#1b1b1b] active:bg-[#f0f0f0]"
              >
                −
              </button>
              <span className="min-w-12 text-center text-3xl font-extrabold text-[#0f7b0f]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onSetQuantity(quantity + 1)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f7b0f] text-2xl font-bold text-white active:bg-[#0c640c]"
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
                Remover
              </button>
            ) : null}
          </>
        ) : (
          <>
            <p className="mt-1 text-center text-sm text-[#5f5f5f]">
              Você precisa desta figurinha?
            </p>
            <button
              type="button"
              onClick={() => {
                onToggleNeed();
                onClose();
              }}
              className={`mt-5 w-full rounded-md py-3 text-sm font-semibold text-white ${
                isNeeded ? "bg-[#c42b1c]" : "bg-[#0067c0]"
              }`}
            >
              {isNeeded ? "Remover da lista" : "Marcar como preciso"}
            </button>
          </>
        )}

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
