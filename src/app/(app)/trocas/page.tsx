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
      <div className="rounded-lg border border-[#ecdfc0] bg-[#fbf6ea] p-6">
        <h2 className="text-xl font-bold text-[#1b1b1b]">Trocas</h2>
        <p className="mt-2 text-sm text-[#5f5f5f]">
          Entre ou crie um grupo para ver sugestões de troca.
        </p>
        <Link
          href="/grupo"
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[#0067c0] px-4 py-3 text-sm font-semibold text-white active:bg-[#005aa8]"
        >
          Ir para Grupo
        </Link>
      </div>
    );
  }

  const { stats } = await getUserTradeSummary(supabase, user.id);

  if (stats.duplicateCount === 0 && stats.needCount === 0) {
    return (
      <div className="fluent-card p-6">
        <h2 className="text-xl font-bold text-[#1b1b1b]">Trocas</h2>
        <p className="mt-2 text-sm text-[#5f5f5f]">
          Cadastre suas repetidas e o que precisa para calcular as melhores
          trocas.
        </p>
        <Link
          href="/onboarding"
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[#0067c0] px-4 py-3 text-sm font-semibold text-white active:bg-[#005aa8]"
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
        <h2 className="text-xl font-bold text-[#1b1b1b]">Sugestões de troca</h2>
        <p className="mt-2 text-sm text-[#5f5f5f]">
          Grupo <strong className="text-[#1b1b1b]">{group.name}</strong> — com
          base no que você precisa e no que tem repetido.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="fluent-card p-6 text-sm text-[#5f5f5f]">
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
