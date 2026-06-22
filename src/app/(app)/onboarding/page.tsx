import Link from "next/link";
import { redirect } from "next/navigation";
import { saveCollection } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { StatCard } from "@/components/stat-card";
import {
  formatDuplicatesForInput,
  formatNeedsForInput,
} from "@/lib/stickers/parse";
import { getUserTradeSummary } from "@/lib/data";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const { duplicates, needs, stats } = await getUserTradeSummary(
    supabase,
    user.id,
  );

  async function saveAction(formData: FormData) {
    "use server";
    const result = await saveCollection(formData);
    if (result?.error) {
      redirect(`/onboarding?error=${encodeURIComponent(result.error)}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Suas listas de troca</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Cole só o que importa para trocar: repetidas e figurinhas que ainda
          faltam. Separe por espaço ou linha — repita o código para marcar mais
          de uma repetida.
        </p>
      </div>

      {stats.duplicateCount > 0 || stats.needCount > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Repetidas"
            value={stats.duplicateCount}
            accent="yellow"
          />
          <StatCard label="Preciso" value={stats.needCount} accent="blue" />
        </div>
      ) : null}

      {params.error ? (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {params.error}
        </p>
      ) : null}

      <form
        action={saveAction}
        className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-5"
      >
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-amber-200">
            Tenho repetidas
          </label>
          <p className="text-xs text-slate-400">
            Figurinhas extras disponíveis para troca.
          </p>
          <textarea
            name="duplicates"
            rows={6}
            defaultValue={formatDuplicatesForInput(duplicates)}
            placeholder="Exemplo: BRA01 BRA05 BRA05 GER10 FWC3"
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-sky-200">
            Preciso
          </label>
          <p className="text-xs text-slate-400">
            Figurinhas que faltam no seu álbum.
          </p>
          <textarea
            name="needs"
            rows={6}
            defaultValue={formatNeedsForInput(needs)}
            placeholder="Exemplo: ARG03 FWC7 BRA12 MEX01"
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="min-h-12 w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition active:bg-emerald-300"
        >
          Salvar listas
        </button>
      </form>

      {stats.duplicateCount > 0 || stats.needCount > 0 ? (
        <Link
          href="/home"
          className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-300 underline"
        >
          Ir para o início
        </Link>
      ) : null}
    </div>
  );
}
