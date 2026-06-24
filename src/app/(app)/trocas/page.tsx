import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { TradeCard } from "@/components/trade-card";
import { PendingTradeCard } from "@/components/pending-trade-card";
import { MarketListingPanel } from "@/components/market-listing-panel";
import { MarketOpportunityCard } from "@/components/market-opportunity-card";
import { ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { getUserTradeSummary, getUserOwned } from "@/lib/data";
import { computeAllGroupMatches } from "@/lib/multi-group-trades";
import { getUserGroupsWithMembers } from "@/lib/groups";
import {
  getCachedGroupTradeData,
  summarizeAllGroupDiagnostics,
} from "@/lib/group-trade-data";
import { getMarketPageData } from "@/lib/market-listings";
import {
  deriveNeeds,
  deriveTradeDuplicates,
  ownedMapFromList,
} from "@/lib/stickers/collection";
import {
  applyReservationsToLists,
  getUserReservations,
} from "@/lib/trades";

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    proposed?: string;
    accepted?: string;
    rejected?: string;
    completed?: string;
    confirmed?: string;
    cancelled?: string;
    listing_saved?: string;
    listing_removed?: string;
  }>;
}) {
  const query = await searchParams;
  const { supabase, user } = await requireUser();
  const groups = await getUserGroupsWithMembers(supabase, user.id);

  if (groups.length === 0) {
    return (
      <EmptyState
        icon="group"
        title="Entre em um grupo para trocar"
        description="Crie ou entre em um grupo para ver sugestões de troca com família, amigos ou colegas."
        action={
          <ButtonLink href="/grupo" fullWidth>
            Ir para Grupo
          </ButtonLink>
        }
      />
    );
  }

  const [{ stats }, tradeResult, owned, reservations] = await Promise.all([
    getUserTradeSummary(supabase, user.id),
    computeAllGroupMatches(supabase, user.id),
    getUserOwned(supabase, user.id),
    getUserReservations(supabase, user.id),
  ]);

  const { availableDuplicates, availableNeeds } = applyReservationsToLists(
    deriveTradeDuplicates(ownedMapFromList(owned)),
    deriveNeeds(ownedMapFromList(owned)),
    reservations,
  );

  const marketData = await getMarketPageData(
    supabase,
    user.id,
    groups.map((g) => ({ id: g.id, name: g.name })),
    availableDuplicates.map((d) => d.code),
    availableNeeds,
  );

  const { matches, pendingTrades, pendingPartnerKeys, groupCount, totalMembers } =
    tradeResult;

  if (
    stats.duplicateCount === 0 &&
    stats.needCount === 0 &&
    pendingTrades.length === 0
  ) {
    return (
      <EmptyState
        icon="album"
        title="Marque suas figurinhas primeiro"
        description="Abra a aba Figurinhas e marque o que você tem, repete ou precisa. O app calcula as melhores trocas automaticamente."
        action={
          <ButtonLink href="/onboarding" fullWidth>
            Abrir figurinhas
          </ButtonLink>
        }
      />
    );
  }

  const feedback =
    query.error ??
    (query.proposed
      ? "Proposta enviada! Aguardando o parceiro aceitar."
      : null) ??
    (query.accepted
      ? "Troca aceita! Figurinhas reservadas para os dois."
      : null) ??
    (query.rejected ? "Proposta recusada." : null) ??
    (query.completed
      ? "Troca concluída! Coleções dos dois atualizadas."
      : null) ??
    (query.confirmed
      ? "Confirmação registrada. Aguardando o parceiro confirmar também."
      : null) ??
    (query.cancelled ? "Troca cancelada." : null) ??
    (query.listing_saved ? "Anúncio publicado!" : null) ??
    (query.listing_removed ? "Anúncio removido." : null);

  const feedbackIsError = !!query.error;

  const groupNames = groups.map((g) => g.name).join(", ");

  let diagnosticsList: Array<{
    groupName: string;
    title: string;
    detail: string;
  }> = [];
  if (matches.length === 0 && groups.length > 0) {
    const tradeDataByGroup = new Map(
      await Promise.all(
        groups.map(async (g) => {
          const tradeData = await getCachedGroupTradeData(
            supabase,
            g.id,
            user.id,
          );
          return [g.id, tradeData] as const;
        }),
      ),
    );
    const matchesByGroup = new Map<string, number>();
    for (const match of matches) {
      matchesByGroup.set(
        match.groupId,
        (matchesByGroup.get(match.groupId) ?? 0) + 1,
      );
    }
    diagnosticsList = summarizeAllGroupDiagnostics(
      groups.map((g) => ({ id: g.id, name: g.name })),
      matchesByGroup,
      tradeDataByGroup,
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm leading-6 text-ink-soft">
        {groupCount === 1 ? (
          <>
            Grupo <strong className="text-ink">{groups[0].name}</strong>
          </>
        ) : (
          <>
            <strong className="text-ink">{groupCount} grupos</strong> (
            {groupNames})
          </>
        )}
        {totalMembers > 0 ? (
          <> · {totalMembers} colecionadores no radar</>
        ) : null}
        {" "}— proponha trocas, negocie compra e venda, encontre pessoalmente e
        confirme.
      </p>

      {feedback ? (
        <Callout variant={feedbackIsError ? "error" : "success"}>
          {feedbackIsError ? decodeURIComponent(feedback) : feedback}
        </Callout>
      ) : null}

      {pendingTrades.length > 0 ? (
        <section className="space-y-4">
          <h3 className="text-base font-bold text-ink">
            Trocas abertas ({pendingTrades.length})
          </h3>
          {pendingTrades.map((trade) => (
            <PendingTradeCard key={trade.id} trade={trade} />
          ))}
        </section>
      ) : null}

      <section className="space-y-4">
        <h3 className="text-base font-bold text-ink">Sugestões de troca</h3>

        {matches.length === 0 ? (
          diagnosticsList.length > 0 ? (
            <div className="fluent-card space-y-4 p-6 text-sm text-ink-soft">
              {diagnosticsList.map((diag) => (
                <div key={diag.groupName} className="space-y-2">
                  <p className="font-display font-semibold text-ink">
                    {diag.title}
                  </p>
                  <p className="leading-6">{diag.detail}</p>
                </div>
              ))}
              <Link
                href="/grupo"
                className="inline-flex min-h-10 items-center text-sm font-semibold text-accent underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Gerenciar grupos →
              </Link>
            </div>
          ) : (
            <EmptyState
              icon="trade"
              title="Nenhuma troca direta ainda"
              description="Convide mais pessoas para o grupo ou marque mais figurinhas. Quanto mais completo o cadastro, melhor o match."
              action={
                <ButtonLink href="/grupo" variant="outline" fullWidth>
                  Gerenciar grupos
                </ButtonLink>
              }
            />
          )
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
                editGivePool={match.editGivePool}
                editReceivePool={match.editReceivePool}
                hasPendingWithPartner={pendingPartnerKeys.has(
                  `${match.groupId}:${match.userId}`,
                )}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-ink">
            Comprar e vender
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            Anuncie repetidas ou figurinhas que quer comprar. O preço é
            combinado no WhatsApp — sem pagamento pelo app.
          </p>
        </div>

        {marketData.opportunities.length > 0 ? (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Oportunidades no grupo ({marketData.opportunities.length})
            </h4>
            {marketData.opportunities.map((opportunity) => (
              <MarketOpportunityCard
                key={`${opportunity.kind}-${opportunity.listing.id}`}
                opportunity={opportunity}
              />
            ))}
          </div>
        ) : null}

        <MarketListingPanel
          ownListings={marketData.ownListings}
          sellOptions={marketData.sellOptions}
          buyOptions={marketData.buyOptions}
          defaultGroupId={groups[0]?.id}
        />
      </section>
    </div>
  );
}
