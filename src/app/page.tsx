import { redirect } from "next/navigation";
import { CopaBadge } from "@/components/copa-badge";
import { ButtonLink } from "@/components/ui/button";
import { CopaHero } from "@/components/ui/copa-hero";
import { APP_NAME, APP_URL, TOTAL_STICKERS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <CopaHero
        size="landing"
        eyebrow="Copa do Mundo 2026"
        title={APP_NAME}
        subtitle={
          <>
            <div className="mb-4 flex items-start gap-4">
              <CopaBadge
                size={56}
                className="shrink-0 rounded-full bg-white/95 p-1"
              />
              <p>
                Registre repetidas, entre no grupo da família ou amigos e
                descubra automaticamente as melhores trocas. Sem planilha, sem
                horas na mesa.
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              <li>✓ {TOTAL_STICKERS} figurinhas do álbum oficial</li>
              <li>✓ Match automático dentro do seu grupo</li>
              <li>✓ Convite e proposta de troca no WhatsApp</li>
            </ul>
          </>
        }
        action={
          <ButtonLink
            href="/api/auth/google?next=/home"
            variant="onBrand"
            fullWidth
            className="min-h-12"
          >
            Entrar com Google
          </ButtonLink>
        }
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "1. Entre no grupo",
            text: "Crie ou use o link de convite do WhatsApp.",
          },
          {
            title: "2. Marque o que tem",
            text: "Na aba Figurinhas, toque nas que você possui.",
          },
          {
            title: "3. Veja quem combina",
            text: "Ranking de trocas só com seu círculo.",
          },
        ].map((step) => (
          <article key={step.title} className="fluent-card p-5">
            <h2 className="font-display font-semibold text-ink">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{step.text}</p>
          </article>
        ))}
      </section>

      <p className="mt-8 text-center text-xs text-ink-muted">
        {APP_URL} · Projeto comunitário para colecionadores
      </p>
    </main>
  );
}
