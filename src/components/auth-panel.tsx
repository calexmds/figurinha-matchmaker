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
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-[#d0d0d0] bg-white px-4 py-3 text-sm font-semibold text-[#1b1b1b] transition hover:bg-[#f5f5f5]"
      >
        <GoogleIcon />
        Entrar com Google
      </a>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#e6e6e6]" />
        <span className="text-xs text-[#8a8a8a]">ou</span>
        <div className="h-px flex-1 bg-[#e6e6e6]" />
      </div>

      <form
        action="/api/auth/email"
        method="POST"
        className="space-y-3"
      >
        <input type="hidden" name="next" value={nextPath} />
        <label className="block">
          <span className="text-xs font-medium text-[#5f5f5f]">
            E-mail (sem precisar de Google)
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
            className="mt-1 w-full rounded-md border border-[#d0d0d0] bg-white px-4 py-3 text-sm text-[#1b1b1b] placeholder:text-[#9a9a9a] focus:border-[#0067c0] focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="min-h-12 w-full rounded-md bg-[#0067c0] px-4 py-3 text-sm font-semibold text-white active:bg-[#005aa8]"
        >
          Receber link de acesso
        </button>
        <p className="text-center text-[11px] leading-4 text-[#8a8a8a]">
          Na primeira vez sua conta é criada automaticamente. Sem senha.
        </p>
      </form>

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
