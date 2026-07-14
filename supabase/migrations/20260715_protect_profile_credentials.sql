-- Password verifiers are authentication secrets and must never be readable by
-- browser clients. Replace the broad table-level SELECT grant with an explicit
-- list of profile fields required by the application UI.
revoke select on table public.xmum_profiles from anon, authenticated;

grant select (
  id,
  email,
  student_id,
  name,
  name_last_changed_at,
  country,
  country_last_changed_at,
  languages,
  age,
  birthdate,
  program,
  year_of_study,
  gender,
  gender_last_changed_at,
  student_type,
  about_me,
  avatar_id,
  is_profile_complete,
  hide_details,
  is_admin,
  is_blocked_globally,
  flag_status,
  appeal_count,
  companion_pet_count,
  companion_selected_state_id
) on table public.xmum_profiles to anon, authenticated;

revoke select (password_hash) on table public.xmum_profiles from anon, authenticated;
