-- Figurinha Matchmaker — schema inicial
-- Execute no SQL Editor do Supabase (schema + seed.sql)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  active_group_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  team TEXT,
  type TEXT NOT NULL CHECK (type IN ('team', 'special')),
  number INT,
  sort_order INT NOT NULL,
  name TEXT,
  category TEXT NOT NULL DEFAULT 'main'
);

CREATE TABLE IF NOT EXISTS user_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sticker_id UUID NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, sticker_id)
);

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles
  ADD CONSTRAINT profiles_active_group_id_fkey
  FOREIGN KEY (active_group_id) REFERENCES groups(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_stickers_user_id ON user_stickers(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_stickers_team ON stickers(team);

-- Perfil automático ao cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helpers RLS
CREATE OR REPLACE FUNCTION public.is_group_member(target_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = target_group_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_group_with(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_members me
    JOIN group_members them ON them.group_id = me.group_id
    WHERE me.user_id = auth.uid() AND them.user_id = target_user_id
  );
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Stickers: leitura pública
DROP POLICY IF EXISTS "stickers_public_read" ON stickers;
CREATE POLICY "stickers_public_read" ON stickers FOR SELECT USING (true);

-- Profiles
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT
  USING (auth.uid() = id OR public.shares_group_with(id));

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- User stickers
DROP POLICY IF EXISTS "user_stickers_read" ON user_stickers;
CREATE POLICY "user_stickers_read" ON user_stickers FOR SELECT
  USING (auth.uid() = user_id OR public.shares_group_with(user_id));

DROP POLICY IF EXISTS "user_stickers_write_own" ON user_stickers;
CREATE POLICY "user_stickers_write_own" ON user_stickers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_stickers_update_own" ON user_stickers;
CREATE POLICY "user_stickers_update_own" ON user_stickers FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_stickers_delete_own" ON user_stickers;
CREATE POLICY "user_stickers_delete_own" ON user_stickers FOR DELETE
  USING (auth.uid() = user_id);

-- Groups
DROP POLICY IF EXISTS "groups_read_member" ON groups;
CREATE POLICY "groups_read_member" ON groups FOR SELECT
  USING (public.is_group_member(id) OR owner_id = auth.uid());

DROP POLICY IF EXISTS "groups_insert_authenticated" ON groups;
CREATE POLICY "groups_insert_authenticated" ON groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "groups_update_owner" ON groups;
CREATE POLICY "groups_update_owner" ON groups FOR UPDATE
  USING (auth.uid() = owner_id);

-- Group members
DROP POLICY IF EXISTS "group_members_read" ON group_members;
CREATE POLICY "group_members_read" ON group_members FOR SELECT
  USING (public.is_group_member(group_id));

DROP POLICY IF EXISTS "group_members_insert_self" ON group_members;
CREATE POLICY "group_members_insert_self" ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "group_members_delete_self_or_owner" ON group_members;
CREATE POLICY "group_members_delete_self_or_owner" ON group_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR auth.uid() = (SELECT owner_id FROM groups WHERE id = group_id)
  );

-- Permitir buscar grupo por invite_code antes de entrar (anon/authenticated)
DROP POLICY IF EXISTS "groups_read_by_invite" ON groups;
CREATE POLICY "groups_read_by_invite" ON groups FOR SELECT
  USING (true);
