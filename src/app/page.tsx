import Link from "next/link";
import { redirect } from "next/navigation";
import { signInWithGoogle } from "@/app/actions";
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

  async function login() {
    "use server";
    await signInWithGoogle("/home");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <section className="rounded-2xl bg-gradient-to-br from-[#0067c0] to-[#004e93] p-8 text-white shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/80">
          Copa do Mundo 2026
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
          {APP_NAME}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-white/90">
          Registre repetidas, entre no grupo da família ou amigos e descubra
          automaticamente as melhores trocas. Sem planilha, sem horas na mesa.
        </p>

        <ul className="mt-6 space-y-2 text-sm text-white/90">
          <li>✓ {TOTAL_STICKERS} figurinhas do álbum oficial</li>
          <li>✓ Match automático dentro do seu grupo</li>
          <li>✓ Convite e proposta de troca no WhatsApp</li>
        </ul>

        <form action={login} className="mt-8 flex flex-col gap-3">
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-white px-5 py-3 text-sm font-semibold text-[#0067c0] transition active:bg-[#eaeaea]"
          >
            Entrar com Google
          </button>
          <Link
            href="/login"
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition active:bg-white/20"
          >
            Já tenho convite
          </Link>
        </form>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "1. Entre no grupo",
            text: "Crie ou use o link de convite do WhatsApp.",
          },
          {
            title: "2. Marque suas figurinhas",
            text: "Toque para marcar repetidas e o que falta — em segundos.",
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
