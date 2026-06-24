export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  active_group_id: string | null;
  collection_entry_mode?: CollectionEntryMode;
};

export type CollectionEntryMode = "unset" | "have" | "sparse";

export type Group = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
};

export type UserSticker = {
  sticker_id: string;
  code: string;
  quantity: number;
};

export type CollectionStats = {
  owned: number;
  missing: number;
  duplicates: number;
  percent: number;
};

export type HeatLevel = "common" | "wanted" | "hot" | "golden";

export type StickerMarketInfo = {
  code: string;
  demand: number;
  suppliers: number;
  supplierIds: string[];
  scarcity: number;
  level: HeatLevel;
  soleSupplierId: string | null;
};

export type GroupMarket = {
  memberCount: number;
  byCode: Map<string, StickerMarketInfo>;
};

export type UserPowerSticker = {
  code: string;
  demand: number;
  suppliers: number;
  level: HeatLevel;
  soleSupplier: boolean;
  bargainTip: string;
  suggestedAsk: number;
};

export type UserChaseSticker = {
  code: string;
  demand: number;
  suppliers: number;
  level: HeatLevel;
  competitors: number;
  chaseTip: string;
};

export type GroupIntelligence = {
  market: GroupMarket;
  powerStickers: UserPowerSticker[];
  chaseStickers: UserChaseSticker[];
  hotCodes: string[];
  goldenCodes: string[];
};

export type TradeMatch = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  receive: string[];
  give: string[];
  receiveCount: number;
  giveCount: number;
  score: number;
  heatScore?: number;
  bargainPower?: number;
  hotGive?: string[];
  hotReceive?: string[];
  bargainTip?: string | null;
};

export type StickerListingType = "sell" | "buy";

export type StickerListing = {
  id: string;
  userId: string;
  userName: string;
  groupId: string;
  groupName: string;
  stickerId: string;
  code: string;
  listingType: StickerListingType;
  priceNote: string | null;
  createdAt: string;
};

export type MarketOpportunity = {
  listing: StickerListing;
  /** Comprar de alguém que está vendendo */
  kind: "buy_from" | "sell_to";
};
