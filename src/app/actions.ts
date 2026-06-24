"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { joinGroupForUser } from "@/lib/group-join";
import {
  PENDING_INVITE_COOKIE,
  inviteCookieOptions,
} from "@/lib/invite-cookie";
import { generateInviteCode, normalizeInviteCode } from "@/lib/invite";
import {
  acceptTrade,
  cancelPendingTrade,
  completePendingTrade,
  createPendingTrade,
  rejectTrade,
} from "@/lib/trades";
import {
  resolveStickerId,
} from "@/lib/market-listings";
import {
  deriveNeeds,
  deriveTradeDuplicates,
  ownedMapFromList,
} from "@/lib/stickers/collection";
import { getUserOwned, getUserCollection } from "@/lib/data";
import {
  materializeHaveStorage,
  materializeSparseStorage,
} from "@/lib/stickers/collection-mode";
import type { CollectionEntryMode } from "@/lib/types";
import { applyReservationsToLists, getUserReservations } from "@/lib/trades";
import {
  persistStickerEdits,
  type StickerEdit,
} from "@/lib/stickers/persist-edits";

export async function signInWithGoogle(returnTo?: string) {
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const redirectTo = `${siteUrl}/auth/callback${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) throw error;
  if (data.url) redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function setPendingInvite(code: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    PENDING_INVITE_COOKIE,
    normalizeInviteCode(code),
    inviteCookieOptions,
  );
}

export async function consumePendingInvite(): Promise<string | null> {
  const cookieStore = await cookies();
  const code = cookieStore.get(PENDING_INVITE_COOKIE)?.value ?? null;
  if (code) {
    cookieStore.delete(PENDING_INVITE_COOKIE);
  }
  return code;
}

export async function joinGroupByCode(inviteCode: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await setPendingInvite(inviteCode);
    redirect(`/login?next=${encodeURIComponent(`/join/${inviteCode}`)}`);
  }

  const result = await joinGroupForUser(supabase, user, inviteCode);
  if (!result.ok) {
    return { error: result.error };
  }

  redirect("/onboarding");
}

export async function createGroup(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome do grupo." };

  let inviteCode = generateInviteCode();
  let attempts = 0;

  while (attempts < 5) {
    const { data: group, error } = await supabase
      .from("groups")
      .insert({
        name,
        invite_code: inviteCode,
        owner_id: user.id,
      })
      .select("id, invite_code")
      .single();

    if (!error && group) {
      await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
      });

      await supabase
        .from("profiles")
        .update({ active_group_id: group.id })
        .eq("id", user.id);

      revalidatePath("/grupo");
      revalidatePath("/home");
      redirect("/onboarding");
    }

    inviteCode = generateInviteCode();
    attempts += 1;
  }

  return { error: "Não foi possível criar o grupo. Tente novamente." };
}

export async function applyStickerEdits(edits: StickerEdit[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sessão expirada. Entre novamente." };

  return persistStickerEdits(supabase, user.id, edits);
}

export async function updateGroupName(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return { error: "Informe o nome do grupo." };

  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!group) return { error: "Só o criador pode editar o grupo." };

  const { error } = await supabase
    .from("groups")
    .update({ name })
    .eq("id", groupId);

  if (error) return { error: "Não foi possível renomear o grupo." };

  revalidatePath("/grupo");
  revalidatePath("/trocas");
  revalidatePath("/home");
}

export async function deleteGroup(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const groupId = String(formData.get("groupId") ?? "");

  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!group) return { error: "Só o criador pode excluir o grupo." };

  const { error } = await supabase.from("groups").delete().eq("id", groupId);

  if (error) return { error: "Não foi possível excluir o grupo." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_group_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.active_group_id === groupId) {
    const { data: remaining } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    await supabase
      .from("profiles")
      .update({ active_group_id: remaining?.group_id ?? null })
      .eq("id", user.id);
  }

  revalidatePath("/grupo");
  revalidatePath("/trocas");
  revalidatePath("/home");
}

export async function removeGroupMember(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const groupId = String(formData.get("groupId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  if (!groupId || !memberId) return { error: "Dados inválidos." };

  const { data: group } = await supabase
    .from("groups")
    .select("owner_id")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) return { error: "Grupo não encontrado." };

  const isOwner = group.owner_id === user.id;
  const isSelf = memberId === user.id;

  if (!isOwner && !isSelf) {
    return { error: "Você não pode remover este participante." };
  }

  if (isOwner && isSelf) {
    return { error: "O criador não pode sair. Exclua o grupo ou transfira antes." };
  }

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", memberId);

  if (error) return { error: "Não foi possível remover o participante." };

  if (isSelf) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_group_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.active_group_id === groupId) {
      const { data: remaining } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      await supabase
        .from("profiles")
        .update({ active_group_id: remaining?.group_id ?? null })
        .eq("id", user.id);
    }
  }

  revalidatePath("/grupo");
  revalidatePath("/trocas");
  revalidatePath("/home");
}

export async function getGroupTradeData(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { getCachedGroupTradeData } = await import("@/lib/group-trade-data");
  return getCachedGroupTradeData(supabase, groupId, user.id);
}

export async function combineTrade(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const groupId = String(formData.get("groupId") ?? "");
  const partnerId = String(formData.get("partnerId") ?? "");
  const give = String(formData.get("give") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const receive = String(formData.get("receive") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const result = await createPendingTrade(
    supabase,
    user.id,
    groupId,
    partnerId,
    give,
    receive,
  );

  if (!result.ok) {
    redirect(`/trocas?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/trocas?proposed=1");
}

export async function acceptTradeAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tradeId = String(formData.get("tradeId") ?? "");
  const result = await acceptTrade(supabase, user.id, tradeId);

  if (!result.ok) {
    redirect(`/trocas?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/trocas?accepted=1");
}

export async function rejectTradeAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tradeId = String(formData.get("tradeId") ?? "");
  const result = await rejectTrade(supabase, user.id, tradeId);

  if (!result.ok) {
    redirect(`/trocas?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/trocas?rejected=1");
}

export async function joinGroupWithCode(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const inviteCode = String(formData.get("inviteCode") ?? "").trim();
  if (!inviteCode) {
    redirect("/grupo?error=" + encodeURIComponent("Informe o código do grupo."));
  }

  const result = await joinGroupForUser(supabase, user, inviteCode);
  if (!result.ok) {
    redirect(`/grupo?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/onboarding");
}

export async function completeTrade(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tradeId = String(formData.get("tradeId") ?? "");
  const result = await completePendingTrade(supabase, user.id, tradeId);

  if (!result.ok) {
    redirect(`/trocas?error=${encodeURIComponent(result.error)}`);
  }

  redirect(result.completed ? "/trocas?completed=1" : "/trocas?confirmed=1");
}

export async function cancelTrade(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tradeId = String(formData.get("tradeId") ?? "");
  const result = await cancelPendingTrade(supabase, user.id, tradeId);

  if (!result.ok) {
    redirect(`/trocas?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/trocas?cancelled=1");
}

export async function saveStickerListing(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const groupId = String(formData.get("groupId") ?? "");
  const listingType = String(formData.get("listingType") ?? "") as "sell" | "buy";
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const priceNoteRaw = String(formData.get("priceNote") ?? "").trim();
  const priceNote = priceNoteRaw.length > 0 ? priceNoteRaw.slice(0, 80) : null;

  if (!groupId || (listingType !== "sell" && listingType !== "buy") || !code) {
    redirect("/trocas?error=Anúncio inválido.");
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/trocas?error=Você não participa deste grupo.");
  }

  const { owned: ownedMap } = await getUserCollection(supabase, user.id);
  const reservations = await getUserReservations(supabase, user.id);
  const { availableDuplicates, availableNeeds } = applyReservationsToLists(
    deriveTradeDuplicates(ownedMap),
    deriveNeeds(ownedMap),
    reservations,
  );

  const dupCodes = new Set(availableDuplicates.map((d) => d.code));
  const needCodes = new Set(availableNeeds);

  if (listingType === "sell" && !dupCodes.has(code)) {
    redirect(
      "/trocas?error=Você só pode vender repetidas que ainda não estão reservadas em troca.",
    );
  }

  if (listingType === "buy" && !needCodes.has(code)) {
    redirect("/trocas?error=Você só pode anunciar compra de figurinhas que ainda precisa.");
  }

  const stickerId = await resolveStickerId(supabase, code);
  if (!stickerId) {
    redirect("/trocas?error=Figurinha não encontrada.");
  }

  const { error } = await supabase.from("sticker_listings").upsert(
    {
      user_id: user.id,
      group_id: groupId,
      sticker_id: stickerId,
      listing_type: listingType,
      price_note: priceNote,
    },
    { onConflict: "user_id,group_id,sticker_id,listing_type" },
  );

  if (error) {
    redirect(`/trocas?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/trocas");
  redirect("/trocas?listing_saved=1");
}

export async function removeStickerListing(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) redirect("/trocas?error=Anúncio inválido.");

  const { error } = await supabase
    .from("sticker_listings")
    .delete()
    .eq("id", listingId)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/trocas?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/trocas");
  redirect("/trocas?listing_removed=1");
}

export async function setCollectionEntryMode(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const mode = String(formData.get("mode") ?? "") as CollectionEntryMode;
  if (mode !== "have" && mode !== "sparse") {
    redirect("/onboarding/welcome?error=invalid");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ collection_entry_mode: mode })
    .eq("id", user.id);

  if (error) {
    redirect(`/onboarding/welcome?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/onboarding");
  redirect("/onboarding?mode_set=1");
}

export async function switchCollectionEntryMode(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const target = String(formData.get("mode") ?? "") as CollectionEntryMode;
  if (target !== "have" && target !== "sparse") {
    redirect("/onboarding?error=Modo inválido.");
  }

  const { owned, entryMode } = await getUserCollection(supabase, user.id);
  if (entryMode === target) {
    redirect("/onboarding");
  }

  if (target === "sparse") {
    await materializeSparseStorage(supabase, user.id, owned);
  } else {
    await materializeHaveStorage(supabase, user.id, owned);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ collection_entry_mode: target })
    .eq("id", user.id);

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/onboarding");
  revalidatePath("/home");
  revalidatePath("/trocas");
  redirect("/onboarding?mode_set=1");
}
