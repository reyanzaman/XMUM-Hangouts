/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Profile } from "../types";
import { AvatarSVG } from "./AvatarSVG";
import { Shield, MapPin, Languages, BookOpen, Calendar, User, Eye, EyeOff } from "lucide-react";
import { useApp } from "../context/AppContext";

interface ProfileCardProps {
  profile: Profile;
  viewMode?: "full" | "restricted" | "auto"; // auto will calculate based on user hide_details
  isCreatorOfViewedHangout?: boolean; // if true, gets 'full' view anyway
  onReportClick?: () => void;
  onBlockClick?: () => void;
  isBlockedByMe?: boolean;
  flat?: boolean;
  hideHeader?: boolean;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  viewMode = "auto",
  isCreatorOfViewedHangout = false,
  onReportClick,
  onBlockClick,
  isBlockedByMe = false,
  flat = false,
  hideHeader = false
}) => {
  const { currentUser } = useApp();

  // Determine if we show full or restricted
  const shouldShowFull = () => {
    if (viewMode === "full") return true;
    if (viewMode === "restricted") return false;
    // auto mode
    if (isCreatorOfViewedHangout) return true;
    if (profile.is_admin) return true;
    return !profile.hide_details;
  };

  const isFull = shouldShowFull();
  const isMe = currentUser?.id === profile.id;

  return (
    <div
      id={`profile-card-${profile.id}`}
      className={flat 
        ? "space-y-4 relative w-full" 
        : "bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden"
      }
    >
      {/* Admin or Flag badges */}
      <div className="absolute top-4 right-4 flex gap-1.5 z-10">
        {profile.is_admin && isMe && (
          <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Admin
          </span>
        )}
        {profile.flag_status === "potentially_unsafe" && (
          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full animate-subtle-pulse">
            ⚠️ Potentially Unsafe
          </span>
        )}
        {profile.flag_status === "confirmed_unsafe" && (
          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            🚫 Verified Unsafe
          </span>
        )}
      </div>

      {/* Header Info */}
      {!hideHeader && (
        <div className="flex gap-4 items-center">
          <AvatarSVG id={profile.avatar_id} size={64} className="ring-4 ring-rose-50" />
          <div className="flex-1 min-w-0">
            <h3 id={`profile-name-${profile.id}`} className="font-bold text-gray-900 text-base flex items-center gap-1 truncate font-sans">
              {profile.name}
            </h3>
            <div className="flex flex-wrap gap-1.5 mt-1 border-gray-50">
              <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-lg capitalize">
                {profile.gender}
              </span>
              {isFull && (
                <span className="bg-teal-50 text-teal-600 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                  ID: {profile.student_id}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warning regarding potentially unsafe profile */}
      {profile.flag_status !== "none" && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
          <strong>⚠️ Safety Advisory:</strong> This student's account was flagged by community administrators. Please exercise extreme caution, only meet on-campus during busy hours, and immediately report uncooperative behavior.
        </div>
      )}

      {/* Bio */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400">About Me</span>
        <p id={`profile-about-${profile.id}`} className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">
          {profile.about_me || "This student is keeping a low profile..."}
        </p>
      </div>

      {/* Full details vs Restricted banner */}
      {isFull ? (
        <div className="grid grid-cols-1 gap-3 pt-3 border-t border-gray-50 text-xs text-gray-650">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-rose-405 shrink-0 mt-0.5" />
            <span className="text-gray-700 leading-tight">From: <strong className="text-gray-900">{profile.country || "Malaysia"}</strong></span>
          </div>

          <div className="flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-rose-405 shrink-0 mt-0.5" />
            <span className="text-gray-700 leading-tight">Program: <strong className="text-gray-900">{profile.program}</strong></span>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-rose-405 shrink-0 mt-0.5" />
            <span className="text-gray-700 leading-tight">Year: <strong className="text-gray-900">{profile.year_of_study}</strong> <span className="text-gray-400">({profile.student_type ? profile.student_type.charAt(0).toUpperCase() + profile.student_type.slice(1) : ""})</span></span>
          </div>

          <div className="flex items-start gap-2">
            <Languages className="w-4 h-4 text-rose-405 shrink-0 mt-0.5" />
            <span className="text-gray-700 leading-tight">Languages: <strong className="text-gray-900">{profile.languages.join(", ")}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Age: <strong>{profile.age} years old</strong></span>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl p-3 text-[11px] text-gray-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <EyeOff className="w-4.h-4 text-gray-400" />
            Private profile details hidden based on safety settings.
          </span>
          {profile.hide_details && <span className="text-[10px] bg-gray-200/50 px-1.5 py-0.5 rounded font-mono">Hidden</span>}
        </div>
      )}

      {/* Actions (Report / Block) */}
      {(onReportClick || onBlockClick) && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
          {onBlockClick && (
            <button
              id={`profile-block-btn-${profile.id}`}
              onClick={onBlockClick}
              className={`text-xs px-3 py-1.5 rounded-xl transition-all font-medium border flex-1 ${
                isBlockedByMe 
                  ? "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100" 
                  : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600"
              }`}
            >
              {isBlockedByMe ? "Unblock Student" : "Block Student"}
            </button>
          )}

          {onReportClick && (
            <button
              id={`profile-report-btn-${profile.id}`}
              onClick={onReportClick}
              className="text-xs px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 border border-gray-200 text-gray-500 font-medium flex-1 transition-all"
            >
              Report Student
            </button>
          )}
        </div>
      )}
    </div>
  );
};
