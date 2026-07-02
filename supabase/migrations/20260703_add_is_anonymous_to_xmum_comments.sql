alter table public.xmum_comments
add column if not exists is_anonymous boolean not null default false;
