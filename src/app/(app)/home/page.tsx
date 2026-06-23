import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { InstallPrompt } from "@/components/install-prompt";
import { StatCard } from "@/components/stat-card";
import { GroupIntelligenceHero } from "@/components/group-intelligence-hero";
import { WhatsAppShareButton } from "@/components/whatsapp-share";
import { buildProfileMessage } from "@/lib/whatsapp";
import {
  buildGroupIntelligence,
  membersFromTradeData,
} from "@/lib/group-intelligence";
import { getUserTradeSummary } from "@/lib/data";
import {
  countNeedsAvailableFromTradeData,
  getCachedGroupTradeData,
} from "@/lib/group-trade-data";
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
      return { group: g, tradeData, intelligence };
    }),
  );

  const validSnapshots = tradeSnapshots.filter(
    (s): s is NonNullable<typeof s> => !!s,
  );

  const availableInGroups = validSnapshots.reduce((sum, s) => {
    if (needs.length === 0) return sum;
    return sum + countNeedsAvailableFromTradeData(s.tradeData, needs);
  }, 0);

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

  return (
    <div className="space-y-6">
      <InstallPrompt />

      <div>
        <p className="text-sm text-[#5f5f5f]">
          Olá, {profile?.name ?? "colecionador"}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[#1b1b1b]">
          {goldenCount > 0
            ? "Você tem figurinhas de ouro!"
            : hasLists
              ? "Pronto para trocar"
              : "Cadastre suas listas"}
        </h2>
        {groups.length > 0 ? (
          <p className="mt-2 text-sm text-[#5f5f5f]">
            {groups.length === 1 ? "Grupo" : "Grupos"}:{" "}
            <strong className="text-[#1b1b1b]">{groupLabel}</strong>
            {totalMembers > 1 ? (
              <> · {totalMembers} colecionadores no radar</>
            ) : null}
          </p>
        ) : (
          <p className="mt-2 text-sm text-[#9a6700]">
            Você ainda não entrou em um grupo.{" "}
            <Link href="/grupo" className="font-semibold underline">
              Crie ou entre agora
            </Link>
          </p>
        )}
      </div>

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
          label="Nos grupos p/ você"
          value={availableInGroups}
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

      {!hasLists ? (
        <div className="rounded-lg border border-[#ecdfc0] bg-[#fbf6ea] p-5">
          <p className="text-sm text-[#1b1b1b]">
            Comece marcando suas repetidas e o que precisa — leva poucos minutos.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[#0067c0] px-4 py-3 text-sm font-semibold text-white active:bg-[#005aa8]"
          >
            Cadastrar agora
          </Link>
        </div>
      ) : null}

      {groups.length > 0 && needs.length > 0 && availableInGroups > 0 ? (
        <div className="rounded-lg border border-[#cfe9cf] bg-[#eef7ee] p-5">
          <p className="text-sm font-semibold text-[#0f7b0f]">Nos seus grupos</p>
          <p className="mt-2 text-2xl font-bold text-[#1b1b1b]">
            {availableInGroups} das que você precisa estão com alguém
          </p>
          <Link
            href="/trocas"
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[#0f7b0f] px-4 py-3 text-sm font-semibold text-white active:bg-[#0c640c]"
          >
            Ver sugestões de troca
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <Link
          href="/onboarding"
          className="inline-flex min-h-12 items-center justify-center rounded-md border border-[#d0d0d0] bg-white px-4 py-3 text-sm font-semibold text-[#1b1b1b] active:bg-[#f0f0f0]"
        >
          Atualizar listas
        </Link>
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
