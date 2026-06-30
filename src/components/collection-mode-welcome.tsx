import { setCollectionEntryMode } from "@/app/actions";
import { MODE_HINT, MODE_QUESTION } from "@/lib/marketing-copy";
import type { CollectionEntryMode } from "@/lib/types";
import { cn } from "@/lib/cn";

export function CollectionModeWelcome() {
  return (
    <div className="mx-auto max-w-lg space-y-6 py-2">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-ink">
          {MODE_QUESTION}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{MODE_HINT}</p>
      </div>

      <div className="grid gap-3">
        <ModeButton mode="sparse" label="Poucas (até ~30)" accent="green" />
        <ModeButton mode="have" label="Muitas / começando" accent="blue" />
      </div>
    </div>
  );
}

function ModeButton({
  mode,
  label,
  accent,
}: {
  mode: CollectionEntryMode;
  label: string;
  accent: "green" | "blue";
}) {
  if (mode !== "have" && mode !== "sparse") return null;

  return (
    <form action={setCollectionEntryMode}>
      <input type="hidden" name="mode" value={mode} />
      <button
        type="submit"
        className={cn(
          "flex min-h-16 w-full items-center justify-center rounded-2xl border px-6 text-lg font-bold transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          accent === "green"
            ? "border-win-green/30 bg-gradient-to-br from-[#f4fbf4] to-card text-win-green shadow-sm"
            : "border-accent/20 bg-gradient-to-br from-[#eef6ff] to-card text-accent",
        )}
      >
        {label}
      </button>
    </form>
  );
}
