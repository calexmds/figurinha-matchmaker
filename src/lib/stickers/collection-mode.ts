import type { SupabaseClient } from "@supabase/supabase-js";
import type { CollectionEntryMode } from "@/lib/types";
import {
  deriveNeeds,
  deriveTradeDuplicates,
  resolveOwnedMap,
} from "@/lib/stickers/collection";

function extractCode(
  sticker: { code: string } | { code: string }[] | null,
): string | null {
  if (!sticker) return null;
  return Array.isArray(sticker) ? (sticker[0]?.code ?? null) : sticker.code;
}

export async function getCollectionEntryMode(
  supabase: SupabaseClient,
  userId: string,
): Promise<CollectionEntryMode> {
  const { data } = await supabase
    .from("profiles")
    .select("collection_entry_mode")
    .eq("id", userId)
    .maybeSingle();

  const mode = data?.collection_entry_mode as CollectionEntryMode | undefined;
  if (mode === "have" || mode === "sparse" || mode === "unset") return mode;
  return "unset";
}

export async function getUserExplicitNeeds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("user_needs")
    .select("stickers(code)")
    .eq("user_id", userId);

  return (data ?? [])
    .map((row) =>
      extractCode(row.stickers as { code: string } | { code: string }[] | null),
    )
    .filter((code): code is string => !!code)
    .map((code) => code.toUpperCase());
}

export async function getUserCollectionRaw(
  supabase: SupabaseClient,
  userId: string,
) {
  const [ownedRows, explicitNeeds, entryMode] = await Promise.all([
    supabase
      .from("user_stickers")
      .select("quantity, stickers(code)")
      .eq("user_id", userId)
      .gt("quantity", 0)
      .then(({ data }) =>
        (data ?? [])
          .map((row) => ({
            code: extractCode(
              row.stickers as { code: string } | { code: string }[] | null,
            ),
            quantity: row.quantity,
          }))
          .filter((item): item is { code: string; quantity: number } => !!item.code),
      ),
    getUserExplicitNeeds(supabase, userId),
    getCollectionEntryMode(supabase, userId),
  ]);

  return { ownedRows, explicitNeeds, entryMode };
}

export function buildOwnedMapFromRaw(
  entryMode: CollectionEntryMode,
  ownedRows: Array<{ code: string; quantity: number }>,
  explicitNeeds: string[],
) {
  const mode = entryMode === "sparse" ? "sparse" : "have";
  return resolveOwnedMap(mode, ownedRows, explicitNeeds);
}

/** Converte coleção have → sparse no banco (só qty>1 + user_needs). */
export async function materializeSparseStorage(
  supabase: SupabaseClient,
  userId: string,
  ownedMap: Record<string, number>,
) {
  const needs = deriveNeeds(ownedMap);

  const { data: stickerRows } = await supabase
    .from("stickers")
    .select("id, code")
    .in("code", [...needs, ...Object.keys(ownedMap).filter((c) => (ownedMap[c] ?? 0) > 1)]);

  const codeToId = new Map((stickerRows ?? []).map((r) => [r.code, r.id]));
  const now = new Date().toISOString();

  await supabase.from("user_stickers").delete().eq("user_id", userId);
  await supabase.from("user_needs").delete().eq("user_id", userId);

  const dupUpserts = Object.entries(ownedMap)
    .filter(([, qty]) => qty > 1)
    .map(([code, quantity]) => {
      const stickerId = codeToId.get(code);
      if (!stickerId) return null;
      return {
        user_id: userId,
        sticker_id: stickerId,
        quantity,
        updated_at: now,
      };
    })
    .filter((row): row is NonNullable<typeof row> => !!row);

  const needUpserts = needs
    .map((code) => {
      const stickerId = codeToId.get(code);
      if (!stickerId) return null;
      return {
        user_id: userId,
        sticker_id: stickerId,
        updated_at: now,
      };
    })
    .filter((row): row is NonNullable<typeof row> => !!row);

  if (dupUpserts.length > 0) {
    await supabase.from("user_stickers").upsert(dupUpserts, {
      onConflict: "user_id,sticker_id",
    });
  }

  if (needUpserts.length > 0) {
    await supabase.from("user_needs").upsert(needUpserts, {
      onConflict: "user_id,sticker_id",
    });
  }
}

/** Converte sparse → have materializando user_stickers completo. */
export async function materializeHaveStorage(
  supabase: SupabaseClient,
  userId: string,
  ownedMap: Record<string, number>,
) {
  const codes = Object.entries(ownedMap)
    .filter(([, qty]) => qty > 0)
    .map(([code]) => code);

  const { data: stickerRows } = await supabase
    .from("stickers")
    .select("id, code")
    .in("code", codes.length > 0 ? codes : ["__none__"]);

  const codeToId = new Map((stickerRows ?? []).map((r) => [r.code, r.id]));
  const now = new Date().toISOString();

  await supabase.from("user_stickers").delete().eq("user_id", userId);
  await supabase.from("user_needs").delete().eq("user_id", userId);

  const upserts = Object.entries(ownedMap)
    .filter(([, qty]) => qty > 0)
    .map(([code, quantity]) => {
      const stickerId = codeToId.get(code);
      if (!stickerId) return null;
      return {
        user_id: userId,
        sticker_id: stickerId,
        quantity,
        updated_at: now,
      };
    })
    .filter((row): row is NonNullable<typeof row> => !!row);

  if (upserts.length > 0) {
    await supabase.from("user_stickers").upsert(upserts, {
      onConflict: "user_id,sticker_id",
    });
  }
}

export function resolveOwnedForMember(
  entryMode: CollectionEntryMode,
  ownedRows: Array<{ code: string; quantity: number }>,
  explicitNeeds: string[],
) {
  const mode = entryMode === "sparse" ? "sparse" : "have";
  const ownedMap = resolveOwnedMap(mode, ownedRows, explicitNeeds);
  return {
    ownedMap,
    duplicates: deriveTradeDuplicates(ownedMap),
    needs: deriveNeeds(ownedMap),
  };
}
