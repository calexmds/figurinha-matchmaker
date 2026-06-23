import type { SupabaseClient } from "@supabase/supabase-js";
import { computeTradeMatches } from "@/lib/match";
import {
  buildGroupIntelligence,
  membersFromTradeData,
  type GroupMarket,
} from "@/lib/group-intelligence";
import { getCachedGroupTradeData } from "@/lib/group-trade-data";
import { getUserGroupIds } from "@/lib/groups";
import {
  applyReservationsToLists,
  getAllPendingTrades,
  getUserReservations,
  type PendingTrade,
} from "@/lib/trades";
import type { TradeMatch } from "@/lib/types";

export type TaggedTradeMatch = TradeMatch & {
  groupId: string;
  groupName: string;
  market?: GroupMarket;
};

export type AllGroupsTradeResult = {
  matches: TaggedTradeMatch[];
  pendingTrades: PendingTrade[];
  pendingPartnerKeys: Set<string>;
  groupCount: number;
  totalMembers: number;
  groupsWithMatches: number;
};

function pendingKey(groupId: string, partnerId: string) {
  return `${groupId}:${partnerId}`;
}

export async function computeAllGroupMatches(
  supabase: SupabaseClient,
  userId: string,
): Promise<AllGroupsTradeResult> {
  const groups = await getUserGroupIds(supabase, userId);

  if (groups.length === 0) {
    return {
      matches: [],
      pendingTrades: [],
      pendingPartnerKeys: new Set(),
      groupCount: 0,
      totalMembers: 0,
      groupsWithMatches: 0,
    };
  }

  const [reservations, pendingTrades] = await Promise.all([
    getUserReservations(supabase, userId),
    getAllPendingTrades(supabase, userId),
  ]);

  const pendingPartnerKeys = new Set(
    pendingTrades.map((t) => pendingKey(t.groupId, t.partnerId)),
  );

  const snapshots = await Promise.all(
    groups.map(async (group) => {
      const tradeData = await getCachedGroupTradeData(
        supabase,
        group.id,
        userId,
      );
      if (!tradeData) return null;

      const intelligence = buildGroupIntelligence(
        membersFromTradeData(tradeData),
        tradeData.currentUserId,
      );

      const { availableDuplicates, availableNeeds } = applyReservationsToLists(
        tradeData.currentDuplicates,
        tradeData.currentNeeds,
        reservations,
      );

      const groupMatches = computeTradeMatches(
        tradeData.currentUserId,
        availableDuplicates,
        availableNeeds,
        tradeData.members,
        intelligence.market,
      );

      return {
        groupId: group.id,
        groupName: group.name,
        memberCount: tradeData.meta.memberCount,
        market: intelligence.market,
        matches: groupMatches.map((m) => ({
          ...m,
          groupId: group.id,
          groupName: group.name,
          market: intelligence.market,
        })),
      };
    }),
  );

  const valid = snapshots.filter((s): s is NonNullable<typeof s> => !!s);
  const matches = valid
    .flatMap((s) => s.matches)
    .sort((a, b) => b.score - a.score || (b.heatScore ?? 0) - (a.heatScore ?? 0));

  const totalMembers = valid.reduce((sum, s) => sum + s.memberCount, 0);
  const groupsWithMatches = new Set(matches.map((m) => m.groupId)).size;

  return {
    matches,
    pendingTrades,
    pendingPartnerKeys,
    groupCount: groups.length,
    totalMembers,
    groupsWithMatches,
  };
}
