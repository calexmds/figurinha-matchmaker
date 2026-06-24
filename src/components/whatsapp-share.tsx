"use client";

import { useState } from "react";
import { copyText, openWhatsAppShare } from "@/lib/share";
import { getButtonClassName } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type WhatsAppShareProps = {
  message: string;
  label?: string;
  className?: string;
};

export function WhatsAppShareButton({
  message,
  label = "Compartilhar no WhatsApp",
  className = "",
}: WhatsAppShareProps) {
  const [busy, setBusy] = useState(false);

  async function handleShare() {
    if (busy) return;
    setBusy(true);
    try {
      await openWhatsAppShare(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      disabled={busy}
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition active:bg-[#1ebe5d] disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2",
        className,
      )}
    >
      {busy ? "Abrindo…" : label}
    </button>
  );
}

type CopyInviteButtonProps = {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
};

export function CopyInviteButton({
  text,
  label = "Copiar convite",
  copiedLabel = "Convite copiado ✓",
  className = "",
}: CopyInviteButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={getButtonClassName("ghost", { fullWidth: true, className })}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
