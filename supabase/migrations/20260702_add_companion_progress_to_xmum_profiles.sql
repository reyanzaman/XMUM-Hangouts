alter table public.xmum_profiles
  add column if not exists companion_pet_count integer not null default 0;

alter table public.xmum_profiles
  add column if not exists companion_selected_state_id text;

update public.xmum_profiles
set companion_pet_count = 0
where companion_pet_count is null or companion_pet_count < 0;
