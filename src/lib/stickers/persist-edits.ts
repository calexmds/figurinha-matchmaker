import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export type StickerEdit = {
  code: string;
  kind: "dup" | "need";
  quantity: number;
};

export type PersistResult =
  | { ok: true }
  | { error: string; detail?: string };

export async function persistStickerEdits(
  supabase: SupabaseClient,
  userId: string,
  edits: StickerEdit[],
): Promise<PersistResult> {
  if (!Array.isArray(edits) || edits.length === 0) return { ok: true };
  if (edits.length > 500) return { error: "Muitas alterações de uma vez." };

  const normalized = edits.map((e) => ({
    ...e,
    code: e.code.trim().toUpperCase(),
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

  const dupUpserts: Array<{
    user_id: string;
    sticker_id: string;
    quantity: number;
    updated_at: string;
  }> = [];
  const dupDeleteIds: string[] = [];
  const needUpserts: Array<{
    user_id: string;
    sticker_id: string;
    updated_at: string;
  }> = [];
  const needDeleteIds: string[] = [];
  const now = new Date().toISOString();

  for (const edit of normalized) {
    const stickerId = codeToId.get(edit.code);
    if (!stickerId) continue;

    if (edit.kind === "dup") {
      if (edit.quantity > 0) {
        dupUpserts.push({
          user_id: userId,
          sticker_id: stickerId,
          quantity: edit.quantity,
          updated_at: now,
        });
      } else {
        dupDeleteIds.push(stickerId);
      }
    } else if (edit.quantity > 0) {
      needUpserts.push({
        user_id: userId,
        sticker_id: stickerId,
        updated_at: now,
      });
    } else {
      needDeleteIds.push(stickerId);
    }
  }

  if (dupUpserts.length > 0) {
    const { error } = await supabase
      .from("user_stickers")
      .upsert(dupUpserts, { onConflict: "user_id,sticker_id" });
    if (error) {
      return { error: "Erro ao salvar repetidas.", detail: error.message };
    }
  }
  if (dupDeleteIds.length > 0) {
    const { error } = await supabase
      .from("user_stickers")
      .delete()
      .eq("user_id", userId)
      .in("sticker_id", dupDeleteIds);
    if (error) {
      return { error: "Erro ao remover repetidas.", detail: error.message };
    }
  }
  if (needUpserts.length > 0) {
    const { error } = await supabase
      .from("user_needs")
      .upsert(needUpserts, { onConflict: "user_id,sticker_id" });
    if (error) {
      const hint = error.message.includes("user_needs")
        ? " A tabela user_needs pode não existir — rode a migration 002 no Supabase."
        : "";
      return {
        error: `Erro ao salvar lista de preciso.${hint}`,
        detail: error.message,
      };
    }
  }
  if (needDeleteIds.length > 0) {
    const { error } = await supabase
      .from("user_needs")
      .delete()
      .eq("user_id", userId)
      .in("sticker_id", needDeleteIds);
    if (error) {
      return {
        error: "Erro ao remover da lista de preciso.",
        detail: error.message,
      };
    }
  }

  revalidatePath("/home");
  revalidatePath("/trocas");
  revalidatePath("/onboarding");

  return { ok: true };
}
