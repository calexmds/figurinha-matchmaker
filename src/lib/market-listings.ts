import type { SupabaseClient } from "@supabase/supabase-js";
import type { MarketOpportunity, StickerListing } from "@/lib/types";

type ListingRow = {
  id: string;
  user_id: string;
  group_id: string;
  sticker_id: string;
  listing_type: "sell" | "buy";
  price_note: string | null;
  created_at: string;
  profiles: { name: string | null } | { name: string | null }[] | null;
  groups: { name: string } | { name: string }[] | null;
  stickers: { code: string } | { code: string }[] | null;
};

function extractOne<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapListing(row: ListingRow, groupNames: Map<string, string>): StickerListing | null {
  const profile = extractOne(row.profiles);
  const group = extractOne(row.groups);
  const sticker = extractOne(row.stickers);
  if (!sticker?.code) return null;

  return {
    id: row.id,
    userId: row.user_id,
    userName: profile?.name?.trim() || "Colecionador",
    groupId: row.group_id,
    groupName: group?.name ?? groupNames.get(row.group_id) ?? "Grupo",
    stickerId: row.sticker_id,
    code: sticker.code,
    listingType: row.listing_type,
    priceNote: row.price_note,
    createdAt: row.created_at,
  };
}

export async function getListingsForGroups(
  supabase: SupabaseClient,
  groupIds: string[],
  groupNames: Map<string, string>,
): Promise<StickerListing[]> {
  if (groupIds.length === 0) return [];

  const { data, error } = await supabase
    .from("sticker_listings")
    .select(
      `
      id,
      user_id,
      group_id,
      sticker_id,
      listing_type,
      price_note,
      created_at,
      profiles(name),
      groups(name),
      stickers(code)
    `,
    )
    .in("group_id", groupIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getListingsForGroups", error.message);
    return [];
  }

  return (data as ListingRow[])
    .map((row) => mapListing(row, groupNames))
    .filter((item): item is StickerListing => !!item);
}

export async function getUserListings(
  supabase: SupabaseClient,
  userId: string,
  groupNames: Map<string, string>,
): Promise<StickerListing[]> {
  const { data, error } = await supabase
    .from("sticker_listings")
    .select(
      `
      id,
      user_id,
      group_id,
      sticker_id,
      listing_type,
      price_note,
      created_at,
      profiles(name),
      groups(name),
      stickers(code)
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserListings", error.message);
    return [];
  }

  return (data as ListingRow[])
    .map((row) => mapListing(row, groupNames))
    .filter((item): item is StickerListing => !!item);
}

export function computeMarketOpportunities(
  userId: string,
  duplicateCodes: Set<string>,
  needCodes: Set<string>,
  listings: StickerListing[],
): MarketOpportunity[] {
  const opportunities: MarketOpportunity[] = [];

  for (const listing of listings) {
    if (listing.userId === userId) continue;

    if (
      listing.listingType === "sell" &&
      needCodes.has(listing.code)
    ) {
      opportunities.push({ listing, kind: "buy_from" });
      continue;
    }

    if (
      listing.listingType === "buy" &&
      duplicateCodes.has(listing.code)
    ) {
      opportunities.push({ listing, kind: "sell_to" });
    }
  }

  return opportunities.sort((a, b) => {
    const priceA = a.listing.priceNote ? 1 : 0;
    const priceB = b.listing.priceNote ? 1 : 0;
    return priceB - priceA || a.listing.code.localeCompare(b.listing.code);
  });
}

export type MarketPageData = {
  ownListings: StickerListing[];
  opportunities: MarketOpportunity[];
  sellOptions: Array<{ code: string; groupId: string; groupName: string }>;
  buyOptions: Array<{ code: string; groupId: string; groupName: string }>;
};

export async function getMarketPageData(
  supabase: SupabaseClient,
  userId: string,
  groups: Array<{ id: string; name: string }>,
  duplicateCodes: string[],
  needCodes: string[],
): Promise<MarketPageData> {
  const groupNames = new Map(groups.map((g) => [g.id, g.name]));
  const groupIds = groups.map((g) => g.id);
  const dupSet = new Set(duplicateCodes);
  const needSet = new Set(needCodes);

  const [allListings, ownListings] = await Promise.all([
    getListingsForGroups(supabase, groupIds, groupNames),
    getUserListings(supabase, userId, groupNames),
  ]);

  const opportunities = computeMarketOpportunities(
    userId,
    dupSet,
    needSet,
    allListings,
  );

  const sellOptions: MarketPageData["sellOptions"] = [];
  const buyOptions: MarketPageData["buyOptions"] = [];

  for (const group of groups) {
    for (const code of duplicateCodes) {
      sellOptions.push({ code, groupId: group.id, groupName: group.name });
    }
    for (const code of needCodes) {
      buyOptions.push({ code, groupId: group.id, groupName: group.name });
    }
  }

  sellOptions.sort((a, b) => a.code.localeCompare(b.code));
  buyOptions.sort((a, b) => a.code.localeCompare(b.code));

  return {
    ownListings,
    opportunities,
    sellOptions,
    buyOptions,
  };
}

export async function resolveStickerId(
  supabase: SupabaseClient,
  code: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("stickers")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  return data?.id ?? null;
}

export function formatPriceLabel(priceNote: string | null): string {
  const trimmed = priceNote?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "A combinar";
}
