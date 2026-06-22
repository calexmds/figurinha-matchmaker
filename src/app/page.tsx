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
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-10">
      <section className="rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-950 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
          Copa do Mundo 2026
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
          {APP_NAME}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-200">
          Registre repetidas, entre no grupo da família ou amigos e descubra
          automaticamente as melhores trocas. Sem planilha, sem horas na mesa.
        </p>

        <ul className="mt-6 space-y-2 text-sm text-slate-300">
          <li>✓ {TOTAL_STICKERS} figurinhas do álbum oficial</li>
          <li>✓ Match automático dentro do seu grupo</li>
          <li>✓ Convite e proposta de troca no WhatsApp</li>
        </ul>

        <form action={login} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Entrar com Google
          </button>
          <Link
            href="/login"
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
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
            title: "2. Cole os códigos",
            text: "BRA01, FWC3, repetidas — em segundos.",
          },
          {
            title: "3. Veja quem combina",
            text: "Ranking de trocas só com seu círculo.",
          },
        ].map((step) => (
          <article
            key={step.title}
            className="rounded-3xl border border-white/10 bg-white/5 p-5"
          >
            <h2 className="font-semibold text-white">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{step.text}</p>
          </article>
        ))}
      </section>

      <p className="mt-8 text-center text-xs text-slate-500">
        {APP_URL} · Projeto comunitário para colecionadores
      </p>
    </main>
  );
}
