create extension if not exists pgcrypto;

create table if not exists public.xmum_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  user_email text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  expiration_time timestamptz,
  user_agent text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists xmum_push_subscriptions_user_id_idx
  on public.xmum_push_subscriptions (user_id, is_active);

create table if not exists public.xmum_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id text not null,
  subscription_id uuid not null references public.xmum_push_subscriptions(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  unique (notification_id, subscription_id)
);

create index if not exists xmum_push_deliveries_notification_idx
  on public.xmum_push_deliveries (notification_id);

alter table public.xmum_push_subscriptions enable row level security;
alter table public.xmum_push_deliveries enable row level security;

-- No anon/authenticated policies are intentionally created. These tables contain
-- device endpoints and are only accessed by authenticated server routes using the
-- Supabase service-role key, which bypasses RLS.
