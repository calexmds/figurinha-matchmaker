-- Snapshot de coleções do grupo para match de trocas (bypass RLS com checagem de membro)
-- Execute no SQL Editor se trocas não cruzam listas entre membros

CREATE OR REPLACE FUNCTION public.get_group_trade_snapshot(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'not a group member';
  END IF;

  RETURN jsonb_build_object(
    'members',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user_id', gm.user_id,
            'name', COALESCE(p.name, 'Colecionador'),
            'avatar_url', p.avatar_url,
            'duplicates', COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object('code', s.code, 'quantity', us.quantity)
                  ORDER BY s.code
                )
                FROM user_stickers us
                JOIN stickers s ON s.id = us.sticker_id
                WHERE us.user_id = gm.user_id AND us.quantity > 0
              ),
              '[]'::jsonb
            ),
            'needs', COALESCE(
              (
                SELECT jsonb_agg(s.code ORDER BY s.code)
                FROM user_needs un
                JOIN stickers s ON s.id = un.sticker_id
                WHERE un.user_id = gm.user_id
              ),
              '[]'::jsonb
            )
          )
          ORDER BY COALESCE(p.name, 'Colecionador')
        )
        FROM group_members gm
        JOIN profiles p ON p.id = gm.user_id
        WHERE gm.group_id = p_group_id
      ),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_group_trade_snapshot(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_group_trade_snapshot(UUID) TO authenticated;
