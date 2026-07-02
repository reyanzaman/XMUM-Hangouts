import type { Profile } from "../types";
import { normalizeProfileEmail } from "./profiles";

export const legacyCompanionStateStorageKey = "xmum_companion_state";

export type StoredCompanionState = {
  petCount?: number;
  lastMilestoneReached?: number;
  milestoneTimestamp?: number;
  isPermanent?: boolean;
  selectedStateId?: string | null;
};

export function getCompanionStateStorageKey(email?: string | null) {
  const normalizedEmail = email ? normalizeProfileEmail(email) : "guest";
  return `xmum_companion_state_${normalizedEmail}`;
}

export function buildStoredCompanionStateFromProfile(profile?: Pick<Profile, "companion_pet_count" | "companion_selected_state_id"> | null): StoredCompanionState {
  const petCount = Math.max(0, Number(profile?.companion_pet_count || 0));
  const selectedStateId =
    typeof profile?.companion_selected_state_id === "string"
      ? profile.companion_selected_state_id
      : null;

  return {
    petCount,
    lastMilestoneReached: petCount,
    milestoneTimestamp: petCount > 0 ? Date.now() : undefined,
    isPermanent: petCount >= 1000,
    selectedStateId
  };
}

function readRawCompanionState(key: string): StoredCompanionState {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

export function resolveStoredCompanionState(
  email?: string | null,
  profile?: Pick<Profile, "companion_pet_count" | "companion_selected_state_id"> | null
): StoredCompanionState {
  const keyedState = readRawCompanionState(getCompanionStateStorageKey(email));
  const legacyState = readRawCompanionState(legacyCompanionStateStorageKey);
  const profileState = buildStoredCompanionStateFromProfile(profile);
  const states = [profileState, legacyState, keyedState];

  return states.reduce<StoredCompanionState>((best, candidate) => {
    const bestCount = Math.max(0, Number(best.petCount || 0));
    const candidateCount = Math.max(0, Number(candidate.petCount || 0));

    if (candidateCount > bestCount) {
      return {
        ...candidate,
        petCount: candidateCount,
        isPermanent: candidateCount >= 1000 || Boolean(candidate.isPermanent)
      };
    }

    if (candidateCount === bestCount && !best.selectedStateId && candidate.selectedStateId) {
      return {
        ...best,
        selectedStateId: candidate.selectedStateId
      };
    }

    return best;
  }, {});
}

export function writeStoredCompanionState(email: string | null | undefined, state: StoredCompanionState) {
  const normalizedState: StoredCompanionState = {
    ...state,
    petCount: Math.max(0, Number(state.petCount || 0)),
    isPermanent: Math.max(0, Number(state.petCount || 0)) >= 1000 || Boolean(state.isPermanent),
    selectedStateId: state.selectedStateId || null
  };

  try {
    localStorage.setItem(getCompanionStateStorageKey(email), JSON.stringify(normalizedState));
    localStorage.setItem(legacyCompanionStateStorageKey, JSON.stringify(normalizedState));
  } catch {
    // Ignore storage failures and keep the session usable.
  }

  return normalizedState;
}
