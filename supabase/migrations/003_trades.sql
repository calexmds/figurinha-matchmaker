-- Trocas combinadas (reservadas) e concluídas
-- Execute no SQL Editor do Supabase após schema + 002_user_needs

CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS trades_one_pending_per_partner
  ON trades (user_id, partner_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_trades_user_status ON trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_group_id ON trades(group_id);

CREATE TABLE IF NOT EXISTS trade_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  sticker_id UUID NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('give', 'receive')),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE (trade_id, sticker_id, side)
);

CREATE INDEX IF NOT EXISTS idx_trade_items_trade_id ON trade_items(trade_id);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trades_read_own" ON trades;
CREATE POLICY "trades_read_own" ON trades FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trades_insert_own" ON trades;
CREATE POLICY "trades_insert_own" ON trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trades_update_own" ON trades;
CREATE POLICY "trades_update_own" ON trades FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trade_items_read_own" ON trade_items;
CREATE POLICY "trade_items_read_own" ON trade_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trades t
      WHERE t.id = trade_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "trade_items_insert_own" ON trade_items;
CREATE POLICY "trade_items_insert_own" ON trade_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trades t
      WHERE t.id = trade_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "trade_items_delete_own" ON trade_items;
CREATE POLICY "trade_items_delete_own" ON trade_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trades t
      WHERE t.id = trade_id AND t.user_id = auth.uid()
    )
  );
