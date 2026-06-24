"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";

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
    <Callout variant="warning" title="Abra no Chrome ou Safari" className="mb-4 p-4">
      <p className="text-xs leading-5">
        O login pode não funcionar dentro do WhatsApp. Toque nos{" "}
        <strong>⋮</strong> (três pontinhos) e escolha{" "}
        <strong>Abrir no Chrome</strong> ou <strong>Abrir no Safari</strong>.
      </p>
      <Button
        type="button"
        variant="ghost"
        fullWidth
        className="mt-3 min-h-10 text-xs"
        onClick={copyLink}
      >
        {copied ? "Link copiado ✓" : "Copiar link para colar no navegador"}
      </Button>
    </Callout>
  );
}
