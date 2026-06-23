import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  persistStickerEdits,
  type StickerEdit,
} from "@/lib/stickers/persist-edits";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  let edits: StickerEdit[];
  try {
    const body = await request.json();
    edits = body.edits ?? body;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const result = await persistStickerEdits(supabase, user.id, edits);

  if ("error" in result) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
