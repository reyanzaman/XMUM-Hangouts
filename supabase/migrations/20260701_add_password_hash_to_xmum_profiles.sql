alter table public.xmum_profiles
add column if not exists password_hash text;
