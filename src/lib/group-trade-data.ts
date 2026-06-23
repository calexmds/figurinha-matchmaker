import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deriveNeeds,
  deriveTradeDuplicates,
  ownedMapFromList,
} from "@/lib/stickers/collection";

export type GroupTradeData = {
  currentUserId: string;
  currentDuplicates: Array<{ code: string; quantity: number }>;
  currentNeeds: string[];
  members: Array<{
    userId: string;
    name: string;
    avatarUrl: string | null;
    duplicates: Array<{ code: string; quantity: number }>;
    needs: string[];
  }>;
  meta: {
    memberCount: number;
    membersWithDuplicates: number;
    membersWithNeeds: number;
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

function tradeListsFromMember(m: SnapshotMember) {
  const ownedRows = parseOwned(m.owned);
  if (ownedRows.length > 0 || m.owned != null) {
    const ownedMap = ownedMapFromList(ownedRows);
    return {
      duplicates: deriveTradeDuplicates(ownedMap),
      needs: deriveNeeds(ownedMap),
    };
  }

  return {
    duplicates: parseDuplicates(m.duplicates),
    needs: parseNeeds(m.needs),
  };
}

function buildFromMembers(
  members: SnapshotMember[],
  currentUserId: string,
  source: "rpc" | "client",
): GroupTradeData {
  const parsed = members.map((m) => {
    const lists = tradeListsFromMember(m);
    return {
      userId: m.user_id,
      name: m.name ?? "Colecionador",
      avatarUrl: m.avatar_url ?? null,
      duplicates: lists.duplicates,
      needs: lists.needs,
    };
  });

  const current = parsed.find((m) => m.userId === currentUserId);
  const others = parsed.filter((m) => m.userId !== currentUserId);

  return {
    currentUserId,
    currentDuplicates: current?.duplicates ?? [],
    currentNeeds: current?.needs ?? [],
    members: others,
    meta: {
      memberCount: parsed.length,
      membersWithDuplicates: parsed.filter((m) => m.duplicates.length > 0)
        .length,
      membersWithNeeds: parsed.filter((m) => m.needs.length > 0).length,
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

  return buildFromMembers(members, currentUserId, "rpc");
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

  return buildFromMembers(members, currentUserId, "client");
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
) {
  const { meta, members, currentDuplicates, currentNeeds } = tradeData;
  const partnersWithLists = members.filter(
    (m) => m.duplicates.length > 0 || m.needs.length > 0,
  ).length;

  if (matchesCount > 0) return null;

  if (meta.memberCount < 2) {
    return {
      title: "Só você neste grupo ainda",
      detail:
        "Convide seu irmão pelo link do WhatsApp em Grupo. O match só funciona com 2 ou mais pessoas no mesmo grupo.",
    };
  }

  if (partnersWithLists === 0) {
    return {
      title: "Seu irmão ainda não cadastrou listas",
      detail:
        "Ele precisa marcar o que tem em Figurinhas (aba Tenho). Peça para abrir o app e salvar.",
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
      title: "Listas visíveis, mas sem cruzamento",
      detail:
        "Vocês estão no mesmo grupo com listas salvas, porém nenhuma figurinha que você precisa bate com repetida dele (e vice-versa). Confiram se marcaram os mesmos códigos (ex.: BRA01, não só o número).",
    };
  }

  return {
    title: "Cruzamento detectado, mas match não montou",
    detail:
      "Há figurinhas compatíveis — recarregue a página. Se persistir, rode a migration 004_group_trade_snapshot.sql no Supabase.",
  };
}
