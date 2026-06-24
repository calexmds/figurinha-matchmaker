"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";

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
    <Callout variant="info" title="Instalar no celular" className="mb-4 p-4">
      <p className="text-xs">
        Adicione à tela inicial para usar como app, sem barra do navegador.
      </p>
      <div className="mt-3 flex gap-2">
        <Button type="button" onClick={install} className="min-h-11 flex-1">
          Instalar app
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={dismiss}
          className="min-h-11 px-4"
        >
          Agora não
        </Button>
      </div>
    </Callout>
  );
}
