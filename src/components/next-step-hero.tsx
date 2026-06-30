import Link from "next/link";
import { WhatsAppShareButton } from "@/components/whatsapp-share";
import { ButtonLink } from "@/components/ui/button";
import { StickerChipList } from "@/components/sticker-heat-badge";
import { cn } from "@/lib/cn";
import {
  HOME_CTA_MARK_ALBUM,
  HOME_CTA_VIEW_TRADES,
  PRIMARY_CTA_CREATE_GROUP_SHORT,
  WHATSAPP_SHARE_LABEL_SHORT,
} from "@/lib/marketing-copy";
import type { TradeMatch } from "@/lib/types";

type NextStep = "group" | "invite" | "album" | "trade";

type NextStepHeroProps = {
  step: NextStep;
  userName: string;
  groupName?: string;
  inviteMessage?: string;
  topMatch?: TradeMatch | null;
  matchCount?: number;
};

const STEPS = [
  { id: "group", label: "Grupo" },
  { id: "album", label: "Álbum" },
  { id: "trade", label: "Troca" },
] as const;

function stepIndex(step: NextStep): number {
  if (step === "group") return 0;
  if (step === "invite") return 0;
  if (step === "album") return 1;
  return 2;
}

function ProgressDots({ current }: { current: NextStep }) {
  const active = stepIndex(current);

  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-colors",
                index < active
                  ? "bg-win-green"
                  : index === active
                    ? "bg-white ring-2 ring-white/50"
                    : "bg-white/30",
              )}
              aria-hidden
            />
            <span className="text-[10px] font-semibold text-white/80">
              {item.label}
            </span>
          </div>
          {index < STEPS.length - 1 ? (
            <span
              className={cn(
                "mb-4 h-px w-6",
                index < active ? "bg-win-green/80" : "bg-white/25",
              )}
              aria-hidden
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function headlineForStep(step: NextStep, matchCount: number): string {
  switch (step) {
    case "group":
      return "Crie seu grupo";
    case "invite":
      return "Convide no WhatsApp";
    case "album":
      return "Marque seu álbum";
    case "trade":
      if (matchCount === 0) return "Aguardando trocas";
      return matchCount === 1
        ? "1 troca pronta"
        : `${matchCount} trocas prontas`;
  }
}

function subtitleForStep(
  step: NextStep,
  groupName?: string,
  matchCount = 0,
): string | null {
  switch (step) {
    case "group":
      return "Família, escola ou bairro — leva 1 minuto.";
    case "invite":
      return groupName
        ? `${groupName} · mande o link para entrarem.`
        : "Mande o link para entrarem.";
    case "album":
      return "Toque no que tem, falta e repete.";
    case "trade":
      if (matchCount === 0) return "Convide mais gente ou atualize o álbum.";
      return "Veja quem combina com você.";
  }
}

export function NextStepHero({
  step,
  userName,
  groupName,
  inviteMessage,
  topMatch,
  matchCount = 0,
}: NextStepHeroProps) {
  const subtitle = subtitleForStep(step, groupName, matchCount);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent via-[#005aa8] to-win-green p-5 text-white shadow-lg">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />

      <div className="relative space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
          Olá, {userName}
        </p>

        <ProgressDots current={step} />

        <div>
          <h2 className="font-display text-xl font-black leading-tight text-white">
            {headlineForStep(step, matchCount)}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-white/90">{subtitle}</p>
          ) : null}
        </div>

        {step === "trade" && topMatch ? (
          <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              Melhor troca
            </p>
            <p className="font-display mt-1 text-lg font-bold">{topMatch.name}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase text-white/70">
                  Você recebe
                </p>
                <StickerChipList
                  codes={topMatch.receive.slice(0, 4)}
                  variant="receive"
                  emptyLabel="—"
                />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-white/70">
                  Você entrega
                </p>
                <StickerChipList
                  codes={topMatch.give.slice(0, 4)}
                  variant="give"
                  emptyLabel="—"
                />
              </div>
            </div>
          </div>
        ) : null}

        <div>
          {step === "group" ? (
            <ButtonLink href="/grupo" variant="onBrand" fullWidth>
              {PRIMARY_CTA_CREATE_GROUP_SHORT}
            </ButtonLink>
          ) : step === "invite" && inviteMessage ? (
            <WhatsAppShareButton
              message={inviteMessage}
              label={WHATSAPP_SHARE_LABEL_SHORT}
              className="w-full"
            />
          ) : step === "album" ? (
            <ButtonLink href="/onboarding" variant="onBrand" fullWidth>
              {HOME_CTA_MARK_ALBUM}
            </ButtonLink>
          ) : step === "trade" ? (
            <ButtonLink href="/trocas" variant="onBrand" fullWidth>
              {HOME_CTA_VIEW_TRADES}
            </ButtonLink>
          ) : null}
        </div>

        {step === "album" ? (
          <p className="text-center text-xs text-white/70">
            <Link href="/onboarding" className="underline underline-offset-2">
              Atualizar listas depois
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
