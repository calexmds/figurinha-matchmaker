-- Modo de cadastro: have (marca Tenho) ou sparse (marca Preciso + Repetidas)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS collection_entry_mode TEXT NOT NULL DEFAULT 'unset';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_collection_entry_mode_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_collection_entry_mode_check
  CHECK (collection_entry_mode IN ('unset', 'have', 'sparse'));

-- Quem já tem figurinhas cadastradas continua no modo Tenho
UPDATE profiles p
SET collection_entry_mode = 'have'
WHERE collection_entry_mode = 'unset'
  AND (
    EXISTS (
      SELECT 1 FROM user_stickers us
      WHERE us.user_id = p.id AND us.quantity > 0
    )
    OR EXISTS (
      SELECT 1 FROM user_needs un
      WHERE un.user_id = p.id
    )
  );
