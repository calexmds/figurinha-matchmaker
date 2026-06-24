import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getUserCollection } from "@/lib/data";
import {
  tradeableQuantity,
  userNeedsCode,
} from "@/lib/stickers/collection";

export type TradeStatus =
  | "proposed"
  | "active"
  | "completed"
  | "cancelled";

export type TradeRole = "initiator" | "partner";

export type PendingTrade = {
  id: string;
  groupId: string;
  groupName: string;
  partnerId: string;
  partnerName: string;
  give: string[];
  receive: string[];
  status: "proposed" | "active";
  role: TradeRole;
  createdAt: string;
  myConfirmed: boolean;
  partnerConfirmed: boolean;
};

export type TradeReservations = {
  give: Map<string, number>;
  receive: Set<string>;
};

const OPEN_STATUSES = ["proposed", "active"] as const;

function extractCode(
  sticker: { code: string } | { code: string }[] | null,
): string | null {
  if (!sticker) return null;
  return Array.isArray(sticker) ? (sticker[0]?.code ?? null) : sticker.code;
}

function revalidateTradePaths() {
  revalidatePath("/trocas");
  revalidatePath("/home");
  revalidatePath("/onboarding");
}

async function fetchOwnedMap(supabase: SupabaseClient, userId: string) {
  const { owned } = await getUserCollection(supabase, userId);
  return owned;
}

async function validateUserTradeInventory(
  supabase: SupabaseClient,
  userId: string,
  giveCodes: string[],
  receiveCodes: string[],
  reservations: TradeReservations,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ownedMap = await fetchOwnedMap(supabase, userId);

  const giveCount = new Map<string, number>();
  for (const code of giveCodes) {
    const upper = code.toUpperCase();
    giveCount.set(upper, (giveCount.get(upper) ?? 0) + 1);
  }
  for (const [code, needed] of giveCount) {
    const total = ownedMap[code] ?? 0;
    const reserved = reservations.give.get(code) ?? 0;
    if (tradeableQuantity(total, reserved) < needed) {
      return {
        ok: false,
        error: `Não há repetida disponível para ${code}.`,
      };
    }
  }

  for (const code of receiveCodes) {
    const upper = code.toUpperCase();
    if (!userNeedsCode(ownedMap, upper)) {
      return {
        ok: false,
        error: `${code} não está na lista de preciso.`,
      };
    }
    if (reservations.receive.has(upper)) {
      return {
        ok: false,
        error: `${code} já está reservada em outra troca.`,
      };
    }
  }

  return { ok: true };
}

function accumulateItems(
  items: Array<{
    trade_id: string;
    side: string;
    stickers: { code: string } | { code: string }[] | null;
  }>,
) {
  const itemsByTrade = new Map<string, { give: string[]; receive: string[] }>();
  for (const item of items) {
    if (!itemsByTrade.has(item.trade_id)) {
      itemsByTrade.set(item.trade_id, { give: [], receive: [] });
    }
    const bucket = itemsByTrade.get(item.trade_id)!;
    const code = extractCode(item.stickers);
    if (!code) continue;
    if (item.side === "give") bucket.give.push(code);
    else bucket.receive.push(code);
  }
  return itemsByTrade;
}

function mapTradeRow(
  trade: {
    id: string;
    user_id: string;
    partner_id: string;
    group_id: string;
    status: string;
    created_at: string;
    initiator_confirmed_at?: string | null;
    partner_confirmed_at?: string | null;
    groups?: { name: string } | { name: string }[] | null;
  },
  items: { give: string[]; receive: string[] },
  userId: string,
  nameById: Map<string, string>,
): PendingTrade | null {
  if (trade.status !== "proposed" && trade.status !== "active") return null;

  const isInitiator = trade.user_id === userId;
  const partnerId = isInitiator ? trade.partner_id : trade.user_id;
  const g = trade.groups;
  const groupName = Array.isArray(g)
    ? (g[0]?.name ?? "Grupo")
    : (g?.name ?? "Grupo");

  const initiatorConfirmed = !!trade.initiator_confirmed_at;
  const partnerConfirmed = !!trade.partner_confirmed_at;

  return {
    id: trade.id,
    groupId: trade.group_id,
    groupName,
    partnerId,
    partnerName: nameById.get(partnerId) ?? "Colecionador",
    give: (isInitiator ? items.give : items.receive).sort(),
    receive: (isInitiator ? items.receive : items.give).sort(),
    status: trade.status as "proposed" | "active",
    role: isInitiator ? "initiator" : "partner",
    createdAt: trade.created_at,
    myConfirmed: isInitiator ? initiatorConfirmed : partnerConfirmed,
    partnerConfirmed: isInitiator ? partnerConfirmed : initiatorConfirmed,
  };
}

export async function getUserReservations(
  supabase: SupabaseClient,
  userId: string,
  exceptTradeId?: string,
): Promise<TradeReservations> {
  const { data: trades } = await supabase
    .from("trades")
    .select("id, user_id, partner_id, status")
    .in("status", [...OPEN_STATUSES])
    .or(`user_id.eq.${userId},partner_id.eq.${userId}`);

  const give = new Map<string, number>();
  const receive = new Set<string>();

  const openTrades = (trades ?? []).filter((t) => t.id !== exceptTradeId);
  if (!openTrades.length) return { give, receive };

  const tradeIds = openTrades.map((t) => t.id);
  const { data: items } = await supabase
    .from("trade_items")
    .select("trade_id, side, quantity, stickers(code)")
    .in("trade_id", tradeIds);

  const roleByTrade = new Map(
    openTrades.map((t) => [
      t.id,
      {
        isInitiator: t.user_id === userId,
        status: t.status as string,
      },
    ]),
  );

  for (const item of items ?? []) {
    const meta = roleByTrade.get(item.trade_id);
    if (!meta) continue;

    const countsForUser =
      meta.status === "active" ||
      (meta.status === "proposed" && meta.isInitiator);

    if (!countsForUser) continue;

    const code = extractCode(
      item.stickers as { code: string } | { code: string }[] | null,
    );
    if (!code) continue;

    const side =
      meta.isInitiator === (item.side === "give") ? "give" : "receive";

    if (side === "give") {
      give.set(code, (give.get(code) ?? 0) + item.quantity);
    } else {
      receive.add(code);
    }
  }

  return { give, receive };
}

export function applyReservationsToLists(
  duplicates: Array<{ code: string; quantity: number }>,
  needs: string[],
  reservations: TradeReservations,
) {
  const availableDuplicates = duplicates
    .map((item) => {
      const reserved = reservations.give.get(item.code) ?? 0;
      const qty = Math.max(0, item.quantity - reserved);
      return qty > 0 ? { code: item.code, quantity: qty } : null;
    })
    .filter((item): item is { code: string; quantity: number } => item !== null);

  const availableNeeds = needs.filter((code) => !reservations.receive.has(code));

  return { availableDuplicates, availableNeeds };
}

export async function getAllPendingTrades(
  supabase: SupabaseClient,
  userId: string,
): Promise<PendingTrade[]> {
  const { data: trades } = await supabase
    .from("trades")
    .select(
      "id, user_id, partner_id, group_id, status, created_at, initiator_confirmed_at, partner_confirmed_at, groups(name)",
    )
    .in("status", [...OPEN_STATUSES])
    .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (!trades?.length) return [];

  const profileIds = new Set<string>();
  for (const t of trades) {
    profileIds.add(t.user_id);
    profileIds.add(t.partner_id);
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", [...profileIds]);

  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.name ?? "Colecionador"]),
  );

  const tradeIds = trades.map((t) => t.id);
  const { data: items } = await supabase
    .from("trade_items")
    .select("trade_id, side, stickers(code)")
    .in("trade_id", tradeIds);

  const itemsByTrade = accumulateItems(items ?? []);

  return trades
    .map((trade) =>
      mapTradeRow(
        trade,
        itemsByTrade.get(trade.id) ?? { give: [], receive: [] },
        userId,
        nameById,
      ),
    )
    .filter((t): t is PendingTrade => !!t);
}

async function resolveStickerIds(
  supabase: SupabaseClient,
  codes: string[],
): Promise<Map<string, string>> {
  if (codes.length === 0) return new Map();
  const { data } = await supabase
    .from("stickers")
    .select("id, code")
    .in("code", codes);
  return new Map((data ?? []).map((row) => [row.code, row.id]));
}

async function applyCollectionChanges(
  supabase: SupabaseClient,
  userId: string,
  giveCodes: string[],
  receiveCodes: string[],
) {
  const giveCount = new Map<string, number>();
  for (const code of giveCodes) {
    const upper = code.toUpperCase();
    giveCount.set(upper, (giveCount.get(upper) ?? 0) + 1);
  }

  const allCodes = [...new Set([...giveCodes, ...receiveCodes])].map((c) =>
    c.toUpperCase(),
  );
  const codeToId = await resolveStickerIds(supabase, allCodes);

  for (const [code, qty] of giveCount) {
    const stickerId = codeToId.get(code);
    if (!stickerId) continue;

    const { data: row } = await supabase
      .from("user_stickers")
      .select("quantity")
      .eq("user_id", userId)
      .eq("sticker_id", stickerId)
      .maybeSingle();

    const nextQty = Math.max(0, (row?.quantity ?? 0) - qty);
    if (nextQty === 0) {
      await supabase
        .from("user_stickers")
        .delete()
        .eq("user_id", userId)
        .eq("sticker_id", stickerId);
    } else {
      await supabase
        .from("user_stickers")
        .update({
          quantity: nextQty,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("sticker_id", stickerId);
    }
  }

  for (const code of receiveCodes) {
    const upper = code.toUpperCase();
    const stickerId = codeToId.get(upper);
    if (!stickerId) continue;

    const { data: row } = await supabase
      .from("user_stickers")
      .select("quantity")
      .eq("user_id", userId)
      .eq("sticker_id", stickerId)
      .maybeSingle();

    const nextQty = (row?.quantity ?? 0) + 1;
    await supabase.from("user_stickers").upsert(
      {
        user_id: userId,
        sticker_id: stickerId,
        quantity: nextQty,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,sticker_id" },
    );

    await supabase
      .from("user_needs")
      .delete()
      .eq("user_id", userId)
      .eq("sticker_id", stickerId);
  }
}

export async function createPendingTrade(
  supabase: SupabaseClient,
  userId: string,
  groupId: string,
  partnerId: string,
  giveCodes: string[],
  receiveCodes: string[],
): Promise<{ ok: true; tradeId: string } | { ok: false; error: string }> {
  if (partnerId === userId) {
    return { ok: false, error: "Parceiro inválido." };
  }
  if (giveCodes.length === 0 && receiveCodes.length === 0) {
    return { ok: false, error: "Nada para combinar nesta troca." };
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return { ok: false, error: "Você não faz parte deste grupo." };
  }

  const { data: partnerMember } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", partnerId)
    .maybeSingle();

  if (!partnerMember) {
    return { ok: false, error: "Esta pessoa não está no grupo." };
  }

  const { data: existingOpen } = await supabase
    .from("trades")
    .select("id")
    .eq("group_id", groupId)
    .in("status", [...OPEN_STATUSES])
    .or(
      `and(user_id.eq.${userId},partner_id.eq.${partnerId}),and(user_id.eq.${partnerId},partner_id.eq.${userId})`,
    )
    .maybeSingle();

  if (existingOpen) {
    return {
      ok: false,
      error:
        "Já existe uma troca aberta com esta pessoa neste grupo. Conclua ou cancele antes.",
    };
  }

  const reservations = await getUserReservations(supabase, userId);
  const selfCheck = await validateUserTradeInventory(
    supabase,
    userId,
    giveCodes,
    receiveCodes,
    reservations,
  );
  if (!selfCheck.ok) return selfCheck;

  const partnerReservations = await getUserReservations(supabase, partnerId);
  const partnerCheck = await validateUserTradeInventory(
    supabase,
    partnerId,
    receiveCodes,
    giveCodes,
    partnerReservations,
  );
  if (!partnerCheck.ok) {
    return {
      ok: false,
      error: `O parceiro não pode fazer esta troca agora (${partnerCheck.error.toLowerCase()}).`,
    };
  }

  const allCodes = [...new Set([...giveCodes, ...receiveCodes])];
  const codeToId = await resolveStickerIds(supabase, allCodes);

  for (const code of allCodes) {
    if (!codeToId.has(code)) {
      return { ok: false, error: `Figurinha ${code} não encontrada.` };
    }
  }

  const { data: trade, error: tradeError } = await supabase
    .from("trades")
    .insert({
      group_id: groupId,
      user_id: userId,
      partner_id: partnerId,
      status: "proposed",
    })
    .select("id")
    .single();

  if (tradeError || !trade) {
    return { ok: false, error: "Não foi possível registrar a troca." };
  }

  const inserts = [
    ...giveCodes.map((code) => ({
      trade_id: trade.id,
      sticker_id: codeToId.get(code)!,
      side: "give" as const,
      quantity: 1,
    })),
    ...receiveCodes.map((code) => ({
      trade_id: trade.id,
      sticker_id: codeToId.get(code)!,
      side: "receive" as const,
      quantity: 1,
    })),
  ];

  const { error: itemsError } = await supabase
    .from("trade_items")
    .insert(inserts);

  if (itemsError) {
    await supabase.from("trades").delete().eq("id", trade.id);
    return { ok: false, error: "Não foi possível salvar os itens da troca." };
  }

  revalidateTradePaths();
  return { ok: true, tradeId: trade.id };
}

export async function acceptTrade(
  supabase: SupabaseClient,
  userId: string,
  tradeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: trade } = await supabase
    .from("trades")
    .select("id, status, user_id, partner_id")
    .eq("id", tradeId)
    .eq("partner_id", userId)
    .maybeSingle();

  if (!trade) return { ok: false, error: "Proposta não encontrada." };
  if (trade.status !== "proposed") {
    return { ok: false, error: "Esta proposta já foi respondida." };
  }

  const { data: items } = await supabase
    .from("trade_items")
    .select("side, stickers(code)")
    .eq("trade_id", tradeId);

  const give: string[] = [];
  const receive: string[] = [];
  for (const item of items ?? []) {
    const code = extractCode(
      item.stickers as { code: string } | { code: string }[] | null,
    );
    if (!code) continue;
    if (item.side === "give") give.push(code);
    else receive.push(code);
  }

  const partnerReservations = await getUserReservations(supabase, userId);
  const check = await validateUserTradeInventory(
    supabase,
    userId,
    receive,
    give,
    partnerReservations,
  );
  if (!check.ok) {
    return {
      ok: false,
      error: `Não dá para aceitar: ${check.error.toLowerCase()}`,
    };
  }

  const { error } = await supabase
    .from("trades")
    .update({ status: "active" })
    .eq("id", tradeId);

  if (error) return { ok: false, error: "Não foi possível aceitar a troca." };

  revalidateTradePaths();
  return { ok: true };
}

export async function rejectTrade(
  supabase: SupabaseClient,
  userId: string,
  tradeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: trade } = await supabase
    .from("trades")
    .select("id, status")
    .eq("id", tradeId)
    .eq("partner_id", userId)
    .maybeSingle();

  if (!trade) return { ok: false, error: "Proposta não encontrada." };
  if (trade.status !== "proposed") {
    return { ok: false, error: "Esta proposta já foi respondida." };
  }

  const { error } = await supabase
    .from("trades")
    .update({ status: "cancelled" })
    .eq("id", tradeId);

  if (error) return { ok: false, error: "Não foi possível recusar." };

  revalidateTradePaths();
  return { ok: true };
}

export async function completePendingTrade(
  supabase: SupabaseClient,
  userId: string,
  tradeId: string,
): Promise<
  | { ok: true; completed: true }
  | { ok: true; completed: false }
  | { ok: false; error: string }
> {
  const { data: trade } = await supabase
    .from("trades")
    .select(
      "id, status, user_id, partner_id, initiator_confirmed_at, partner_confirmed_at",
    )
    .eq("id", tradeId)
    .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
    .maybeSingle();

  if (!trade) return { ok: false, error: "Troca não encontrada." };
  if (trade.status !== "active") {
    return {
      ok: false,
      error: "Só dá para confirmar trocas aceitas pelos dois lados.",
    };
  }

  const isInitiator = trade.user_id === userId;
  let initiatorConfirmed = !!trade.initiator_confirmed_at;
  let partnerConfirmed = !!trade.partner_confirmed_at;

  if (isInitiator && !initiatorConfirmed) {
    const { error } = await supabase
      .from("trades")
      .update({ initiator_confirmed_at: new Date().toISOString() })
      .eq("id", tradeId)
      .is("initiator_confirmed_at", null);
    if (error) {
      return { ok: false, error: "Não foi possível registrar sua confirmação." };
    }
    initiatorConfirmed = true;
  } else if (!isInitiator && !partnerConfirmed) {
    const { error } = await supabase
      .from("trades")
      .update({ partner_confirmed_at: new Date().toISOString() })
      .eq("id", tradeId)
      .is("partner_confirmed_at", null);
    if (error) {
      return { ok: false, error: "Não foi possível registrar sua confirmação." };
    }
    partnerConfirmed = true;
  }

  if (!initiatorConfirmed || !partnerConfirmed) {
    revalidateTradePaths();
    return { ok: true, completed: false };
  }

  const { data: items } = await supabase
    .from("trade_items")
    .select("side, stickers(code)")
    .eq("trade_id", tradeId);

  const initiatorGive: string[] = [];
  const initiatorReceive: string[] = [];
  for (const item of items ?? []) {
    const code = extractCode(
      item.stickers as { code: string } | { code: string }[] | null,
    );
    if (!code) continue;
    if (item.side === "give") initiatorGive.push(code);
    else initiatorReceive.push(code);
  }

  const initiatorReservations = await getUserReservations(
    supabase,
    trade.user_id,
    tradeId,
  );
  const initiatorCheck = await validateUserTradeInventory(
    supabase,
    trade.user_id,
    initiatorGive,
    initiatorReceive,
    initiatorReservations,
  );
  if (!initiatorCheck.ok) {
    return {
      ok: false,
      error: `Inventário desatualizado: ${initiatorCheck.error.toLowerCase()}`,
    };
  }

  const partnerReservations = await getUserReservations(
    supabase,
    trade.partner_id,
    tradeId,
  );
  const partnerCheck = await validateUserTradeInventory(
    supabase,
    trade.partner_id,
    initiatorReceive,
    initiatorGive,
    partnerReservations,
  );
  if (!partnerCheck.ok) {
    return {
      ok: false,
      error: `Parceiro não pode concluir agora (${partnerCheck.error.toLowerCase()}).`,
    };
  }

  await applyCollectionChanges(
    supabase,
    trade.user_id,
    initiatorGive,
    initiatorReceive,
  );
  await applyCollectionChanges(
    supabase,
    trade.partner_id,
    initiatorReceive,
    initiatorGive,
  );

  const { error } = await supabase
    .from("trades")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", tradeId)
    .eq("status", "active");

  if (error) return { ok: false, error: "Não foi possível concluir a troca." };

  revalidateTradePaths();
  return { ok: true, completed: true };
}

export async function cancelPendingTrade(
  supabase: SupabaseClient,
  userId: string,
  tradeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: trade } = await supabase
    .from("trades")
    .select("id, status, user_id, partner_id")
    .eq("id", tradeId)
    .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
    .maybeSingle();

  if (!trade) return { ok: false, error: "Troca não encontrada." };
  if (trade.status !== "proposed" && trade.status !== "active") {
    return { ok: false, error: "Esta troca já foi finalizada." };
  }
  if (trade.status === "proposed" && trade.user_id !== userId) {
    return {
      ok: false,
      error: "Use Recusar para propostas que você recebeu.",
    };
  }

  const { error } = await supabase
    .from("trades")
    .update({ status: "cancelled" })
    .eq("id", tradeId);

  if (error) return { ok: false, error: "Não foi possível cancelar." };

  revalidateTradePaths();
  return { ok: true };
}
