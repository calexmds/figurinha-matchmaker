/** iPhone, iPad, iPod (incl. iPad com userAgent de Mac). */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function buildWhatsAppWebUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppDeepLink(message: string): string {
  return `whatsapp://send?text=${encodeURIComponent(message)}`;
}

export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === "undefined") return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Compartilha texto no WhatsApp de forma confiável em iOS (PWA/Safari) e Android.
 * iOS: Web Share API → whatsapp:// (sem target=_blank, que perde o ?text=).
 */
export async function openWhatsAppShare(message: string): Promise<void> {
  if (typeof window === "undefined") return;

  if (navigator.share) {
    try {
      await navigator.share({ text: message });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }

  const url = isIOS()
    ? buildWhatsAppDeepLink(message)
    : buildWhatsAppWebUrl(message);

  window.location.assign(url);
}
