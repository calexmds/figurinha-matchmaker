import { cn } from "@/lib/cn";
import type { CollectionEntryMode } from "@/lib/types";

type CollectionModeGuideProps = {
  mode: CollectionEntryMode;
  needCount: number;
  repetidasTypes: number;
  ownedTypes: number;
};

export function CollectionModeGuide({
  mode,
  needCount,
  repetidasTypes,
  ownedTypes,
}: CollectionModeGuideProps) {
  if (mode !== "sparse") {
    return (
      <p className="text-sm leading-6 text-ink-soft">
        Marque tudo que você tem na aba <strong className="text-ink">Tenho</strong>.
        Repetidas e Preciso são calculados automaticamente.
      </p>
    );
  }

  const step1Done = needCount > 0;
  const step2Active = step1Done;
  const step2Done = repetidasTypes > 0;

  return (
    <div className="rounded-xl border border-win-green/25 bg-gradient-to-br from-[#f4fbf4] to-card p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-win-green">
        Modo rápido · {ownedTypes} no álbum
      </p>
      <ol className="mt-3 space-y-2">
        <Step
          n={1}
          title="Marque o que falta"
          hint="Aba Preciso · toque só nas figurinhas que você não tem"
          state={step1Done ? "done" : "active"}
        />
        <Step
          n={2}
          title="Marque repetidas (se tiver)"
          hint="Aba Repetidas · pule se não tiver extras agora"
          state={step2Done ? "done" : step2Active ? "active" : "pending"}
        />
      </ol>
    </div>
  );
}

function Step({
  n,
  title,
  hint,
  state,
}: {
  n: number;
  title: string;
  hint: string;
  state: "pending" | "active" | "done";
}) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          state === "done" && "bg-win-green text-white",
          state === "active" && "bg-need/15 text-need ring-2 ring-need/40",
          state === "pending" && "bg-mica text-ink-muted",
        )}
      >
        {state === "done" ? "✓" : n}
      </span>
      <div className="min-w-0 pt-0.5">
        <p
          className={cn(
            "text-sm font-semibold",
            state === "active" ? "text-ink" : "text-ink-soft",
          )}
        >
          {title}
        </p>
        <p className="text-xs leading-5 text-ink-muted">{hint}</p>
      </div>
    </li>
  );
}
