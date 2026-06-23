import type { SupabaseClient } from "@supabase/supabase-js";

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
  duplicates: Array<{ code: string; quantity: number }> | null;
  needs: string[] | null;
};

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

function buildFromMembers(
  members: SnapshotMember[],
  currentUserId: string,
  source: "rpc" | "client",
): GroupTradeData {
  const parsed = members.map((m) => ({
    userId: m.user_id,
    name: m.name ?? "Colecionador",
    avatarUrl: m.avatar_url ?? null,
    duplicates: parseDuplicates(m.duplicates),
    needs: parseNeeds(m.needs),
  }));

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

  const { data: allUserNeeds, error: needsError } = await supabase
    .from("user_needs")
    .select("user_id, stickers(code)")
    .in("user_id", userIds);

  if (stickersError) {
    console.error("[group-trade-data] stickers error", stickersError.message);
  }
  if (needsError) {
    console.error("[group-trade-data] needs error", needsError.message);
  }

  const duplicatesByUser = new Map<
    string,
    Array<{ code: string; quantity: number }>
  >();
  const needsByUser = new Map<string, string[]>();

  for (const row of allUserStickers ?? []) {
    const code = extractCode(
      row.stickers as { code: string } | { code: string }[] | null,
    );
    if (!code) continue;
    const list = duplicatesByUser.get(row.user_id) ?? [];
    list.push({ code: code.toUpperCase(), quantity: row.quantity });
    duplicatesByUser.set(row.user_id, list);
  }

  for (const row of allUserNeeds ?? []) {
    const code = extractCode(
      row.stickers as { code: string } | { code: string }[] | null,
    );
    if (!code) continue;
    const list = needsByUser.get(row.user_id) ?? [];
    list.push(code.toUpperCase());
    needsByUser.set(row.user_id, list);
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
      duplicates: duplicatesByUser.get(m.user_id) ?? [],
      needs: needsByUser.get(m.user_id) ?? [],
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
        "Ele precisa marcar repetidas e preciso em Figurinhas. Peça para abrir o app, ir em Figurinhas e salvar.",
    };
  }

  if (currentDuplicates.length === 0 && currentNeeds.length === 0) {
    return {
      title: "Suas listas estão vazias",
      detail: "Marque suas repetidas e o que precisa em Figurinhas para calcular trocas.",
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
