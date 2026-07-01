import type { Profile } from "../types.js";

export const DEMO_PROFILE_IDS = new Set(["sys_admin", "user_sarah", "user_ahmad", "user_xiaoming"]);
export const DEMO_PROFILE_EMAILS = new Set([
  "admin@xmu.edu.my",
  "sarah.lin@xmu.edu.my",
  "ahmad.fauzi@xmu.edu.my",
  "xiaoming@xmu.edu.my"
]);
const SYNTHETIC_PROFILE_PATTERN = /^(test|demo|mock|sample|dummy)([._-]|$)/i;

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
