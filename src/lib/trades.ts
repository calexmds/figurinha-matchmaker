import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TradeStatus = "pending" | "completed" | "cancelled";

export type PendingTrade = {
  id: string;
  partnerId: string;
  partnerName: string;
  give: string[];
  receive: string[];
  createdAt: string;
};

export type TradeReservations = {
  give: Map<string, number>;
  receive: Set<string>;
};

function extractCode(
  sticker: { code: string } | { code: string }[] | null,
): string | null {
  if (!sticker) return null;
  return Array.isArray(sticker) ? (sticker[0]?.code ?? null) : sticker.code;
}

export async function getUserReservations(
  supabase: SupabaseClient,
  userId: string,
): Promise<TradeReservations> {
  const { data: trades } = await supabase
    .from("trades")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending");

  const give = new Map<string, number>();
  const receive = new Set<string>();

  if (!trades?.length) return { give, receive };

  const tradeIds = trades.map((t) => t.id);
  const { data: items } = await supabase
    .from("trade_items")
    .select("side, quantity, stickers(code)")
    .in("trade_id", tradeIds);

  for (const item of items ?? []) {
    const code = extractCode(
      item.stickers as { code: string } | { code: string }[] | null,
    );
    if (!code) continue;
    if (item.side === "give") {
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

export async function getPendingTrades(
  supabase: SupabaseClient,
  userId: string,
  groupId: string,
): Promise<PendingTrade[]> {
  const { data: trades } = await supabase
    .from("trades")
    .select("id, partner_id, created_at")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (!trades?.length) return [];

  const partnerIds = [...new Set(trades.map((t) => t.partner_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", partnerIds);

  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.name ?? "Colecionador"]),
  );

  const tradeIds = trades.map((t) => t.id);
  const { data: items } = await supabase
    .from("trade_items")
    .select("trade_id, side, stickers(code)")
    .in("trade_id", tradeIds);

  const itemsByTrade = new Map<string, { give: string[]; receive: string[] }>();
  for (const id of tradeIds) {
    itemsByTrade.set(id, { give: [], receive: [] });
  }

  for (const item of items ?? []) {
    const bucket = itemsByTrade.get(item.trade_id);
    const code = extractCode(
      item.stickers as { code: string } | { code: string }[] | null,
    );
    if (!bucket || !code) continue;
    if (item.side === "give") bucket.give.push(code);
    else bucket.receive.push(code);
  }

  return trades.map((trade) => {
    const bucket = itemsByTrade.get(trade.id) ?? { give: [], receive: [] };
    return {
      id: trade.id,
      partnerId: trade.partner_id,
      partnerName: nameById.get(trade.partner_id) ?? "Colecionador",
      give: bucket.give.sort(),
      receive: bucket.receive.sort(),
      createdAt: trade.created_at,
    };
  });
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

  const { data: existingPending } = await supabase
    .from("trades")
    .select("id")
    .eq("user_id", userId)
    .eq("partner_id", partnerId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPending) {
    return {
      ok: false,
      error: "Já existe uma troca combinada com esta pessoa. Conclua ou cancele antes.",
    };
  }

  const reservations = await getUserReservations(supabase, userId);
  const duplicates = await supabase
    .from("user_stickers")
    .select("quantity, stickers(code)")
    .eq("user_id", userId)
    .gt("quantity", 0);

  const dupByCode = new Map<string, number>();
  for (const row of duplicates.data ?? []) {
    const code = extractCode(
      row.stickers as { code: string } | { code: string }[] | null,
    );
    if (code) dupByCode.set(code, row.quantity);
  }

  const giveCount = new Map<string, number>();
  for (const code of giveCodes) {
    giveCount.set(code, (giveCount.get(code) ?? 0) + 1);
  }
  for (const [code, needed] of giveCount) {
    const total = dupByCode.get(code) ?? 0;
    const reserved = reservations.give.get(code) ?? 0;
    if (total - reserved < needed) {
      return {
        ok: false,
        error: `Você não tem repetida disponível para ${code}.`,
      };
    }
  }

  const needsRows = await supabase
    .from("user_needs")
    .select("stickers(code)")
    .eq("user_id", userId);

  const needSet = new Set<string>();
  for (const row of needsRows.data ?? []) {
    const code = extractCode(
      row.stickers as { code: string } | { code: string }[] | null,
    );
    if (code && !reservations.receive.has(code)) needSet.add(code);
  }

  for (const code of receiveCodes) {
    if (!needSet.has(code)) {
      return {
        ok: false,
        error: `${code} não está na sua lista de preciso.`,
      };
    }
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
      status: "pending",
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

export async function completePendingTrade(
  supabase: SupabaseClient,
  userId: string,
  tradeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: trade } = await supabase
    .from("trades")
    .select("id, status")
    .eq("id", tradeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!trade) return { ok: false, error: "Troca não encontrada." };
  if (trade.status !== "pending") {
    return { ok: false, error: "Esta troca já foi finalizada." };
  }

  const { data: items } = await supabase
    .from("trade_items")
    .select("side, quantity, sticker_id, stickers(code)")
    .eq("trade_id", tradeId);

  if (!items?.length) {
    return { ok: false, error: "Troca sem figurinhas." };
  }

  for (const item of items) {
    const code = extractCode(
      item.stickers as { code: string } | { code: string }[] | null,
    );
    if (!code) continue;

    if (item.side === "give") {
      const { data: row } = await supabase
        .from("user_stickers")
        .select("quantity")
        .eq("user_id", userId)
        .eq("sticker_id", item.sticker_id)
        .maybeSingle();

      const nextQty = Math.max(0, (row?.quantity ?? 0) - item.quantity);
      if (nextQty === 0) {
        await supabase
          .from("user_stickers")
          .delete()
          .eq("user_id", userId)
          .eq("sticker_id", item.sticker_id);
      } else {
        await supabase
          .from("user_stickers")
          .update({
            quantity: nextQty,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("sticker_id", item.sticker_id);
      }
    } else {
      await supabase
        .from("user_needs")
        .delete()
        .eq("user_id", userId)
        .eq("sticker_id", item.sticker_id);
    }
  }

  const { error } = await supabase
    .from("trades")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", tradeId);

  if (error) return { ok: false, error: "Não foi possível concluir a troca." };

  revalidateTradePaths();
  return { ok: true };
}

export async function cancelPendingTrade(
  supabase: SupabaseClient,
  userId: string,
  tradeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: trade } = await supabase
    .from("trades")
    .select("id, status")
    .eq("id", tradeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!trade) return { ok: false, error: "Troca não encontrada." };
  if (trade.status !== "pending") {
    return { ok: false, error: "Só dá para cancelar trocas pendentes." };
  }

  const { error } = await supabase
    .from("trades")
    .update({ status: "cancelled" })
    .eq("id", tradeId);

  if (error) return { ok: false, error: "Não foi possível cancelar." };

  revalidateTradePaths();
  return { ok: true };
}

function revalidateTradePaths() {
  revalidatePath("/trocas");
  revalidatePath("/home");
  revalidatePath("/onboarding");
}
