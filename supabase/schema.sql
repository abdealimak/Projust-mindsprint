-- ====================================================================
-- Projust: Database Schema & Row-Level Security (RLS)
-- ====================================================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  headline TEXT,
  bio TEXT,
  github_username TEXT,
  github_connected BOOLEAN DEFAULT FALSE,
  linkedin_url TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index username for fast lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);

-- 2. Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  repo_url TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  commit_sha TEXT,
  ownership_pct INTEGER DEFAULT 100,
  is_fork BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'analyzing' CHECK (status IN ('analyzing', 'ready', 'in_progress', 'completed', 'failed')),
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Profiles: Public can read, users can update only their own row
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Projects policies
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their own projects"
  ON public.projects
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
CREATE POLICY "Users can insert their own projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects"
  ON public.projects
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
  raw_meta JSONB;
  provider_name TEXT;
  gh_user TEXT;
  is_gh BOOLEAN := false;
BEGIN
  raw_meta := new.raw_user_meta_data;
  provider_name := new.raw_app_meta_data->>'provider';

  -- Check if GitHub provider
  IF provider_name = 'github' OR raw_meta->>'user_name' IS NOT NULL THEN
    gh_user := raw_meta->>'user_name';
    is_gh := true;
  END IF;

  -- Determine base username
  IF gh_user IS NOT NULL AND length(gh_user) > 0 THEN
    base_username := lower(regexp_replace(gh_user, '[^a-zA-Z0-9_-]', '', 'g'));
  ELSIF raw_meta->>'preferred_username' IS NOT NULL THEN
    base_username := lower(regexp_replace(raw_meta->>'preferred_username', '[^a-zA-Z0-9_-]', '', 'g'));
  ELSIF new.email IS NOT NULL THEN
    base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_-]', '', 'g'));
  ELSE
    base_username := 'dev';
  END IF;

  -- Deduplicate username
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;

  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    email,
    headline,
    bio,
    github_username,
    github_connected,
    linkedin_url
  ) VALUES (
    new.id,
    final_username,
    COALESCE(raw_meta->>'full_name', raw_meta->>'name', final_username),
    COALESCE(raw_meta->>'avatar_url', raw_meta->>'picture', ''),
    new.email,
    'Software Developer',
    '',
    gh_user,
    is_gh,
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
