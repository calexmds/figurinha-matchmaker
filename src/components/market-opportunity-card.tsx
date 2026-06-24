import type { MarketOpportunity } from "@/lib/types";
import { formatPriceLabel } from "@/lib/market-listings";
import { WhatsAppShareButton } from "@/components/whatsapp-share";
import { buildBuyMessage, buildSellMessage } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";

type MarketOpportunityCardProps = {
  opportunity: MarketOpportunity;
};

export function MarketOpportunityCard({ opportunity }: MarketOpportunityCardProps) {
  const { listing, kind } = opportunity;
  const priceLabel = formatPriceLabel(listing.priceNote);
  const isBuyFrom = kind === "buy_from";

  const message = isBuyFrom
    ? buildBuyMessage(listing.userName, listing.code, priceLabel)
    : buildSellMessage(listing.userName, listing.code, priceLabel);

  return (
    <article className="fluent-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
            isBuyFrom
              ? "bg-[#eef7ee] text-win-green"
              : "bg-[#fff4e6] text-[#c45c00]",
          )}
        >
          {isBuyFrom ? "Comprar" : "Vender"}
        </span>
        <span className="rounded-full bg-[#eaf3fb] px-2 py-0.5 text-[10px] font-semibold text-accent">
          {listing.groupName}
        </span>
      </div>

      <h4 className="font-display mt-2 text-lg font-bold text-ink">
        {listing.code}{" "}
        <span className="text-base font-normal text-ink-soft">
          · {listing.userName}
        </span>
      </h4>

      <p className="mt-2 text-sm text-ink-soft">
        {isBuyFrom
          ? `${listing.userName} está vendendo esta figurinha que você precisa.`
          : `${listing.userName} quer comprar esta repetida sua.`}
      </p>

      <p className="mt-2 text-sm font-semibold text-ink">Valor: {priceLabel}</p>

      <div className="mt-4">
        <WhatsAppShareButton
          message={message}
          label={`Negociar com ${listing.userName.split(" ")[0]} no WhatsApp`}
          className="w-full"
        />
      </div>
    </article>
  );
}
