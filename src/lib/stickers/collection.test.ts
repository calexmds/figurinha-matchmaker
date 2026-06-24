import { describe, expect, it } from "vitest";
import {
  buildOwnedMapFromRaw,
  resolveOwnedForMember,
} from "@/lib/stickers/collection-mode";
import {
  countOwnedTypes,
  countRepetidasTotal,
  defaultGabaritoTab,
  deriveNeeds,
  deriveTradeDuplicates,
  getCatalogCodes,
  isSparseMode,
  isValidCatalogCode,
  ownedMapFromLegacy,
  ownedMapFromList,
  resolveOwnedMap,
  tradeableQuantity,
  userNeedsCode,
} from "@/lib/stickers/collection";

describe("ownedMapFromList", () => {
  it("ignores zero quantities and normalizes codes", () => {
    expect(
      ownedMapFromList([
        { code: "bra01", quantity: 2 },
        { code: "ARG05", quantity: 0 },
      ]),
    ).toEqual({ BRA01: 2 });
  });
});

describe("resolveOwnedMap — modo have", () => {
  it("returns explicit rows only", () => {
    const map = resolveOwnedMap(
      "have",
      [
        { code: "BRA01", quantity: 2 },
        { code: "MEX01", quantity: 1 },
      ],
      ["ARG01"],
    );

    expect(map).toEqual({ BRA01: 2, MEX01: 1 });
  });
});

describe("resolveOwnedMap — modo sparse", () => {
  it("assumes 1 of every catalog sticker by default", () => {
    const map = resolveOwnedMap("sparse", [], []);
    expect(map.BRA01).toBe(1);
    expect(map.FWC1).toBe(1);
    expect(Object.keys(map).length).toBe(getCatalogCodes().length);
  });

  it("marks explicit needs as missing (qty 0)", () => {
    const map = resolveOwnedMap("sparse", [], ["BRA01", "MEX07"]);
    expect(map.BRA01).toBe(0);
    expect(map.MEX07).toBe(0);
    expect(map.ARG01).toBe(1);
  });

  it("stores duplicates only when quantity > 1", () => {
    const map = resolveOwnedMap(
      "sparse",
      [
        { code: "BRA01", quantity: 1 },
        { code: "BRA02", quantity: 3 },
      ],
      [],
    );

    expect(map.BRA01).toBe(1);
    expect(map.BRA02).toBe(3);
  });

  it("does not treat qty=1 rows as overriding implicit album copy", () => {
    const map = resolveOwnedMap(
      "sparse",
      [{ code: "BRA01", quantity: 1 }],
      ["BRA01"],
    );

    expect(map.BRA01).toBe(0);
  });
});

describe("deriveNeeds and deriveTradeDuplicates", () => {
  it("derives needs from have-mode owned map", () => {
    const owned = ownedMapFromList([
      { code: "BRA01", quantity: 1 },
      { code: "BRA02", quantity: 2 },
    ]);

    expect(deriveNeeds(owned)).toContain("MEX01");
    expect(deriveNeeds(owned)).not.toContain("BRA01");
    expect(deriveNeeds(owned)).not.toContain("BRA02");
  });

  it("derives trade duplicates as extras beyond first copy", () => {
    const owned = ownedMapFromList([{ code: "BRA02", quantity: 3 }]);
    expect(deriveTradeDuplicates(owned)).toEqual([
      { code: "BRA02", quantity: 2 },
    ]);
  });

  it("sparse: implicit singles are not trade duplicates", () => {
    const owned = resolveOwnedMap("sparse", [], ["BRA01"]);
    expect(deriveTradeDuplicates(owned)).toEqual([]);
    expect(deriveNeeds(owned)).toContain("BRA01");
    expect(deriveNeeds(owned)).not.toContain("BRA02");
  });

  it("sparse: explicit qty>1 produces repetidas", () => {
    const owned = resolveOwnedMap(
      "sparse",
      [{ code: "BRA03", quantity: 4 }],
      [],
    );
    expect(deriveTradeDuplicates(owned)).toEqual([
      { code: "BRA03", quantity: 3 },
    ]);
  });
});

describe("ownedMapFromLegacy", () => {
  it("does not inflate quantities when there are no needs rows", () => {
    const map = ownedMapFromLegacy([{ code: "BRA01", quantity: 2 }], []);
    expect(map).toEqual({ BRA01: 2 });
  });

  it("adds one album copy when legacy needs existed", () => {
    const map = ownedMapFromLegacy([{ code: "BRA01", quantity: 1 }], ["MEX01"]);
    expect(map.BRA01).toBe(2);
  });
});

describe("tradeableQuantity and userNeedsCode", () => {
  it("reserves one copy for the album", () => {
    expect(tradeableQuantity(3, 0)).toBe(2);
    expect(tradeableQuantity(1, 0)).toBe(0);
  });

  it("subtracts open-trade reservations", () => {
    expect(tradeableQuantity(3, 1)).toBe(1);
    expect(tradeableQuantity(2, 2)).toBe(0);
  });

  it("detects missing stickers for receive validation", () => {
    const owned = { BRA01: 0, BRA02: 1 };
    expect(userNeedsCode(owned, "BRA01")).toBe(true);
    expect(userNeedsCode(owned, "BRA02")).toBe(false);
  });
});

describe("collection mode helpers", () => {
  it("identifies sparse mode and default tab", () => {
    expect(isSparseMode("sparse")).toBe(true);
    expect(isSparseMode("have")).toBe(false);
    expect(defaultGabaritoTab("sparse")).toBe("preciso");
    expect(defaultGabaritoTab("have")).toBe("tenho");
  });

  it("validates catalog codes", () => {
    expect(isValidCatalogCode("BRA01")).toBe(true);
    expect(isValidCatalogCode("ZZZ99")).toBe(false);
  });
});

describe("buildOwnedMapFromRaw / resolveOwnedForMember", () => {
  it("builds sparse map from DB-shaped rows", () => {
    const map = buildOwnedMapFromRaw(
      "sparse",
      [{ code: "BRA05", quantity: 2 }],
      ["BRA01"],
    );
    expect(map.BRA01).toBe(0);
    expect(map.BRA05).toBe(2);
    expect(map.BRA06).toBe(1);
  });

  it("resolves trade lists for sparse member snapshot", () => {
    const result = resolveOwnedForMember(
      "sparse",
      [{ code: "BRA10", quantity: 3 }],
      ["BRA01", "MEX01"],
    );

    expect(result.needs).toContain("BRA01");
    expect(result.needs).toContain("MEX01");
    expect(result.duplicates).toEqual([{ code: "BRA10", quantity: 2 }]);
    expect(countOwnedTypes(result.ownedMap)).toBe(getCatalogCodes().length - 2);
    expect(countRepetidasTotal(result.ownedMap)).toBe(2);
  });

  it("resolves trade lists for have-mode member", () => {
    const result = resolveOwnedForMember(
      "have",
      [
        { code: "BRA01", quantity: 1 },
        { code: "BRA02", quantity: 2 },
      ],
      [],
    );

    expect(result.needs).not.toContain("BRA01");
    expect(result.needs).not.toContain("BRA02");
    expect(result.duplicates).toEqual([{ code: "BRA02", quantity: 1 }]);
  });
});
