import type { StickerListing } from "@/lib/types";
import { removeStickerListing } from "@/app/actions";
import { formatPriceLabel } from "@/lib/market-listings";
import { MarketListingForm } from "@/components/market-listing-form";
import { Button } from "@/components/ui/button";

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
          <h4 className="font-display text-base font-bold text-ink">
            Criar anúncio
          </h4>
          <p className="mt-1 text-sm text-ink-soft">
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
          <h4 className="font-display text-base font-bold text-ink">
            Seus anúncios ({ownListings.length})
          </h4>
          {ownListings.map((listing) => (
            <article
              key={listing.id}
              className="flex flex-col gap-3 rounded-xl border border-[#ecdfc0] bg-[#fbf6ea] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-bold text-ink">
                  {listing.listingType === "sell" ? "Vendo" : "Compro"}{" "}
                  {listing.code}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {listing.groupName} · {formatPriceLabel(listing.priceNote)}
                </p>
              </div>
              <form action={removeStickerListing}>
                <input type="hidden" name="listingId" value={listing.id} />
                <Button type="submit" variant="secondary" className="min-h-10">
                  Remover
                </Button>
              </form>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
