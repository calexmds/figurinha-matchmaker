-- Anúncios de compra/venda — preço combinado entre as pessoas (sem pagamento no app)

CREATE TABLE IF NOT EXISTS sticker_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sticker_id UUID NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('sell', 'buy')),
  price_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, group_id, sticker_id, listing_type)
);

CREATE INDEX IF NOT EXISTS idx_sticker_listings_group ON sticker_listings(group_id);
CREATE INDEX IF NOT EXISTS idx_sticker_listings_user ON sticker_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_sticker_listings_type ON sticker_listings(listing_type);

ALTER TABLE sticker_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sticker_listings_read" ON sticker_listings;
CREATE POLICY "sticker_listings_read" ON sticker_listings FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      public.shares_group_with(user_id)
      AND public.is_group_member(group_id)
    )
  );

DROP POLICY IF EXISTS "sticker_listings_insert_own" ON sticker_listings;
CREATE POLICY "sticker_listings_insert_own" ON sticker_listings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_group_member(group_id)
  );

DROP POLICY IF EXISTS "sticker_listings_update_own" ON sticker_listings;
CREATE POLICY "sticker_listings_update_own" ON sticker_listings FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sticker_listings_delete_own" ON sticker_listings;
CREATE POLICY "sticker_listings_delete_own" ON sticker_listings FOR DELETE
  USING (auth.uid() = user_id);
