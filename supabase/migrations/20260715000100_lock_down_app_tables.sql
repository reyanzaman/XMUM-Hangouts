-- Browser clients use the authenticated application API for all data access.
-- Keeping these base tables private prevents direct REST calls from bypassing
-- server-side ownership checks, hidden-profile redaction, and meeting-point rules.
do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'xmum_profiles',
    'xmum_hangouts',
    'xmum_comments',
    'xmum_applications',
    'xmum_likes',
    'xmum_chats',
    'xmum_messages',
    'xmum_reports',
    'xmum_appeals',
    'xmum_blocks',
    'xmum_notifications'
  ]
  loop
    if to_regclass('public.' || relation_name) is not null then
      execute format('alter table public.%I enable row level security', relation_name);
      execute format('revoke all on table public.%I from anon, authenticated', relation_name);
    end if;
  end loop;

  if to_regclass('public.view_xmum_hangouts') is not null then
    revoke all on table public.view_xmum_hangouts from anon, authenticated;
  end if;
end
$$;
