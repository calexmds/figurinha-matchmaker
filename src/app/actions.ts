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
  cancelPendingTrade,
  completePendingTrade,
  createPendingTrade,
} from "@/lib/trades";
import {
  parseNeedsInput,
  parseStickerInput,
} from "@/lib/stickers/parse";

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

export async function saveCollection(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const duplicatesRaw = String(formData.get("duplicates") ?? "");
  const needsRaw = String(formData.get("needs") ?? "");

  if (!duplicatesRaw.trim() && !needsRaw.trim()) {
    return { error: "Informe repetidas ou figurinhas que precisa." };
  }

  const parsed = parseStickerInput(duplicatesRaw);
  const { error: deleteDuplicatesError } = await supabase
    .from("user_stickers")
    .delete()
    .eq("user_id", user.id);

  if (deleteDuplicatesError) {
    return { error: "Erro ao atualizar repetidas." };
  }

  if (parsed.length > 0) {
    const codes = parsed.map((item) => item.code);
    const { data: stickerRows, error: stickerError } = await supabase
      .from("stickers")
      .select("id, code")
      .in("code", codes);

    if (stickerError || !stickerRows) {
      return { error: "Erro ao buscar figurinhas." };
    }

    const codeToId = new Map(stickerRows.map((row) => [row.code, row.id]));
    const inserts = parsed
      .filter((item) => codeToId.has(item.code))
      .map((item) => ({
        user_id: user.id,
        sticker_id: codeToId.get(item.code)!,
        quantity: item.quantity,
        updated_at: new Date().toISOString(),
      }));

    const { error: insertError } = await supabase
      .from("user_stickers")
      .insert(inserts);

    if (insertError) {
      return { error: "Erro ao salvar repetidas." };
    }
  }

  const needCodes = parseNeedsInput(needsRaw);
  const { error: deleteNeedsError } = await supabase
    .from("user_needs")
    .delete()
    .eq("user_id", user.id);

  if (deleteNeedsError) {
    return { error: "Erro ao atualizar lista de preciso." };
  }

  if (needCodes.length > 0) {
    const { data: stickerRows, error: stickerError } = await supabase
      .from("stickers")
      .select("id, code")
      .in("code", needCodes);

    if (stickerError || !stickerRows) {
      return { error: "Erro ao buscar figurinhas." };
    }

    const inserts = stickerRows.map((row) => ({
      user_id: user.id,
      sticker_id: row.id,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertNeedsError } = await supabase
      .from("user_needs")
      .insert(inserts);

    if (insertNeedsError) {
      return { error: "Erro ao salvar figurinhas que precisa." };
    }
  }

  revalidatePath("/home");
  revalidatePath("/trocas");
  revalidatePath("/onboarding");
  redirect("/home");
}

/** @deprecated Use saveCollection */
export async function saveStickers(formData: FormData) {
  return saveCollection(formData);
}

import {
  persistStickerEdits,
  type StickerEdit,
} from "@/lib/stickers/persist-edits";

export async function applyStickerEdits(edits: StickerEdit[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sessão expirada. Entre novamente." };

  return persistStickerEdits(supabase, user.id, edits);
}

export async function setActiveGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "Você não faz parte deste grupo." };
  }

  await supabase
    .from("profiles")
    .update({ active_group_id: groupId })
    .eq("id", user.id);

  revalidatePath("/home");
  revalidatePath("/grupo");
  revalidatePath("/trocas");
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

  redirect("/trocas?combined=1");
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

  redirect("/trocas?completed=1");
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
