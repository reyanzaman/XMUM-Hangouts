create table if not exists public.xmum_otp_codes (
  email text primary key,
  otp text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  last_requested_at timestamptz,
  request_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_xmum_otp_codes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists xmum_otp_codes_set_updated_at on public.xmum_otp_codes;
create trigger xmum_otp_codes_set_updated_at
before update on public.xmum_otp_codes
for each row
execute function public.set_xmum_otp_codes_updated_at();

alter table public.xmum_otp_codes enable row level security;

drop policy if exists "Service role manages xmum otp codes" on public.xmum_otp_codes;
create policy "Service role manages xmum otp codes"
on public.xmum_otp_codes
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
