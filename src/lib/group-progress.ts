import { TOTAL_STICKERS } from "@/lib/constants";
import type { GroupTradeData } from "@/lib/group-trade-data";
import type { GroupMemberRow } from "@/lib/groups";

export type GroupMemberProgress = {
  userId: string;
  name: string;
  hasRegistered: boolean;
  ownedCount: number;
};

export type GroupProgress = {
  memberCount: number;
  registeredCount: number;
  collectiveOwnedCount: number;
  collectivePercent: number;
  members: GroupMemberProgress[];
  pendingMembers: GroupMemberProgress[];
};

export function buildGroupProgress(
  groupMembers: GroupMemberRow[],
  tradeData: GroupTradeData | null,
  currentUserId: string,
): GroupProgress {
  const memberCount = groupMembers.length;

  if (!tradeData) {
    const empty = groupMembers.map((m) => ({
      userId: m.userId,
      name: m.name,
      hasRegistered: false,
      ownedCount: 0,
    }));
    return {
      memberCount,
      registeredCount: 0,
      collectiveOwnedCount: 0,
      collectivePercent: 0,
      members: empty,
      pendingMembers: empty,
    };
  }

  const tradeById = new Map(tradeData.members.map((m) => [m.userId, m]));

  const members: GroupMemberProgress[] = groupMembers.map((gm) => {
    if (gm.userId === currentUserId) {
      return {
        userId: gm.userId,
        name: gm.name,
        hasRegistered: tradeData.currentHasRegistered,
        ownedCount: tradeData.currentOwnedCount,
      };
    }
    const tm = tradeById.get(gm.userId);
    return {
      userId: gm.userId,
      name: gm.name,
      hasRegistered: tm?.hasRegistered ?? false,
      ownedCount: tm?.ownedCount ?? 0,
    };
  });

  const registeredCount = members.filter((m) => m.hasRegistered).length;
  const pendingMembers = members.filter((m) => !m.hasRegistered);

  return {
    memberCount,
    registeredCount,
    collectiveOwnedCount: tradeData.meta.collectiveUniqueOwned,
    collectivePercent: Math.round(
      (tradeData.meta.collectiveUniqueOwned / TOTAL_STICKERS) * 100,
    ),
    members,
    pendingMembers,
  };
}

export function formatRegistrationSummary(
  groupName: string,
  progress: GroupProgress,
): string {
  if (progress.memberCount <= 1) {
    return `${groupName}: convide mais alguém para trocar`;
  }
  return `${groupName}: ${progress.registeredCount} de ${progress.memberCount} já cadastraram`;
}
