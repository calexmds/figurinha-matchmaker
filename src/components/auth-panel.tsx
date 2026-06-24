import Link from "next/link";

import { getButtonClassName } from "@/components/ui/button";

type AuthPanelProps = {
  nextPath: string;
  groupName?: string;
  compact?: boolean;
};

export function AuthPanel({ nextPath, groupName, compact }: AuthPanelProps) {
  const googleHref = `/api/auth/google?next=${encodeURIComponent(nextPath)}`;

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      {groupName ? (
        <p className="text-sm text-ink-soft">
          Entre para participar do grupo{" "}
          <strong className="text-ink">{groupName}</strong>.
        </p>
      ) : null}

      <a
        href={googleHref}
        className={getButtonClassName("primary", { fullWidth: true, className: "gap-3" })}
      >
        <GoogleIcon />
        Entrar com Google
      </a>

      <p className="text-center text-[11px] leading-4 text-ink-muted">
        Use a conta Google que você já tem no celular. Na primeira vez sua conta
        é criada automaticamente.
      </p>

      {!compact ? (
        <p className="text-center text-xs text-ink-muted">
          Recebeu convite?{" "}
          <Link
            href="/grupo"
            className="font-semibold text-accent underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Entrar com código
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.5-5.1 3.5-3.1 0-5.6-2.5-5.6-5.6S8.9 6.1 12 6.1c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.8 3.7 14.6 2.8 12 2.8 6.9 2.8 2.7 7 2.7 12.1S6.9 21.4 12 21.4c6.9 0 8.5-4.8 8.5-7.3 0-.5 0-.9-.1-1.3H12z"
      />
    </svg>
  );
}
