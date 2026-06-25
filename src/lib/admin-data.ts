import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectionEntryMode } from "@/lib/types";

export type AdminSummary = {
  totalUsers: number;
  activeUsers7d: number;
  usersWithCollection: number;
  totalGroups: number;
  totalMemberships: number;
  totalListings: number;
  tradesProposed: number;
  tradesActive: number;
  tradesCompleted: number;
  tradesCancelled: number;
};

export type AdminSignupDay = {
  date: string;
  count: number;
};

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  entryMode: CollectionEntryMode;
  hasCollection: boolean;
  groupCount: number;
  lastActivityAt: string | null;
};

export type AdminTradeRow = {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  groupName: string;
  userName: string;
  userEmail: string | null;
  partnerName: string;
  partnerEmail: string | null;
};

export type AdminDashboard = {
  summary: AdminSummary;
  signupsByDay: AdminSignupDay[];
  users: AdminUserRow[];
  recentTrades: AdminTradeRow[];
};

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function maxIso(dates: Array<string | null | undefined>): string | null {
  const valid = dates.filter((d): d is string => !!d);
  if (valid.length === 0) return null;
  return valid.sort().at(-1) ?? null;
}

function bucketSignupsByDay(
  createdAts: string[],
  days = 14,
): AdminSignupDay[] {
  const buckets = new Map<string, number>();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const createdAt of createdAts) {
    const key = createdAt.slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const admin = createAdminClient();
  const since7d = isoDaysAgo(7);
  const since14d = isoDaysAgo(14);

  const [
    profilesRes,
    groupsRes,
    membershipsRes,
    listingsRes,
    tradesRes,
    stickersRes,
    needsRes,
    recentStickersRes,
    recentNeedsRes,
    recentMembersRes,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, name, email, created_at, collection_entry_mode")
      .order("created_at", { ascending: false })
      .limit(250),
    admin.from("groups").select("id", { count: "exact", head: true }),
    admin.from("group_members").select("user_id, group_id, joined_at"),
    admin.from("sticker_listings").select("id", { count: "exact", head: true }),
    admin.from("trades").select("id, status, created_at, completed_at, user_id, partner_id, group_id"),
    admin.from("user_stickers").select("user_id, updated_at"),
    admin.from("user_needs").select("user_id, updated_at"),
    admin.from("user_stickers").select("user_id").gte("updated_at", since7d),
    admin.from("user_needs").select("user_id").gte("updated_at", since7d),
    admin.from("group_members").select("user_id").gte("joined_at", since7d),
  ]);

  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (groupsRes.error) throw new Error(groupsRes.error.message);
  if (membershipsRes.error) throw new Error(membershipsRes.error.message);
  if (listingsRes.error) throw new Error(listingsRes.error.message);
  if (tradesRes.error) throw new Error(tradesRes.error.message);
  if (stickersRes.error) throw new Error(stickersRes.error.message);
  if (needsRes.error) throw new Error(needsRes.error.message);

  const profiles = profilesRes.data ?? [];
  const trades = tradesRes.data ?? [];
  const memberships = membershipsRes.data ?? [];
  const stickers = stickersRes.data ?? [];
  const needs = needsRes.data ?? [];

  const groupCountByUser = new Map<string, number>();
  for (const m of memberships) {
    groupCountByUser.set(m.user_id, (groupCountByUser.get(m.user_id) ?? 0) + 1);
  }

  const lastStickerByUser = new Map<string, string>();
  for (const row of stickers) {
    const prev = lastStickerByUser.get(row.user_id);
    if (!prev || row.updated_at > prev) {
      lastStickerByUser.set(row.user_id, row.updated_at);
    }
  }

  const lastNeedByUser = new Map<string, string>();
  for (const row of needs) {
    const prev = lastNeedByUser.get(row.user_id);
    if (!prev || row.updated_at > prev) {
      lastNeedByUser.set(row.user_id, row.updated_at);
    }
  }

  const usersWithStickers = new Set(stickers.map((r) => r.user_id));
  const usersWithNeeds = new Set(needs.map((r) => r.user_id));

  const activeUsers7d = new Set<string>();
  for (const row of recentStickersRes.data ?? []) activeUsers7d.add(row.user_id);
  for (const row of recentNeedsRes.data ?? []) activeUsers7d.add(row.user_id);
  for (const row of recentMembersRes.data ?? []) activeUsers7d.add(row.user_id);

  const usersWithCollection = new Set([
    ...usersWithStickers,
    ...usersWithNeeds,
  ]).size;

  const tradeCounts = { proposed: 0, active: 0, completed: 0, cancelled: 0 };
  for (const t of trades) {
    if (t.status === "proposed") tradeCounts.proposed++;
    else if (t.status === "active") tradeCounts.active++;
    else if (t.status === "completed") tradeCounts.completed++;
    else if (t.status === "cancelled") tradeCounts.cancelled++;
  }

  const profileById = new Map(
    profiles.map((p) => [
      p.id,
      { name: p.name, email: p.email },
    ]),
  );
  const groupIds = [...new Set(trades.map((t) => t.group_id))];
  const { data: groups } =
    groupIds.length > 0
      ? await admin.from("groups").select("id, name").in("id", groupIds)
      : { data: [] as Array<{ id: string; name: string }> };
  const groupById = new Map((groups ?? []).map((g) => [g.id, g.name]));

  const sortedTrades = [...trades].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const topTrades = sortedTrades.slice(0, 40);
  const tradeUserIds = [
    ...new Set(topTrades.flatMap((t) => [t.user_id, t.partner_id])),
  ].filter((id) => !profileById.has(id));

  if (tradeUserIds.length > 0) {
    const { data: extraProfiles } = await admin
      .from("profiles")
      .select("id, name, email")
      .in("id", tradeUserIds);
    for (const p of extraProfiles ?? []) {
      profileById.set(p.id, { name: p.name, email: p.email });
    }
  }

  const recentTrades: AdminTradeRow[] = topTrades.map((t) => {
    const user = profileById.get(t.user_id);
    const partner = profileById.get(t.partner_id);
    return {
      id: t.id,
      status: t.status,
      createdAt: t.created_at,
      completedAt: t.completed_at,
      groupName: groupById.get(t.group_id) ?? "—",
      userName: user?.name ?? "—",
      userEmail: user?.email ?? null,
      partnerName: partner?.name ?? "—",
      partnerEmail: partner?.email ?? null,
    };
  });

  const signupsInWindow = profiles.filter(
    (p) => p.created_at >= since14d,
  );

  const users: AdminUserRow[] = profiles.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    createdAt: p.created_at,
    entryMode: (p.collection_entry_mode as CollectionEntryMode) ?? "unset",
    hasCollection: usersWithStickers.has(p.id) || usersWithNeeds.has(p.id),
    groupCount: groupCountByUser.get(p.id) ?? 0,
    lastActivityAt: maxIso([
      lastStickerByUser.get(p.id),
      lastNeedByUser.get(p.id),
      p.created_at,
    ]),
  }));

  const { count: totalUsersCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });

  return {
    summary: {
      totalUsers: totalUsersCount ?? profiles.length,
      activeUsers7d: activeUsers7d.size,
      usersWithCollection,
      totalGroups: groupsRes.count ?? 0,
      totalMemberships: memberships.length,
      totalListings: listingsRes.count ?? 0,
      tradesProposed: tradeCounts.proposed,
      tradesActive: tradeCounts.active,
      tradesCompleted: tradeCounts.completed,
      tradesCancelled: tradeCounts.cancelled,
    },
    signupsByDay: bucketSignupsByDay(
      signupsInWindow.map((p) => p.created_at),
      14,
    ),
    users,
    recentTrades,
  };
}
