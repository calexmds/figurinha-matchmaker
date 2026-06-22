import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { TradeCard } from "@/components/trade-card";
import { computeTradeMatches } from "@/lib/match";
import { getActiveGroup, getUserTradeSummary } from "@/lib/data";
import { getGroupTradeData } from "@/app/actions";

export default async function TradesPage() {
  const { supabase, user, profile } = await requireUser();
  const group = await getActiveGroup(
    supabase,
    user.id,
    profile?.active_group_id ?? null,
  );

  if (!group) {
    return (
      <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-6">
        <h2 className="text-xl font-bold text-white">Trocas</h2>
        <p className="mt-2 text-sm text-slate-200">
          Entre ou crie um grupo para ver sugestões de troca.
        </p>
        <Link
          href="/grupo"
          className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
        >
          Ir para Grupo
        </Link>
      </div>
    );
  }

  const { stats } = await getUserTradeSummary(supabase, user.id);

  if (stats.duplicateCount === 0 && stats.needCount === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold text-white">Trocas</h2>
        <p className="mt-2 text-sm text-slate-300">
          Cadastre suas repetidas e o que precisa para calcular as melhores
          trocas.
        </p>
        <Link
          href="/onboarding"
          className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950"
        >
          Cadastrar listas
        </Link>
      </div>
    );
  }

  const tradeData = await getGroupTradeData(group.id);

  const matches = tradeData
    ? computeTradeMatches(
        tradeData.currentUserId,
        tradeData.currentDuplicates,
        tradeData.currentNeeds,
        tradeData.members,
      )
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Sugestões de troca</h2>
        <p className="mt-2 text-sm text-slate-300">
          Grupo <strong className="text-white">{group.name}</strong> — com base
          no que você precisa e no que tem repetido.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          Nenhuma troca direta encontrada ainda. Convide mais pessoas ou
          atualize suas listas.
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match, index) => (
            <TradeCard key={match.userId} match={match} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
