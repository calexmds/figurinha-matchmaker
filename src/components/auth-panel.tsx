import Link from "next/link";

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
        <p className="text-sm text-[#5f5f5f]">
          Entre para participar do grupo{" "}
          <strong className="text-[#1b1b1b]">{groupName}</strong>.
        </p>
      ) : null}

      <a
        href={googleHref}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-[#0067c0] bg-[#0067c0] px-4 py-3 text-sm font-semibold text-white transition active:bg-[#005aa8]"
      >
        <GoogleIcon />
        Entrar com Google
      </a>

      <p className="text-center text-[11px] leading-4 text-[#8a8a8a]">
        Use a conta Google que você já tem no celular. Na primeira vez sua conta
        é criada automaticamente.
      </p>

      {!compact ? (
        <p className="text-center text-xs text-[#8a8a8a]">
          Recebeu convite?{" "}
          <Link href="/grupo" className="font-semibold text-[#0067c0] underline">
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
