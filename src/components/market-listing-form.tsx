"use client";

import { useMemo, useState } from "react";
import { saveStickerListing } from "@/app/actions";

type ListingOption = {
  code: string;
  groupId: string;
  groupName: string;
};

type MarketListingFormProps = {
  sellOptions: ListingOption[];
  buyOptions: ListingOption[];
  defaultGroupId?: string;
};

export function MarketListingForm({
  sellOptions,
  buyOptions,
  defaultGroupId,
}: MarketListingFormProps) {
  const initialType: "sell" | "buy" =
    sellOptions.length > 0 ? "sell" : "buy";
  const [listingType, setListingType] = useState<"sell" | "buy">(initialType);

  const activeOptions = listingType === "sell" ? sellOptions : buyOptions;

  const uniqueOptions = useMemo(() => {
    const seen = new Set<string>();
    return activeOptions.filter((option) => {
      const key = `${option.groupId}:${option.code}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [activeOptions]);

  const [selectedCode, setSelectedCode] = useState(uniqueOptions[0]?.code ?? "");

  const selectedGroupId =
    uniqueOptions.find((option) => option.code === selectedCode)?.groupId ??
    defaultGroupId ??
    uniqueOptions[0]?.groupId ??
    "";

  if (sellOptions.length === 0 && buyOptions.length === 0) {
    return (
      <p className="text-sm text-[#5f5f5f]">
        Marque repetidas ou figurinhas que faltam em Tenho para anunciar compra
        ou venda.
      </p>
    );
  }

  return (
    <form action={saveStickerListing} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold text-[#1b1b1b]">Tipo</span>
          <select
            name="listingType"
            value={listingType}
            onChange={(event) => {
              const nextType = event.target.value as "sell" | "buy";
              setListingType(nextType);
              const nextOptions = nextType === "sell" ? sellOptions : buyOptions;
              setSelectedCode(nextOptions[0]?.code ?? "");
            }}
            className="mt-1 w-full rounded-md border border-[#ecdfc0] bg-white px-3 py-2 text-sm"
            required
          >
            <option value="sell" disabled={sellOptions.length === 0}>
              Vender repetida
            </option>
            <option value="buy" disabled={buyOptions.length === 0}>
              Quero comprar
            </option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-semibold text-[#1b1b1b]">Figurinha</span>
          <select
            name="code"
            value={selectedCode}
            onChange={(event) => setSelectedCode(event.target.value)}
            className="mt-1 w-full rounded-md border border-[#ecdfc0] bg-white px-3 py-2 text-sm"
            required
          >
            {uniqueOptions.map((option) => (
              <option key={`${option.groupId}:${option.code}`} value={option.code}>
                {option.code} · {option.groupName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <input type="hidden" name="groupId" value={selectedGroupId} />

      <label className="block text-sm">
        <span className="font-semibold text-[#1b1b1b]">Valor (opcional)</span>
        <input
          name="priceNote"
          type="text"
          placeholder="Ex.: R$ 3,00 ou a combinar"
          maxLength={80}
          className="mt-1 w-full rounded-md border border-[#ecdfc0] bg-white px-3 py-2 text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={uniqueOptions.length === 0}
        className="min-h-11 w-full rounded-md bg-[#0067c0] px-4 py-3 text-sm font-semibold text-white active:bg-[#005aa8] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Publicar anúncio
      </button>
    </form>
  );
}
