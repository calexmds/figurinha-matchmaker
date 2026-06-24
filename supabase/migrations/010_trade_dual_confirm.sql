-- Confirmação dupla na conclusão: cada um confirma após o encontro físico

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS initiator_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS partner_confirmed_at TIMESTAMPTZ;
