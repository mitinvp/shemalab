-- SchemaLab: roles, groups, and server-persisted progress/results.
-- Applied once (see scripts/migrate.mjs) after migrations/0001_auth.sql,
-- which creates Better Auth's "user" table that these reference.

create table if not exists profile (
  user_id text primary key references "user"(id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'teacher')),
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists groups (
  id text primary key,
  teacher_id text not null references "user"(id) on delete cascade,
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id text not null references groups(id) on delete cascade,
  user_id text not null references "user"(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on group_members (user_id);

-- One row per (user, topic, slot) generated-task variant. `correct` is sticky:
-- once a slot is passed it stays passed even if the student reopens and
-- misses a later attempt at the same slot. `attempts` counts all checks.
create table if not exists slot_progress (
  user_id text not null references "user"(id) on delete cascade,
  topic text not null,
  slot int not null,
  correct boolean not null default false,
  attempts int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic, slot)
);
create index if not exists slot_progress_user_idx on slot_progress (user_id);

-- Best "Контрольна" (exam) score per student, one row per attempt so a
-- teacher can see retakes, not just the best.
create table if not exists exam_results (
  id bigserial primary key,
  user_id text not null references "user"(id) on delete cascade,
  score int not null,
  total int not null,
  taken_at timestamptz not null default now()
);
create index if not exists exam_results_user_idx on exam_results (user_id, taken_at desc);
