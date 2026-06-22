import Link from "next/link";
import { redirect } from "next/navigation";
import { saveStickers } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { StatCard } from "@/components/stat-card";
import { TOTAL_STICKERS } from "@/lib/constants";
import { getUserCollectionStats } from "@/lib/data";

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();
  const { stats } = await getUserCollectionStats(supabase, user.id);

  async function saveAction(formData: FormData) {
    "use server";
    const result = await saveStickers(formData);
    if (result?.error) {
      redirect(`/onboarding?error=${encodeURIComponent(result.error)}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Suas figurinhas</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Cole códigos separados por espaço, vírgula ou linha. Repita o código
          para marcar repetidas, ou use o formato{" "}
          <code className="rounded bg-white/10 px-1">BRA07 4</code> para
          quantidade.
        </p>
      </div>

      {stats.owned > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Cadastradas" value={stats.owned} accent="green" />
          <StatCard label="Repetidas" value={stats.duplicates} accent="yellow" />
        </div>
      ) : null}

      <form action={saveAction} className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
        <input type="hidden" name="mode" value="paste" />
        <label className="block text-sm font-medium text-slate-200">
          Códigos das figurinhas
        </label>
        <textarea
          name="stickers"
          rows={10}
          placeholder={`Exemplo:\nBRA01 BRA05 BRA05 ARG10 GER10 FWC3\nFRA07 3\n00`}
          className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
        />
        <button
          type="submit"
          className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Salvar figurinhas
        </button>
      </form>

      <p className="text-xs text-slate-400">
        Álbum oficial: {TOTAL_STICKERS} figurinhas (48 seleções + especiais).
      </p>

      {stats.owned > 0 ? (
        <Link
          href="/home"
          className="inline-flex text-sm font-medium text-emerald-300 underline"
        >
          Ir para o início
        </Link>
      ) : null}
    </div>
  );
}
