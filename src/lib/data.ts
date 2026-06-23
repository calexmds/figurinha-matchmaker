import { computeTradeStats } from "@/lib/match";
import { buildGroupIntelligence } from "@/lib/group-intelligence";
import {
  countNeedsAvailableFromTradeData,
  getCachedGroupTradeData,
  type GroupTradeData,
} from "@/lib/group-trade-data";
import {
  deriveNeeds,
  deriveTradeDuplicates,
  ownedMapFromLegacy,
  ownedMapFromList,
} from "@/lib/stickers/collection";
import type { GroupIntelligence } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function extractCode(
  sticker: { code: string } | { code: string }[] | null,
): string | null {
  if (!sticker) return null;
  return Array.isArray(sticker) ? sticker[0]?.code ?? null : sticker.code;
}

export async function getUserOwned(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("user_stickers")
    .select("quantity, stickers(code)")
    .eq("user_id", userId)
    .gt("quantity", 0);

  return (data ?? [])
    .map((row) => ({
      code: extractCode(
        row.stickers as { code: string } | { code: string }[] | null,
      ),
      quantity: row.quantity,
    }))
    .filter((item): item is { code: string; quantity: number } => !!item.code);
}

/** @deprecated use getUserOwned */
export async function getUserDuplicates(
  supabase: SupabaseClient,
  userId: string,
) {
  const owned = await getUserOwned(supabase, userId);
  return deriveTradeDuplicates(ownedMapFromList(owned));
}

export async function getUserNeeds(supabase: SupabaseClient, userId: string) {
  const owned = await getUserOwned(supabase, userId);
  return deriveNeeds(ownedMapFromList(owned));
}

export async function getUserCollection(
  supabase: SupabaseClient,
  userId: string,
) {
  const [ownedRows, legacyNeedsRows] = await Promise.all([
    getUserOwned(supabase, userId),
    supabase.from("user_needs").select("stickers(code)").eq("user_id", userId),
  ]);

  const legacyNeeds = (legacyNeedsRows.data ?? [])
    .map((row) =>
      extractCode(row.stickers as { code: string } | { code: string }[] | null),
    )
    .filter((code): code is string => !!code);

  const ownedMap =
    legacyNeeds.length > 0
      ? ownedMapFromLegacy(ownedRows, legacyNeeds)
      : ownedMapFromList(ownedRows);

  return {
    owned: ownedMap,
    ownedList: Object.entries(ownedMap).map(([code, quantity]) => ({
      code,
      quantity,
    })),
    duplicates: deriveTradeDuplicates(ownedMap),
    needs: deriveNeeds(ownedMap),
  };
}

export async function getUserTradeSummary(
  supabase: SupabaseClient,
  userId: string,
) {
  const { ownedList, duplicates, needs } = await getUserCollection(
    supabase,
    userId,
  );

  return {
    owned: ownedList,
    duplicates,
    needs,
    stats: computeTradeStats(duplicates, needs),
  };
}

export async function getActiveGroup(
  supabase: SupabaseClient,
  userId: string,
  activeGroupId: string | null,
) {
  if (activeGroupId) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id, groups(id, name, invite_code, owner_id)")
      .eq("group_id", activeGroupId)
      .eq("user_id", userId)
      .maybeSingle();

    const group = membership?.groups as
      | { id: string; name: string; invite_code: string; owner_id: string }
      | { id: string; name: string; invite_code: string; owner_id: string }[]
      | null;

    const g = Array.isArray(group) ? group[0] : group;
    if (g) return g;
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name, invite_code, owner_id)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const group = membership?.groups as
    | { id: string; name: string; invite_code: string; owner_id: string }
    | { id: string; name: string; invite_code: string; owner_id: string }[]
    | null;

  const g = Array.isArray(group) ? group[0] : group;
  if (g) {
    await supabase
      .from("profiles")
      .update({ active_group_id: g.id })
      .eq("id", userId);
  }
  return g ?? null;
}

export async function countNeedsAvailableInGroup(
  supabase: SupabaseClient,
  groupId: string,
  userId: string,
  needs: string[],
) {
  if (needs.length === 0) return 0;
  const tradeData = await getCachedGroupTradeData(supabase, groupId, userId);
  if (!tradeData?.members.length) return 0;
  return countNeedsAvailableFromTradeData(tradeData, needs);
}

export async function getGroupTradeSnapshot(
  supabase: SupabaseClient,
  groupId: string,
  userId: string,
): Promise<GroupTradeData | null> {
  return getCachedGroupTradeData(supabase, groupId, userId);
}

export async function getGroupIntelligence(
  supabase: SupabaseClient,
  groupId: string,
  userId: string,
): Promise<GroupIntelligence | null> {
  const tradeData = await getCachedGroupTradeData(supabase, groupId, userId);
  if (!tradeData) return null;

  const snapshots = [
    {
      userId: tradeData.currentUserId,
      duplicates: tradeData.currentDuplicates,
      needs: tradeData.currentNeeds,
    },
    ...tradeData.members.map((m) => ({
      userId: m.userId,
      duplicates: m.duplicates,
      needs: m.needs,
    })),
  ];

  return buildGroupIntelligence(snapshots, userId);
}

// Backwards-compatible alias used during refactor cleanup.
export const getUserStickers = getUserDuplicates;
