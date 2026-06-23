import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { TradeCard } from "@/components/trade-card";
import { PendingTradeCard } from "@/components/pending-trade-card";
import { computeTradeMatches } from "@/lib/match";
import { getActiveGroup, getUserTradeSummary } from "@/lib/data";
import { getGroupTradeData } from "@/app/actions";
import {
  applyReservationsToLists,
  getPendingTrades,
  getUserReservations,
} from "@/lib/trades";
import {
  buildGroupIntelligence,
  membersFromTradeData,
} from "@/lib/group-intelligence";
import { GroupIntelligenceHero } from "@/components/group-intelligence-hero";
import { summarizeTradeDiagnostics } from "@/lib/group-trade-data";

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; combined?: string; completed?: string; cancelled?: string }>;
}) {
  const query = await searchParams;
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
  const pendingTrades = await getPendingTrades(supabase, user.id, group.id);
  const pendingPartnerIds = new Set(pendingTrades.map((t) => t.partnerId));

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

  const tradeData = await getGroupTradeData(group.id);
  const reservations = await getUserReservations(supabase, user.id);

  const intelligence = tradeData
    ? buildGroupIntelligence(
        membersFromTradeData(tradeData),
        tradeData.currentUserId,
      )
    : null;

  const { availableDuplicates, availableNeeds } = tradeData
    ? applyReservationsToLists(
        tradeData.currentDuplicates,
        tradeData.currentNeeds,
        reservations,
      )
    : { availableDuplicates: [], availableNeeds: [] };

  const matches = tradeData
    ? computeTradeMatches(
        tradeData.currentUserId,
        availableDuplicates,
        availableNeeds,
        tradeData.members,
        intelligence?.market,
      )
    : [];

  const feedback =
    query.error ??
    (query.combined ? "Troca combinada! Figurinhas reservadas no gabarito." : null) ??
    (query.completed ? "Troca concluída! Listas atualizadas." : null) ??
    (query.cancelled ? "Combinação cancelada." : null);

  const feedbackIsError = !!query.error;

  const diagnostics =
    tradeData && matches.length === 0
      ? summarizeTradeDiagnostics(tradeData, matches.length)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#1b1b1b]">Trocas</h2>
        <p className="mt-2 text-sm text-[#5f5f5f]">
          Grupo <strong className="text-[#1b1b1b]">{group.name}</strong>
          {tradeData ? (
            <>
              {" "}
              · {tradeData.meta.memberCount} membros ·{" "}
              {tradeData.meta.membersWithDuplicates} com repetidas ·{" "}
              {tradeData.meta.membersWithNeeds} com preciso
            </>
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

      {intelligence &&
      (intelligence.powerStickers.length > 0 ||
        intelligence.chaseStickers.length > 0) ? (
        <GroupIntelligenceHero
          groupName={group.name}
          memberCount={intelligence.market.memberCount}
          powerStickers={intelligence.powerStickers}
          chaseStickers={intelligence.chaseStickers}
        />
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
            {diagnostics ? (
              <>
                <p className="font-semibold text-[#1b1b1b]">{diagnostics.title}</p>
                <p className="leading-6">{diagnostics.detail}</p>
              </>
            ) : (
              <p>
                Nenhuma troca direta encontrada ainda. Convide mais pessoas ou
                atualize suas listas.
              </p>
            )}
            {tradeData && tradeData.members.length > 0 ? (
              <ul className="space-y-2 border-t border-[#eee] pt-3">
                {tradeData.members.map((member) => (
                  <li
                    key={member.userId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[#fafafa] px-3 py-2"
                  >
                    <span className="font-medium text-[#1b1b1b]">
                      {member.name}
                    </span>
                    <span className="text-xs text-[#8a8a8a]">
                      {member.duplicates.length} repetidas · {member.needs.length}{" "}
                      preciso
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <Link
              href="/grupo"
              className="inline-flex min-h-10 items-center text-sm font-semibold text-[#0067c0] underline"
            >
              Ver membros do grupo →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match, index) => (
              <TradeCard
                key={match.userId}
                match={match}
                rank={index + 1}
                groupId={group.id}
                market={intelligence?.market}
                hasPendingWithPartner={pendingPartnerIds.has(match.userId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
