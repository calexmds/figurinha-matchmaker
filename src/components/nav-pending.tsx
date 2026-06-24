"use client";

import {
  createContext,
  useContext,
  useEffect,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";

type NavPendingContextValue = {
  isPending: boolean;
  navigate: (href: string) => void;
};

const NavPendingContext = createContext<NavPendingContextValue | null>(null);

export function NavPendingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <NavPendingContext.Provider value={{ isPending, navigate }}>
      {children}
    </NavPendingContext.Provider>
  );
}

export function useNavPending() {
  const ctx = useContext(NavPendingContext);
  if (!ctx) {
    throw new Error("useNavPending must be used within NavPendingProvider");
  }
  return ctx;
}

export function NavProgressBar() {
  const { isPending } = useNavPending();
  if (!isPending) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-accent/15"
      aria-hidden
    >
      <div className="nav-progress-indeterminate h-full w-1/3 bg-accent" />
    </div>
  );
}

export function usePrefetchAppRoutes() {
  const router = useRouter();
  useEffect(() => {
    for (const href of ["/home", "/trocas", "/grupo", "/onboarding"]) {
      router.prefetch(href);
    }
  }, [router]);
}
