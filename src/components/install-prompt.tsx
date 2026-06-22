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
    <div className="mb-4 rounded-lg border border-[#cfe3f5] bg-[#eaf3fb] p-4">
      <p className="text-sm font-semibold text-[#1b1b1b]">Instalar no celular</p>
      <p className="mt-1 text-xs leading-5 text-[#5f5f5f]">
        Adicione à tela inicial para usar como app, sem barra do navegador.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={install}
          className="min-h-11 flex-1 rounded-md bg-[#0067c0] px-4 py-2 text-sm font-semibold text-white active:bg-[#005aa8]"
        >
          Instalar app
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 rounded-md px-4 py-2 text-sm font-medium text-[#5f5f5f]"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
