import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { TradeCard } from "@/components/trade-card";
import { computeTradeMatches } from "@/lib/match";
import { getActiveGroup, getUserStickers } from "@/lib/data";
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
        <h1 className="text-xl font-bold text-white">Trocas</h1>
        <p className="mt-2 text-sm text-slate-200">
          Entre ou crie um grupo para ver sugestões de troca.
        </p>
        <Link
          href="/grupo"
          className="mt-4 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
        >
          Ir para Grupo
        </Link>
      </div>
    );
  }

  const currentStickers = await getUserStickers(supabase, user.id);

  if (currentStickers.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-bold text-white">Trocas</h1>
        <p className="mt-2 text-sm text-slate-300">
          Cadastre suas figurinhas primeiro para calcular as melhores trocas.
        </p>
        <Link
          href="/onboarding"
          className="mt-4 inline-flex rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950"
        >
          Cadastrar figurinhas
        </Link>
      </div>
    );
  }

  const tradeData = await getGroupTradeData(group.id);

  const matches =
    tradeData && tradeData.allCodes.length > 0
      ? computeTradeMatches(
          tradeData.currentUserId,
          tradeData.currentStickers,
          tradeData.members,
          tradeData.allCodes,
        )
      : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Sugestões de troca</h1>
        <p className="mt-2 text-sm text-slate-300">
          Grupo <strong className="text-white">{group.name}</strong> — ranking
          automático com base no que falta e no que você tem repetido.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          Nenhuma troca direta encontrada ainda. Convide mais pessoas ou
          atualize suas figurinhas.
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
