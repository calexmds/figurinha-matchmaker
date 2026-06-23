"use client";

import { useEffect, useState } from "react";

function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /WhatsApp|Instagram|FBAN|FBAV|FB_IAB|Line\/|Twitter/i.test(ua);
}

type InAppBrowserBannerProps = {
  url?: string;
};

export function InAppBrowserBanner({ url }: InAppBrowserBannerProps) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setShow(isInAppBrowser());
  }, []);

  if (!show) return null;

  async function copyLink() {
    const link = url ?? window.location.href;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select not available in all WebViews
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-[#ecdfc0] bg-[#fbf6ea] p-4 text-sm text-[#1b1b1b]">
      <p className="font-semibold">Abra no Chrome ou Safari</p>
      <p className="mt-1 text-xs leading-5 text-[#5f5f5f]">
        O login pode não funcionar dentro do WhatsApp. Toque nos{" "}
        <strong>⋮</strong> (três pontinhos) e escolha{" "}
        <strong>Abrir no Chrome</strong> ou <strong>Abrir no Safari</strong>.
      </p>
      <button
        type="button"
        onClick={copyLink}
        className="mt-3 min-h-10 w-full rounded-md border border-[#d0d0d0] bg-white px-3 py-2 text-xs font-semibold text-[#1b1b1b]"
      >
        {copied ? "Link copiado ✓" : "Copiar link para colar no navegador"}
      </button>
    </div>
  );
}
