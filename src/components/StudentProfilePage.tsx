/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { ProfileCard } from "./ProfileCard";
import { AvatarPicker } from "./AvatarPicker";
import { CompanionStateIcon } from "./CompanionStateIcon";
import { COUNTRIES, XMUM_PROGRAMS, LANGUAGES, STUDY_YEARS } from "../config/xmum-config";
import {
  companionBaseStateOption,
  companionTierStates,
  getCompanionStateById,
  getCompanionStateRequirement,
  getUnlockedCompanionState,
  isCompanionStateUnlocked,
  type CompanionActivityStats
} from "../config/companionConfig";
import { normalizeCompanionMessageFrequency, resolveStoredCompanionState, writeStoredCompanionState } from "../lib/companionState";
import type { PushState } from "../hooks/usePwa";
import { CountryFlag } from "./CountryFlag";
import { ProfilePageSkeleton } from "./LoadingSkeletons";
import { 
  User, 
  Settings, 
  ShieldCheck, 
  Globe, 
  BookOpen, 
  Calendar, 
  Users, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Plus, 
  X, 
  Fingerprint, 
  History,
  Lock,
  Heart,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  MessageCircle,
  Volume2,
  BellRing,
  Check
} from "lucide-react";

const COMPANION_PROGRESS_PAGE_SIZE = 25;
const COMPANION_PROGRESS_PAGINATION_THRESHOLD = 30;

type StudentProfilePageProps = {
  pushState: PushState;
  pushError: string;
  isPushBusy: boolean;
  notificationPermission: NotificationPermission;
  onEnablePush: () => Promise<boolean>;
  onDisablePush: () => Promise<boolean>;
};

export const StudentProfilePage: React.FC<StudentProfilePageProps> = ({
  pushState,
  pushError,
  isPushBusy,
  notificationPermission,
  onEnablePush,
  onDisablePush
}) => {
  const { 
    currentUser, 
    isAuthInitializing,
    hangouts,
    applications,
    likes,
    comments,
    updateProfile, 
    profiles, 
    switchUser, 
    showToast,
    onboardingStep,
    setOnboardingStep,
    setShowOnboarding,
    syncCompanionProgress,
    signOutSimulated,
    deleteCurrentAccount
  } = useApp();

  if (isAuthInitializing && !currentUser) {
    return <ProfilePageSkeleton />;
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <Lock className="w-12 h-12 text-rose-300 animate-pulse" />
        <h3 className="font-display font-semibold text-gray-900 text-lg">Sign-in Required</h3>
        <p className="text-xs text-gray-500 max-w-sm">Please sign in with your student account to customize your profile details.</p>
      </div>
    );
  }

  // Age calculation helper
  const calculateAge = (birthdateStr: string): number => {
    if (!birthdateStr) return 20;
    const birthDate = new Date(birthdateStr);
    const today = new Date();
    let calculated = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculated--;
    }
    return calculated;
  };

  // Edit fields state
  const [profileName, setProfileName] = useState(currentUser.name || "");
  const [profileCountry, setProfileCountry] = useState(currentUser.country || "Malaysia");
  const [profileLanguages, setProfileLanguages] = useState<string[]>(currentUser.languages || []);
  const [profileBirthdate, setProfileBirthdate] = useState(currentUser.birthdate || "2006-01-01");
  const [profileProgram, setProfileProgram] = useState(currentUser.program || "");
  const [profileStudyYear, setProfileStudyYear] = useState(currentUser.year_of_study || "");
  const [profileGender, setProfileGender] = useState(currentUser.gender === "Prefer not to say" ? "Male" : (currentUser.gender || "Male"));
  const [profileType, setProfileType] = useState<"foundation" | "degree" | "postgraduate" | "Not Specified" | "">(currentUser.student_type || "");
  const [profileBio, setProfileBio] = useState(currentUser.about_me || "");
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatar_id || "panda");
  const [profilePassword, setProfilePassword] = useState("");
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState("");
  
  // Custom language draft input
  const [customLanguage, setCustomLanguage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDemoSwitcherOpen, setIsDemoSwitcherOpen] = useState(false);
  const [showConfirmSignOut, setShowConfirmSignOut] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [deleteAccountConfirmationInput, setDeleteAccountConfirmationInput] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showPasswordResetPanel, setShowPasswordResetPanel] = useState(false);
  const [isCompanionProgressOpen, setIsCompanionProgressOpen] = useState(false);
  const [companionProgressPage, setCompanionProgressPage] = useState(0);
  const [companionProgress, setCompanionProgress] = useState(
    () => resolveStoredCompanionState(currentUser.email, currentUser)
  );
  const hasExistingPassword = Boolean(currentUser.password_hash || currentUser.password);
  const isCountryLocked = Boolean(currentUser.is_profile_complete && currentUser.country_last_changed_at);
  const isGenderLocked = Boolean(currentUser.is_profile_complete && currentUser.gender_last_changed_at);
  const deleteAccountConfirmationMatches =
    deleteAccountConfirmationInput.trim().toLowerCase() === currentUser.email.trim().toLowerCase();
  const companionPetCount = Math.max(0, Number(companionProgress.petCount || 0));
  const companionMessagesEnabled = companionProgress.messagesEnabled !== false;
  const companionVisible = companionProgress.companionVisible !== false;
  const companionMessageFrequency = normalizeCompanionMessageFrequency(companionProgress.messageFrequency);
  const companionMessageLevel = !companionVisible ? 0 : !companionMessagesEnabled ? 1 : companionMessageFrequency < 70 ? 2 : 3;
  const companionMessageFrequencyLabel = companionMessageLevel === 0
    ? "Removed"
    : companionMessageLevel === 1
      ? "Off"
      : companionMessageLevel === 2
        ? "Fewer"
        : "Full";
  const companionActivityStats: CompanionActivityStats = {
    hosted: new Set(hangouts.filter(hangout => hangout.creator_id === currentUser.id).map(hangout => hangout.id)).size,
    joined: new Set(applications.filter(application => application.applicant_id === currentUser.id && application.status === "accepted").map(application => application.hangout_id)).size,
    liked: new Set(likes.filter(like => like.user_id === currentUser.id).map(like => like.hangout_id)).size,
    commented: new Set(comments.filter(comment => comment.user_id === currentUser.id).map(comment => comment.hangout_id)).size
  };
  const stateIsUnlocked = (state: ReturnType<typeof getCompanionStateById>) =>
    Boolean(state && isCompanionStateUnlocked(state, companionPetCount, companionActivityStats, currentUser.is_admin));
  const companionUnlockProgress = Math.min(100, companionPetCount === 0 ? 0 : Math.max(4, (companionPetCount / 2000) * 100));
  const availableCountries = COUNTRIES.includes(profileCountry) ? COUNTRIES : [profileCountry, ...COUNTRIES];
  const companionUnlockedState = getUnlockedCompanionState(companionPetCount);
  const canChooseCompanionState = currentUser.is_admin || companionPetCount >= 1000 || companionTierStates.some(state => stateIsUnlocked(state));
  const companionSelectedState =
    canChooseCompanionState
      ? (() => {
          const selectedStateId =
            typeof companionProgress.selectedStateId === "string" ? companionProgress.selectedStateId : null;
          if (selectedStateId === companionBaseStateOption.id) {
            return companionBaseStateOption;
          }
          const selectedState = getCompanionStateById(selectedStateId);
          return stateIsUnlocked(selectedState) ? selectedState : companionUnlockedState;
        })()
      : companionUnlockedState;
  const companionProgressStates = [companionBaseStateOption, ...companionTierStates];
  const companionProgressUsesPagination = companionProgressStates.length > COMPANION_PROGRESS_PAGINATION_THRESHOLD;
  const companionProgressPageCount = companionProgressUsesPagination
    ? Math.ceil(companionProgressStates.length / COMPANION_PROGRESS_PAGE_SIZE)
    : 1;
  const visibleCompanionProgressStates = companionProgressUsesPagination
    ? companionProgressStates.slice(
        companionProgressPage * COMPANION_PROGRESS_PAGE_SIZE,
        (companionProgressPage + 1) * COMPANION_PROGRESS_PAGE_SIZE
      )
    : companionProgressStates;

  useEffect(() => {
    // Each mobile profile visit starts with the progress details folded.
    setIsCompanionProgressOpen(false);
    const selectedIndex = companionProgressStates.findIndex(state => state.id === companionSelectedState?.id);
    setCompanionProgressPage(selectedIndex >= 0 ? Math.floor(selectedIndex / COMPANION_PROGRESS_PAGE_SIZE) : 0);
  }, [currentUser.id]);

  useEffect(() => {
    const syncCompanionProgress = (event?: Event) => {
      if (event) {
        const customEvent = event as CustomEvent<any>;
        if (customEvent.detail) {
          setCompanionProgress(customEvent.detail);
          return;
        }
      }

      setCompanionProgress(resolveStoredCompanionState(currentUser.email, currentUser));
    };

    window.addEventListener("xmum-companion-state-updated", syncCompanionProgress);
    window.addEventListener("focus", syncCompanionProgress);
    return () => {
      window.removeEventListener("xmum-companion-state-updated", syncCompanionProgress);
      window.removeEventListener("focus", syncCompanionProgress);
    };
  }, [currentUser.email, currentUser.companion_pet_count, currentUser.companion_selected_state_id]);

  // Toggle active PII Shield
  const handleTogglePii = async () => {
    const nextVal = !currentUser.hide_details;
    const { success, error } = await updateProfile({ hide_details: nextVal });
    if (success) {
      showToast(
        nextVal 
          ? "PII Shield Activated. Your details are now hidden from casual browsing." 
          : "PII Shield Deactivated. Your profile details are public to other students.",
        "success"
      );
    } else if (error) {
      showToast(error, "error");
    }
  };

  const handleLangToggle = (lang: string) => {
    if (profileLanguages.includes(lang)) {
      setProfileLanguages(profileLanguages.filter(l => l !== lang));
    } else {
      setProfileLanguages([...profileLanguages, lang]);
    }
  };

  const handleAddCustomLang = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customLanguage.trim();
    if (clean && !profileLanguages.includes(clean)) {
      setProfileLanguages([...profileLanguages, clean]);
      setCustomLanguage("");
      showToast(`Added language: ${clean}`, "success");
    }
  };

  const handleRemoveLang = (lang: string) => {
    setProfileLanguages(profileLanguages.filter(l => l !== lang));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    if (!profileName.trim()) {
      showToast("Preferred Name is mandatory.", "error");
      setIsSaving(false);
      return;
    }
    const derivedAge = calculateAge(profileBirthdate);
    if (derivedAge < 15) {
      showToast("To ensure student safety, you must be at least 15 years old.", "error");
      setIsSaving(false);
      return;
    }
    if (!profileBio.trim() || profileBio.trim().length < 10) {
      showToast("Bio is required (minimum 10 characters).", "error");
      setIsSaving(false);
      return;
    }
    if (profilePassword && profilePassword.length < 8) {
      showToast("Security password must be at least 8 characters.", "error");
      setIsSaving(false);
      return;
    }
    if (profilePassword && profilePassword !== profilePasswordConfirm) {
      showToast("Please enter the same password in both password fields.", "error");
      setIsSaving(false);
      return;
    }

    const { success, error } = await updateProfile({
      name: profileName.trim(),
      country: profileCountry,
      languages: profileLanguages || [],
      age: derivedAge,
      birthdate: profileBirthdate,
      program: profileProgram || "Not Specified",
      year_of_study: profileStudyYear || "Not Specified",
      gender: profileGender,
      student_type: (profileType as any) || "Not Specified",
      about_me: profileBio.trim(),
      avatar_id: profileAvatar,
      ...(showPasswordResetPanel && profilePassword ? { password: profilePassword } : {}),
      is_profile_complete: true
    });

    setTimeout(() => {
      setIsSaving(false);
      if (success) {
        if (showPasswordResetPanel && profilePassword) {
          setProfilePassword("");
          setProfilePasswordConfirm("");
          setShowPasswordResetPanel(false);
          showToast("Your profile was updated and your password has been reset.", "success");
        } else {
          showToast("Your student profile has been updated successfully!", "success");
        }
      } else {
        showToast(error || "Could not save profile changes.", "error");
      }
    }, 450);
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    const result = await deleteCurrentAccount();
    setIsDeletingAccount(false);

    if (!result.success) {
      showToast(result.error || "We couldn't delete your account right now.", "error");
      return;
    }

    setDeleteAccountConfirmationInput("");
    setShowDeleteAccountConfirm(false);
  };

  const handleSelectCompanionState = (stateId: string | null) => {
    if (!canChooseCompanionState) {
      return;
    }

    const requestedState = getCompanionStateById(stateId);
    if (requestedState && !stateIsUnlocked(requestedState)) {
      showToast(`${getCompanionStateRequirement(requestedState)} to unlock ${requestedState.name}.`, "info");
      return;
    }

    try {
      const nextState = writeStoredCompanionState(currentUser.email, {
        ...companionProgress,
        petCount: companionPetCount,
        isPermanent: currentUser.is_admin || companionPetCount >= 1000,
        selectedStateId: stateId
      });
      setCompanionProgress(nextState);
      syncCompanionProgress(nextState);
      window.dispatchEvent(new CustomEvent("xmum-companion-state-updated", { detail: nextState }));

      const selected = getCompanionStateById(stateId);
      showToast(
        selected
          ? `Companion state changed to ${selected.name}.`
          : "Companion state updated.",
        "success"
      );
    } catch {
      showToast("We couldn't update the companion state right now.", "error");
    }
  };

  const updateCompanionMessagePreferences = (preferences: Pick<typeof companionProgress, "messagesEnabled" | "messageFrequency" | "companionVisible">) => {
    const nextState = writeStoredCompanionState(currentUser.email, {
      ...companionProgress,
      ...preferences,
      petCount: companionPetCount
    });
    setCompanionProgress(nextState);
    window.dispatchEvent(new CustomEvent("xmum-companion-state-updated", { detail: nextState }));
  };

  // Switch demo profiles
  const demoUsers = profiles.filter(p => p.id !== currentUser.id);

  // Compute if any field differs from the currently saved user details
  const hasChanges = 
    profileName !== (currentUser.name || "") ||
    profileCountry !== (currentUser.country || "Malaysia") ||
    profileBirthdate !== (currentUser.birthdate || "2006-01-01") ||
    profileProgram !== (currentUser.program || "") ||
    profileStudyYear !== (currentUser.year_of_study || "") ||
    profileGender !== (currentUser.gender === "Prefer not to say" ? "Male" : (currentUser.gender || "Male")) ||
    profileType !== (currentUser.student_type || "") ||
    profileBio !== (currentUser.about_me || "") ||
    profileAvatar !== (currentUser.avatar_id || "panda") ||
    profilePassword.length > 0 ||
    JSON.stringify(profileLanguages.slice().sort()) !== JSON.stringify((currentUser.languages || []).slice().sort());

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans" id="student-profile-page-root">
      
      {/* Visual Tab Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-rose-50 text-rose-500 rounded-2xl">
              <User className="w-6 h-6" />
            </span>
            Student Portal
          </h1>
        </div>

        {/* Quick Launch Onboarding & Log out */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={() => {
              setOnboardingStep(0);
              setShowOnboarding(true);
            }}
            className="text-xs font-bold text-gray-650 hover:text-rose-600 bg-white hover:bg-rose-50/50 border border-gray-200 hover:border-rose-200 px-4 py-2 rounded-2xl transition-all shadow-sm flex items-center gap-2 justify-center hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              Onboarding Guide
            </button>

          <button
            onClick={() => {
              setShowPasswordResetPanel(prev => !prev);
              if (showPasswordResetPanel) {
                setProfilePassword("");
                setProfilePasswordConfirm("");
              }
            }}
            className="text-xs font-bold text-gray-650 hover:text-rose-600 bg-white hover:bg-rose-50/50 border border-gray-200 hover:border-rose-200 px-4 py-2 rounded-2xl transition-all shadow-sm flex items-center gap-2 justify-center hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Fingerprint className="w-3.5 h-3.5 text-rose-500" />
            {showPasswordResetPanel
              ? "Close Password Reset"
              : hasExistingPassword
              ? "Reset Password"
              : "Add Password Login"}
          </button>
          
          {showConfirmSignOut ? (
            <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 p-1 px-2 rounded-2xl">
              <span className="text-[11px] font-black text-rose-600 mr-1 animate-pulse">Really sign out?</span>
              <button
                onClick={() => signOutSimulated()}
                className="text-[11px] font-bold text-white bg-rose-500 hover:bg-rose-600 px-2.5 py-1 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Yes
              </button>
              <button
                onClick={() => setShowConfirmSignOut(false)}
                className="text-[11px] font-bold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowConfirmSignOut(true);
                window.dispatchEvent(new CustomEvent("xmum-signout-intent", { detail: { name: currentUser?.name || "classmate" } }));
              }}
              className="text-xs font-bold text-rose-600 hover:text-white bg-white hover:bg-rose-500 border border-rose-200 hover:border-rose-500 px-4 py-2 rounded-2xl transition-all shadow-sm flex items-center gap-1.5 justify-center hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          )}
        </div>
      </div>

      {showPasswordResetPanel && (
        <div className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-black text-gray-900">
              {hasExistingPassword ? "Reset Your Password" : "Set Up Password Login"}
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed max-w-2xl">
              {hasExistingPassword
                ? "Choose a new password here for future password logins. Your current password stays active until you save this change."
                : "You can still use Microsoft sign-in, but adding a password gives you another way to log in later."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-gray-700 block">New Password</label>
              <input
                type="password"
                value={profilePassword}
                onChange={e => setProfilePassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-slate-50 border border-gray-200 focus:border-rose-455 focus:bg-white focus:ring-1 focus:ring-rose-455 rounded-xl px-4 py-2 text-xs sm:text-sm text-gray-700 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-gray-700 block">Confirm New Password</label>
              <input
                type="password"
                value={profilePasswordConfirm}
                onChange={e => setProfilePasswordConfirm(e.target.value)}
                placeholder="Re-enter the same password"
                className="w-full bg-slate-50 border border-gray-200 focus:border-rose-455 focus:bg-white focus:ring-1 focus:ring-rose-455 rounded-xl px-4 py-2 text-xs sm:text-sm text-gray-700 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main double column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (35% width on desktop) - Displays current card & simulation tools */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card visual preview marker */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block px-1">
              Your Public Student Card
            </span>
            <ProfileCard profile={currentUser} viewMode="full" />
            <p className="text-[10px] text-gray-400 px-1 text-center italic leading-relaxed">
              * Accepted hangout companions will always see your full verified student card details.
            </p>
          </div>

          {/* Device notification settings */}
          <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-850">Notifications</h3>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                pushState === "enabled" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}>
                {pushState === "enabled" ? "Enabled" : "Off"}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-gray-500">
              Receive join requests, approvals, chat messages, replies and hangout reminders on this device.
            </p>

            {pushError && <p className="text-xs font-bold text-rose-600">{pushError}</p>}

            {pushState === "enabled" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 py-2.5 text-xs font-black text-emerald-700">
                  <Check className="h-4 w-4" /> Notifications are enabled
                </div>
                <button
                  type="button"
                  disabled={isPushBusy}
                  onClick={() => void onDisablePush()}
                  className="w-full py-1.5 text-xs font-bold text-slate-400 hover:text-rose-500 disabled:cursor-wait disabled:opacity-50"
                >
                  {isPushBusy ? "Updating this device…" : "Turn off on this device"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isPushBusy || ["checking", "insecure", "unavailable", "unsupported", "denied"].includes(pushState)}
                onClick={() => void onEnablePush()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <BellRing className="h-4 w-4" />
                {isPushBusy || pushState === "checking"
                  ? "Checking this device…"
                  : notificationPermission === "granted"
                    ? "Reconnect notifications"
                    : "Enable notifications"}
              </button>
            )}
          </div>

          {/* Privacy Shielder settings */}
          <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-teal-500" />
                <h3 className="font-bold text-slate-850 text-sm">PII Safety Shield</h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                currentUser.hide_details ? "bg-teal-100 text-teal-800" : "bg-gray-100 text-gray-500"
              }`}>
                {currentUser.hide_details ? "Shield Active" : "Shield Idle"}
              </span>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed text-justify">
              When the safety shield is active, casual students searching the feed cannot view your home country, conversational languages, age, gender, or student type. These details are only revealed to the hangout planner and other accepted participants in the hangout when a hangout is confirmed.
            </p>

            <button
              onClick={handleTogglePii}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                currentUser.hide_details
                  ? "bg-teal-50 text-teal-700 hover:bg-teal-100/70 border border-teal-200"
                  : "bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200"
              }`}
            >
              {currentUser.hide_details ? (
                <>
                  <EyeOff className="w-4 h-4 text-teal-600" />
                  Disable PII Shield
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-gray-500" />
                  Enable PII Shield
                </>
              )}
            </button>
          </div>

          <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-850">Companion Messages</h3>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                companionMessagesEnabled ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500"
              }`}>
                {companionMessagesEnabled ? companionMessageFrequencyLabel : "Off"}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-gray-500">
              Choose how often your companion speaks. You can still pet and move it when messages are off.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-[10px] font-bold text-slate-500">
                <label htmlFor="companion-message-frequency">How often should your companion speak?</label>
                <span>{companionMessageFrequencyLabel}</span>
              </div>
              <input
                id="companion-message-frequency"
                type="range"
                min="0"
                max="3"
                step="1"
                value={companionMessageLevel}
                onChange={event => {
                  const level = Number(event.target.value);
                  updateCompanionMessagePreferences({
                    companionVisible: level > 0,
                    messagesEnabled: level > 1,
                    messageFrequency: level === 2 ? 40 : 100
                  });
                }}
                className="h-2 w-full cursor-pointer accent-rose-500"
                aria-label="Companion message frequency"
              />
              <div className="grid grid-cols-4 text-center text-[9px] font-semibold text-slate-400">
                <span className="text-left">Remove</span>
                <span>Off</span>
                <span>Fewer</span>
                <span className="text-right">Full</span>
              </div>
            </div>
          </div>

          {companionVisible && <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm">
            <button
              type="button"
              onClick={() => setIsCompanionProgressOpen(open => !open)}
              aria-expanded={isCompanionProgressOpen}
              aria-controls="companion-progress-details"
              className={`flex w-full items-center justify-between text-left transition-all sm:pointer-events-none ${
                isCompanionProgressOpen
                  ? "mb-4 border-b border-gray-50 pb-3"
                  : "-m-2 w-[calc(100%+1rem)] rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50 via-white to-amber-50 p-3 shadow-[0_6px_20px_rgba(244,63,94,0.10)]"
              } sm:m-0 sm:mb-4 sm:w-full sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b sm:border-gray-50 sm:bg-none sm:p-0 sm:pb-3 sm:shadow-none`}
            >
              <div className="flex items-center gap-2">
                <span className={`${isCompanionProgressOpen ? "" : "rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-rose-100"} sm:p-0 sm:shadow-none sm:ring-0`}>
                  <Heart className="w-5 h-5 fill-rose-100 text-rose-500" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-850 text-sm">Companion Progress</h3>
                  {!isCompanionProgressOpen && (
                    <span className="mt-0.5 flex items-center gap-1 text-[9px] font-bold text-rose-500 sm:hidden">
                      <Sparkles className="h-2.5 w-2.5" /> Tap to see your forms
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                  {companionPetCount} pets
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform sm:hidden ${isCompanionProgressOpen ? "rotate-180" : ""}`} />
              </div>
            </button>

            <div id="companion-progress-details" className={`${isCompanionProgressOpen ? "block" : "hidden"} space-y-4 sm:block`}>
              <div className="space-y-2">
                <div className="h-2 rounded-full bg-rose-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-400 via-orange-300 to-amber-300 transition-all duration-500"
                    style={{ width: `${companionUnlockProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {companionSelectedState
                    ? `${companionSelectedState.name}: ${companionSelectedState.summary}`
                    : "Headpat the companion to unlock forms at 5, 10, 20, 30, 40, 50, then every 50 pets up to 1000."}
                </p>
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-bold leading-relaxed text-amber-800">
                  Classic forms unlock with pets. Special activity forms unlock by hosting, joining, liking, and commenting on different hangouts.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 lg:grid-cols-5">
                    {visibleCompanionProgressStates.map(state => {
                      const active = companionSelectedState?.id === state.id;
                      const tierState = getCompanionStateById(state.id);
                      const unlocked = state.id === companionBaseStateOption.id || stateIsUnlocked(tierState);
                      const requirement = tierState ? getCompanionStateRequirement(tierState) : "Always available";
                      return (
                        <button
                          key={state.id}
                          type="button"
                          onClick={() => handleSelectCompanionState(state.id)}
                          disabled={!unlocked}
                          className={`group relative flex min-w-0 flex-col items-center rounded-2xl p-1.5 text-center transition-all cursor-pointer ${
                            active
                              ? "bg-rose-50 text-rose-900 ring-2 ring-rose-300"
                              : !unlocked
                                ? "cursor-not-allowed text-slate-400 opacity-55"
                              : "text-slate-700 hover:bg-rose-50/60 hover:text-rose-800"
                          }`}
                          aria-label={`${state.name}, ${requirement}${unlocked ? "" : ", locked"}`}
                        >
                          <span className={`relative mb-1.5 block h-14 w-14 rounded-full bg-white p-0.5 shadow-[0_3px_10px_rgba(244,63,94,0.10)] ring-1 ring-rose-100/80 transition-transform group-hover:scale-105 sm:h-16 sm:w-16 ${active ? "scale-105" : ""}`}>
                            <CompanionStateIcon stateId={state.id} special={Boolean(tierState && (tierState.count > 1000 || tierState.activityUnlock))} />
                            {!unlocked && (
                              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/45">
                                <Lock className="h-4 w-4 text-slate-500" />
                              </span>
                            )}
                          </span>
                          <span className="line-clamp-2 text-[9px] font-black leading-tight sm:text-[10px]">{state.name}</span>
                          <span className="mt-1 text-[8px] font-bold leading-tight text-slate-400 sm:text-[9px]">{requirement}</span>
                        </button>
                      );
                    })}
                </div>
                {companionProgressUsesPagination && (
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCompanionProgressPage(page => Math.max(0, page - 1))}
                      disabled={companionProgressPage === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-all hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Previous companion progress page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-10 text-center text-[10px] font-bold tabular-nums text-slate-500">
                      {companionProgressPage + 1} / {companionProgressPageCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCompanionProgressPage(page => Math.min(companionProgressPageCount - 1, page + 1))}
                      disabled={companionProgressPage === companionProgressPageCount - 1}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-all hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Next companion progress page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>}

          <div className="bg-white border border-rose-100 p-5 rounded-3xl shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-850 text-sm">Permanent Account Deletion</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                This removes your account, cancels any active hangouts you host, and keeps expired activity under a deleted-user label.
              </p>
            </div>

            {showDeleteAccountConfirm ? (
              <div className="space-y-3">
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-[11px] text-rose-800 leading-relaxed">
                  This action is permanent. Type <span className="font-black">{currentUser.email}</span> to confirm account deletion. Your active hangouts will be cancelled and affected students will be notified.
                </div>
                <input
                  type="text"
                  value={deleteAccountConfirmationInput}
                  onChange={(event) => setDeleteAccountConfirmationInput(event.target.value)}
                  placeholder="Type your email to confirm"
                  className="w-full px-3 py-2.5 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none text-xs text-slate-700 bg-white"
                  autoComplete="off"
                  spellCheck={false}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount || !deleteAccountConfirmationMatches}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    {isDeletingAccount ? "Deleting Account..." : "Delete Permanently"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteAccountConfirmationInput("");
                      setShowDeleteAccountConfirm(false);
                    }}
                    disabled={isDeletingAccount}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Keep Account
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDeleteAccountConfirmationInput("");
                  setShowDeleteAccountConfirm(true);
                }}
                className="w-full bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Delete My Account Permanently
              </button>
            )}
          </div>

          {/* Simulated Account Switcher (Only visible to Admin) */}
          {currentUser?.is_admin && (
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-5 rounded-3xl text-white shadow-xl space-y-4">
              <button
                type="button"
                onClick={() => setIsDemoSwitcherOpen(!isDemoSwitcherOpen)}
                className="w-full flex items-center justify-between hover:opacity-80 transition-opacity text-left cursor-pointer outline-none"
              >
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">Demo Account Switcher</h3>
                    <p className="text-[10px] text-slate-400">Instantly switch profiles to test peer coordination views.</p>
                  </div>
                </div>
                <span className="text-indigo-300 text-xs font-bold shrink-0 ml-2">
                  {isDemoSwitcherOpen ? "Collapse ▴" : "Expand ▾"}
                </span>
              </button>

              {isDemoSwitcherOpen && (
                <div className="space-y-4 pt-1 animate-in fade-in duration-200 border-t border-white/10">
                  {demoUsers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No other student accounts registered.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {demoUsers.map(user => (
                        <button
                          id={`simulation-switch-${user.id}`}
                          key={user.id}
                          onClick={() => switchUser(user.id)}
                          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 p-2.5 rounded-xl text-left text-xs transition-colors flex items-center justify-between group cursor-pointer"
                        >
                          <div>
                            <span className="flex items-center gap-1.5 font-black text-slate-100">{user.name}</span>
                            <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">{user.program} · {user.country || "Malaysia"}</span>
                          </div>
                          <span className="text-[9px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 px-2 py-0.5 rounded-full group-hover:scale-105 transition-transform">
                            Switch Focus
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (65% width on desktop) - Detailed editable form fields */}
        <div className="lg:col-span-7 bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Settings className="w-5 h-5 text-rose-500" />
            <h2 className="text-base sm:text-lg font-bold text-gray-950">Update Profile Details</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            
            {/* Preferred Avatar */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-gray-700 tracking-wide uppercase block">
                1. Select Digital Avatar
              </label>
              <AvatarPicker selectedId={profileAvatar} onChange={setProfileAvatar} petCount={currentUser.companion_pet_count || 0} isAdmin={currentUser.is_admin} />
            </div>

            {/* Profile Core Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Preferred Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-700 block">Preferred Name / Nickname <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  maxLength={40}
                  required
                  placeholder="e.g. Reyan"
                  className="w-full bg-slate-50 border border-gray-200 focus:border-rose-455 focus:bg-white focus:ring-1 focus:ring-rose-455 rounded-xl px-4 py-2 text-xs sm:text-sm text-gray-700 outline-none transition-all"
                />
              </div>

              {/* Birthdate */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-700 block">Birthdate <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  value={profileBirthdate}
                  onChange={e => setProfileBirthdate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  required
                  className="w-full bg-slate-50 border border-gray-200 focus:border-rose-455 focus:bg-white focus:ring-1 focus:ring-rose-455 rounded-xl px-4 py-2 text-xs sm:text-sm text-gray-700 outline-none transition-all"
                />
                {profileBirthdate && (
                  <div className="text-[10px] text-rose-500 font-semibold mt-0.5">
                    Calculated Age: {calculateAge(profileBirthdate)} years old
                  </div>
                )}
              </div>

              {/* Country */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 block">Home Country</label>
                <div className="relative">
                  <CountryFlag country={profileCountry} className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2" />
                <select
                  value={profileCountry}
                  onChange={e => setProfileCountry(e.target.value)}
                  disabled={isCountryLocked}
                  className={`w-full border rounded-xl pl-11 pr-4 py-2 text-xs sm:text-sm outline-none transition-all ${
                    isCountryLocked
                      ? "bg-slate-100 border-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-slate-50 border-gray-200 focus:border-rose-455 focus:bg-white focus:ring-1 focus:ring-rose-455 text-gray-700"
                  }`}
                >
                  {availableCountries.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                </div>
                <div className="text-[10px] text-gray-400 italic mt-0.5">
                  {isCountryLocked
                    ? "* Country has already been changed once and is now locked."
                    : "* Country can only be changed once after profile completion."}
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-700 block">Gender <span className="text-rose-500">*</span></label>
                <select
                  value={profileGender}
                  onChange={e => setProfileGender(e.target.value)}
                  disabled={isGenderLocked}
                  className={`w-full border rounded-xl px-4 py-2 text-xs sm:text-sm outline-none transition-all ${
                    isGenderLocked
                      ? "bg-slate-100 border-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-slate-50 border border-gray-200 focus:border-rose-455 focus:bg-white focus:ring-1 focus:ring-rose-455 text-gray-700"
                  }`}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <div className="text-[10px] text-gray-400 italic mt-0.5">
                  {isGenderLocked
                    ? "* Gender has already been changed once and is now locked."
                    : "* Gender can only be changed once after profile completion."}
                </div>
              </div>

              {/* Academic Program */}
              <div className="space-y-1.5 col-span-1 sm:col-span-2">
                <label className="text-xs font-extrabold text-gray-700 block">Academic Program / Department (Optional)</label>
                <select
                  value={profileProgram}
                  onChange={e => setProfileProgram(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 focus:border-rose-450 focus:bg-white focus:ring-1 focus:ring-rose-450 rounded-xl px-4 py-2 text-xs sm:text-sm text-gray-700 outline-none transition-all"
                >
                  <option value="">Select later / Skip</option>
                  {XMUM_PROGRAMS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Year of Study */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-700 block">Year of Study (Optional)</label>
                <select
                  value={profileStudyYear}
                  onChange={e => setProfileStudyYear(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 focus:border-rose-450 focus:bg-white focus:ring-1 focus:ring-rose-450 rounded-xl px-4 py-2 text-xs sm:text-sm text-gray-700 outline-none transition-all"
                >
                  <option value="">Select later / Skip</option>
                  {STUDY_YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Student Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-700 block">Enrollment Tier (Optional)</label>
                <select
                  value={profileType}
                  onChange={e => setProfileType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-gray-200 focus:border-rose-450 focus:bg-white focus:ring-1 focus:ring-rose-450 rounded-xl px-4 py-2 text-xs sm:text-sm text-gray-700 outline-none transition-all font-sans"
                >
                  <option value="">Select later / Skip</option>
                  <option value="foundation">Foundation Level</option>
                  <option value="degree">Degree Undergrad</option>
                  <option value="postgraduate">Postgraduate (Master/PhD)</option>
                </select>
              </div>
            </div>

            {/* Conversational Languages Custom Tags */}
            <div className="space-y-2 border-t border-gray-50 pt-4">
              <label className="text-xs font-extrabold text-gray-700 block">Conversational Languages</label>
              <p className="text-[10px] text-gray-400">Select programs or specify unique dialects you can converse in.</p>
              
              {/* Presets Grid */}
              <div className="flex flex-wrap gap-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-gray-100">
                {LANGUAGES.map(lang => {
                  const active = profileLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleLangToggle(lang)}
                      className={`text-[11px] font-black px-2.5 py-1 rounded-lg transition-colors ${
                        active 
                          ? "bg-rose-50 text-rose-600 border border-rose-200" 
                          : "bg-white hover:bg-gray-100 text-gray-500 border border-gray-200"
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="e.g. Malay, French"
                  value={customLanguage}
                  onChange={e => setCustomLanguage(e.target.value)}
                  className="bg-slate-50 border border-gray-200 focus:border-rose-450 focus:bg-white focus:ring-1 focus:ring-rose-450 rounded-xl px-3 py-1.5 text-xs text-gray-700 outline-none transition-all flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddCustomLang}
                  className="bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 p-2 px-3 rounded-xl text-xs font-bold text-gray-650 transition-all flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {/* Selection Summary Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {profileLanguages.map(lang => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                  >
                    {lang}
                    <button
                      type="button"
                      onClick={() => handleRemoveLang(lang)}
                      className="text-gray-400 hover:text-rose-600 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Biography */}
            <div className="space-y-1.5 border-t border-gray-50 pt-4">
              <label className="text-xs font-extrabold text-gray-700 block">Short Bio <span className="text-rose-500">*</span> <span className="text-gray-400 font-normal">(Min 10 characters)</span></label>
              <textarea
                value={profileBio}
                onChange={e => setProfileBio(e.target.value)}
                maxLength={400}
                required
                placeholder="What are your study interests or hobbies? (Min 10 characters)"
                className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-gray-200 focus:border-rose-450 focus:bg-white focus:ring-1 focus:ring-rose-450 rounded-xl outline-none h-28 transition-all"
              />
            </div>

            {/* Save Button */}
            <div className="pt-6 border-t border-gray-100 flex flex-col items-center justify-center w-full">
              <button
                type="submit"
                disabled={isSaving || !hasChanges}
                className="bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none text-white font-black px-12 py-3.5 rounded-2xl text-sm sm:text-base transition-all shadow-md flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 cursor-pointer max-w-xs w-full"
              >
                {isSaving ? "Saving..." : "Save Profile Details"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
