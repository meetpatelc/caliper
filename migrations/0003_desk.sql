-- Per-account desk: favourites, project folders, saved checks, reviews, Studio drafts.
-- user_id is TEXT (Better Auth ids). Recents stay in the browser and are not stored here.

create table if not exists desk_favorites (
  user_id    text not null,
  tool_id    text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tool_id)
);

create table if not exists desk_projects (
  id         text not null primary key,
  user_id    text not null,
  name       text not null,
  created_at timestamptz not null default now()
);
create index if not exists desk_projects_user_id_idx on desk_projects (user_id);

create table if not exists desk_calculations (
  id          text not null primary key,
  user_id     text not null,
  project_id  text not null,
  tool_id     text not null,
  title       text not null,
  input_json  text not null,
  method      text not null default '',
  result_json text not null,
  saved_at    timestamptz not null default now()
);
create index if not exists desk_calculations_user_id_idx on desk_calculations (user_id);

create table if not exists desk_reviews (
  id           text not null primary key,
  user_id      text not null,
  title        text not null,
  area         text not null,
  payload_json text not null,
  saved_at     timestamptz not null default now()
);
create index if not exists desk_reviews_user_id_idx on desk_reviews (user_id);

create table if not exists desk_drafts (
  id            text not null primary key,
  user_id       text not null,
  slug          text not null,
  document_json text not null,
  updated_at    timestamptz not null default now()
);
create unique index if not exists desk_drafts_user_slug_idx on desk_drafts (user_id, slug);
create index if not exists desk_drafts_user_id_idx on desk_drafts (user_id);
