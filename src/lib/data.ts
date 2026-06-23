import { computeTradeStats } from "@/lib/match";
import {
  buildGroupIntelligence,
} from "@/lib/group-intelligence";
import { fetchGroupTradeData } from "@/lib/group-trade-data";
import type { GroupIntelligence } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function extractCode(
  sticker: { code: string } | { code: string }[] | null,
): string | null {
  if (!sticker) return null;
  return Array.isArray(sticker) ? sticker[0]?.code ?? null : sticker.code;
}

export async function getUserDuplicates(
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

export async function getUserNeeds(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("user_needs")
    .select("stickers(code)")
    .eq("user_id", userId);

  return (data ?? [])
    .map((row) =>
      extractCode(row.stickers as { code: string } | { code: string }[] | null),
    )
    .filter((code): code is string => !!code)
    .sort();
}

export async function getUserTradeSummary(
  supabase: SupabaseClient,
  userId: string,
) {
  const duplicates = await getUserDuplicates(supabase, userId);
  const needs = await getUserNeeds(supabase, userId);

  return {
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

  const tradeData = await fetchGroupTradeData(supabase, groupId, userId);
  if (!tradeData?.members.length) return 0;

  const duplicateCodes = new Set(
    tradeData.members.flatMap((m) => m.duplicates.map((d) => d.code)),
  );

  return needs.filter((code) => duplicateCodes.has(code.toUpperCase())).length;
}

export async function getGroupIntelligence(
  supabase: SupabaseClient,
  groupId: string,
  userId: string,
): Promise<GroupIntelligence | null> {
  const tradeData = await fetchGroupTradeData(supabase, groupId, userId);
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
