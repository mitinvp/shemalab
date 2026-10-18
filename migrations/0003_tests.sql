-- Per-topic test attempts (each student's own questions, graded server-side).
create table if not exists test_results (
  id bigserial primary key,
  user_id text not null references "user"(id) on delete cascade,
  topic text not null,
  score int not null,
  total int not null,
  taken_at timestamptz not null default now()
);
create index if not exists test_results_user_topic_idx on test_results (user_id, topic, taken_at desc);
