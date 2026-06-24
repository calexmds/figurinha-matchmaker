import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getUserReservations } from "@/lib/trades";
import { tradeableQuantity } from "@/lib/stickers/collection";
import { getCollectionEntryMode } from "@/lib/stickers/collection-mode";

export type StickerEdit = {
  code: string;
  kind: "have" | "dup" | "need";
  quantity: number;
};

export type PersistResult =
  | { ok: true }
  | { error: string; detail?: string };

async function persistSparseEdit(
  supabase: SupabaseClient,
  userId: string,
  stickerId: string,
  quantity: number,
  now: string,
  upserts: Array<{
    user_id: string;
    sticker_id: string;
    quantity: number;
    updated_at: string;
  }>,
  deleteStickerIds: string[],
  needDeleteIds: string[],
  needUpserts: Array<{
    user_id: string;
    sticker_id: string;
    updated_at: string;
  }>,
) {
  if (quantity <= 0) {
    deleteStickerIds.push(stickerId);
    needUpserts.push({
      user_id: userId,
      sticker_id: stickerId,
      updated_at: now,
    });
    return;
  }

  needDeleteIds.push(stickerId);

  if (quantity === 1) {
    deleteStickerIds.push(stickerId);
    return;
  }

  upserts.push({
    user_id: userId,
    sticker_id: stickerId,
    quantity,
    updated_at: now,
  });
}

async function persistHaveEdit(
  stickerId: string,
  userId: string,
  quantity: number,
  now: string,
  upserts: Array<{
    user_id: string;
    sticker_id: string;
    quantity: number;
    updated_at: string;
  }>,
  deleteIds: string[],
  needDeleteIds: string[],
  needUpserts: Array<{
    user_id: string;
    sticker_id: string;
    updated_at: string;
  }>,
) {
  if (quantity > 0) {
    upserts.push({
      user_id: userId,
      sticker_id: stickerId,
      quantity,
      updated_at: now,
    });
    needDeleteIds.push(stickerId);
  } else {
    deleteIds.push(stickerId);
    needUpserts.push({
      user_id: userId,
      sticker_id: stickerId,
      updated_at: now,
    });
  }
}

export async function persistStickerEdits(
  supabase: SupabaseClient,
  userId: string,
  edits: StickerEdit[],
): Promise<PersistResult> {
  if (!Array.isArray(edits) || edits.length === 0) return { ok: true };
  if (edits.length > 500) return { error: "Muitas alterações de uma vez." };

  const entryMode = await getCollectionEntryMode(supabase, userId);
  const sparse = entryMode === "sparse";

  const normalized = edits.map((e) => ({
    code: e.code.trim().toUpperCase(),
    quantity: Math.max(0, Math.min(99, e.quantity)),
  }));

  const codes = [...new Set(normalized.map((e) => e.code))];
  const { data: stickerRows, error: stickerError } = await supabase
    .from("stickers")
    .select("id, code")
    .in("code", codes);

  if (stickerError) {
    return {
      error: "Erro ao localizar figurinhas.",
      detail: stickerError.message,
    };
  }
  if (!stickerRows?.length) {
    return { error: "Nenhuma figurinha encontrada para os códigos informados." };
  }

  const codeToId = new Map(stickerRows.map((row) => [row.code, row.id]));
  const reservations = await getUserReservations(supabase, userId);

  for (const edit of normalized) {
    if (reservations.receive.has(edit.code) && edit.quantity > 0) {
      return {
        error: `${edit.code} está reservada para receber em uma troca. Cancele ou conclua antes de marcar como Tenho.`,
      };
    }
    const reservedGive = reservations.give.get(edit.code) ?? 0;
    if (reservedGive > 0 && tradeableQuantity(edit.quantity) < reservedGive) {
      return {
        error: `${edit.code} tem ${reservedGive} repetida(s) reservada(s) em troca. Ajuste a quantidade ou cancele a combinação.`,
      };
    }
  }

  const now = new Date().toISOString();

  const upserts: Array<{
    user_id: string;
    sticker_id: string;
    quantity: number;
    updated_at: string;
  }> = [];
  const deleteIds: string[] = [];
  const needDeleteIds: string[] = [];
  const needUpserts: Array<{
    user_id: string;
    sticker_id: string;
    updated_at: string;
  }> = [];

  for (const edit of normalized) {
    const stickerId = codeToId.get(edit.code);
    if (!stickerId) continue;

    if (sparse) {
      await persistSparseEdit(
        supabase,
        userId,
        stickerId,
        edit.quantity,
        now,
        upserts,
        deleteIds,
        needDeleteIds,
        needUpserts,
      );
    } else {
      await persistHaveEdit(
        stickerId,
        userId,
        edit.quantity,
        now,
        upserts,
        deleteIds,
        needDeleteIds,
        needUpserts,
      );
    }
  }

  if (upserts.length > 0) {
    const { error } = await supabase
      .from("user_stickers")
      .upsert(upserts, { onConflict: "user_id,sticker_id" });
    if (error) {
      return { error: "Erro ao salvar figurinhas.", detail: error.message };
    }
  }
  if (deleteIds.length > 0) {
    const { error } = await supabase
      .from("user_stickers")
      .delete()
      .eq("user_id", userId)
      .in("sticker_id", deleteIds);
    if (error) {
      return { error: "Erro ao remover figurinhas.", detail: error.message };
    }
  }

  if (needDeleteIds.length > 0) {
    await supabase
      .from("user_needs")
      .delete()
      .eq("user_id", userId)
      .in("sticker_id", needDeleteIds);
  }
  if (needUpserts.length > 0) {
    const { error } = await supabase
      .from("user_needs")
      .upsert(needUpserts, { onConflict: "user_id,sticker_id" });
    if (error && !error.message.includes("user_needs")) {
      return {
        error: "Erro ao atualizar lista de preciso.",
        detail: error.message,
      };
    }
  }

  revalidatePath("/home");
  revalidatePath("/trocas");
  revalidatePath("/onboarding");

  return { ok: true };
}
