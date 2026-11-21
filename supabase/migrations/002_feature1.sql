-- 002_feature1.sql: GitHub connections, projects, files with FTS, chat threads & messages, daily usage

-- GitHub connection (token stored encrypted, never exposed to the client)
create table if not exists github_connections (
  user_id text primary key,
  github_user_id bigint not null,
  github_username text not null,
  access_token_enc text not null,        -- AES-256-GCM, base64 (iv:tag:ciphertext)
  scopes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Projects table (supports user_id as text for Firebase UID / Supabase UID)
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  source text not null default 'github',            -- 'github' | 'public_url'
  repo_full_name text not null,                      -- owner/name
  repo_url text not null,
  description text,
  default_branch text,
  commit_sha text,
  is_private boolean default false,
  is_fork boolean default false,
  primary_language text,
  ownership_pct numeric,                             -- user's share of commits, 0-100
  ownership_status text default 'unknown',           -- 'verified' | 'partial' | 'not_owner' | 'unknown'
  status text not null default 'pending',            -- pending|ingesting|summarizing|ready|failed
  status_detail text,                                -- human-readable current step / error
  file_count int default 0,
  summary jsonb,                                     -- ProjectSummary
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, repo_full_name)
);

create table if not exists project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  path text not null,
  language text,
  size_bytes int,
  line_count int,
  priority int default 0,                            -- higher = more important
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
  citations jsonb default '[]',                      -- [{path,startLine,endLine}]
  created_at timestamptz default now()
);

create table if not exists usage_daily (
  user_id text not null,
  day date default current_date,
  ask_count int default 0,
  primary key (user_id, day)
);
