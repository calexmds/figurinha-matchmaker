import { requireUser } from "@/lib/auth";
import { InstallPrompt } from "@/components/install-prompt";
import { StatCard } from "@/components/stat-card";
import { GroupIntelligenceHero } from "@/components/group-intelligence-hero";
import { WhatsAppShareButton } from "@/components/whatsapp-share";
import { ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { CopaHero } from "@/components/ui/copa-hero";
import {
  buildInviteMessage,
  buildProfileMessage,
} from "@/lib/whatsapp";
import {
  LANDING_HEADLINE,
  PRIMARY_CTA_CREATE_GROUP,
  WHATSAPP_SHARE_LABEL,
} from "@/lib/marketing-copy";
import {
  computeTradeMatches,
} from "@/lib/match";
import {
  buildGroupIntelligence,
  membersFromTradeData,
} from "@/lib/group-intelligence";
import { getUserTradeSummary } from "@/lib/data";
import { buildGroupProgress } from "@/lib/group-progress";
import { getCachedGroupTradeData } from "@/lib/group-trade-data";
import { getUserGroupsWithMembers } from "@/lib/groups";

export default async function HomePage() {
  const { supabase, user, profile } = await requireUser();

  const [{ duplicates, needs, stats }, groups] = await Promise.all([
    getUserTradeSummary(supabase, user.id),
    getUserGroupsWithMembers(supabase, user.id),
  ]);

  const tradeSnapshots = await Promise.all(
    groups.map(async (g) => {
      const tradeData = await getCachedGroupTradeData(supabase, g.id, user.id);
      if (!tradeData) return null;
      const intelligence = buildGroupIntelligence(
        membersFromTradeData(tradeData),
        user.id,
      );
      const progress = buildGroupProgress(g.members, tradeData, user.id);
      const matches = computeTradeMatches(
        user.id,
        tradeData.currentDuplicates,
        tradeData.currentNeeds,
        tradeData.members,
        intelligence.market,
      );
      return { group: g, tradeData, intelligence, progress, matches };
    }),
  );

  const validSnapshots = tradeSnapshots.filter(
    (s): s is NonNullable<typeof s> => !!s,
  );

  const bilateralMatchCount = validSnapshots.reduce(
    (sum, s) => sum + s.matches.length,
    0,
  );

  const heroSnapshot = validSnapshots.reduce<(typeof validSnapshots)[0] | null>(
    (best, current) => {
      const golden =
        current.intelligence.powerStickers.filter((p) => p.level === "golden")
          .length;
      const bestGolden =
        best?.intelligence.powerStickers.filter((p) => p.level === "golden")
          .length ?? 0;
      if (!best || golden > bestGolden) return current;
      return best;
    },
    null,
  );

  const totalMembers = validSnapshots.reduce(
    (sum, s) => sum + s.intelligence.market.memberCount,
    0,
  );

  const hasLists = stats.duplicateCount > 0 || stats.needCount > 0;
  const goldenCount =
    heroSnapshot?.intelligence.powerStickers.filter((s) => s.level === "golden")
      .length ?? 0;

  const groupLabel =
    groups.length === 0
      ? null
      : groups.length === 1
        ? groups[0].name
        : `${groups.length} grupos`;

  const groupsNeedingNudge = validSnapshots.filter(
    (s) =>
      s.progress.memberCount < 2 || s.progress.pendingMembers.length > 0,
  );

  const primaryGroup = groups[0] ?? null;
  const soloInGroup =
    primaryGroup !== null &&
    (validSnapshots.find((s) => s.group.id === primaryGroup.id)?.progress
      .memberCount ?? 1) < 2;

  const heroTitle =
    goldenCount > 0
      ? "Você tem figurinhas de ouro!"
      : groups.length === 0
        ? LANDING_HEADLINE
        : hasLists
          ? bilateralMatchCount > 0
            ? `${bilateralMatchCount} ${bilateralMatchCount === 1 ? "troca bilateral" : "trocas bilaterais"} no seu grupo`
            : "Pronto para trocar"
          : "Marque seu álbum em 2 minutos";

  const heroSubtitle =
    groups.length === 0 ? (
      <>
        Crie seu grupo, mande o link no WhatsApp e descubra quem tem o que você
        precisa — sem perguntar em 10 grupos diferentes.
      </>
    ) : soloInGroup && !hasLists ? (
      <>
        Você já criou <strong className="text-white">{primaryGroup?.name}</strong>.
        Mande o link no WhatsApp — quem entrar já aparece combinado com você.
      </>
    ) : !hasLists ? (
      <>
        Marque repetidas e faltantes — o app cruza com quem já entrou no grupo.
      </>
    ) : (
      <>
        {groups.length === 1 ? "Grupo" : "Grupos"}:{" "}
        <strong className="text-white">{groupLabel}</strong>
        {totalMembers > 1 ? (
          <> · {totalMembers} colecionadores no radar</>
        ) : null}
      </>
    );

  const inviteShareMessage =
    primaryGroup &&
    buildInviteMessage(primaryGroup.name, primaryGroup.inviteCode);

  return (
    <div className="space-y-6">
      <InstallPrompt />

      <CopaHero
        variant={goldenCount > 0 ? "golden" : "brand"}
        eyebrow={`Olá, ${profile?.name ?? "colecionador"}`}
        title={heroTitle}
        subtitle={heroSubtitle}
        action={
          groups.length === 0 ? (
            <ButtonLink href="/grupo" variant="onBrand" fullWidth>
              {PRIMARY_CTA_CREATE_GROUP}
            </ButtonLink>
          ) : soloInGroup && inviteShareMessage ? (
            <WhatsAppShareButton
              message={inviteShareMessage}
              label={WHATSAPP_SHARE_LABEL}
              className="w-full"
            />
          ) : !hasLists ? (
            <ButtonLink href="/onboarding" variant="onBrand" fullWidth>
              Cadastrar figurinhas
            </ButtonLink>
          ) : bilateralMatchCount > 0 ? (
            <ButtonLink href="/trocas" variant="onBrand" fullWidth>
              Ver {bilateralMatchCount}{" "}
              {bilateralMatchCount === 1 ? "sugestão de troca" : "sugestões de troca"}
            </ButtonLink>
          ) : undefined
        }
      />

      {groupsNeedingNudge.length > 0 ? (
        <Callout
          variant="warning"
          title={
            groupsNeedingNudge.length === 1
              ? groupsNeedingNudge[0].progress.memberCount < 2
                ? `${groupsNeedingNudge[0].group.name}: convide mais alguém`
                : `${groupsNeedingNudge[0].group.name}: ${groupsNeedingNudge[0].progress.registeredCount} de ${groupsNeedingNudge[0].progress.memberCount} cadastraram`
              : "Alguns grupos ainda precisam de cadastro ou convites"
          }
        >
          <p>
            Mande a mensagem pronta no WhatsApp ou lembre quem ainda não marcou
            figurinhas.
          </p>
          {groupsNeedingNudge.length === 1 &&
          groupsNeedingNudge[0].progress.memberCount < 2 ? (
            <WhatsAppShareButton
              message={buildInviteMessage(
                groupsNeedingNudge[0].group.name,
                groupsNeedingNudge[0].group.inviteCode,
              )}
              label={WHATSAPP_SHARE_LABEL}
              className="mt-4 w-full"
            />
          ) : (
            <ButtonLink href="/grupo" className="mt-4">
              Ver progresso do grupo
            </ButtonLink>
          )}
        </Callout>
      ) : null}

      {heroSnapshot ? (
        <GroupIntelligenceHero
          groupName={heroSnapshot.group.name}
          memberCount={heroSnapshot.intelligence.market.memberCount}
          powerStickers={heroSnapshot.intelligence.powerStickers}
          chaseStickers={heroSnapshot.intelligence.chaseStickers}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Repetidas"
          value={stats.duplicateCount}
          accent="yellow"
        />
        <StatCard label="Preciso" value={stats.needCount} accent="blue" />
        <StatCard
          label="Tipos repetidos"
          value={stats.duplicateTypes}
          accent="green"
        />
        <StatCard
          label="Sugestões de troca"
          value={bilateralMatchCount}
          accent="white"
        />
        {goldenCount > 0 ? (
          <StatCard label="Ouro do grupo" value={goldenCount} accent="yellow" />
        ) : null}
        {heroSnapshot && heroSnapshot.intelligence.hotCodes.length > 0 ? (
          <StatCard
            label="Quentes no grupo"
            value={heroSnapshot.intelligence.hotCodes.length}
            accent="yellow"
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <ButtonLink href="/onboarding" variant="ghost" fullWidth>
          Atualizar listas
        </ButtonLink>
        {hasLists ? (
          <WhatsAppShareButton
            message={buildProfileMessage(
              duplicates.map((d) => d.code),
              needs.slice(0, 30),
            )}
            className="w-full"
          />
        ) : null}
      </div>
    </div>
  );
}
