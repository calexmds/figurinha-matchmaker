import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { TradeCard } from "@/components/trade-card";
import { PendingTradeCard } from "@/components/pending-trade-card";
import { getUserTradeSummary } from "@/lib/data";
import { computeAllGroupMatches } from "@/lib/multi-group-trades";
import { getUserGroupsWithMembers } from "@/lib/groups";

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; combined?: string; completed?: string; cancelled?: string }>;
}) {
  const query = await searchParams;
  const { supabase, user } = await requireUser();
  const groups = await getUserGroupsWithMembers(supabase, user.id);

  if (groups.length === 0) {
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

  const [{ stats }, tradeResult] = await Promise.all([
    getUserTradeSummary(supabase, user.id),
    computeAllGroupMatches(supabase, user.id),
  ]);

  const { matches, pendingTrades, pendingPartnerKeys, groupCount, totalMembers } =
    tradeResult;

  if (
    stats.duplicateCount === 0 &&
    stats.needCount === 0 &&
    pendingTrades.length === 0
  ) {
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

  const feedback =
    query.error ??
    (query.combined ? "Troca combinada! Figurinhas reservadas no gabarito." : null) ??
    (query.completed ? "Troca concluída! Listas atualizadas." : null) ??
    (query.cancelled ? "Combinação cancelada." : null);

  const feedbackIsError = !!query.error;

  const groupNames = groups.map((g) => g.name).join(", ");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#1b1b1b]">Trocas</h2>
        <p className="mt-2 text-sm text-[#5f5f5f]">
          {groupCount === 1 ? (
            <>
              Grupo <strong className="text-[#1b1b1b]">{groups[0].name}</strong>
            </>
          ) : (
            <>
              <strong className="text-[#1b1b1b]">{groupCount} grupos</strong> (
              {groupNames})
            </>
          )}
          {totalMembers > 0 ? (
            <> · {totalMembers} colecionadores no radar</>
          ) : null}
          {" "}— combine, encontre pessoalmente e confirme quando a troca física
          acontecer.
        </p>
      </div>

      {feedback ? (
        <p
          className={`rounded-md border px-4 py-3 text-sm ${
            feedbackIsError
              ? "border-[#f3c9c5] bg-[#fdf0ef] text-[#c42b1c]"
              : "border-[#cfe9cf] bg-[#eef7ee] text-[#0f7b0f]"
          }`}
        >
          {feedbackIsError ? decodeURIComponent(feedback) : feedback}
        </p>
      ) : null}

      {pendingTrades.length > 0 ? (
        <section className="space-y-4">
          <h3 className="text-base font-bold text-[#1b1b1b]">
            Trocas combinadas ({pendingTrades.length})
          </h3>
          {pendingTrades.map((trade) => (
            <PendingTradeCard key={trade.id} trade={trade} />
          ))}
        </section>
      ) : null}

      <section className="space-y-4">
        <h3 className="text-base font-bold text-[#1b1b1b]">Sugestões de troca</h3>

        {matches.length === 0 ? (
          <div className="fluent-card space-y-3 p-6 text-sm text-[#5f5f5f]">
            <p className="font-semibold text-[#1b1b1b]">
              Nenhuma troca direta encontrada ainda
            </p>
            <p className="leading-6">
              Convide mais pessoas aos seus grupos ou atualize suas listas de
              repetidas e preciso.
            </p>
            <Link
              href="/grupo"
              className="inline-flex min-h-10 items-center text-sm font-semibold text-[#0067c0] underline"
            >
              Gerenciar grupos →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match, index) => (
              <TradeCard
                key={`${match.groupId}-${match.userId}`}
                match={match}
                rank={index + 1}
                groupId={match.groupId}
                groupName={match.groupName}
                market={match.market}
                hasPendingWithPartner={pendingPartnerKeys.has(
                  `${match.groupId}:${match.userId}`,
                )}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
