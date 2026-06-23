-- Dono pode excluir o grupo
DROP POLICY IF EXISTS "groups_delete_owner" ON groups;
CREATE POLICY "groups_delete_owner" ON groups FOR DELETE
  USING (auth.uid() = owner_id);
