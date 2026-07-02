/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { supabase } from "./lib/supabase";
import { Hangout, Profile } from "./types";
import { motion, AnimatePresence } from "motion/react";
import {
  combineDateAndTimeToIso,
  formatDateInputValue,
  formatTimeInputValue,
  getMaximumHangoutDate,
  getRoundedMinimumTime,
  MIN_HANGOUT_DESCRIPTION_LENGTH,
  validateFutureHangoutDate
} from "./lib/hangouts";
import { matchesPrimaryAdminEmail } from "./lib/admin";
import { isDemoProfile, normalizeProfileEmail, pickCanonicalProfile } from "./lib/profiles";
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
import { ChatWindowSkeleton, FeedSkeleton, PortalSkeleton } from "./components/LoadingSkeletons";
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
  ShieldCheck,
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
  Trash2
} from "lucide-react";

const SYSTEM_DELETED_USER_ID = "deleted_user";
const RECENT_HANGOUT_WINDOW_MONTHS = 2;

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

const sortHangoutsForFeed = (items: Hangout[]) =>
  [...items].sort((a, b) => {
    const now = Date.now();
    const aEventTime = getHangoutEventTime(a);
    const bEventTime = getHangoutEventTime(b);
    const aIsUpcoming = aEventTime === null || aEventTime >= now;
    const bIsUpcoming = bEventTime === null || bEventTime >= now;

    if (aIsUpcoming !== bIsUpcoming) {
      return aIsUpcoming ? -1 : 1;
    }

    const statusRank = (hangout: Hangout) => (hangout.status === "active" ? 0 : hangout.status === "expired" ? 1 : 2);
    const rankDifference = statusRank(a) - statusRank(b);
    if (rankDifference !== 0) return rankDifference;

    if (aIsUpcoming && bIsUpcoming) {
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
    reports,
    appeals,
    chats,
    messages,
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
    triggerCronJobs,
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
  const [activeTab, setActiveTab] = useState<"feed" | "create" | "profile" | "my-plans" | "chats" | "admin" | "terms" | "privacy" | "safety" | "about" | "donation" | "bug-report">("feed");
  const adminToolProfiles = Array.from(
    new Map<string, Profile>(
      [...ADMIN_TOOL_TEST_PROFILES, ...profiles].map(profile => [profile.id, profile])
    ).values()
  );
  const [portalSubTab, setPortalSubTab] = useState<"hosted" | "requested">("hosted");
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Filter and search feed states
  const [searchLocation, setSearchLocation] = useState("");
  const [eligibleOnlyFilter, setEligibleOnlyFilter] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [showAllHangoutHistory, setShowAllHangoutHistory] = useState(false);
  const [datePeriodFilter, setDatePeriodFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [languageFilter, setLanguageFilter] = useState<"all" | "en" | "zh">("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
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
  }, [searchLocation, eligibleOnlyFilter, showExpired, showAllHangoutHistory, datePeriodFilter, languageFilter, genderFilter, activeTab]);

  // Create hangout input state
  const [createIntention, setCreateIntention] = useState("");
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

  // Developer / Assessor debug state toggle
  const [showTesterTools, setShowTesterTools] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [loginMode, setLoginMode] = useState<"otp" | "password">("otp");
  const [loginPassword, setLoginPassword] = useState("");
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [showPasswordResetHelp, setShowPasswordResetHelp] = useState(false);
  const [showNavLogoutConfirm, setShowNavLogoutConfirm] = useState(false);

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
            avatar_id: "panda",
            is_profile_complete: false,
            hide_details: false,
            is_admin: isPrimaryAdmin || email.toLowerCase().startsWith("admin"),
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
      showToast(res.message || "Security verification code sent! Check your student inbox.", "success");
    } else {
      if (res.otp_limit_reached || res.resend_expired) {
        showToast(res.error || "OTP sign-in is unavailable right now.", "error");
        if (res.allows_password_login) {
          setLoginMode("password");
        }
      } else {
        showToast(res.error || "Authentication failed. Try again.", "error");
      }
    }
  };

  const handleCreateHangoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createIntention.trim()) return showToast("Please write down what you want to do.", "error");
    if (!createLocation.trim()) return showToast("Where are you planning to do it?", "error");
    if (!createDate) return showToast("Please choose the date for your hangout.", "error");
    if (!createTime) return showToast("Please choose the time for your hangout.", "error");
    if (!createMeetingPoint.trim()) return showToast("Please declare a safe meeting point.", "error");
    if (!createAdditional.trim()) return showToast("Please add a short description so people know what to expect.", "error");
    if (createAdditional.trim().length < MIN_HANGOUT_DESCRIPTION_LENGTH) {
      return showToast(`Please make the description at least ${MIN_HANGOUT_DESCRIPTION_LENGTH} characters long.`, "error");
    }

    const eventDateTime = combineDateAndTimeToIso(createDate, createTime);
    if (!eventDateTime) return showToast("Please choose a valid date and time.", "error");

    const dateTimeError = validateFutureHangoutDate(eventDateTime);
    if (dateTimeError) return showToast(dateTimeError, "error");

    const { success, error } = createHangout({
      intention: createIntention.trim(),
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
      setCreateIntention("");
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
    setEditMeetingPoint(target.meeting_point);
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
    ? applications.filter(a => a.applicant_id === currentUser.id && a.status !== "retracted") 
    : [];

  const myCreatedHangouts = currentUser 
    ? hangouts.filter(h => h.creator_id === currentUser.id) 
    : [];
  const visibleHostedHangouts = myCreatedHangouts.filter(h =>
    showHostedPastPlans ? true : h.status === "active"
  );

  // Active unread messages indicator count
  const myUnreadMsgsCount = currentUser ? messages.filter(m => {
    const chat = chats.find(c => c.id === m.chat_id);
    if (!chat) return false;
    const isChatMember = chat.user_a_id === currentUser.id || chat.user_b_id === currentUser.id;
    return isChatMember && m.sender_id !== currentUser.id && !m.is_read;
  }).length : 0;
  const hasUnreadInbox = myUnreadMsgsCount > 0;

  // Render main user content views
  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <StudentProfilePage />;
      case "feed":
        if (showAppSkeletons) {
          return <FeedSkeleton />;
        }

        // Filter logic
        let feed = hangouts.filter(h => showExpired ? (h.status === "active" || h.status === "expired") : h.status === "active");

        // Search match everything (location, intention, category, host name)
        if (searchLocation.trim()) {
          const query = searchLocation.toLowerCase().trim();
          feed = feed.filter(h => {
            const matchLocation = h.location.toLowerCase().includes(query);
            const matchIntention = h.intention.toLowerCase().includes(query);
            const matchCategory = h.category?.toLowerCase()?.includes(query);
            
            // Find creator's profile
            const hostUser = profiles.find(p => p.id === h.creator_id);
            const matchHostName = hostUser ? hostUser.name.toLowerCase().includes(query) : false;
            
            return matchLocation || matchIntention || matchCategory || matchHostName;
          });
        }

        // Search dates by modern period buttons (today, upcoming week, upcoming month, all time)
        if (datePeriodFilter !== "all") {
          const nowTime = new Date().getTime();
          
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

        // Eligibility match
        if (eligibleOnlyFilter && currentUser) {
          feed = feed.filter(h => isEligibleForHangout(currentUser, h).eligible);
        }

        // Language filter
        if (languageFilter === "en") {
          feed = feed.filter(h => {
            const hostUser = profiles.find(p => p.id === h.creator_id);
            const hostEn = hostUser ? hostUser.languages.some(l => l.toLowerCase().includes("english")) : true;
            const restrictEn = h.restrictions.languages.length === 0 || h.restrictions.languages.some(l => l.toLowerCase().includes("english"));
            return hostEn && restrictEn;
          });
        } else if (languageFilter === "zh") {
          feed = feed.filter(h => {
            const hostUser = profiles.find(p => p.id === h.creator_id);
            const hostZh = hostUser ? hostUser.languages.some(l => l.toLowerCase().includes("chinese") || l.toLowerCase().includes("mandarin")) : false;
            const restrictZh = h.restrictions.languages.length === 0 || h.restrictions.languages.some(l => l.toLowerCase().includes("chinese") || l.toLowerCase().includes("mandarin"));
            return hostZh || restrictZh;
          });
        }

        // Gender filter
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

        // Always show deleted-user cards, but restrict demo/test cards to the primary admin account.
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
        feed = sortHangoutsForFeed(feed);

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
            <div className="bg-white border border-gray-100 rounded-2xl p-3 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
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
                    onClick={() => setShowExpired(!showExpired)}
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
                      onClick={() => setShowExpired(!showExpired)}
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

                  {/* Language */}
                  <div className="flex flex-row items-center gap-1.5 text-xs text-gray-500 shrink-0">
                    <span className="font-extrabold text-[9px] text-gray-400 uppercase tracking-widest font-sans">Language:</span>
                    <div className="flex gap-1 font-sans">
                      {(["all", "en", "zh"] as const).map(option => {
                        let label = "All";
                        if (option === "en") label = "English";
                        else if (option === "zh") label = "Chinese";
                        
                        const isSelected = languageFilter === option;
                        return (
                          <button
                            key={option}
                            id={`lang-filter-btn-${option}`}
                            type="button"
                            onClick={() => setLanguageFilter(option)}
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
                </div>

                {(datePeriodFilter !== "all" || searchLocation || eligibleOnlyFilter || languageFilter !== "all" || genderFilter !== "all") && (
                  <button
                    id="clear-filters-btn"
                    onClick={() => {
                      setSearchLocation("");
                      setEligibleOnlyFilter(false);
                      setDatePeriodFilter("all");
                      setLanguageFilter("all");
                      setGenderFilter("all");
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
          <div className="max-w-md mx-auto bg-white border border-rose-100/45 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm space-y-5 animate-in fade-in duration-350">
            {/* Minimal Header */}
            <div className="pb-2.5 border-b border-rose-100/30 flex items-center gap-2">
              <span className="text-rose-500 text-base sm:text-lg">✨</span>
              <h2 id="create-plan-title" className="text-base sm:text-lg font-display font-bold text-slate-800 tracking-tight">
                Plan a Hangout
              </h2>
            </div>

            <form onSubmit={handleCreateHangoutSubmit} className="space-y-4">
              
              {/* Intention statement */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  What would you like to plan? <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center bg-slate-50/40 border border-slate-100 focus-within:border-rose-300 focus-within:bg-white focus-within:ring-1 focus-within:ring-rose-200 rounded-xl transition-all duration-200 overflow-hidden">
                  <span className="pl-4 pr-1 text-xs sm:text-sm text-rose-500 font-extrabold shrink-0 select-none">
                    I want to
                  </span>
                  <input
                    id="create-intention"
                    type="text"
                    value={createIntention}
                    onChange={e => setCreateIntention(e.target.value)}
                    placeholder="do a group study for philosophy..."
                    required
                    maxLength={130}
                    className="w-full bg-transparent px-1 py-2 text-xs sm:text-sm text-slate-800 outline-none font-sans"
                  />
                </div>
                {createIntention.trim() && (
                  <p className="text-[10px] text-gray-400 font-medium italic mt-1 pl-1 bg-slate-50/50 p-1.5 rounded-lg border border-slate-100/30">
                    Sentence Preview: <span className="text-rose-600 font-bold">I want to {createIntention}</span>
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
                  className="w-full bg-slate-50/40 border border-slate-100 focus:border-rose-300 focus:bg-white focus:ring-1 focus:ring-rose-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 outline-none transition-colors font-sans"
                />
              </div>

              {/* Date & Time */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  When? <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
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
                      className="w-full bg-slate-50/40 border border-slate-100 focus:border-rose-300 focus:bg-white focus:ring-1 focus:ring-rose-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 outline-none transition-colors font-sans cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
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
                      className="w-full bg-slate-50/40 border border-slate-100 focus:border-rose-300 focus:bg-white focus:ring-1 focus:ring-rose-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 outline-none transition-colors font-sans cursor-pointer"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Choose a future date and time within the next 2 months. Same-day hangouts must be at least 30 minutes ahead.
                </p>
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
                <label className="block text-xs font-bold text-slate-800">
                  Meeting Point (Approved buddies only) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="create-meeting-point"
                  type="text"
                  value={createMeetingPoint}
                  onChange={e => setCreateMeetingPoint(e.target.value)}
                  placeholder="e.g. B1 in front of Sapid..."
                  required
                  className="w-full bg-slate-50/40 border border-slate-100 focus:border-rose-300 focus:bg-white focus:ring-1 focus:ring-rose-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 outline-none transition-colors font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="create-additional"
                  value={createAdditional}
                  onChange={e => setCreateAdditional(e.target.value)}
                  placeholder="Share what the plan is like, what to bring, or anything your group should know."
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50/40 border border-slate-100 focus:border-rose-300 focus:bg-white focus:ring-1 focus:ring-rose-200 rounded-xl outline-none h-24 transition-all font-sans resize-none"
                  required
                />
                <p className={`text-[10px] ${createAdditional.trim().length >= MIN_HANGOUT_DESCRIPTION_LENGTH ? "text-emerald-600" : "text-slate-400"}`}>
                  Minimum {MIN_HANGOUT_DESCRIPTION_LENGTH} characters. This helps people know what to expect.
                </p>
              </div>

              {/* Anonymous Checkbox */}
              <div className="flex items-center gap-2 py-0.5">
                <input
                  id="create-is-anonymous"
                  type="checkbox"
                  checked={createIsAnonymous}
                  onChange={e => setCreateIsAnonymous(e.target.checked)}
                  className="accent-rose-500 rounded text-rose-500 cursor-pointer w-4 h-4 shrink-0 font-sans"
                />
                <label htmlFor="create-is-anonymous" className="text-xs text-slate-600 font-medium cursor-pointer">
                  Post anonymously (Approve lists to reveal)
                </label>
              </div>

              {/* Additional Options */}
              <div className="pt-1.5">
                <button
                  id="toggle-advanced-create-btn"
                  type="button"
                  onClick={() => setShowAdvancedCreate(!showAdvancedCreate)}
                  className="flex items-center gap-1 text-xs text-rose-500 font-extrabold hover:text-rose-600 transition-all cursor-pointer"
                >
                  {showAdvancedCreate ? "Show fewer options ▲" : "Preferences, size limits & joining criteria ▼"}
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

              {/* Safety Warning */}
              <div id="safety-warning-muted" className="text-[10px] text-slate-400 bg-slate-50/60 rounded-xl p-2.5 border border-slate-100/40 leading-normal text-center">
                <span className="font-bold text-slate-500">⚠️ Safety Pledge:</span> Meet safely in public! Keep listings friendly and respectful. Offensive content triggers immediate lifetime exclusion.
              </div>

              {/* Submit button */}
              <div className="pt-2 border-t border-rose-100/10">
                <button
                  id="create-plan-submit-btn"
                  type="submit"
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-3 px-5 rounded-2xl text-xs sm:text-sm transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center font-display"
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
          <div className="space-y-6 font-sans max-w-4xl mx-auto px-1 sm:px-3">
            {/* Modern Header Container */}
            <div className="bg-gradient-to-r from-rose-500/5 via-rose-500/1 to-transparent rounded-3xl p-5 sm:p-6 border border-rose-100/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <span>My Hangouts Portal</span>
                  <span className="text-xs bg-rose-500 text-white font-black px-2 py-0.5 rounded-full">
                    {myCreatedHangouts.length + myApplications.length} Total
                  </span>
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
                  Hosted ({myCreatedHangouts.length})
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
                  Requests ({myApplications.length})
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
                      Posted Hangout Plans ({visibleHostedHangouts.length})
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
                    <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center shadow-sm flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-rose-50 text-rose-500 rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                        📢
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-700">
                          {myCreatedHangouts.length === 0 ? "No posted hangouts" : "No active hangouts in this view"}
                        </h3>
                        <p className="text-gray-400 text-xs mt-1 max-w-sm mx-auto">
                          {myCreatedHangouts.length === 0
                            ? "You haven't posted any hangout plans yet. Click 'Create Hangout' in the top navbar to announce a meetup."
                            : "Turn on past plans if you want to review expired or cancelled hangouts."}
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("create")}
                        className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-black px-4 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        Create My First Hangout
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5">
                      {visibleHostedHangouts.map(h => (
                        <div key={h.id} className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm hover:shadow-md/5 transition-all">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                              h.status === "active" ? "bg-teal-50 text-teal-700 border border-teal-100" : "bg-gray-100 text-gray-500"
                            }`}>
                              {h.status}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">Posted on {new Date(h.created_at).toLocaleDateString()}</span>
                          </div>
                          
                          <div>
                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">My Current Plan</p>
                            <h3 className="font-extrabold text-sm sm:text-base text-gray-900 font-sans mt-0.5">
                              I want to <span className="text-rose-500 underline decoration-rose-200 decoration-2 underline-offset-2">{h.intention}</span>
                            </h3>
                          </div>

                          <div className="bg-slate-50/60 rounded-2xl p-3 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" /> Location
                              </span>
                              <span className="font-bold text-slate-700 mt-0.5 block truncate">{h.location}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold block">Meeting Point</span>
                              <span className="font-bold text-slate-700 mt-0.5 block truncate">{h.meeting_point}</span>
                            </div>
                          </div>

                          <div className="bg-slate-50/60 rounded-2xl p-3 text-xs text-slate-600 space-y-2">
                            <p>
                              <span className="font-semibold text-slate-500">When:</span>{" "}
                              {new Date(h.event_datetime).toLocaleString([], {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit"
                              })}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-500">Description:</span> {h.additional_info}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                            {h.status === "active" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditHangout(h.id)}
                                  className="inline-flex items-center gap-1.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                  <PencilLine className="w-3.5 h-3.5" />
                                  Edit Hangout
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteHangout(h.id)}
                                  className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
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
                      ))}
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
                      Match Requests Sent ({myApplications.length})
                    </h2>
                  </div>

                  {myApplications.length === 0 ? (
                    <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center shadow-sm flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-rose-50 text-rose-500 rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                        🌟
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-700">No active match requests</h3>
                        <p className="text-gray-400 text-xs mt-1 max-w-sm mx-auto">
                          You haven't submitted any hangout requests yet. Browse the home feed to discover other active student plans!
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("feed")}
                        className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-black px-4 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        Explore Feed
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {myApplications.map(app => {
                        const hangoutItem = hangouts.find(h => h.id === app.hangout_id);
                        if (!hangoutItem) return null;

                        const planner = profiles.find(p => p.id === hangoutItem.creator_id);

                        return (
                          <div key={app.id} className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md/5 transition-all text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                  app.status === "pending" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                  app.status === "accepted" ? "bg-teal-50 text-teal-700 border-teal-100" : "bg-rose-50 text-rose-700 border-rose-100"
                                }`}>
                                  {app.status}
                                </span>
                                
                                {app.is_anonymous && (
                                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                    Anonymous Application
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 font-mono sm:text-right font-bold">Sent {new Date(app.created_at).toLocaleDateString()}</span>
                            </div>

                            <div className="space-y-2">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target Hangout Intention</span>
                              <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
                                Interested in: "I want to <span className="text-rose-500 font-black">{hangoutItem.intention}</span>"
                              </h3>
                              
                               {/* Simple host row */}
                               <div className="flex items-center gap-2 pt-1">
                                 <span className="text-[10px] text-slate-400 font-bold">Planned by:</span>
                                 <button
                                   type="button"
                                   onClick={() => {
                                     const isAdmin = currentUser?.is_admin;
                                     const isAccepted = app.status === "accepted";
                                     if (hangoutItem.is_anonymous && !isAccepted && !isAdmin) {
                                       const hashValue = hangoutItem.creator_id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                       const animals = [
                                         "Panda", "Koala", "Otter", "Dolphin", "Cheetah", "Penguin", "Falcon", "Sloth", "Fox", "Squirrel",
                                         "Rabbit", "Deer", "Hedgehog", "Capybara", "Alpaca", "Wombat", "Platypus", "Lemur", "Meerkat", "Quokka",
                                         "Octopus", "Seahorse", "Turtle", "Flamingo", "Peacock", "Beaver", "Badger", "Owl"
                                       ];
                                       const idx = Math.abs(hashValue) % animals.length;
                                       const anonName = `Anonymous ${animals[idx]}`;
                                       const anonAvatar = `anon_${animals[idx].toLowerCase()}`;
                                       setViewedProfile({
                                         id: hangoutItem.creator_id,
                                         email: "",
                                         student_id: "",
                                         name: anonName,
                                         avatar_id: anonAvatar,
                                         country: planner?.country || "Malaysia",
                                         languages: planner?.languages || [],
                                         age: planner?.age || 20,
                                         program: planner?.program || "Undergraduate",
                                         year_of_study: planner?.year_of_study || "Year 1",
                                         gender: planner?.gender || "other",
                                         student_type: planner?.student_type || "degree",
                                         about_me: "This student is hosting this hangout anonymously to protect their privacy on the public feed.",
                                         is_profile_complete: true,
                                         hide_details: true,
                                         is_admin: false,
                                         is_blocked_globally: false,
                                         flag_status: planner?.flag_status || "none",
                                         appeal_count: planner?.appeal_count || 0,
                                         country_last_changed_at: null,
                                         name_last_changed_at: null
                                       });
                                     } else if (planner) {
                                       setViewedProfile(planner);
                                     }
                                   }}
                                   className="font-black text-rose-500 hover:text-rose-600 hover:underline cursor-pointer outline-none transition-all"
                                 >
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
                                 {planner?.home_country && !(hangoutItem.is_anonymous && app.status !== "accepted" && !currentUser?.is_admin) && (
                                   <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-100 font-medium">
                                     {planner.home_country}
                                   </span>
                                 )}
                               </div>
                            </div>

                            <div className="bg-slate-50/60 rounded-2xl p-3.5 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" /> Location
                                  </span>
                                  <span className="font-bold text-slate-700 mt-0.5 block truncate">{hangoutItem.location}</span>
                                </div>
                                <div>
                                  {app.status === "accepted" ? (
                                    <div>
                                      <span className="text-[10px] text-teal-600 font-extrabold block">🔓 Secure Meeting Point</span>
                                      <span className="font-black text-teal-700 mt-0.5 block truncate bg-teal-100/40 border border-teal-200/30 px-2.5 py-1 rounded-xl text-[11px]">
                                        "{hangoutItem.meeting_point}"
                                      </span>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="text-[10px] text-slate-400 font-semibold block">🔓 Secure Meeting Point</span>
                                      <span className="text-slate-400 mt-0.5 block italic text-[11px]">
                                        Locked until request is approved
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {app.status === "pending" && (
                              <div className="pt-1 flex justify-end">
                                <button
                                  id={`retract-app-btn-${app.id}`}
                                  onClick={() => {
                                    retractApplication(app.id);
                                  }}
                                  className="text-[10px] sm:text-xs bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 hover:text-rose-700 font-black px-4 py-2 rounded-xl shrink-0 cursor-pointer transition-all self-stretch sm:self-auto text-center font-display"
                                >
                                  Retract This Request
                                </button>
                              </div>
                            )}
                          </div>
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
        const statsProfiles = countableProfiles.filter(profile => !profile.is_admin);
        const analyticsProfiles = statsProfiles.length > 0 ? statsProfiles : countableProfiles;
        const statsProfileIds = new Set(analyticsProfiles.map(profile => profile.id));
        const testUsersCount = testProfilesByEmail.size;
        const totalActive = hangouts.filter(h => h.status === "active" && statsProfileIds.has(h.creator_id)).length;
        const totalExpired = hangouts.filter(h => h.status === "expired" && statsProfileIds.has(h.creator_id)).length;
        const totalUsersCount = countableProfiles.length;
        const statsUsersCount = statsProfiles.length;
        const analyticsUsersCount = analyticsProfiles.length;
        const totalCompanionPets = analyticsProfiles.reduce(
          (sum, profile) => sum + Math.max(0, Number(profile.companion_pet_count || 0)),
          0
        );
        const topCompanionProfile = [...analyticsProfiles].sort(
          (a, b) => Number(b.companion_pet_count || 0) - Number(a.companion_pet_count || 0)
        )[0] || null;
        const showingAdminFallbackStats = statsProfiles.length === 0 && countableProfiles.length > 0;
        const pendingReportsList = reports.filter(r => r.status === "pending");
        const pendingAppealsList = appeals.filter(a => a.status === "pending");

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
              {showingAdminFallbackStats && (
                <p className="text-[11px] text-purple-700 leading-relaxed">
                  Activity analytics are using your admin profile for now because no non-admin student profiles are active yet.
                </p>
              )}

              {/* Admin metrics counters */}
              <div className="grid grid-cols-2 md:grid-cols-7 gap-3 pt-3">
                <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm text-center">
                  <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Active Posts</span>
                  <strong className="text-xl text-gray-800 block mt-1">{totalActive}</strong>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm text-center">
                  <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Expired Expiries</span>
                  <strong className="text-xl text-gray-800 block mt-1">{totalExpired}</strong>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm text-center">
                  <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Total profiles</span>
                  <strong className="text-xl text-gray-800 block mt-1">{totalUsersCount}</strong>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm text-center">
                  <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Test users</span>
                  <strong className="text-xl text-gray-800 block mt-1">{testUsersCount}</strong>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm text-center">
                  <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Total Pets</span>
                  <strong className="text-xl text-gray-800 block mt-1">{totalCompanionPets}</strong>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm text-center bg-rose-50/20">
                  <span className="text-xs text-rose-600 block uppercase tracking-wider font-semibold">Pending Reports</span>
                  <strong className="text-xl text-rose-700 block mt-1">{pendingReportsList.length}</strong>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm text-center bg-amber-50/20">
                  <span className="text-xs text-amber-600 block uppercase tracking-wider font-semibold">Pending Appeals</span>
                  <strong className="text-xl text-amber-700 block mt-1">{pendingAppealsList.length}</strong>
                </div>
              </div>
            </div>

            {/* Real Usage Analytics section */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5">
              <h3 className="font-display font-extrabold text-sm sm:text-base text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                📈 Platform Activity & Usage Analytics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Demographics Card */}
                {(() => {
                  const maleCount = analyticsProfiles.filter(p => (p.gender || "").toLowerCase() === "male").length;
                  const femaleCount = analyticsProfiles.filter(p => (p.gender || "").toLowerCase() === "female").length;
                  return (
                    <div className="bg-slate-50 p-4.5 rounded-2xl border border-gray-100/60 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Student Demographics</h4>
                        <div className="space-y-3 mt-4">
                          <div>
                            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                              <span>Male Students</span>
                              <span>{maleCount} ({analyticsUsersCount > 0 ? Math.round((maleCount/analyticsUsersCount)*100) : 0}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full" style={{ width: `${analyticsUsersCount > 0 ? (maleCount/analyticsUsersCount)*100 : 0}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                              <span>Female Students</span>
                              <span>{femaleCount} ({analyticsUsersCount > 0 ? Math.round((femaleCount/analyticsUsersCount)*100) : 0}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-pink-500 h-full" style={{ width: `${analyticsUsersCount > 0 ? (femaleCount/analyticsUsersCount)*100 : 0}%` }} />
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
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Companion Activity</h4>
                    <div className="space-y-2 mt-4 text-xs text-gray-600">
                      <div className="flex items-center justify-between gap-3">
                        <span>Total pets recorded</span>
                        <strong className="text-gray-900">{totalCompanionPets}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Average per real profile</span>
                        <strong className="text-gray-900">
                          {analyticsUsersCount > 0 ? Math.round(totalCompanionPets / analyticsUsersCount) : 0}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Top petter</span>
                        <strong className="text-gray-900 text-right">
                          {topCompanionProfile ? `${topCompanionProfile.name} (${Math.max(0, Number(topCompanionProfile.companion_pet_count || 0))})` : "None yet"}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-4 leading-normal">
                    These values are synced per student profile so they can be tracked in both the app and Supabase.
                  </p>
                </div>

                {/* Plan categories shares */}
                {(() => {
                  const categoriesCount = hangouts
                    .filter(h => statsProfileIds.has(h.creator_id))
                    .reduce((acc, h) => {
                    const cat = h.category || "Study";
                    acc[cat] = (acc[cat] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);

                  return (
                    <div className="bg-slate-50 p-4.5 rounded-2xl border border-gray-100/60 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Popular Categories</h4>
                        <div className="space-y-2 text-xs">
                          {Object.entries(categoriesCount).map(([category, count]) => (
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
                  const totalApps = applications.filter(a => statsProfileIds.has(a.applicant_id)).length;
                  const acceptedApps = applications.filter(a => statsProfileIds.has(a.applicant_id) && a.status === "accepted").length;
                  const acceptanceRate = totalApps > 0 ? Math.round((acceptedApps / totalApps) * 100) : 100;

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
    <div className="min-h-screen bg-slate-50 text-slate-850 font-sans flex flex-col justify-between">
      {/* Navbar section with optimized vertical padding and responsive alignments */}
      <header className="bg-white border-b border-gray-100/90 sticky top-0 z-40 shadow-sm/5">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-[22px] md:pt-[22px] pb-3 md:pb-5.5 flex items-center justify-between">
          
          {/* Logo on the left - cleaner and responsive */}
          <button
            id="nav-logo-btn"
            onClick={() => setActiveTab("feed")}
            style={{ paddingBottom: "4px" }}
            className="flex items-center gap-2.5 sm:gap-3 outline-none text-left hover:scale-[1.01] active:scale-95 transition-all duration-200 shrink-0"
          >
            {currentUser && <Logo size="sm" />}
            <div>
              <span style={{ paddingTop: "5px" }} className="font-display font-black text-base sm:text-lg text-gray-950 tracking-tight block pt-1.25">XMUM Hangouts</span>
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
                <NotificationBell />
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
                    <AvatarSVG id={currentUser.avatar_id} size={28} />
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
      <main className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 flex-grow w-full pt-6 sm:pt-8 pb-12">
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

      {/* Peer Switcher and Tester tools for admin only */}
      {currentUser?.is_admin && !showTesterTools && (
        <button
          onClick={() => setShowTesterTools(true)}
          className="fixed bottom-3 left-3 bg-slate-900 border border-slate-850 text-rose-400 hover:text-rose-300 hover:bg-slate-800 hover:scale-[1.04] active:scale-95 text-[11px] font-black px-3.5 py-2 rounded-xl z-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg pointer-events-auto"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          Admin Chooser ▾
        </button>
      )}

      {showTesterTools && currentUser?.is_admin && (
        <div id="assessor-tools-container" className="fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 text-slate-300 py-3.5 px-4 z-50 text-xs font-sans">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-rose-500 text-[10px] uppercase font-bold text-white px-2 py-0.5 rounded">Admin Dashboard Chooser</span>
              <p className="text-[11px] text-slate-400">
                Swap between seeded classmate profiles to check dual peer chats, approvals, reports.
              </p>
            </div>
          
            <div className="flex flex-wrap gap-2 items-center">
              {adminToolProfiles.map(p => (
                <button
                  id={`tester-user-switch-${p.id}`}
                  key={p.id}
                  onClick={() => {
                    switchUser(p.id);
                    // Clear state to feed on switch so it's fresh
                    setActiveTab("feed");
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                    currentUser?.id === p.id
                      ? "bg-rose-500 text-white border-rose-500 font-extrabold"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {p.name} {p.is_admin ? "⭐" : ""}
                </button>
              ))}
          
              <button
                id="tester-cron-trigger"
                onClick={triggerCronJobs}
                className="px-2.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-bold text-[11px] cursor-pointer"
                title="Expire past events & trigger notifications"
              >
                Cron Check
              </button>
          
              <button
                onClick={() => setShowTesterTools(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-[11px] cursor-pointer transition-all transition-colors flex items-center gap-1"
                title="Collapse chooser dashboard"
              >
                Collapse ▴
              </button>
            </div>
          </div>
        </div>
      )}

         {/* Footer sections */}
      <footer className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 mt-auto border-t border-gray-100 py-4 pb-26 sm:py-6 text-center text-[10px] sm:text-[11px] text-slate-400 space-y-2 sm:space-y-3 w-full">
        <p className="font-semibold text-slate-400 text-[10px] sm:text-xs">
          "Vibe coded by a fellow XMUM student 💛"
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-slate-500 font-bold px-2 text-[10px] sm:text-xs">
          <button onClick={() => { setActiveTab("terms"); window.scrollTo(0, 0); }} className="hover:text-rose-500 transition-colors cursor-pointer">Terms</button>
          <span className="text-slate-200 hidden sm:inline">•</span>
          <button onClick={() => { setActiveTab("privacy"); window.scrollTo(0, 0); }} className="hover:text-rose-500 transition-colors cursor-pointer">Privacy</button>
          <span className="text-slate-200 hidden sm:inline">•</span>
          <button onClick={() => { setActiveTab("safety"); window.scrollTo(0, 0); }} className="hover:text-rose-500 transition-colors cursor-pointer">Safety</button>
          <span className="text-slate-200 hidden sm:inline">•</span>
          <button onClick={() => { setActiveTab("about"); window.scrollTo(0, 0); }} className="hover:text-rose-500 transition-colors cursor-pointer">About</button>
          <span className="text-slate-200 hidden sm:inline">•</span>
          <button
            onClick={() => { setActiveTab("bug-report"); window.scrollTo(0, 0); }}
            className="hover:text-rose-500 transition-colors cursor-pointer inline-flex items-center justify-center gap-1"
          >
            <Bug className="w-3 h-3 shrink-0" /> Report Bug
          </button>
          <span className="text-slate-200 hidden sm:inline">•</span>
          <button onClick={() => { setActiveTab("donation"); window.scrollTo(0, 0); }} className="hover:text-rose-500 transition-colors cursor-pointer flex items-center justify-center gap-1 text-rose-500"><Heart className="w-3 h-3 fill-rose-500 text-rose-500 shrink-0" /> Donation</button>
        </div>
        <p className="max-w-xl sm:max-w-none mx-auto text-[9px] sm:text-[10px] leading-relaxed text-slate-450 font-mono px-4">
          Disclaimer: Independently run by students. Not affiliated with or endorsed by Xiamen University Malaysia (XMUM).
        </p>
      </footer>

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
                onClick={() => setShowLoginModal(false)}
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
                <p className="text-sm font-extrabold text-slate-800">I want to {editingHangout.intention}</p>
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-200 h-24 resize-none"
                  />
                  <p className={`text-[10px] ${editDescription.trim().length >= MIN_HANGOUT_DESCRIPTION_LENGTH ? "text-emerald-600" : "text-slate-400"}`}>
                    Minimum {MIN_HANGOUT_DESCRIPTION_LENGTH} characters.
                  </p>
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
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 relative space-y-5 text-center font-sans"
            >
              
              {onboardingStep === 0 && (
                <>
                  <span className="text-4xl block">✨</span>
                  <h3 className="text-gray-900 font-extrabold text-lg">Welcome to XMUM Hangouts!</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    Discover, post, and coordinate peer activities with verified university classmates safely. No spam, no public exposure.
                  </p>
                </>
              )}

              {onboardingStep === 1 && (
                <>
                  <span className="text-4xl block">🛡️</span>
                  <h3 className="text-gray-900 font-extrabold text-lg">Safety Access Locks</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    Always choose public, busy on-campus spots to meet up. Meet point coordinates are locked and ONLY unlocked upon approved join requests.
                  </p>
                </>
              )}

              {onboardingStep === 2 && (
                <>
                  <span className="text-4xl block">🤐</span>
                  <h3 className="text-gray-900 font-extrabold text-lg">Anonymity & Flags</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    You can choose to join plans anonymously. Trust your classmates, keep listings safe, and instantly report suspicious profiles.
                  </p>
                </>
              )}

              <div className="flex gap-2.5 pt-2">
                {onboardingStep < 2 ? (
                  <button
                    id="onboarding-next-btn"
                    onClick={() => setOnboardingStep(onboardingStep + 1)}
                    className="flex-grow bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    Next Guide <ChevronRight className="w-3.5 h-3.5" />
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
                    Get Started!
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
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100/80 shadow-[0_-5px_15px_rgba(0,0,0,0.03)] px-4 py-1.5 flex justify-around items-center h-[72px] pb-2 md:hidden">
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
