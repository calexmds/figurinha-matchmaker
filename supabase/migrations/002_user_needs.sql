-- Migration: lista explícita de figurinhas que o usuário precisa
-- Execute no SQL Editor do Supabase (projeto já existente)

CREATE TABLE IF NOT EXISTS user_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sticker_id UUID NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, sticker_id)
);

CREATE INDEX IF NOT EXISTS idx_user_needs_user_id ON user_needs(user_id);

ALTER TABLE user_needs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_needs_read" ON user_needs;
CREATE POLICY "user_needs_read" ON user_needs FOR SELECT
  USING (auth.uid() = user_id OR public.shares_group_with(user_id));

DROP POLICY IF EXISTS "user_needs_insert_own" ON user_needs;
CREATE POLICY "user_needs_insert_own" ON user_needs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_needs_update_own" ON user_needs;
CREATE POLICY "user_needs_update_own" ON user_needs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_needs_delete_own" ON user_needs;
CREATE POLICY "user_needs_delete_own" ON user_needs FOR DELETE
  USING (auth.uid() = user_id);

-- user_stickers.quantity = repetidas disponíveis para troca (não álbum completo)
