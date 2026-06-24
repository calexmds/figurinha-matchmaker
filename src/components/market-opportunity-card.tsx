import type { MarketOpportunity } from "@/lib/types";
import { formatPriceLabel } from "@/lib/market-listings";
import { WhatsAppShareButton } from "@/components/whatsapp-share";
import { buildBuyMessage, buildSellMessage } from "@/lib/whatsapp";

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
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            isBuyFrom
              ? "bg-[#eef7ee] text-[#0f7b0f]"
              : "bg-[#fff4e6] text-[#c45c00]"
          }`}
        >
          {isBuyFrom ? "Comprar" : "Vender"}
        </span>
        <span className="rounded-full bg-[#eaf3fb] px-2 py-0.5 text-[10px] font-semibold text-[#0067c0]">
          {listing.groupName}
        </span>
      </div>

      <h4 className="mt-2 text-lg font-bold text-[#1b1b1b]">
        {listing.code}{" "}
        <span className="text-base font-normal text-[#5f5f5f]">
          · {listing.userName}
        </span>
      </h4>

      <p className="mt-2 text-sm text-[#5f5f5f]">
        {isBuyFrom
          ? `${listing.userName} está vendendo esta figurinha que você precisa.`
          : `${listing.userName} quer comprar esta repetida sua.`}
      </p>

      <p className="mt-2 text-sm font-semibold text-[#1b1b1b]">
        Valor: {priceLabel}
      </p>

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
