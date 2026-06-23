-- Fase 0: trocas bilaterais, RLS de grupos, join seguro por convite
-- Funciona com OU sem a migration 003 anterior.

-- ---------------------------------------------------------------------------
-- 0. Tabelas de troca (cria se não existirem)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'proposed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS trade_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  sticker_id UUID NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('give', 'receive')),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE (trade_id, sticker_id, side)
);

CREATE INDEX IF NOT EXISTS idx_trades_user_status ON trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_group_id ON trades(group_id);

CREATE INDEX IF NOT EXISTS idx_trade_items_trade_id ON trade_items(trade_id);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 1. Status: proposed → active → completed | cancelled
-- ---------------------------------------------------------------------------
ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_status_check;

UPDATE trades SET status = 'active' WHERE status = 'pending';

ALTER TABLE trades ADD CONSTRAINT trades_status_check
  CHECK (status IN ('proposed', 'active', 'completed', 'cancelled'));

DROP INDEX IF EXISTS trades_one_pending_per_partner;

CREATE UNIQUE INDEX IF NOT EXISTS trades_one_open_per_partner_group
  ON trades (user_id, partner_id, group_id)
  WHERE status IN ('proposed', 'active');

CREATE INDEX IF NOT EXISTS idx_trades_partner_status
  ON trades (partner_id, status);

-- ---------------------------------------------------------------------------
-- 2. RLS trocas — ambos participantes leem e atualizam
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "trades_read_own" ON trades;
DROP POLICY IF EXISTS "trades_read_participant" ON trades;
CREATE POLICY "trades_read_participant" ON trades FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

DROP POLICY IF EXISTS "trades_insert_own" ON trades;
CREATE POLICY "trades_insert_own" ON trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trades_update_own" ON trades;
DROP POLICY IF EXISTS "trades_update_participant" ON trades;
CREATE POLICY "trades_update_participant" ON trades FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

DROP POLICY IF EXISTS "trade_items_read_own" ON trade_items;
DROP POLICY IF EXISTS "trade_items_read_participant" ON trade_items;
CREATE POLICY "trade_items_read_participant" ON trade_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trades t
      WHERE t.id = trade_id
        AND (t.user_id = auth.uid() OR t.partner_id = auth.uid())
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

-- ---------------------------------------------------------------------------
-- 3. Grupos — fechar SELECT público; RPC por invite_code
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "groups_read_by_invite" ON groups;

CREATE OR REPLACE FUNCTION public.get_group_by_invite(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT := upper(trim(p_invite_code));
  v_row groups%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM groups WHERE invite_code = v_code;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'invite_code', v_row.invite_code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_group_by_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_group_by_invite(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.join_group_by_invite(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT := upper(trim(p_invite_code));
  v_group groups%ROWTYPE;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_group FROM groups WHERE invite_code = v_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  INSERT INTO group_members (group_id, user_id)
  VALUES (v_group.id, v_uid)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  UPDATE profiles SET active_group_id = v_group.id WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_group.id,
    'name', v_group.name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.join_group_by_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_group_by_invite(TEXT) TO authenticated;
