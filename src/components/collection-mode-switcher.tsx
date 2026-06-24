"use client";

import { useState } from "react";
import { switchCollectionEntryMode } from "@/app/actions";
import type { CollectionEntryMode } from "@/lib/types";

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
        className="inline-flex items-center gap-2 rounded-full border border-[#e6e6e6] bg-white px-3 py-1.5 text-xs font-semibold text-[#5f5f5f] transition active:bg-[#f5f5f5]"
      >
        <span
          className={`h-2 w-2 rounded-full ${sparse ? "bg-[#0f7b0f]" : "bg-[#0067c0]"}`}
        />
        {sparse ? "Modo álbum quase completo" : "Modo marcar Tenho"}
        <span className="text-[#9a9a9a]">▾</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md animate-sheet-up rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#1b1b1b]">
              Trocar forma de cadastro
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#5f5f5f]">
              {sparse
                ? "No modo atual assumimos que você tem quase tudo. Só marca o que falta e repetidas."
                : "No modo atual você marca figurinha por figurinha em Tenho."}
            </p>

            <div className="mt-4 space-y-2">
              {!sparse ? (
                <form action={switchCollectionEntryMode}>
                  <input type="hidden" name="mode" value="sparse" />
                  <button
                    type="submit"
                    className="flex w-full flex-col rounded-lg border border-[#0f7b0f]/20 bg-[#f4fbf4] p-4 text-left transition active:opacity-90"
                  >
                    <span className="text-sm font-bold text-[#1b1b1b]">
                      Mudar para álbum quase completo
                    </span>
                    <span className="mt-1 text-xs text-[#0f7b0f]">
                      Marque só Preciso + Repetidas — mais rápido
                    </span>
                  </button>
                </form>
              ) : (
                <form action={switchCollectionEntryMode}>
                  <input type="hidden" name="mode" value="have" />
                  <button
                    type="submit"
                    className="flex w-full flex-col rounded-lg border border-[#0067c0]/20 bg-[#f4f9ff] p-4 text-left transition active:opacity-90"
                  >
                    <span className="text-sm font-bold text-[#1b1b1b]">
                      Mudar para marcar Tenho
                    </span>
                    <span className="mt-1 text-xs text-[#0067c0]">
                      Marque cada figurinha que possui
                    </span>
                  </button>
                </form>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-md border border-[#d0d0d0] py-2.5 text-sm font-medium text-[#1b1b1b]"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
