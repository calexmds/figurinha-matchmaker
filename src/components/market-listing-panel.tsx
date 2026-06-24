import type { StickerListing } from "@/lib/types";
import { removeStickerListing } from "@/app/actions";
import { formatPriceLabel } from "@/lib/market-listings";
import { MarketListingForm } from "@/components/market-listing-form";

type ListingOption = {
  code: string;
  groupId: string;
  groupName: string;
};

type MarketListingPanelProps = {
  ownListings: StickerListing[];
  sellOptions: ListingOption[];
  buyOptions: ListingOption[];
  defaultGroupId?: string;
};

export function MarketListingPanel({
  ownListings,
  sellOptions,
  buyOptions,
  defaultGroupId,
}: MarketListingPanelProps) {
  return (
    <div className="space-y-4">
      <div className="fluent-card space-y-4 p-5">
        <div>
          <h4 className="text-base font-bold text-[#1b1b1b]">Criar anúncio</h4>
          <p className="mt-1 text-sm text-[#5f5f5f]">
            Marque o que você vende ou quer comprar. O valor é combinado direto
            com a pessoa — o app não processa pagamento.
          </p>
        </div>

        <MarketListingForm
          sellOptions={sellOptions}
          buyOptions={buyOptions}
          defaultGroupId={defaultGroupId}
        />
      </div>

      {ownListings.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-base font-bold text-[#1b1b1b]">
            Seus anúncios ({ownListings.length})
          </h4>
          {ownListings.map((listing) => (
            <article
              key={listing.id}
              className="flex flex-col gap-3 rounded-lg border border-[#ecdfc0] bg-[#fbf6ea] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-bold text-[#1b1b1b]">
                  {listing.listingType === "sell" ? "Vendo" : "Compro"}{" "}
                  {listing.code}
                </p>
                <p className="mt-1 text-sm text-[#5f5f5f]">
                  {listing.groupName} · {formatPriceLabel(listing.priceNote)}
                </p>
              </div>
              <form action={removeStickerListing}>
                <input type="hidden" name="listingId" value={listing.id} />
                <button
                  type="submit"
                  className="min-h-10 rounded-md border border-[#ecdfc0] bg-white px-4 py-2 text-sm font-semibold text-[#5f5f5f] active:bg-[#f5f5f5]"
                >
                  Remover
                </button>
              </form>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
