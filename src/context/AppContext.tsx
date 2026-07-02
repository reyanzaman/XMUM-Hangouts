/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  Profile,
  Hangout,
  HangoutApplication,
  HangoutLike,
  HangoutComment,
  Report,
  ReportAppeal,
  Chat,
  Message,
  Block,
  AppNotification,
  HangoutRestrictions
} from "../types";

import { XMUM_PROGRAMS } from "../config/xmum-config";
import { matchesPrimaryAdminEmail } from "../lib/admin";
import type { StoredCompanionState } from "../lib/companionState";
import { supabase } from "../lib/supabase";
import { encryptMessage, decryptMessage } from "../lib/encryption";
import { hashPassword, matchesStoredPassword } from "../lib/security";
import {
  MIN_HANGOUT_DESCRIPTION_LENGTH,
  serializeHangoutEditHistoryEntry,
  validateFutureHangoutDate
} from "../lib/hangouts";
import { collapseProfilesByEmail, isDemoProfile, isDemoProfileId, normalizeProfileEmail, pickCanonicalProfile, reconcileProfilesByEmail } from "../lib/profiles";

const SYSTEM_DELETED_USER_ID = "deleted_user";
const SYSTEM_DELETED_USER_EMAIL = "deleted.user@system.local";

const normalizeProfileRecord = (profile: Profile): Profile => {
  const normalized: Profile = { ...profile };

  if (typeof normalized.password === "string" && normalized.password.trim() && !normalized.password_hash) {
    normalized.password_hash = hashPassword(normalized.email, normalized.password);
  }

  delete normalized.password;
  normalized.is_demo_profile = isDemoProfile(normalized);

  return normalized;
};

const normalizeProfiles = (profiles: Profile[]): Profile[] => reconcileProfilesByEmail(profiles.map(normalizeProfileRecord));

const onboardingStorageKey = (email: string) => `xmum_onboarding_seen_${normalizeProfileEmail(email)}`;
const authRedirectStorageKey = "xmum_auth_redirect_pending";
const localAuthTokenStorageKey = "xmum_local_auth_token";
const demoDataEnabled = import.meta.env.VITE_ENABLE_DEMO_DATA === "true";

const filterProfilesForRuntime = (items: Profile[]) =>
  demoDataEnabled ? items : items.filter(profile => !isDemoProfile(profile));

const filterHangoutsForRuntime = (items: Hangout[]) =>
  demoDataEnabled ? items : items.filter(hangout => !isDemoProfileId(hangout.creator_id));

const LOCKED_MEETING_POINT_MARKERS = [
  "apply and get accepted to unlock",
  "visible after the host approves your request"
];

const isLockedMeetingPointPlaceholder = (value: string | null | undefined) => {
  const normalizedValue = (value || "").trim().toLowerCase();
  return LOCKED_MEETING_POINT_MARKERS.some(marker => normalizedValue.includes(marker));
};

const mergeHangoutCollections = (primary: Hangout[], secondary: Hangout[]) => {
  const secondaryById = new Map(secondary.map(item => [item.id, item]));
  const merged = mergeByField(primary, secondary);

  return merged.map(hangout => {
    const fallback = secondaryById.get(hangout.id);
    if (
      fallback &&
      (!hangout.meeting_point || isLockedMeetingPointPlaceholder(hangout.meeting_point)) &&
      Boolean(fallback.meeting_point) &&
      !isLockedMeetingPointPlaceholder(fallback.meeting_point)
    ) {
      return {
        ...hangout,
        meeting_point: fallback.meeting_point
      };
    }
    return hangout;
  });
};

const filterApplicationsForRuntime = (items: HangoutApplication[], hangoutIds: Set<string>) =>
  demoDataEnabled
    ? items
    : items.filter(application => !isDemoProfileId(application.applicant_id) && hangoutIds.has(application.hangout_id));

const filterChatsForRuntime = (items: Chat[], hangoutIds: Set<string>) =>
  demoDataEnabled
    ? items
    : items.filter(
        chat =>
          !isDemoProfileId(chat.user_a_id) &&
          !isDemoProfileId(chat.user_b_id) &&
          (!chat.hangout_id || hangoutIds.has(chat.hangout_id))
      );

const filterMessagesForRuntime = (items: Message[], chatIds: Set<string>) =>
  demoDataEnabled
    ? items
    : items.filter(message => !isDemoProfileId(message.sender_id) && chatIds.has(message.chat_id));

const filterLikesForRuntime = (items: HangoutLike[], hangoutIds: Set<string>) =>
  demoDataEnabled
    ? items
    : items.filter(like => !isDemoProfileId(like.user_id) && hangoutIds.has(like.hangout_id));

const filterCommentsForRuntime = (items: HangoutComment[], hangoutIds: Set<string>) =>
  demoDataEnabled
    ? items
    : items.filter(comment => !isDemoProfileId(comment.user_id) && hangoutIds.has(comment.hangout_id));

const filterReportsForRuntime = (items: Report[]) =>
  demoDataEnabled
    ? items
    : items.filter(report => !isDemoProfileId(report.reporter_id) && !isDemoProfileId(report.reported_user_id));

const filterAppealsForRuntime = (items: ReportAppeal[], reportIds: Set<string>) =>
  demoDataEnabled ? items : items.filter(appeal => reportIds.has(appeal.report_id));

const sanitizeBlocks = (items: Block[]) => {
  const latestByPair = new Map<string, Block>();

  items.forEach(block => {
    if (!block?.id || !block.blocker_id || !block.blocked_id) return;
    if (block.blocker_id === block.blocked_id) return;

    latestByPair.set(`${block.blocker_id}::${block.blocked_id}`, block);
  });

  return Array.from(latestByPair.values());
};

const getRemovedBlockIds = (previousBlocks: Block[], nextBlocks: Block[]) => {
  const nextIds = new Set(nextBlocks.map(block => block.id));
  return previousBlocks
    .map(block => block?.id)
    .filter((id): id is string => Boolean(id) && !nextIds.has(id));
};

const filterBlocksForRuntime = (items: Block[]) =>
  demoDataEnabled
    ? sanitizeBlocks(items)
    : sanitizeBlocks(items).filter(
        block => !isDemoProfileId(block.blocker_id) && !isDemoProfileId(block.blocked_id)
      );

const filterNotificationsForRuntime = (items: AppNotification[]) =>
  demoDataEnabled ? items : items.filter(notification => !isDemoProfileId(notification.user_id));

const readStoredArray = <T,>(storageKey: string): T[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const mergeByField = <T extends { id: string }>(arrSupa: T[], arrLocal: T[]): T[] => {
  const mapObj = new Map<string, T>();
  if (Array.isArray(arrLocal)) {
    arrLocal.forEach(item => {
      if (item && item.id) mapObj.set(item.id, item);
    });
  }
  if (Array.isArray(arrSupa)) {
    arrSupa.forEach(item => {
      if (item && item.id) mapObj.set(item.id, item);
    });
  }
  return Array.from(mapObj.values());
};

const sanitizeHangout = (h: any): Hangout => ({
  id: h.id,
  creator_id: h.creator_id,
  intention: h.intention,
  location: h.location,
  event_datetime: h.event_datetime,
  meeting_point: h.meeting_point,
  additional_info: h.additional_info,
  max_participants: h.max_participants,
  restrictions: h.restrictions,
  status: h.status,
  created_at: h.created_at,
  updated_at: h.updated_at,
  is_anonymous: !!h.is_anonymous
});

const getStoredProfilesSnapshot = (): Profile[] =>
  filterProfilesForRuntime(normalizeProfiles(readStoredArray<Profile>("xmum_profiles")));

const getStoredHangoutsSnapshot = (): Hangout[] =>
  filterHangoutsForRuntime(
    readStoredArray<any>("xmum_hangouts")
      .map(sanitizeHangout)
      .filter(hangout => hangout.additional_info && hangout.additional_info.trim() !== "")
  );

const getStoredApplicationsSnapshot = (hangoutIds?: Set<string>): HangoutApplication[] => {
  const resolvedHangoutIds = hangoutIds || new Set(getStoredHangoutsSnapshot().map(hangout => hangout.id));
  return filterApplicationsForRuntime(readStoredArray<HangoutApplication>("xmum_applications"), resolvedHangoutIds);
};

const getStoredChatsSnapshot = (hangoutIds?: Set<string>): Chat[] => {
  const resolvedHangoutIds = hangoutIds || new Set(getStoredHangoutsSnapshot().map(hangout => hangout.id));
  return filterChatsForRuntime(readStoredArray<Chat>("xmum_chats"), resolvedHangoutIds);
};

const getStoredMessagesSnapshot = (chatIds?: Set<string>): Message[] => {
  const resolvedChatIds = chatIds || new Set(getStoredChatsSnapshot().map(chat => chat.id));
  const decryptedMessages = readStoredArray<any>("xmum_messages").map((message: any) => {
    try {
      return { ...message, content: decryptMessage(message.content) } as Message;
    } catch {
      return message as Message;
    }
  });
  return filterMessagesForRuntime(decryptedMessages, resolvedChatIds);
};

const getStoredLikesSnapshot = (hangoutIds?: Set<string>): HangoutLike[] => {
  const resolvedHangoutIds = hangoutIds || new Set(getStoredHangoutsSnapshot().map(hangout => hangout.id));
  return filterLikesForRuntime(readStoredArray<HangoutLike>("xmum_likes"), resolvedHangoutIds);
};

const getStoredCommentsSnapshot = (hangoutIds?: Set<string>): HangoutComment[] => {
  const resolvedHangoutIds = hangoutIds || new Set(getStoredHangoutsSnapshot().map(hangout => hangout.id));
  return filterCommentsForRuntime(readStoredArray<HangoutComment>("xmum_comments"), resolvedHangoutIds);
};

const getStoredReportsSnapshot = (): Report[] =>
  filterReportsForRuntime(readStoredArray<Report>("xmum_reports"));

const getStoredAppealsSnapshot = (reportIds?: Set<string>): ReportAppeal[] => {
  const resolvedReportIds = reportIds || new Set(getStoredReportsSnapshot().map(report => report.id));
  return filterAppealsForRuntime(readStoredArray<ReportAppeal>("xmum_appeals"), resolvedReportIds);
};

const getStoredBlocksSnapshot = (): Block[] =>
  filterBlocksForRuntime(readStoredArray<Block>("xmum_blocks"));

const getStoredNotificationsSnapshot = (): AppNotification[] =>
  filterNotificationsForRuntime(readStoredArray<AppNotification>("xmum_notifications"));

const hasSeenOnboarding = (email: string): boolean => {
  try {
    return localStorage.getItem(onboardingStorageKey(email)) === "true";
  } catch {
    return false;
  }
};

const markOnboardingSeen = (email: string) => {
  try {
    localStorage.setItem(onboardingStorageKey(email), "true");
  } catch {
    // Ignore storage issues and keep the session usable.
  }
};

const markAuthRedirectPending = () => {
  try {
    sessionStorage.setItem(authRedirectStorageKey, "true");
  } catch {
    // Ignore storage issues and continue with the redirect.
  }
};

const clearAuthRedirectPending = () => {
  try {
    sessionStorage.removeItem(authRedirectStorageKey);
  } catch {
    // Ignore storage issues and keep the session usable.
  }
};

const storeLocalAuthToken = (token?: string | null) => {
  try {
    if (token) {
      localStorage.setItem(localAuthTokenStorageKey, token);
    } else {
      localStorage.removeItem(localAuthTokenStorageKey);
    }
  } catch {
    // Ignore storage errors and keep the session usable.
  }
};

const getLocalAuthToken = () => {
  try {
    return localStorage.getItem(localAuthTokenStorageKey);
  } catch {
    return null;
  }
};

const getAuthRedirectOrigin = () => {
  const { protocol, hostname, port } = window.location;
  if (hostname === "127.0.0.1") {
    return `${protocol}//localhost${port ? `:${port}` : ""}`;
  }

  return window.location.origin;
};

const escapeSupabaseLikePattern = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");

const isMissingPasswordHashColumnError = (error: unknown) => {
  const maybeError = error as { message?: unknown; code?: unknown };
  const message = typeof maybeError?.message === "string"
    ? maybeError.message
    : error instanceof Error
      ? error.message
      : String(error || "");
  const code = typeof maybeError?.code === "string" ? maybeError.code : "";
  return message.includes("password_hash") && (message.includes("does not exist") || message.includes("schema cache") || code === "PGRST204");
};

const isMissingProfileColumnError = (error: unknown, columnName: string) => {
  const maybeError = error as { message?: unknown; code?: unknown };
  const message = typeof maybeError?.message === "string"
    ? maybeError.message
    : error instanceof Error
      ? error.message
      : String(error || "");
  const code = typeof maybeError?.code === "string" ? maybeError.code : "";
  return message.includes(columnName) && (message.includes("does not exist") || message.includes("schema cache") || code === "PGRST204");
};

const profileColumnSupport = {
  birthdate: true,
  password_hash: true,
  companion_pet_count: true,
  companion_selected_state_id: true
};

const markUnsupportedProfileColumns = (error: unknown) => {
  if (isMissingProfileColumnError(error, "birthdate")) {
    profileColumnSupport.birthdate = false;
  }
  if (isMissingPasswordHashColumnError(error)) {
    profileColumnSupport.password_hash = false;
  }
  if (isMissingProfileColumnError(error, "companion_pet_count")) {
    profileColumnSupport.companion_pet_count = false;
  }
  if (isMissingProfileColumnError(error, "companion_selected_state_id")) {
    profileColumnSupport.companion_selected_state_id = false;
  }
};

const getProfileSelectColumns = () => {
  const baseColumns = [
    "id",
    "email",
    "student_id",
    "name",
    "name_last_changed_at",
    "country",
    "country_last_changed_at",
    "languages",
    "age",
    "program",
    "year_of_study",
    "gender",
    "student_type",
    "about_me",
    "avatar_id",
    "is_profile_complete",
    "hide_details",
    "is_admin",
    "is_blocked_globally",
    "flag_status",
    "appeal_count"
  ];

  if (profileColumnSupport.birthdate) {
    baseColumns.push("birthdate");
  }
  if (profileColumnSupport.companion_pet_count) {
    baseColumns.push("companion_pet_count");
  }
  if (profileColumnSupport.companion_selected_state_id) {
    baseColumns.push("companion_selected_state_id");
  }
  if (profileColumnSupport.password_hash) {
    baseColumns.push("password_hash");
  }

  return baseColumns.join(",");
};

const stripUnsupportedColumnsFromProfileRow = (row: Record<string, any>) => {
  const nextRow = { ...row };
  if (!profileColumnSupport.birthdate) {
    delete nextRow.birthdate;
  }
  if (!profileColumnSupport.password_hash) {
    delete nextRow.password_hash;
  }
  if (!profileColumnSupport.companion_pet_count) {
    delete nextRow.companion_pet_count;
  }
  if (!profileColumnSupport.companion_selected_state_id) {
    delete nextRow.companion_selected_state_id;
  }
  return nextRow;
};

const stripUnsupportedProfileColumns = (rows: Array<Record<string, any>>, error: unknown) => {
  markUnsupportedProfileColumns(error);
  return rows.map(row => {
    const nextRow = stripUnsupportedColumnsFromProfileRow(row);
    if (isMissingProfileColumnError(error, "birthdate")) delete nextRow.birthdate;
    if (isMissingPasswordHashColumnError(error)) delete nextRow.password_hash;
    if (isMissingProfileColumnError(error, "companion_pet_count")) delete nextRow.companion_pet_count;
    if (isMissingProfileColumnError(error, "companion_selected_state_id")) delete nextRow.companion_selected_state_id;
    return nextRow;
  });
};

const stripEmojiCharacters = (message: string) =>
  message
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/âš ï¸|ðŸš¨|ðŸ•’|ðŸŒŸ|ðŸ“¢|ðŸ”“|ðŸš€|â—/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const humanizeToastMessage = (message: string): string => {
  const normalized = stripEmojiCharacters(message);

  const replacements: Array<[RegExp, string]> = [
    [/^Rate limit exceeded: You can only create up to 5 hangouts per day\.?$/i, "You've reached today's hangout posting limit. Please try again tomorrow."],
    [/^Background safety cron verified: successfully scanned for expiries & reminders\.?$/i, "Hangout reminders and expiry checks are up to date."],
    [/^Report successfully marked as approved!?$/i, "The safety report has been approved."],
    [/^Report successfully marked as rejected!?$/i, "The safety report has been closed."],
    [/^Appeal review complete: marked as approved\.?$/i, "The appeal has been approved."],
    [/^Appeal review complete: marked as rejected\.?$/i, "The appeal has been declined."],
    [/^Application successfully accepted!?$/i, "The join request has been accepted."],
    [/^Application successfully rejected!?$/i, "The join request has been declined."],
    [/^Signed out successfully\.?$/i, "You have been signed out."],
    [/^Comment added successfully!?$/i, "Your comment has been posted."],
    [/^Application retracted\.?$/i, "Your join request has been withdrawn."],
    [/^Profile updated successfully!?$/i, "Your profile has been updated."],
    [/^Bug report sent to the admin team\.?$/i, "Your bug report has been sent to the admin team."],
    [/^Bug report saved for the admin team\. Email delivery needs attention\.?$/i, "Your bug report reached the admin inbox. Email delivery still needs to be checked."],
    [/^Feature Request sent to the admin team\.?$/i, "Your feature request has been sent to the admin team."],
    [/^Feature Request saved for the admin team\. Email delivery needs attention\.?$/i, "Your feature request reached the admin inbox. Email delivery still needs to be checked."],
    [/^Please login\b/i, "Please log in"],
    [/^Authentication failed\. Try again\.?$/i, "We couldn't sign you in. Please try again."],
    [/^Password authentication failed\.?$/i, "Your password didn't work. Please try again."],
    [/^Incorrect OTP code\.?$/i, "That verification code doesn't look right. Please try again."],
    [/^Failed secure OTP email dispatch\.?$/i, "We couldn't send your verification code just now. Please try again."],
    [/^Not logged in$/i, "Please sign in to continue."]
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(normalized)) {
      return replacement;
    }
  }

  return normalized;
};

const buildDeletedUserProfile = (): Profile => ({
  id: SYSTEM_DELETED_USER_ID,
  email: SYSTEM_DELETED_USER_EMAIL,
  student_id: "deleted.user",
  name: "Deleted User",
  name_last_changed_at: null,
  country: "Malaysia",
  country_last_changed_at: null,
  languages: [],
  age: 0,
  program: "Not Specified",
  year_of_study: "Not Specified",
  gender: "Prefer not to say",
  student_type: "Not Specified",
  about_me: "This account has been removed.",
  avatar_id: "owl",
  is_profile_complete: true,
  hide_details: true,
  is_admin: false,
  is_blocked_globally: false,
  flag_status: "none",
  appeal_count: 0,
  companion_pet_count: 0,
  companion_selected_state_id: null,
  is_demo_profile: false
});

interface AppContextType {
  currentUser: Profile | null;
  isAuthInitializing: boolean;
  profiles: Profile[];
  hangouts: Hangout[];
  applications: HangoutApplication[];
  likes: HangoutLike[];
  comments: HangoutComment[];
  reports: Report[];
  appeals: ReportAppeal[];
  chats: Chat[];
  messages: Message[];
  blocks: Block[];
  notifications: AppNotification[];
  
  // Auth Functions
  signInSimulated: (email: string, name?: string) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
    resend_expired?: boolean;
    otp_limit_reached?: boolean;
    requires_microsoft?: boolean;
    allows_password_login?: boolean;
    is_registered?: boolean;
  }>;
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  signInWithMicrosoft: (emailHint?: string) => Promise<{ success: boolean; error?: string }>;
  signOutSimulated: () => void;
  completeOnboarding: () => void;
  
  // Custom action triggers for demo
  switchUser: (profileId: string, providedProfile?: Profile) => void;
  createMockUser: (email: string, name: string, isAdmin?: boolean) => void;

  // Profile Functions
  updateProfile: (data: Partial<Profile>) => { success: boolean; error?: string };
  syncCompanionProgress: (progress: StoredCompanionState) => void;
  setHideDetails: (hide: boolean) => void;
  deleteCurrentAccount: () => Promise<{ success: boolean; error?: string }>;
  
  // Hangout Functions
  createHangout: (data: Omit<Hangout, "id" | "creator_id" | "status" | "created_at" | "updated_at">) => { success: boolean; error?: string };
  editHangout: (
    hangoutId: string,
    data: Pick<Hangout, "location" | "event_datetime" | "meeting_point" | "additional_info" | "max_participants" | "restrictions" | "is_anonymous">
  ) => { success: boolean; error?: string };
  deleteHangout: (hangoutId: string) => { success: boolean; error?: string };
  toggleLike: (hangoutId: string) => void;
  addComment: (
    hangoutId: string,
    content: string,
    parentCommentId?: string | null,
    isAnonymous?: boolean
  ) => { success: boolean; error?: string };
  
  // Application Functions
  applyToHangout: (hangoutId: string, isAnonymous: boolean) => { success: boolean; error?: string };
  retractApplication: (applicationId: string) => void;
  manageApplication: (applicationId: string, status: "accepted" | "rejected", rejectMessage?: string) => void;
  
  // Chat Functions
  getOrCreateChat: (otherUserId: string, hangoutId?: string | null) => Chat;
  sendChatMessage: (chatId: string, content: string) => void;
  markChatAsRead: (chatId: string) => void;

  // Block/Report Functions
  toggleBlockUser: (otherUserId: string) => void;
  submitReport: (reportedUserId: string, description: string) => { success: boolean; error?: string };
  submitBugReport: (data: {
    subject: string;
    description: string;
    sourcePage?: string;
    kind?: "bug" | "feature";
  }) => Promise<{ success: boolean; error?: string; warning?: string }>;
  submitAppeal: (reportId: string, description: string) => { success: boolean; error?: string };
  
  // Admin functions
  adminReviewReport: (reportId: string, action: "approved" | "rejected") => void;
  adminReviewAppeal: (appealId: string, action: "approved" | "rejected", reason?: string) => void;

  // Helpers
  isEligibleForHangout: (profile: Profile, hangout: Hangout) => { eligible: boolean; reasons: string[] };
  triggerCronJobs: () => void;
  clearNotification: (id: string) => void;
  markNotificationsAsRead: () => void;

  // Demo status helper
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  showOnboarding: boolean;
  setShowOnboarding: (val: boolean) => void;

  toast: { message: string; type: "success" | "error" | "info" } | null;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  clearToast: () => void;

  viewedProfile: Profile | null;
  setViewedProfile: (profile: Profile | null) => void;

  commentLikes: { comment_id: string; user_id: string }[];
  toggleCommentLike: (commentId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- DATABASE TABLES IN LOCAL STORAGE ---
  const [currentUser, setCurrentUser] = useState<Profile | null>(() => {
    try {
      const cached = localStorage.getItem("xmum_current_user_profile");
      return cached ? normalizeProfileRecord(JSON.parse(cached)) : null;
    } catch {
      return null;
    }
  });

  // Sync current user updates to local storage for instant loads and absolute session permanence
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("xmum_current_user_profile", JSON.stringify(currentUser));
      localStorage.setItem("xmum_current_user_id", currentUser.id);
    } else {
      localStorage.removeItem("xmum_current_user_profile");
      localStorage.removeItem("xmum_current_user_id");
    }
  }, [currentUser]);
  const [profiles, setProfiles] = useState<Profile[]>(() => getStoredProfilesSnapshot());
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(true);
  const companionProfileSyncTimeoutRef = useRef<number | null>(null);
  const [hangouts, setHangouts] = useState<Hangout[]>(() => getStoredHangoutsSnapshot());
  const [applications, setApplications] = useState<HangoutApplication[]>(() => getStoredApplicationsSnapshot());
  const applicationsRef = useRef<HangoutApplication[]>(getStoredApplicationsSnapshot());
  const [likes, setLikes] = useState<HangoutLike[]>(() => getStoredLikesSnapshot());
  const [comments, setComments] = useState<HangoutComment[]>(() => getStoredCommentsSnapshot());
  const [reports, setReports] = useState<Report[]>(() => getStoredReportsSnapshot());
  const [appeals, setAppeals] = useState<ReportAppeal[]>(() => getStoredAppealsSnapshot());
  const [chats, setChats] = useState<Chat[]>(() => getStoredChatsSnapshot());
  const [messages, setMessages] = useState<Message[]>(() => getStoredMessagesSnapshot());
  const [blocks, setBlocks] = useState<Block[]>(() => getStoredBlocksSnapshot());
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getStoredNotificationsSnapshot());
  const [commentLikes, setCommentLikes] = useState<{ comment_id: string; user_id: string }[]>(() => {
    try {
      const saved = localStorage.getItem("xmum_comment_likes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Onboarding Helper state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [viewedProfile, setViewedProfile] = useState<Profile | null>(null);

  useEffect(() => {
    return () => {
      if (companionProfileSyncTimeoutRef.current) {
        window.clearTimeout(companionProfileSyncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    applicationsRef.current = applications;
  }, [applications]);

  useEffect(() => {
    if (applications.length === 0 || hangouts.length === 0) return;
    const hangoutCreatorMap = new Map(hangouts.map(hangout => [hangout.id, hangout.creator_id]));
    const cleanedApplications = applications.filter(
      application => hangoutCreatorMap.get(application.hangout_id) !== application.applicant_id
    );
    if (cleanedApplications.length !== applications.length) {
      void saveApplications(cleanedApplications);
    }
  }, [applications, hangouts]);

  useEffect(() => {
    const hydrateAccessibleHangouts = async () => {
      if (!currentUser?.id) return;

      try {
        const acceptedHangoutIds = applications
          .filter(application => application.applicant_id === currentUser.id && application.status === "accepted")
          .map(application => application.hangout_id);

        const accessibleHangouts: Hangout[] = [];

        const { data: ownedData, error: ownedError } = await supabase.from("xmum_hangouts").select("*").eq("creator_id", currentUser.id);
        if (!ownedError && ownedData?.length) {
          accessibleHangouts.push(...(ownedData as Hangout[]));
        }

        if (acceptedHangoutIds.length > 0) {
          const { data: acceptedData, error: acceptedError } = await supabase
            .from("xmum_hangouts")
            .select("*")
            .in("id", acceptedHangoutIds);

          if (!acceptedError && acceptedData?.length) {
            accessibleHangouts.push(...(acceptedData as Hangout[]));
          }
        }

        if (accessibleHangouts.length === 0) return;

        setHangouts(prev => {
          const merged = mergeHangoutCollections(accessibleHangouts, prev);
          if (JSON.stringify(merged) === JSON.stringify(prev)) {
            return prev;
          }
          localStorage.setItem("xmum_hangouts", JSON.stringify(merged));
          return merged;
        });
      } catch (error) {
        console.warn("Failed to hydrate accessible hangouts from base table:", error);
      }
    };

    void hydrateAccessibleHangouts();
  }, [currentUser?.id, applications]);

  // Rate limits state tracker for simulation
  const [lastHangoutCreatedTime, setLastHangoutCreatedTime] = useState<number>(0);
  const [lastCommentCreatedTime, setLastCommentCreatedTime] = useState<number>(0);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message: humanizeToastMessage(message), type });
  };
  const clearToast = () => setToast(null);

  const syncServerMirror = async (path: string, payload: Record<string, unknown>) => {
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`Server mirror sync failed for ${path}:`, errorText);
      }
    } catch (error) {
      console.warn(`Server mirror sync request failed for ${path}:`, error);
    }
  };

  const fetchLocalCollection = async <T,>(path: string, payloadKey: string): Promise<T[]> => {
    try {
      const res = await fetch(path);
      const json = await res.json();
      const payload = json?.[payloadKey];
      return Array.isArray(payload) ? (payload as T[]) : [];
    } catch (error) {
      console.warn(`Failed to fetch local collection during startup (${path}):`, error);
      return [];
    }
  };

  const fetchSupabaseCollection = async <T,>(table: string): Promise<T[]> => {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        console.warn(`Supabase startup read failed for ${table}:`, error);
        return [];
      }
      return ((data || []) as T[]);
    } catch (error) {
      console.warn(`Supabase startup request failed for ${table}:`, error);
      return [];
    }
  };

  const fetchHangoutsCollection = async (): Promise<Hangout[]> => {
    try {
      let { data: dbHangouts, error: errHangouts } = await supabase.from("view_xmum_hangouts").select("*");
      if (errHangouts) {
        console.warn("view_xmum_hangouts read failed, fetching from base table:", errHangouts);
        const { data: baseHangouts, error: baseHangoutsError } = await supabase.from("xmum_hangouts").select("*");
        if (baseHangoutsError) {
          console.warn("xmum_hangouts base read also failed during startup:", baseHangoutsError);
          return [];
        }
        return ((baseHangouts || []) as Hangout[]);
      }
      return ((dbHangouts || []) as Hangout[]);
    } catch (error) {
      console.warn("Supabase startup request failed for hangouts:", error);
      return [];
    }
  };

  const syncPasswordCredential = async (password: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (sessionData.session?.access_token) {
        headers.Authorization = `Bearer ${sessionData.session.access_token}`;
      }

      const localAuthToken = getLocalAuthToken();
      if (localAuthToken) {
        headers["X-Local-Auth"] = localAuthToken;
      }

      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers,
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        console.warn("Password credential sync failed:", payload.error || response.statusText);
      }
    } catch (error) {
      console.warn("Password credential sync request failed:", error);
    }
  };

  const resolveProfileByEmail = async (email: string, authUserId?: string | null): Promise<Profile | null> => {
    const normalizedEmail = normalizeProfileEmail(email);
    const candidates: Profile[] = [];

    try {
      let { data, error } = await supabase.from("xmum_profiles").select(getProfileSelectColumns()).eq("email", normalizedEmail);
      if (
        error &&
        (
          isMissingPasswordHashColumnError(error) ||
          isMissingProfileColumnError(error, "companion_pet_count") ||
          isMissingProfileColumnError(error, "companion_selected_state_id") || isMissingProfileColumnError(error, "birthdate")
        )
      ) {
        markUnsupportedProfileColumns(error);
        ({ data, error } = await supabase.from("xmum_profiles").select(getProfileSelectColumns()).eq("email", normalizedEmail));
      }
      if (error) {
        console.warn("Supabase profile lookup by email returned an error:", error.message);
      }

      candidates.push(...normalizeProfiles(((data || []) as unknown) as Profile[]));

      if ((!data || data.length === 0) && normalizedEmail) {
        let fallbackData: any[] | null = null;
        let fallbackError: any = null;
        try {
          const response = await supabase
            .from("xmum_profiles")
            .select(getProfileSelectColumns())
            .ilike("email", escapeSupabaseLikePattern(normalizedEmail));
          fallbackData = response.data as any[] | null;
          fallbackError = response.error;
        } catch (fallbackErr) {
          fallbackError = fallbackErr;
        }

        if (
          fallbackError &&
          (
            isMissingPasswordHashColumnError(fallbackError) ||
            isMissingProfileColumnError(fallbackError, "companion_pet_count") ||
            isMissingProfileColumnError(fallbackError, "companion_selected_state_id") || isMissingProfileColumnError(fallbackError, "birthdate")
          )
        ) {
          markUnsupportedProfileColumns(fallbackError);
          const retryResponse = await supabase
            .from("xmum_profiles")
            .select(getProfileSelectColumns())
            .ilike("email", escapeSupabaseLikePattern(normalizedEmail));
          fallbackData = retryResponse.data as any[] | null;
          fallbackError = retryResponse.error;
        }

        if (fallbackError) {
          console.warn("Supabase case-insensitive profile lookup returned an error:", fallbackError.message || fallbackError);
        } else if (fallbackData?.length) {
          candidates.push(
            ...normalizeProfiles(
              (fallbackData as Profile[]).filter(
                profile => normalizeProfileEmail(profile.email) === normalizedEmail
              )
            )
          );
        }
      }
    } catch (dbErr) {
      console.warn("Supabase profile lookup by email failed, falling back to local cache:", dbErr);
    }

    candidates.push(
      ...profiles,
      ...getStoredProfilesSnapshot()
    );

    const profile = pickCanonicalProfile(normalizeProfiles(candidates), { email: normalizedEmail, authUserId });
    if (!profile) return null;

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (user?.email && normalizeProfileEmail(user.email) === normalizedEmail) {
        return mergeProfileWithAuthMetadata(profile, user);
      }
    } catch {
      // Session metadata is only a resilience layer; the profile row remains valid without it.
    }

    return profile;
  };

  const mergeProfileWithAuthMetadata = (profile: Profile, authUser?: any | null): Profile => {
    const profileMetadata = authUser?.user_metadata?.xmum_profile || {};
    const passwordHash = authUser?.app_metadata?.xmum_password_hash || profile.password_hash || null;

    return normalizeProfileRecord({
      ...profile,
      birthdate: profile.birthdate ?? profileMetadata.birthdate ?? null,
      companion_pet_count: Math.max(
        0,
        Number(profile.companion_pet_count ?? profileMetadata.companion_pet_count ?? 0)
      ),
      companion_selected_state_id:
        profile.companion_selected_state_id ?? profileMetadata.companion_selected_state_id ?? null,
      password_hash: passwordHash
    });
  };

  const applyAuthenticatedProfile = async (email: string, authUserId?: string | null, authUser?: any | null) => {
    const normalizedEmail = normalizeProfileEmail(email);

    if (!normalizedEmail.endsWith("@xmu.edu.my")) {
      console.warn("Rejected non-XMUM auth session for email:", normalizedEmail);
      await supabase.auth.signOut();
      localStorage.removeItem("xmum_current_user_id");
      localStorage.removeItem("xmum_current_user_profile");
      setCurrentUser(null);
      setShowOnboarding(false);
      setOnboardingStep(0);
      showToast("Please sign in with your official @xmu.edu.my Microsoft account.", "error");
      return null;
    }

    let profile = await resolveProfileByEmail(normalizedEmail, authUserId);

    if (!profile) {
      const student_id = normalizedEmail.split("@")[0];
      const isPrimaryAdmin = await matchesPrimaryAdminEmail(normalizedEmail);
      profile = {
        id: authUserId || ("user_" + Math.random().toString(36).substring(2, 11)),
        email: normalizedEmail,
        student_id,
        name: normalizedEmail.split("@")[0],
        name_last_changed_at: null,
        country: "Malaysia",
        country_last_changed_at: null,
        languages: ["English"],
        age: 18,
        program: "Software Engineering",
        year_of_study: "Year 1",
        gender: "Male",
        student_type: "degree",
        about_me: "Hey there! I am new here on XMUM Hangouts.",
        avatar_id: "panda",
        is_profile_complete: false,
        hide_details: false,
        is_admin: isPrimaryAdmin || normalizedEmail.startsWith("admin"),
        is_blocked_globally: false,
        flag_status: "none",
        appeal_count: 0
      };
      try {
        await supabase.from("xmum_profiles").insert([profile]);
      } catch (insErr) {
        console.warn("Authenticated profile creation deferred (offline database):", insErr);
      }
    }

    const normalizedCurrentUser = mergeProfileWithAuthMetadata(profile, authUser);
    setCurrentUser(normalizedCurrentUser);
    setProfiles(prev => {
      const nextProfiles = prev.some(
        p => p.id === normalizedCurrentUser.id || normalizeProfileEmail(p.email) === normalizedCurrentUser.email
      )
        ? prev.map(p =>
            p.id === normalizedCurrentUser.id || normalizeProfileEmail(p.email) === normalizedCurrentUser.email
              ? normalizedCurrentUser
              : p
          )
        : [...prev, normalizedCurrentUser];
      const reconciledProfiles = normalizeProfiles(nextProfiles);
      localStorage.setItem("xmum_profiles", JSON.stringify(reconciledProfiles));
      void syncServerMirror("/api/profiles/sync", { profiles: collapseProfilesByEmail(reconciledProfiles) });
      return reconciledProfiles;
    });
    localStorage.setItem("xmum_current_user_id", normalizedCurrentUser.id);
    localStorage.setItem("xmum_current_user_profile", JSON.stringify(normalizedCurrentUser));

    if (!normalizedCurrentUser.is_profile_complete) {
      setShowOnboarding(false);
      setOnboardingStep(0);
    }

    return normalizedCurrentUser;
  };

  // Auto-clear active toast notifications after 4 seconds to prevent endless floating
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!currentUser || !currentUser.is_profile_complete) {
      setShowOnboarding(false);
      setOnboardingStep(0);
    }
  }, [currentUser?.id, currentUser?.is_profile_complete]);

  useEffect(() => {
    if (!currentUser?.email) {
      return;
    }

    const canonical = pickCanonicalProfile(normalizeProfiles([...profiles, currentUser]), {
      email: currentUser.email,
      authUserId: currentUser.id
    });

    if (!canonical) {
      return;
    }

    const normalizedCanonical = normalizeProfileRecord(canonical);
    if (JSON.stringify(normalizedCanonical) !== JSON.stringify(currentUser)) {
      setCurrentUser(normalizedCanonical);
    }
  }, [profiles, currentUser]);

  const sanitizeProfileForDatabase = (profile: Profile) => stripUnsupportedColumnsFromProfileRow({
    id: profile.id,
    email: profile.email,
    student_id: profile.student_id,
    name: profile.name,
    name_last_changed_at: profile.name_last_changed_at ?? null,
    country: profile.country,
    country_last_changed_at: profile.country_last_changed_at ?? null,
    languages: Array.isArray(profile.languages) ? profile.languages : [],
    age: profile.age,
    birthdate: profile.birthdate ?? null,
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
    appeal_count: profile.appeal_count ?? 0,
    companion_pet_count: Math.max(0, Number(profile.companion_pet_count || 0)),
    companion_selected_state_id: profile.companion_selected_state_id ?? null,
    password_hash: profile.password_hash ?? null
  });

  const sanitizeComment = (c: any) => ({
    id: c.id,
    hangout_id: c.hangout_id,
    user_id: c.user_id,
    is_anonymous: Boolean(c.is_anonymous),
    parent_comment_id: c.parent_comment_id || null,
    content: c.content,
    created_at: c.created_at
  });

  const prepareProfileRowsForSupabase = async (items: Profile[]) => {
    const collapsedItems = collapseProfilesByEmail(items).map(sanitizeProfileForDatabase);
    const emails = Array.from(new Set(collapsedItems.map(item => normalizeProfileEmail(item.email || "")).filter(Boolean)));

    if (emails.length === 0) {
      return collapsedItems;
    }

    let existingProfiles: Profile[] = [];
    try {
      let { data, error } = await supabase.from("xmum_profiles").select(getProfileSelectColumns()).in("email", emails);
      if (
        error &&
        (
          isMissingPasswordHashColumnError(error) ||
          isMissingProfileColumnError(error, "companion_pet_count") ||
          isMissingProfileColumnError(error, "companion_selected_state_id") || isMissingProfileColumnError(error, "birthdate")
        )
      ) {
        markUnsupportedProfileColumns(error);
        ({ data, error } = await supabase.from("xmum_profiles").select(getProfileSelectColumns()).in("email", emails));
      }
      if (error) {
        console.warn("Existing profile lookup during client sync failed:", error.message);
      } else {
        existingProfiles = ((data || []) as unknown) as Profile[];
      }
    } catch (error) {
      console.warn("Existing profile reconciliation failed before client sync:", error);
    }

    return collapsedItems.map(item => {
      const existing = pickCanonicalProfile(existingProfiles, { email: item.email });
      if (!existing) {
        return item;
      }

      return sanitizeProfileForDatabase({
        ...existing,
        ...item,
        id: existing.id,
        email: normalizeProfileEmail(existing.email || item.email),
        is_profile_complete: Boolean(existing.is_profile_complete || item.is_profile_complete),
        companion_pet_count: Math.max(
          Number(item.companion_pet_count || 0),
          Number(existing.companion_pet_count || 0)
        ),
        companion_selected_state_id: item.companion_selected_state_id ?? existing.companion_selected_state_id ?? null,
        password_hash: item.password_hash ?? existing.password_hash ?? null
      } as Profile);
    });
  };

  const upsertProfilesDirect = async (items: Profile[]) => {
    const rows = await prepareProfileRowsForSupabase(items);
    const { error } = await supabase.from("xmum_profiles").upsert(rows);

    if (error) {
      if (
        isMissingPasswordHashColumnError(error) ||
        isMissingProfileColumnError(error, "companion_pet_count") ||
        isMissingProfileColumnError(error, "companion_selected_state_id") || isMissingProfileColumnError(error, "birthdate")
      ) {
        const fallbackRows = stripUnsupportedProfileColumns(rows, error);
        const fallback = await supabase.from("xmum_profiles").upsert(fallbackRows);
        if (fallback.error) {
          throw fallback.error;
        }
        return;
      }

      throw error;
    }
  };

  // --- INITIAL SEEDING ---
  useEffect(() => {
    let authSubscriptionCleanup: (() => void) | null = null;

    const initData = async () => {
      setIsAuthInitializing(true);
      try {
        let pendingAuthEmail: string | null = null;
        let pendingAuthUserId: string | null = null;
        let pendingAuthUser: any | null = null;
        const shouldWaitForAuthSession =
          sessionStorage.getItem(authRedirectStorageKey) === "true" ||
          window.location.search.includes("code=") ||
          window.location.hash.includes("access_token=") ||
          window.location.hash.includes("refresh_token=");

        const waitForSessionSnapshot = async () => {
          const maxAttempts = shouldWaitForAuthSession ? 12 : 3;
          for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const { data } = await supabase.auth.getSession();
            if (data.session?.user?.email) {
              return data.session;
            }
            if (attempt < maxAttempts - 1) {
              await new Promise(resolve => window.setTimeout(resolve, shouldWaitForAuthSession ? 250 : 120));
            }
          }
          return null;
        };

        // Parse URL segment/hash to automatically process redirect authentication keys from external emails
        try {
          const authHashStr = window.location.hash || window.location.search;
          if (authHashStr && (authHashStr.includes("access_token=") || authHashStr.includes("refresh_token="))) {
            const cleanUrlQuery = authHashStr.replace(/^[#?]/, "");
            const tempSearchObj = new URLSearchParams(cleanUrlQuery);
            const maybeAccessToken = tempSearchObj.get("access_token");
            const maybeRefreshToken = tempSearchObj.get("refresh_token");
            if (maybeAccessToken && maybeRefreshToken) {
              console.log("Restoring Supabase auth session from copied token link URL...");
              const { data: restoredSession, error: sessionSetErr } = await supabase.auth.setSession({
                access_token: maybeAccessToken,
                refresh_token: maybeRefreshToken
              });
              if (!sessionSetErr) {
                pendingAuthUser = restoredSession.session?.user || pendingAuthUser;
                pendingAuthEmail = restoredSession.session?.user?.email
                  ? normalizeProfileEmail(restoredSession.session.user.email)
                  : pendingAuthEmail;
                pendingAuthUserId = restoredSession.session?.user?.id || pendingAuthUserId;
                // Clear URL address bar hash to keep UI clean
                window.history.replaceState(null, "", window.location.pathname + window.location.search);
              } else {
                console.warn("Session restore error:", sessionSetErr.message);
              }
            }
          }

          const searchParams = new URLSearchParams(window.location.search);
          const authCode = searchParams.get("code");
          if (authCode) {
            console.log("Exchanging Supabase OAuth code for a session...");
            const { data: exchangedSession, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(authCode);
            if (!exchangeErr) {
              pendingAuthUser = exchangedSession.session?.user || pendingAuthUser;
              pendingAuthEmail = exchangedSession.session?.user?.email
                ? normalizeProfileEmail(exchangedSession.session.user.email)
                : pendingAuthEmail;
              pendingAuthUserId = exchangedSession.session?.user?.id || pendingAuthUserId;
              window.history.replaceState(null, "", window.location.pathname);
            } else {
              console.warn("OAuth code exchange error:", exchangeErr.message);
            }
          }
        } catch (uhError) {
          console.error("Auto hash verification attempt skipped:", uhError);
        }

        console.log("Loading primary tables from Supabase...");
        
        // --- 1. Profiles ---
        let { data: dbProfiles, error: errProfiles } = await supabase.from("xmum_profiles").select(getProfileSelectColumns());
        if (
          errProfiles &&
          (
            isMissingPasswordHashColumnError(errProfiles) ||
            isMissingProfileColumnError(errProfiles, "companion_pet_count") ||
            isMissingProfileColumnError(errProfiles, "companion_selected_state_id") || isMissingProfileColumnError(errProfiles, "birthdate")
          )
        ) {
          markUnsupportedProfileColumns(errProfiles);
          ({ data: dbProfiles, error: errProfiles } = await supabase.from("xmum_profiles").select(getProfileSelectColumns()));
        }
        if (errProfiles) throw errProfiles;
        
        if ((!dbProfiles || dbProfiles.length === 0) && demoDataEnabled) {
          const seedProfiles: Profile[] = [
            {
              id: "sys_admin",
              email: "admin@xmu.edu.my",
              student_id: "admin",
              name: "Dean Hangouts",
              name_last_changed_at: null,
              country: "Malaysia",
              country_last_changed_at: null,
              languages: ["English", "Malay (Bahasa Melayu)", "Mandarin (Chinese)"],
              age: 26,
              program: "Software Engineering",
              year_of_study: "Year 5+",
              gender: "Male",
              student_type: "postgraduate",
              about_me: "The official admin of XMUM Hangouts. Hit me up if you ever experience safety issues or bad manners!",
              avatar_id: "owl",
              is_profile_complete: true,
              hide_details: false,
              is_admin: true,
              is_blocked_globally: false,
              flag_status: "none",
              appeal_count: 0
            },
            {
              id: "user_sarah",
              email: "sarah.lin@xmu.edu.my",
              student_id: "sarah.lin",
              name: "Sarah Lin",
              name_last_changed_at: null,
              country: "Singapore",
              country_last_changed_at: null,
              languages: ["English", "Mandarin (Chinese)"],
              age: 20,
              program: "Computer Science & Technology",
              year_of_study: "Year 2",
              gender: "Female",
              student_type: "degree",
              about_me: "Love bubble tea, programming in PyTorch, and playing boardgames. Looking for friends to form a weekly Catan party!",
              avatar_id: "cat",
              is_profile_complete: true,
              hide_details: false,
              is_admin: false,
              is_blocked_globally: false,
              flag_status: "none",
              appeal_count: 0
            },
            {
              id: "user_ahmad",
              email: "ahmad.fauzi@xmu.edu.my",
              student_id: "ahmad.fauzi",
              name: "Ahmad Fauzi",
              name_last_changed_at: null,
              country: "Malaysia",
              country_last_changed_at: null,
              languages: ["Malay (Bahasa Melayu)", "English"],
              age: 19,
              program: "Artificial Intelligence",
              year_of_study: "Year 1",
              gender: "Male",
              student_type: "degree",
              about_me: "Futuristic ML researcher and part-time coffee barista. Lets explore cafes around Sepang or Putrajaya together!",
              avatar_id: "koala",
              is_profile_complete: true,
              hide_details: false,
              is_admin: false,
              is_blocked_globally: false,
              flag_status: "none",
              appeal_count: 0
            },
            {
              id: "user_xiaoming",
              email: "xiaoming@xmu.edu.my",
              student_id: "xiaoming",
              name: "Xiao Ming",
              name_last_changed_at: null,
              country: "China",
              country_last_changed_at: null,
              languages: ["Mandarin (Chinese)", "English"],
              age: 21,
              program: "Digital Media Technology",
              year_of_study: "Year 3",
              gender: "Male",
              student_type: "degree",
              about_me: "Digital designer, anime nerd, and cozy game lover. Happy to help practice Mandarin or discuss animations!",
              avatar_id: "panda",
              is_profile_complete: true,
              hide_details: false,
              is_admin: false,
              is_blocked_globally: false,
              flag_status: "none",
              appeal_count: 0
            }
          ];
          await supabase.from("xmum_profiles").insert(seedProfiles);
          dbProfiles = (seedProfiles as unknown) as typeof dbProfiles;
        }

        const storedProfilesSnapshot = getStoredProfilesSnapshot();
        const normalizedProfiles = filterProfilesForRuntime(normalizeProfiles([
          ...storedProfilesSnapshot,
          ...(((dbProfiles || []) as unknown) as Profile[])
        ]));
        setProfiles(normalizedProfiles);
        localStorage.setItem("xmum_profiles", JSON.stringify(normalizedProfiles));
        void syncServerMirror("/api/profiles/sync", { profiles: collapseProfilesByEmail(normalizedProfiles) });

        const dbProfilesById = new Map((((dbProfiles || []) as unknown) as Profile[]).map(profile => [profile.id, JSON.stringify(profile)]));
        const profilesWereNormalized = normalizedProfiles.some(profile => {
          return dbProfilesById.get(profile.id) !== JSON.stringify(profile);
        });
        if (profilesWereNormalized) {
          try {
            await upsertProfilesDirect(normalizedProfiles);
          } catch (syncErr) {
            console.warn("Initial normalized profile upsert failed:", syncErr);
          }
        }

        const authSubscription = supabase.auth.onAuthStateChange(async (_event, session) => {
          try {
            if (session?.user?.email) {
              await applyAuthenticatedProfile(session.user.email, session.user.id, session.user);
            }
          } catch (callbackErr) {
            console.error("Auth state change callback exception:", callbackErr);
          }
        });
        authSubscriptionCleanup = () => authSubscription.data.subscription.unsubscribe();

        const settledSession =
          pendingAuthUser
            ? { user: pendingAuthUser } as any
            : pendingAuthEmail && pendingAuthUserId
            ? { user: { email: pendingAuthEmail, id: pendingAuthUserId } } as any
            : await waitForSessionSnapshot();

        const settledSessionEmail = settledSession?.user?.email
          ? normalizeProfileEmail(settledSession.user.email)
          : null;

        if (settledSession?.user?.email) {
          await applyAuthenticatedProfile(settledSession.user.email, settledSession.user.id, settledSession.user);
        }

        const [
          localHangouts,
          dbHangoutsRaw,
          localApps,
          dbAppsRaw,
          localChats,
          dbChatsRaw,
          localMessages,
          dbMessagesRaw,
          localLikes,
          dbLikesRaw,
          localComments,
          dbCommentsRaw,
          localReports,
          dbReportsRaw,
          localAppeals,
          dbAppealsRaw,
          localBlocks,
          dbBlocksRaw,
          localNotifs,
          dbNotifsRaw
        ] = await Promise.all([
          fetchLocalCollection<Hangout>("/api/hangouts", "hangouts"),
          fetchHangoutsCollection(),
          fetchLocalCollection<HangoutApplication>("/api/applications", "applications"),
          fetchSupabaseCollection<HangoutApplication>("xmum_applications"),
          fetchLocalCollection<Chat>("/api/chats", "chats"),
          fetchSupabaseCollection<Chat>("xmum_chats"),
          fetchLocalCollection<Message>("/api/messages", "messages"),
          fetchSupabaseCollection<Message>("xmum_messages"),
          fetchLocalCollection<HangoutLike>("/api/likes", "likes"),
          fetchSupabaseCollection<HangoutLike>("xmum_likes"),
          fetchLocalCollection<HangoutComment>("/api/comments", "comments"),
          fetchSupabaseCollection<HangoutComment>("xmum_comments"),
          fetchLocalCollection<Report>("/api/reports", "reports"),
          fetchSupabaseCollection<Report>("xmum_reports"),
          fetchLocalCollection<ReportAppeal>("/api/appeals", "appeals"),
          fetchSupabaseCollection<ReportAppeal>("xmum_appeals"),
          fetchLocalCollection<Block>("/api/blocks", "blocks"),
          fetchSupabaseCollection<Block>("xmum_blocks"),
          fetchLocalCollection<AppNotification>("/api/notifications", "notifications"),
          fetchSupabaseCollection<AppNotification>("xmum_notifications")
        ]);

        const browserLocalHangouts = getStoredHangoutsSnapshot();
        let finalHangouts = mergeHangoutCollections(
          mergeHangoutCollections(dbHangoutsRaw, localHangouts),
          browserLocalHangouts
        );

        if ((!finalHangouts || finalHangouts.length === 0) && demoDataEnabled) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(18, 0, 0, 0);

          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 5);
          nextWeek.setHours(14, 0, 0, 0);

          const dayAfterTomorrow = new Date();
          dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
          dayAfterTomorrow.setHours(16, 30, 0, 0);

          const seedHangouts: Hangout[] = [
            {
              id: "hangout_catan",
              creator_id: "user_sarah",
              intention: "boardgame night and play Settlers of Catan",
              location: "Block B Study Hall / Activity Room",
              event_datetime: tomorrow.toISOString(),
              meeting_point: "Red high-chairs in the middle of Block B Hall",
              additional_info: "I hired the boardgame box with Catan and Cities & Knights expansion. Beginner friendly! I have cookies as well, just bring your good vibes.",
              max_participants: 4,
              restrictions: {
                countries: [],
                languages: ["English"],
                programs: [],
                years: [],
                student_types: [],
                age_min: null,
                age_max: null,
                genders: []
              },
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: "hangout_cafe",
              creator_id: "user_ahmad",
              intention: "go for a late night Mamak / Cafe run to discuss Machine Learning projects",
              location: "Sepang / Dengkil Cafe Area",
              event_datetime: nextWeek.toISOString(),
              meeting_point: "Main Guard House (Main Gate 1) waiting area",
              additional_info: "We'll pool a Grab. Open to both newbies and veterans who are interested in AI. Highly conversational & chill session over milk tea/roti canai.",
              max_participants: null,
              restrictions: {
                countries: [],
                languages: [],
                programs: [],
                years: [],
                student_types: ["degree", "postgraduate"],
                age_min: 18,
                age_max: 25,
                genders: []
              },
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: "hangout_badminton",
              creator_id: "user_xiaoming",
              intention: "play friendly badminton singles/doubles",
              location: "XMUM Sports Hall Court 3",
              event_datetime: dayAfterTomorrow.toISOString(),
              meeting_point: "Courtside benches near Court 3",
              additional_info: "Friendly match, rackets can be rented. Looking for intermediate or beginner players to play 2v2 doubles together.",
              max_participants: 4,
              restrictions: {
                countries: [],
                languages: [],
                programs: [],
                years: [],
                student_types: [],
                age_min: null,
                age_max: null,
                genders: []
              },
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: "hangout_study",
              creator_id: "sys_admin",
              intention: "quiet study and research session",
              location: "Main Library Level 3 Quiet Room",
              event_datetime: nextWeek.toISOString(),
              meeting_point: "Water dispenser area of Library Level 3",
              additional_info: "Quiet focus sprint, study buddy session. We use the Pomodoro technique to complete mock reports or final theses.",
              max_participants: 6,
              restrictions: {
                countries: [],
                languages: [],
                programs: [],
                years: [],
                student_types: [],
                age_min: null,
                age_max: null,
                genders: []
              },
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ];
          await supabase.from("xmum_hangouts").insert(seedHangouts.map(h => sanitizeHangout(h)));
          finalHangouts = seedHangouts;
        }
        const cleanHangouts = filterHangoutsForRuntime(
          finalHangouts.filter(h => h.additional_info && h.additional_info.trim() !== "")
        );
        const activeHangoutIds = new Set(cleanHangouts.map(hangout => hangout.id));
        setHangouts(cleanHangouts);
        localStorage.setItem("xmum_hangouts", JSON.stringify(cleanHangouts));

        // --- 3. Applications ---
        const browserLocalApplications = getStoredApplicationsSnapshot(activeHangoutIds);
        let finalApps = mergeByField(
          mergeByField(dbAppsRaw, localApps),
          browserLocalApplications
        );

        if (finalApps.length === 0 && demoDataEnabled) {
          const seedApps: HangoutApplication[] = [
            {
              id: "app_seed_1",
              hangout_id: "hangout_catan",
              applicant_id: "user_ahmad",
              is_anonymous: false,
              status: "accepted",
              rejection_message: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: "app_seed_2",
              hangout_id: "hangout_catan",
              applicant_id: "user_xiaoming",
              is_anonymous: true,
              status: "pending",
              rejection_message: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: "app_seed_3",
              hangout_id: "hangout_cafe",
              applicant_id: "user_sarah",
              is_anonymous: false,
              status: "pending",
              rejection_message: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ];
          await supabase.from("xmum_applications").insert(seedApps);
          finalApps = seedApps;
        }
        finalApps = filterApplicationsForRuntime(finalApps, activeHangoutIds);
        setApplications(finalApps);
        localStorage.setItem("xmum_applications", JSON.stringify(finalApps));

        // --- 4. Chats ---
        let finalChats = mergeByField(dbChatsRaw, localChats);

        if (finalChats.length === 0 && demoDataEnabled) {
          const seedChats = [
            {
              id: "chat_seed_sarah_ahmad",
              user_a_id: "user_sarah",
              user_b_id: "user_ahmad",
              hangout_id: "hangout_catan",
              created_at: new Date().toISOString()
            }
          ];
          await supabase.from("xmum_chats").insert(seedChats);
          finalChats = seedChats;
        }
        finalChats = filterChatsForRuntime(finalChats, activeHangoutIds);
        const activeChatIds = new Set(finalChats.map(chat => chat.id));
        setChats(finalChats);
        localStorage.setItem("xmum_chats", JSON.stringify(finalChats));

        // --- 5. Messages ---
        let finalMessages = mergeByField(dbMessagesRaw, localMessages);

        if (finalMessages.length === 0 && demoDataEnabled) {
          const fiveMinsAgo = new Date();
          fiveMinsAgo.setMinutes(fiveMinsAgo.getMinutes() - 15);
          const twoMinsAgo = new Date();
          twoMinsAgo.setMinutes(twoMinsAgo.getMinutes() - 5);

          const seedMessages = [
            {
              id: "msg_seed_1",
              chat_id: "chat_seed_sarah_ahmad",
              sender_id: "user_ahmad",
              content: "Hey Sarah, I'm super excited about playing Catan tomorrow! I haven't played the Cities & Knights expansion before, is it easy for me to pick up?",
              is_read: true,
              created_at: fiveMinsAgo.toISOString()
            },
            {
              id: "msg_seed_2",
              chat_id: "chat_seed_sarah_ahmad",
              sender_id: "user_sarah",
              content: "Hey Ahmad, definitely! It takes maybe 10 minutes to explain, but it adds so much depth. Looking forward to gaming together!",
              is_read: false,
              created_at: twoMinsAgo.toISOString()
            }
          ];
          
          const encryptedSeeds = seedMessages.map(msg => ({
            ...msg,
            content: encryptMessage(msg.content)
          }));
          await supabase.from("xmum_messages").insert(encryptedSeeds);
          finalMessages = encryptedSeeds;
        }
        
        const decryptedMessages = filterMessagesForRuntime(finalMessages, activeChatIds).map(msg => {
          try {
            return { ...msg, content: decryptMessage(msg.content) };
          } catch {
            return msg;
          }
        });
        setMessages(decryptedMessages);
        
        const encryptedLocal = decryptedMessages.map(msg => ({
          ...msg,
          content: encryptMessage(msg.content)
        }));
        localStorage.setItem("xmum_messages", JSON.stringify(encryptedLocal));

        // --- 6. Other tables ---
        const finalLikes = filterLikesForRuntime(
          mergeByField(dbLikesRaw, localLikes),
          activeHangoutIds
        );
        setLikes(finalLikes);
        localStorage.setItem("xmum_likes", JSON.stringify(finalLikes));

        const finalComments = filterCommentsForRuntime(
          mergeByField(dbCommentsRaw, localComments),
          activeHangoutIds
        );
        setComments(finalComments);
        localStorage.setItem("xmum_comments", JSON.stringify(finalComments));
        void syncServerMirror("/api/comments/sync", { comments: finalComments });

        const finalReports = filterReportsForRuntime(mergeByField(dbReportsRaw, localReports));
        const activeReportIds = new Set(finalReports.map(report => report.id));
        setReports(finalReports);
        localStorage.setItem("xmum_reports", JSON.stringify(finalReports));

        const finalAppeals = filterAppealsForRuntime(
          mergeByField(dbAppealsRaw, localAppeals),
          activeReportIds
        );
        setAppeals(finalAppeals);
        localStorage.setItem("xmum_appeals", JSON.stringify(finalAppeals));

        const mergedBlocks = mergeByField(dbBlocksRaw, localBlocks);
        const finalBlocks = filterBlocksForRuntime(mergedBlocks);
        const removedBlockIds = getRemovedBlockIds(mergedBlocks, finalBlocks);
        setBlocks(finalBlocks);
        localStorage.setItem("xmum_blocks", JSON.stringify(finalBlocks));
        if (removedBlockIds.length > 0) {
          void persistBlocks(finalBlocks, mergedBlocks);
        }

        const finalNotifs = filterNotificationsForRuntime(mergeByField(dbNotifsRaw, localNotifs));
        setNotifications(finalNotifs);
        localStorage.setItem("xmum_notifications", JSON.stringify(finalNotifs));

        const { data: sessionSnapshot } = await supabase.auth.getSession();
        const hasLiveSession = Boolean(sessionSnapshot.session?.user?.email);
        const sessionSnapshotEmail = sessionSnapshot.session?.user?.email
          ? normalizeProfileEmail(sessionSnapshot.session.user.email)
          : null;
        if (
          hasLiveSession &&
          sessionSnapshot.session?.user?.email &&
          sessionSnapshotEmail !== settledSessionEmail
        ) {
          await applyAuthenticatedProfile(
            sessionSnapshot.session.user.email,
            sessionSnapshot.session.user.id,
            sessionSnapshot.session.user
          );
        }

        // Initialize active user session if previously logged in from local state
        const storedActiveUser = localStorage.getItem("xmum_current_user_id");
        if (!hasLiveSession && storedActiveUser) {
          try {
            let restoredProfile: Profile | null = null;
            const cachedCurrentUser = localStorage.getItem("xmum_current_user_profile");
            if (cachedCurrentUser) {
              try {
                const parsedCachedUser = normalizeProfileRecord(JSON.parse(cachedCurrentUser));
                restoredProfile = await resolveProfileByEmail(parsedCachedUser.email, storedActiveUser) || parsedCachedUser;
              } catch (cachedErr) {
                console.warn("Cached current user could not be restored directly:", cachedErr);
              }
            }

            if (!restoredProfile) {
              let { data: userProfile, error: userProfileError } = await supabase.from("xmum_profiles").select(getProfileSelectColumns()).eq("id", storedActiveUser).maybeSingle();
              if (
                userProfileError &&
                (
                  isMissingPasswordHashColumnError(userProfileError) ||
                  isMissingProfileColumnError(userProfileError, "companion_pet_count") ||
                  isMissingProfileColumnError(userProfileError, "companion_selected_state_id") || isMissingProfileColumnError(userProfileError, "birthdate")
                )
              ) {
                markUnsupportedProfileColumns(userProfileError);
                ({ data: userProfile, error: userProfileError } = await supabase.from("xmum_profiles").select(getProfileSelectColumns()).eq("id", storedActiveUser).maybeSingle());
              }
              if (userProfile) {
                restoredProfile =
                  await resolveProfileByEmail((userProfile as unknown as Profile).email, storedActiveUser) || normalizeProfileRecord(userProfile as unknown as Profile);
              }
            }

            if (!restoredProfile) {
              const fallbackLocal = normalizedProfiles.find(p => p.id === storedActiveUser);
              if (fallbackLocal) {
                restoredProfile =
                  pickCanonicalProfile(normalizeProfiles([fallbackLocal, ...normalizedProfiles]), {
                    email: fallbackLocal.email,
                    authUserId: storedActiveUser
                  }) || normalizeProfileRecord(fallbackLocal);
              }
            }

            if (restoredProfile) {
              setCurrentUser(normalizeProfileRecord(restoredProfile));
            }
          } catch (actErr) {
            console.warn("Active user profile fetch errored, resolving from local profiles cache:", actErr);
            const fallbackLocal = normalizedProfiles.find(p => p.id === storedActiveUser);
            if (fallbackLocal) {
              setCurrentUser(normalizeProfileRecord(fallbackLocal));
            }
          }
        }

      } catch (err) {
        console.error("Failed to fetch primary tables from Supabase, resolving from LocalStorage fallback:", err);
        const fallbackProfiles = getStoredProfilesSnapshot();
        setProfiles(fallbackProfiles);
        localStorage.setItem("xmum_profiles", JSON.stringify(fallbackProfiles));
        const fallbackHangouts = getStoredHangoutsSnapshot();
        const fallbackHangoutIds = new Set(fallbackHangouts.map((hangout: Hangout) => hangout.id));
        setHangouts(fallbackHangouts);
        const fallbackApplications = getStoredApplicationsSnapshot(fallbackHangoutIds);
        setApplications(fallbackApplications);
        localStorage.setItem("xmum_applications", JSON.stringify(fallbackApplications));
        const fallbackChats = getStoredChatsSnapshot(fallbackHangoutIds);
        const fallbackChatIds = new Set(fallbackChats.map((chat: Chat) => chat.id));
        setChats(fallbackChats);
        localStorage.setItem("xmum_chats", JSON.stringify(fallbackChats));
        const decryptedLocalMsgs = getStoredMessagesSnapshot(fallbackChatIds);
        setMessages(decryptedLocalMsgs);
        localStorage.setItem(
          "xmum_messages",
          JSON.stringify(decryptedLocalMsgs.map(msg => ({ ...msg, content: encryptMessage(msg.content) })))
        );
        const fallbackLikes = getStoredLikesSnapshot(fallbackHangoutIds);
        setLikes(fallbackLikes);
        localStorage.setItem("xmum_likes", JSON.stringify(fallbackLikes));
        const fallbackComments = getStoredCommentsSnapshot(fallbackHangoutIds);
        setComments(fallbackComments);
        localStorage.setItem("xmum_comments", JSON.stringify(fallbackComments));
        const fallbackReports = getStoredReportsSnapshot();
        const fallbackReportIds = new Set(fallbackReports.map((report: Report) => report.id));
        setReports(fallbackReports);
        localStorage.setItem("xmum_reports", JSON.stringify(fallbackReports));
        const fallbackAppeals = getStoredAppealsSnapshot(fallbackReportIds);
        setAppeals(fallbackAppeals);
        localStorage.setItem("xmum_appeals", JSON.stringify(fallbackAppeals));
        const fallbackBlocks = getStoredBlocksSnapshot();
        setBlocks(fallbackBlocks);
        localStorage.setItem("xmum_blocks", JSON.stringify(fallbackBlocks));
        const fallbackNotifications = getStoredNotificationsSnapshot();
        setNotifications(fallbackNotifications);
        localStorage.setItem("xmum_notifications", JSON.stringify(fallbackNotifications));

        const storedActiveUser = localStorage.getItem("xmum_current_user_id");
        if (storedActiveUser && fallbackProfiles.length > 0) {
          const found = fallbackProfiles.find((p: any) => p.id === storedActiveUser);
          if (found) setCurrentUser(normalizeProfileRecord(found));
        }
      } finally {
        clearAuthRedirectPending();
        setIsAuthInitializing(false);
      }
    };
    initData();

    return () => {
      authSubscriptionCleanup?.();
    };
  }, []);

  // --- PERSISTENCE SYNCS ---
  const saveProfiles = async (data: Profile[]) => {
    const normalizedData = filterProfilesForRuntime(normalizeProfiles(data));
    const canonicalRows = collapseProfilesByEmail(normalizedData);
    const prev = profiles;
    setProfiles(normalizedData);
    localStorage.setItem("xmum_profiles", JSON.stringify(normalizedData));
    
    // Sync to backend file-based local profiles registry
    try {
      await fetch("/api/profiles/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profiles: canonicalRows })
      });
    } catch (syncErr) {
      console.warn("Local backend profiles mirror sync failed:", syncErr);
    }

    try {
      const changed = canonicalRows.filter(item => {
        const matchingPrev = prev.find(p => p.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        const rows = await prepareProfileRowsForSupabase(changed);
        const { error } = await supabase.from("xmum_profiles").upsert(rows);
        if (error) {
          if (
            isMissingPasswordHashColumnError(error) ||
            isMissingProfileColumnError(error, "companion_pet_count") ||
            isMissingProfileColumnError(error, "companion_selected_state_id") || isMissingProfileColumnError(error, "birthdate")
          ) {
            const fallbackRows = stripUnsupportedProfileColumns(rows, error);
            const fallback = await supabase.from("xmum_profiles").upsert(fallbackRows);
            if (fallback.error) {
              throw fallback.error;
            }
          } else {
            throw error;
          }
        }
      }
    } catch (e) {
      console.error("Profiles sync exception:", e);
    }
  };

  const syncCompanionProgress = (progress: StoredCompanionState) => {
    if (!currentUser) return;

    const nextPetCount = Math.max(
      0,
      Number(progress.petCount ?? currentUser.companion_pet_count ?? 0)
    );
    const nextSelectedStateId =
      progress.selectedStateId !== undefined
        ? progress.selectedStateId || null
        : currentUser.companion_selected_state_id ?? null;

    const updatedUser = normalizeProfileRecord({
      ...currentUser,
      companion_pet_count: nextPetCount,
      companion_selected_state_id: nextSelectedStateId
    });

    setCurrentUser(updatedUser);
    setProfiles(prev => {
      const nextProfiles = normalizeProfiles(
        prev.map(profile =>
          profile.id === updatedUser.id || normalizeProfileEmail(profile.email) === updatedUser.email
            ? {
                ...profile,
                companion_pet_count: nextPetCount,
                companion_selected_state_id: nextSelectedStateId
              }
            : profile
        )
      );
      localStorage.setItem("xmum_profiles", JSON.stringify(nextProfiles));

      if (companionProfileSyncTimeoutRef.current) {
        window.clearTimeout(companionProfileSyncTimeoutRef.current);
      }

      companionProfileSyncTimeoutRef.current = window.setTimeout(() => {
        void saveProfiles(nextProfiles);
      }, 900);

      return nextProfiles;
    });
  };

  const saveHangouts = async (data: Hangout[]) => {
    const normalizedData = mergeHangoutCollections(data, hangouts);
    setHangouts(normalizedData);
    localStorage.setItem("xmum_hangouts", JSON.stringify(normalizedData));

    const persistHangouts = async (items: Hangout[]) => {
      try {
        const response = await fetch("/api/hangouts/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hangouts: items })
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.warn("Hangouts sync failed:", errorText);
        }
      } catch (syncErr) {
        console.warn("Local backend hangouts mirror sync failed:", syncErr);
      }
    };

    await persistHangouts(normalizedData);
  };

  const syncHangoutsToRemote = async (data: Hangout[]) => {
    if (data.length === 0) return;
    const normalizedData = mergeHangoutCollections(data, hangouts);
    try {
      const response = await fetch("/api/hangouts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hangouts: normalizedData })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.warn("Hangouts sync failed:", errorText);
      }
    } catch (syncErr) {
      console.warn("Local backend hangouts mirror sync failed:", syncErr);
    }
  };
  const saveApplications = async (data: HangoutApplication[]) => {
    const dedupedData = Array.from(
      new Map(data.map(item => [item.id, item])).values()
    );
    const hangoutCreatorMap = new Map(hangouts.map(hangout => [hangout.id, hangout.creator_id]));
    const normalizedData = dedupedData.filter(
      application => hangoutCreatorMap.get(application.hangout_id) !== application.applicant_id
    );
    const prev = applicationsRef.current;
    applicationsRef.current = normalizedData;
    setApplications(normalizedData);
    localStorage.setItem("xmum_applications", JSON.stringify(normalizedData));

    try {
      await fetch("/api/applications/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applications: normalizedData })
      });
    } catch (syncErr) {
      console.warn("Local backend applications mirror sync failed:", syncErr);
    }

    try {
      const changed = normalizedData.filter(item => {
        const matchingPrev = prev.find(a => a.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        await supabase.from("xmum_applications").upsert(changed);
      }
    } catch (e) {
      console.error("Applications sync exception:", e);
    }
  };
  const saveLikes = async (data: HangoutLike[]) => {
    const prev = likes;
    setLikes(data);
    localStorage.setItem("xmum_likes", JSON.stringify(data));

    try {
      await fetch("/api/likes/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likes: data })
      });
    } catch (syncErr) {
      console.warn("Local backend likes mirror sync failed:", syncErr);
    }

    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(l => l.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        await supabase.from("xmum_likes").upsert(changed);
      }
    } catch (e) {
      console.error("Likes sync exception:", e);
    }
  };
  const saveComments = async (data: HangoutComment[]) => {
    const prev = comments;
    setComments(data);
    localStorage.setItem("xmum_comments", JSON.stringify(data));

    try {
      await fetch("/api/comments/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments: data })
      });
    } catch (syncErr) {
      console.warn("Local backend comments mirror sync failed:", syncErr);
    }

    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(c => c.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        const sanitized = changed.map(item => sanitizeComment(item));
        await supabase.from("xmum_comments").upsert(sanitized);
      }
    } catch (e) {
      console.error("Comments sync exception:", e);
    }
  };
  const saveReports = async (data: Report[]) => {
    const prev = reports;
    setReports(data);
    localStorage.setItem("xmum_reports", JSON.stringify(data));

    try {
      await fetch("/api/reports/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reports: data })
      });
    } catch (syncErr) {
      console.warn("Local backend reports mirror sync failed:", syncErr);
    }

    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(r => r.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        await supabase.from("xmum_reports").upsert(changed);
      }
    } catch (e) {
      console.error("Reports sync exception:", e);
    }
  };
  const saveAppeals = async (data: ReportAppeal[]) => {
    const prev = appeals;
    setAppeals(data);
    localStorage.setItem("xmum_appeals", JSON.stringify(data));

    try {
      await fetch("/api/appeals/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appeals: data })
      });
    } catch (syncErr) {
      console.warn("Local backend appeals mirror sync failed:", syncErr);
    }

    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(a => a.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        await supabase.from("xmum_appeals").upsert(changed);
      }
    } catch (e) {
      console.error("Appeals sync exception:", e);
    }
  };
  const saveChats = async (data: Chat[]) => {
    const prev = chats;
    setChats(data);
    localStorage.setItem("xmum_chats", JSON.stringify(data));

    try {
      await fetch("/api/chats/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chats: data })
      });
    } catch (syncErr) {
      console.warn("Local backend chats mirror sync failed:", syncErr);
    }

    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(c => c.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        await supabase.from("xmum_chats").upsert(changed);
      }
    } catch (e) {
      console.error("Chats sync exception:", e);
    }
  };
  const saveMessages = async (data: Message[]) => {
    const prev = messages;
    setMessages(data);
    
    // Encrypt messages for LocalStorage to prevent client-side plain-text inspection
    const encryptedAll = data.map(m => ({ ...m, content: encryptMessage(m.content) }));
    localStorage.setItem("xmum_messages", JSON.stringify(encryptedAll));

    try {
      await fetch("/api/messages/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: encryptedAll })
      });
    } catch (syncErr) {
      console.warn("Local backend messages mirror sync failed:", syncErr);
    }
    
    try {
      const changed = data.filter(item => {
        const matchingPrev = prev.find(m => m.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        // Encrypt changed rows for database row level security consistency
        const encryptedChanged = changed.map(item => ({
          ...item,
          content: encryptMessage(item.content)
        }));
        await supabase.from("xmum_messages").upsert(encryptedChanged);
      }
    } catch (e) {
      console.error("Messages sync exception:", e);
    }
  };
  const persistBlocks = async (data: Block[], previousBlocks = blocks) => {
    const sanitizedData = filterBlocksForRuntime(data);
    const removedBlockIds = getRemovedBlockIds(previousBlocks, sanitizedData);
    setBlocks(sanitizedData);
    localStorage.setItem("xmum_blocks", JSON.stringify(sanitizedData));

    try {
      await fetch("/api/blocks/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: sanitizedData,
          removed_block_ids: removedBlockIds
        })
      });
    } catch (syncErr) {
      console.warn("Local backend blocks mirror sync failed:", syncErr);
    }

    try {
      if (removedBlockIds.length > 0) {
        await supabase.from("xmum_blocks").delete().in("id", removedBlockIds);
      }

      const changed = sanitizedData.filter(item => {
        const matchingPrev = previousBlocks.find(b => b.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        await supabase.from("xmum_blocks").upsert(changed);
      }
    } catch (e) {
      console.error("Blocks sync exception:", e);
    }
  };
  const saveBlocks = async (data: Block[]) => {
    await persistBlocks(data);
  };
  const saveNotifications = async (data: AppNotification[]) => {
    const uniqueData = Array.from(
      new Map(data.map(notification => [notification.id, notification])).values()
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const prev = notifications;
    setNotifications(uniqueData);
    localStorage.setItem("xmum_notifications", JSON.stringify(uniqueData));

    try {
      await fetch("/api/notifications/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: uniqueData })
      });
    } catch (syncErr) {
      console.warn("Local backend notifications mirror sync failed:", syncErr);
    }

    try {
      const changed = uniqueData.filter(item => {
        const matchingPrev = prev.find(n => n.id === item.id);
        return !matchingPrev || JSON.stringify(matchingPrev) !== JSON.stringify(item);
      });
      if (changed.length > 0) {
        await supabase.from("xmum_notifications").upsert(changed);
      }
    } catch (e) {
      console.error("Notifications sync exception:", e);
    }
  };

  const replaceAllAppData = (payload: {
    profiles: Profile[];
    hangouts: Hangout[];
    applications: HangoutApplication[];
    likes: HangoutLike[];
    comments: HangoutComment[];
    chats: Chat[];
    messages: Message[];
    reports: Report[];
    appeals: ReportAppeal[];
    blocks: Block[];
    notifications: AppNotification[];
  }) => {
    const nextProfiles = normalizeProfiles(payload.profiles);
    setProfiles(nextProfiles);
    localStorage.setItem("xmum_profiles", JSON.stringify(nextProfiles));

    setHangouts(payload.hangouts);
    localStorage.setItem("xmum_hangouts", JSON.stringify(payload.hangouts));

    setApplications(payload.applications);
    localStorage.setItem("xmum_applications", JSON.stringify(payload.applications));

    setLikes(payload.likes);
    localStorage.setItem("xmum_likes", JSON.stringify(payload.likes));

    setComments(payload.comments);
    localStorage.setItem("xmum_comments", JSON.stringify(payload.comments));

    setChats(payload.chats);
    localStorage.setItem("xmum_chats", JSON.stringify(payload.chats));

    setMessages(payload.messages);
    localStorage.setItem(
      "xmum_messages",
      JSON.stringify(payload.messages.map(message => ({ ...message, content: encryptMessage(message.content) })))
    );

    setReports(payload.reports);
    localStorage.setItem("xmum_reports", JSON.stringify(payload.reports));

    setAppeals(payload.appeals);
    localStorage.setItem("xmum_appeals", JSON.stringify(payload.appeals));

    const nextBlocks = filterBlocksForRuntime(payload.blocks);
    setBlocks(nextBlocks);
    localStorage.setItem("xmum_blocks", JSON.stringify(nextBlocks));

    setNotifications(payload.notifications);
    localStorage.setItem("xmum_notifications", JSON.stringify(payload.notifications));
  };

  const formatParticipantLimit = (limit: number | null) => (limit === null ? "No limit" : `${limit} people`);

  const formatRestrictionSummary = (restrictionSet: HangoutRestrictions) => {
    const pieces: string[] = [];

    if (restrictionSet.languages.length) {
      pieces.push(`Languages: ${restrictionSet.languages.join(", ")}`);
    }
    if (restrictionSet.programs.length) {
      pieces.push(`Programs: ${restrictionSet.programs.join(", ")}`);
    }
    if (restrictionSet.years.length) {
      pieces.push(`Years: ${restrictionSet.years.join(", ")}`);
    }
    if (restrictionSet.student_types.length) {
      pieces.push(`Student types: ${restrictionSet.student_types.join(", ")}`);
    }
    if (restrictionSet.countries.length) {
      pieces.push(`Countries: ${restrictionSet.countries.join(", ")}`);
    }
    if (restrictionSet.genders.length) {
      pieces.push(`Gender: ${restrictionSet.genders.join(", ")}`);
    }
    if (restrictionSet.age_min !== null || restrictionSet.age_max !== null) {
      if (restrictionSet.age_min !== null && restrictionSet.age_max !== null) {
        pieces.push(`Age: ${restrictionSet.age_min}-${restrictionSet.age_max}`);
      } else if (restrictionSet.age_min !== null) {
        pieces.push(`Age: ${restrictionSet.age_min}+`);
      } else if (restrictionSet.age_max !== null) {
        pieces.push(`Age: up to ${restrictionSet.age_max}`);
      }
    }

    return pieces.length ? pieces.join(" | ") : "Open to everyone";
  };

  const formatHangoutDateTime = (isoString: string) =>
    new Date(isoString).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

  const buildHangoutEditChanges = (
    original: Hangout,
    updated: Pick<Hangout, "location" | "event_datetime" | "meeting_point" | "additional_info" | "max_participants" | "restrictions" | "is_anonymous">
  ) => {
    const changes: Array<{ field: string; label: string; before: string; after: string }> = [];

    if (original.location !== updated.location) {
      changes.push({
        field: "location",
        label: "Location",
        before: original.location,
        after: updated.location
      });
    }

    if (original.event_datetime !== updated.event_datetime) {
      changes.push({
        field: "event_datetime",
        label: "When",
        before: formatHangoutDateTime(original.event_datetime),
        after: formatHangoutDateTime(updated.event_datetime)
      });
    }

    if (original.meeting_point !== updated.meeting_point) {
      changes.push({
        field: "meeting_point",
        label: "Meeting point",
        before: original.meeting_point,
        after: updated.meeting_point
      });
    }

    if (original.additional_info !== updated.additional_info) {
      changes.push({
        field: "additional_info",
        label: "Description",
        before: original.additional_info,
        after: updated.additional_info
      });
    }

    if (original.max_participants !== updated.max_participants) {
      changes.push({
        field: "max_participants",
        label: "Buddy limit",
        before: formatParticipantLimit(original.max_participants),
        after: formatParticipantLimit(updated.max_participants)
      });
    }

    if (JSON.stringify(original.restrictions) !== JSON.stringify(updated.restrictions)) {
      changes.push({
        field: "restrictions",
        label: "Joining criteria",
        before: formatRestrictionSummary(original.restrictions),
        after: formatRestrictionSummary(updated.restrictions)
      });
    }

    if (Boolean(original.is_anonymous) !== Boolean(updated.is_anonymous)) {
      changes.push({
        field: "is_anonymous",
        label: "Visibility",
        before: original.is_anonymous ? "Anonymous post" : "Named post",
        after: updated.is_anonymous ? "Anonymous post" : "Named post"
      });
    }

    return changes;
  };

  const createHangoutSystemEditComment = (hangout: Hangout, changeList: Array<{ field: string; label: string; before: string; after: string }>) => {
    const summary =
      changeList.length === 1
        ? `${currentUser?.name || "The host"} updated the ${changeList[0].label.toLowerCase()}.`
        : `${currentUser?.name || "The host"} updated this hangout's details.`;

    return {
      id: "comment_" + Math.random().toString(36).substring(2, 11),
      hangout_id: hangout.id,
      user_id: hangout.creator_id,
      is_anonymous: false,
      parent_comment_id: null,
      content: serializeHangoutEditHistoryEntry({
        at: new Date().toISOString(),
        editorName: currentUser?.name || "Host",
        summary,
        changes: changeList
      }),
      created_at: new Date().toISOString()
    } satisfies HangoutComment;
  };

  // --- ACTIONS ---

  // Auth
  const signInSimulated = async (email: string, name?: string) => {
    const formattedEmail = email.trim().toLowerCase();
    if (!formattedEmail.endsWith("@xmu.edu.my")) {
      return { success: false, error: "Only official Xiamen University Malaysia student emails (@xmu.edu.my) are permitted." };
    }

    try {
      console.log("Sending OTP code via Express Resend secure backend API...");
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: formattedEmail })
      });

      const resText = await res.text();
      let resData: any;
      try {
        resData = JSON.parse(resText);
      } catch (parseErr) {
        console.error("Non-JSON API response from /api/auth/send-otp:", resText);
        return {
          success: false,
          error: `Server answered with an unexpected response (Status ${res.status}). Let's fallback to password authentication or try again.`
        };
      }
      if (!res.ok) {
        return {
          success: false,
          error: resData.error || "Failed secure OTP email dispatch.",
          resend_expired: resData.resend_expired,
          otp_limit_reached: resData.otp_limit_reached,
          requires_microsoft: resData.requires_microsoft,
          allows_password_login: resData.allows_password_login,
          is_registered: resData.is_registered
        };
      }

      // Also create target profile skeleton upfront if they don't have one
      let profile = await resolveProfileByEmail(formattedEmail);

      if (!profile) {
        const student_id = formattedEmail.split("@")[0];
        const newId = "user_" + Math.random().toString(36).substring(2, 11);
        const isPrimaryAdmin = await matchesPrimaryAdminEmail(formattedEmail);
        const newProfile: Profile = {
          id: newId,
          email: formattedEmail,
          student_id,
          name: name?.trim() || student_id,
          name_last_changed_at: null,
          country: "Malaysia",
          country_last_changed_at: null,
          languages: ["English"],
          age: 18,
          program: XMUM_PROGRAMS[0],
          year_of_study: "Year 1",
          gender: "Male",
          student_type: "degree",
          about_me: "Hey there! I am new here on XMUM Hangouts.",
          avatar_id: "panda",
          is_profile_complete: false,
          hide_details: false,
          is_admin: isPrimaryAdmin || formattedEmail.startsWith("admin"),
          is_blocked_globally: false,
          flag_status: "none",
          appeal_count: 0
        };
        try {
          await supabase.from("xmum_profiles").insert([newProfile]);
        } catch (dbInsErr) {
          console.warn("Client-side Supabase skeleton insertion deferred (Supabase offline/paused):", dbInsErr);
        }
        
        // Setup local copy in the profiles array
        const normalizedNewProfile = normalizeProfileRecord(newProfile);
        setProfiles(prev => {
          const nextProfiles = prev.some(p => normalizeProfileEmail(p.email) === formattedEmail)
            ? prev.map(p => normalizeProfileEmail(p.email) === formattedEmail ? normalizedNewProfile : p)
            : [...prev, normalizedNewProfile];
          const reconciledProfiles = normalizeProfiles(nextProfiles);
          localStorage.setItem("xmum_profiles", JSON.stringify(reconciledProfiles));
          return reconciledProfiles;
        });
      } else {
        if (profile.is_blocked_globally) {
          return { success: false, error: "Your account is permanently locked due to security reviews." };
        }
      }

      return { 
        success: true, 
        message: resData.dev_mode && resData.dev_otp_preview
          ? `Local development mode: your verification code is ${resData.dev_otp_preview}.`
          : "Email Magic Link initiated successfully! Verify your university inbox to log in."
      };
    } catch (e: any) {
      console.error("Supabase sign in failed:", e);
      return { success: false, error: e.message || "Failed to trigger magic link authentication." };
    }
  };

  const signInWithMicrosoft = async (emailHint?: string) => {
    try {
      const redirectTo = getAuthRedirectOrigin();
      const normalizedEmailHint = emailHint?.trim().toLowerCase();
      if (normalizedEmailHint && !normalizedEmailHint.endsWith("@xmu.edu.my")) {
        return {
          success: false,
          error: "Please use your official XMUM Microsoft account ending with @xmu.edu.my."
        };
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const currentSessionEmail = sessionData.session?.user?.email?.toLowerCase();
      const shouldLinkToCurrentUser =
        Boolean(currentSessionEmail) &&
        Boolean(currentUser?.email) &&
        currentSessionEmail === currentUser.email.toLowerCase() &&
        (!normalizedEmailHint || normalizedEmailHint === currentSessionEmail);

      const authOptions = {
        redirectTo,
        scopes: "email",
        queryParams: normalizedEmailHint ? { login_hint: normalizedEmailHint } : undefined
      };

      let authResponse: any;
      if (shouldLinkToCurrentUser) {
        authResponse = await supabase.auth.linkIdentity({
          provider: "azure",
          options: authOptions
        } as any);

        if (authResponse?.error) {
          console.warn("Microsoft identity linking failed, retrying with standard OAuth sign-in:", authResponse.error);
          authResponse = await supabase.auth.signInWithOAuth({
            provider: "azure",
            options: authOptions
          });
        }
      } else {
        authResponse = await supabase.auth.signInWithOAuth({
          provider: "azure",
          options: authOptions
        });
      }

      const { data, error } = authResponse as any;

      if (error) {
        return { success: false, error: error.message || "Microsoft sign-in could not be started." };
      }

      if (data?.url) {
        markAuthRedirectPending();
        window.location.assign(data.url);
        return { success: true };
      }

      if (shouldLinkToCurrentUser) {
        return { success: true };
      }

      if (!data?.url) {
        return { success: false, error: "Microsoft sign-in link could not be created." };
      }
    } catch (e: any) {
      console.error("Microsoft sign-in failed:", e);
      return { success: false, error: e.message || "Failed to start Microsoft sign-in." };
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    const formattedEmail = email.trim().toLowerCase();
    try {
      console.log("Signing in with password...");
      const res = await fetch("/api/auth/login-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: formattedEmail, password })
      });
      const resText = await res.text();
      let resData: any;
      try {
        resData = JSON.parse(resText);
      } catch (parseErr) {
        console.error("Non-JSON API response from /api/auth/login-password:", resText);
        return {
          success: false,
          error: `Server answered with an unexpected response (Status ${res.status}). Let's verify details or retry again.`
        };
      }
      if (!res.ok) {
        return { success: false, error: resData.error || "Password authentication failed." };
      }

      if (resData.is_fallback) {
        storeLocalAuthToken(resData.local_auth_token || null);
        localStorage.setItem("xmum_current_user_id", resData.profile.id);
        await switchUser(resData.profile.id, resData.profile);
      } else {
        storeLocalAuthToken(resData.local_auth_token || null);
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: resData.session.access_token,
          refresh_token: resData.session.refresh_token
        });
        if (sessionError) throw sessionError;

        localStorage.setItem("xmum_current_user_id", resData.profile.id);
        await switchUser(resData.profile.id, resData.profile);
      }

      showToast("Signed in successfully with your password!", "success");
      return { success: true };
    } catch (e: any) {
      console.error("Password auth failed:", e);
      return { success: false, error: e.message || "Failed to log in with password." };
    }
  };

  const signOutSimulated = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Supabase signout failed:", e);
    }
    setCurrentUser(null);
    localStorage.removeItem("xmum_current_user_id");
    storeLocalAuthToken(null);
    showToast("Signed out successfully.", "info");
  };

  const completeOnboarding = () => {
    if (currentUser) {
      markOnboardingSeen(currentUser.email);
    }
    setShowOnboarding(false);
  };

  const switchUser = async (profileId: string, providedProfile?: Profile) => {
    if (providedProfile) {
      const normalizedProfile = normalizeProfileRecord(providedProfile);
      setCurrentUser(normalizedProfile);
      setProfiles(prev => {
        const nextProfiles = !prev.some(p => p.id === normalizedProfile.id)
          ? [...prev, normalizedProfile]
          : prev.map(p => p.id === normalizedProfile.id || normalizeProfileEmail(p.email) === normalizedProfile.email
            ? normalizedProfile
            : p
          );
        const reconciledProfiles = normalizeProfiles(nextProfiles);
        localStorage.setItem("xmum_profiles", JSON.stringify(reconciledProfiles));
        return reconciledProfiles;
      });
      localStorage.setItem("xmum_current_user_id", normalizedProfile.id);
      showToast(`Switched active session to ${normalizedProfile.name}`, "info");
      return;
    }

    try {
      let { data: found, error: foundError } = await supabase.from("xmum_profiles").select(getProfileSelectColumns()).eq("id", profileId).maybeSingle();
      if (
        foundError &&
        (
          isMissingPasswordHashColumnError(foundError) ||
          isMissingProfileColumnError(foundError, "companion_pet_count") ||
          isMissingProfileColumnError(foundError, "companion_selected_state_id") || isMissingProfileColumnError(foundError, "birthdate")
        )
      ) {
        markUnsupportedProfileColumns(foundError);
        ({ data: found, error: foundError } = await supabase.from("xmum_profiles").select(getProfileSelectColumns()).eq("id", profileId).maybeSingle());
      }
      if (found) {
        const normalizedFound = normalizeProfileRecord(found as unknown as Profile);
        setCurrentUser(normalizedFound);
        localStorage.setItem("xmum_current_user_id", normalizedFound.id);
        showToast(`Switched active session to ${normalizedFound.name}`, "info");
      } else {
        const fallbackLocal = profiles.find(p => p.id === profileId);
        if (fallbackLocal) {
          const normalizedFallback = normalizeProfileRecord(fallbackLocal);
          setCurrentUser(normalizedFallback);
          localStorage.setItem("xmum_current_user_id", normalizedFallback.id);
          showToast(`Switched active session to ${normalizedFallback.name} (Local fallback)`, "info");
        }
      }
    } catch (e) {
      const fallbackLocal = profiles.find(p => p.id === profileId);
      if (fallbackLocal) {
        const normalizedFallback = normalizeProfileRecord(fallbackLocal);
        setCurrentUser(normalizedFallback);
        localStorage.setItem("xmum_current_user_id", normalizedFallback.id);
        showToast(`Switched active session to ${normalizedFallback.name} (Local fallback)`, "info");
      }
    }
  };

  const createMockUser = (email: string, name: string, isAdmin = false) => {
    const formattedEmail = email.trim().toLowerCase();
    if (!formattedEmail.endsWith("@xmu.edu.my")) {
      showToast("Email must end with @xmu.edu.my", "error");
      return;
    }
    const student_id = formattedEmail.split("@")[0];
    const newUser: Profile = {
      id: "user_" + Math.random().toString(36).substring(2, 11),
      email: formattedEmail,
      student_id,
      name,
      name_last_changed_at: null,
      country: "Malaysia",
      country_last_changed_at: null,
      languages: ["English"],
      age: 20,
      program: "Software Engineering",
      year_of_study: "Year 2",
      gender: "Male",
      student_type: "degree",
      about_me: "Barista by day, scholar by night. Let's study in the courtyard!",
      avatar_id: "frog",
      is_profile_complete: true,
      hide_details: false,
      is_admin: isAdmin,
      is_blocked_globally: false,
      flag_status: "none",
      appeal_count: 0,
      is_demo_profile: true
    };
    saveProfiles([...profiles, newUser]);
    showToast(`Simulated user ${name} created!`, "success");
  };

  // Profile Update
  const updateProfile = (data: Partial<Profile>) => {
    if (!currentUser) return { success: false, error: "Not logged in" };

    const original = profiles.find(p => p.id === currentUser.id);
    if (!original) return { success: false, error: "Profile not found" };

    const update: Partial<Profile> = { ...data };
    
    // Safety check: Name / Country 14-day edit cooldown validation
    const now = new Date().getTime();
    const cooldownPeriod = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

    // If changing name
    if (data.name && data.name !== original.name) {
      if (original.name_last_changed_at) {
        const lastChanged = new Date(original.name_last_changed_at).getTime();
        if (now - lastChanged < cooldownPeriod) {
          const daysLeft = Math.ceil((cooldownPeriod - (now - lastChanged)) / (1000 * 60 * 60 * 24));
          return { success: false, error: `Name cannot be changed. You must wait ${daysLeft} more day(s).` };
        }
      }
      update.name_last_changed_at = new Date().toISOString();
    }

    // If changing country
    if (data.country && data.country !== original.country) {
      if (original.country_last_changed_at) {
        const lastChanged = new Date(original.country_last_changed_at).getTime();
        if (now - lastChanged < cooldownPeriod) {
          const daysLeft = Math.ceil((cooldownPeriod - (now - lastChanged)) / (1000 * 60 * 60 * 24));
          return { success: false, error: `Country cannot be changed. You must wait ${daysLeft} more day(s).` };
        }
      }
      update.country_last_changed_at = new Date().toISOString();
    }

    // Email and student_id are permanently locked and cannot be changed
    delete update.email;
    delete update.student_id;
    delete update.is_admin;
    delete update.is_blocked_globally;
    delete update.flag_status;
    delete update.appeal_count;
    delete update.is_demo_profile;
    if (original.is_profile_complete) {
      delete update.gender;
    }

    if (typeof update.password === "string") {
      const trimmedPassword = update.password.trim();
      if (trimmedPassword.length > 0) {
        update.password_hash = hashPassword(currentUser.email, trimmedPassword);
        void syncPasswordCredential(trimmedPassword);
      }
      delete update.password;
    }

    // Build finalized profile
    const updatedUser = normalizeProfileRecord({ ...original, ...update, is_profile_complete: true });
    
    const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
    saveProfiles(nextProfiles);
    setCurrentUser(updatedUser);
    if (!original.is_profile_complete && updatedUser.is_profile_complete && !hasSeenOnboarding(updatedUser.email)) {
      setOnboardingStep(0);
      setShowOnboarding(true);
    }
    showToast("Profile updated successfully!", "success");
    return { success: true };
  };

  const setHideDetails = (hide: boolean) => {
    if (!currentUser) return;
    const updated = { ...currentUser, hide_details: hide };
    saveProfiles(profiles.map(p => p.id === currentUser.id ? updated : p));
    setCurrentUser(updated);
    showToast(hide ? "Profile details hidden from public." : "Profile details visible to public.", "info");
  };

  const deleteCurrentAccount = async () => {
    if (!currentUser) {
      return { success: false, error: "Please sign in to continue." };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const localAuthToken = getLocalAuthToken();

      if (!accessToken && !localAuthToken) {
        return { success: false, error: "Please sign in again before deleting your account." };
      }

      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(localAuthToken ? { "X-Local-Auth": localAuthToken } : {})
        }
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: payload.error || "We couldn't delete your account right now." };
      }

      replaceAllAppData({
        profiles: payload.profiles || [],
        hangouts: payload.hangouts || [],
        applications: payload.applications || [],
        likes: payload.likes || [],
        comments: payload.comments || [],
        chats: payload.chats || [],
        messages: payload.messages || [],
        reports: payload.reports || [],
        appeals: payload.appeals || [],
        blocks: payload.blocks || [],
        notifications: payload.notifications || []
      });

      setCurrentUser(null);
      setViewedProfile(null);
      setShowOnboarding(false);
      setOnboardingStep(0);
      localStorage.removeItem("xmum_current_user_id");
      localStorage.removeItem("xmum_current_user_profile");
      storeLocalAuthToken(null);

      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.warn("Supabase sign-out after account deletion failed:", signOutError);
      }

      window.dispatchEvent(new CustomEvent("xmum-account-deleted"));
      showToast("Your account has been permanently deleted.", "success");
      return { success: true };
    } catch (error: any) {
      console.error("Account deletion failed:", error);
      return { success: false, error: error?.message || "We couldn't delete your account right now." };
    }
  };

  // Hangouts
  const createHangout = (data: Omit<Hangout, "id" | "creator_id" | "status" | "created_at" | "updated_at">) => {
    if (!currentUser) return { success: false, error: "Please sign in to post a hangout." };
    if (!currentUser.is_profile_complete) return { success: false, error: "Please complete your profile to post a hangout." };
    if (!data.intention.trim()) return { success: false, error: "Please describe what you want to do." };
    if (!data.location.trim()) return { success: false, error: "Please add the hangout location." };
    if (!data.meeting_point.trim()) return { success: false, error: "Please add a safe meeting point." };
    if (!data.additional_info.trim()) return { success: false, error: "Please add a short description so people know what to expect." };
    if (data.additional_info.trim().length < MIN_HANGOUT_DESCRIPTION_LENGTH) {
      return { success: false, error: `Please make the description at least ${MIN_HANGOUT_DESCRIPTION_LENGTH} characters long.` };
    }

    const eventTimeError = validateFutureHangoutDate(data.event_datetime);
    if (eventTimeError) {
      return { success: false, error: eventTimeError };
    }

    if (data.max_participants !== null && (!Number.isInteger(data.max_participants) || data.max_participants < 1 || data.max_participants > 100)) {
      return { success: false, error: "Participant limit must be between 1 and 100." };
    }

    // Vulgarity detection
    if (containsProfanity(data.intention) || containsProfanity(data.additional_info || "") || containsProfanity(data.location) || containsProfanity(data.meeting_point)) {
      const err = "Inappropriate content detected. Please keep language clean and safe.";
      showToast(err, "error");

      // System warning to user
      localStorage.setItem("xmum_companion_anger_time", new Date().toISOString());
      window.dispatchEvent(new CustomEvent("xmum-profanity-warned"));
      const warnNotif: AppNotification = {
        id: "warn_" + Math.random().toString(36).substring(2, 11),
        user_id: currentUser.id,
        type: "admin_message",
        payload: {
          custom_text: `⚠️ Safety Warning: You tried to type inappropriate words. Offenses are logged under Student Safety Guidelines.`
        },
        is_read: false,
        created_at: new Date().toISOString()
      };

      // Notification to admins
      const adminNotifs: AppNotification[] = profiles
        .filter(p => p.is_admin)
        .map(ad => ({
          id: "admin_alert_" + Math.random().toString(36).substring(2, 11),
          user_id: ad.id,
          type: "new_report_admin",
          payload: {
            custom_text: `🚨 Abusive Behavior: ${currentUser.name} attempted vulgar hangout plan: "${data.intention.substring(0, 30)}..."`
          },
          is_read: false,
          created_at: new Date().toISOString()
        }));

      saveNotifications([warnNotif, ...adminNotifs, ...notifications]);
      return { success: false, error: err };
    }

    // Rate Limit check: Max 5 hangouts per day
    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const recentHangoutsCount = hangouts.filter(
      h => h.creator_id === currentUser.id && 
           (now - new Date(h.created_at).getTime()) < oneDayMs
    ).length;

    if (recentHangoutsCount >= 5) {
      const err = "Rate limit exceeded: You can only create up to 5 hangouts per day.";
      showToast(err, "error");
      return { success: false, error: err };
    }

    const newHangout: Hangout = {
      ...data,
      id: "hangout_" + Math.random().toString(36).substring(2, 11),
      creator_id: currentUser.id,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    saveHangouts([newHangout, ...hangouts]);
    setLastHangoutCreatedTime(now);
    showToast("Hangout plan posted successfully! Let the meetups begin.", "success");
    return { success: true };
  };

  const editHangout = (
    hangoutId: string,
    data: Pick<Hangout, "location" | "event_datetime" | "meeting_point" | "additional_info" | "max_participants" | "restrictions" | "is_anonymous">
  ) => {
    if (!currentUser) return { success: false, error: "Please sign in to edit your hangout." };

    const target = hangouts.find(h => h.id === hangoutId);
    if (!target || target.creator_id !== currentUser.id) {
      return { success: false, error: "We couldn't find that hangout." };
    }

    if (target.status !== "active") {
      return { success: false, error: "Only active hangouts can be edited." };
    }

    const nextData = {
      location: data.location.trim(),
      event_datetime: data.event_datetime,
      meeting_point: data.meeting_point.trim(),
      additional_info: data.additional_info.trim(),
      max_participants: data.max_participants,
      restrictions: data.restrictions,
      is_anonymous: Boolean(data.is_anonymous)
    };

    if (!nextData.location) return { success: false, error: "Please add the hangout location." };
    if (!nextData.meeting_point) return { success: false, error: "Please add a meeting point." };
    if (!nextData.additional_info) return { success: false, error: "Please add a short description so people know what to expect." };
    if (nextData.additional_info.length < MIN_HANGOUT_DESCRIPTION_LENGTH) {
      return { success: false, error: `Please make the description at least ${MIN_HANGOUT_DESCRIPTION_LENGTH} characters long.` };
    }
    if (
      nextData.max_participants !== null &&
      (!Number.isInteger(nextData.max_participants) || nextData.max_participants < 1 || nextData.max_participants > 100)
    ) {
      return { success: false, error: "Buddy limit must be between 1 and 100." };
    }
    if (
      containsProfanity(nextData.location) ||
      containsProfanity(nextData.meeting_point) ||
      containsProfanity(nextData.additional_info)
    ) {
      return { success: false, error: "Please keep the edited details respectful and student-friendly." };
    }

    if (target.event_datetime !== nextData.event_datetime) {
      const editedTimeError = validateFutureHangoutDate(nextData.event_datetime, 60);
      if (editedTimeError) {
        return { success: false, error: editedTimeError };
      }
    }

    const changeList = buildHangoutEditChanges(target, nextData);
    if (changeList.length === 0) {
      return { success: false, error: "No changes were detected." };
    }

    const updatedHangout: Hangout = {
      ...target,
      ...nextData,
      updated_at: new Date().toISOString()
    };

    const nextHangouts = hangouts.map(h => (h.id === hangoutId ? updatedHangout : h));
    const editHistoryComment = createHangoutSystemEditComment(updatedHangout, changeList);
    const nextComments = [...comments, editHistoryComment];

    const acceptedApplications = applications.filter(
      application => application.hangout_id === hangoutId && application.status === "accepted"
    );
    const notificationText =
      changeList.length === 1
        ? `Little update: "${target.intention}" has a new ${changeList[0].label.toLowerCase()}.`
        : `Little update: "${target.intention}" has refreshed details for everyone joining.`;

    const updateNotifications: AppNotification[] = acceptedApplications.map(application => ({
      id: "notif_" + Math.random().toString(36).substring(2, 11),
      user_id: application.applicant_id,
      type: "admin_message",
      payload: {
        hangout_id: hangoutId,
        custom_text: `${notificationText} Open the hangout to see what changed.`
      },
      is_read: false,
      created_at: new Date().toISOString()
    }));

    saveHangouts(nextHangouts);
    saveComments(nextComments);
    if (updateNotifications.length > 0) {
      saveNotifications([...updateNotifications, ...notifications]);
    }

    window.dispatchEvent(
      new CustomEvent("xmum-hangout-edited", {
        detail: {
          intention: target.intention,
          changeCount: changeList.length
        }
      })
    );

    showToast("Your hangout has been updated.", "success");
    return { success: true };
  };

  const deleteHangout = (hangoutId: string) => {
    if (!currentUser) return { success: false, error: "Please sign in to manage your hangouts." };

    const target = hangouts.find(h => h.id === hangoutId);
    if (!target || target.creator_id !== currentUser.id) {
      return { success: false, error: "We couldn't find that hangout." };
    }

    if (target.status === "expired") {
      return { success: false, error: "Expired hangouts can't be deleted." };
    }

    if (target.status === "cancelled") {
      return { success: false, error: "This hangout has already been cancelled." };
    }

    const nextHangouts = hangouts.map(h =>
      h.id === hangoutId
        ? { ...h, status: "cancelled" as const, updated_at: new Date().toISOString() }
        : h
    );

    const affectedApplications = applications.filter(
      application =>
        application.hangout_id === hangoutId &&
        (application.status === "pending" || application.status === "accepted")
    );

    const cancellationNotifications: AppNotification[] = affectedApplications.map(application => ({
      id: "notif_" + Math.random().toString(36).substring(2, 11),
      user_id: application.applicant_id,
      type: "admin_message",
      payload: {
        hangout_id: hangoutId,
        custom_text: `Heads up: "${target.intention}" has been cancelled, so you don't need to keep this time free anymore.`
      },
      is_read: false,
      created_at: new Date().toISOString()
    }));

    saveHangouts(nextHangouts);
    if (cancellationNotifications.length > 0) {
      saveNotifications([...cancellationNotifications, ...notifications]);
    }

    window.dispatchEvent(
      new CustomEvent("xmum-hangout-cancelled", {
        detail: { intention: target.intention }
      })
    );

    showToast("Your hangout has been cancelled.", "success");
    return { success: true };
  };

  // Likes
  const toggleLike = (hangoutId: string) => {
    if (!currentUser) {
      showToast("Please login to react to this hangout.", "error");
      return;
    }
    const existingLike = likes.find(l => l.hangout_id === hangoutId && l.user_id === currentUser.id);
    let nextLikes = [...likes];
    
    if (existingLike) {
      nextLikes = nextLikes.filter(l => l.id !== existingLike.id);
      saveLikes(nextLikes);
    } else {
      const newLike: HangoutLike = {
        id: "like_" + Math.random().toString(36).substring(2, 11),
        hangout_id: hangoutId,
        user_id: currentUser.id,
        created_at: new Date().toISOString()
      };
      nextLikes.push(newLike);
      saveLikes(nextLikes);

      // Send Notification to creator
      const targetHangout = hangouts.find(h => h.id === hangoutId);
      if (targetHangout && targetHangout.creator_id !== currentUser.id) {
        const newNotif: AppNotification = {
          id: "notif_" + Math.random().toString(36).substring(2, 11),
          user_id: targetHangout.creator_id,
          type: "hangout_like",
          payload: {
            hangout_id: hangoutId,
            hangout_title: targetHangout.intention.substring(0, 15) + "...",
            custom_text: `${currentUser.name} liked your hangout plan!`
          },
          is_read: false,
          created_at: new Date().toISOString()
        };
        saveNotifications([newNotif, ...notifications]);
      }
    }
  };

  const VULGAR_WORDS = [
    "fuck", "fuk", "fck", "fcuk", "fux", "fuc", "phuck",
    "shit", "shyt", "sht",
    "bitch", "bytch", "b1tch", "asshole", "bastard", "crap", "dick", "pussy", "cock",
    "wanker", "whore", "slut", "motherfucker"
  ];

  const containsProfanity = (text: string): boolean => {
    if (!text) return false;
    
    const levDist = (s1: string, s2: string): number => {
      const m = s1.length;
      const n = s2.length;
      const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (s1[i - 1] === s2[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1];
          } else {
            dp[i][j] = Math.min(
              dp[i - 1][j] + 1,
              dp[i][j - 1] + 1,
              dp[i - 1][j - 1] + 1
            );
          }
        }
      }
      return dp[m][n];
    };

    const deobfuscate = (str: string): string => {
      return str
        .toLowerCase()
        .replace(/[0o]/g, "o")
        .replace(/[1il!|]/g, "i")
        .replace(/[@4a]/g, "a")
        .replace(/[3e]/g, "e")
        .replace(/[$5s]/g, "s")
        .replace(/[7+t]/g, "t")
        .replace(/[uv]/g, "u")
        .replace(/[9g]/g, "g");
    };

    const checkWord = (token: string): boolean => {
      const cleanToken = deobfuscate(token.replace(/[^a-zA-Z]/g, ""));
      if (!cleanToken) return false;

      for (const vulgar of VULGAR_WORDS) {
        if (cleanToken === vulgar) return true;
        if (cleanToken.includes(vulgar)) return true;

        const maxDist = vulgar.length >= 6 ? 2 : (vulgar.length >= 4 ? 1 : 0);
        if (maxDist > 0 && Math.abs(cleanToken.length - vulgar.length) <= maxDist) {
          if (levDist(cleanToken, vulgar) <= maxDist) {
            return true;
          }
        }
      }
      return false;
    };

    const lower = text.toLowerCase();
    const fullyNormalized = deobfuscate(lower.replace(/[\s\-_.*\(\)\[\]\{\}\?\!\&\$\@\#]/g, ""));
    for (const vulgar of VULGAR_WORDS) {
      if (fullyNormalized.includes(vulgar)) return true;
      const maxDist = vulgar.length >= 6 ? 2 : (vulgar.length >= 4 ? 1 : 0);
      if (maxDist > 0 && Math.abs(fullyNormalized.length - vulgar.length) <= maxDist) {
        if (levDist(fullyNormalized, vulgar) <= maxDist) {
          return true;
        }
      }
    }

    const words = text.split(/[\s\-_.*\(\)\[\]\{\}\?\!\&\$\@\#,\.;:]+/);
    for (const token of words) {
      if (checkWord(token)) {
        return true;
      }
    }

    return false;
  };

  const toggleCommentLike = (commentId: string) => {
    if (!currentUser) {
      showToast("Please log in to react.", "error");
      return;
    }
    const exists = commentLikes.some(l => l.comment_id === commentId && l.user_id === currentUser.id);
    let nextLikes = [];
    if (exists) {
      nextLikes = commentLikes.filter(l => !(l.comment_id === commentId && l.user_id === currentUser.id));
    } else {
      nextLikes = [...commentLikes, { comment_id: commentId, user_id: currentUser.id }];

      // Trigger notification and custom event for companion
      const commentObj = comments.find(c => c.id === commentId);
      if (commentObj && commentObj.user_id !== currentUser.id) {
        // Send a notification to the commenter
        const loveNotif: AppNotification = {
          id: "notif_" + Math.random().toString(36).substring(2, 11),
          user_id: commentObj.user_id,
          type: "comment_reply",
          payload: {
            hangout_id: commentObj.hangout_id,
            comment_id: commentId,
            custom_text: `💖 ${currentUser.name} loved your comment: "${commentObj.content.substring(0, 20)}..."`
          },
          is_read: false,
          created_at: new Date().toISOString()
        };
        saveNotifications([loveNotif, ...notifications]);
      }
    }
    setCommentLikes(nextLikes);
    localStorage.setItem("xmum_comment_likes", JSON.stringify(nextLikes));
  };

  // Comments
  const addComment = (
    hangoutId: string,
    content: string,
    parentCommentId: string | null = null,
    isAnonymous = false
  ) => {
    if (!currentUser) return { success: false, error: "Please log in to leave a comment." };
    if (!currentUser.is_profile_complete) return { success: false, error: "Please complete your profile first." };
    if (!content.trim()) return { success: false, error: "Comment cannot be empty." };

    // Vulgarity detection
    if (containsProfanity(content)) {
      const err = "Inappropriate content detected. Please keep dialogues polite.";
      showToast(err, "error");

      // System warning to user
      localStorage.setItem("xmum_companion_anger_time", new Date().toISOString());
      window.dispatchEvent(new CustomEvent("xmum-profanity-warned"));
      const warnNotif: AppNotification = {
        id: "warn_" + Math.random().toString(36).substring(2, 11),
        user_id: currentUser.id,
        type: "admin_message",
        payload: {
          custom_text: `⚠️ Safety Warning: You tried to type inappropriate words. Offenses are logged under Student Safety Guidelines.`
        },
        is_read: false,
        created_at: new Date().toISOString()
      };

      // Notification to admins
      const adminNotifs: AppNotification[] = profiles
        .filter(p => p.is_admin)
        .map(ad => ({
          id: "admin_alert_" + Math.random().toString(36).substring(2, 11),
          user_id: ad.id,
          type: "new_report_admin",
          payload: {
            custom_text: `🚨 Abusive Behavior: ${currentUser.name} attempted vulgar comment: "${content.substring(0, 30)}..."`
          },
          is_read: false,
          created_at: new Date().toISOString()
        }));

      saveNotifications([warnNotif, ...adminNotifs, ...notifications]);
      return { success: false, error: err };
    }

    // Rate Limit check for comments: Max 1 comment every 10 seconds
    const now = new Date().getTime();
    if (now - lastCommentCreatedTime < 10000) {
      const secondsLeft = Math.ceil((10000 - (now - lastCommentCreatedTime)) / 1000);
      const err = `Rate limit: Please wait ${secondsLeft} second(s) before posting another comment.`;
      showToast(err, "error");
      return { success: false, error: err };
    }

    const newComment: HangoutComment = {
      id: "comment_" + Math.random().toString(36).substring(2, 11),
      hangout_id: hangoutId,
      user_id: currentUser.id,
      is_anonymous: Boolean(isAnonymous),
      parent_comment_id: parentCommentId,
      content: content.trim(),
      created_at: new Date().toISOString()
    };

    saveComments([...comments, newComment]);
    setLastCommentCreatedTime(now);

    // Notify hangout creator or parent commenter
    const targetHangout = hangouts.find(h => h.id === hangoutId);
    if (targetHangout) {
      const notifyUserId = parentCommentId 
        ? comments.find(c => c.id === parentCommentId)?.user_id 
        : targetHangout.creator_id;

      if (notifyUserId && notifyUserId !== currentUser.id) {
        const commenterLabel = isAnonymous ? "An anonymous student" : currentUser.name;
        const newNotif: AppNotification = {
          id: "notif_" + Math.random().toString(36).substring(2, 11),
          user_id: notifyUserId,
          type: parentCommentId ? "comment_reply" : "comment_reply", // Reuse comment_reply type
          payload: {
            hangout_id: hangoutId,
            comment_id: newComment.id,
            custom_text: `${commenterLabel} left a comment on your post: "${content.substring(0, 20)}..."`
          },
          is_read: false,
          created_at: new Date().toISOString()
        };
        saveNotifications([newNotif, ...notifications]);
      }
    }

    showToast("Comment added successfully!", "success");
    return { success: true };
  };

  // Applications
  const applyToHangout = (hangoutId: string, isAnonymous: boolean) => {
    if (!currentUser) return { success: false, error: "Please log in to apply." };
    if (!currentUser.is_profile_complete) return { success: false, error: "Please complete your profile to apply." };

    const latestApplications = applicationsRef.current;
    const targetHangout = hangouts.find(h => h.id === hangoutId);
    if (!targetHangout) return { success: false, error: "Hangout not found." };
    if (targetHangout.creator_id === currentUser.id) {
      const cleanedApplications = latestApplications.filter(
        application => !(application.hangout_id === hangoutId && application.applicant_id === currentUser.id)
      );
      if (cleanedApplications.length !== latestApplications.length) {
        void saveApplications(cleanedApplications);
      }
      return { success: false, error: "You cannot apply to your own hangout." };
    }

    // Check Eligibility
    const { eligible, reasons } = isEligibleForHangout(currentUser, targetHangout);
    if (!eligible) {
      return { success: false, error: `Ineligible: ${reasons.join(", ")}` };
    }

    // Check if block exists either way
    const hasBlock = blocks.some(b => 
      (b.blocker_id === currentUser.id && b.blocked_id === targetHangout.creator_id) ||
      (b.blocker_id === targetHangout.creator_id && b.blocked_id === currentUser.id)
    );
    if (hasBlock) {
      return { success: false, error: "Cannot apply to hangouts of a blocked student." };
    }

    // Check existing application
    const existingApp = latestApplications.find(
      a => a.hangout_id === hangoutId && a.applicant_id === currentUser.id && a.status !== "retracted"
    );
    if (existingApp) {
      return { success: false, error: "You have already applied to this hangout." };
    }

    const newApp: HangoutApplication = {
      id: "app_" + Math.random().toString(36).substring(2, 11),
      hangout_id: hangoutId,
      applicant_id: currentUser.id,
      is_anonymous: isAnonymous,
      status: "pending",
      rejection_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    saveApplications([...latestApplications, newApp]);

    // Send notification to hangout creator
    const newNotif: AppNotification = {
      id: "notif_" + Math.random().toString(36).substring(2, 11),
      user_id: targetHangout.creator_id,
      type: "new_application",
      payload: {
        hangout_id: hangoutId,
        custom_text: `${isAnonymous ? "An anonymous student" : currentUser.name} requested to join: "I want to ${targetHangout.intention.substring(0, 20)}..."`
      },
      is_read: false,
      created_at: new Date().toISOString()
    };
    saveNotifications([newNotif, ...notifications]);

    showToast("Request to join submitted! Planner approval required.", "success");
    return { success: true };
  };

  const retractApplication = (applicationId: string) => {
    const latestApplications = applicationsRef.current;
    const updated = latestApplications.map(app => {
      if (app.id === applicationId) {
        // Find hangout to notify creator
        const targetHangout = hangouts.find(h => h.id === app.hangout_id);
        if (targetHangout) {
          const newNotif: AppNotification = {
            id: "notif_" + Math.random().toString(36).substring(2, 11),
            user_id: targetHangout.creator_id,
            type: "application_rejected", // reuse or send warning
            payload: {
              hangout_id: app.hangout_id,
              custom_text: `An applicant retracted their request for: "${targetHangout.intention.substring(0, 15)}..."`
            },
            is_read: false,
            created_at: new Date().toISOString()
          };
          saveNotifications([newNotif, ...notifications]);
        }
        return { ...app, status: "retracted" as const, updated_at: new Date().toISOString() };
      }
      return app;
    });

    saveApplications(updated);
    showToast("Application retracted.", "info");
  };

  const manageApplication = (applicationId: string, status: "accepted" | "rejected", rejectMessage?: string) => {
    const latestApplications = applicationsRef.current;
    const targetApp = latestApplications.find(a => a.id === applicationId);
    if (!targetApp) return;

    const targetHangout = hangouts.find(h => h.id === targetApp.hangout_id);
    if (!targetHangout) return;

    const nextApps = latestApplications.map(app => {
      if (app.id === applicationId) {
        return { 
          ...app, 
          status, 
          rejection_message: status === "rejected" ? (rejectMessage || "The planner has decided not to accept your application for this hangout.") : null,
          updated_at: new Date().toISOString() 
        };
      }
      return app;
    });

    saveApplications(nextApps);

    // Send status notification to applicant
    const newNotif: AppNotification = {
      id: "notif_" + Math.random().toString(36).substring(2, 11),
      user_id: targetApp.applicant_id,
      type: status === "accepted" ? "application_accepted" : "application_rejected",
      payload: {
        hangout_id: targetApp.hangout_id,
        custom_text: status === "accepted" 
          ? `Your application to "I want to ${targetHangout.intention.substring(0, 15)}..." was ACCEPTED! Meeting point is unlocked.` 
          : `Your application to "I want to ${targetHangout.intention.substring(0, 15)}..." was declined. "${rejectMessage || 'No message provided.'}"`
      },
      is_read: false,
      created_at: new Date().toISOString()
    };
    
    // Create chat on accept
    if (status === "accepted") {
      try {
        const activeChat = getOrCreateChat(targetApp.applicant_id, targetApp.hangout_id);
        const autoMsg: Message = {
          id: "msg_" + Math.random().toString(36).substring(2, 11),
          chat_id: activeChat.id,
          sender_id: targetHangout.creator_id,
          content: `Your request was approved! Let's meet at "${targetHangout.meeting_point}" on ${new Date(targetHangout.event_datetime).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}!`,
          is_read: false,
          created_at: new Date().toISOString()
        };
        saveMessages([...messages, autoMsg]);
      } catch (err) {
        console.error("Error creating chat upon approval:", err);
      }
    }

    saveNotifications([newNotif, ...notifications]);

    showToast(`Application successfully ${status}!`, "success");
  };

  // Chats
  const getOrCreateChat = (otherUserId: string, hangoutId: string | null = null) => {
    if (!currentUser) throw new Error("Must be logged in.");

    // Unique constraint: check if there's already a chat between these two
    let activeChat = chats.find(
      c => (c.user_a_id === currentUser.id && c.user_b_id === otherUserId) ||
           (c.user_a_id === otherUserId && c.user_b_id === currentUser.id)
    );

    if (!activeChat) {
      activeChat = {
        id: "chat_" + Math.random().toString(36).substring(2, 11),
        user_a_id: currentUser.id,
        user_b_id: otherUserId,
        hangout_id: hangoutId,
        created_at: new Date().toISOString()
      };
      saveChats([...chats, activeChat]);
    }
    return activeChat;
  };

  const sendChatMessage = (chatId: string, content: string) => {
    if (!currentUser) return;
    const activeChat = chats.find(c => c.id === chatId);
    if (!activeChat) return;

    // Check if either blocker/blocked exists
    const otherUserId = activeChat.user_a_id === currentUser.id ? activeChat.user_b_id : activeChat.user_a_id;
    const isBlocked = blocks. some(b => 
      (b.blocker_id === currentUser.id && b.blocked_id === otherUserId) ||
      (b.blocker_id === otherUserId && b.blocked_id === currentUser.id)
    );

    if (isBlocked) {
      showToast("Cannot message. You have blocked this user or they have blocked you.", "error");
      return;
    }

    const newMsg: Message = {
      id: "msg_" + Math.random().toString(36).substring(2, 11),
      chat_id: chatId,
      sender_id: currentUser.id,
      content: content.trim(),
      is_read: false,
      created_at: new Date().toISOString()
    };

    saveMessages([...messages, newMsg]);

    // Send silent unread notif updates
    // In low-fidelity/high-fidelity client side we just trigger updates
  };

  const markChatAsRead = (chatId: string) => {
    if (!currentUser) return;
    let changed = false;
    const updatedMsgs = messages.map(msg => {
      if (msg.chat_id === chatId && msg.sender_id !== currentUser.id && !msg.is_read) {
        changed = true;
        return { ...msg, is_read: true };
      }
      return msg;
    });
    if (changed) {
      saveMessages(updatedMsgs);
    }
  };

  // Block/Unblock
  const toggleBlockUser = (otherUserId: string) => {
    if (!currentUser) return;
    if (!otherUserId) return;

    if (otherUserId === currentUser.id) {
      const cleanedBlocks = blocks.filter(block => block.blocker_id !== currentUser.id || block.blocked_id !== currentUser.id);
      if (cleanedBlocks.length !== blocks.length) {
        saveBlocks(cleanedBlocks);
      }
      showToast("You cannot block your own profile.", "error");
      return;
    }

    const existingBlocks = blocks.filter(
      b => b.blocker_id === currentUser.id && b.blocked_id === otherUserId
    );
    if (existingBlocks.length > 0) {
      // Unblock
      saveBlocks(blocks.filter(b => !(b.blocker_id === currentUser.id && b.blocked_id === otherUserId)));
      showToast("User unblocked.", "info");
    } else {
      // Block
      const newBlock: Block = {
        id: "block_" + Math.random().toString(36).substring(2, 11),
        blocker_id: currentUser.id,
        blocked_id: otherUserId,
        created_at: new Date().toISOString()
      };
      saveBlocks([...blocks, newBlock]);

      // Remove any pending applications between them both
      saveApplications(applicationsRef.current.map(app => {
        const creatorId = hangouts.find(h => h.id === app.hangout_id)?.creator_id;
        if (
          (app.applicant_id === currentUser.id && creatorId === otherUserId) ||
          (app.applicant_id === otherUserId && creatorId === currentUser.id)
        ) {
          return { ...app, status: "retracted" as const };
        }
        return app;
      }));

      showToast("User blocked. They can no longer see your hangouts or send you messages.", "info");
    }
  };

  // Reports & Appeals
  const submitReport = (reportedUserId: string, description: string) => {
    if (!currentUser) return { success: false, error: "Not logged in" };
    if (!description.trim()) return { success: false, error: "Description is mandatory." };

    const newReport: Report = {
      id: "report_" + Math.random().toString(36).substring(2, 11),
      reporter_id: currentUser.id,
      reported_user_id: reportedUserId,
      description: description.trim(),
      status: "pending",
      created_at: new Date().toISOString(),
      reviewed_at: null
    };

    saveReports([...reports, newReport]);

    // Send notification to all admin profiles
    const adminProfiles = profiles.filter(p => p.is_admin);
    const newNotifs: AppNotification[] = adminProfiles.map(adm => ({
      id: "notif_" + Math.random().toString(36).substring(2, 11),
      user_id: adm.id,
      type: "new_report_admin",
      payload: {
        report_id: newReport.id,
        reporter_name: currentUser.name,
        custom_text: `New report submitted by ${currentUser.name} against profile target.`
      },
      is_read: false,
      created_at: new Date().toISOString()
    }));

    saveNotifications([...newNotifs, ...notifications]);
    showToast("Safety report filed. Our administration team takes safety seriously and will review this within 24 hours.", "success");
    return { success: true };
  };

  const submitBugReport = async (data: { subject: string; description: string; sourcePage?: string; kind?: "bug" | "feature" }) => {
    if (!currentUser) {
      return { success: false, error: "Please sign in before sending this request." };
    }

    const kind = data.kind === "feature" ? "feature" : "bug";
    const kindLabel = kind === "feature" ? "Feature Request" : "Bug Report";
    const kindLabelLower = kind === "feature" ? "feature request" : "bug report";
    const subject = data.subject.trim().slice(0, 120);
    const description = data.description.trim().slice(0, 2000);
    const sourcePage = data.sourcePage?.trim().slice(0, 120) || "XMUM Hangouts";

    if (!description || description.length < 10) {
      return { success: false, error: `Please describe your ${kindLabelLower} in at least 10 characters.` };
    }

    const primaryAdmin = profiles.find(profile => profile.is_admin);

    if (!primaryAdmin) {
      return { success: false, error: "Admin account could not be found. Please try again shortly." };
    }

    const adminChat = getOrCreateChat(primaryAdmin.id, null);
    const chatMessage = [
      `[${kindLabel.toUpperCase()}]`,
      `Reporter: ${currentUser.name} (${currentUser.email})`,
      `Page: ${sourcePage}`,
      `Subject: ${subject || `General ${kindLabelLower}`}`,
      "",
      description
    ].join("\n");

    const newMessage: Message = {
      id: "msg_" + Math.random().toString(36).substring(2, 11),
      chat_id: adminChat.id,
      sender_id: currentUser.id,
      content: chatMessage,
      is_read: false,
      created_at: new Date().toISOString()
    };

    saveMessages([...messages, newMessage]);

    const adminNotifications: AppNotification[] = profiles
      .filter(profile => profile.is_admin)
      .map(admin => ({
        id: "notif_" + Math.random().toString(36).substring(2, 11),
        user_id: admin.id,
        type: "new_report_admin",
        payload: {
          reporter_name: currentUser.name,
          custom_text: `New ${kindLabelLower} from ${currentUser.name}: ${subject || `General ${kindLabelLower}`}`
        },
        is_read: false,
        created_at: new Date().toISOString()
      }));

    saveNotifications([...adminNotifications, ...notifications]);

    let warning: string | undefined;
    try {
      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email
          },
          kind,
          subject,
          description,
          sourcePage,
          submittedAt: new Date().toISOString()
        })
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        warning = payload.error || `The support email route could not be confirmed, but your ${kindLabelLower} reached the in-app admin inbox.`;
      } else if (payload.warning) {
        warning = payload.warning;
      }
    } catch (err) {
      warning = `The support email route could not be confirmed, but your ${kindLabelLower} reached the in-app admin inbox.`;
    }

    showToast(
      warning ? `${kindLabel} saved for the admin team. Email delivery needs attention.` : `${kindLabel} sent to the admin team.`,
      warning ? "info" : "success"
    );

    return { success: true, warning };
  };

  const submitAppeal = (reportId: string, description: string) => {
    if (!currentUser) return { success: false, error: "Not logged in" };
    if (!description.trim()) return { success: false, error: "Appeal description cannot be empty." };

    const currentAppealCount = currentUser.appeal_count;
    if (currentAppealCount >= 5) {
      return { success: false, error: "You have exceeded your maximum allowed 5 safety appeals." };
    }

    const newAppeal: ReportAppeal = {
      id: "appeal_" + Math.random().toString(36).substring(2, 11),
      report_id: reportId,
      appeal_description: description.trim(),
      status: "pending",
      rejection_reason: null,
      appeal_number: currentAppealCount + 1,
      created_at: new Date().toISOString(),
      reviewed_at: null
    };

    // Increment appeal count on user profile
    const updatedUser = { ...currentUser, appeal_count: currentAppealCount + 1 };
    saveProfiles(profiles.map(p => p.id === currentUser.id ? updatedUser : p));
    setCurrentUser(updatedUser);

    saveAppeals([...appeals, newAppeal]);

    // Send notifications to admins
    const adminProfiles = profiles.filter(p => p.is_admin);
    const newNotifs: AppNotification[] = adminProfiles.map(adm => ({
      id: "notif_" + Math.random().toString(36).substring(2, 11),
      user_id: adm.id,
      type: "new_report_admin",
      payload: {
        report_id: reportId,
        custom_text: `Safety ban appeal #${currentAppealCount + 1} filed by ${currentUser.name}`
      },
      is_read: false,
      created_at: new Date().toISOString()
    }));
    saveNotifications([...newNotifs, ...notifications]);

    showToast("Safety appeal filed successfully! Admins will review.", "success");
    return { success: true };
  };

  // Admin Actions
  const adminReviewReport = (reportId: string, action: "approved" | "rejected") => {
    const reportItem = reports.find(r => r.id === reportId);
    if (!reportItem) return;

    const nextReports = reports.map(r => {
      if (r.id === reportId) {
        return { ...r, status: action, reviewed_at: new Date().toISOString() };
      }
      return r;
    });
    saveReports(nextReports);

    if (action === "approved") {
      // Flag the reported user as "potentially_unsafe"
      const reportedProfile = profiles.find(p => p.id === reportItem.reported_user_id);
      if (reportedProfile) {
        const updatedProfile: Profile = {
          ...reportedProfile,
          flag_status: "potentially_unsafe"
        };
        saveProfiles(profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p));

        // Create a safety notification for reported user
        const warnNotif: AppNotification = {
          id: "notif_" + Math.random().toString(36).substring(2, 11),
          user_id: reportedProfile.id,
          type: "report_approved",
          payload: {
            custom_text: "⚠️ Your profile has been flagged as POTENTIALLY UNSAFE following safety reviews. You may appeal this assessment below."
          },
          is_read: false,
          created_at: new Date().toISOString()
        };
        saveNotifications([warnNotif, ...notifications]);
      }
    }

    showToast(`Report successfully marked as ${action}!`, "success");
  };

  const adminReviewAppeal = (appealId: string, action: "approved" | "rejected", reason?: string) => {
    const appealItem = appeals.find(a => a.id === appealId);
    if (!appealItem) return;

    const nextAppeals = appeals.map(a => {
      if (a.id === appealId) {
        return { 
          ...a, 
          status: action, 
          rejection_reason: action === "rejected" ? (reason || "Appeal failed to address basic safety guidelines.") : null,
          reviewed_at: new Date().toISOString() 
        };
      }
      return a;
    });
    saveAppeals(nextAppeals);

    // Find the report to look up the target user
    const originalReport = reports.find(r => r.id === appealItem.report_id);
    if (originalReport) {
      const targetUser = profiles.find(p => p.id === originalReport.reported_user_id);
      if (targetUser) {
        let finalFlagStatus = targetUser.flag_status;

        if (action === "approved") {
          // Reset safety flag to "none" 
          finalFlagStatus = "none";
        } else if (action === "rejected") {
          // If appeal count reaches 5, lock profile to "confirmed_unsafe" permanently!
          if (targetUser.appeal_count >= 5) {
            finalFlagStatus = "confirmed_unsafe";
          }
        }

        const updatedProfile: Profile = {
          ...targetUser,
          flag_status: finalFlagStatus
        };
        saveProfiles(profiles.map(p => p.id === targetUser.id ? updatedProfile : p));

        // Sync local auth user state if they are the one being audited
        if (currentUser && currentUser.id === targetUser.id) {
          setCurrentUser(updatedProfile);
        }

        const appealNotif: AppNotification = {
          id: "notif_" + Math.random().toString(36).substring(2, 11),
          user_id: targetUser.id,
          type: "report_appeal_result",
          payload: {
            custom_text: action === "approved"
              ? "Your safety appeal was APPROVED! Your status has been lowered to none."
              : `Your appeal was declined. Reason: "${reason || 'No details provided'}" (${targetUser.appeal_count}/5 appeals used).`
          },
          is_read: false,
          created_at: new Date().toISOString()
        };
        saveNotifications([appealNotif, ...notifications]);
      }
    }

    showToast(`Appeal review complete: marked as ${action}.`, "success");
  };

  // Eligibility and Restriction checks
  const isEligibleForHangout = (profile: Profile, hangout: Hangout): { eligible: boolean; reasons: string[] } => {
    const r = hangout.restrictions;
    const reasons: string[] = [];

    // Country match
    if (r.countries && r.countries.length > 0 && !r.countries.includes(profile.country)) {
      reasons.push(`Mandatory Countries list: [${r.countries.join(", ")}]; your profile lists "${profile.country}"`);
    }

    // Languages match: check if user shares at least one required language
    if (r.languages && r.languages.length > 0) {
      const sharesLanguage = r.languages.some(lang => profile.languages.includes(lang));
      if (!sharesLanguage) {
        reasons.push(`Mandatory Spoken language(s): [${r.languages.join(", ")}]; your profile does not share these languages`);
      }
    }

    // Program match
    if (r.programs && r.programs.length > 0 && !r.programs.includes(profile.program)) {
      reasons.push(`Mandatory Academic Program(s): [${r.programs.join(", ")}]; your profile lists "${profile.program}"`);
    }

    // Year of Study match
    if (r.years && r.years.length > 0 && !r.years.includes(profile.year_of_study)) {
      reasons.push(`Mandatory Academic Year(s): [${r.years.join(", ")}]; your profile lists "${profile.year_of_study}"`);
    }

    // Student Type match
    if (r.student_types && r.student_types.length > 0 && !r.student_types.includes(profile.student_type)) {
      reasons.push(`Mandatory Student Type: [${r.student_types.join(", ")}]; your profile lists "${profile.student_type}"`);
    }

    // Age bound
    if (r.age_min !== null && profile.age < r.age_min) {
      reasons.push(`Age is below specified minimum of ${r.age_min} years old (you are ${profile.age})`);
    }
    if (r.age_max !== null && profile.age > r.age_max) {
      reasons.push(`Age is above specified maximum of ${r.age_max} years old (you are ${profile.age})`);
    }

    // Gender match
    if (r.genders && r.genders.length > 0 && !r.genders.includes(profile.gender)) {
      reasons.push(`Gender target mismatch: [${r.genders.join(", ")}]; your profile lists "${profile.gender}"`);
    }

    return {
      eligible: reasons.length === 0,
      reasons
    };
  };

  // Helper automated cron checker which simulates daily pg_cron behavior to expire items
  const triggerCronJobs = () => {
    // Expiry: status = 'expired' where event_datetime has passed by more than 1 day
    const nowStamp = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    let expiredAny = false;
    const nextHangouts = hangouts.map(h => {
      const eventTime = new Date(h.event_datetime).getTime();
      if (h.status === "active" && eventTime < (nowStamp - oneDayMs)) {
        expiredAny = true;
        return { ...h, status: "expired" as const };
      }
      return h;
    });

    if (expiredAny) {
      saveHangouts(nextHangouts);
    }

    // Generate upcoming_hangout_reminder: Find hangouts starting within next 2 hours
    const twoHoursMs = 2 * 60 * 60 * 1000;
    let createdReminders = false;

    // Check hangouts scheduled in next 2 hours 
    hangouts.forEach(h => {
      const eventTime = new Date(h.event_datetime).getTime();
      if (h.status === "active" && eventTime > nowStamp && eventTime < (nowStamp + twoHoursMs)) {
        // Find if we already generated a reminder today
        const hasReminder = notifications.some(
          n => n.type === "upcoming_hangout_reminder" && n.payload.hangout_id === h.id
        );

        if (!hasReminder) {
          createdReminders = true;
          // Notify creator
          const notifCreator: AppNotification = {
            id: "notif_cron_c_" + Math.random().toString(36).substring(2, 7),
            user_id: h.creator_id,
            type: "upcoming_hangout_reminder" as const,
            payload: {
              hangout_id: h.id,
              custom_text: `🕒 Upcoming Hangout Reminder! Your hangout "I want to ${h.intention.substring(0, 15)}..." begins in less than 2 hours.`
            },
            is_read: false,
            created_at: new Date().toISOString()
          };

          // Notify accepted applicants
          const acceptedApplicants = applications.filter(a => a.hangout_id === h.id && a.status === "accepted");
          const applicantNotifs: AppNotification[] = acceptedApplicants.map(app => ({
            id: "notif_cron_a_" + Math.random().toString(36).substring(2, 7),
            user_id: app.applicant_id,
            type: "upcoming_hangout_reminder" as const,
            payload: {
              hangout_id: h.id,
              custom_text: `🕒 Hangout starting soon! "${h.intention.substring(0, 20)}..." scheduled in less than 2 hours.`
            },
            is_read: false,
            created_at: new Date().toISOString()
          }));

          saveNotifications([notifCreator, ...applicantNotifs, ...notifications]);
        }
      }
    });

    showToast("Background safety cron verified: successfully scanned for expiries & reminders.", "info");
  };

  const clearNotification = (id: string) => {
    saveNotifications(notifications.filter(n => n.id !== id));
  };

  const markNotificationsAsRead = () => {
    if (!currentUser) return;
    let changed = false;
    const updated = notifications.map(n => {
      if (n.user_id === currentUser.id && !n.is_read) {
        changed = true;
        return { ...n, is_read: true };
      }
      return n;
    });
    if (changed) {
      saveNotifications(updated);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthInitializing,
        profiles,
        hangouts,
        applications,
        likes,
        comments,
        reports,
        appeals,
        chats,
        messages,
        blocks,
        notifications,
        
        signInSimulated,
        signInWithPassword,
        signInWithMicrosoft,
        signOutSimulated,
        completeOnboarding,
        switchUser,
        createMockUser,

        updateProfile,
        syncCompanionProgress,
        setHideDetails,
        deleteCurrentAccount,
        
        createHangout,
        editHangout,
        deleteHangout,
        toggleLike,
        addComment,
        
        applyToHangout,
        retractApplication,
        manageApplication,
        
        getOrCreateChat,
        sendChatMessage,
        markChatAsRead,

        toggleBlockUser,
        submitReport,
        submitBugReport,
        submitAppeal,
        
        adminReviewReport,
        adminReviewAppeal,

        isEligibleForHangout,
        triggerCronJobs,
        clearNotification,
        markNotificationsAsRead,

        onboardingStep,
        setOnboardingStep,
        showOnboarding,
        setShowOnboarding,

        toast,
        showToast,
        clearToast,

        viewedProfile,
        setViewedProfile,

        commentLikes,
        toggleCommentLike
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
