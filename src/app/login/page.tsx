import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { InAppBrowserBanner } from "@/components/in-app-browser-banner";
import { CopaBadge } from "@/components/copa-badge";
import { APP_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    error?: string;
    reason?: string;
    sent?: string;
    email?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath =
    params.next?.startsWith("/") ? params.next : "/home";

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <InAppBrowserBanner />

      <div className="fluent-card p-8">
        <div className="mb-4 flex items-center gap-3">
          <CopaBadge size={48} />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0067c0]">
              Copa 2026
            </p>
            <h1 className="text-2xl font-bold text-[#1b1b1b]">{APP_NAME}</h1>
          </div>
        </div>

        {params.sent === "1" && params.email ? (
          <div className="mb-6 rounded-md border border-[#cfe9cf] bg-[#eef7ee] px-4 py-3 text-sm text-[#0f7b0f]">
            <p className="font-semibold">Link enviado!</p>
            <p className="mt-1 text-xs leading-5 text-[#1b1b1b]">
              Abra o e-mail <strong>{params.email}</strong> e toque no link para
              entrar. Verifique também o spam.
            </p>
          </div>
        ) : null}

        {params.error ? (
          <p className="mb-4 rounded-md border border-[#f3c9c5] bg-[#fdf0ef] px-4 py-3 text-sm text-[#c42b1c]">
            {params.error === "email" &&
            params.reason?.toLowerCase().includes("rate limit") ? (
              <>
                <span className="font-semibold">
                  Muitas tentativas de e-mail em pouco tempo.
                </span>
                <span className="mt-2 block text-xs leading-5 text-[#5f5f5f]">
                  Use <strong>Entrar com Google</strong> abaixo — é instantâneo e
                  não depende de e-mail. Ou aguarde cerca de 1 hora e tente de
                  novo.
                </span>
              </>
            ) : params.error === "email" ? (
              <>
                Não foi possível enviar o link por e-mail.
                {params.reason ? (
                  <span className="mt-1 block text-xs opacity-80">
                    {params.reason}
                  </span>
                ) : null}
              </>
            ) : (
              "Não foi possível entrar. Tente novamente."
            )}
          </p>
        ) : null}

        <AuthPanel nextPath={nextPath} />
      </div>
    </main>
  );
}
