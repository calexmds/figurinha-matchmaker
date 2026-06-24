"use client";

import { useState } from "react";
import { copyText, openWhatsAppShare } from "@/lib/share";

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
      className={`inline-flex items-center justify-center rounded-md bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1ebe5d] disabled:opacity-70 ${className}`}
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
      className={`inline-flex min-h-11 items-center justify-center rounded-md border border-[#d0d0d0] bg-white px-4 py-3 text-sm font-semibold text-[#1b1b1b] transition active:bg-[#f5f5f5] ${className}`}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
