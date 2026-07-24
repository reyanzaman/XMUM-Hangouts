/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { supabase } from "./lib/supabase";
import { AppNotification, Hangout, Profile } from "./types";
import { motion, AnimatePresence } from "motion/react";
import {
  combineDateAndTimeToIso,
  composeHangoutIntent,
  formatDateInputValue,
  formatTimeInputValue,
  getMaximumHangoutDate,
  getRoundedMinimumTime,
  MIN_HANGOUT_DESCRIPTION_LENGTH,
  splitHangoutIntentParts,
  validateFutureHangoutDate
} from "./lib/hangouts";
import { matchesPrimaryAdminEmail } from "./lib/admin";
import { buildAnonymousAliasProfile, isDemoProfile, normalizeProfileEmail, pickCanonicalProfile } from "./lib/profiles";
import { NotificationBell } from "./components/NotificationBell";
import { HangoutCard } from "./components/HangoutCard";
import { ChatWindow } from "./components/ChatWindow";
import { ProfileSetupForm } from "./components/ProfileSetupForm";
import { ProfileCard } from "./components/ProfileCard";
import { StaticPages } from "./components/StaticPages";
import { RestrictionBuilder } from "./components/RestrictionBuilder";
import { AvatarSVG } from "./components/AvatarSVG";
import { ApplicantList } from "./components/ApplicantList";
import { StudentProfilePage } from "./components/StudentProfilePage";
import { Logo } from "./components/Logo";
import { CampusCompanion } from "./components/CampusCompanion";
import { GetAppPage } from "./components/GetAppPage";
import { CountryFlag } from "./components/CountryFlag";
import { ChatWindowSkeleton, FeedSkeleton, PortalSkeleton } from "./components/LoadingSkeletons";
import { usePwa } from "./hooks/usePwa";
import {
  Sparkles,
  Search,
  SlidersHorizontal,
  PlusCircle,
  Clock,
  Heart,
  MessageSquare,
  Bug,
  BadgeAlert,
  ShieldAlert,
  Award,
  Eye,
  LogOut,
  ChevronRight,
  MapPin,
  Calendar,
  Lock,
  ChevronDown,
  ChevronUp,
  Users,
  Terminal,
  HelpCircle,
  X,
  Flag,
  User,
  Compass,
  PencilLine,
  Trash2,
  Download,
  BellRing
} from "lucide-react";

const SYSTEM_DELETED_USER_ID = "deleted_user";
const RECENT_HANGOUT_WINDOW_MONTHS = 2;
const MAX_HANGOUT_DESCRIPTION_LENGTH = 500;

const FieldInfo: React.FC<{ text: string; label: string }> = ({ text, label }) => (
  <span className="group static inline-flex align-middle">
    <button
      type="button"
      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-rose-500 focus:text-rose-500 focus:outline-none"
      aria-label={label}
    >
      <HelpCircle className="h-3.5 w-3.5" />
    </button>
    <span className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-full max-w-sm rounded-xl bg-slate-900 px-3 py-2 text-left text-[10px] font-medium leading-relaxed text-white shadow-xl group-hover:block group-focus-within:block">
      {text}
    </span>
  </span>
);

const onboardingSlides = [
  {
    title: "Find your campus circle",
    text: "Browse, search and filter student hangouts, or post your own plan with clear eligibility and timing.",
    icon: Compass,
    tone: "from-rose-500 to-pink-400",
    points: ["Discover plans that match you", "Create and manage hangouts", "See active and past activity"]
  },
  {
    title: "Join and coordinate safely",
    text: "Apply normally or anonymously. Hosts approve requests before private meeting details and participant chats unlock.",
    icon: Users,
    tone: "from-teal-500 to-cyan-400",
    points: ["Controlled join approvals", "Protected meeting locations", "Built-in participant chat"]
  },
  {
    title: "Never miss the plan",
    text: "Use the website or install the PWA, enable notifications, and let your companion grow as you take part.",
    icon: BellRing,
    tone: "from-amber-500 to-orange-400",
    points: ["Requests, replies and reminders", "Install without an app store", "Companion states and progress"]
  },
  {
    title: "You stay in control",
    text: "Tune profile privacy, companion messages and notifications. Block or report anything that feels unsafe.",
    icon: ShieldAlert,
    tone: "from-violet-500 to-indigo-400",
    points: ["PII privacy shield", "Reporting and blocking tools", "Settings available in your profile"]
  }
] as const;
const LOCKED_MEETING_POINT_MARKERS = [
  "apply and get accepted to unlock",
  "visible after the host approves your request"
];

const isLockedMeetingPointPlaceholder = (value: string | null | undefined) =>
  LOCKED_MEETING_POINT_MARKERS.some(marker => (value || "").trim().toLowerCase().includes(marker));

const getHangoutPostedTime = (hangout: Hangout) => {
  const createdAt = new Date(hangout.created_at).getTime();
  if (!Number.isNaN(createdAt)) return createdAt;

  const updatedAt = new Date(hangout.updated_at).getTime();
  return Number.isNaN(updatedAt) ? 0 : updatedAt;
};

const getHangoutEventTime = (hangout: Hangout) => {
  const eventTime = new Date(hangout.event_datetime).getTime();
  return Number.isNaN(eventTime) ? null : eventTime;
};

const deriveHangoutCategory = (hangout: Hangout) => {
  const text = `${hangout.intention} ${hangout.additional_info} ${hangout.location}`.toLowerCase();

  const categoryMatchers: Array<{ label: string; keywords: string[] }> = [
    { label: "Study", keywords: ["study", "assignment", "revision", "exam", "library", "tutorial", "coursework", "class"] },
    { label: "Food", keywords: ["eat", "food", "dinner", "lunch", "breakfast", "cafe", "coffee", "tea", "supper", "meal"] },
    { label: "Sports", keywords: ["badminton", "basketball", "football", "futsal", "gym", "workout", "run", "jog", "sports", "tennis"] },
    { label: "Gaming", keywords: ["game", "gaming", "valorant", "dota", "ml", "mobile legends", "board game", "switch"] },
    { label: "Entertainment", keywords: ["movie", "cinema", "karaoke", "concert", "music", "show", "watch", "anime"] },
    { label: "Outdoors", keywords: ["walk", "hike", "park", "beach", "picnic", "outdoor", "sunset", "nature"] },
    { label: "Social", keywords: ["hangout", "chat", "meet", "friends", "social", "chill", "lepak", "network"] },
    { label: "Creative", keywords: ["art", "drawing", "design", "photo", "photography", "writing", "music jam", "dance"] }
  ];

  const matched = categoryMatchers.find(category =>
    category.keywords.some(keyword => text.includes(keyword))
  );

  return matched?.label || "General";
};

const getEffectiveHangoutStatus = (hangout: Hangout, nowStamp = Date.now()) => {
  if (hangout.status === "cancelled") return "cancelled";
  const eventTime = getHangoutEventTime(hangout);
  if (hangout.status === "expired") return "expired";
  if (eventTime !== null && eventTime <= nowStamp) return "expired";
  return "active";
};

const getHangoutRecencyTime = (hangout: Hangout) => {
  const eventTime = getHangoutEventTime(hangout);
  const postedTime = getHangoutPostedTime(hangout);
  return eventTime === null ? postedTime : Math.max(eventTime, postedTime);
};

const getRecentHangoutCutoffTime = () => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RECENT_HANGOUT_WINDOW_MONTHS);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff.getTime();
};

const isOlderThanRecentHangoutWindow = (hangout: Hangout) =>
  getHangoutRecencyTime(hangout) < getRecentHangoutCutoffTime();

const sortHangoutsForFeed = (items: Hangout[], sortMode: "posted" | "event") =>
  [...items].sort((a, b) => {
    const statusRank = (hangout: Hangout) => {
      const effectiveStatus = getEffectiveHangoutStatus(hangout);
      return effectiveStatus === "active" ? 0 : effectiveStatus === "expired" ? 1 : 2;
    };
    const rankDifference = statusRank(a) - statusRank(b);
    if (rankDifference !== 0) return rankDifference;

    if (sortMode === "event") {
      const aEventTime = getHangoutEventTime(a);
      const bEventTime = getHangoutEventTime(b);

      if (getEffectiveHangoutStatus(a) === "active" && getEffectiveHangoutStatus(b) === "active") {
        if (aEventTime !== null && bEventTime !== null && aEventTime !== bEventTime) {
          return aEventTime - bEventTime;
        }
      } else {
        if (aEventTime !== null && bEventTime !== null && aEventTime !== bEventTime) {
          return bEventTime - aEventTime;
        }
      }

      const postedFallback = getHangoutPostedTime(b) - getHangoutPostedTime(a);
      if (postedFallback !== 0) return postedFallback;
    } else {
      const postedDifference = getHangoutPostedTime(b) - getHangoutPostedTime(a);
      if (postedDifference !== 0) return postedDifference;
    }

    const recencyDifference = getHangoutRecencyTime(b) - getHangoutRecencyTime(a);
    if (recencyDifference !== 0) return recencyDifference;

    return getHangoutPostedTime(b) - getHangoutPostedTime(a);
  });

const ADMIN_TOOL_TEST_PROFILES: Profile[] = [
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
    about_me: "The official seeded admin profile for internal testing.",
    avatar_id: "owl",
    is_profile_complete: true,
    hide_details: false,
    is_admin: true,
    is_blocked_globally: false,
    flag_status: "none",
    appeal_count: 0,
    companion_pet_count: 0,
    companion_selected_state_id: null,
    is_demo_profile: true
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
    about_me: "Seeded test profile for admin-side simulation.",
    avatar_id: "cat",
    is_profile_complete: true,
    hide_details: false,
    is_admin: false,
    is_blocked_globally: false,
    flag_status: "none",
    appeal_count: 0,
    companion_pet_count: 0,
    companion_selected_state_id: null,
    is_demo_profile: true
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
    about_me: "Seeded test profile for admin-side simulation.",
    avatar_id: "koala",
    is_profile_complete: true,
    hide_details: false,
    is_admin: false,
    is_blocked_globally: false,
    flag_status: "none",
    appeal_count: 0,
    companion_pet_count: 0,
    companion_selected_state_id: null,
    is_demo_profile: true
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
    about_me: "Seeded test profile for admin-side simulation.",
    avatar_id: "panda",
    is_profile_complete: true,
    hide_details: false,
    is_admin: false,
    is_blocked_globally: false,
    flag_status: "none",
    appeal_count: 0,
    companion_pet_count: 0,
    companion_selected_state_id: null,
    is_demo_profile: true
  }
];

const AppContent: React.FC = () => {
  const {
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
    notifications,
    signInSimulated,
    signInWithPassword,
    signInWithMicrosoft,
    signOutSimulated,
    switchUser,
    createHangout,
    editHangout,
    deleteHangout,
    submitReport,
    submitAppeal,
    adminReviewReport,
    adminReviewAppeal,
    isEligibleForHangout,
    showOnboarding,
    onboardingStep,
    setOnboardingStep,
    toast,
    clearToast,
    showToast,
    blocks,
    retractApplication,
    completeOnboarding,
    toggleBlockUser,
    viewedProfile,
    setViewedProfile
  } = useApp();
  const pwa = usePwa(currentUser?.id);

  const hasPendingAuthRedirect = typeof window !== "undefined" && (() => {
    try {
      return sessionStorage.getItem("xmum_auth_redirect_pending") === "true";
    } catch {
      return false;
    }
  })();

  const isReturningFromOAuth = typeof window !== "undefined" && (
    window.location.search.includes("code=") ||
    window.location.hash.includes("access_token=") ||
    window.location.hash.includes("refresh_token=")
  );
  const hasBootstrapData =
    Boolean(currentUser) ||
    profiles.length > 0 ||
    hangouts.length > 0 ||
    applications.length > 0 ||
    chats.length > 0 ||
    messages.length > 0;
  const showAppSkeletons =
    isAuthInitializing &&
    !isReturningFromOAuth &&
    !hasPendingAuthRedirect &&
    !hasBootstrapData;

  // Navigation states
  const [activeTab, setActiveTab] = useState<"feed" | "create" | "profile" | "my-plans" | "chats" | "admin" | "terms" | "privacy" | "safety" | "about" | "donation" | "bug-report" | "get-app">("feed");
  const [portalSubTab, setPortalSubTab] = useState<"hosted" | "requested">("hosted");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMobileInstallPrompt, setShowMobileInstallPrompt] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    if (isAuthInitializing || !currentUser?.id || !pwa.mobile || pwa.isInstalled) return;
    const promptKey = `xmum_app_install_prompt_seen_${currentUser.id}`;
    try {
      if (localStorage.getItem(promptKey) === "true") return;
      localStorage.setItem(promptKey, "true");
    } catch {
      // If storage is restricted, still show the helpful prompt for this session.
    }
    const timer = window.setTimeout(() => setShowMobileInstallPrompt(true), 650);
    return () => window.clearTimeout(timer);
  }, [currentUser?.id, isAuthInitializing, pwa.isInstalled, pwa.mobile]);

  useEffect(() => {
    if (
      isAuthInitializing ||
      !currentUser?.id ||
      pwa.pushState !== "prompt" ||
      (pwa.mobile && !pwa.isInstalled)
    ) return;

    const promptKey = `xmum_push_prompt_seen_${currentUser.id}`;
    try {
      if (localStorage.getItem(promptKey) === "true") return;
      localStorage.setItem(promptKey, "true");
    } catch {
      // The browser permission prompt itself still prevents repeated requests.
    }
    const timer = window.setTimeout(() => setShowNotificationPrompt(true), 900);
    return () => window.clearTimeout(timer);
  }, [currentUser?.id, isAuthInitializing, pwa.isInstalled, pwa.mobile, pwa.pushState]);

  // Filter and search feed states
  const [searchLocation, setSearchLocation] = useState("");
  const [eligibleOnlyFilter, setEligibleOnlyFilter] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [showAllHangoutHistory, setShowAllHangoutHistory] = useState(false);
  const [datePeriodFilter, setDatePeriodFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [feedSortMode, setFeedSortMode] = useState<"posted" | "event">("posted");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [notificationTarget, setNotificationTarget] = useState<{ hangoutId?: string; commentId?: string } | null>(null);
  const dismissedAutoShowExpiredKeysRef = useRef<Set<string>>(new Set());
  const canViewTestUserCards = Boolean(currentUser?.is_admin);
  const isTestCreatorHangout = (creatorId: string) => {
    if (creatorId === SYSTEM_DELETED_USER_ID) return false;
    const creatorProfile = profiles.find(profile => profile.id === creatorId);
    if (creatorProfile) {
      if (creatorProfile.id === SYSTEM_DELETED_USER_ID) return false;
      return isDemoProfile(creatorProfile);
    }

    const normalizedCreatorId = creatorId.trim().toLowerCase();
    return /^(test|demo|mock|sample|dummy)([._-]|$)/i.test(normalizedCreatorId);
  };

  // Reset pagination to page 1 whenever search, activeTab, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchLocation, eligibleOnlyFilter, showExpired, showAllHangoutHistory, datePeriodFilter, genderFilter, feedSortMode, activeTab]);

  const feedCommentResetKey = [
    searchLocation.trim().toLowerCase(),
    eligibleOnlyFilter ? "1" : "0",
    showExpired ? "1" : "0",
    showAllHangoutHistory ? "1" : "0",
    datePeriodFilter,
    genderFilter,
    feedSortMode
  ].join("|");

  const browseFeedAutoExpiredKey = [
    activeTab,
    currentUser?.id || "guest",
    searchLocation.trim().toLowerCase(),
    eligibleOnlyFilter ? "1" : "0",
    showAllHangoutHistory ? "1" : "0",
    datePeriodFilter,
    genderFilter,
    feedSortMode
  ].join("|");

  const buildBrowseFeed = (includeExpiredCards: boolean) => {
    let feed = hangouts.filter(h => {
      const effectiveStatus = getEffectiveHangoutStatus(h);
      return includeExpiredCards
        ? effectiveStatus === "active" || effectiveStatus === "expired"
        : effectiveStatus === "active";
    });

    if (searchLocation.trim()) {
      const query = searchLocation.toLowerCase().trim();
      feed = feed.filter(h => {
        const matchLocation = h.location.toLowerCase().includes(query);
        const matchIntention = h.intention.toLowerCase().includes(query);
        const matchCategory = deriveHangoutCategory(h).toLowerCase().includes(query);
        const hostUser = profiles.find(p => p.id === h.creator_id);
        const matchHostName = hostUser ? hostUser.name.toLowerCase().includes(query) : false;
        return matchLocation || matchIntention || matchCategory || matchHostName;
      });
    }

    if (datePeriodFilter !== "all") {
      const nowTime = Date.now();
      if (datePeriodFilter === "today") {
        const todayStr = new Date().toDateString();
        feed = feed.filter(h => new Date(h.event_datetime).toDateString() === todayStr);
      } else if (datePeriodFilter === "week") {
        const oneWeekAhead = nowTime + 7 * 24 * 60 * 60 * 1000;
        feed = feed.filter(h => {
          const eventTime = new Date(h.event_datetime).getTime();
          return eventTime >= nowTime && eventTime <= oneWeekAhead;
        });
      } else if (datePeriodFilter === "month") {
        const oneMonthAhead = nowTime + 30 * 24 * 60 * 60 * 1000;
        feed = feed.filter(h => {
          const eventTime = new Date(h.event_datetime).getTime();
          return eventTime >= nowTime && eventTime <= oneMonthAhead;
        });
      }
    }

    if (eligibleOnlyFilter && currentUser) {
      feed = feed.filter(h => isEligibleForHangout(currentUser, h).eligible);
    }

    if (genderFilter === "male") {
      feed = feed.filter(h => {
        const hostUser = profiles.find(p => p.id === h.creator_id);
        const hostGender = (hostUser?.gender || "prefer not to say").toLowerCase();
        return hostGender.includes("male") && !hostGender.includes("female");
      });
    } else if (genderFilter === "female") {
      feed = feed.filter(h => {
        const hostUser = profiles.find(p => p.id === h.creator_id);
        const hostGender = (hostUser?.gender || "prefer not to say").toLowerCase();
        return hostGender.includes("female");
      });
    }

    feed = feed.filter(h => {
      if (h.creator_id === SYSTEM_DELETED_USER_ID) {
        return true;
      }
      return canViewTestUserCards || !isTestCreatorHangout(h.creator_id);
    });

    const hasOlderFilteredHangouts = feed.some(isOlderThanRecentHangoutWindow);
    if (!showAllHangoutHistory) {
      feed = feed.filter(h => !isOlderThanRecentHangoutWindow(h));
    }

    return {
      feed: sortHangoutsForFeed(feed, feedSortMode),
      hasOlderFilteredHangouts
    };
  };

  useEffect(() => {
    if (activeTab !== "feed" || showExpired) return;
    if (dismissedAutoShowExpiredKeysRef.current.has(browseFeedAutoExpiredKey)) return;
    const { feed } = buildBrowseFeed(false);
    if (feed.length < 2) {
      setShowExpired(true);
    }
  }, [
    activeTab,
    showExpired,
    hangouts,
    profiles,
    currentUser,
    searchLocation,
    eligibleOnlyFilter,
    showAllHangoutHistory,
    datePeriodFilter,
    genderFilter,
    feedSortMode,
    browseFeedAutoExpiredKey
  ]);

  const handleToggleShowExpired = () => {
    if (showExpired) {
      dismissedAutoShowExpiredKeysRef.current.add(browseFeedAutoExpiredKey);
      setShowExpired(false);
      return;
    }

    dismissedAutoShowExpiredKeysRef.current.delete(browseFeedAutoExpiredKey);
    setShowExpired(true);
  };

  // Create hangout input state
  const [createIntentionLead, setCreateIntentionLead] = useState("I want to");
  const [createIntentionDetail, setCreateIntentionDetail] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createDate, setCreateDate] = useState("");
  const [createTime, setCreateTime] = useState("");
  const [createMeetingPoint, setCreateMeetingPoint] = useState("");
  const [createAdditional, setCreateAdditional] = useState("");
  const [createMaxParticipants, setCreateMaxParticipants] = useState<number | "">("");
  const [createIsAnonymous, setCreateIsAnonymous] = useState(false);
  const [showAdvancedCreate, setShowAdvancedCreate] = useState(false);
  const [createRestrictions, setCreateRestrictions] = useState({
    countries: [] as string[],
    languages: [] as string[],
    programs: [] as string[],
    years: [] as string[],
    student_types: [] as string[],
    age_min: null as number | null,
    age_max: null as number | null,
    genders: [] as string[]
  });
  const [showHostedPastPlans, setShowHostedPastPlans] = useState(false);
  const [showRequestedPastPlans, setShowRequestedPastPlans] = useState(false);
  const [editingHangoutId, setEditingHangoutId] = useState<string | null>(null);
  const [editLocation, setEditLocation] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editMeetingPoint, setEditMeetingPoint] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMaxParticipants, setEditMaxParticipants] = useState<number | "">("");
  const [editIsAnonymous, setEditIsAnonymous] = useState(false);
  const [editRestrictions, setEditRestrictions] = useState({
    countries: [] as string[],
    languages: [] as string[],
    programs: [] as string[],
    years: [] as string[],
    student_types: [] as string[],
    age_min: null as number | null,
    age_max: null as number | null,
    genders: [] as string[]
  });

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");

  // Report creator popup state
  const [reportingHangoutId, setReportingHangoutId] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");

  // Appeal popups
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealText, setAppealText] = useState("");

  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [loginMode, setLoginMode] = useState<"otp" | "password">("otp");
  const [loginPassword, setLoginPassword] = useState("");
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [microsoftOnlyAuthEmail, setMicrosoftOnlyAuthEmail] = useState<string | null>(null);
  const [showPasswordResetHelp, setShowPasswordResetHelp] = useState(false);
  const [showNavLogoutConfirm, setShowNavLogoutConfirm] = useState(false);
  const [adminAnalyticsRange, setAdminAnalyticsRange] = useState<"daily" | "weekly" | "monthly" | "yearly" | "lifetime">("monthly");

  const minimumCreateDateTime = getRoundedMinimumTime();
  const minimumCreateDate = formatDateInputValue(minimumCreateDateTime);
  const minimumCreateTime = createDate === minimumCreateDate ? formatTimeInputValue(minimumCreateDateTime) : undefined;
  const maximumHangoutDate = formatDateInputValue(getMaximumHangoutDate());
  const combinedCreateDateTime = createDate && createTime ? combineDateAndTimeToIso(createDate, createTime) : null;
  const createDateTimeError = combinedCreateDateTime ? validateFutureHangoutDate(combinedCreateDateTime) : null;
  const editingHangout = editingHangoutId ? hangouts.find(h => h.id === editingHangoutId) || null : null;
  const minimumEditDateTime = new Date(Date.now() + 60 * 60 * 1000);
  const minimumEditDate = formatDateInputValue(minimumEditDateTime);
  const minimumEditTime = editDate === minimumEditDate ? formatTimeInputValue(minimumEditDateTime) : undefined;
  const normalizedLoginEmail = loginEmail.trim().toLowerCase();
  const isMicrosoftOnlyAuth = Boolean(
    normalizedLoginEmail &&
    microsoftOnlyAuthEmail &&
    microsoftOnlyAuthEmail === normalizedLoginEmail
  );
  useEffect(() => {
    if (isMicrosoftOnlyAuth && !magicLinkSent) {
      setLoginMode("password");
    }
  }, [isMicrosoftOnlyAuth, magicLinkSent]);

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpCode).trim();
    if (!code) {
      showToast("Please enter the verification code first.", "error");
      return;
    }
    if (code.length < 6) {
      showToast("Verification code must be 6 digits.", "error");
      return;
    }
    
    setIsVerifyingOtp(true);
    try {
      showToast("Verifying your security code...", "info");
      
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          otp: code
        })
      });

      const resText = await res.text();
      let resData: any;
      try {
        resData = JSON.parse(resText);
      } catch (parseErr) {
        console.error("Non-JSON API response from /api/auth/verify-otp:", resText);
        throw new Error(`Server answered with unexpected response (Status ${res.status}). Let's request a new code and try again.`);
      }
      if (!res.ok) {
        throw new Error(resData.error || "Incorrect OTP code.");
      }

      const { access_token, refresh_token } = resData.session;
      showToast("Verification successful! Establishing session...", "info");

      if (resData.is_fallback) {
        localStorage.setItem("xmum_local_auth_token", resData.local_auth_token || "");
        localStorage.setItem("xmum_current_user_id", resData.profile.id);
        await switchUser(resData.profile.id, resData.profile);
        showToast("Success! Authenticated via validated fallback session.", "success");
      } else {
        if (resData.local_auth_token) {
          localStorage.setItem("xmum_local_auth_token", resData.local_auth_token);
        }
        let isSessionSet = false;
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });
          if (!sessionError) {
            isSessionSet = true;
          } else {
            console.warn("Supabase auth.setSession failed:", sessionError.message);
          }
        } catch (setErr) {
          console.warn("Supabase auth.setSession threw exception:", setErr);
        }

        let profile: Profile | null = null;
        const email = normalizeProfileEmail(resData.session?.user?.email || loginEmail);

        if (resData.profile) {
          profile = pickCanonicalProfile([resData.profile as Profile], {
            email,
            authUserId: resData.session?.user?.id
          });
        }

        if (!profile) {
          try {
            const { data, error } = await supabase.from("xmum_profiles").select("*").eq("email", email);
            if (error) {
              console.warn("Supabase profile fetch on verification returned an error:", error.message);
            }
            profile = pickCanonicalProfile((data || []) as Profile[], {
              email,
              authUserId: resData.session?.user?.id
            });
          } catch (dbErr) {
            console.warn("Supabase profile fetch on verification failed (offline/paused database):", dbErr);
          }
        }

        if (!profile) {
          profile = pickCanonicalProfile(profiles, {
            email,
            authUserId: resData.session?.user?.id
          });
        }

        if (!profile) {
          const student_id = email.split("@")[0];
          const isPrimaryAdmin = await matchesPrimaryAdminEmail(email.toLowerCase());
          profile = {
            id: resData.session?.user?.id || ("user_" + Math.random().toString(36).substring(2, 11)),
            email: email.toLowerCase(),
            student_id,
            name: email.split("@")[0],
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
            avatar_id: "",
            is_profile_complete: false,
            hide_details: false,
            is_admin: isPrimaryAdmin,
            is_blocked_globally: false,
            flag_status: "none",
            appeal_count: 0
          };
          try {
            await supabase.from("xmum_profiles").insert([profile]);
          } catch (insErr) {
            console.warn("Supabase profile insert failed/deferred:", insErr);
          }
        }
        localStorage.setItem("xmum_current_user_id", profile.id);
        await switchUser(profile.id, profile);

        showToast("Success! Authenticated and signed in.", "success");
      }

      setShowLoginModal(false);
      setMagicLinkSent(false);
      setOtpCode("");
      setMicrosoftOnlyAuthEmail(null);
    } catch (err: any) {
      showToast(`Verification Failed: ${err.message || err}`, "error");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setIsMicrosoftLoading(true);
    const result = await signInWithMicrosoft(loginEmail);
    if (!result.success) {
      showToast(result.error || "Microsoft sign-in could not be started.", "error");
      setIsMicrosoftLoading(false);
      return;
    }

    setIsMicrosoftLoading(false);
  };

  // Redirect to unauthenticated homepage / feed if user logs out or is null
  useEffect(() => {
    if (!currentUser) {
      setActiveTab("feed");
    }
  }, [currentUser]);

  // --- ACTIONS ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmail.trim();
    if (!email) return;

    setIsLoginLoading(true);

    if (loginMode === "password") {
      const res = await signInWithPassword(email, loginPassword);
      setIsLoginLoading(false);
      if (res.success) {
        setShowLoginModal(false);
        setLoginPassword("");
        setMicrosoftOnlyAuthEmail(null);
      } else {
        showToast(res.error || "Password login failed. Check credentials.", "error");
      }
      return;
    }

    // OTP mode
    const res = await signInSimulated(email);
    setIsLoginLoading(false);

    if (res.success) {
      setMagicLinkSent(true);
      setMicrosoftOnlyAuthEmail(null);
      showToast(res.message || "Security verification code sent! Check your student inbox.", "success");
    } else {
      if (res.requires_microsoft || res.otp_limit_reached || res.resend_expired) {
        setMicrosoftOnlyAuthEmail(email.trim().toLowerCase());
        setMagicLinkSent(false);
        setOtpCode("");
        setLoginMode("password");
        showToast(res.error || "OTP sign-in is unavailable right now.", "error");
      } else {
        showToast(res.error || "Authentication failed. Try again.", "error");
      }
    }
  };

  const handleCreateHangoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCreateIntention = composeHangoutIntent(createIntentionLead, createIntentionDetail);
    if (!createIntentionLead.trim() || !createIntentionDetail.trim()) {
      return showToast("Please complete both parts of your hangout title.", "error");
    }
    if (!createLocation.trim()) return showToast("Where are you planning to do it?", "error");
    if (!createDate) return showToast("Please choose the date for your hangout.", "error");
    if (!createTime) return showToast("Please choose the time for your hangout.", "error");
    if (!createMeetingPoint.trim()) return showToast("Please declare a safe meeting point.", "error");
    if (!createAdditional.trim()) return showToast("Please add a short description so people know what to expect.", "error");
    if (createAdditional.trim().length < MIN_HANGOUT_DESCRIPTION_LENGTH) {
      return showToast(`Please make the description at least ${MIN_HANGOUT_DESCRIPTION_LENGTH} characters long.`, "error");
    }
    if (createAdditional.trim().length > MAX_HANGOUT_DESCRIPTION_LENGTH) {
      return showToast(`Please keep the description under ${MAX_HANGOUT_DESCRIPTION_LENGTH} characters.`, "error");
    }

    const eventDateTime = combineDateAndTimeToIso(createDate, createTime);
    if (!eventDateTime) return showToast("Please choose a valid date and time.", "error");

    const dateTimeError = validateFutureHangoutDate(eventDateTime);
    if (dateTimeError) return showToast(dateTimeError, "error");

    const { success, error } = createHangout({
      intention: normalizedCreateIntention,
      location: createLocation.trim(),
      event_datetime: eventDateTime,
      meeting_point: createMeetingPoint.trim(),
      additional_info: createAdditional.trim(),
      max_participants: createMaxParticipants === "" ? null : createMaxParticipants,
      restrictions: createRestrictions,
      is_anonymous: createIsAnonymous
    });

    if (success) {
      // Reset
      setCreateIntentionLead("I want to");
      setCreateIntentionDetail("");
      setCreateLocation("");
      setCreateDate("");
      setCreateTime("");
      setCreateMeetingPoint("");
      setCreateAdditional("");
      setCreateMaxParticipants("");
      setCreateIsAnonymous(false);
      setShowAdvancedCreate(false);
      setCreateRestrictions({
        countries: [],
        languages: [],
        programs: [],
        years: [],
        student_types: [],
        age_min: null,
        age_max: null,
        genders: []
      });
      setActiveTab("feed");
    } else if (error) {
      showToast(error, "error");
    }
  };

  const openEditHangout = (hangoutId: string) => {
    const target = hangouts.find(h => h.id === hangoutId);
    if (!target) return;

    const eventDate = new Date(target.event_datetime);
    setEditingHangoutId(target.id);
    setEditLocation(target.location);
    setEditDate(formatDateInputValue(eventDate));
    setEditTime(formatTimeInputValue(eventDate));
    setEditMeetingPoint(isLockedMeetingPointPlaceholder(target.meeting_point) ? "" : target.meeting_point);
    setEditDescription(target.additional_info);
    setEditMaxParticipants(target.max_participants ?? "");
    setEditIsAnonymous(Boolean(target.is_anonymous));
    setEditRestrictions({
      countries: [...target.restrictions.countries],
      languages: [...target.restrictions.languages],
      programs: [...target.restrictions.programs],
      years: [...target.restrictions.years],
      student_types: [...target.restrictions.student_types],
      age_min: target.restrictions.age_min,
      age_max: target.restrictions.age_max,
      genders: [...target.restrictions.genders]
    });
  };

  const closeEditHangout = () => {
    setEditingHangoutId(null);
    setEditLocation("");
    setEditDate("");
    setEditTime("");
    setEditMeetingPoint("");
    setEditDescription("");
    setEditMaxParticipants("");
    setEditIsAnonymous(false);
    setEditRestrictions({
      countries: [],
      languages: [],
      programs: [],
      years: [],
      student_types: [],
      age_min: null,
      age_max: null,
      genders: []
    });
  };

  const handleEditHangoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHangout) return;
    if (!editLocation.trim()) return showToast("Please add the updated location.", "error");
    if (!editDate || !editTime) return showToast("Please choose the updated date and time.", "error");
    if (!editMeetingPoint.trim()) return showToast("Please add the updated meeting point.", "error");
    if (!editDescription.trim()) return showToast("Please add a short description so people know what to expect.", "error");
    if (editDescription.trim().length < MIN_HANGOUT_DESCRIPTION_LENGTH) {
      return showToast(`Please make the description at least ${MIN_HANGOUT_DESCRIPTION_LENGTH} characters long.`, "error");
    }
    if (editDescription.trim().length > MAX_HANGOUT_DESCRIPTION_LENGTH) {
      return showToast(`Please keep the description under ${MAX_HANGOUT_DESCRIPTION_LENGTH} characters.`, "error");
    }

    const eventDateTime = combineDateAndTimeToIso(editDate, editTime);
    if (!eventDateTime) return showToast("Please choose a valid date and time.", "error");

    const result = editHangout(editingHangout.id, {
      location: editLocation.trim(),
      event_datetime: eventDateTime,
      meeting_point: editMeetingPoint.trim(),
      additional_info: editDescription.trim(),
      max_participants: editMaxParticipants === "" ? null : editMaxParticipants,
      restrictions: editRestrictions,
      is_anonymous: editIsAnonymous
    });

    if (!result.success) {
      showToast(result.error || "We couldn't save those changes.", "error");
      return;
    }

    closeEditHangout();
  };

  const handleDeleteHangout = (hangoutId: string) => {
    const confirmed = window.confirm("Cancel this hangout? Students who applied will be notified.");
    if (!confirmed) return;

    const result = deleteHangout(hangoutId);
    if (!result.success) {
      showToast(result.error || "We couldn't cancel this hangout.", "error");
    }
  };

  const handleReportCreatorSubmit = () => {
    if (!reportText.trim()) return showToast("Please write a small safety report description.", "error");
    const targetHangout = hangouts.find(h => h.id === reportingHangoutId);
    if (targetHangout) {
      submitReport(targetHangout.creator_id, reportText);
      setReportingHangoutId(null);
      setReportText("");
    }
  };

  const handleAppealSubmit = () => {
    if (!appealText.trim()) return showToast("Please write your safety appeal.", "error");
    // Find the latest active safety report against this user
    const pendingReport = reports.find(r => r.reported_user_id === currentUser?.id && r.status === "approved");
    if (pendingReport) {
      submitAppeal(pendingReport.id, appealText);
      setShowAppealModal(false);
      setAppealText("");
    } else {
      showToast("Cannot appeal: no active safety restrictions found against your user.", "error");
    }
  };

  // Resolve calculations
  const myApplications = currentUser 
    ? applications.filter(a => {
        if (a.applicant_id !== currentUser.id) return false;
        const relatedHangout = hangouts.find(h => h.id === a.hangout_id);
        return relatedHangout?.creator_id !== currentUser.id;
      }) 
    : [];

  const myCreatedHangouts = currentUser 
    ? hangouts.filter(h => h.creator_id === currentUser.id) 
    : [];
  const activeCreatedHangouts = myCreatedHangouts.filter(h => getEffectiveHangoutStatus(h) === "active");
  const visibleHostedHangouts = myCreatedHangouts.filter(h =>
    showHostedPastPlans ? true : getEffectiveHangoutStatus(h) === "active"
  );
  const activeApplications = myApplications.filter(application => {
    if (application.status === "retracted") return false;
    const relatedHangout = hangouts.find(hangout => hangout.id === application.hangout_id);
    return relatedHangout ? getEffectiveHangoutStatus(relatedHangout) === "active" : false;
  });
  const visibleApplications = showRequestedPastPlans ? myApplications : activeApplications;

  // Active unread messages indicator count
  const myUnreadMsgsCount = currentUser ? messages.filter(m => {
    const chat = chats.find(c => c.id === m.chat_id);
    if (!chat) return false;
    const isChatMember = chat.user_a_id === currentUser.id || chat.user_b_id === currentUser.id;
    return isChatMember && m.sender_id !== currentUser.id && !m.is_read;
  }).length : 0;
  const hasUnreadInbox = myUnreadMsgsCount > 0;

  const scrollToElement = (elementId: string) => {
    window.setTimeout(() => {
      const target = document.getElementById(elementId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 160);
  };

  const navigateToFeedTarget = (target: { hangoutId?: string; commentId?: string }) => {
    setSearchLocation("");
    setEligibleOnlyFilter(false);
    setDatePeriodFilter("all");
    setGenderFilter("all");
    setFeedSortMode("posted");
    setShowExpired(true);
    setShowAllHangoutHistory(true);
    setNotificationTarget(target);
    setActiveTab("feed");

    const elementId = target.commentId
      ? `comment-${target.commentId}`
      : target.hangoutId
      ? `hangout-card-${target.hangoutId}`
      : "";

    if (elementId) {
      scrollToElement(elementId);
      window.setTimeout(() => setNotificationTarget(null), 1200);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setNotificationTarget(null);
    }
  };

  const resolveMyPlansSubTab = (hangoutId?: string | null) => {
    if (!hangoutId || !currentUser) return "hosted" as const;
    const targetHangout = hangouts.find(h => h.id === hangoutId);
    return targetHangout?.creator_id === currentUser.id ? "hosted" : "requested";
  };

  const navigateToMyPlansTarget = (hangoutId?: string, options?: { revealExpired?: boolean }) => {
    const nextSubTab = resolveMyPlansSubTab(hangoutId);
    setPortalSubTab(nextSubTab);
    if (options?.revealExpired) {
      if (nextSubTab === "hosted") {
        setShowHostedPastPlans(true);
      } else {
        setShowRequestedPastPlans(true);
      }
    }
    setNotificationTarget(null);
    setActiveTab("my-plans");

    if (!hangoutId) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const elementId =
      nextSubTab === "hosted"
        ? `hosted-hangout-card-${hangoutId}`
        : `requested-hangout-card-${hangoutId}`;
    scrollToElement(elementId);
  };

  const handleNotificationOpen = (notification: AppNotification) => {
    const { hangout_id: hangoutId, comment_id: commentId, chat_id: chatId } = notification.payload;
    const relatedHangout = hangoutId ? hangouts.find(h => h.id === hangoutId) : null;
    const revealExpiredInPlans =
      notification.payload.reminder_stage === "expired" ||
      (relatedHangout ? getEffectiveHangoutStatus(relatedHangout) === "expired" : false);

    if (chatId) {
      setNotificationTarget(null);
      setActiveTab("chats");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    switch (notification.type) {
      case "comment_reply":
        navigateToFeedTarget({ hangoutId, commentId });
        return;
      case "new_application":
      case "application_accepted":
      case "application_rejected":
      case "hangout_like":
      case "upcoming_hangout_reminder":
        navigateToMyPlansTarget(hangoutId, { revealExpired: revealExpiredInPlans });
        return;
      case "new_report_admin":
        setNotificationTarget(null);
        setActiveTab("admin");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      case "report_approved":
      case "report_appeal_result":
        setNotificationTarget(null);
        setActiveTab(currentUser?.is_admin ? "admin" : "profile");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      case "admin_message":
        if (hangoutId) {
          navigateToMyPlansTarget(hangoutId, { revealExpired: revealExpiredInPlans });
          return;
        }
        setNotificationTarget(null);
        setActiveTab("profile");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      default:
        if (hangoutId || commentId) {
          navigateToFeedTarget({ hangoutId, commentId });
          return;
        }
        setNotificationTarget(null);
        setActiveTab("feed");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const notificationId = new URLSearchParams(window.location.search).get("push_notification_id");
    if (!notificationId || !currentUser) return;
    const notification = notifications.find(item => item.id === notificationId && item.user_id === currentUser.id);
    if (!notification) return;

    handleNotificationOpen(notification);
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("push_notification_id");
    window.history.replaceState({}, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
  }, [currentUser?.id, notifications]);

  // Render main user content views
  const renderTabContent = () => {
    switch (activeTab) {
      case "get-app":
        return (
          <GetAppPage
            isSignedIn={Boolean(currentUser)}
            isInstalled={pwa.isInstalled}
            isIos={pwa.ios}
            isAndroid={pwa.android}
            canPromptInstall={pwa.canPromptInstall}
            pushState={pwa.pushState}
            notificationPermission={pwa.notificationPermission}
            pushError={pwa.pushError}
            isPushBusy={pwa.isPushBusy}
            onInstall={pwa.install}
            onEnablePush={pwa.enablePush}
            onDisablePush={pwa.disablePush}
            onRequestLogin={() => setShowLoginModal(true)}
          />
        );
      case "profile":
        return (
          <StudentProfilePage
            pushState={pwa.pushState}
            pushError={pwa.pushError}
            isPushBusy={pwa.isPushBusy}
            notificationPermission={pwa.notificationPermission}
            onEnablePush={pwa.enablePush}
            onDisablePush={pwa.disablePush}
          />
        );
      case "feed":
        if (showAppSkeletons) {
          return <FeedSkeleton />;
        }

        const { feed, hasOlderFilteredHangouts } = buildBrowseFeed(showExpired);

        // Slice for pagination: 20 per page
        const itemsPerPage = 20;
        const totalPages = Math.ceil(feed.length / itemsPerPage);
        const activeCurrentPage = Math.min(currentPage, totalPages || 1);
        const paginatedFeed = feed.slice(
          (activeCurrentPage - 1) * itemsPerPage,
          activeCurrentPage * itemsPerPage
        );

        return (
          <div className="space-y-6">
            {/* Injected Login/Register CTA banner if guest/unauthenticated */}
            {!currentUser && (
              <div className="bg-gradient-to-r from-rose-500 to-amber-500 text-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3.5 flex-col sm:flex-row text-center sm:text-left flex-1">
                  <div className="shrink-0">
                    <Logo size="lg" noBg={true} />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">Hangout with other XMUM students!</h2>
                    <p className="text-xs sm:text-sm text-rose-50 leading-relaxed font-semibold">
                      Create, discover, and coordinate student-run activities. Join hangouts hosted by your peers!
                    </p>
                  </div>
                </div>
                <button
                  id="homescreen-banner-login-btn"
                  onClick={() => setShowLoginModal(true)}
                  className="bg-white hover:bg-rose-50 text-rose-600 font-extrabold px-6 py-3 rounded-2xl text-xs sm:text-sm shadow-sm transition-all shrink-0 hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  Create Hangout
                </button>
              </div>
            )}

            {/* Filters layout bar */}
            <div className={`rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:space-y-4 sm:p-5 ${showMobileFilters ? "space-y-3" : "space-y-0"}`}>
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                {/* Search input and mobile filter trigger on the same row */}
                <div className="flex items-center gap-2 flex-grow">
                  <div className="relative flex-grow">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
                    <input
                      id="search-filter-input"
                      type="text"
                      value={searchLocation}
                      onChange={e => setSearchLocation(e.target.value)}
                      placeholder="Search hangouts..."
                      className="w-full h-11 bg-slate-50 border border-slate-200/60 rounded-xl pl-9.5 pr-4 text-xs sm:text-sm text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-rose-200/40 focus:border-rose-400 transition-all font-medium shadow-none"
                    />
                  </div>
                  
                  {/* Single Filter Button beside the search bar - visible on MOBILE only */}
                  <button
                    id="mobile-filters-trigger"
                    type="button"
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="md:hidden h-11 w-11 bg-slate-50 hover:bg-slate-100 active:bg-rose-50 text-slate-605 active:text-rose-600 border border-slate-100 rounded-xl transition-all cursor-pointer shrink-0 flex items-center justify-center p-0"
                    title="Toggle filters"
                  >
                    <SlidersHorizontal className={`w-4 h-4 transition-transform ${showMobileFilters ? "text-rose-500 rotate-90" : "text-slate-605"}`} />
                  </button>
                </div>
                
                {/* Desktop-only secondary filter buttons (Eligible & Expired) on same row */}
                <div className="hidden md:flex flex-wrap gap-2 shrink-0">
                  {currentUser && (
                    <button
                      id="toggle-eligible-filter"
                      onClick={() => setEligibleOnlyFilter(!eligibleOnlyFilter)}
                      className={`px-4.5 py-3 rounded-2xl font-black text-xs sm:text-sm border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        eligibleOnlyFilter
                          ? "bg-rose-50 text-rose-600 border-rose-200 shadow-sm"
                          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      Eligible Only
                    </button>
                  )}
 
                  <button
                    id="toggle-expired-filter"
                    onClick={handleToggleShowExpired}
                    className={`px-4.5 py-3 rounded-2xl font-black text-xs sm:text-sm border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      showExpired
                        ? "bg-rose-50 text-rose-600 border-rose-200 shadow-sm"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Show Expired
                  </button>
                </div>
              </div>

              {/* Mobile-only expanded filters panel */}
              {showMobileFilters && (
                <div className="md:hidden space-y-3.5 pt-3.5 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-wrap gap-2">
                    {currentUser && (
                      <button
                        id="toggle-eligible-filter-mobile"
                        onClick={() => setEligibleOnlyFilter(!eligibleOnlyFilter)}
                        className={`px-4.5 py-2.5 rounded-2xl font-black text-xs border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          eligibleOnlyFilter
                            ? "bg-rose-50 text-rose-600 border-rose-200 shadow-sm"
                            : "bg-slate-50 text-gray-500 border-slate-100"
                        }`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Eligible Only
                      </button>
                    )}
 
                    <button
                      id="toggle-expired-filter-mobile"
                      onClick={handleToggleShowExpired}
                      className={`px-4.5 py-2.5 rounded-2xl font-black text-xs border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        showExpired
                          ? "bg-rose-50 text-rose-600 border-rose-200 shadow-sm"
                          : "bg-slate-50 text-gray-500 border-slate-100"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Show Expired
                    </button>
                  </div>
                </div>
              )}
 
              {/* Date pickers and Language combined bar - visible on desktop always, and on mobile only when toggled */}
              <div className={`${showMobileFilters ? "flex" : "hidden md:flex"} flex-col md:flex-row md:items-center justify-between gap-3 border-t border-gray-50 pt-3 w-full`}>
                <div className="flex flex-row items-center flex-wrap gap-x-4 gap-y-2 flex-grow min-w-0">
                  {/* Occurs */}
                  <div className="flex flex-row items-center gap-1.5 text-xs text-gray-500 shrink-0">
                    <span className="font-extrabold text-[9px] text-gray-400 uppercase tracking-widest font-sans">Occurs:</span>
                    <div className="flex gap-1 font-sans">
                      {(["all", "today", "week", "month"] as const).map(option => {
                        let label = "All Time";
                        if (option === "today") label = "Today";
                        else if (option === "week") label = "This Week";
                        else if (option === "month") label = "This Month";
                        
                        const isSelected = datePeriodFilter === option;
                        return (
                          <button
                            key={option}
                            id={`date-period-btn-${option}`}
                            type="button"
                            onClick={() => setDatePeriodFilter(option)}
                            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                                : "bg-slate-50 text-gray-500 border-transparent hover:bg-slate-100 hover:text-gray-700"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Divider line style for desktop only */}
                  <div className="hidden md:block w-px h-3 bg-gray-150 shrink-0" />

                  {/* Gender Filter */}
                  <div className="flex flex-row items-center gap-1.5 text-xs text-gray-500 shrink-0">
                    <span className="font-extrabold text-[9px] text-gray-400 uppercase tracking-widest font-sans">Gender:</span>
                    <div className="flex gap-1 font-sans">
                      {(["all", "male", "female"] as const).map(option => {
                        let label = "All";
                        if (option === "male") label = "Male";
                        else if (option === "female") label = "Female";
                        
                        const isSelected = genderFilter === option;
                        return (
                          <button
                            key={option}
                            id={`gender-filter-btn-${option}`}
                            type="button"
                            onClick={() => setGenderFilter(option)}
                            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                                : "bg-slate-50 text-gray-500 border-transparent hover:bg-slate-100 hover:text-gray-700"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Divider line style for desktop only */}
                  <div className="hidden md:block w-px h-3 bg-gray-150 shrink-0" />

                  {/* Sort */}
                  <div className="flex flex-row items-center gap-1.5 text-xs text-gray-500 shrink-0">
                    <span className="font-extrabold text-[9px] text-gray-400 uppercase tracking-widest font-sans">Sort:</span>
                    <div className="flex gap-1 font-sans">
                      {([
                        { id: "posted", label: "Posted" },
                        { id: "event", label: "Event" }
                      ] as const).map(option => {
                        const isSelected = feedSortMode === option.id;
                        return (
                          <button
                            key={option.id}
                            id={`sort-filter-btn-${option.id}`}
                            type="button"
                            onClick={() => setFeedSortMode(option.id)}
                            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                                : "bg-slate-50 text-gray-500 border-transparent hover:bg-slate-100 hover:text-gray-700"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {(datePeriodFilter !== "all" || searchLocation || eligibleOnlyFilter || genderFilter !== "all" || feedSortMode !== "posted") && (
                  <button
                    id="clear-filters-btn"
                    onClick={() => {
                      setSearchLocation("");
                      setEligibleOnlyFilter(false);
                      setDatePeriodFilter("all");
                      setGenderFilter("all");
                      setFeedSortMode("posted");
                    }}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 border-b border-rose-500 hover:border-rose-600 shrink-0 cursor-pointer whitespace-nowrap self-center"
                  >
                    Reset all queries
                  </button>
                )}
              </div>
            </div>

            {hasOlderFilteredHangouts && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                <p className="text-[11px] sm:text-xs font-semibold text-amber-800 leading-relaxed">
                  {showAllHangoutHistory
                    ? "Showing all matching hangout cards, including posts older than 2 months."
                    : "Showing recent matching hangout cards from the last 2 months."}
                </p>
                <button
                  id="toggle-hangout-history-window"
                  type="button"
                  onClick={() => setShowAllHangoutHistory(prev => !prev)}
                  className="self-start sm:self-auto rounded-xl border border-amber-200 bg-white px-3.5 py-2 text-[11px] font-black text-amber-700 shadow-sm transition-all hover:bg-amber-100 hover:text-amber-900 active:scale-95 cursor-pointer"
                >
                  {showAllHangoutHistory ? "Show Recent Only" : "View All"}
                </button>
              </div>
            )}

            {/* Cards Feed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {feed.length === 0 ? (
                <div id="no-hangouts-feed" className="col-span-full text-center py-24 bg-white border border-gray-100 rounded-3xl p-6">
                  <Sparkles className="w-12 h-12 text-rose-300 mx-auto mb-2 stroke-1" />
                  <p className="text-gray-500 text-sm font-semibold">No active hangout plans found...</p>
                  <p className="text-xs text-gray-450 mt-1 max-w-sm mx-auto">
                    Try broadening your search query or post your own exciting plan! Be the first to start the trend.
                  </p>
                </div>
              ) : (
                paginatedFeed.map(h => (
                  <HangoutCard
                    key={h.id}
                    hangout={h}
                    onReportCreator={() => setReportingHangoutId(h.id)}
                    commentResetKey={feedCommentResetKey}
                    notificationTarget={notificationTarget}
                  />
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 py-3.5 border-t border-gray-100/70">
                <button
                  id="prev-page-btn"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={activeCurrentPage === 1}
                  className="px-4 py-2 text-xs font-bold rounded-2xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-rose-600 disabled:opacity-40 disabled:hover:text-gray-600 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      id={`page-btn-${page}`}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 flex items-center justify-center text-xs font-black rounded-xl border transition-all cursor-pointer ${
                        activeCurrentPage === page
                          ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-rose-50 hover:text-rose-600"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  id="next-page-btn"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={activeCurrentPage === totalPages}
                  className="px-4 py-2 text-xs font-bold rounded-2xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-rose-600 disabled:opacity-40 disabled:hover:text-gray-600 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        );

      case "create":
        return (
          <div className="min-h-[calc(100dvh-8rem)] w-full max-w-none space-y-5 bg-white p-5 animate-in fade-in duration-350 sm:mx-auto sm:min-h-0 sm:max-w-md sm:rounded-3xl sm:border sm:border-rose-100/45 sm:p-7 sm:shadow-sm lg:max-w-lg">
            <div className="flex items-center gap-2 border-b border-rose-100/30 pb-2.5">
              <span className="text-base text-rose-500 sm:text-lg">✨</span>
              <h2 id="create-plan-title" className="font-display text-base font-bold tracking-tight text-slate-800 sm:text-lg">
                Plan a Hangout
              </h2>
            </div>

            <form onSubmit={handleCreateHangoutSubmit} className="space-y-4">
              
              {/* Intention statement */}
              <div className="space-y-1.5">
                <label className="relative flex items-center gap-1 text-xs font-bold text-slate-700">
                  What would you like to plan? <span className="text-rose-500">*</span>
                  <FieldInfo label="About the hangout title" text="Write the opening and activity as one natural sentence. The preview remains visible on larger screens." />
                </label>
                <div className="relative flex items-center gap-1 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/40 px-2 transition-all duration-200 focus-within:border-rose-300 focus-within:bg-white focus-within:ring-1 focus-within:ring-rose-200">
                  <input
                    id="create-intention-lead"
                    type="text"
                    value={createIntentionLead}
                    onChange={e => setCreateIntentionLead(e.target.value)}
                    placeholder="I want to"
                    required
                    maxLength={28}
                    className="w-[8.5rem] min-w-[7rem] max-w-[10rem] bg-transparent px-2 py-2 text-xs font-extrabold text-rose-500 outline-none font-sans sm:text-sm"
                  />
                  <input
                    id="create-intention"
                    type="text"
                    value={createIntentionDetail}
                    onChange={e => setCreateIntentionDetail(e.target.value)}
                    placeholder="do a group study for philosophy..."
                    required
                    maxLength={130}
                    className="w-full bg-transparent px-2 py-2 text-xs font-bold text-slate-800 outline-none font-sans placeholder:text-slate-350 sm:text-sm"
                  />
                </div>
                {(createIntentionLead.trim() || createIntentionDetail.trim()) && (
                  <p className="mt-1 hidden rounded-lg border border-slate-100/30 bg-slate-50/50 p-1.5 pl-1 text-[10px] font-medium italic text-gray-400 sm:block">
                    Sentence Preview: <span className="font-bold text-slate-700">{createIntentionLead}</span>{" "}
                    <span className="text-rose-600 font-bold">{createIntentionDetail}</span>
                  </p>
                )}
              </div>

              {/* General location */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Where at? <span className="text-rose-500">*</span>
                </label>
                <input
                  id="create-location"
                  type="text"
                  value={createLocation}
                  onChange={e => setCreateLocation(e.target.value)}
                  placeholder="e.g. Library, LY3 1st Floor..."
                  required
                  className="w-full rounded-xl border border-slate-100 bg-slate-50/40 px-3.5 py-2 text-xs text-slate-800 outline-none transition-colors focus:border-rose-300 focus:bg-white focus:ring-1 focus:ring-rose-200 font-sans sm:text-sm"
                />
              </div>

              {/* Date & Time */}
              <div className="space-y-2">
                <label className="relative flex items-center gap-1 text-xs font-bold text-slate-700">
                  When? <span className="text-rose-500">*</span>
                  <FieldInfo label="Date and time requirements" text="Choose a future time within the next 2 months. Same-day hangouts must be at least 30 minutes ahead." />
                </label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="min-w-0 space-y-1">
                    <label htmlFor="create-date" className="block text-[11px] font-semibold text-slate-500">
                      Date
                    </label>
                    <input
                      id="create-date"
                      type="date"
                      value={createDate}
                      min={minimumCreateDate}
                      max={maximumHangoutDate}
                      onChange={e => setCreateDate(e.target.value)}
                      required
                      className="w-full min-w-0 cursor-pointer rounded-xl border border-slate-100 bg-slate-50/40 px-2 py-2 text-[11px] text-slate-800 outline-none transition-colors focus:border-rose-300 focus:bg-white focus:ring-1 focus:ring-rose-200 sm:px-3.5 sm:text-sm font-sans"
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <label htmlFor="create-time" className="block text-[11px] font-semibold text-slate-500">
                      Time
                    </label>
                    <input
                      id="create-time"
                      type="time"
                      value={createTime}
                      min={minimumCreateTime}
                      onChange={e => setCreateTime(e.target.value)}
                      required
                      className="w-full min-w-0 cursor-pointer rounded-xl border border-slate-100 bg-slate-50/40 px-2 py-2 text-[11px] text-slate-800 outline-none transition-colors focus:border-rose-300 focus:bg-white focus:ring-1 focus:ring-rose-200 sm:px-3.5 sm:text-sm font-sans"
                    />
                  </div>
                </div>
                {combinedCreateDateTime && (
                  <p className={`text-[10px] font-medium ${createDateTimeError ? "text-rose-500" : "text-emerald-600"}`}>
                    {createDateTimeError
                      ? createDateTimeError
                      : `Scheduled for ${new Date(combinedCreateDateTime).toLocaleString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit"
                        })}`}
                  </p>
                )}
              </div>

              {/* Safe meeting spot (locked coordinates) */}
              <div className="space-y-1">
                <label className="relative flex items-center gap-1 text-xs font-bold text-slate-800">
                  Meeting Point <span className="text-rose-500">*</span>
                  <FieldInfo label="Who can see the meeting point" text="Visible only to users whose join requests you approve." />
                </label>
                <input
                  id="create-meeting-point"
                  type="text"
                  value={createMeetingPoint}
                  onChange={e => setCreateMeetingPoint(e.target.value)}
                  placeholder="e.g. B1 in front of Sapid..."
                  required
                  className="w-full rounded-xl border border-slate-100 bg-slate-50/40 px-3.5 py-2 text-xs text-slate-800 outline-none transition-colors focus:border-rose-300 focus:bg-white focus:ring-1 focus:ring-rose-200 font-sans sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="relative flex items-center gap-1 text-xs font-bold text-slate-700">
                  Description <span className="text-rose-500">*</span>
                  <FieldInfo label="Description requirements" text={`Use between ${MIN_HANGOUT_DESCRIPTION_LENGTH} and ${MAX_HANGOUT_DESCRIPTION_LENGTH} characters so people know what to expect.`} />
                </label>
                <textarea
                  id="create-additional"
                  value={createAdditional}
                  onChange={e => setCreateAdditional(e.target.value)}
                  maxLength={MAX_HANGOUT_DESCRIPTION_LENGTH}
                  placeholder="Share what the plan is like, what to bring, or anything your group should know."
                  className="h-24 w-full resize-none rounded-xl border border-slate-100 bg-slate-50/40 p-3 text-xs text-slate-800 outline-none transition-all focus:border-rose-300 focus:bg-white focus:ring-1 focus:ring-rose-200 font-sans sm:text-sm"
                  required
                />
              </div>

              {/* Anonymous Checkbox */}
              <div className="flex items-center gap-2 py-0.5">
                <input
                  id="create-is-anonymous"
                  type="checkbox"
                  checked={createIsAnonymous}
                  onChange={e => setCreateIsAnonymous(e.target.checked)}
                  className="h-4 w-4 shrink-0 cursor-pointer rounded accent-rose-500 font-sans"
                />
                <label htmlFor="create-is-anonymous" className="cursor-pointer text-xs font-medium text-slate-600">Post anonymously</label>
              </div>

              {/* Additional Options */}
              <div className="pt-1.5">
                <button
                  id="toggle-advanced-create-btn"
                  type="button"
                  onClick={() => setShowAdvancedCreate(!showAdvancedCreate)}
                  className="flex items-center gap-1 text-xs font-extrabold text-rose-500 transition-all cursor-pointer hover:text-rose-600"
                >
                  {showAdvancedCreate ? "Hide advanced options ▲" : "Advanced options ▼"}
                </button>

                {showAdvancedCreate && (
                  <div className="mt-3.5 space-y-4 pt-3.5 border-t border-slate-100/75 animate-in fade-in duration-200">
                    
                    {/* Companion size limit */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Buddy Limit (Optional)
                      </label>
                      <input
                        id="create-max-participants"
                        type="number"
                        min="1"
                        max="100"
                        placeholder="No limit"
                        value={createMaxParticipants}
                        onChange={e => setCreateMaxParticipants(e.target.value === "" ? "" : parseInt(e.target.value))}
                        className="w-full bg-slate-50/40 border border-slate-100 focus:border-rose-300 focus:bg-white focus:ring-1 focus:ring-rose-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 outline-none transition-colors font-sans"
                      />
                    </div>

                    {/* Participant selector builder */}
                    <div className="pt-2 space-y-2">
                      <label className="block text-xs font-bold text-slate-800">
                        Joining Criteria Preferences
                      </label>
                      <RestrictionBuilder
                        restrictions={createRestrictions}
                        onChange={setCreateRestrictions}
                      />
                    </div>

                  </div>
                )}
              </div>

              <div id="safety-warning-muted" className="relative flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500">
                <span>Safety Pledge</span>
                <FieldInfo
                  label="Read the safety pledge"
                  text="Meet safely in public. Keep listings friendly and respectful. Offensive content triggers immediate lifetime exclusion."
                />
              </div>

              {/* Submit button */}
              <div className="pt-2 border-t border-rose-100/10">
                <button
                  id="create-plan-submit-btn"
                  type="submit"
                  className="flex w-full cursor-pointer items-center justify-center rounded-2xl bg-rose-500 px-5 py-3 font-display text-xs font-black text-white shadow-sm transition-all hover:bg-rose-600 active:scale-95 sm:text-sm"
                >
                  🚀 Post this Hangout
                </button>
              </div>

            </form>
          </div>
        );

      case "my-plans":
        if (showAppSkeletons) {
          return <PortalSkeleton />;
        }

        return (
          <div className="min-h-[calc(100dvh-8rem)] w-full max-w-none space-y-6 bg-white px-4 py-5 font-sans sm:mx-auto sm:min-h-0 sm:max-w-4xl sm:bg-transparent sm:px-3 sm:py-0">
            {/* Modern Header Container */}
            <div className="flex flex-col justify-between gap-4 border-b border-rose-100/40 bg-transparent pb-5 sm:rounded-3xl sm:border sm:border-rose-100/15 sm:bg-gradient-to-r sm:from-rose-500/5 sm:via-rose-500/1 sm:to-transparent sm:p-6 md:flex-row md:items-center">
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <span>My Hangouts Portal</span>
                </h1>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  Manage your active campus plans, evaluate attendee requests, and monitor your submitted join invitations.
                </p>
              </div>

              {/* Sub-tab Switcher - Sleek pill capsules */}
              <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/40 self-start md:self-auto shrink-0 shadow-inner">
                <button
                  type="button"
                  id="portal-subtab-hosted-btn"
                  onClick={() => setPortalSubTab("hosted")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    portalSubTab === "hosted"
                      ? "bg-white text-rose-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Hosted ({activeCreatedHangouts.length})
                </button>
                <button
                  type="button"
                  id="portal-subtab-requested-btn"
                  onClick={() => setPortalSubTab("requested")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    portalSubTab === "requested"
                      ? "bg-white text-rose-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Requests ({activeApplications.length})
                </button>
              </div>
            </div>

            {/* Portal Content Area */}
            <AnimatePresence mode="wait">
              {portalSubTab === "hosted" ? (
                <motion.div
                  key="hosted-plans"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs sm:text-sm font-black text-slate-700 tracking-tight uppercase">
                      Posted Hangout Plans ({activeCreatedHangouts.length})
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowHostedPastPlans(!showHostedPastPlans)}
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        showHostedPastPlans
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {showHostedPastPlans ? "Hide Past Plans" : "Show Past Plans"}
                    </button>
                  </div>

                  {visibleHostedHangouts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-4 rounded-[1.9rem] border border-gray-100 bg-[radial-gradient(circle_at_top,_rgba(251,113,133,0.08),_transparent_48%),linear-gradient(180deg,_rgba(255,255,255,1),_rgba(255,250,251,0.92))] p-8 text-center shadow-sm">
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-rose-100 bg-white text-transparent shadow-sm">
                        <PlusCircle className="absolute h-6 w-6 text-rose-500" />
                        📢
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-700">
                          {myCreatedHangouts.length === 0 ? "No posted hangouts" : "No active hangouts in this view"}
                        </h3>
                        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-400">
                          {myCreatedHangouts.length === 0
                            ? "You haven't posted any hangout plans yet. Click 'Create Hangout' in the top navbar to announce a meetup."
                            : "Turn on past plans if you want to review expired or cancelled hangouts."}
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("create")}
                        className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2 text-xs font-black text-white shadow-sm transition-all hover:bg-rose-600 hover:shadow-md cursor-pointer"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Create My First Hangout
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5">
                      {visibleHostedHangouts.map(h => {
                        const isMeetingPointCorrupted = isLockedMeetingPointPlaceholder(h.meeting_point);
                        const hostedHangoutStatus = getEffectiveHangoutStatus(h);

                        return (
                        <details
                          id={`hosted-hangout-card-${h.id}`}
                          key={h.id}
                          className="group rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:p-6"
                        >
                          <summary className="list-none cursor-pointer outline-none [&::-webkit-details-marker]:hidden">
                            <div className="flex flex-col gap-4 border-b border-gray-50 pb-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`text-[10px] font-black uppercase tracking-[0.22em] px-2.5 py-1 rounded-full border ${
                                    hostedHangoutStatus === "active"
                                      ? "bg-teal-50 text-teal-700 border-teal-100"
                                      : "bg-slate-100 text-slate-500 border-slate-200"
                                  }`}>
                                    {hostedHangoutStatus}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Posted Plan</p>
                                  <h3 className="mt-1 max-w-2xl text-sm font-extrabold leading-snug text-slate-900 sm:text-[1rem]">
                                    <span className="text-slate-900">{splitHangoutIntentParts(h.intention).lead}</span>{" "}
                                    <span className="text-rose-500">{splitHangoutIntentParts(h.intention).detail}</span>
                                  </h3>
                                  <p className="mt-1 text-[10px] font-semibold text-slate-400">
                                    Expand to manage applicants, meeting point, edits, and cancellation.
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-start gap-x-5 gap-y-2 sm:min-w-[240px] sm:justify-end">
                                <div className="text-left sm:text-right">
                                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Posted</span>
                                  <span className="mt-1 block text-[11px] font-bold text-slate-700">
                                    {new Date(h.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                                  </span>
                                </div>
                                <div className="text-left sm:text-right">
                                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Event</span>
                                  <span className="mt-1 block text-[11px] font-bold text-slate-700">
                                    {new Date(h.event_datetime).toLocaleDateString([], { month: "short", day: "numeric" })}
                                  </span>
                                </div>
                                <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 transition-transform group-open:rotate-180">
                                  <ChevronDown className="h-4 w-4" />
                                </span>
                              </div>
                            </div>
                          </summary>

                          <div className="mt-4 space-y-5">

                            {isMeetingPointCorrupted && (
                              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Meeting point needs recovery</p>
                                    <p className="mt-1 text-[12px] leading-relaxed text-amber-900">
                                      This plan already had a meeting point, but an older sync bug replaced the saved value. Add it again once to restore it.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => openEditHangout(h.id)}
                                    className="inline-flex items-center gap-1.5 self-start rounded-2xl border border-amber-200 bg-white px-3.5 py-2 text-xs font-bold text-amber-800 shadow-sm transition-all hover:bg-amber-100"
                                  >
                                    <PencilLine className="w-3.5 h-3.5" />
                                    Restore Meeting Point
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                  <MapPin className="h-3.5 w-3.5 text-rose-500" /> Location
                                </span>
                                <span className="mt-2 block text-sm font-bold text-slate-800">{h.location}</span>
                              </div>
                              <div className={`rounded-2xl border p-3.5 ${isMeetingPointCorrupted ? "border-amber-100 bg-amber-50/70" : "border-slate-100 bg-slate-50/70"}`}>
                                <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${isMeetingPointCorrupted ? "text-amber-700" : "text-slate-500"}`}>
                                  <Lock className="h-3.5 w-3.5 text-teal-500" /> Private Meeting Point
                                </span>
                                {isMeetingPointCorrupted ? (
                                  <span className="mt-2 block text-[12px] font-semibold leading-relaxed text-amber-900">
                                    The original meeting point was not preserved. Use <span className="font-black">Edit Hangout</span> to enter it again.
                                  </span>
                                ) : (
                                  <span className="mt-2 block truncate text-sm font-bold text-slate-800">{h.meeting_point}</span>
                                )}
                              </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,220px)_1fr]">
                                <div>
                                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                    <Calendar className="h-3.5 w-3.5 text-rose-500" /> When
                                  </span>
                                  <p className="mt-2 text-[12px] font-bold leading-relaxed text-slate-800">
                                    {new Date(h.event_datetime).toLocaleString([], {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit"
                                    })}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Description</span>
                                  <p className="mt-2 text-[12px] leading-relaxed text-slate-700">{h.additional_info}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 border-t border-slate-100/80 pt-4">
                              {hostedHangoutStatus === "active" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditHangout(h.id)}
                                    className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
                                  >
                                    <PencilLine className="w-3.5 h-3.5" />
                                    Edit Hangout
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteHangout(h.id)}
                                    className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-100 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-sm transition-all hover:bg-rose-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Cancel Hangout
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Interactive ApplicantList */}
                            <div className="border-t border-slate-100 pt-4">
                              <ApplicantList hangoutId={h.id} />
                            </div>
                          </div>
                        </details>
                      )})}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="requested-plans"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs sm:text-sm font-black text-slate-700 tracking-tight uppercase">
                      Match Requests Sent ({activeApplications.length})
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowRequestedPastPlans(!showRequestedPastPlans)}
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        showRequestedPastPlans
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {showRequestedPastPlans ? "Hide Past Requests" : "Show Past Requests"}
                    </button>
                  </div>

                  {visibleApplications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-4 rounded-[1.9rem] border border-gray-100 bg-[radial-gradient(circle_at_top,_rgba(251,113,133,0.08),_transparent_48%),linear-gradient(180deg,_rgba(255,255,255,1),_rgba(255,250,251,0.92))] p-8 text-center shadow-sm">
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-rose-100 bg-white text-transparent shadow-sm">
                        <Search className="absolute h-6 w-6 text-rose-500" />
                        🌟
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-700">
                          {myApplications.length === 0 ? "No match requests yet" : "No active match requests"}
                        </h3>
                        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-400">
                          {myApplications.length === 0
                            ? "You haven't submitted any hangout requests yet. Browse the home feed to discover other active student plans!"
                            : "Turn on past requests to review requests for expired or cancelled hangouts."}
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("feed")}
                        className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2 text-xs font-black text-white shadow-sm transition-all hover:bg-rose-600 hover:shadow-md cursor-pointer"
                      >
                        <Compass className="h-3.5 w-3.5" />
                        Explore Feed
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {visibleApplications.map(app => {
                        const hangoutItem = hangouts.find(h => h.id === app.hangout_id);
                        if (!hangoutItem) return null;

                        const planner = profiles.find(p => p.id === hangoutItem.creator_id);
                        const isMeetingPointCorrupted = isLockedMeetingPointPlaceholder(hangoutItem.meeting_point);
                        const requestedHangoutStatus = getEffectiveHangoutStatus(hangoutItem);

                        return (
                          <details
                            id={`requested-hangout-card-${hangoutItem.id}`}
                            key={app.id}
                            className="group rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:p-6"
                          >
                            <summary className="list-none cursor-pointer outline-none [&::-webkit-details-marker]:hidden">
                              <div className="flex flex-col gap-4 border-b border-gray-50 pb-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {requestedHangoutStatus !== "active" && (
                                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                                        {requestedHangoutStatus}
                                      </span>
                                    )}
                                    <span className={`text-[9px] font-black uppercase tracking-[0.22em] px-2.5 py-1 rounded-full border ${
                                      app.status === "pending"
                                        ? "bg-amber-50 text-amber-600 border-amber-100"
                                        : app.status === "accepted"
                                        ? "bg-teal-50 text-teal-700 border-teal-100"
                                        : "bg-rose-50 text-rose-700 border-rose-100"
                                    }`}>
                                      {app.status}
                                    </span>

                                    {app.is_anonymous && (
                                      <span className="rounded-full border border-slate-150 bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                        Anonymous
                                      </span>
                                    )}
                                  </div>

                                  <div>
                                    <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Requested Plan</span>
                                    <h3 className="mt-1 max-w-2xl text-sm font-extrabold leading-snug text-slate-900 sm:text-[1rem]">
                                      Requested to join <span className="text-slate-900">{splitHangoutIntentParts(hangoutItem.intention).lead}</span>{" "}
                                      <span className="text-rose-500">{splitHangoutIntentParts(hangoutItem.intention).detail}</span>
                                    </h3>
                                    <p className="mt-1 text-[10px] font-semibold text-slate-400">
                                      Expand to view host, schedule, meeting-point status, and request actions.
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-start gap-x-5 gap-y-2 sm:min-w-[170px] sm:justify-end">
                                  <div className="text-left sm:text-right">
                                    <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Requested</span>
                                    <span className="mt-1 block text-[11px] font-bold text-slate-700">
                                      {new Date(app.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                                    </span>
                                  </div>
                                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 transition-transform group-open:rotate-180">
                                    <ChevronDown className="h-4 w-4" />
                                  </span>
                                </div>
                              </div>
                            </summary>

                            <div className="mt-4 flex flex-col gap-5 text-xs">

                              <div className="border-t border-slate-100 pt-4">
                                <div className="flex flex-wrap items-center gap-2 pb-3">
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Hosted by</span>
                                  {planner?.home_country && !(hangoutItem.is_anonymous && app.status !== "accepted" && !currentUser?.is_admin) && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                      <CountryFlag country={planner.home_country} className="h-3.5 w-3.5" />
                                      {planner.home_country}
                                    </span>
                                  )}
                                </div>

                                <button
                                   type="button"
                                   onClick={() => {
                                     const isAdmin = currentUser?.is_admin;
                                     const isAccepted = app.status === "accepted";
                                     if (hangoutItem.is_anonymous && !isAccepted && !isAdmin) {
                                       setViewedProfile(buildAnonymousAliasProfile(planner, {
                                         seed: hangoutItem.creator_id,
                                         aboutMe: "This student is hosting this hangout anonymously to protect their privacy on the public feed."
                                       }));
                                     } else if (planner) {
                                       setViewedProfile(planner);
                                     }
                                   }}
                                   className="inline-flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50/80 px-3 py-2 text-left font-black text-rose-600 shadow-sm transition-all hover:bg-rose-100 hover:text-rose-700"
                                 >
                                   <User className="h-3.5 w-3.5" />
                                   {hangoutItem.is_anonymous && app.status !== "accepted" && !currentUser?.is_admin
                                     ? (() => {
                                         const hashValue = hangoutItem.creator_id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                         const animals = [
                                           "Panda", "Koala", "Otter", "Dolphin", "Cheetah", "Penguin", "Falcon", "Sloth", "Fox", "Squirrel",
                                           "Rabbit", "Deer", "Hedgehog", "Capybara", "Alpaca", "Wombat", "Platypus", "Lemur", "Meerkat", "Quokka",
                                           "Octopus", "Seahorse", "Turtle", "Flamingo", "Peacock", "Beaver", "Badger", "Owl"
                                         ];
                                         const idx = Math.abs(hashValue) % animals.length;
                                         return `Anonymous ${animals[idx]}`;
                                       })()
                                     : (planner?.name || "Fellow Student")
                                   }
                                 </button>
                              </div>

                              <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.18em] flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" /> Location
                                  </span>
                                  <span className="mt-2 block truncate text-sm font-bold text-slate-800">{hangoutItem.location}</span>
                                </div>
                                <div className={`rounded-2xl border p-4 ${
                                  app.status === "accepted"
                                    ? isMeetingPointCorrupted
                                      ? "border-amber-100 bg-amber-50/70"
                                      : "border-teal-100 bg-teal-50/70"
                                    : "border-slate-100 bg-slate-50/70"
                                }`}>
                                  {app.status === "accepted" ? (
                                    <div>
                                      <span className={`block text-[10px] font-extrabold uppercase tracking-[0.18em] ${isMeetingPointCorrupted ? "text-amber-700" : "text-teal-700"}`}>Secure Meeting Point</span>
                                      {isMeetingPointCorrupted ? (
                                        <span className="mt-2 block text-[11px] leading-relaxed text-amber-900">
                                          The meeting point was not preserved in saved data, so the host needs to enter it again.
                                        </span>
                                      ) : (
                                        <span className="mt-2 block truncate rounded-xl border border-teal-100 bg-white px-2.5 py-2 text-[11px] font-black text-teal-800">
                                          {hangoutItem.meeting_point}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 block">Secure Meeting Point</span>
                                      <span className="mt-2 block text-[11px] italic text-slate-600">
                                        Visible after the host approves your request
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                            <div className="border-t border-slate-100 pt-4">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,220px)_1fr]">
                                <div>
                                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                    <Calendar className="h-3.5 w-3.5 text-rose-500" /> Event Time
                                  </span>
                                  <p className="mt-2 text-[12px] font-bold leading-relaxed text-slate-800">
                                    {new Date(hangoutItem.event_datetime).toLocaleString([], {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit"
                                    })}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Details</span>
                                  <p className="mt-2 text-[12px] leading-relaxed text-slate-700">{hangoutItem.additional_info}</p>
                                </div>
                              </div>
                            </div>

                            {app.status === "pending" && (
                              <div className="flex justify-end border-t border-slate-100/80 pt-4">
                                <button
                                  id={`retract-app-btn-${app.id}`}
                                  onClick={() => {
                                    retractApplication(app.id);
                                  }}
                                  className="self-stretch rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-[10px] font-black text-rose-700 shadow-sm transition-all hover:bg-rose-100 hover:text-rose-800 sm:self-auto sm:text-xs"
                                >
                                  Retract This Request
                                </button>
                              </div>
                            )}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      case "chats":
        if (showAppSkeletons) {
          return <ChatWindowSkeleton />;
        }

        return <ChatWindow />;

      case "admin":
        // Admin stats calculations
        const adminVisibleProfiles = Array.from(
          new Map<string, Profile>(
            [...ADMIN_TOOL_TEST_PROFILES, ...profiles].map(profile => [profile.id, profile])
          ).values()
        );
        const isCountableProfile = (profile: Profile) => {
          const normalizedEmail = normalizeProfileEmail(profile.email || "");
          if (!normalizedEmail) return false;
          if (profile.id === "deleted_user" || normalizedEmail === "deleted.user@system.local") return false;
          if (isDemoProfile(profile)) return false;
          return normalizedEmail.endsWith("@xmu.edu.my");
        };
        const allRealProfilesByEmail = new Map<string, Profile>(
          adminVisibleProfiles
            .filter(profile => isCountableProfile(profile))
            .map(profile => [normalizeProfileEmail(profile.email), profile])
        );
        const testProfilesByEmail = new Map<string, Profile>(
          adminVisibleProfiles
            .filter(profile => isDemoProfile(profile))
            .map(profile => [normalizeProfileEmail(profile.email), profile])
        );
        const countableProfiles = Array.from(allRealProfilesByEmail.values());
        const activityProfileIds = new Set(countableProfiles.map(profile => profile.id));
        const testUsersCount = testProfilesByEmail.size;
        const nowTimestamp = Date.now();
        const isEffectivelyExpired = (hangout: Hangout) => {
          if (hangout.status === "cancelled") return false;
          if (hangout.status === "expired") return true;
          const eventTime = getHangoutEventTime(hangout);
          return eventTime !== null && eventTime <= nowTimestamp;
        };
        const totalActive = hangouts.filter(
          h => activityProfileIds.has(h.creator_id) && h.status !== "cancelled" && !isEffectivelyExpired(h)
        ).length;
        const totalExpired = hangouts.filter(
          h => activityProfileIds.has(h.creator_id) && isEffectivelyExpired(h)
        ).length;
        const totalUsersCount = countableProfiles.length;
        const demographicsProfiles = countableProfiles;
        const demographicsUsersCount = demographicsProfiles.length;
        const companionStatsProfiles = countableProfiles;
        const totalCompanionPets = companionStatsProfiles.reduce(
          (sum, profile) => sum + Math.max(0, Number(profile.companion_pet_count || 0)),
          0
        );
        const topCompanionProfile = [...companionStatsProfiles].sort(
          (a, b) => Number(b.companion_pet_count || 0) - Number(a.companion_pet_count || 0)
        )[0] || null;
        const highestCompanionPets = Math.max(0, Number(topCompanionProfile?.companion_pet_count || 0));
        const pendingReportsList = reports.filter(r => r.status === "pending");
        const pendingAppealsList = appeals.filter(a => a.status === "pending");
        const analyticsRangeStart = (() => {
          if (adminAnalyticsRange === "daily") return nowTimestamp - (24 * 60 * 60 * 1000);
          if (adminAnalyticsRange === "weekly") {
            const start = new Date(nowTimestamp);
            start.setHours(0, 0, 0, 0);
            start.setDate(start.getDate() - 6);
            return start.getTime();
          }
          if (adminAnalyticsRange === "monthly") return nowTimestamp - (30 * 24 * 60 * 60 * 1000);
          if (adminAnalyticsRange === "yearly") return nowTimestamp - (365 * 24 * 60 * 60 * 1000);
          return null;
        })();
        const isWithinAnalyticsRange = (createdAt: string) => {
          const timestamp = new Date(createdAt).getTime();
          return !Number.isNaN(timestamp) && (analyticsRangeStart === null || timestamp >= analyticsRangeStart);
        };
        const allRealHangouts = hangouts.filter(hangout => activityProfileIds.has(hangout.creator_id));
        const realHangouts = allRealHangouts.filter(hangout => isWithinAnalyticsRange(hangout.created_at));
        const allRealHangoutIds = new Set(allRealHangouts.map(hangout => hangout.id));
        const allRealApplications = applications.filter(application =>
          activityProfileIds.has(application.applicant_id) && allRealHangoutIds.has(application.hangout_id)
        );
        const allRealLikes = likes.filter(like => activityProfileIds.has(like.user_id) && allRealHangoutIds.has(like.hangout_id));
        const allRealComments = comments.filter(comment => activityProfileIds.has(comment.user_id) && allRealHangoutIds.has(comment.hangout_id));
        const realApplications = allRealApplications.filter(application => isWithinAnalyticsRange(application.created_at));
        const realLikes = allRealLikes.filter(like => isWithinAnalyticsRange(like.created_at));
        const realComments = allRealComments.filter(comment => isWithinAnalyticsRange(comment.created_at));
        const allAnalyticsTimestamps = [
          ...allRealHangouts.map(item => new Date(item.created_at).getTime()),
          ...allRealApplications.map(item => new Date(item.created_at).getTime()),
          ...allRealLikes.map(item => new Date(item.created_at).getTime()),
          ...allRealComments.map(item => new Date(item.created_at).getTime())
        ].filter(timestamp => !Number.isNaN(timestamp));
        const earliestAnalyticsTimestamp = allAnalyticsTimestamps.length > 0 ? Math.min(...allAnalyticsTimestamps) : nowTimestamp;
        const nowDate = new Date(nowTimestamp);
        const activityBuckets = (() => {
          if (adminAnalyticsRange === "daily") {
            return Array.from({ length: 8 }, (_, index) => {
              const end = nowTimestamp - ((7 - index) * 3 * 60 * 60 * 1000);
              const start = end - (3 * 60 * 60 * 1000);
              return {
                label: new Date(start).toLocaleTimeString(undefined, { hour: "numeric" }),
                start,
                end: index === 7 ? nowTimestamp + 1 : end
              };
            });
          }
          if (adminAnalyticsRange === "weekly") {
            return Array.from({ length: 7 }, (_, index) => {
              const start = new Date(nowTimestamp);
              start.setHours(0, 0, 0, 0);
              start.setDate(start.getDate() - (6 - index));
              const end = new Date(start);
              end.setDate(end.getDate() + 1);
              return {
                label: start.toLocaleDateString(undefined, { weekday: "short" }),
                start: start.getTime(),
                end: index === 6 ? nowTimestamp + 1 : end.getTime()
              };
            });
          }
          if (adminAnalyticsRange === "monthly") {
            return Array.from({ length: 6 }, (_, index) => {
              const start = new Date(nowTimestamp);
              start.setHours(0, 0, 0, 0);
              start.setDate(start.getDate() - ((5 - index) * 5 + 4));
              const end = new Date(start);
              end.setDate(end.getDate() + 5);
              return { label: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }), start: start.getTime(), end: index === 5 ? nowTimestamp + 1 : end.getTime() };
            });
          }
          if (adminAnalyticsRange === "yearly") {
            return Array.from({ length: 12 }, (_, index) => {
              const start = new Date(nowDate.getFullYear(), nowDate.getMonth() - (11 - index), 1);
              const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
              return { label: start.toLocaleDateString(undefined, { month: "short" }), start: start.getTime(), end: end.getTime() };
            });
          }
          const earliestDate = new Date(earliestAnalyticsTimestamp);
          const monthSpan = (nowDate.getFullYear() - earliestDate.getFullYear()) * 12 + nowDate.getMonth() - earliestDate.getMonth() + 1;
          if (monthSpan <= 12) {
            return Array.from({ length: Math.max(1, monthSpan) }, (_, index) => {
              const start = new Date(earliestDate.getFullYear(), earliestDate.getMonth() + index, 1);
              const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
              return { label: start.toLocaleDateString(undefined, { month: "short" }), start: start.getTime(), end: end.getTime() };
            });
          }
          const yearSpan = nowDate.getFullYear() - earliestDate.getFullYear() + 1;
          return Array.from({ length: yearSpan }, (_, index) => {
            const year = earliestDate.getFullYear() + index;
            return { label: String(year), start: new Date(year, 0, 1).getTime(), end: new Date(year + 1, 0, 1).getTime() };
          });
        })();
        const countInBucket = (createdAt: string, start: number, end: number) => {
          const timestamp = new Date(createdAt).getTime();
          return !Number.isNaN(timestamp) && timestamp >= start && timestamp < end;
        };
        const activityTrend = activityBuckets.map(bucket => {
          return {
            label: bucket.label,
            posts: realHangouts.filter(item => countInBucket(item.created_at, bucket.start, bucket.end)).length,
            joins: realApplications.filter(item => countInBucket(item.created_at, bucket.start, bucket.end)).length,
            likes: realLikes.filter(item => countInBucket(item.created_at, bucket.start, bucket.end)).length,
            comments: realComments.filter(item => countInBucket(item.created_at, bucket.start, bucket.end)).length
          };
        });
        const maxDailyActivity = Math.max(1, ...activityTrend.map(day => day.posts + day.joins + day.likes + day.comments));
        const realHangoutIds = new Set(realHangouts.map(hangout => hangout.id));
        const cohortApplications = realApplications.filter(application => realHangoutIds.has(application.hangout_id));
        const cohortLikes = realLikes.filter(like => realHangoutIds.has(like.hangout_id));
        const cohortComments = realComments.filter(comment => realHangoutIds.has(comment.hangout_id));
        const hangoutsWithApplications = new Set(cohortApplications.map(application => application.hangout_id)).size;
        const hangoutsWithAcceptedApplicants = new Set(
          cohortApplications.filter(application => application.status === "accepted").map(application => application.hangout_id)
        ).size;
        const hangoutsWithComments = new Set(cohortComments.map(comment => comment.hangout_id)).size;
        const funnelSteps = [
          { label: "Published", value: realHangouts.length, color: "bg-indigo-500" },
          { label: "Received requests", value: hangoutsWithApplications, color: "bg-sky-500" },
          { label: "Accepted someone", value: hangoutsWithAcceptedApplicants, color: "bg-emerald-500" },
          { label: "Started discussion", value: hangoutsWithComments, color: "bg-rose-400" }
        ];
        const funnelMaximum = Math.max(1, realHangouts.length);
        const activeCommunityUserIds = new Set<string>();
        realHangouts.forEach(item => activeCommunityUserIds.add(item.creator_id));
        realApplications.forEach(item => activeCommunityUserIds.add(item.applicant_id));
        realLikes.forEach(item => activeCommunityUserIds.add(item.user_id));
        realComments.forEach(item => activeCommunityUserIds.add(item.user_id));
        const pendingApplicationsCount = realApplications.filter(application => application.status === "pending").length;
        const totalEngagementActions = realApplications.length + realLikes.length + realComments.length;
        const engagementPerPost = realHangouts.length > 0 ? (totalEngagementActions / realHangouts.length).toFixed(1) : "0.0";
        const analyticsReports = reports.filter(report => isWithinAnalyticsRange(report.created_at));
        const resolvedReportsCount = analyticsReports.filter(report => report.status !== "pending").length;
        const safetyResolutionRate = analyticsReports.length > 0 ? Math.round((resolvedReportsCount / analyticsReports.length) * 100) : 0;
        const reportStatusCounts = {
          pending: analyticsReports.filter(report => report.status === "pending").length,
          approved: analyticsReports.filter(report => report.status === "approved").length,
          rejected: analyticsReports.filter(report => report.status === "rejected").length
        };
        const reportTotal = Math.max(1, analyticsReports.length);
        const pendingReportDegrees = (reportStatusCounts.pending / reportTotal) * 360;
        const approvedReportDegrees = pendingReportDegrees + (reportStatusCounts.approved / reportTotal) * 360;
        const analyticsPeriodLabel = adminAnalyticsRange === "daily" ? "Daily" : adminAnalyticsRange === "weekly" ? "Weekly" : adminAnalyticsRange === "monthly" ? "Monthly" : adminAnalyticsRange === "yearly" ? "Yearly" : "Lifetime";

        return (
          <div className="space-y-8 font-sans">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100/60 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-6 h-6 text-purple-600" />
                <h2 className="text-lg font-bold text-purple-950">Admin Center</h2>
              </div>
              <p className="text-xs text-purple-800 leading-relaxed max-w-2xl">
                Dear XMUM administrator, manage reports, evaluate appeals, and monitor safe statistics directly.
              </p>
              {/* Admin metrics counters */}
              <div className="grid grid-cols-2 md:grid-cols-7 gap-3 pt-3">
                <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm text-center">
                  <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Active Posts</span>
                  <strong className="text-xl text-gray-800 block mt-1">{totalActive}</strong>
                  <span className="mt-1 block text-[8px] font-black uppercase tracking-widest text-slate-300">Current</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm text-center">
                  <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Expired Posts</span>
                  <strong className="text-xl text-gray-800 block mt-1">{totalExpired}</strong>
                  <span className="mt-1 block text-[8px] font-black uppercase tracking-widest text-slate-300">Lifetime</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm text-center">
                  <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Total profiles</span>
                  <strong className="text-xl text-gray-800 block mt-1">{totalUsersCount}</strong>
                  <span className="mt-1 block text-[8px] font-black uppercase tracking-widest text-slate-300">Lifetime</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm text-center">
                  <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Test users</span>
                  <strong className="text-xl text-gray-800 block mt-1">{testUsersCount}</strong>
                  <span className="mt-1 block text-[8px] font-black uppercase tracking-widest text-slate-300">Lifetime</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm text-center">
                  <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Highest Pets</span>
                  <strong className="text-xl text-gray-800 block mt-1">{highestCompanionPets}</strong>
                  <span className="mt-1 block text-[8px] font-black uppercase tracking-widest text-slate-300">Lifetime</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm text-center bg-rose-50/20">
                  <span className="text-xs text-rose-600 block uppercase tracking-wider font-semibold">Pending Reports</span>
                  <strong className="text-xl text-rose-700 block mt-1">{pendingReportsList.length}</strong>
                  <span className="mt-1 block text-[8px] font-black uppercase tracking-widest text-rose-300">Current</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm text-center bg-amber-50/20">
                  <span className="text-xs text-amber-600 block uppercase tracking-wider font-semibold">Pending Appeals</span>
                  <strong className="text-xl text-amber-700 block mt-1">{pendingAppealsList.length}</strong>
                  <span className="mt-1 block text-[8px] font-black uppercase tracking-widest text-amber-300">Current</span>
                </div>
              </div>
            </div>

            {/* Real Usage Analytics section */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col gap-3 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display font-extrabold text-sm sm:text-base text-gray-900 flex items-center gap-2">
                    📈 Platform Activity & Usage Analytics
                  </h3>
                  <p className="mt-1 text-[9px] font-semibold text-slate-400">
                    Period filters apply to activity metrics. Profile and companion statistics are marked as lifetime.
                  </p>
                </div>
                <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 sm:w-auto" aria-label="Analytics period">
                  {([
                    ["daily", "Daily"],
                    ["weekly", "Weekly"],
                    ["monthly", "Monthly"],
                    ["yearly", "Yearly"],
                    ["lifetime", "Lifetime"]
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAdminAnalyticsRange(value)}
                      aria-pressed={adminAnalyticsRange === value}
                      className={`flex-1 rounded-lg px-3 py-1.5 text-[10px] font-black transition-all sm:flex-none ${
                        adminAnalyticsRange === value
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Demographics Card */}
                {(() => {
                  const maleCount = demographicsProfiles.filter(p => {
                    const normalizedGender = (p.gender || "").toLowerCase();
                    return normalizedGender.includes("male") && !normalizedGender.includes("female");
                  }).length;
                  const femaleCount = demographicsProfiles.filter(
                    p => (p.gender || "").toLowerCase().includes("female")
                  ).length;
                  return (
                    <div className="bg-slate-50 p-4.5 rounded-2xl border border-gray-100/60 flex flex-col justify-between">
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Student Demographics</h4>
                          <span className="rounded-full bg-white px-2 py-1 text-[8px] font-black uppercase tracking-widest text-slate-400 shadow-sm">Lifetime</span>
                        </div>
                        <div className="space-y-3 mt-4">
                          <div>
                            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                              <span>Male Students</span>
                              <span>{maleCount} ({demographicsUsersCount > 0 ? Math.round((maleCount/demographicsUsersCount)*100) : 0}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full" style={{ width: `${demographicsUsersCount > 0 ? (maleCount/demographicsUsersCount)*100 : 0}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                              <span>Female Students</span>
                              <span>{femaleCount} ({demographicsUsersCount > 0 ? Math.round((femaleCount/demographicsUsersCount)*100) : 0}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-pink-500 h-full" style={{ width: `${demographicsUsersCount > 0 ? (femaleCount/demographicsUsersCount)*100 : 0}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-4 leading-normal">
                        Aggregated anonymous profile metadata based on verified student registrations on campus.
                      </p>
                    </div>
                  );
                })()}

                <div className="bg-slate-50 p-4.5 rounded-2xl border border-gray-100/60 flex flex-col justify-between">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Companion Activity</h4>
                      <span className="rounded-full bg-white px-2 py-1 text-[8px] font-black uppercase tracking-widest text-slate-400 shadow-sm">Lifetime</span>
                    </div>
                    <div className="space-y-2 mt-4 text-xs text-gray-600">
                      <div className="flex items-center justify-between gap-3">
                        <span>Total pets recorded</span>
                        <strong className="text-gray-900">{totalCompanionPets}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Average per real profile</span>
                        <strong className="text-gray-900">
                          {companionStatsProfiles.length > 0 ? Math.round(totalCompanionPets / companionStatsProfiles.length) : 0}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Top petter</span>
                        <strong className="text-gray-900 text-right">
                          {topCompanionProfile ? `${topCompanionProfile.name} (${Math.max(0, Number(topCompanionProfile.companion_pet_count || 0))})` : "None yet"}
                        </strong>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-slate-200/70 pt-3">
                      <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-400">Pets by student</p>
                      <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                        {[...companionStatsProfiles]
                          .sort((a, b) => Number(b.companion_pet_count || 0) - Number(a.companion_pet_count || 0) || a.name.localeCompare(b.name))
                          .map(profile => (
                            <div key={profile.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-2.5 py-2 shadow-sm">
                              <div className="min-w-0">
                                <p className="truncate text-[10px] font-bold text-slate-700">{profile.name}</p>
                                <p className="truncate text-[8px] font-semibold text-slate-400">{profile.student_id}</p>
                              </div>
                              <strong className="shrink-0 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-600">
                                {Math.max(0, Number(profile.companion_pet_count || 0))} pets
                              </strong>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-4 leading-normal">
                    These values are synced per student profile so they can be tracked in both the app and Supabase.
                  </p>
                </div>

                {/* Plan categories shares */}
                {(() => {
                  const categoriesCount = realHangouts
                    .reduce((acc, h) => {
                      const category = deriveHangoutCategory(h);
                      acc[category] = (acc[category] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                  const sortedCategories = (Object.entries(categoriesCount) as Array<[string, number]>)
                    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                    .slice(0, 6);

                  return (
                    <div className="bg-slate-50 p-4.5 rounded-2xl border border-gray-100/60 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Popular Categories</h4>
                        <div className="space-y-2 text-xs">
                          {sortedCategories.map(([category, count]) => (
                            <div key={category} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                              <span className="font-semibold text-gray-600 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                {category}
                              </span>
                              <strong className="text-gray-900 font-black">{count} plans</strong>
                            </div>
                          ))}
                          {Object.keys(categoriesCount).length === 0 && (
                            <p className="text-gray-400 text-[11px] italic py-2">No category data recorded yet.</p>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-4 leading-normal">
                        Breakdown of categories student creators schedule for peer meetups.
                      </p>
                    </div>
                  );
                })()}

                {/* Coordination Success rate card */}
                {(() => {
                  const totalApps = realApplications.length;
                  const acceptedApps = realApplications.filter(a => a.status === "accepted").length;
                  const acceptanceRate = totalApps > 0 ? Math.round((acceptedApps / totalApps) * 100) : 0;

                  return (
                    <div className="bg-slate-50 p-4.5 rounded-2xl border border-gray-100/60 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Coordination Success Rate</h4>
                        <div className="flex items-center gap-4 py-3">
                          <div className="w-14 h-14 rounded-full border-4 border-indigo-500 flex items-center justify-center bg-white shadow-sm shrink-0">
                            <span className="text-xs font-black text-indigo-700">{acceptanceRate}%</span>
                          </div>
                          <div className="space-y-1 text-[11px]">
                            <p className="text-gray-500"><strong className="text-gray-800 font-bold">{totalApps}</strong> applications submitted</p>
                            <p className="text-gray-500"><strong className="text-emerald-700 font-bold">{acceptedApps}</strong> successful matches</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 leading-normal">
                        Percentage of applicants approved and shared safe meeting coordinates by creators!
                      </p>
                    </div>
                  );
                })()}

                {/* Join request outcomes */}
                {(() => {
                  const outcomeCounts = [
                    { label: "Accepted", value: realApplications.filter(item => item.status === "accepted").length, color: "bg-emerald-500" },
                    { label: "Pending", value: realApplications.filter(item => item.status === "pending").length, color: "bg-amber-400" },
                    { label: "Rejected", value: realApplications.filter(item => item.status === "rejected").length, color: "bg-rose-400" },
                    { label: "Retracted", value: realApplications.filter(item => item.status === "retracted").length, color: "bg-slate-400" }
                  ];
                  const outcomeTotal = Math.max(1, realApplications.length);
                  return (
                    <div className="bg-slate-50 p-4.5 rounded-2xl border border-gray-100/60 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Join Request Outcomes</h4>
                        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-200">
                          {outcomeCounts.map(item => item.value > 0 && (
                            <div key={item.label} className={item.color} style={{ width: `${(item.value / outcomeTotal) * 100}%` }} title={`${item.label}: ${item.value}`} />
                          ))}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {outcomeCounts.map(item => (
                            <div key={item.label} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-2 text-[10px]">
                              <span className="flex items-center gap-1.5 font-semibold text-slate-500"><span className={`h-2 w-2 rounded-full ${item.color}`} />{item.label}</span>
                              <strong className="text-slate-800">{item.value}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-4 leading-normal">Shows whether hosts are keeping up with student requests during the selected period.</p>
                    </div>
                  );
                })()}

                {/* Conversation and appreciation */}
                {(() => {
                  const likedHangouts = new Set(cohortLikes.map(item => item.hangout_id)).size;
                  const discussedHangouts = new Set(cohortComments.map(item => item.hangout_id)).size;
                  const postTotal = Math.max(1, realHangouts.length);
                  const likedShare = Math.round((likedHangouts / postTotal) * 100);
                  const discussedShare = Math.round((discussedHangouts / postTotal) * 100);
                  return (
                    <div className="bg-slate-50 p-4.5 rounded-2xl border border-gray-100/60 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Conversation & Appreciation</h4>
                        <div className="mt-4 space-y-4">
                          <div>
                            <div className="mb-1 flex justify-between text-[10px] font-semibold text-slate-600"><span>Posts receiving likes</span><strong>{likedHangouts} ({likedShare}%)</strong></div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.min(100, likedShare)}%` }} /></div>
                          </div>
                          <div>
                            <div className="mb-1 flex justify-between text-[10px] font-semibold text-slate-600"><span>Posts with discussion</span><strong>{discussedHangouts} ({discussedShare}%)</strong></div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, discussedShare)}%` }} /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="rounded-xl bg-white p-2"><strong className="block text-sm text-slate-800">{realLikes.length}</strong><span className="text-[9px] font-bold text-slate-400">Total likes</span></div>
                            <div className="rounded-xl bg-white p-2"><strong className="block text-sm text-slate-800">{realComments.length}</strong><span className="text-[9px] font-bold text-slate-400">Comments</span></div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-4 leading-normal">Highlights how often published plans spark interest and useful conversation.</p>
                    </div>
                  );
                })()}

              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 border-t border-gray-100 pt-5">
                {[
                  { label: "Engaged students", value: activeCommunityUserIds.size, note: "Students with recorded activity" },
                  { label: "Actions per post", value: engagementPerPost, note: "Requests, likes and comments" },
                  { label: "Awaiting host reply", value: pendingApplicationsCount, note: "Pending join requests" },
                  { label: "Reports resolved", value: `${safetyResolutionRate}%`, note: `${resolvedReportsCount} of ${analyticsReports.length} reviewed` }
                ].map(metric => (
                  <div key={metric.label} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{metric.label}</p>
                    <strong className="mt-1 block text-xl font-black text-slate-800">{metric.value}</strong>
                    <p className="mt-1 text-[9px] font-semibold leading-relaxed text-slate-400">{metric.note}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">{analyticsPeriodLabel} Activity</h4>
                      <p className="mt-1 text-[10px] font-semibold text-slate-400">Community actions grouped for the selected period</p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-slate-500 shadow-sm">{activityTrend.reduce((sum, day) => sum + day.posts + day.joins + day.likes + day.comments, 0)} actions</span>
                  </div>
                  <div className="mt-5 flex h-40 items-end gap-1.5 sm:gap-3" role="img" aria-label={`${analyticsPeriodLabel} stacked activity chart`}>
                    {activityTrend.map(day => {
                      const total = day.posts + day.joins + day.likes + day.comments;
                      const segments = [
                        { value: day.posts, color: "bg-indigo-500", label: "posts" },
                        { value: day.joins, color: "bg-sky-400", label: "requests" },
                        { value: day.likes, color: "bg-rose-400", label: "likes" },
                        { value: day.comments, color: "bg-amber-400", label: "comments" }
                      ];
                      return (
                        <div key={day.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                          <span className="text-[9px] font-black text-slate-500">{total}</span>
                          <div className="flex h-28 w-full max-w-9 flex-col-reverse justify-start overflow-hidden rounded-t-lg bg-slate-200/70">
                            {segments.map(segment => segment.value > 0 && (
                              <div
                                key={segment.label}
                                title={`${segment.value} ${segment.label}`}
                                className={`${segment.color} w-full transition-all`}
                                style={{ height: `${Math.max(7, (segment.value / maxDailyActivity) * 100)}%` }}
                              />
                            ))}
                          </div>
                          <span className="text-[9px] font-bold text-slate-400">{day.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[9px] font-bold text-slate-500">
                    {[['bg-indigo-500','Posts'],['bg-sky-400','Requests'],['bg-rose-400','Likes'],['bg-amber-400','Comments']].map(([color, label]) => (
                      <span key={label} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Hangout Engagement Funnel</h4>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">How published plans progress into coordination and conversation</p>
                  <div className="mt-5 space-y-4">
                    {funnelSteps.map(step => {
                      const percentage = Math.round((step.value / funnelMaximum) * 100);
                      return (
                        <div key={step.label}>
                          <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-slate-600">
                            <span>{step.label}</span>
                            <span>{step.value} <span className="text-slate-400">({percentage}%)</span></span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-200/80">
                            <div className={`h-full rounded-full ${step.color} transition-all duration-500`} style={{ width: `${Math.min(100, percentage)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-5 rounded-xl bg-white p-3 text-[10px] font-semibold leading-relaxed text-slate-500">
                    {realHangouts.length === 0
                      ? "The funnel will populate as students publish and interact with hangouts."
                      : `${hangoutsWithAcceptedApplicants} of ${realHangouts.length} published hangouts have accepted at least one participant.`}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
                  <div
                    className="mx-auto flex h-28 w-28 items-center justify-center rounded-full"
                    style={{ background: analyticsReports.length === 0 ? '#e2e8f0' : `conic-gradient(#f59e0b 0deg ${pendingReportDegrees}deg, #10b981 ${pendingReportDegrees}deg ${approvedReportDegrees}deg, #94a3b8 ${approvedReportDegrees}deg 360deg)` }}
                    role="img"
                    aria-label={`Report outcomes: ${reportStatusCounts.pending} pending, ${reportStatusCounts.approved} approved, ${reportStatusCounts.rejected} rejected`}
                  >
                    <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                      <strong className="text-xl font-black text-slate-800">{analyticsReports.length}</strong>
                      <span className="text-[9px] font-bold uppercase text-slate-400">Reports</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Safety Review Outcomes</h4>
                    <p className="mt-1 text-[10px] font-semibold text-slate-400">Moderation workload and completed decisions</p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[
                        { label: "Pending", value: reportStatusCounts.pending, color: "bg-amber-400" },
                        { label: "Approved", value: reportStatusCounts.approved, color: "bg-emerald-500" },
                        { label: "Rejected", value: reportStatusCounts.rejected, color: "bg-slate-400" }
                      ].map(item => (
                        <div key={item.label} className="rounded-xl bg-white p-2.5 text-center shadow-sm">
                          <span className={`mx-auto mb-1.5 block h-2 w-2 rounded-full ${item.color}`} />
                          <strong className="block text-sm font-black text-slate-800">{item.value}</strong>
                          <span className="text-[8px] font-bold uppercase text-slate-400">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reports evaluation list */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-gray-900 border-b border-gray-50 pb-2">
                ⌛ Pending Safety Flags / Abuse Reports ({pendingReportsList.length})
              </h3>
              {pendingReportsList.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No pending safety reports submitted. Campus is clear!</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {pendingReportsList.map(rep => {
                    const reporter = profiles.find(p => p.id === rep.reporter_id) || { name: "Xiao Ming" };
                    const reported = profiles.find(p => p.id === rep.reported_user_id) || { name: "Sarah" };

                    return (
                      <div key={rep.id} className="border border-rose-100 rounded-2xl p-4 bg-rose-50/10 space-y-2.5 text-xs text-gray-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <p>Report ID: <code>{rep.id}</code></p>
                            <p className="mt-1">
                              Reporter: <strong>{reporter.name}</strong> against target: <strong>{reported.name}</strong>
                            </p>
                          </div>
                          <span className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                            Pending Review
                          </span>
                        </div>
                        <p className="bg-white text-gray-650 p-3 rounded-xl border border-gray-100">
                          " {rep.description} "
                        </p>
                        <div className="flex gap-2">
                          <button
                            id={`approve-report-${rep.id}`}
                            onClick={() => adminReviewReport(rep.id, "approved")}
                            className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                          >
                            Approve & Flag User
                          </button>
                          <button
                            id={`decline-report-${rep.id}`}
                            onClick={() => adminReviewReport(rep.id, "rejected")}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold px-3 py-1.5 rounded-lg text-xs"
                          >
                            Decline Report
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Appeals evaluation list */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-gray-900 border-b border-gray-50 pb-2">
                ⏳ Pending Ban Appeals / Revaluations ({pendingAppealsList.length})
              </h3>
              {pendingAppealsList.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No pending user appeals submitted.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {pendingAppealsList.map(app => {
                    const originalRep = reports.find(r => r.id === app.report_id);
                    const appellant = originalRep ? profiles.find(p => p.id === originalRep.reported_user_id) : null;

                    return (
                      <div key={app.id} className="border border-amber-150 p-4 rounded-2xl bg-amber-50/10 space-y-3 text-xs text-gray-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <p>Appeal number: <strong>#{app.appeal_number} / 5</strong></p>
                            <p className="mt-1">
                              Appellant: <strong>{appellant?.name || "Student"}</strong> ({appellant?.email})
                            </p>
                          </div>
                          <span className="bg-amber-100 text-amber-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                            Pending Appeal
                          </span>
                        </div>
                        <p className="bg-white p-3 rounded-xl border border-gray-100">
                          " {app.appeal_description} "
                        </p>
                        <div className="flex gap-2">
                          <button
                            id={`approve-appeal-${app.id}`}
                            onClick={() => adminReviewAppeal(app.id, "approved")}
                            className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                          >
                            Approve (Reset Flag)
                          </button>
                          <button
                            id={`decline-appeal-${app.id}`}
                            onClick={() => {
                              const reason = prompt("Enter decline reason directly:", "Violated basic code of conduct repeatedly.");
                              if (reason) adminReviewAppeal(app.id, "rejected", reason);
                            }}
                            className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                          >
                            Decline (Keep Ban)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );

      case "terms":
      case "privacy":
      case "safety":
      case "about":
      case "donation":
      case "bug-report":
        return (
          <StaticPages
            pageName={activeTab}
            onNavigateToChats={() => setActiveTab("chats")}
            onNavigateToBugReport={() => setActiveTab("bug-report")}
          />
        );

      default:
        return null;
    }
  };

  if (isAuthInitializing && (isReturningFromOAuth || hasPendingAuthRedirect)) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_35%),linear-gradient(180deg,_#fffaf6_0%,_#fffdf9_48%,_#fff7ed_100%)] text-slate-900 flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-[2rem] border border-amber-100/80 bg-white/90 shadow-[0_30px_80px_-40px_rgba(217,119,6,0.45)] backdrop-blur px-8 py-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">Signing you in...</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            We&apos;re restoring your XMUM Hangouts session and matching your student profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 text-slate-850 font-sans flex flex-col justify-between">
      {/* Navbar section with optimized vertical padding and responsive alignments */}
      <header className="sticky top-0 z-40 w-full max-w-full bg-white border-b border-gray-100/90 shadow-sm/5">
        <div className="max-w-7xl mx-auto min-h-16 px-4 sm:px-6 lg:px-8 py-3 sm:pt-[22px] sm:pb-5.5 flex items-center justify-between gap-3">
          
          {/* Logo on the left - cleaner and responsive */}
          <button
            id="nav-logo-btn"
            onClick={() => setActiveTab("feed")}
            className="flex min-w-0 items-center gap-1.5 pb-0 sm:gap-3 sm:pb-1 outline-none text-left hover:scale-[1.01] active:scale-95 transition-all duration-200 shrink"
          >
            {currentUser && <Logo size="sm" />}
            <div>
              <span className="font-display font-black text-sm min-[380px]:text-[15px] sm:text-lg text-gray-950 tracking-tight block whitespace-nowrap sm:pt-1.25">XMUM Hangouts</span>
            </div>
          </button>

          {currentUser ? (
            <>
              {/* Navigation Controls in the center for logged in users */}
              {currentUser.is_profile_complete && (
                <nav className="hidden md:flex items-center justify-center flex-1 gap-1.5 px-6">
                  <button
                    id="tab-feed-btn"
                    onClick={() => setActiveTab("feed")}
                    className={`px-4 py-2 rounded-2xl text-xs font-black transition-all duration-250 cursor-pointer hover:scale-[1.02] active:scale-95 ${
                      activeTab === "feed" ? "bg-rose-50 text-rose-600 shadow-sm" : "text-gray-500 hover:bg-slate-50/70 hover:text-rose-600"
                    }`}
                  >
                    Browse Plans
                  </button>
                  <button
                    id="tab-create-btn"
                    onClick={() => setActiveTab("create")}
                    className={`px-4 py-2 rounded-2xl text-xs font-black transition-all duration-250 cursor-pointer hover:scale-[1.02] active:scale-95 ${
                      activeTab === "create" ? "bg-rose-55 text-rose-600 shadow-sm" : "text-gray-500 hover:bg-slate-50/70 hover:text-rose-600"
                    }`}
                  >
                    Create Hangout
                  </button>
                  <button
                    id="tab-my-plans-btn"
                    onClick={() => setActiveTab("my-plans")}
                    className={`px-4 py-2 rounded-2xl text-xs font-black transition-all duration-250 cursor-pointer hover:scale-[1.02] active:scale-95 ${
                      activeTab === "my-plans" ? "bg-rose-50 text-rose-600 shadow-sm" : "text-gray-500 hover:bg-slate-50/70 hover:text-rose-600"
                    }`}
                  >
                    My Plans
                  </button>
                  <button
                    id="tab-chats-btn"
                    onClick={() => setActiveTab("chats")}
                    className={`relative px-4 py-2 rounded-2xl text-xs font-black transition-all duration-250 cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 ${
                      activeTab === "chats" ? "bg-rose-50 text-rose-600 shadow-sm" : "text-gray-500 hover:bg-slate-50/70 hover:text-rose-600"
                    }`}
                  >
                    {hasUnreadInbox && (
                      <span className="absolute top-1.5 left-2.5 h-2 w-2 rounded-full bg-rose-500 animate-pulse" aria-hidden="true" />
                    )}
                    Inbox
                    {hasUnreadInbox && (
                      <span className="bg-rose-500 text-[10px] text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse font-sans">
                        {myUnreadMsgsCount}
                      </span>
                    )}
                  </button>

                  {currentUser.is_admin && (
                    <button
                      id="tab-admin-btn"
                      onClick={() => setActiveTab("admin")}
                      className={`px-4 py-2 rounded-2xl text-xs font-black transition-all duration-250 cursor-pointer hover:scale-[1.02] active:scale-95 ${
                        activeTab === "admin" ? "bg-purple-100 text-purple-700 font-extrabold" : "text-purple-500 hover:bg-purple-50/30"
                      }`}
                    >
                      Admin Panel
                    </button>
                  )}
                </nav>
              )}

              {/* User profile / Actions triggers on the right */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <NotificationBell onOpenNotification={handleNotificationOpen} />
                <button
                  id="nav-profile-card-btn"
                  onClick={() => {
                    setActiveTab("profile");
                  }}
                  className={`p-0.5 sm:p-1 px-0.5 sm:px-3 rounded-full sm:rounded-2xl transition-all duration-200 text-xs flex items-center gap-2 hover:scale-[1.03] active:scale-95 border border-transparent sm:border-gray-100 cursor-pointer ${
                    activeTab === "profile" 
                      ? "bg-rose-50 text-rose-600 sm:border-rose-200 sm:bg-rose-55 font-black sm:shadow-sm ring-2 ring-rose-350 sm:ring-0" 
                      : "bg-transparent sm:bg-slate-50 hover:bg-slate-100 text-gray-600 font-semibold"
                  }`}
                  title="Customize student profile"
                >
                  {currentUser.is_profile_complete && currentUser.avatar_id && (
                    <AvatarSVG id={currentUser.avatar_id} size={28} petCount={currentUser.companion_pet_count} />
                  )}
                  <span className="truncate max-w-[80px] hidden sm:inline-block">My Profile</span>
                </button>

                {showNavLogoutConfirm ? (
                  <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 p-1 px-2 rounded-xl animate-in fade-in slide-in-from-right duration-200">
                    <span className="text-[10px] font-black text-rose-600 mr-1 animate-pulse">Sign out?</span>
                    <button
                      onClick={() => {
                        signOutSimulated();
                        setShowNavLogoutConfirm(false);
                      }}
                      className="text-[10px] font-bold text-white bg-rose-500 hover:bg-rose-600 px-2 py-0.5 rounded-lg transition-all cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowNavLogoutConfirm(false)}
                      className="text-[10px] font-bold text-gray-450 hover:text-gray-700 bg-white border border-gray-200 px-2 py-0.5 rounded-lg transition-all cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    id="nav-logout-btn"
                    onClick={() => {
                      setShowNavLogoutConfirm(true);
                      window.dispatchEvent(new CustomEvent("xmum-signout-intent", { detail: { name: currentUser?.name || "classmate" } }));
                    }}
                    className="p-2 text-gray-450 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer hidden sm:block"
                    title="Sign out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Unauthenticated / Guest Mode View: navigation options optimized on mobile to prevent clutter */
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                id="nav-login-lobby-btn"
                onClick={() => setShowLoginModal(true)}
                className="px-4 py-2 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-95 shadow-sm"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Body container */}
      <main className={`max-w-7xl mx-auto flex-grow w-full sm:px-6 lg:px-8 sm:pt-8 sm:pb-12 ${
        activeTab === "chats" || activeTab === "create" || activeTab === "my-plans"
          ? "px-0 pt-0 pb-0"
          : "px-2.5 pt-6 pb-12"
      }`}>
        <AnimatePresence mode="wait">
          {currentUser && !currentUser.is_profile_complete ? (
            <motion.div
              key="profile-setup"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <ProfileSetupForm />
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderTabContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

         {/* Footer sections */}
      <footer className="mx-auto mt-auto w-full max-w-7xl px-3 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-2.5 text-slate-400 sm:px-6 sm:py-3 lg:px-8">
        {/* Compact mobile footer */}
        <div className="border-t border-gray-100 pt-2.5 text-center sm:hidden">
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold">
            <button
              id="footer-get-app-button"
              onClick={() => { setActiveTab("get-app"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-white shadow-sm transition-all hover:bg-rose-600"
              aria-label="Get the Hangouts app"
            >
              <Download className="h-3 w-3 shrink-0" /> Get App
            </button>
            <button onClick={() => { setActiveTab("donation"); window.scrollTo(0, 0); }} className="flex cursor-pointer items-center justify-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-white shadow-sm transition-all hover:bg-rose-600">
              <Heart className="h-3 w-3 shrink-0 fill-white text-white" /> Donation
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[10px] font-bold text-slate-500">
            <button onClick={() => { setActiveTab("terms"); window.scrollTo(0, 0); }} className="cursor-pointer transition-colors hover:text-rose-500">Terms</button>
            <span className="text-slate-300" aria-hidden="true">•</span>
            <button onClick={() => { setActiveTab("privacy"); window.scrollTo(0, 0); }} className="cursor-pointer transition-colors hover:text-rose-500">Privacy</button>
            <span className="text-slate-300" aria-hidden="true">•</span>
            <button onClick={() => { setActiveTab("safety"); window.scrollTo(0, 0); }} className="cursor-pointer transition-colors hover:text-rose-500">Safety</button>
            <span className="text-slate-300" aria-hidden="true">•</span>
            <button onClick={() => { setActiveTab("about"); window.scrollTo(0, 0); }} className="cursor-pointer transition-colors hover:text-rose-500">About</button>
            <span className="text-slate-300" aria-hidden="true">•</span>
            <button onClick={() => { setActiveTab("bug-report"); window.scrollTo(0, 0); }} className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-rose-500"><Bug className="h-3 w-3" /> Report Bug</button>
          </div>
          <p className="mt-1.5 text-[9px] font-semibold text-slate-400">Vibe coded by a fellow XMUM student 💛</p>
        </div>

        {/* Compact desktop footer */}
        <div className="hidden flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-gray-100 py-2 text-[11px] sm:flex lg:justify-between">
          <p className="shrink-0 font-semibold text-slate-400">Vibe coded by a fellow XMUM student 💛</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-bold text-slate-500" aria-label="Footer links">
            <button onClick={() => { setActiveTab("terms"); window.scrollTo(0, 0); }} className="cursor-pointer transition-colors hover:text-rose-500">Terms</button>
            <button onClick={() => { setActiveTab("privacy"); window.scrollTo(0, 0); }} className="cursor-pointer transition-colors hover:text-rose-500">Privacy</button>
            <button onClick={() => { setActiveTab("safety"); window.scrollTo(0, 0); }} className="cursor-pointer transition-colors hover:text-rose-500">Safety</button>
            <button onClick={() => { setActiveTab("about"); window.scrollTo(0, 0); }} className="cursor-pointer transition-colors hover:text-rose-500">About</button>
            <button onClick={() => { setActiveTab("bug-report"); window.scrollTo(0, 0); }} className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-rose-500"><Bug className="h-3 w-3" /> Report Bug</button>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <button
              id="footer-get-app-button-desktop"
              onClick={() => { setActiveTab("get-app"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[10px] font-black text-white transition-colors hover:bg-slate-800"
            >
              <Download className="h-3 w-3" /> Get App
            </button>
            <button
              onClick={() => { setActiveTab("donation"); window.scrollTo(0, 0); }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1.5 text-[10px] font-black text-white transition-colors hover:bg-rose-600"
            >
              <Heart className="h-3 w-3 fill-white" /> Donation
            </button>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {showMobileInstallPrompt && (
          <motion.div
            id="mobile-install-prompt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-3 sm:p-4"
            onClick={() => setShowMobileInstallPrompt(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.98 }}
              onClick={event => event.stopPropagation()}
              className="relative bg-white rounded-[2rem] p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-rose-100 text-center"
            >
              <button
                onClick={() => setShowMobileInstallPrompt(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-50 cursor-pointer"
                aria-label="Close install suggestion"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="mx-auto mb-3 w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center">
                <AvatarSVG id="panda" size={52} />
              </div>
              <h2 className="text-lg font-black text-slate-900">Take Hangouts with you!</h2>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed mt-2">
                Add XMUM Hangouts to your Home Screen for faster access and optional push notifications.
              </p>
              <div className="grid gap-2 mt-5">
                <button
                  id="mobile-install-prompt-confirm"
                  onClick={async () => {
                    const result = await pwa.install();
                    setShowMobileInstallPrompt(false);
                    if (result !== "installed") {
                      setActiveTab("get-app");
                      window.scrollTo(0, 0);
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-2xl text-sm font-black cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" /> {pwa.ios ? "Show me how" : "Install the app"}
                </button>
                <button onClick={() => setShowMobileInstallPrompt(false)} className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer">
                  Maybe later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotificationPrompt && (
          <motion.div
            id="post-login-notification-prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-3 sm:p-4"
            onClick={() => setShowNotificationPrompt(false)}
          >
            <motion.div
              initial={{ y: 28, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 22, opacity: 0, scale: 0.98 }}
              onClick={event => event.stopPropagation()}
              className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-amber-100 bg-white p-5 sm:p-6 text-center shadow-2xl"
            >
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-rose-500 to-amber-400" />
              <button
                onClick={() => setShowNotificationPrompt(false)}
                className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 cursor-pointer"
                aria-label="Close notification suggestion"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <BellRing className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Stay in the loop?</h2>
              <p className="mt-2 text-xs sm:text-sm font-semibold leading-relaxed text-slate-500">
                Get helpful alerts for join requests, approvals, new chats, replies, and upcoming hangouts—even when this page is closed.
              </p>
              <div className="mt-5 grid gap-2">
                <button
                  id="post-login-enable-notifications"
                  onClick={() => {
                    setShowNotificationPrompt(false);
                    void pwa.enablePush().then(enabled => {
                      if (!enabled) {
                        setActiveTab("get-app");
                        window.scrollTo(0, 0);
                      }
                    });
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 py-3 text-sm font-black text-amber-950 transition-colors hover:bg-amber-500 cursor-pointer"
                >
                  <BellRing className="h-4 w-4" /> Enable notifications
                </button>
                <button
                  onClick={() => setShowNotificationPrompt(false)}
                  className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Not now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safety appeal modal popup */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            id="login-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[55] p-4"
          >
            <motion.div
              id="login-modal"
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6"
            >
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setMagicLinkSent(false);
                  setOtpCode("");
                  setMicrosoftOnlyAuthEmail(null);
                }}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 hover:bg-slate-100 p-1.5 rounded-full transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
              {!magicLinkSent && (
                <div className="text-center space-y-2 flex flex-col items-center justify-center">
                  <Logo size="md" />
                  <h1 id="landing-login-title" className="text-xl font-black text-gray-900 tracking-tight">XMUM Hangouts</h1>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                    Connect and hangout with other XMUM students.
                  </p>
                  <p className="text-[11px] sm:text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-2xl px-3 py-2 max-w-sm leading-relaxed">
                    Use your official university email only: <strong>@xmu.edu.my</strong>.
                  </p>
                </div>
              )}

              {magicLinkSent ? (
                <div className="space-y-6 pt-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-black text-gray-905">Check your student email!</h2>
                    <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                      We sent a 6-digit code to <strong className="text-gray-705">{loginEmail}</strong>
                    </p>
                    <p className="text-[11px] text-amber-700">
                      Only official <strong>@xmu.edu.my</strong> email accounts can log in.
                    </p>
                  </div>

                  {/* Primary: Enter 6-digit code verification section */}
                  <div className="space-y-4 text-left">
                    <label className="text-[10px] font-extrabold text-rose-500 uppercase tracking-widest block text-center">
                      Enter 6-Digit OTP Code
                    </label>
                    <div className="space-y-3">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="000000"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleVerifyOtp();
                          }
                        }}
                        disabled={isVerifyingOtp}
                        style={{ letterSpacing: "0.25em" }}
                        className="w-full text-center text-3xl font-extrabold py-3 bg-slate-50 border border-slate-200/70 focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-200/30 rounded-2xl outline-none transition-all text-slate-800 placeholder:text-slate-350 disabled:opacity-60"
                      />
                      <button
                        onClick={() => handleVerifyOtp()}
                        disabled={isVerifyingOtp}
                        className="w-full bg-rose-500 hover:bg-rose-600 font-extrabold text-white text-xs sm:text-sm py-3.5 rounded-2xl transition duration-150 shadow-sm flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
                      >
                        {isVerifyingOtp ? "Verifying..." : "Verify Code"}
                      </button>
                    </div>
                  </div>



                  <div className="pt-2 flex justify-center">
                    <button
                      onClick={() => {
                        setMagicLinkSent(false);
                        setShowLoginModal(false);
                        setOtpCode("");
                        setMicrosoftOnlyAuthEmail(null);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer px-4 py-2 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mode Selector Tabs */}
                  {!isMicrosoftOnlyAuth && (
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button
                        id="login-tab-otp"
                        type="button"
                        onClick={() => setLoginMode("otp")}
                        className={`flex-1 text-[11px] font-bold py-2 rounded-lg transition-all cursor-pointer ${
                          loginMode === "otp" ? "bg-white text-rose-500 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Authenticate with OTP
                      </button>
                      <button
                        id="login-tab-password"
                        type="button"
                        onClick={() => setLoginMode("password")}
                        className={`flex-1 text-[11px] font-bold py-2 rounded-lg transition-all cursor-pointer ${
                          loginMode === "password" ? "bg-white text-rose-500 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Sign In with Password
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 block">Student Email (@xmu.edu.my) <span className="text-rose-500">*</span></label>
                      <input
                        id="login-email-input"
                        type="email"
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        placeholder="studentID@xmu.edu.my"
                        required
                        disabled={isLoginLoading}
                        className="w-full bg-slate-50 border border-gray-200 focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 outline-none transition-all disabled:opacity-60"
                      />
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Please sign in with your university email only. Personal email addresses are not supported.
                      </p>
                    </div>

                    {isMicrosoftOnlyAuth && (
                      <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-3 text-[11px] leading-relaxed text-amber-900">
                        The verification code limit has been reached for this email today. Please continue with Microsoft sign-in first. If you already set a password before, you can still use it below.
                      </div>
                    )}

                    {isMicrosoftOnlyAuth && (
                      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 animate-in fade-in duration-150">
                        <div className="space-y-1 text-center">
                          <p className="text-xs font-black text-slate-900">Continue with Microsoft</p>
                          <p className="text-[11px] leading-relaxed text-slate-600">
                            New registrations must use Microsoft when the daily verification code limit has been reached.
                          </p>
                        </div>

                        <button
                          id="login-microsoft-btn"
                          type="button"
                          onClick={handleMicrosoftLogin}
                          disabled={isMicrosoftLoading}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-2xl text-xs sm:text-sm transition-colors duration-150 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          {isMicrosoftLoading ? "Redirecting to Microsoft..." : "Continue with Microsoft"}
                        </button>

                        <p className="text-[11px] text-slate-500 leading-relaxed text-center">
                          Password sign-in stays available below if you already set one earlier.
                        </p>
                      </div>
                    )}

                    {loginMode === "password" && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-700 block">Password <span className="text-rose-500">*</span></label>
                          <input
                            id="login-password-input"
                            type="password"
                            value={loginPassword}
                            onChange={e => setLoginPassword(e.target.value)}
                            placeholder="Enter your security password"
                            required
                            disabled={isLoginLoading}
                            className="w-full bg-slate-50 border border-gray-200 focus:border-rose-455 focus:bg-white focus:ring-2 focus:ring-rose-100 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 outline-none transition-all disabled:opacity-60"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setShowPasswordResetHelp(prev => !prev)}
                            className="text-[11px] font-bold text-rose-600 transition-colors hover:text-rose-700"
                          >
                            {showPasswordResetHelp ? "Hide password reset help" : "Need to reset your password?"}
                          </button>
                        </div>

                        {showPasswordResetHelp && (
                          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-3 text-[11px] leading-relaxed text-rose-900">
                            Sign in with your XMUM Microsoft account first, then open <strong>My Profile</strong> and use <strong>Reset Password</strong> there.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Removed simulateExpired checkbox option */}

                    {loginMode !== "password" && !isMicrosoftOnlyAuth && (
                      <button
                        id="login-submit-btn"
                        type="submit"
                        disabled={isLoginLoading}
                        className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-6 rounded-2xl text-xs sm:text-sm transition-colors duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        {isLoginLoading ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Processing...
                          </>
                        ) : (
                          loginMode === "password" ? "Sign In with Password" : "Send Verification OTP"
                        )}
                      </button>
                    )}

                    {loginMode === "password" && (
                      <button
                        id="login-submit-btn"
                        type="submit"
                        disabled={isLoginLoading}
                        className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-6 rounded-2xl text-xs sm:text-sm transition-colors duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        {isLoginLoading ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Processing...
                          </>
                        ) : (
                          "Sign In with Password"
                        )}
                      </button>
                    )}

                    {!isMicrosoftOnlyAuth && (
                      <div className="pt-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-slate-200" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">or</span>
                          <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        <button
                          id="login-microsoft-btn"
                          type="button"
                          onClick={handleMicrosoftLogin}
                          disabled={isMicrosoftLoading}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-2xl text-xs sm:text-sm transition-colors duration-150 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          {isMicrosoftLoading ? "Redirecting to Microsoft..." : "Continue with Microsoft"}
                        </button>

                        <p className="text-[11px] text-slate-500 leading-relaxed text-center">
                          Use Microsoft sign-in for normal login or first-time registration. If the OTP daily email limit is reached, existing users can use Password or Microsoft, while new users must use Microsoft.
                        </p>
                      </div>
                    )}
                  </form>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAppealModal && (
          <motion.div
            id="appeal-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              id="appeal-modal"
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setShowAppealModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-gray-950 font-black text-md">Write Safety Appeal</h3>
              <p className="text-xs text-gray-500">
                Provide context regarding safety reviews. Our moderator team will reevaluate your profile state carefully. Max 5 lifetime appeals.
              </p>
              <textarea
                id="appeal-text-input"
                value={appealText}
                onChange={e => setAppealText(e.target.value)}
                placeholder="Describe what occurred (Mandatory)..."
                className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-rose-450 h-24"
              />
              <button
                id="appeal-submit-btn"
                onClick={handleAppealSubmit}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors"
              >
                Submit Appeal
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reporter modal popup submission */}
      <AnimatePresence>
        {reportingHangoutId && (
          <motion.div
            id="reporting-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              id="reporting-modal"
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setReportingHangoutId(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-lg"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-center space-y-1.5">
                <span className="inline-flex p-3 rounded-full bg-rose-50 text-rose-500">
                  <Flag className="w-6 h-6" />
                </span>
                <h3 className="text-gray-950 font-black text-md">Report Safety Violation</h3>
                <p className="text-xs text-gray-500">
                  Is this classmate posting unsafe content or violating peer code of conduct? Note down specific coordinates or messages.
                </p>
              </div>
              <textarea
                id="report-text-input"
                value={reportText}
                onChange={e => setReportText(e.target.value)}
                placeholder="Describe the issue (Mandatory)..."
                className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none h-24 focus:ring-1 focus:ring-rose-400 focus:border-rose-400"
              />
              <button
                id="report-submit-btn"
                onClick={handleReportCreatorSubmit}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-sm"
              >
                File Safety Report
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingHangout && (
          <motion.div
            id="edit-hangout-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              id="edit-hangout-modal"
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ type: "spring", duration: 0.28 }}
              className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-gray-100 relative space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={closeEditHangout}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-lg"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-gray-950 font-black text-lg">Edit Hangout</h3>
                <p className="text-xs text-slate-500">
                  The title stays fixed so applicants always recognize the plan they joined.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">Title</p>
                <p className="text-sm font-extrabold text-slate-800">
                  <span className="text-slate-900">{splitHangoutIntentParts(editingHangout.intention).lead}</span>{" "}
                  <span className="text-rose-500">{splitHangoutIntentParts(editingHangout.intention).detail}</span>
                </p>
              </div>

              <form onSubmit={handleEditHangoutSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={e => setEditLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-200"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Date</label>
                    <input
                      type="date"
                      value={editDate}
                      min={minimumEditDate}
                      max={maximumHangoutDate}
                      onChange={e => setEditDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Time</label>
                    <input
                      type="time"
                      value={editTime}
                      min={minimumEditTime}
                      onChange={e => setEditTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-200"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  If you change the time, it must stay at least 1 hour in the future and within the next 2 months.
                </p>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Meeting Point</label>
                  <input
                    type="text"
                    value={editMeetingPoint}
                    onChange={e => setEditMeetingPoint(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    maxLength={MAX_HANGOUT_DESCRIPTION_LENGTH}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-200 h-24 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Buddy Limit</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="No limit"
                      value={editMaxParticipants}
                      onChange={e => setEditMaxParticipants(e.target.value === "" ? "" : parseInt(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-200"
                    />
                  </div>
                  <label className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={editIsAnonymous}
                      onChange={e => setEditIsAnonymous(e.target.checked)}
                      className="accent-rose-500"
                    />
                    Post anonymously
                  </label>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <label className="block text-xs font-bold text-slate-800">Joining Criteria</label>
                  <RestrictionBuilder restrictions={editRestrictions} onChange={setEditRestrictions} />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={closeEditHangout}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Dialog Slider Carousel */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            id="onboarding-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              id="onboarding-modal"
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-rose-100 bg-white p-5 sm:p-6 text-center font-sans shadow-2xl space-y-5"
            >
              
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${onboardingSlides[Math.min(onboardingStep, onboardingSlides.length - 1)].tone} text-white shadow-lg`}>
                {React.createElement(onboardingSlides[Math.min(onboardingStep, onboardingSlides.length - 1)].icon, { className: "h-7 w-7" })}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">
                  Quick tour {Math.min(onboardingStep + 1, onboardingSlides.length)} of {onboardingSlides.length}
                </p>
                <h3 className="text-xl font-black tracking-tight text-slate-900">
                  {onboardingSlides[Math.min(onboardingStep, onboardingSlides.length - 1)].title}
                </h3>
                <p className="text-xs font-semibold leading-relaxed text-slate-500">
                  {onboardingSlides[Math.min(onboardingStep, onboardingSlides.length - 1)].text}
                </p>
              </div>
              <div className="space-y-2 text-left">
                {onboardingSlides[Math.min(onboardingStep, onboardingSlides.length - 1)].points.map(point => (
                  <div key={point} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-rose-500 shadow-sm">
                      <ChevronRight className="h-3 w-3" />
                    </span>
                    {point}
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-1.5" aria-label={`Tour step ${onboardingStep + 1} of ${onboardingSlides.length}`}>
                {onboardingSlides.map((slide, index) => (
                  <span key={slide.title} className={`h-1.5 rounded-full transition-all ${index === onboardingStep ? "w-6 bg-rose-500" : "w-1.5 bg-slate-200"}`} />
                ))}
              </div>

              {false && onboardingStep === 0 && (
                <>
                  <span className="text-4xl block">✨</span>
                  <h3 className="text-gray-900 font-extrabold text-lg">Welcome to XMUM Hangouts!</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    Discover, post, and coordinate peer activities with verified university classmates safely. No spam, no public exposure.
                  </p>
                </>
              )}

              {false && onboardingStep === 1 && (
                <>
                  <span className="text-4xl block">🛡️</span>
                  <h3 className="text-gray-900 font-extrabold text-lg">Safety Access Locks</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    Always choose public, busy on-campus spots to meet up. Meet point coordinates are locked and ONLY unlocked upon approved join requests.
                  </p>
                </>
              )}

              {false && onboardingStep === 2 && (
                <>
                  <span className="text-4xl block">🤐</span>
                  <h3 className="text-gray-900 font-extrabold text-lg">Anonymity & Flags</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    You can choose to join plans anonymously. Trust your classmates, keep listings safe, and instantly report suspicious profiles.
                  </p>
                </>
              )}

              <div className="flex gap-2.5 pt-2">
                {onboardingStep > 0 && (
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(onboardingStep - 1)}
                    className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200"
                  >
                    Back
                  </button>
                )}
                {onboardingStep < onboardingSlides.length - 1 ? (
                  <button
                    id="onboarding-next-btn"
                    onClick={() => setOnboardingStep(onboardingStep + 1)}
                    className="flex-grow bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    id="onboarding-finish-btn"
                    onClick={() => {
                      completeOnboarding();
                      // Navigate fresh to feed
                      setActiveTab("feed");
                    }}
                    className="flex-grow bg-teal-500 hover:bg-teal-600 text-white font-black py-2.5 px-4 rounded-xl text-xs transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-sm"
                  >
                    Start exploring
                  </button>
                )}
              </div>
              
              <button
                onClick={() => completeOnboarding()}
                className="text-[10px] font-bold text-gray-400 block mx-auto hover:text-gray-650 transition-colors duration-200 h-8"
              >
                Skip guide
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Mobile Sticky Bottom Navigation Bar for flawless responsiveness */}
      {currentUser && currentUser.is_profile_complete && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 w-full max-w-full overflow-hidden bg-white border-t border-gray-100/80 shadow-[0_-5px_15px_rgba(0,0,0,0.03)] px-4 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] flex justify-around items-center md:hidden">
          <button
            onClick={() => {
              setActiveTab("feed");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === "feed" ? "text-rose-600 scale-105" : "text-gray-400 hover:text-rose-500"
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[9px] font-black tracking-wide">Explore</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("create");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === "create" ? "text-rose-600 scale-105" : "text-gray-400 hover:text-rose-500"
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span className="text-[9px] font-black tracking-wide">Post</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("my-plans");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === "my-plans" ? "text-rose-600 scale-105" : "text-gray-400 hover:text-rose-500"
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[9px] font-black tracking-wide">Plans</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("chats");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`relative flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === "chats" ? "text-rose-600 scale-105" : "text-gray-400 hover:text-rose-500"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-black tracking-wide font-sans">Inbox</span>
            {hasUnreadInbox && (
              <span className="absolute top-1 right-2 h-2 w-2 rounded-full bg-rose-500 animate-pulse" aria-hidden="true" />
            )}
            {hasUnreadInbox && (
              <span className="absolute top-2 right-1.5 bg-rose-500 text-[8px] text-white px-1 py-0.2 rounded-full font-bold">
                {myUnreadMsgsCount}
              </span>
            )}
          </button>
        </nav>
      )}

      {/* Soft animated sliding Toast element (No endless bouncing, auto dismisses, positioned top-right to avoid companion overlap) */}
      {toast && (
        <div
          id="global-toast-message"
          className={`fixed top-24 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 w-[calc(100%-2rem)] sm:w-auto p-4 rounded-2xl shadow-xl border z-[100] flex items-center justify-between sm:justify-start gap-2 text-xs sm:text-sm font-bold max-w-sm transition-all duration-300 animate-in slide-in-from-top ${
            toast.type === "success" ? "bg-teal-50 border-teal-200 text-teal-800" :
            toast.type === "error" ? "bg-rose-50 border-rose-200 text-rose-800" :
            "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={clearToast} className="p-0.5 rounded hover:bg-gray-250/50 text-gray-405 cursor-pointer shrink-0">
            <X className="w-4 h-4 ml-1.5" />
          </button>
        </div>
      )}

      {/* Global Viewed profile detailed modal */}
      <AnimatePresence>
        {viewedProfile && (
          <motion.div
            id="global-profile-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setViewedProfile(null); }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              id="global-profile-modal"
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-rose-50/50 relative space-y-2"
            >
              <button
                id="global-profile-modal-close"
                onClick={() => setViewedProfile(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer z-10"
                title="Close Profile"
              >
                <X className="w-5 h-5" />
              </button>
              <ProfileCard
                profile={viewedProfile}
                viewMode="auto"
                flat={true}
                onBlockClick={() => toggleBlockUser(viewedProfile.id)}
                isBlockedByMe={currentUser ? blocks.some(b => b.blocker_id === currentUser.id && b.blocked_id === viewedProfile.id) : false}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Animated Mascot Cat Companion */}
      <CampusCompanion activeTab={activeTab} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
