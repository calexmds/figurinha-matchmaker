import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCollectionEntryMode,
  resolveOwnedForMember,
} from "@/lib/stickers/collection-mode";
import type { CollectionEntryMode } from "@/lib/types";

export type GroupTradeData = {
  currentUserId: string;
  currentDuplicates: Array<{ code: string; quantity: number }>;
  currentNeeds: string[];
  currentOwnedCount: number;
  currentHasRegistered: boolean;
  members: Array<{
    userId: string;
    name: string;
    avatarUrl: string | null;
    duplicates: Array<{ code: string; quantity: number }>;
    needs: string[];
    ownedCount: number;
    hasRegistered: boolean;
  }>;
  meta: {
    memberCount: number;
    membersWithDuplicates: number;
    membersWithNeeds: number;
    registeredMemberCount: number;
    collectiveUniqueOwned: number;
    source: "rpc" | "client";
  };
};

type SnapshotMember = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  owned?: Array<{ code: string; quantity: number }> | null;
  duplicates?: Array<{ code: string; quantity: number }> | null;
  needs?: string[] | null;
};

function parseOwned(raw: SnapshotMember["owned"]) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      code: String(item.code ?? "").toUpperCase(),
      quantity: Number(item.quantity) || 0,
    }))
    .filter((item) => item.code && item.quantity > 0);
}

function parseDuplicates(raw: SnapshotMember["duplicates"]) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      code: String(item.code ?? "").toUpperCase(),
      quantity: Number(item.quantity) || 0,
    }))
    .filter((item) => item.code && item.quantity > 0);
}

function parseNeeds(raw: SnapshotMember["needs"]) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((code) => String(code ?? "").toUpperCase())
    .filter(Boolean)
    .sort();
}

function tradeListsFromMember(
  m: SnapshotMember,
  entryMode: CollectionEntryMode = "have",
  explicitNeeds: string[] = [],
) {
  const ownedRows = parseOwned(m.owned);
  if (ownedRows.length > 0 || m.owned != null || entryMode === "sparse") {
    const resolved = resolveOwnedForMember(entryMode, ownedRows, explicitNeeds);
    return {
      duplicates: resolved.duplicates,
      needs: resolved.needs,
    };
  }

  return {
    duplicates: parseDuplicates(m.duplicates),
    needs: parseNeeds(m.needs),
  };
}

function countOwnedStickers(ownedRows: Array<{ code: string; quantity: number }>) {
  return ownedRows.filter((row) => row.quantity > 0).length;
}

function memberHasRegistered(
  ownedCount: number,
  duplicates: Array<{ code: string; quantity: number }>,
  needs: string[],
) {
  return ownedCount > 0 || duplicates.length > 0 || needs.length > 0;
}

function buildFromMembers(
  members: SnapshotMember[],
  currentUserId: string,
  source: "rpc" | "client",
  modesByUser: Map<string, CollectionEntryMode> = new Map(),
  needsByUser: Map<string, string[]> = new Map(),
): GroupTradeData {
  const collectiveOwned = new Set<string>();

  const parsed = members.map((m) => {
    const mode = modesByUser.get(m.user_id) ?? "have";
    const needs = needsByUser.get(m.user_id) ?? [];
    const ownedRows = parseOwned(m.owned);
    for (const row of ownedRows) {
      if (row.quantity > 0) collectiveOwned.add(row.code);
    }
    const lists = tradeListsFromMember(m, mode, needs);
    const ownedCount = countOwnedStickers(ownedRows);
    const hasRegistered = memberHasRegistered(
      ownedCount,
      lists.duplicates,
      lists.needs,
    );
    return {
      userId: m.user_id,
      name: m.name ?? "Colecionador",
      avatarUrl: m.avatar_url ?? null,
      duplicates: lists.duplicates,
      needs: lists.needs,
      ownedCount,
      hasRegistered,
    };
  });

  const current = parsed.find((m) => m.userId === currentUserId);
  const others = parsed.filter((m) => m.userId !== currentUserId);

  return {
    currentUserId,
    currentDuplicates: current?.duplicates ?? [],
    currentNeeds: current?.needs ?? [],
    currentOwnedCount: current?.ownedCount ?? 0,
    currentHasRegistered: current?.hasRegistered ?? false,
    members: others,
    meta: {
      memberCount: parsed.length,
      membersWithDuplicates: parsed.filter((m) => m.duplicates.length > 0)
        .length,
      membersWithNeeds: parsed.filter((m) => m.needs.length > 0).length,
      registeredMemberCount: parsed.filter((m) => m.hasRegistered).length,
      collectiveUniqueOwned: collectiveOwned.size,
      source,
    },
  };
}

function extractCode(
  sticker: { code: string } | { code: string }[] | null,
): string | null {
  if (!sticker) return null;
  return Array.isArray(sticker) ? (sticker[0]?.code ?? null) : sticker.code;
}

async function fetchMemberCollectionMeta(
  supabase: SupabaseClient,
  userIds: string[],
) {
  const modesByUser = new Map<string, CollectionEntryMode>();
  const needsByUser = new Map<string, string[]>();

  if (userIds.length === 0) {
    return { modesByUser, needsByUser };
  }

  const [{ data: profiles }, { data: needsRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, collection_entry_mode")
      .in("id", userIds),
    supabase
      .from("user_needs")
      .select("user_id, stickers(code)")
      .in("user_id", userIds),
  ]);

  for (const row of profiles ?? []) {
    const mode = row.collection_entry_mode as CollectionEntryMode | undefined;
    modesByUser.set(row.id, mode === "sparse" ? "sparse" : "have");
  }

  for (const row of needsRows ?? []) {
    const code = extractCode(
      row.stickers as { code: string } | { code: string }[] | null,
    );
    if (!code) continue;
    const list = needsByUser.get(row.user_id) ?? [];
    list.push(code.toUpperCase());
    needsByUser.set(row.user_id, list);
  }

  return { modesByUser, needsByUser };
}

async function fetchGroupTradeDataViaRpc(
  supabase: SupabaseClient,
  groupId: string,
  currentUserId: string,
): Promise<GroupTradeData | null> {
  const { data, error } = await supabase.rpc("get_group_trade_snapshot", {
    p_group_id: groupId,
  });

  if (error) {
    console.error("[group-trade-data] rpc error", error.message);
    return null;
  }

  const payload = data as { members?: SnapshotMember[] } | SnapshotMember[] | null;
  const members = Array.isArray(payload)
    ? payload
    : (payload?.members ?? []);

  if (!Array.isArray(members)) return null;

  const userIds = members.map((m) => m.user_id);
  const { modesByUser, needsByUser } = await fetchMemberCollectionMeta(
    supabase,
    userIds,
  );

  return buildFromMembers(
    members,
    currentUserId,
    "rpc",
    modesByUser,
    needsByUser,
  );
}

async function fetchGroupTradeDataViaClient(
  supabase: SupabaseClient,
  groupId: string,
  currentUserId: string,
): Promise<GroupTradeData | null> {
  const { data: memberRows, error: membersError } = await supabase
    .from("group_members")
    .select("user_id, profiles(id, name, avatar_url)")
    .eq("group_id", groupId);

  if (membersError || !memberRows?.length) {
    console.error("[group-trade-data] members error", membersError?.message);
    return null;
  }

  const userIds = memberRows.map((m) => m.user_id);

  const { data: allUserStickers, error: stickersError } = await supabase
    .from("user_stickers")
    .select("user_id, quantity, stickers(code)")
    .in("user_id", userIds)
    .gt("quantity", 0);

  if (stickersError) {
    console.error("[group-trade-data] stickers error", stickersError.message);
  }

  const ownedByUser = new Map<
    string,
    Array<{ code: string; quantity: number }>
  >();

  for (const row of allUserStickers ?? []) {
    const code = extractCode(
      row.stickers as { code: string } | { code: string }[] | null,
    );
    if (!code) continue;
    const list = ownedByUser.get(row.user_id) ?? [];
    list.push({ code: code.toUpperCase(), quantity: row.quantity });
    ownedByUser.set(row.user_id, list);
  }

  const members: SnapshotMember[] = memberRows.map((m) => {
    const profile = m.profiles as
      | { id: string; name: string | null; avatar_url: string | null }
      | { id: string; name: string | null; avatar_url: string | null }[]
      | null;
    const p = Array.isArray(profile) ? profile[0] : profile;
    return {
      user_id: m.user_id,
      name: p?.name ?? "Colecionador",
      avatar_url: p?.avatar_url ?? null,
      owned: ownedByUser.get(m.user_id) ?? [],
    };
  });

  const { modesByUser, needsByUser } = await fetchMemberCollectionMeta(
    supabase,
    userIds,
  );

  return buildFromMembers(
    members,
    currentUserId,
    "client",
    modesByUser,
    needsByUser,
  );
}

export async function fetchGroupTradeData(
  supabase: SupabaseClient,
  groupId: string,
  currentUserId: string,
): Promise<GroupTradeData | null> {
  const viaRpc = await fetchGroupTradeDataViaRpc(
    supabase,
    groupId,
    currentUserId,
  );
  if (viaRpc) return viaRpc;

  return fetchGroupTradeDataViaClient(supabase, groupId, currentUserId);
}

/** Dedupes RPC dentro do mesmo request (ex.: home + intelligence). */
export const getCachedGroupTradeData = cache(fetchGroupTradeData);

export function countNeedsAvailableFromTradeData(
  tradeData: GroupTradeData,
  needs: string[],
) {
  if (needs.length === 0) return 0;
  const duplicateCodes = new Set(
    tradeData.members.flatMap((m) => m.duplicates.map((d) => d.code)),
  );
  return needs.filter((code) => duplicateCodes.has(code.toUpperCase())).length;
}

export function summarizeTradeDiagnostics(
  tradeData: GroupTradeData,
  matchesCount: number,
  groupName = "Grupo",
) {
  const { meta, members, currentDuplicates, currentNeeds } = tradeData;
  const pendingNames = [
    ...(tradeData.currentHasRegistered
      ? []
      : [{ name: "você", isSelf: true }]),
    ...members
      .filter((m) => !m.hasRegistered)
      .map((m) => ({ name: m.name, isSelf: false })),
  ];

  if (matchesCount > 0) return null;

  if (meta.memberCount < 2) {
    return {
      title: `${groupName}: só você por enquanto`,
      detail:
        "Convide família ou amigos pelo link do WhatsApp em Grupo. O match precisa de 2 ou mais pessoas.",
    };
  }

  if (meta.registeredMemberCount < meta.memberCount) {
    const pendingLabel =
      pendingNames.length === 1
        ? pendingNames[0].isSelf
          ? "Você ainda não cadastrou"
          : `${pendingNames[0].name} ainda não cadastrou`
        : `${pendingNames.length} pessoas ainda não cadastraram`;
    return {
      title: `${groupName}: ${meta.registeredMemberCount} de ${meta.memberCount} já cadastraram`,
      detail: `${pendingLabel} figurinhas em Figurinhas (aba Tenho ou Preciso/Repetidas). Use "Lembrar no WhatsApp" em Grupo para avisar.`,
    };
  }

  if (currentDuplicates.length === 0 && currentNeeds.length === 0) {
    return {
      title: "Suas listas estão vazias",
      detail: "Marque o que você tem em Figurinhas (aba Tenho) para calcular trocas.",
    };
  }

  const visibleDupCodes = new Set(
    members.flatMap((m) => m.duplicates.map((d) => d.code)),
  );
  const visibleNeedCodes = new Set(members.flatMap((m) => m.needs));
  const yourNeedsTheyHave = currentNeeds.filter((c) => visibleDupCodes.has(c));
  const yourDupsTheyNeed = currentDuplicates
    .map((d) => d.code)
    .filter((c) => visibleNeedCodes.has(c));

  if (yourNeedsTheyHave.length === 0 && yourDupsTheyNeed.length === 0) {
    return {
      title: `${groupName}: listas ok, sem cruzamento`,
      detail:
        "Todos cadastraram, mas nenhuma figurinha que você precisa bate com repetida de alguém (e vice-versa). Confiram se usaram os mesmos códigos (ex.: BRA01).",
    };
  }

  return {
    title: `${groupName}: cruzamento detectado, match não montou`,
    detail:
      "Há figurinhas compatíveis — recarregue a página. Se persistir, confira se a migration 004_group_trade_snapshot.sql foi aplicada no Supabase.",
  };
}

export function summarizeAllGroupDiagnostics(
  groups: Array<{ id: string; name: string }>,
  matchesByGroup: Map<string, number>,
  tradeDataByGroup: Map<string, GroupTradeData | null>,
) {
  const items: Array<{ groupName: string; title: string; detail: string }> = [];

  for (const group of groups) {
    const matchCount = matchesByGroup.get(group.id) ?? 0;
    if (matchCount > 0) continue;
    const tradeData = tradeDataByGroup.get(group.id);
    if (!tradeData) continue;
    const diag = summarizeTradeDiagnostics(tradeData, matchCount, group.name);
    if (diag) items.push({ groupName: group.name, ...diag });
  }

  return items;
}
