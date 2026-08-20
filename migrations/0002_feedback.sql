create table if not exists feedback (
  id serial primary key,
  user_id text,
  kind text not null,
  message text not null,
  page_path text,
  created_at timestamptz not null default now()
);
create index if not exists feedback_created_at_idx on feedback (created_at desc);
