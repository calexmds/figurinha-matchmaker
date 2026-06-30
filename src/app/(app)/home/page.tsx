import { requireUser } from "@/lib/auth";
import { InstallPrompt } from "@/components/install-prompt";
import { NextStepHero } from "@/components/next-step-hero";
import { computeTradeMatches } from "@/lib/match";
import {
  buildGroupIntelligence,
  membersFromTradeData,
} from "@/lib/group-intelligence";
import { getUserTradeSummary } from "@/lib/data";
import { buildGroupProgress } from "@/lib/group-progress";
import { getCachedGroupTradeData } from "@/lib/group-trade-data";
import { getUserGroupsWithMembers } from "@/lib/groups";
import { buildInviteMessage } from "@/lib/whatsapp";

export default async function HomePage() {
  const { supabase, user, profile } = await requireUser();

  const [{ stats }, groups] = await Promise.all([
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
      return { group: g, progress, matches };
    }),
  );

  const validSnapshots = tradeSnapshots.filter(
    (s): s is NonNullable<typeof s> => !!s,
  );

  const bilateralMatchCount = validSnapshots.reduce(
    (sum, s) => sum + s.matches.length,
    0,
  );

  const topMatch =
    validSnapshots
      .flatMap((s) => s.matches)
      .sort((a, b) => b.score - a.score)[0] ?? null;

  const hasLists = stats.duplicateCount > 0 || stats.needCount > 0;

  const primaryGroup = groups[0] ?? null;
  const soloInGroup =
    primaryGroup !== null &&
    (validSnapshots.find((s) => s.group.id === primaryGroup.id)?.progress
      .memberCount ?? 1) < 2;

  const inviteShareMessage =
    primaryGroup &&
    buildInviteMessage(primaryGroup.name, primaryGroup.inviteCode);

  const step =
    groups.length === 0
      ? ("group" as const)
      : soloInGroup
        ? ("invite" as const)
        : !hasLists
          ? ("album" as const)
          : ("trade" as const);

  const userName = profile?.name?.split(" ")[0] ?? "colecionador";

  return (
    <div className="space-y-4">
      <InstallPrompt />

      <NextStepHero
        step={step}
        userName={userName}
        groupName={primaryGroup?.name}
        inviteMessage={inviteShareMessage || undefined}
        topMatch={bilateralMatchCount > 0 ? topMatch : null}
        matchCount={bilateralMatchCount}
      />
    </div>
  );
}
