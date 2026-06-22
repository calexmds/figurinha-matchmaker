"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { generateInviteCode, normalizeInviteCode } from "@/lib/invite";
import {
  parseNeedsInput,
  parseStickerInput,
} from "@/lib/stickers/parse";

const PENDING_INVITE_COOKIE = "pending_invite_code";

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
  cookieStore.set(PENDING_INVITE_COOKIE, normalizeInviteCode(code), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
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

  const code = normalizeInviteCode(inviteCode);
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name")
    .eq("invite_code", code)
    .single();

  if (groupError || !group) {
    return { error: "Grupo não encontrado. Verifique o código de convite." };
  }

  const { error: memberError } = await supabase.from("group_members").upsert(
    { group_id: group.id, user_id: user.id },
    { onConflict: "group_id,user_id" },
  );

  if (memberError) {
    return { error: "Não foi possível entrar no grupo." };
  }

  await supabase
    .from("profiles")
    .update({ active_group_id: group.id })
    .eq("id", user.id);

  revalidatePath("/home");
  revalidatePath("/grupo");
  revalidatePath("/trocas");
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

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, profiles(id, name, avatar_url)")
    .eq("group_id", groupId);

  if (!members) return null;

  const userIds = members.map((m) => m.user_id);

  const { data: allUserStickers } = await supabase
    .from("user_stickers")
    .select("user_id, quantity, stickers(code)")
    .in("user_id", userIds)
    .gt("quantity", 0);

  const { data: allUserNeeds } = await supabase
    .from("user_needs")
    .select("user_id, stickers(code)")
    .in("user_id", userIds);

  const duplicatesByUser = new Map<
    string,
    Array<{ code: string; quantity: number }>
  >();
  const needsByUser = new Map<string, string[]>();

  for (const row of allUserStickers ?? []) {
    const sticker = row.stickers as { code: string } | { code: string }[] | null;
    const code = Array.isArray(sticker) ? sticker[0]?.code : sticker?.code;
    if (!code) continue;
    const list = duplicatesByUser.get(row.user_id) ?? [];
    list.push({ code, quantity: row.quantity });
    duplicatesByUser.set(row.user_id, list);
  }

  for (const row of allUserNeeds ?? []) {
    const sticker = row.stickers as { code: string } | { code: string }[] | null;
    const code = Array.isArray(sticker) ? sticker[0]?.code : sticker?.code;
    if (!code) continue;
    const list = needsByUser.get(row.user_id) ?? [];
    list.push(code);
    needsByUser.set(row.user_id, list);
  }

  const currentDuplicates = duplicatesByUser.get(user.id) ?? [];
  const currentNeeds = needsByUser.get(user.id) ?? [];

  const memberData = members
    .filter((m) => m.user_id !== user.id)
    .map((m) => {
      const profile = m.profiles as
        | { id: string; name: string | null; avatar_url: string | null }
        | { id: string; name: string | null; avatar_url: string | null }[]
        | null;
      const p = Array.isArray(profile) ? profile[0] : profile;
      return {
        userId: m.user_id,
        name: p?.name ?? "Colecionador",
        avatarUrl: p?.avatar_url ?? null,
        duplicates: duplicatesByUser.get(m.user_id) ?? [],
        needs: needsByUser.get(m.user_id) ?? [],
      };
    });

  return {
    currentUserId: user.id,
    currentDuplicates,
    currentNeeds,
    members: memberData,
  };
}
