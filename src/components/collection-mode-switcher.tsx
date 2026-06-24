"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { switchCollectionEntryMode } from "@/app/actions";
import type { CollectionEntryMode } from "@/lib/types";
import {
  COLLECTION_MODE_COPY,
  switchToHaveEffects,
  switchToSparseEffects,
  type CollectionModeKey,
} from "@/lib/collection-mode-copy";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";

type CollectionModeSwitcherProps = {
  currentMode: CollectionEntryMode;
  markedCount: number;
  needCount: number;
  repetidasTypes: number;
};

function ConfirmSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" fullWidth disabled={pending}>
      {pending ? "Convertendo coleção…" : label}
    </Button>
  );
}

export function CollectionModeSwitcher({
  currentMode,
  markedCount,
  needCount,
  repetidasTypes,
}: CollectionModeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<CollectionModeKey | null>(
    null,
  );

  const current = currentMode === "sparse" ? "sparse" : "have";
  const target: CollectionModeKey = current === "sparse" ? "have" : "sparse";
  const currentCopy = COLLECTION_MODE_COPY[current];
  const targetCopy = COLLECTION_MODE_COPY[target];

  function closeSheet() {
    setOpen(false);
    setConfirmTarget(null);
  }

  const effects =
    confirmTarget === "sparse"
      ? switchToSparseEffects(markedCount, needCount)
      : confirmTarget === "have"
        ? switchToHaveEffects(needCount, repetidasTypes)
        : [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-card px-3 py-2 text-xs font-semibold text-ink transition active:bg-mica focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            current === "sparse" ? "bg-win-green" : "bg-accent",
          )}
        />
        {currentCopy.chipLabel}
        <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden>
          <path
            d="m6 9 6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <Sheet
        open={open}
        onClose={closeSheet}
        title={confirmTarget ? "Confirmar troca" : "Forma de cadastro"}
        description={
          confirmTarget
            ? `Você está saindo de “${currentCopy.title}” para “${targetCopy.title}”.`
            : `Hoje: ${currentCopy.subtitle}. Toque abaixo se quiser mudar.`
        }
      >
        {confirmTarget ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-mica p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
                O que acontece
              </p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-ink-soft">
                {effects.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-accent" aria-hidden>
                      ·
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <form action={switchCollectionEntryMode}>
              <input type="hidden" name="mode" value={confirmTarget} />
              <ConfirmSubmit label={`Sim, mudar para ${targetCopy.shortLabel}`} />
            </form>

            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => setConfirmTarget(null)}
            >
              Voltar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <ModeOptionCard
              mode={current}
              copy={currentCopy}
              active
              onSelect={() => {}}
            />

            <div className="relative py-1">
              <div className="absolute inset-x-0 top-1/2 border-t border-line" />
              <p className="relative mx-auto w-fit bg-card px-2 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                trocar para
              </p>
            </div>

            <ModeOptionCard
              mode={target}
              copy={targetCopy}
              onSelect={() => setConfirmTarget(target)}
            />

            <Button type="button" variant="ghost" fullWidth onClick={closeSheet}>
              Cancelar
            </Button>
          </div>
        )}
      </Sheet>
    </>
  );
}

function ModeOptionCard({
  mode,
  copy,
  active,
  onSelect,
}: {
  mode: CollectionModeKey;
  copy: (typeof COLLECTION_MODE_COPY)[CollectionModeKey];
  active?: boolean;
  onSelect: () => void;
}) {
  const isGreen = mode === "sparse";

  if (active) {
    return (
      <div
        className={cn(
          "rounded-xl border p-4",
          isGreen
            ? "border-win-green/30 bg-[#f4fbf4]"
            : "border-accent/30 bg-[#f4f9ff]",
        )}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
          Modo atual
        </p>
        <p className="mt-1 font-display text-base font-bold text-ink">
          {copy.title}
        </p>
        <p
          className={cn(
            "mt-0.5 text-sm font-medium",
            isGreen ? "text-win-green" : "text-accent",
          )}
        >
          {copy.subtitle}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col rounded-xl border p-4 text-left transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        isGreen
          ? "border-win-green/25 bg-card hover:border-win-green/40"
          : "border-accent/25 bg-card hover:border-accent/40",
      )}
    >
      <p className="font-display text-base font-bold text-ink">{copy.title}</p>
      <p
        className={cn(
          "mt-0.5 text-sm font-medium",
          isGreen ? "text-win-green" : "text-accent",
        )}
      >
        {copy.subtitle}
      </p>
      <ul className="mt-3 space-y-1.5 text-xs leading-5 text-ink-soft">
        {copy.bullets.slice(0, 2).map((line) => (
          <li key={line} className="flex gap-2">
            <span className={isGreen ? "text-win-green" : "text-accent"}>✓</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <span
        className={cn(
          "mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl text-sm font-semibold text-white",
          isGreen ? "bg-win-green" : "bg-accent",
        )}
      >
        Escolher este modo
      </span>
    </button>
  );
}
