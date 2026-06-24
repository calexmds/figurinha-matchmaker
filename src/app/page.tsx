import Link from "next/link";
import { redirect } from "next/navigation";
import { CopaBadge } from "@/components/copa-badge";
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
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0067c0] via-[#005aa8] to-[#0f7b0f] p-8 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <CopaBadge size={64} className="shrink-0 rounded-full bg-white/95 p-1" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/80">
              Copa do Mundo 2026
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
              {APP_NAME}
            </h1>
          </div>
        </div>
        <p className="mt-4 max-w-xl text-base leading-7 text-white/90">
          Registre repetidas, entre no grupo da família ou amigos e descubra
          automaticamente as melhores trocas. Sem planilha, sem horas na mesa.
        </p>

        <ul className="mt-6 space-y-2 text-sm text-white/90">
          <li>✓ {TOTAL_STICKERS} figurinhas do álbum oficial</li>
          <li>✓ Match automático dentro do seu grupo</li>
          <li>✓ Convite e proposta de troca no WhatsApp</li>
        </ul>

        <div className="mt-8">
          <Link
            href="/api/auth/google?next=/home"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-white px-5 py-3 text-sm font-semibold text-[#0067c0] transition active:bg-[#eaeaea]"
          >
            Entrar com Google
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "1. Entre no grupo",
            text: "Crie ou use o link de convite do WhatsApp.",
          },
          {
            title: "2. Marque o que tem",
            text: "Na aba Tenho, toque nas figurinhas que você possui.",
          },
          {
            title: "3. Veja quem combina",
            text: "Ranking de trocas só com seu círculo.",
          },
        ].map((step) => (
          <article key={step.title} className="fluent-card p-5">
            <h2 className="font-semibold text-[#1b1b1b]">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#5f5f5f]">{step.text}</p>
          </article>
        ))}
      </section>

      <p className="mt-8 text-center text-xs text-[#8a8a8a]">
        {APP_URL} · Projeto comunitário para colecionadores
      </p>
    </main>
  );
}
