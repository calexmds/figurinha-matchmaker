import Link from "next/link";
import { signOut } from "@/app/actions";

const links = [
  { href: "/home", label: "Início" },
  { href: "/trocas", label: "Trocas" },
  { href: "/grupo", label: "Grupo" },
  { href: "/onboarding", label: "Figurinhas" },
];

export function AppNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/home" className="text-sm font-bold text-white">
          Figurinha Matchmaker
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-xl px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              Sair
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
