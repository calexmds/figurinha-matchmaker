import { setCollectionEntryMode } from "@/app/actions";
import type { CollectionEntryMode } from "@/lib/types";

type CollectionModeWelcomeProps = {
  compact?: boolean;
};

export function CollectionModeWelcome({ compact }: CollectionModeWelcomeProps) {
  return (
    <div className={compact ? "space-y-4" : "mx-auto max-w-lg space-y-6 py-2"}>
      {!compact ? (
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0067c0]">
            Primeiro passo
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#1b1b1b]">
            Como você quer cadastrar?
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#5f5f5f]">
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
          accent="#0067c0"
          icon="📘"
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
          accent="#0f7b0f"
          icon="⚡"
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
  accent,
  icon,
  featured,
}: {
  mode: CollectionEntryMode;
  title: string;
  subtitle: string;
  bullets: string[];
  accent: string;
  icon: string;
  featured?: boolean;
}) {
  return (
    <form action={setCollectionEntryMode}>
      <input type="hidden" name="mode" value={mode} />
      <button
        type="submit"
        className={`group flex h-full w-full flex-col rounded-xl border p-5 text-left transition active:scale-[0.99] ${
          featured
            ? "border-[#0f7b0f]/30 bg-gradient-to-br from-[#f4fbf4] to-white shadow-sm ring-1 ring-[#0f7b0f]/20"
            : "border-[#e6e6e6] bg-white hover:border-[#0067c0]/30"
        }`}
      >
        {featured ? (
          <span className="mb-3 inline-flex w-fit rounded-full bg-[#eef7ee] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0f7b0f]">
            Recomendado se falta pouco
          </span>
        ) : null}
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <h3 className="mt-3 text-lg font-bold text-[#1b1b1b]">{title}</h3>
        <p className="mt-1 text-sm font-medium" style={{ color: accent }}>
          {subtitle}
        </p>
        <ul className="mt-4 flex-1 space-y-2 text-sm leading-5 text-[#5f5f5f]">
          {bullets.map((line) => (
            <li key={line} className="flex gap-2">
              <span style={{ color: accent }} aria-hidden>
                ✓
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <span
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold text-white"
          style={{ background: accent }}
        >
          Escolher este modo
        </span>
      </button>
    </form>
  );
}
