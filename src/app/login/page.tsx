import Link from "next/link";
import { redirect } from "next/navigation";
import { signInWithGoogle } from "@/app/actions";
import { APP_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(params.next ?? "/home");
  }

  async function login() {
    "use server";
    await signInWithGoogle(params.next);
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="fluent-card p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0067c0]">
          Copa 2026
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[#1b1b1b]">{APP_NAME}</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f5f5f]">
          Entre com Google para registrar suas figurinhas, entrar no grupo e
          ver sugestões de troca.
        </p>

        {params.error ? (
          <p className="mt-4 rounded-md border border-[#f3c9c5] bg-[#fdf0ef] px-4 py-3 text-sm text-[#c42b1c]">
            Não foi possível entrar. Tente novamente.
            {params.reason ? (
              <span className="mt-1 block text-xs opacity-80">{params.reason}</span>
            ) : null}
          </p>
        ) : null}

        <form action={login} className="mt-8">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-md border border-[#d0d0d0] bg-white px-4 py-3 text-sm font-semibold text-[#1b1b1b] transition hover:bg-[#f5f5f5]"
          >
            <GoogleIcon />
            Entrar com Google
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#8a8a8a]">
          Recebeu convite?{" "}
          <Link href="/grupo" className="font-semibold text-[#0067c0] underline">
            Entrar com código
          </Link>
        </p>
      </div>
    </main>
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
