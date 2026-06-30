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
}: CollectionModeGuideProps) {
  if (mode !== "sparse") {
    return (
      <p className="text-sm text-ink-soft">
        Toque em <strong className="text-ink">Tenho</strong> para marcar o que
        possui.
      </p>
    );
  }

  const step1Done = needCount > 0;
  const step2Active = step1Done;
  const step2Done = repetidasTypes > 0;

  return (
    <div className="rounded-xl border border-win-green/25 bg-gradient-to-br from-[#f4fbf4] to-card p-4">
      <ol className="space-y-2">
        <Step
          n={1}
          title="Marque o que falta"
          state={step1Done ? "done" : "active"}
        />
        <Step
          n={2}
          title="Repetidas (se tiver)"
          state={step2Done ? "done" : step2Active ? "active" : "pending"}
        />
      </ol>
    </div>
  );
}

function Step({
  n,
  title,
  state,
}: {
  n: number;
  title: string;
  state: "pending" | "active" | "done";
}) {
  return (
    <li className="flex items-center gap-3">
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
      <p
        className={cn(
          "text-sm font-semibold",
          state === "active" ? "text-ink" : "text-ink-soft",
        )}
      >
        {title}
      </p>
    </li>
  );
}
