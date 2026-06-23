import type { SupabaseClient } from "@supabase/supabase-js";

export type GroupMemberRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  joinedAt: string;
};

export type UserGroupDetail = {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  isOwner: boolean;
  memberCount: number;
  members: GroupMemberRow[];
};

export async function getUserGroupsWithMembers(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserGroupDetail[]> {
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name, invite_code, owner_id)")
    .eq("user_id", userId);

  const groups = (memberships ?? [])
    .map((m) => {
      const g = m.groups as
        | { id: string; name: string; invite_code: string; owner_id: string }
        | { id: string; name: string; invite_code: string; owner_id: string }[]
        | null;
      return Array.isArray(g) ? g[0] : g;
    })
    .filter((g): g is NonNullable<typeof g> => !!g);

  if (groups.length === 0) return [];

  const groupIds = groups.map((g) => g.id);
  const { data: memberRows } = await supabase
    .from("group_members")
    .select("group_id, user_id, joined_at, profiles(name, avatar_url)")
    .in("group_id", groupIds)
    .order("joined_at", { ascending: true });

  const membersByGroup = new Map<string, GroupMemberRow[]>();

  for (const row of memberRows ?? []) {
    const profile = row.profiles as
      | { name: string | null; avatar_url: string | null }
      | { name: string | null; avatar_url: string | null }[]
      | null;
    const p = Array.isArray(profile) ? profile[0] : profile;
    const list = membersByGroup.get(row.group_id) ?? [];
    list.push({
      userId: row.user_id,
      name: p?.name ?? "Colecionador",
      avatarUrl: p?.avatar_url ?? null,
      joinedAt: row.joined_at,
    });
    membersByGroup.set(row.group_id, list);
  }

  return groups
    .map((g) => ({
      id: g.id,
      name: g.name,
      inviteCode: g.invite_code,
      ownerId: g.owner_id,
      isOwner: g.owner_id === userId,
      memberCount: membersByGroup.get(g.id)?.length ?? 0,
      members: membersByGroup.get(g.id) ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function getUserGroupIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<Array<{ id: string; name: string }>> {
  const groups = await getUserGroupsWithMembers(supabase, userId);
  return groups.map((g) => ({ id: g.id, name: g.name }));
}
