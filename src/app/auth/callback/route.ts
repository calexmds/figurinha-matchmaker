import { NextResponse } from "next/server";
import { consumePendingInvite } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const pendingInvite = await consumePendingInvite();
      if (pendingInvite) {
        return NextResponse.redirect(`${origin}/join/${pendingInvite}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
