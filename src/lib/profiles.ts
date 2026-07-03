import type { Profile } from "../types.js";

export const DEMO_PROFILE_IDS = new Set(["sys_admin", "user_sarah", "user_ahmad", "user_xiaoming"]);
export const DEMO_PROFILE_EMAILS = new Set([
  "admin@xmu.edu.my",
  "sarah.lin@xmu.edu.my",
  "ahmad.fauzi@xmu.edu.my",
  "xiaoming@xmu.edu.my"
]);
const SYNTHETIC_PROFILE_PATTERN = /^(test|demo|mock|sample|dummy)([._-]|$)/i;
const ANONYMOUS_PROFILE_VARIANTS = [
  { label: "Panda", avatarId: "panda" },
  { label: "Kitten", avatarId: "cat" },
  { label: "Bunny", avatarId: "bunny" },
  { label: "Bear", avatarId: "bear" },
  { label: "Fox", avatarId: "fox" },
  { label: "Koala", avatarId: "koala" },
  { label: "Owl", avatarId: "owl" },
  { label: "Frog", avatarId: "frog" }
] as const;

export function getAnonymousProfileVariant(seed: string) {
  const normalizedSeed = seed.trim() || "anonymous";
  let hash = 0;

  for (let index = 0; index < normalizedSeed.length; index += 1) {
    hash += normalizedSeed.charCodeAt(index);
  }

  return ANONYMOUS_PROFILE_VARIANTS[Math.abs(hash) % ANONYMOUS_PROFILE_VARIANTS.length];
}

export function buildAnonymousAliasProfile(
  profile: Profile | null | undefined,
  options?: {
    seed?: string;
    aboutMe?: string;
    hideDetails?: boolean;
  }
): Profile {
  const seed = options?.seed || profile?.id || "anonymous";
  const variant = getAnonymousProfileVariant(seed);

  return {
    id: profile?.id || seed,
    email: "",
    student_id: "",
    name: `Anonymous ${variant.label}`,
    name_last_changed_at: null,
    country: profile?.country || "Malaysia",
    country_last_changed_at: null,
    languages: Array.isArray(profile?.languages) ? profile.languages : [],
    age: profile?.age || 20,
    birthdate: profile?.birthdate,
    program: profile?.program || "Undergraduate",
    year_of_study: profile?.year_of_study || "Year 1",
    gender: profile?.gender || "Prefer not to say",
    gender_last_changed_at: profile?.gender_last_changed_at ?? null,
    student_type: profile?.student_type || "degree",
    about_me:
      options?.aboutMe || "This student is staying anonymous while still sharing a few verified basics.",
    avatar_id: variant.avatarId,
    is_profile_complete: true,
    hide_details: options?.hideDetails ?? true,
    is_admin: false,
    is_blocked_globally: Boolean(profile?.is_blocked_globally),
    flag_status: profile?.flag_status || "none",
    appeal_count: profile?.appeal_count || 0,
    companion_pet_count: profile?.companion_pet_count ?? 0,
    companion_selected_state_id: profile?.companion_selected_state_id ?? null,
    password_hash: null,
    is_demo_profile: false
  };
}

export function isDemoProfile(profile: Pick<Profile, "id" | "email" | "is_demo_profile">): boolean {
  if (profile.is_demo_profile) {
    return true;
  }

  const normalizedEmail = profile.email.trim().toLowerCase();
  const localPart = normalizedEmail.split("@")[0] || "";
  const normalizedId = profile.id.trim().toLowerCase();

  return (
    DEMO_PROFILE_IDS.has(profile.id) ||
    DEMO_PROFILE_EMAILS.has(normalizedEmail) ||
    SYNTHETIC_PROFILE_PATTERN.test(localPart) ||
    SYNTHETIC_PROFILE_PATTERN.test(normalizedId)
  );
}

export function isDemoProfileId(profileId: string): boolean {
  return DEMO_PROFILE_IDS.has(profileId.trim());
}

export function normalizeProfileEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hasMeaningfulDisplayName(profile: Profile): boolean {
  const normalizedName = profile.name.trim().toLowerCase();
  const normalizedId = profile.id.trim().toLowerCase();
  const normalizedStudentId = profile.student_id.trim().toLowerCase();
  const emailLocalPart = normalizeProfileEmail(profile.email).split("@")[0] || "";

  if (!normalizedName) {
    return false;
  }

  return (
    normalizedName !== emailLocalPart &&
    normalizedName !== normalizedStudentId &&
    normalizedName !== normalizedId &&
    normalizedName !== "friend" &&
    normalizedName !== "student"
  );
}

export function pickCanonicalProfile(
  profiles: Profile[],
  options?: { email?: string; authUserId?: string | null }
): Profile | null {
  const normalizedEmail = options?.email ? normalizeProfileEmail(options.email) : null;
  const matches = normalizedEmail
    ? profiles.filter(profile => normalizeProfileEmail(profile.email) === normalizedEmail)
    : [...profiles];

  if (matches.length === 0) {
    return null;
  }

  const scored = [...matches].sort((a, b) => {
    const score = (profile: Profile) => {
      let total = 0;

      if (!isDemoProfile(profile)) total += 200;
      if (normalizedEmail && normalizeProfileEmail(profile.email) === normalizedEmail) total += 1000;
      if (profile.is_profile_complete) total += 400;
      if (hasMeaningfulDisplayName(profile)) total += 175;
      if (profile.password_hash) total += 125;
      if (options?.authUserId && profile.id === options.authUserId) total += 100;
      if (!profile.is_blocked_globally) total += 10;

      return total;
    };

    return score(b) - score(a);
  });

  return scored[0];
}

const ACCOUNT_SYNC_FIELDS: Array<keyof Profile> = [
  "name",
  "name_last_changed_at",
  "country",
  "country_last_changed_at",
  "languages",
  "age",
  "birthdate",
  "program",
  "year_of_study",
  "gender",
  "gender_last_changed_at",
  "student_type",
  "about_me",
  "avatar_id",
  "is_profile_complete",
  "hide_details",
  "password_hash"
];

export function reconcileProfilesByEmail(profiles: Profile[]): Profile[] {
  const grouped = new Map<string, Profile[]>();

  for (const profile of profiles) {
    const email = normalizeProfileEmail(profile.email);
    const existing = grouped.get(email) || [];
    existing.push(profile);
    grouped.set(email, existing);
  }

  const reconciled: Profile[] = [];

  for (const [email, group] of grouped.entries()) {
    const canonical = pickCanonicalProfile(group, { email });
    if (!canonical) {
      reconciled.push(...group);
      continue;
    }

    for (const profile of group) {
      const nextProfile: Profile = { ...profile };

      for (const field of ACCOUNT_SYNC_FIELDS) {
        const canonicalValue = canonical[field];
        if (
          canonicalValue !== undefined &&
          canonicalValue !== null &&
          canonicalValue !== "" &&
          !(Array.isArray(canonicalValue) && canonicalValue.length === 0)
        ) {
          (nextProfile as any)[field] = canonicalValue;
        }
      }

      if (canonical.is_profile_complete) {
        nextProfile.is_profile_complete = true;
      }

      if (canonical.password_hash) {
        nextProfile.password_hash = canonical.password_hash;
      }

      reconciled.push(nextProfile);
    }
  }

  return reconciled;
}

export function collapseProfilesByEmail(profiles: Profile[]): Profile[] {
  const grouped = new Map<string, Profile[]>();

  for (const profile of profiles) {
    const email = normalizeProfileEmail(profile.email);
    const existing = grouped.get(email) || [];
    existing.push(profile);
    grouped.set(email, existing);
  }

  const collapsed: Profile[] = [];
  for (const [email, group] of grouped.entries()) {
    const canonical = pickCanonicalProfile(group, { email });
    if (canonical) {
      collapsed.push(canonical);
    }
  }

  return collapsed;
}
