import Link from "next/link";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { CopaHero } from "@/components/ui/copa-hero";
import { APP_URL } from "@/lib/constants";
import {
  LANDING_BODY,
  LANDING_HEADLINE,
  LANDING_TAGLINE,
  LANDING_TRUST,
  PRIMARY_CTA_CREATE_GROUP,
} from "@/lib/marketing-copy";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }

  const createGroupHref = `/api/auth/google?next=${encodeURIComponent("/grupo")}`;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <CopaHero
        size="landing"
        eyebrow="Copa do Mundo 2026"
        title={LANDING_HEADLINE}
        subtitle={
          <>
            <p className="font-semibold text-white">{LANDING_TAGLINE}</p>
            <p className="mt-3">{LANDING_BODY}</p>
          </>
        }
        action={
          <ButtonLink
            href={createGroupHref}
            variant="onBrand"
            fullWidth
            className="min-h-12 text-base font-bold"
          >
            {PRIMARY_CTA_CREATE_GROUP}
          </ButtonLink>
        }
      />

      <p className="mt-4 text-center text-sm leading-6 text-ink-soft">
        {LANDING_TRUST}
      </p>

      <p className="mt-3 text-center text-xs text-ink-muted">
        Recebeu convite?{" "}
        <Link
          href="/login?next=/grupo"
          className="font-semibold text-accent underline underline-offset-2"
        >
          Entrar com código
        </Link>
      </p>

      <section className="mt-10 space-y-4">
        <h2 className="text-center font-display text-lg font-semibold text-ink">
          Como funciona
        </h2>
        <div className="grid gap-3">
          {[
            {
              title: "1. Crie seu grupo",
              text: "Família, escola, trabalho ou bairro — leva menos de 1 minuto.",
            },
            {
              title: "2. Mande no WhatsApp",
              text: "Mensagem pronta para o grupo. Quem entrar já aparece combinado com você.",
            },
            {
              title: "3. Marque o álbum",
              text: "O que tem, repetidas e faltantes — o app faz o match sozinho.",
            },
          ].map((step) => (
            <article key={step.title} className="fluent-card p-5">
              <h3 className="font-display font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 fluent-card p-5">
        <h2 className="font-display font-semibold text-ink">
          O app oficial do seu grupo
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Não é marketplace aberto. É a ferramenta do seu círculo — escola,
          condomínio, empresa, igreja, escolinha ou papelaria do bairro. Troca
          presencial, entre pessoas de confiança.
        </p>
      </section>

      <div className="mt-8">
        <ButtonLink href={createGroupHref} fullWidth className="min-h-12">
          {PRIMARY_CTA_CREATE_GROUP}
        </ButtonLink>
      </div>

      <p className="mt-6 text-center text-xs text-ink-muted">
        {APP_URL}
      </p>
    </main>
  );
}
