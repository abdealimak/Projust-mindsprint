-- Token usage per AI call, so each project's real cost is visible.
create table if not exists ai_usage (
  id bigserial primary key,
  project_id uuid not null references projects(id) on delete cascade,
  step text not null,                 -- summary | concepts | course | quiz | grade | tutor
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,   -- includes thinking
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_project_idx on ai_usage (project_id, created_at);

-- Written and read by the server with the service role only.
alter table ai_usage enable row level security;
