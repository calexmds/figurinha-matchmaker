"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { APP_URL } from "@/lib/constants";
import { generateInviteCode, normalizeInviteCode } from "@/lib/invite";
import {
  parseStickerInput,
  parseStickerLines,
} from "@/lib/stickers/parse";
import { createClient } from "@/lib/supabase/server";

const PENDING_INVITE_COOKIE = "pending_invite_code";

export async function signInWithGoogle(returnTo?: string) {
  const supabase = await createClient();
  const redirectTo = `${APP_URL}/auth/callback${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
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

export async function saveStickers(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const mode = String(formData.get("mode") ?? "paste");
  const raw = String(formData.get("stickers") ?? "");
  const parsed =
    mode === "lines" ? parseStickerLines(raw) : parseStickerInput(raw);

  if (parsed.length === 0) {
    return { error: "Nenhum código válido encontrado." };
  }

  const codes = parsed.map((item) => item.code);
  const { data: stickerRows, error: stickerError } = await supabase
    .from("stickers")
    .select("id, code")
    .in("code", codes);

  if (stickerError || !stickerRows) {
    return { error: "Erro ao buscar figurinhas." };
  }

  const codeToId = new Map(stickerRows.map((row) => [row.code, row.id]));
  const upserts = parsed
    .filter((item) => codeToId.has(item.code))
    .map((item) => ({
      user_id: user.id,
      sticker_id: codeToId.get(item.code)!,
      quantity: item.quantity,
      updated_at: new Date().toISOString(),
    }));

  const { error: upsertError } = await supabase
    .from("user_stickers")
    .upsert(upserts, { onConflict: "user_id,sticker_id" });

  if (upsertError) {
    return { error: "Erro ao salvar figurinhas." };
  }

  revalidatePath("/home");
  revalidatePath("/trocas");
  revalidatePath("/onboarding");
  redirect("/home");
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

  const { data: allStickerCodes } = await supabase
    .from("stickers")
    .select("code")
    .order("sort_order");

  const inventoryByUser = new Map<
    string,
    Array<{ code: string; quantity: number }>
  >();

  for (const row of allUserStickers ?? []) {
    const sticker = row.stickers as { code: string } | { code: string }[] | null;
    const code = Array.isArray(sticker) ? sticker[0]?.code : sticker?.code;
    if (!code) continue;
    const list = inventoryByUser.get(row.user_id) ?? [];
    list.push({ code, quantity: row.quantity });
    inventoryByUser.set(row.user_id, list);
  }

  const currentStickers = inventoryByUser.get(user.id) ?? [];
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
        stickers: inventoryByUser.get(m.user_id) ?? [],
      };
    });

  return {
    currentUserId: user.id,
    currentStickers,
    members: memberData,
    allCodes: (allStickerCodes ?? []).map((s) => s.code),
  };
}
