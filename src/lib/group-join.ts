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

export async function joinGroupForUser(
  supabase: SupabaseClient,
  user: User,
  inviteCodeRaw: string,
): Promise<JoinGroupResult> {
  await ensureProfile(supabase, user);

  const code = normalizeInviteCode(inviteCodeRaw);
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name")
    .eq("invite_code", code)
    .maybeSingle();

  if (groupError) {
    return {
      ok: false,
      error: "Erro ao buscar o grupo.",
      detail: groupError.message,
    };
  }
  if (!group) {
    return { ok: false, error: "Grupo não encontrado. Verifique o convite." };
  }

  const { data: existing } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: memberError } = await supabase.from("group_members").upsert(
      { group_id: group.id, user_id: user.id },
      { onConflict: "group_id,user_id" },
    );

    if (memberError) {
      return {
        ok: false,
        error: "Não foi possível entrar no grupo.",
        detail: memberError.message,
      };
    }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ active_group_id: group.id })
    .eq("id", user.id);

  if (profileError) {
    return {
      ok: false,
      error: "Entrou no grupo, mas não foi possível ativar o grupo.",
      detail: profileError.message,
    };
  }

  revalidatePath("/home");
  revalidatePath("/grupo");
  revalidatePath("/trocas");
  revalidatePath("/onboarding");

  return {
    ok: true,
    groupId: group.id,
    groupName: group.name,
    alreadyMember: !!existing,
  };
}
