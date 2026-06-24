import { setCollectionEntryMode } from "@/app/actions";
import type { CollectionEntryMode } from "@/lib/types";
import { cn } from "@/lib/cn";

type CollectionModeWelcomeProps = {
  compact?: boolean;
};

export function CollectionModeWelcome({ compact }: CollectionModeWelcomeProps) {
  return (
    <div className={compact ? "space-y-4" : "mx-auto max-w-lg space-y-6 py-2"}>
      {!compact ? (
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Primeiro passo
          </p>
          <h2 className="font-display mt-2 text-2xl font-bold text-ink">
            Como você quer cadastrar?
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Escolha o jeito mais rápido para você. Dá para trocar depois em
            Figurinhas.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <ModeCard
          mode="have"
          title="Estou montando o álbum"
          subtitle="Marco o que já tenho"
          bullets={[
            "Ideal se está começando",
            "Ou tem menos da metade completo",
            "Toque em cada figurinha que possui",
          ]}
          variant="accent"
        />
        <ModeCard
          mode="sparse"
          title="Álbum quase completo"
          subtitle="Marco só o que falta e repetidas"
          bullets={[
            "Ideal se faltam poucas figurinhas",
            "Assume que você tem o resto",
            "Muito mais rápido com ~30 faltando",
          ]}
          variant="green"
          featured
        />
      </div>
    </div>
  );
}

function ModeCard({
  mode,
  title,
  subtitle,
  bullets,
  variant,
  featured,
}: {
  mode: CollectionEntryMode;
  title: string;
  subtitle: string;
  bullets: string[];
  variant: "accent" | "green";
  featured?: boolean;
}) {
  const isGreen = variant === "green";

  return (
    <form action={setCollectionEntryMode}>
      <input type="hidden" name="mode" value={mode} />
      <button
        type="submit"
        className={cn(
          "group flex h-full w-full flex-col rounded-xl border p-5 text-left transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          featured
            ? "border-win-green/30 bg-gradient-to-br from-[#f4fbf4] to-card shadow-sm ring-1 ring-win-green/20"
            : "border-line bg-card",
        )}
      >
        {featured ? (
          <span className="mb-3 inline-flex w-fit rounded-full bg-[#eef7ee] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-win-green">
            Recomendado se falta pouco
          </span>
        ) : null}
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            isGreen ? "bg-[#eef7ee] text-win-green" : "bg-[#eef6ff] text-accent",
          )}
          aria-hidden
        >
          {isGreen ? <BoltIcon /> : <AlbumIcon />}
        </span>
        <h3 className="font-display mt-3 text-lg font-bold text-ink">{title}</h3>
        <p
          className={cn(
            "mt-1 text-sm font-medium",
            isGreen ? "text-win-green" : "text-accent",
          )}
        >
          {subtitle}
        </p>
        <ul className="mt-4 flex-1 space-y-2 text-sm leading-5 text-ink-soft">
          {bullets.map((line) => (
            <li key={line} className="flex gap-2">
              <span
                className={isGreen ? "text-win-green" : "text-accent"}
                aria-hidden
              >
                ✓
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <span
          className={cn(
            "mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-white",
            isGreen ? "bg-win-green" : "bg-accent",
          )}
        >
          Escolher este modo
        </span>
      </button>
    </form>
  );
}

function AlbumIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}
