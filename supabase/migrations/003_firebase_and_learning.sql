-- 003: move the database to Firebase user ids (text) and add the learning tables.
--
-- Run once in Supabase → SQL editor. Safe to re-run.
-- The app talks to Postgres with the service-role key only; RLS is enabled with no
-- policies so the public anon key can read/write nothing.

-- ── 1. Old schema.sql tables keyed by Supabase auth UUIDs ────────────────────
do $$
begin
  -- Old projects table (user_id uuid → profiles). Drop it only if it is empty.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'user_id' and data_type = 'uuid'
  ) then
    if (select count(*) from public.projects) > 0 then
      raise exception 'public.projects (old uuid schema) has rows; migrate them by hand first';
    end if;
    drop table public.projects cascade;
  end if;
end $$;

-- profiles.id becomes the Firebase uid (text)
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id type text using id::text;
alter table public.profiles alter column username drop not null;
alter table public.profiles add column if not exists public_profile boolean default true;

-- ── 2. Feature 1 (same as 002, user ids are text) ────────────────────────────
create table if not exists github_connections (
  user_id text primary key,
  github_user_id bigint not null,
  github_username text not null,
  access_token_enc text not null,
  scopes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  source text not null default 'github',
  repo_full_name text not null,
  repo_url text not null,
  description text,
  default_branch text,
  commit_sha text,
  is_private boolean default false,
  is_fork boolean default false,
  primary_language text,
  ownership_pct numeric,
  ownership_status text default 'unknown',
  status text not null default 'pending',
  status_detail text,
  file_count int default 0,
  summary jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, repo_full_name)
);
create index if not exists projects_user_idx on projects (user_id);

create table if not exists project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  path text not null,
  language text,
  size_bytes int,
  line_count int,
  priority int default 0,
  content text not null,
  tsv tsvector generated always as (to_tsvector('simple', coalesce(path,'') || ' ' || coalesce(content,''))) stored,
  unique (project_id, path)
);
create index if not exists project_files_tsv_idx on project_files using gin (tsv);
create index if not exists project_files_project_idx on project_files (project_id);

create table if not exists chat_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id text not null,
  title text,
  created_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  citations jsonb default '[]',
  created_at timestamptz default now()
);

create table if not exists usage_daily (
  user_id text not null,
  day date default current_date,
  ask_count int default 0,
  primary key (user_id, day)
);

-- ── 3. Learning: concepts → course → quiz → scores → certificate ─────────────
-- Generation state for the AI brain lives on the project row.
alter table projects add column if not exists concepts_status text default 'none';   -- none|generating|ready|failed
alter table projects add column if not exists concepts_detail text;
alter table projects add column if not exists concepts_progress real default 0;

create table if not exists concepts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id text not null,
  key text not null,                       -- stable slug used by depends_on / courses / quizzes
  name text not null,
  category text not null,
  description text not null,
  difficulty text not null check (difficulty in ('intro','core','advanced')),
  files jsonb not null default '[]',       -- [{path,startLine,endLine}]
  depends_on text[] not null default '{}', -- concept keys
  position int not null default 0,
  created_at timestamptz default now(),
  unique (project_id, key)
);
create index if not exists concepts_project_idx on concepts (project_id);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects(id) on delete cascade,
  user_id text not null,
  title text,
  status text not null default 'generating',   -- generating|ready|failed
  status_detail text,
  progress real default 0,                      -- generation progress 0..1
  modules jsonb not null default '[]',          -- CourseModule[]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists courses_user_idx on courses (user_id);

create table if not exists lesson_progress (
  user_id text not null,
  course_id uuid not null references courses(id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz default now(),
  primary key (user_id, course_id, lesson_id)
);

create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id text not null,
  attempt_no int not null,
  status text not null default 'generating',    -- generating|ready|submitted|failed
  status_detail text,
  questions jsonb not null default '[]',        -- QuizQuestion[] incl. answer keys (never sent to the browser)
  answers jsonb not null default '{}',          -- { [questionId]: GradedAnswer }
  scores jsonb,                                 -- AspectScores
  average real,
  unlocked boolean default false,
  created_at timestamptz default now(),
  submitted_at timestamptz,
  unique (project_id, user_id, attempt_no)
);
create index if not exists quiz_attempts_project_idx on quiz_attempts (project_id, user_id);

create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                    -- PJ-YYYY-XXXXXX
  user_id text not null,
  project_id uuid not null references projects(id) on delete cascade,
  attempt_id uuid references quiz_attempts(id) on delete set null,
  recipient_name text not null,
  repo_full_name text not null,
  commit_sha text,
  level text not null default 'Course-verified',
  scores jsonb not null,
  overall int not null,
  ownership_pct numeric,
  concepts jsonb not null default '[]',         -- [{name,category,strength}]
  version int not null default 1,
  history jsonb not null default '[]',          -- [{version,overall,scores,commit_sha,at}]
  revoked boolean default false,
  issued_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, project_id)
);
create index if not exists certificates_user_idx on certificates (user_id);

-- ── 4. Lock everything to the service role ───────────────────────────────────
alter table profiles enable row level security;
alter table github_connections enable row level security;
alter table projects enable row level security;
alter table project_files enable row level security;
alter table chat_threads enable row level security;
alter table chat_messages enable row level security;
alter table usage_daily enable row level security;
alter table concepts enable row level security;
alter table courses enable row level security;
alter table lesson_progress enable row level security;
alter table quiz_attempts enable row level security;
alter table certificates enable row level security;

notify pgrst, 'reload schema';
