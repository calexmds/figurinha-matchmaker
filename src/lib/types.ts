export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  active_group_id: string | null;
};

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

export type TradeMatch = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  receive: string[];
  give: string[];
  receiveCount: number;
  giveCount: number;
  score: number;
};
