/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Hangout, Profile, HangoutComment, HangoutApplication } from "../types";
import { useApp } from "../context/AppContext";
import { motion, AnimatePresence } from "motion/react";
import { isHangoutEditHistoryComment, parseHangoutEditHistoryEntry } from "../lib/hangouts";
import { AvatarSVG } from "./AvatarSVG";
import { ProfileCard } from "./ProfileCard";
import { ApplicantList } from "./ApplicantList";
import {
  Heart,
  MessageCircle,
  MapPin,
  Calendar,
  Users,
  Eye,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  UserCheck,
  AlertTriangle,
  Lock,
  Send,
  Flag,
  Trash2,
  X,
  Globe,
  Languages,
  GraduationCap,
  Award,
  Sparkles,
  Clock,
  ClipboardCheck,
  PencilLine
} from "lucide-react";

interface HangoutCardProps {
  hangout: Hangout;
  onReportCreator: () => void;
}

const ANONYMOUS_ANIMALS = [
  { name: "Panda 🐼", avatar: "panda" },
  { name: "Kitten 🐱", avatar: "cat" },
  { name: "Bunny 🐰", avatar: "bunny" },
  { name: "Bear 🐻", avatar: "bear" },
  { name: "Fox 🦊", avatar: "fox" },
  { name: "Koala 🐨", avatar: "koala" },
  { name: "Owl 🦉", avatar: "owl" },
  { name: "Frog 🐸", avatar: "frog" }
];

export const HangoutCard: React.FC<HangoutCardProps> = ({ hangout, onReportCreator }) => {
  const {
    currentUser,
    profiles,
    applications,
    likes,
    comments,
    blocks,
    toggleLike,
    addComment,
    applyToHangout,
    isEligibleForHangout,
    toggleBlockUser,
    viewedProfile,
    setViewedProfile,
    commentLikes,
    toggleCommentLike
  } = useApp();

  // Collapsible controls
  const [showFullInfo, setShowFullInfo] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showApplicants, setShowApplicants] = useState(false);
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [showEditHistory, setShowEditHistory] = useState(false);

  // Comments form
  const [newCommentText, setNewCommentText] = useState("");
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);

  // Apply inputs
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const [applyAnonymously, setApplyAnonymously] = useState(false);

  // Helpers to resolve items
  const realCreator = profiles.find(p => p.id === hangout.creator_id);
  const myApp = currentUser ? applications.find(a => a.hangout_id === hangout.id && a.applicant_id === currentUser.id && a.status !== "retracted") : null;
  const isCreatorMe = currentUser && hangout.creator_id === currentUser.id;
  const isAcceptedApplicant = myApp && myApp.status === "accepted";
  const canSeeRealIdentity = isCreatorMe || isAcceptedApplicant || currentUser?.is_admin;

  const getAnonAnimal = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash += id.charCodeAt(i);
    }
    return ANONYMOUS_ANIMALS[hash % ANONYMOUS_ANIMALS.length];
  };

  const anonAnimal = getAnonAnimal(hangout.creator_id);

  const creator = canSeeRealIdentity 
    ? (realCreator || {
        id: "unknown",
        name: "XMUM Student",
        avatar_id: "panda",
        flag_status: "none" as const,
        hide_details: false,
        is_admin: false,
        about_me: ""
      })
    : {
        id: hangout.creator_id,
        name: hangout.is_anonymous ? `Anonymous ${anonAnimal.name}` : (realCreator?.name || "XMUM Student"),
        avatar_id: hangout.is_anonymous ? anonAnimal.avatar : (realCreator?.avatar_id || "panda"),
        flag_status: realCreator?.flag_status || ("none" as const),
        hide_details: true,
        is_admin: false,
        about_me: "This student is hosting this hangout anonymously to protect their privacy on the public feed."
      };

  const renderGenderIcon = (gender: string) => {
    const g = gender?.toLowerCase() || "";
    if (g.includes("male") && !g.includes("female")) {
      return (
        <svg 
          className="w-3.5 h-3.5 text-sky-500 shrink-0 ml-1 inline-block self-center" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          title="Male"
        >
          <circle cx="10" cy="14" r="5" />
          <path d="M15 3h6v6" />
          <path d="M14 10l7-7" />
        </svg>
      );
    }
    if (g.includes("female")) {
      return (
        <svg 
          className="w-3.5 h-3.5 text-pink-400 shrink-0 ml-1 inline-block self-center" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          title="Female"
        >
          <circle cx="12" cy="9" r="5" />
          <path d="M12 14v7" />
          <path d="M9 18h6" />
        </svg>
      );
    }
    return (
      <svg 
        className="w-3 h-3 text-amber-500 shrink-0 ml-1 inline-block self-center" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        title={gender || "Peer"}
      >
        <path d="M12 2l2.4 6.4 6.4 2.4-6.4 2.4-2.4 6.4-2.4-6.4-6.4-2.4 6.4-2.4z" />
      </svg>
    );
  };

  const myLikes = likes.filter(l => l.hangout_id === hangout.id);
  const hangoutComments = comments.filter(c => c.hangout_id === hangout.id);
  const editHistoryEntries = hangoutComments
    .map(comment => parseHangoutEditHistoryEntry(comment.content))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const myComments = hangoutComments.filter(c => !isHangoutEditHistoryComment(c.content));
  const isLikedByMe = currentUser ? likes.some(l => l.hangout_id === hangout.id && l.user_id === currentUser.id) : false;

  // Resolve applicants
  const participantsCount = applications.filter(a => a.hangout_id === hangout.id && a.status === "accepted").length;
  const totalAppsForHangout = applications.filter(a => a.hangout_id === hangout.id && (a.status === "pending" || a.status === "accepted")).length;

  // Check blocks
  const isBlocked = currentUser 
    ? blocks.some(b => (b.blocker_id === currentUser.id && b.blocked_id === hangout.creator_id) || (b.blocker_id === hangout.creator_id && b.blocked_id === currentUser.id))
    : false;

  if (isBlocked) return null; // hidden completely for blocked pair

  // Check eligibility if logged in
  const eligibility = currentUser ? isEligibleForHangout(currentUser, hangout) : { eligible: true, reasons: [] };

  const handleAddCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const { success } = addComment(hangout.id, newCommentText, replyToCommentId);
    if (success) {
      setNewCommentText("");
      setReplyToCommentId(null);
    }
  };

  const handleApplyConfirm = () => {
    const { success } = applyToHangout(hangout.id, applyAnonymously);
    if (success) {
      setShowJoinConfirm(false);
    }
  };

  const isExpired = hangout.status === "expired";

  return (
    <div
      id={`hangout-card-${hangout.id}`}
      className={`border rounded-3xl p-5 shadow-sm transition-all duration-250 flex flex-col justify-between h-full relative ${
        isExpired
          ? "bg-slate-50/45 border-slate-200/60 opacity-55 saturate-50 contrast-85 shadow-none select-none"
          : "bg-white border-gray-100 hover:shadow-md"
      }`}
    >
      <div className="flex flex-col flex-grow space-y-4">
      {/* 1. Header with creator info */}
      <div className="flex items-center justify-between border-b border-gray-50 pb-3">
        <button
          id={`view-creator-profile-${hangout.id}`}
          onClick={() => {
            if (hangout.is_anonymous && !canSeeRealIdentity) {
              const anonProfile: Profile = {
                id: hangout.creator_id,
                email: "",
                student_id: "",
                name: `Anonymous ${anonAnimal.name}`,
                name_last_changed_at: null,
                country: realCreator?.country || "Malaysia",
                country_last_changed_at: null,
                languages: realCreator?.languages || [],
                age: realCreator?.age || 20,
                program: realCreator?.program || "Undergraduate",
                year_of_study: realCreator?.year_of_study || "Year 1",
                gender: realCreator?.gender || "other",
                student_type: realCreator?.student_type || "degree",
                about_me: "This student is hosting this hangout anonymously to protect their privacy on the public feed.",
                avatar_id: anonAnimal.avatar,
                is_profile_complete: true,
                hide_details: true,
                is_admin: false,
                is_blocked_globally: false,
                flag_status: realCreator?.flag_status || "none",
                appeal_count: realCreator?.appeal_count || 0
              };
              setViewedProfile(anonProfile);
              return;
            }
            setViewedProfile(creator as Profile);
          }}
          className="flex items-center gap-3.5 text-left outline-none group cursor-pointer"
        >
          <AvatarSVG id={creator.avatar_id} size={52} className={hangout.is_anonymous && !canSeeRealIdentity ? "group-hover:opacity-90 transition-opacity shrink-0" : "group-hover:scale-105 transition-transform shrink-0"} />
          <div className="min-w-0 text-left">
            <div className="flex items-center flex-wrap gap-1">
              <h4 className={`font-bold text-gray-900 text-xs sm:text-sm transition-colors ${
                hangout.is_anonymous && !canSeeRealIdentity
                  ? ""
                  : "group-hover:text-rose-600"
              }`}>
                {creator.name}
              </h4>
              {renderGenderIcon(realCreator?.gender || "other")}
            </div>
            {realCreator ? (
              <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[200px] sm:max-w-xs font-medium">
                {(!hangout.is_anonymous || canSeeRealIdentity)
                  ? `${realCreator.program} • ${realCreator.year_of_study} • ${realCreator.student_type ? realCreator.student_type.charAt(0).toUpperCase() + realCreator.student_type.slice(1) : ""}`
                  : `Verified Peer • ${realCreator.student_type ? realCreator.student_type.charAt(0).toUpperCase() + realCreator.student_type.slice(1) : "Student"}`}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                Verified Peer • Privacy Mode
              </span>
            )}
            <span className="text-[9px] text-slate-400/80 block mt-0.5 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400/60 shrink-0" />
              Posted on {new Date(hangout.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} at {new Date(hangout.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {editHistoryEntries.length > 0 && (
            <button
              type="button"
              onClick={() => setShowEditHistory(!showEditHistory)}
              className="bg-amber-50 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-100 flex items-center gap-1"
            >
              <PencilLine className="w-3 h-3" />
              Edited
            </button>
          )}
          {isExpired && (
            <span className="bg-slate-150 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1 select-none">
              <Clock className="w-3 h-3 text-slate-500" /> Expired
            </span>
          )}
          {currentUser && creator.id !== currentUser.id && (
            <button
              id={`report-user-btn-${creator.id}`}
              onClick={onReportCreator}
              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              title="Report this user"
            >
              <Flag className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showEditHistory && editHistoryEntries.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3 text-xs text-amber-950 space-y-3">
          <div className="flex items-center gap-2 font-bold">
            <PencilLine className="w-4 h-4 text-amber-700" />
            Edit History
          </div>
          {editHistoryEntries.map((entry, index) => (
            <div key={`${entry.at}-${index}`} className="bg-white/70 rounded-xl border border-amber-100 p-3 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="font-semibold text-amber-900">{entry.summary}</span>
                <span className="text-[10px] text-amber-700">
                  {new Date(entry.at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit"
                  })}
                </span>
              </div>
              <div className="space-y-1.5">
                {entry.changes.map(change => (
                  <div key={`${entry.at}-${change.field}`} className="text-[11px] text-slate-700">
                    <span className="font-bold text-slate-800">{change.label}:</span> {change.before} {"->"} {change.after}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Safety advisories for flagged creators */}
      {creator.flag_status === "potentially_unsafe" && (
        <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-3 flex gap-2.5 items-start text-[11px] text-amber-800 leading-relaxed font-sans">
          <ShieldAlert className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>⚠️ Safety Caution flag:</strong> This user has been flagged as potentially unsafe. Proceed with caution. We strongly advise meeting up exclusively in highly populated public areas.
          </div>
        </div>
      )}

      {creator.flag_status === "confirmed_unsafe" && (
        <div className="bg-red-50 border border-red-200/55 rounded-2xl p-3 flex gap-2.5 items-start text-[11px] text-red-800 leading-relaxed font-sans">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <strong>🚫 Danger safety flag:</strong> This user has been confirmed unsafe by admin review. We strongly advise against meeting with them.
          </div>
        </div>
      )}

      {/* 3. Main details */}
      <div className="space-y-3 font-sans">
        {/* Intention statement */}
        <h3 id={`hangout-intention-${hangout.id}`} className="text-sm sm:text-base font-extrabold text-gray-900 tracking-tight leading-snug line-clamp-3 md:line-clamp-2 overflow-hidden text-ellipsis">
          I want to <span className="text-rose-500">{hangout.intention}</span>
        </h3>

        {/* Location & Time info list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">At: <strong>{hangout.location}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              On: <strong>{new Date(hangout.event_datetime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Capacity: <strong>{hangout.max_participants ? `${participantsCount}/${hangout.max_participants} joined` : `${participantsCount} joined`}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-rose-405 shrink-0" />
            <span>
              Applicants: <strong>{totalAppsForHangout} total</strong>
            </span>
          </div>

          {/* Meeting Point Unlocked State details */}
          {(hangout.creator_id === currentUser?.id || myApp?.status === "accepted") && (
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-500 shrink-0" />
              <span className="truncate">
                Meeting point: <strong className="text-teal-600">"{hangout.meeting_point}" 🔓</strong>
              </span>
            </div>
          )}
        </div>

        {/* Truncated Additional Information */}
        <div className="bg-gray-50 rounded-2xl p-3.5 space-y-1">
          <p className={`text-xs text-gray-700 leading-relaxed font-sans ${showFullInfo ? "" : "line-clamp-3 md:line-clamp-2 overflow-hidden text-ellipsis"}`}>
            {hangout.additional_info}
          </p>
          {hangout.additional_info.length > 180 && (
            <button
              id={`toggle-info-${hangout.id}`}
              onClick={() => setShowFullInfo(!showFullInfo)}
              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-0.5 outline-none mt-1 cursor-pointer transition-colors"
            >
              {showFullInfo ? (
                <>Less <ChevronUp className="w-3.5 h-3.5" /></>
              ) : (
                <>More <ChevronDown className="w-3.5 h-3.5" /></>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 4. Display restrictions builder guidelines for applicants */}
      {currentUser && (
        <div className="mt-auto text-[10px] text-slate-500 flex flex-wrap gap-1.5 items-center pb-2.5">
          <span className="text-slate-400 font-semibold text-[10px] mr-1 flex items-center gap-1">
            <ClipboardCheck className="w-3.5 h-3.5 text-rose-500 shrink-0" /> Joining Criteria:
          </span>
          {(() => {
            const badges: React.ReactNode[] = [];
            const r = hangout.restrictions;

            if (r.countries && r.countries.length > 0) {
              badges.push(
                <span key="countries" className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-xl text-[9px] font-medium border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors hover:bg-slate-100">
                  <Globe className="w-3 h-3 text-indigo-500 shrink-0" />
                  {r.countries.join(", ")}
                </span>
              );
            }

            if (r.languages && r.languages.length > 0) {
              badges.push(
                <span key="languages" className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-xl text-[9px] font-medium border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors hover:bg-slate-100">
                  <Languages className="w-3 h-3 text-emerald-500 shrink-0" />
                  {r.languages.join(", ")}
                </span>
              );
            }

            if (r.programs && r.programs.length > 0) {
              badges.push(
                <span key="programs" className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-xl text-[9px] font-medium border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] max-w-[200px] truncate-children transition-colors hover:bg-slate-100">
                  <GraduationCap className="w-3 h-3 text-blue-500 shrink-0" />
                  <span className="truncate">{r.programs.join(", ")}</span>
                </span>
              );
            }

            if (r.student_types && r.student_types.length > 0) {
              badges.push(
                <span key="student_types" className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-xl text-[9px] font-medium border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] capitalize transition-colors hover:bg-slate-100">
                  <Award className="w-3 h-3 text-purple-500 shrink-0" />
                  {r.student_types.join(", ")}
                </span>
              );
            }

            if (r.genders && r.genders.length > 0) {
              badges.push(
                <span key="genders" className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-xl text-[9px] font-medium border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors hover:bg-slate-100">
                  <Sparkles className="w-3 h-3 text-pink-500 shrink-0" />
                  {r.genders.join(", ")}
                </span>
              );
            }

            if (r.age_min !== null || r.age_max !== null) {
              let ageText = "";
              if (r.age_min !== null && r.age_max !== null) {
                ageText = `Age ${r.age_min}-${r.age_max}`;
              } else if (r.age_min !== null) {
                ageText = `Age ≥ ${r.age_min}`;
              } else if (r.age_max !== null) {
                ageText = `Age ≤ ${r.age_max}`;
              }
              badges.push(
                <span key="age" className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-xl text-[9px] font-medium border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors hover:bg-slate-100">
                  <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                  {ageText}
                </span>
              );
            }

            if (badges.length === 0) {
              return (
                <span className="text-slate-400 font-light italic" key="no-criteria">No specific joining criteria!</span>
              );
            }

            return badges;
          })()}
        </div>
      )}

      </div>

      {/* 5. Trigger buttons */}
      <div className="flex flex-wrap gap-2 items-center justify-between pt-3 border-t border-gray-50 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {/* Reaction Button */}
          <button
            id={`hangout-like-btn-${hangout.id}`}
            onClick={() => toggleLike(hangout.id)}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl text-xs font-bold transition-all ${
              isLikedByMe
                ? "bg-rose-50 text-rose-500 border border-rose-100"
                : "hover:bg-slate-50 border border-transparent text-gray-500"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLikedByMe ? "fill-rose-500 text-rose-500" : ""}`} />
            <span>{myLikes.length}</span>
          </button>

          {/* Comment toggle trigger */}
          <button
            id={`toggle-comments-${hangout.id}`}
            onClick={() => {
              setShowComments(!showComments);
              setShowApplicants(false);
            }}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl text-xs font-bold transition-all ${
              showComments
                ? "bg-amber-50 text-amber-600 border border-amber-105"
                : "hover:bg-slate-50 border border-transparent text-gray-500"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{myComments.length}<span className="hidden sm:inline"> Discussions</span></span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* View Applicants (Visible to Anyone) */}
          <button
            id={`view-applicants-btn-${hangout.id}`}
            onClick={() => {
              setShowApplicants(!showApplicants);
              setShowComments(false);
            }}
            className={`text-xs font-bold px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl transition-all duration-150 flex items-center gap-1.5 cursor-pointer outline-none border ${
              showApplicants 
                ? "bg-rose-50 text-rose-700 border-rose-200" 
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent"
            }`}
            title="View current student applicants"
          >
            <Users className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${showApplicants ? "text-rose-600" : "text-slate-500"}`} />
            <span>View Applicants</span>
          </button>

          {/* Join trigger / App status display */}
          {currentUser && hangout.creator_id !== currentUser.id && (
            <>
              {myApp ? (
                <div id={`app-status-${hangout.id}`} className="text-xs">
                  {myApp.status === "pending" && (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-amber-200/35 text-[10px] sm:text-[11px] font-sans shadow-sm">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-50 duration-2000"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                      </span>
                      <span>Pending<span className="hidden sm:inline"> Approval</span></span>
                    </span>
                  )}
                  {myApp.status === "accepted" && (
                    <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-650 font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-teal-200/35 text-[10px] sm:text-[11px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500"></span>
                      <span>Approved<span className="hidden sm:inline"> Request</span></span>
                    </span>
                  )}
                  {myApp.status === "rejected" && (
                    <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-550 font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-rose-100 text-[10px] sm:text-[11px]" title={myApp.rejection_message || ""}>
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-450"></span>
                      <span>Declined<span className="hidden sm:inline"> Feedback</span></span>
                    </span>
                  )}
                </div>
              ) : (
                !isExpired ? (
                  <div className="relative group">
                    <button
                      id={`join-hangout-btn-${hangout.id}`}
                      disabled={!eligibility.eligible}
                      onClick={() => setShowJoinConfirm(true)}
                      className={`text-xs font-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer ${
                        eligibility.eligible
                          ? "bg-rose-500 hover:bg-rose-600 active:scale-95 text-white shadow-sm"
                          : "bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <span>Request<span className="hidden sm:inline"> to Join</span></span>
                    </button>
                    
                    {/* Detailed eligibility tooltips when button is disabled */}
                    {!eligibility.eligible && (
                      <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-850 text-[10px] leading-relaxed hidden group-hover:block z-50 animate-in fade-in slide-in-from-bottom-1 duration-150">
                        <p className="font-bold text-rose-400 mb-1 flex items-center gap-1">
                          Filter requirements unmet:
                        </p>
                        <ul className="list-disc pl-3.5 space-y-1 text-slate-300">
                          {eligibility.reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 font-extrabold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-slate-200/50 text-[10px] sm:text-[11px] select-none font-sans">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Completed
                  </span>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* 6. Expandable comment section */}
      {showComments && (
        <div id={`comments-section-${hangout.id}`} className="bg-slate-50/55 rounded-2xl p-4 space-y-4 pt-4 border-t border-gray-50">
          <h4 className="text-xs font-extrabold text-gray-700 block uppercase tracking-wider">
            Comments & Discussion ({myComments.length})
          </h4>
          
          <div className="space-y-3 max-h-56 overflow-y-auto">
            {myComments.length === 0 ? null : (
              myComments.map(c => {
                const author = (currentUser && c.user_id === currentUser.id) ? currentUser : (profiles.find(p => p.id === c.user_id) || { name: "Student", avatar_id: "panda" });
                const lovesCount = commentLikes.filter(lk => lk.comment_id === c.id).length;
                const isLovedByMe = currentUser && commentLikes.some(lk => lk.comment_id === c.id && lk.user_id === currentUser.id);
                return (
                  <div id={`comment-${c.id}`} key={c.id} className="bg-white border border-gray-100 rounded-2xl p-3 flex gap-3 text-xs leading-relaxed text-gray-600 shadow-sm">
                    <AvatarSVG id={author.avatar_id} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            const p = (currentUser && c.user_id === currentUser.id) ? currentUser : profiles.find(x => x.id === c.user_id);
                            if (p) setViewedProfile(p);
                          }}
                          className="font-bold text-rose-600 hover:text-rose-700 hover:underline transition-all text-left truncate cursor-pointer max-w-[120px] sm:max-w-[200px]"
                        >
                          {author.name}
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] text-gray-400 font-mono">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                          
                          {/* Comment Love React */}
                          <button
                            type="button"
                            onClick={() => toggleCommentLike(c.id)}
                            className={`flex items-center gap-0.5 transition-all cursor-pointer p-1 rounded-lg ${
                              isLovedByMe ? "text-rose-500 bg-rose-50 scale-105" : "text-gray-400 hover:text-rose-500 hover:bg-slate-50"
                            }`}
                            title="Love react to comment"
                          >
                            <Heart className={`w-3 h-3 ${isLovedByMe ? "fill-current" : ""}`} />
                            {lovesCount > 0 && <span className="text-[9px] font-black">{lovesCount}</span>}
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-750 whitespace-pre-wrap font-sans">{c.content}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add a comment form */}
          {currentUser ? (
            <form onSubmit={handleAddCommentSubmit} className="flex gap-2">
              <input
                id={`comment-input-${hangout.id}`}
                type="text"
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                placeholder="Ask a question or discuss..."
                className="flex-grow bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-rose-400 placeholder-gray-400"
              />
              <button
                id={`comment-send-btn-${hangout.id}`}
                type="submit"
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl p-2.5 transition-colors"
                title="Comment"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <p className="text-[11px] text-gray-400 text-center">Please login to write a comment.</p>
          )}
        </div>
      )}

      {/* Expandable Applicants section inline */}
      {showApplicants && (
        <div id={`applicants-section-${hangout.id}`} className="bg-slate-50/55 rounded-2xl p-4 space-y-4 pt-4 border-t border-gray-50 mt-2">
          <ApplicantList hangoutId={hangout.id} />
        </div>
      )}

      {/* 7. Joining confirmation Modal with anonymous toggle checkboxes */}
      <AnimatePresence>
        {showJoinConfirm && (
          <motion.div
            id="join-confirm-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              id="join-confirm-modal"
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4"
            >
              <div className="text-center space-y-2">
                <span className="inline-flex p-3 rounded-full bg-rose-50 text-rose-500">
                  <Users className="w-6 h-6" />
                </span>
                <h3 id="join-modal-title" className="text-gray-900 font-extrabold text-lg">Join Hangout Request</h3>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Send joining verification to <strong>{creator.name}</strong>. On accepted, direct chat coordinates open.
                </p>
              </div>

              {/* Anonymous Join Option Checkbox */}
              <div className="bg-rose-50/50 border border-rose-100/60 rounded-2xl p-4.5 space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    id="anonymous-checkout-box"
                    type="checkbox"
                    checked={applyAnonymously}
                    onChange={e => setApplyAnonymously(e.target.checked)}
                    className="mt-1 accent-rose-500 rounded text-rose-500 shrink-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-rose-950 block">Apply Anonymously</span>
                    <p className="text-[10px] text-rose-800 leading-relaxed mt-0.5">
                      Hides your name and avatar from general students on public lists. However, your host (creator) will view your profile to confirm eligibility.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  id="join-confirm-btn"
                  onClick={handleApplyConfirm}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm"
                >
                  Send Request
                </button>
                <button
                  id="join-cancel-btn"
                  onClick={() => setShowJoinConfirm(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. Applicants detail list modal (for the Host creator) */}
      <AnimatePresence>
        {showApplicantsModal && (
          <motion.div
            id="applicants-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              id="applicants-modal"
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-100 relative space-y-4"
            >
              <button
                id="applicants-modal-close"
                onClick={() => setShowApplicantsModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-xl transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 id="applicants-modal-title" className="text-gray-950 font-black text-lg">Manage Hangout Applicants</h3>
              <p className="text-xs text-gray-500">
                Only approve students you feel safe meeting with. Standard public code of conduct applies on-campus.
              </p>
              <ApplicantList hangoutId={hangout.id} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 9. Viewed profile detailed modal */}
      <AnimatePresence>
        {false && viewedProfile && (
          <motion.div
            id="profile-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              id="profile-modal"
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 relative space-y-4"
            >
              <button
                id="profile-modal-close"
                onClick={() => setViewedProfile(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
                title="Close Profile"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 id="viewed-profile-title" className="text-gray-950 font-black text-md">Student Profile Card</h3>
              {/* Standard ProfileCard (restricted based on hide_details relative context if not admin or creator) */}
              <ProfileCard
                profile={viewedProfile}
                viewMode="auto"
                isCreatorOfViewedHangout={hangout.creator_id === currentUser?.id}
                onBlockClick={() => toggleBlockUser(viewedProfile.id)}
                isBlockedByMe={currentUser ? blocks.some(b => b.blocker_id === currentUser.id && b.blocked_id === viewedProfile.id) : false}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
