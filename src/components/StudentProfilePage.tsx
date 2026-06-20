/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { ProfileCard } from "./ProfileCard";
import { AvatarPicker } from "./AvatarPicker";
import { XMUM_PROGRAMS, COUNTRIES, LANGUAGES, STUDY_YEARS } from "../config/xmum-config";
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
  LogOut
} from "lucide-react";

export const StudentProfilePage: React.FC = () => {
  const { 
    currentUser, 
    updateProfile, 
    profiles, 
    switchUser, 
    showToast,
    onboardingStep,
    setOnboardingStep,
    setShowOnboarding,
    signOutSimulated
  } = useApp();

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
  const [profileCountry] = useState(currentUser.country || "Malaysia");
  const [profileLanguages, setProfileLanguages] = useState<string[]>(currentUser.languages || []);
  const [profileBirthdate, setProfileBirthdate] = useState(currentUser.birthdate || "2006-01-01");
  const [profileProgram, setProfileProgram] = useState(currentUser.program || "");
  const [profileStudyYear, setProfileStudyYear] = useState(currentUser.year_of_study || "");
  const [profileGender, setProfileGender] = useState(currentUser.gender === "Prefer not to say" ? "Male" : (currentUser.gender || "Male"));
  const [profileType, setProfileType] = useState<"foundation" | "degree" | "postgraduate" | "Not Specified" | "">(currentUser.student_type || "");
  const [profileBio, setProfileBio] = useState(currentUser.about_me || "");
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatar_id || "panda");
  const [profilePassword, setProfilePassword] = useState(currentUser.password || "");
  
  // Custom language draft input
  const [customLanguage, setCustomLanguage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDemoSwitcherOpen, setIsDemoSwitcherOpen] = useState(false);
  const [showConfirmSignOut, setShowConfirmSignOut] = useState(false);

  // Toggle active PII Shield
  const handleTogglePii = () => {
    const nextVal = !currentUser.hide_details;
    const { success, error } = updateProfile({ hide_details: nextVal });
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

  const handleSaveProfile = (e: React.FormEvent) => {
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
    if (!profilePassword.trim() || profilePassword.trim().length < 6) {
      showToast("Security password is required for subsequent logins (min 6 characters).", "error");
      setIsSaving(false);
      return;
    }

    const { success, error } = updateProfile({
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
      password: profilePassword.trim(),
      is_profile_complete: true
    });

    setTimeout(() => {
      setIsSaving(false);
      if (success) {
        showToast("Your student profile has been updated successfully!", "success");
      } else {
        showToast(error || "Could not save profile changes.", "error");
      }
    }, 450);
  };

  // Switch demo profiles
  const demoUsers = profiles.filter(p => p.id !== currentUser.id);

  // Compute if any field differs from the currently saved user details
  const hasChanges = 
    profileName !== (currentUser.name || "") ||
    profileBirthdate !== (currentUser.birthdate || "2006-01-01") ||
    profileProgram !== (currentUser.program || "") ||
    profileStudyYear !== (currentUser.year_of_study || "") ||
    profileGender !== (currentUser.gender === "Prefer not to say" ? "Male" : (currentUser.gender || "Male")) ||
    profileType !== (currentUser.student_type || "") ||
    profileBio !== (currentUser.about_me || "") ||
    profileAvatar !== (currentUser.avatar_id || "panda") ||
    profilePassword !== (currentUser.password || "") ||
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
              showToast("Launched Onboarding Guide.", "info");
            }}
            className="text-xs font-bold text-gray-650 hover:text-rose-600 bg-white hover:bg-rose-50/50 border border-gray-200 hover:border-rose-200 px-4 py-2 rounded-2xl transition-all shadow-sm flex items-center gap-2 justify-center hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            Onboarding Guide
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
                            <span className="font-black text-slate-100 block">{user.name}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{user.program} · {user.country || "Malaysia"}</span>
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
              <AvatarPicker selectedId={profileAvatar} onChange={setProfileAvatar} />
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
                <input
                  type="text"
                  value={profileCountry}
                  disabled
                  className="w-full bg-slate-100 border border-gray-200 text-gray-400 rounded-xl px-4 py-2 text-xs sm:text-sm outline-none cursor-not-allowed"
                />
                <div className="text-[10px] text-gray-400 italic mt-0.5">
                  * Locked. Country of origin cannot be updated. Note: Required for safety.
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-700 block">Gender <span className="text-rose-500">*</span></label>
                <select
                  value={profileGender}
                  onChange={e => setProfileGender(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 focus:border-rose-455 focus:bg-white focus:ring-1 focus:ring-rose-455 rounded-xl px-4 py-2 text-xs sm:text-sm text-gray-700 outline-none transition-all"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {/* Password Security */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-700 block">Account Password <span className="text-rose-500">*</span></label>
                <input
                  type="password"
                  value={profilePassword}
                  onChange={e => setProfilePassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full bg-slate-50 border border-gray-200 focus:border-rose-455 focus:bg-white focus:ring-1 focus:ring-rose-455 rounded-xl px-4 py-2 text-xs sm:text-sm text-gray-700 outline-none transition-all"
                />
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
