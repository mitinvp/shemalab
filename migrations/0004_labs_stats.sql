-- Accepted laboratory works (teacher marks) and per-question test answers
-- (used for the "hardest questions" analytics in the teacher's report).
create table if not exists lab_accepted (
  user_id text not null references "user"(id) on delete cascade,
  lab_id text not null,
  accepted_by text references "user"(id) on delete set null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, lab_id)
);

create table if not exists test_answers (
  id bigserial primary key,
  attempt_id bigint not null references test_results(id) on delete cascade,
  user_id text not null references "user"(id) on delete cascade,
  topic text not null,
  qkey text not null,
  ok boolean not null
);
create index if not exists test_answers_user_idx on test_answers (user_id);
create index if not exists test_answers_topic_q_idx on test_answers (topic, qkey);
