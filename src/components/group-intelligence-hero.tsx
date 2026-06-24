import Link from "next/link";
import type { UserChaseSticker, UserPowerSticker } from "@/lib/types";
import { StickerHeatBadge } from "@/components/sticker-heat-badge";
import { ButtonLink } from "@/components/ui/button";
import { getHeatEmoji } from "@/lib/group-intelligence";

type GroupIntelligenceHeroProps = {
  groupName: string;
  memberCount: number;
  powerStickers: UserPowerSticker[];
  chaseStickers: UserChaseSticker[];
};

export function GroupIntelligenceHero({
  groupName,
  memberCount,
  powerStickers,
  chaseStickers,
}: GroupIntelligenceHeroProps) {
  const golden = powerStickers.filter((s) => s.level === "golden");
  const hasPower = powerStickers.length > 0;
  const hasChase = chaseStickers.length > 0;

  if (!hasPower && !hasChase) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Radar do grupo
          </p>
          <h3 className="font-display mt-1 text-lg font-bold text-ink">
            Inteligência de troca · {groupName}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-[#eef6ff] px-3 py-1 text-xs font-bold text-accent">
          {memberCount} colecionadores
        </span>
      </div>

      {golden.length > 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-golden/60 bg-gradient-to-br from-[#fffbeb] via-[#fff3cc] to-[#ffe8a3] p-5 shadow-[0_8px_32px_rgba(212,160,23,0.18)]">
          <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-[#ffd966]/30 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-[#ff8c00]/15 blur-xl" />
          <div className="relative">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-win-amber">
              <span className="text-xl" aria-hidden>
                👑
              </span>
              Você segura ouro
            </p>
            <p className="mt-2 text-base leading-6 text-[#5c4a1a]">
              {golden.length === 1
                ? "Uma figurina sua é chave do grupo — quase todo mundo precisa e só você tem repetida."
                : `${golden.length} figurinhas suas são ouro puro no grupo. Poder de barganha máximo!`}
            </p>
            <ul className="mt-4 space-y-3">
              {golden.slice(0, 3).map((s) => (
                <li
                  key={s.code}
                  className="rounded-xl border border-golden/40 bg-white/70 px-4 py-3 backdrop-blur-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-black text-ink">
                      {s.code}
                    </span>
                    <StickerHeatBadge level={s.level} demand={s.demand} />
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-[#5c4a1a]">
                    {s.bargainTip}
                  </p>
                </li>
              ))}
            </ul>
            <ButtonLink
              href="/trocas"
              className="mt-4 bg-gradient-to-r from-win-amber to-[#c45c00] text-white shadow-md active:opacity-90"
            >
              Negociar com poder de ouro →
            </ButtonLink>
          </div>
        </div>
      ) : null}

      {hasPower && golden.length === 0 ? (
        <div className="rounded-xl border border-[#ffb366]/50 bg-gradient-to-br from-[#fff8f0] to-[#fff4e6] p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-[#c45c00]">
            <span aria-hidden>🔥</span> Figurinhas quentes nas suas repetidas
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {powerStickers.slice(0, 6).map((s) => (
              <li
                key={s.code}
                className="rounded-lg border border-[#ffb366]/40 bg-white px-3 py-2"
              >
                <span className="font-bold text-ink">{s.code}</span>
                <StickerHeatBadge level={s.level} demand={s.demand} compact />
                <p className="mt-1 text-[11px] text-ink-soft">
                  Peça até {s.suggestedAsk}×
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasChase ? (
        <div className="fluent-card border-l-4 border-l-accent p-5">
          <p className="text-sm font-bold text-accent">
            {getHeatEmoji(chaseStickers[0].level)} Corra atrás destas
          </p>
          <ul className="mt-3 space-y-2">
            {chaseStickers.slice(0, 3).map((s) => (
              <li key={s.code} className="text-sm text-ink">
                <strong>{s.code}</strong>
                <StickerHeatBadge level={s.level} demand={s.demand} compact />
                <span className="mt-0.5 block text-ink-soft">{s.chaseTip}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/trocas"
            className="mt-4 inline-flex text-sm font-semibold text-accent underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Ver quem tem repetida →
          </Link>
        </div>
      ) : null}
    </section>
  );
}
