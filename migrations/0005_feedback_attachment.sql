-- A screenshot says in one image what a paragraph of "then I clicked the thing
-- on the left" cannot. Asked for twice in one session, which is usually the
-- signal.
--
-- Stored in Postgres rather than object storage: at this volume it is cheaper
-- than adding a service, a token and a second failure mode, and it keeps the
-- attachment inside the same transaction and the same backup as the message it
-- belongs to. If attachments ever become common this is the thing to move.
--
-- Nullable because almost every row will have none, and because every row
-- written before today genuinely has none.
alter table feedback add column if not exists attachment_bytes bytea;
alter table feedback add column if not exists attachment_type text;
alter table feedback add column if not exists attachment_name text;
