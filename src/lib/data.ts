import { TOTAL_STICKERS } from "@/lib/constants";
import { computeCollectionStats } from "@/lib/match";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getUserStickers(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("user_stickers")
    .select("quantity, stickers(code)")
    .eq("user_id", userId)
    .gt("quantity", 0);

  return (data ?? []).map((row) => {
    const sticker = row.stickers as { code: string } | { code: string }[] | null;
    const code = Array.isArray(sticker) ? sticker[0]?.code : sticker?.code;
    return { code: code ?? "", quantity: row.quantity };
  }).filter((item) => item.code);
}

export async function getUserCollectionStats(
  supabase: SupabaseClient,
  userId: string,
) {
  const stickers = await getUserStickers(supabase, userId);
  return {
    stickers,
    stats: computeCollectionStats(stickers, TOTAL_STICKERS),
  };
}

export async function getActiveGroup(
  supabase: SupabaseClient,
  userId: string,
  activeGroupId: string | null,
) {
  if (activeGroupId) {
    const { data } = await supabase
      .from("groups")
      .select("id, name, invite_code, owner_id")
      .eq("id", activeGroupId)
      .maybeSingle();
    if (data) return data;
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name, invite_code, owner_id)")
    .eq("user_id", userId)
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

export async function getDuplicateAndMissingCodes(
  supabase: SupabaseClient,
  userId: string,
) {
  const stickers = await getUserStickers(supabase, userId);
  const owned = new Set<string>();
  const duplicates: string[] = [];
  const missing: string[] = [];

  for (const sticker of stickers) {
    owned.add(sticker.code);
    if (sticker.quantity > 1) {
      for (let i = 0; i < sticker.quantity - 1; i++) {
        duplicates.push(sticker.code);
      }
    }
  }

  const { data: allCodes } = await supabase
    .from("stickers")
    .select("code")
    .order("sort_order");

  for (const row of allCodes ?? []) {
    if (!owned.has(row.code)) {
      missing.push(row.code);
    }
  }

  return { duplicates, missing };
}
