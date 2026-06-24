"use client";

import { useState } from "react";
import { switchCollectionEntryMode } from "@/app/actions";
import type { CollectionEntryMode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";

type CollectionModeSwitcherProps = {
  currentMode: CollectionEntryMode;
};

export function CollectionModeSwitcher({
  currentMode,
}: CollectionModeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const sparse = currentMode === "sparse";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft transition active:bg-mica focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            sparse ? "bg-win-green" : "bg-accent",
          )}
        />
        {sparse ? "Modo álbum quase completo" : "Modo marcar Tenho"}
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
        onClose={() => setOpen(false)}
        title="Trocar forma de cadastro"
        description={
          sparse
            ? "No modo atual assumimos que você tem quase tudo. Só marca o que falta e repetidas."
            : "No modo atual você marca figurinha por figurinha em Tenho."
        }
      >
        <div className="space-y-2">
          {!sparse ? (
            <form action={switchCollectionEntryMode}>
              <input type="hidden" name="mode" value="sparse" />
              <button
                type="submit"
                className="flex w-full flex-col rounded-xl border border-win-green/20 bg-[#f4fbf4] p-4 text-left transition active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="text-sm font-bold text-ink">
                  Mudar para álbum quase completo
                </span>
                <span className="mt-1 text-xs text-win-green">
                  Marque só Preciso + Repetidas — mais rápido
                </span>
              </button>
            </form>
          ) : (
            <form action={switchCollectionEntryMode}>
              <input type="hidden" name="mode" value="have" />
              <button
                type="submit"
                className="flex w-full flex-col rounded-xl border border-accent/20 bg-[#f4f9ff] p-4 text-left transition active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="text-sm font-bold text-ink">
                  Mudar para marcar Tenho
                </span>
                <span className="mt-1 text-xs text-accent">
                  Marque cada figurinha que possui
                </span>
              </button>
            </form>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          fullWidth
          className="mt-4"
          onClick={() => setOpen(false)}
        >
          Cancelar
        </Button>
      </Sheet>
    </>
  );
}
