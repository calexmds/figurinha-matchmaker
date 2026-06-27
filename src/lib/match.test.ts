import { describe, expect, it } from "vitest";
import type { GroupMarket } from "@/lib/group-intelligence";
import {
  computeTradeEditPools,
  computeTradeMatches,
  computeTradeStats,
} from "@/lib/match";
import type { StickerMarketInfo } from "@/lib/types";

function marketWith(codes: Partial<Record<string, StickerMarketInfo>>): GroupMarket {
  const byCode = new Map<string, StickerMarketInfo>();
  for (const [code, info] of Object.entries(codes)) {
    if (info) byCode.set(code, info);
  }
  return { memberCount: 3, byCode };
}

describe("computeTradeEditPools", () => {
  it("returns intersection of your duplicates and partner needs", () => {
    const result = computeTradeEditPools(
      [
        { code: "BRA01", quantity: 2 },
        { code: "ARG05", quantity: 2 },
      ],
      ["MEX01", "BRA02"],
      [{ code: "MEX01", quantity: 2 }],
      ["BRA01"],
    );

    expect(result.givePool).toEqual(["BRA01"]);
    expect(result.receivePool).toEqual(["MEX01"]);
  });

  it("is case-insensitive for code matching", () => {
    const result = computeTradeEditPools(
      [{ code: "bra01", quantity: 2 }],
      ["mex01"],
      [{ code: "MEX01", quantity: 1 }],
      ["BRA01"],
    );

    expect(result.givePool).toEqual(["bra01"]);
    expect(result.receivePool).toEqual(["mex01"]);
  });
});

describe("computeTradeMatches", () => {
  const userId = "user-a";
  const partnerId = "user-b";

  it("returns empty when there is no overlap", () => {
    const matches = computeTradeMatches(
      userId,
      [{ code: "BRA01", quantity: 2 }],
      ["ARG01"],
      [
        {
          userId: partnerId,
          name: "Parceiro",
          avatarUrl: null,
          duplicates: [{ code: "MEX01", quantity: 2 }],
          needs: ["BRA02"],
        },
      ],
    );

    expect(matches).toEqual([]);
  });

  it("builds a balanced bilateral trade", () => {
    const matches = computeTradeMatches(
      userId,
      [{ code: "BRA01", quantity: 2 }],
      ["MEX01"],
      [
        {
          userId: partnerId,
          name: "Parceiro",
          avatarUrl: null,
          duplicates: [{ code: "MEX01", quantity: 2 }],
          needs: ["BRA01"],
        },
      ],
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].give).toEqual(["BRA01"]);
    expect(matches[0].receive).toEqual(["MEX01"]);
    expect(matches[0].giveCount).toBe(1);
    expect(matches[0].receiveCount).toBe(1);
  });

  it("caps each side at 8 stickers on large overlaps", () => {
    const codes = Array.from({ length: 20 }, (_, i) =>
      `BRA${String(i + 1).padStart(2, "0")}`,
    );
    const myDuplicates = codes.map((code) => ({ code, quantity: 2 }));
    const partnerNeeds = [...codes];
    const partnerDuplicates = codes.map((code) => ({ code, quantity: 2 }));
    const myNeeds = [...codes];

    const matches = computeTradeMatches(
      userId,
      myDuplicates,
      myNeeds,
      [
        {
          userId: partnerId,
          name: "Parceiro",
          avatarUrl: null,
          duplicates: partnerDuplicates,
          needs: partnerNeeds,
        },
      ],
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].give.length).toBeLessThanOrEqual(8);
    expect(matches[0].receive.length).toBeLessThanOrEqual(8);
  });

  it("avoids bundling golden give without worthy receive", () => {
    const market = marketWith({
      FWC1: {
        code: "FWC1",
        demand: 4,
        suppliers: 1,
        supplierIds: [userId],
        scarcity: 0.8,
        level: "golden",
        soleSupplierId: userId,
      },
      BRA01: {
        code: "BRA01",
        demand: 1,
        suppliers: 2,
        supplierIds: [partnerId, "other"],
        scarcity: 0.2,
        level: "common",
        soleSupplierId: null,
      },
    });

    const matches = computeTradeMatches(
      userId,
      [
        { code: "FWC1", quantity: 2 },
        { code: "BRA02", quantity: 2 },
        { code: "BRA03", quantity: 2 },
      ],
      ["BRA01"],
      [
        {
          userId: partnerId,
          name: "Parceiro",
          avatarUrl: null,
          duplicates: [{ code: "BRA01", quantity: 2 }],
          needs: ["FWC1", "BRA02", "BRA03"],
        },
      ],
      market,
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].give).not.toContain("FWC1");
    expect(matches[0].give.length).toBeGreaterThan(0);
  });

  it("ignores one-sided overlaps (receive only or give only)", () => {
    const receiveOnly = computeTradeMatches(
      userId,
      [],
      ["FWC16", "CPV09", "RSA03"],
      [
        {
          userId: partnerId,
          name: "Rafaella",
          avatarUrl: null,
          duplicates: [
            { code: "FWC16", quantity: 2 },
            { code: "CPV09", quantity: 2 },
            { code: "RSA03", quantity: 2 },
          ],
          needs: ["BRA01"],
        },
      ],
    );

    expect(receiveOnly).toEqual([]);

    const giveOnly = computeTradeMatches(
      userId,
      [
        { code: "BRA01", quantity: 2 },
        { code: "BRA02", quantity: 2 },
      ],
      [],
      [
        {
          userId: partnerId,
          name: "Parceiro",
          avatarUrl: null,
          duplicates: [{ code: "MEX01", quantity: 2 }],
          needs: ["BRA01", "BRA02"],
        },
      ],
    );

    expect(giveOnly).toEqual([]);
  });

  it("sorts matches by score descending", () => {
    const matches = computeTradeMatches(
      userId,
      [
        { code: "BRA01", quantity: 2 },
        { code: "BRA02", quantity: 2 },
      ],
      ["MEX01", "MEX02"],
      [
        {
          userId: "partner-1",
          name: "Ana",
          avatarUrl: null,
          duplicates: [{ code: "MEX01", quantity: 2 }],
          needs: ["BRA01"],
        },
        {
          userId: "partner-2",
          name: "Bob",
          avatarUrl: null,
          duplicates: [
            { code: "MEX01", quantity: 2 },
            { code: "MEX02", quantity: 2 },
          ],
          needs: ["BRA01", "BRA02"],
        },
      ],
    );

    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score);
  });
});

describe("computeTradeStats", () => {
  it("sums duplicate quantities and counts need types", () => {
    const stats = computeTradeStats(
      [
        { code: "BRA01", quantity: 3 },
        { code: "ARG02", quantity: 1 },
      ],
      ["MEX01", "MEX02"],
    );

    expect(stats).toEqual({
      duplicateTypes: 2,
      duplicateCount: 4,
      needCount: 2,
    });
  });
});
