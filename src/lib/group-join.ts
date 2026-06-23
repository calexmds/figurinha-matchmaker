import { revalidatePath } from "next/cache";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { normalizeInviteCode } from "@/lib/invite";

export type JoinGroupResult =
  | { ok: true; groupId: string; groupName: string; alreadyMember?: boolean }
  | { ok: false; error: string; detail?: string };

export async function ensureProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  const meta = user.user_metadata ?? {};
  const name =
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Colecionador";

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      name,
      email: user.email ?? null,
      avatar_url: (meta.avatar_url as string | undefined) ?? null,
    },
    { onConflict: "id" },
  );
}

export async function lookupGroupByInvite(
  supabase: SupabaseClient,
  inviteCodeRaw: string,
): Promise<{ id: string; name: string; invite_code: string } | null> {
  const code = normalizeInviteCode(inviteCodeRaw);
  const { data, error } = await supabase.rpc("get_group_by_invite", {
    p_invite_code: code,
  });

  if (error || !data) return null;

  const row = data as {
    id?: string;
    name?: string;
    invite_code?: string;
  } | null;

  if (!row?.id) return null;

  return {
    id: row.id,
    name: row.name ?? "Grupo",
    invite_code: row.invite_code ?? code,
  };
}

export async function joinGroupForUser(
  supabase: SupabaseClient,
  user: User,
  inviteCodeRaw: string,
): Promise<JoinGroupResult> {
  await ensureProfile(supabase, user);

  const code = normalizeInviteCode(inviteCodeRaw);

  const { data, error } = await supabase.rpc("join_group_by_invite", {
    p_invite_code: code,
  });

  if (error) {
    return {
      ok: false,
      error: "Erro ao entrar no grupo.",
      detail: error.message,
    };
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    id?: string;
    name?: string;
  } | null;

  if (!payload?.ok || !payload.id) {
    if (payload?.error === "not_found") {
      return { ok: false, error: "Grupo não encontrado. Verifique o convite." };
    }
    return { ok: false, error: "Não foi possível entrar no grupo." };
  }

  revalidatePath("/home");
  revalidatePath("/grupo");
  revalidatePath("/trocas");
  revalidatePath("/onboarding");

  return {
    ok: true,
    groupId: payload.id,
    groupName: payload.name ?? "Grupo",
  };
}
