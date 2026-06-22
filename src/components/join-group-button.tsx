import Link from "next/link";

type JoinGroupButtonProps = {
  loginHref?: string;
};

export function JoinGroupButton({ loginHref }: JoinGroupButtonProps) {
  if (loginHref) {
    return (
      <Link
        href={loginHref}
        className="flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
      >
        Entrar com Google para participar
      </Link>
    );
  }

  return (
    <button
      type="submit"
      className="flex w-full items-center justify-center rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
    >
      Entrar no grupo
    </button>
  );
}
