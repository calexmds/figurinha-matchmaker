import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyReservationsToLists,
  countTradesNeedingAttention,
  getUserReservations,
  type PendingTrade,
  type TradeReservations,
} from "@/lib/trades";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
  getUserCollection: vi.fn(),
}));

function trade(overrides: Partial<PendingTrade>): PendingTrade {
  return {
    id: "t1",
    groupId: "g1",
    groupName: "Grupo",
    partnerId: "p1",
    partnerName: "Parceiro",
    give: [],
    receive: [],
    status: "proposed",
    role: "partner",
    createdAt: "2026-01-01T00:00:00Z",
    myConfirmed: false,
    partnerConfirmed: false,
    ...overrides,
  };
}

describe("applyReservationsToLists", () => {
  it("subtracts reserved give quantities from duplicates", () => {
    const reservations: TradeReservations = {
      give: new Map([["BRA01", 1]]),
      receive: new Set(),
    };

    const { availableDuplicates, availableNeeds } = applyReservationsToLists(
      [
        { code: "BRA01", quantity: 3 },
        { code: "ARG02", quantity: 1 },
      ],
      ["MEX01"],
      reservations,
    );

    expect(availableDuplicates).toEqual([
      { code: "BRA01", quantity: 2 },
      { code: "ARG02", quantity: 1 },
    ]);
    expect(availableNeeds).toEqual(["MEX01"]);
  });

  it("removes needs reserved in another trade", () => {
    const reservations: TradeReservations = {
      give: new Map(),
      receive: new Set(["MEX01"]),
    };

    const { availableNeeds } = applyReservationsToLists(
      [{ code: "BRA01", quantity: 2 }],
      ["MEX01", "MEX02"],
      reservations,
    );

    expect(availableNeeds).toEqual(["MEX02"]);
  });

  it("drops duplicates fully reserved for trade", () => {
    const reservations: TradeReservations = {
      give: new Map([["BRA01", 2]]),
      receive: new Set(),
    };

    const { availableDuplicates } = applyReservationsToLists(
      [{ code: "BRA01", quantity: 2 }],
      [],
      reservations,
    );

    expect(availableDuplicates).toEqual([]);
  });
});

describe("countTradesNeedingAttention", () => {
  it("counts incoming proposals", () => {
    const count = countTradesNeedingAttention([
      trade({ status: "proposed", role: "partner" }),
      trade({ status: "proposed", role: "initiator", id: "t2" }),
    ]);

    expect(count).toBe(1);
  });

  it("counts active trades awaiting my confirmation", () => {
    const count = countTradesNeedingAttention([
      trade({ status: "active", myConfirmed: false }),
      trade({
        status: "active",
        id: "t2",
        myConfirmed: true,
        partnerConfirmed: false,
      }),
    ]);

    expect(count).toBe(1);
  });

  it("ignores trades waiting only on the partner", () => {
    const count = countTradesNeedingAttention([
      trade({
        status: "active",
        myConfirmed: true,
        partnerConfirmed: false,
      }),
    ]);

    expect(count).toBe(0);
  });
});

type MockTradeRow = {
  id: string;
  user_id: string;
  partner_id: string;
  status: string;
};

type MockItemRow = {
  trade_id: string;
  side: "give" | "receive";
  quantity: number;
  stickers: { code: string };
};

function createReservationsMockSupabase(
  trades: MockTradeRow[],
  items: MockItemRow[],
): SupabaseClient {
  return {
    from: (table: string) => ({
      select: () => {
        if (table === "trades") {
          return {
            in: () => ({
              or: async () => ({ data: trades, error: null }),
            }),
          };
        }
        if (table === "trade_items") {
          return {
            in: async () => ({ data: items, error: null }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    }),
  } as unknown as SupabaseClient;
}

describe("getUserReservations", () => {
  const userId = "user-a";
  const partnerId = "user-b";

  it("reserves initiator give and receive on proposed trades", async () => {
    const supabase = createReservationsMockSupabase(
      [
        {
          id: "trade-1",
          user_id: userId,
          partner_id: partnerId,
          status: "proposed",
        },
      ],
      [
        {
          trade_id: "trade-1",
          side: "give",
          quantity: 1,
          stickers: { code: "BRA01" },
        },
        {
          trade_id: "trade-1",
          side: "receive",
          quantity: 1,
          stickers: { code: "MEX01" },
        },
      ],
    );

    const reservations = await getUserReservations(supabase, userId);

    expect(reservations.give.get("BRA01")).toBe(1);
    expect(reservations.receive.has("MEX01")).toBe(true);
  });

  it("reserves both sides for active trades", async () => {
    const supabase = createReservationsMockSupabase(
      [
        {
          id: "trade-1",
          user_id: userId,
          partner_id: partnerId,
          status: "active",
        },
      ],
      [
        {
          trade_id: "trade-1",
          side: "give",
          quantity: 1,
          stickers: { code: "BRA01" },
        },
        {
          trade_id: "trade-1",
          side: "receive",
          quantity: 1,
          stickers: { code: "MEX01" },
        },
      ],
    );

    const reservations = await getUserReservations(supabase, userId);

    expect(reservations.give.get("BRA01")).toBe(1);
    expect(reservations.receive.has("MEX01")).toBe(true);
  });

  it("excludes the current trade when exceptTradeId is set", async () => {
    const supabase = createReservationsMockSupabase(
      [
        {
          id: "trade-1",
          user_id: userId,
          partner_id: partnerId,
          status: "active",
        },
      ],
      [
        {
          trade_id: "trade-1",
          side: "give",
          quantity: 1,
          stickers: { code: "BRA01" },
        },
      ],
    );

    const reservations = await getUserReservations(
      supabase,
      userId,
      "trade-1",
    );

    expect(reservations.give.size).toBe(0);
    expect(reservations.receive.size).toBe(0);
  });

  it("maps partner reservations on active trades from initiator perspective", async () => {
    const supabase = createReservationsMockSupabase(
      [
        {
          id: "trade-1",
          user_id: partnerId,
          partner_id: userId,
          status: "active",
        },
      ],
      [
        {
          trade_id: "trade-1",
          side: "give",
          quantity: 1,
          stickers: { code: "ARG01" },
        },
        {
          trade_id: "trade-1",
          side: "receive",
          quantity: 1,
          stickers: { code: "BRA01" },
        },
      ],
    );

    const reservations = await getUserReservations(supabase, userId);

    expect(reservations.give.get("BRA01")).toBe(1);
    expect(reservations.receive.has("ARG01")).toBe(true);
  });
});
