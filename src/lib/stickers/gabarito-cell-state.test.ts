import { describe, expect, it } from "vitest";
import {
  getGabaritoCellVariant,
  isGabaritoCellVisible,
  resolveStickerQty,
} from "@/lib/stickers/gabarito-cell-state";

describe("gabarito cell state — modo have", () => {
  const owned = { BRA01: 1, ARG02: 0 };

  it("preciso só faltando: esconde figurinhas já marcadas em Tenho", () => {
    expect(
      isGabaritoCellVisible({
        tab: "preciso",
        sparse: false,
        qty: resolveStickerQty(owned, "BRA01", false),
        showAlbum: false,
        searching: false,
      }),
    ).toBe(false);
    expect(
      isGabaritoCellVisible({
        tab: "preciso",
        sparse: false,
        qty: resolveStickerQty(owned, "ARG02", false),
        showAlbum: false,
        searching: false,
      }),
    ).toBe(true);
  });

  it("preciso ver álbum: figurinha tenho usa visual readonly, não need", () => {
    expect(
      getGabaritoCellVariant({
        tab: "preciso",
        sparse: false,
        qty: 1,
      }),
    ).toBe("owned-readonly");
    expect(
      getGabaritoCellVariant({
        tab: "preciso",
        sparse: false,
        qty: 0,
      }),
    ).toBe("need");
  });

  it("preciso ver álbum: mostra figurinhas já marcadas em Tenho", () => {
    expect(
      isGabaritoCellVisible({
        tab: "preciso",
        sparse: false,
        qty: 1,
        showAlbum: true,
        searching: false,
      }),
    ).toBe(true);
  });
});

describe("gabarito cell state — modo sparse", () => {
  it("preciso ver álbum: qty 1 fica dimmed, qty 0 fica need", () => {
    expect(
      getGabaritoCellVariant({
        tab: "preciso",
        sparse: true,
        qty: 1,
      }),
    ).toBe("dimmed-sparse");
    expect(
      getGabaritoCellVariant({
        tab: "preciso",
        sparse: true,
        qty: 0,
      }),
    ).toBe("need");
  });
});
