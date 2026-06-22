import Link from "next/link";

type JoinGroupButtonProps = {
  loginHref?: string;
};

export function JoinGroupButton({ loginHref }: JoinGroupButtonProps) {
  if (loginHref) {
    return (
      <Link
        href={loginHref}
        className="flex w-full items-center justify-center rounded-md border border-[#d0d0d0] bg-white px-4 py-3 text-sm font-semibold text-[#1b1b1b] transition hover:bg-[#f5f5f5]"
      >
        Entrar com Google para participar
      </Link>
    );
  }

  return (
    <button
      type="submit"
      className="flex w-full items-center justify-center rounded-md bg-[#0067c0] px-4 py-3 text-sm font-semibold text-white transition active:bg-[#005aa8]"
    >
      Entrar no grupo
    </button>
  );
}
