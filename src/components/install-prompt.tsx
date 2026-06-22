"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as Navigator & { standalone?: boolean }).standalone);

    setIsStandalone(!!standalone);

    const dismissedBefore = localStorage.getItem("pwa-install-dismissed");
    if (dismissedBefore) setDismissed(true);

    function handleBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  if (isStandalone || dismissed || !deferredPrompt) return null;

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "dismissed") {
      localStorage.setItem("pwa-install-dismissed", "1");
      setDismissed(true);
    }
  }

  function dismiss() {
    localStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
  }

  return (
    <div className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
      <p className="text-sm font-semibold text-white">Instalar no celular</p>
      <p className="mt-1 text-xs leading-5 text-slate-300">
        Adicione à tela inicial para usar como app, sem barra do navegador.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={install}
          className="min-h-11 flex-1 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Instalar app
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 rounded-xl px-4 py-2 text-sm font-medium text-slate-300"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
