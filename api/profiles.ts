import { createSupabaseSyncHandler } from "./utils/supabase-sync";
import { collapseProfilesByEmail } from "../src/lib/profiles";

const sanitizeProfileForDatabase = (profile: any) => ({
  id: profile.id,
  email: profile.email,
  student_id: profile.student_id,
  name: profile.name,
  name_last_changed_at: profile.name_last_changed_at ?? null,
  country: profile.country,
  country_last_changed_at: profile.country_last_changed_at ?? null,
  languages: Array.isArray(profile.languages) ? profile.languages : [],
  age: profile.age,
  program: profile.program,
  year_of_study: profile.year_of_study,
  gender: profile.gender,
  student_type: profile.student_type,
  about_me: profile.about_me,
  avatar_id: profile.avatar_id,
  is_profile_complete: Boolean(profile.is_profile_complete),
  hide_details: Boolean(profile.hide_details),
  is_admin: Boolean(profile.is_admin),
  is_blocked_globally: Boolean(profile.is_blocked_globally),
  flag_status: profile.flag_status,
  appeal_count: profile.appeal_count ?? 0
});

export default createSupabaseSyncHandler({
  payloadKey: "profiles",
  table: "xmum_profiles",
  transformRows: rows => collapseProfilesByEmail(rows).map(sanitizeProfileForDatabase)
});
