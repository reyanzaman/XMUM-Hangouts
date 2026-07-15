/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { COUNTRIES, XMUM_PROGRAMS, LANGUAGES, STUDY_YEARS } from "../config/xmum-config";
import { AvatarPicker } from "./AvatarPicker";
import { CountryFlag } from "./CountryFlag";
import { Plus, X, Heart, ShieldAlert, Calendar } from "lucide-react";

export function calculateAge(birthdateStr: string): number {
  if (!birthdateStr) return 20;
  const birthDate = new Date(birthdateStr);
  const today = new Date();
  let calculated = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    calculated--;
  }
  return calculated;
}

export const ProfileSetupForm: React.FC = () => {
  const { currentUser, updateProfile } = useApp();

  if (!currentUser) return null;

  // Form states
  const [name, setName] = useState(currentUser.name || "");
  const [country, setCountry] = useState(currentUser.country || "Malaysia");
  const [languages, setLanguages] = useState<string[]>(currentUser.languages || []);
  const [birthdate, setBirthdate] = useState(currentUser.birthdate || "2006-01-01");
  const [program, setProgram] = useState(currentUser.program || "");
  const [yearOfStudy, setYearOfStudy] = useState(currentUser.year_of_study || "");
  const [gender, setGender] = useState(currentUser.gender === "Prefer not to say" ? "Male" : (currentUser.gender || "Male"));
  const [studentType, setStudentType] = useState<"foundation" | "degree" | "postgraduate" | "Not Specified" | "">(currentUser.student_type || "");
  const [aboutMe, setAboutMe] = useState(currentUser.about_me || "");
  const [avatarId, setAvatarId] = useState(currentUser.avatar_id || "panda");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  
  // Custom language input state
  const [customLang, setCustomLang] = useState("");
  const [errorText, setErrorText] = useState("");
  const hasExistingPassword = Boolean(currentUser.password_hash || currentUser.password);
  const [showPasswordResetSection, setShowPasswordResetSection] = useState(!hasExistingPassword);
  const availableCountries = COUNTRIES.includes(country) ? COUNTRIES : [country, ...COUNTRIES];

  const handleToggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter(l => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const handleAddCustomLanguage = () => {
    if (customLang.trim() && !languages.includes(customLang.trim())) {
      setLanguages([...languages, customLang.trim()]);
      setCustomLang("");
    }
  };

  const handleLangRemove = (lang: string) => {
    setLanguages(languages.filter(l => l !== lang));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!name.trim()) {
      setErrorText("Name is mandatory.");
      return;
    }
    if (!birthdate) {
      setErrorText("Please specify your birthday.");
      return;
    }
    const derivedAge = calculateAge(birthdate);
    if (derivedAge < 15) {
      setErrorText("To ensure community safety, you must be at least 15 years old to register.");
      return;
    }
    if (!aboutMe.trim() || aboutMe.length < 10) {
      setErrorText("Please write a small bio about yourself (minimum 10 characters).");
      return;
    }
    if (!hasExistingPassword && !password) {
      setErrorText("For security, you must set an account password (minimum 8 characters) to login in future.");
      return;
    }
    if (password && password.length < 8) {
      setErrorText("For security, your password must be at least 8 characters.");
      return;
    }
    if (password && password !== passwordConfirm) {
      setErrorText("Please enter the same password in both fields.");
      return;
    }

    const { success, error } = await updateProfile({
      name: name.trim(),
      country, // non-changeable
      languages: languages.length > 0 ? languages : ["English"], // default to English if none selected
      age: derivedAge,
      birthdate,
      program: program || "Not Specified",
      year_of_study: yearOfStudy || "Not Specified",
      gender,
      student_type: (studentType as any) || "Not Specified",
      about_me: aboutMe.trim(),
      avatar_id: avatarId,
      ...(showPasswordResetSection && password ? { password } : {}),
      is_profile_complete: true
    });

    if (!success && error) {
      setErrorText(error);
    }
  };

  return (
    <div
      id="profile-setup-container"
      className="max-w-2xl mx-auto bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xl font-sans text-gray-700 space-y-6"
    >
      <div className="text-center space-y-2">
        <span className="inline-flex items-center justify-center p-3 rounded-2xl bg-rose-50 text-rose-500 animate-pulse">
          <Heart className="w-6 h-6 fill-rose-500" />
        </span>
        <h2 id="setup-wizard-title" className="text-xl font-black text-gray-900 tracking-tight">
          Complete Your Profile
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
          Let classmates know who you are.
        </p>
      </div>

      {errorText && (
        <div id="setup-error" className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" /> {errorText}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs sm:text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="font-black">Double-check the important details before you finish.</p>
              <p>
                Your student ID is permanent. Your country of origin and gender can each be changed once from My Profile after completion.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Locked student ID */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-400 capitalize">
              Your Student ID (Read Only)
            </label>
            <input
              id="setup-student-id-input"
              type="text"
              value={currentUser.student_id}
              disabled
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-400 cursor-not-allowed outline-none font-mono"
            />
          </div>

          {/* Name input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 capitalize">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="setup-name-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Xiao Ming"
              required
              className="w-full bg-white border border-gray-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-gray-700 outline-none transition-colors"
            />
          </div>

          {/* Country dropdown during onboarding */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500">
              Country / Place of Origin <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <CountryFlag country={country} className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2" />
            <select
              id="setup-country-input"
              value={country}
              onChange={e => setCountry(e.target.value)}
              required
              className="w-full bg-white border border-gray-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 rounded-xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-gray-700 outline-none transition-colors"
            >
              {availableCountries.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            </div>
            <div className="text-[10px] text-gray-400 italic">
              You can change this once later from My Profile after your profile is completed.
            </div>
          </div>

          {/* Birthday & Automatic Age */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              Birthdate <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              <input
                id="setup-birthdate-input"
                type="date"
                value={birthdate}
                required
                max={new Date().toISOString().split("T")[0]}
                onChange={e => setBirthdate(e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-gray-700 outline-none transition-colors"
              />
            </div>
            {birthdate && (
              <div className="text-[10px] text-rose-500 font-semibold">
                Auto-calculated Age: {calculateAge(birthdate)} years old
              </div>
            )}
          </div>

          {/* Academic program input (optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              Academic Program (Optional)
            </label>
            <select
              id="setup-program-select"
              value={program}
              onChange={e => setProgram(e.target.value)}
              className="w-full bg-white border border-gray-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm outline-none transition-colors"
            >
              <option value="">Select later / Skip</option>
              {XMUM_PROGRAMS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Year of studies drop list (optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              Academic Year (Optional)
            </label>
            <select
              id="setup-year-select"
              value={yearOfStudy}
              onChange={e => setYearOfStudy(e.target.value)}
              className="w-full bg-white border border-gray-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm outline-none transition-colors"
            >
              <option value="">Select later / Skip</option>
              {STUDY_YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Student type (optional) */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-bold text-gray-700">
              Student Type (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                { id: "foundation", label: "Foundation" },
                { id: "degree", label: "Degree" },
                { id: "postgraduate", label: "Postgrad" }
              ] as const).map(option => (
                <button
                  id={`setup-student-type-${option.id}`}
                  key={option.id}
                  type="button"
                  onClick={() => setStudentType(studentType === option.id ? "" : option.id)}
                  className={`flex-1 text-xs py-2 rounded-xl border font-semibold transition-all capitalize ${
                    studentType === option.id
                      ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gender choices */}
          <div className="space-y-1.5 sm:col-span-1">
            <label className="block text-xs font-bold text-gray-700">
              Gender <span className="text-rose-500">*</span>
            </label>
            <select
              id="setup-gender-select"
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="w-full bg-white border border-gray-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm outline-none transition-colors"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <div className="text-[10px] text-gray-400 italic">
              You can change this once later from My Profile after your profile is completed.
            </div>
          </div>

        </div>

        <div className="space-y-3 rounded-2xl border border-gray-100 bg-slate-50/55 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900">
                {hasExistingPassword ? "Password Reset" : "Set Password for Password Login"}
              </h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                {hasExistingPassword
                  ? "You can keep your current password or open this section to set a new one."
                  : "Create a password now so you can also sign in with email and password later."}
              </p>
            </div>

            {hasExistingPassword && (
              <button
                type="button"
                onClick={() => {
                  setShowPasswordResetSection(prev => !prev);
                  if (showPasswordResetSection) {
                    setPassword("");
                    setPasswordConfirm("");
                  }
                }}
                className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50"
              >
                {showPasswordResetSection ? "Cancel Reset" : "Reset Password"}
              </button>
            )}
          </div>

          {showPasswordResetSection && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  id="setup-password-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-white border border-gray-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm outline-none transition-colors text-slate-800"
                  required={!hasExistingPassword}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <input
                  id="setup-password-confirm-input"
                  type="password"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  placeholder="Re-enter the same password"
                  className="w-full bg-white border border-gray-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm outline-none transition-colors text-slate-800"
                  required={!hasExistingPassword}
                />
              </div>
            </div>
          )}
        </div>

        {/* Spoken languages multi select (optional) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-700">
            Languages You Speak (Optional)
          </label>
          
          {/* Active selections */}
          {languages.length > 0 && (
            <div id="setup-selected-languages" className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-rose-50/35 border border-dashed border-rose-100/50">
              {languages.map(lang => (
                <span
                  id={`setup-lang-badge-${lang.replace(/\s+/g, '')}`}
                  key={lang}
                  className="bg-white text-rose-600 border border-rose-200 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5"
                >
                  {lang}
                  <button type="button" onClick={() => handleLangRemove(lang)}>
                    <X className="w-3 h-3 hover:text-rose-800" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Quick recommendations */}
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map(lang => {
              const active = languages.includes(lang);
              return (
                <button
                  id={`setup-lang-toggle-${lang.replace(/\s+/g, '')}`}
                  key={lang}
                  type="button"
                  onClick={() => handleToggleLanguage(lang)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors border ${
                    active
                      ? "bg-rose-500 text-white border-rose-500"
                      : "bg-gray-150 text-gray-600 hover:bg-gray-200 border-gray-200/40"
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>

          {/* Add custom languages input */}
          <div className="flex gap-2">
            <input
              id="setup-custom-lang"
              type="text"
              value={customLang}
              onChange={e => setCustomLang(e.target.value)}
              placeholder="e.g. Malay, French"
              className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-rose-400"
            />
            <button
              id="setup-add-lang"
              type="button"
              onClick={handleAddCustomLanguage}
              className="bg-rose-500 hover:bg-rose-600 text-white text-xs px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1 shrink-0 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add custom
            </button>
          </div>
        </div>

        {/* Avatar Selection Grid */}
        <AvatarPicker selectedId={avatarId} onChange={setAvatarId} />

        {/* About user textarea info */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-700">
            About You / Bio <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="setup-about-input"
            value={aboutMe}
            onChange={e => setAboutMe(e.target.value)}
            placeholder="What are your study interests or hobbies? (Min 10 characters)"
            required
            className="w-full text-xs sm:text-sm p-4 bg-white border border-gray-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 rounded-2xl outline-none transition-colors h-28"
          />
        </div>

        {/* Submit */}
        <button
          id="setup-submit-btn"
          type="submit"
          className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition-colors duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          Complete Profile
        </button>
      </form>
    </div>
  );
};
