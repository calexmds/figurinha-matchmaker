import type { CollectionEntryMode } from "@/lib/types";

export type CollectionModeKey = Extract<CollectionEntryMode, "have" | "sparse">;

export const COLLECTION_MODE_COPY: Record<
  CollectionModeKey,
  {
    shortLabel: string;
    chipLabel: string;
    title: string;
    subtitle: string;
    bullets: string[];
  }
> = {
  have: {
    shortLabel: "Marcar Tenho",
    chipLabel: "Modo Tenho",
    title: "Estou montando o álbum",
    subtitle: "Marco cada figurinha que já tenho",
    bullets: [
      "Ideal se está começando ou tem menos da metade",
      "Toque na aba Tenho para marcar o que possui",
      "Preciso e Repetidas são calculados sozinhos",
    ],
  },
  sparse: {
    shortLabel: "Só faltando",
    chipLabel: "Modo rápido",
    title: "Álbum quase completo",
    subtitle: "Marco só o que falta e repetidas",
    bullets: [
      "Ideal se faltam poucas figurinhas",
      "Assume que você tem todo o resto do álbum",
      "Muito mais rápido com ~30 ou menos faltando",
    ],
  },
};

export function switchToSparseEffects(markedCount: number, needCount: number) {
  return [
    "Suas figurinhas marcadas em Tenho serão convertidas automaticamente.",
    needCount > 0
      ? `${needCount} figurinha(s) continuarão em Preciso.`
      : markedCount > 0
        ? `${markedCount} tipo(s) marcado(s) permanecem no álbum.`
        : "Comece marcando o que falta na aba Preciso.",
    "Repetidas com quantidade extra são mantidas.",
    "Você pode voltar ao modo Tenho a qualquer momento.",
  ];
}

export function switchToHaveEffects(needCount: number, repetidasTypes: number) {
  return [
    "O álbum completo será materializado a partir do que você cadastrou.",
    needCount > 0
      ? `${needCount} figurinha(s) em Preciso viram “não tenho” no modo Tenho.`
      : "Figurinhas não marcadas em Preciso contam como Tenho.",
    repetidasTypes > 0
      ? `${repetidasTypes} tipo(s) com repetida permanecem com quantidade extra.`
      : "Repetidas extras continuam disponíveis para troca.",
    "Depois você edita figurinha por figurinha na aba Tenho.",
  ];
}
