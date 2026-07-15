export type AvatarBorderReward = {
  id: string;
  count: number;
  name: string;
  animated: boolean;
  gradient: string;
  shadow: string;
  sparkles?: boolean;
  motion?: "none" | "heartbeat" | "lunar-sway" | "comet-spin" | "aurora-shift" | "eternal-orbit" | "nebula-drift" | "sakura-breathe" | "crown-reverse" | "ocean-tide" | "prism-shift" | "starlight-glow";
  ringWidth?: number;
  visual?: "solid" | "double" | "faceted" | "beads" | "petals" | "comet" | "ribbons" | "glow" | "orbits" | "crown" | "waves" | "stars";
  accent?: string;
  secondary?: string;
};

export const AVATAR_BORDER_REWARDS: readonly AvatarBorderReward[] = [
  { id: "honey-halo", count: 200, name: "Gilded Sun", animated: true, motion: "heartbeat", visual: "solid", ringWidth: 4, gradient: "linear-gradient(135deg,#D97706,#FBBF24 43%,#FFF1A8 54%,#F59E0B 70%,#B45309)", shadow: "none", accent: "#F59E0B", secondary: "#FDE68A" },
  { id: "blossom-loop", count: 500, name: "Verdant Bloom", animated: true, motion: "lunar-sway", visual: "double", ringWidth: 4, gradient: "conic-gradient(#3F6212,#84CC16 34%,#F9A8D4 50%,#65A30D 68%,#3F6212)", shadow: "none", accent: "#65A30D", secondary: "#F9A8D4" },
  { id: "crystal-tide", count: 800, name: "Frost Crystal", animated: true, motion: "prism-shift", visual: "faceted", ringWidth: 5, gradient: "conic-gradient(#475569,#94A3B8 28%,#E2E8F0 46%,#F8FAFC 56%,#BAE6FD 70%,#64748B)", shadow: "none", accent: "#94A3B8", secondary: "#E0F2FE" },
  { id: "golden-heart", count: 1000, name: "Emerald Laurel", animated: true, motion: "sakura-breathe", visual: "petals", ringWidth: 5, gradient: "conic-gradient(#14532D,#16A34A 30%,#BBF7D0 48%,#FDE68A 55%,#22C55E 72%,#14532D)", shadow: "none", accent: "#22C55E", secondary: "#BBF7D0" },
  { id: "moonlit-bloom", count: 1200, name: "Moon Silver", animated: true, motion: "lunar-sway", visual: "petals", ringWidth: 4, gradient: "conic-gradient(from 210deg,#475569,#CBD5E1 44%,#EEF2FF 54%,#94A3B8 72%,#475569)", shadow: "none", accent: "#94A3B8", secondary: "#E0E7FF" },
  { id: "comet-ribbon", count: 1500, name: "Ember Flame", animated: true, motion: "comet-spin", visual: "comet", ringWidth: 4, gradient: "conic-gradient(#7F1D1D,#DC2626 32%,#F97316 50%,#FBBF24 62%,#B91C1C 80%,#7F1D1D)", shadow: "none", accent: "#F97316", secondary: "#FDE68A" },
  { id: "royal-aurora", count: 1800, name: "Radiant Light", animated: true, motion: "aurora-shift", visual: "ribbons", ringWidth: 5, gradient: "conic-gradient(#F8FAFC,#FDE68A 30%,#BAE6FD 52%,#E0E7FF 74%,#F8FAFC)", shadow: "none", accent: "#FBBF24", secondary: "#7DD3FC" },
  { id: "eternal-heartkeeper", count: 2000, name: "Eternal Heartkeeper", animated: true, motion: "eternal-orbit", visual: "glow", ringWidth: 5, gradient: "conic-gradient(#881337,#E11D48 32%,#FFF1F2 48%,#FDE7D7 58%,#FB7185 74%,#881337)", shadow: "0 0 9px rgba(225,29,72,.2)", accent: "#E11D48", secondary: "#FFF1F2" }
] as const;

export const BONUS_AVATAR_BORDERS: readonly AvatarBorderReward[] = [
  { id: "heart-nebula", count: 2000, name: "Heart Nebula", animated: true, motion: "nebula-drift", visual: "orbits", ringWidth: 3, gradient: "conic-gradient(#831843 0 28%,transparent 28% 38%,#DB2777 38% 66%,transparent 66% 76%,#7E22CE 76%)", shadow: "none", accent: "#DB2777", secondary: "#8B5CF6" },
  { id: "sakura-current", count: 2000, name: "Sakura Current", animated: true, motion: "sakura-breathe", visual: "petals", ringWidth: 4, gradient: "repeating-conic-gradient(#FB7185 0 7deg,#FBCFE8 7deg 18deg,#FFF1F2 18deg 25deg)", shadow: "none", accent: "#FB7185", secondary: "#FBCFE8" },
  { id: "celestial-crown", count: 2000, name: "Celestial Crown", animated: true, motion: "crown-reverse", visual: "crown", ringWidth: 4, gradient: "conic-gradient(#1E1B4B,#4338CA 38%,#FDE68A 50%,#F59E0B 56%,#312E81 72%,#1E1B4B)", shadow: "none", accent: "#FBBF24", secondary: "#C4B5FD" },
  { id: "ocean-orbit", count: 2000, name: "Tidal Crest", animated: true, motion: "ocean-tide", visual: "waves", ringWidth: 3, gradient: "linear-gradient(#0891B2,#22D3EE,#34D399)", shadow: "none", accent: "#06B6D4", secondary: "#34D399" },
  { id: "prism-wings", count: 2000, name: "Amethyst Aegis", animated: true, motion: "prism-shift", visual: "faceted", ringWidth: 4, gradient: "conic-gradient(#312E81,#6366F1 32%,#C4B5FD 50%,#8B5CF6 68%,#4C1D95)", shadow: "none", accent: "#6366F1", secondary: "#C4B5FD" },
  { id: "starlight-gala", count: 2000, name: "Midnight Constellation", animated: true, motion: "starlight-glow", visual: "stars", ringWidth: 5, gradient: "conic-gradient(#020617,#172554 34%,#312E81 52%,#1E1B4B 70%,#020617)", shadow: "none", accent: "#FDE68A", secondary: "#818CF8" }
] as const;

export const AVATAR_BORDER_CHOICES = [...AVATAR_BORDER_REWARDS, ...BONUS_AVATAR_BORDERS] as const;

const BORDER_PREFIX = "reward-border/";
const BORDER_SEPARATOR = "|avatar|";

export function decodeAvatarSelection(rawId?: string | null): { avatarId: string; borderId: string | null } {
  const value = rawId || "";
  if (!value.startsWith(BORDER_PREFIX)) return { avatarId: value, borderId: null };
  const separatorIndex = value.indexOf(BORDER_SEPARATOR);
  if (separatorIndex < 0) return { avatarId: value, borderId: null };
  return {
    borderId: value.slice(BORDER_PREFIX.length, separatorIndex) || null,
    avatarId: value.slice(separatorIndex + BORDER_SEPARATOR.length) || ""
  };
}

export function encodeAvatarSelection(avatarId: string, borderId?: string | null): string {
  const decoded = decodeAvatarSelection(avatarId);
  return borderId ? `${BORDER_PREFIX}${borderId}${BORDER_SEPARATOR}${decoded.avatarId}` : decoded.avatarId;
}

export function getAvatarBorderReward(petCount?: number | null, selectedBorderId?: string | null): AvatarBorderReward | null {
  const count = Math.max(0, Number(petCount || 0));
  if (selectedBorderId) {
    const selected = AVATAR_BORDER_CHOICES.find(reward => reward.id === selectedBorderId);
    if (selected) return selected;
  }
  return [...AVATAR_BORDER_REWARDS].reverse().find(reward => count >= reward.count) || null;
}

export const companionAvatarId = (stateId: string) => `companion:${stateId}`;

export function getCompanionStateIdFromAvatar(avatarId?: string | null): string | null {
  const decoded = decodeAvatarSelection(avatarId).avatarId;
  if (!decoded.startsWith("companion:")) return null;
  return decoded.slice("companion:".length) || null;
}
