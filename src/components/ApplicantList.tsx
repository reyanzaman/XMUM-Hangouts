/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { HangoutApplication, Profile } from "../types";
import { useApp } from "../context/AppContext";
import { buildAnonymousAliasProfile } from "../lib/profiles";
import { ProfileCard } from "./ProfileCard";
import { AvatarSVG } from "./AvatarSVG";
import { Check, X, ShieldAlert, UserCheck, HelpCircle, Eye, EyeOff } from "lucide-react";

interface ApplicantListProps {
  hangoutId: string;
}

const ANIMALS = [
  "Panda", "Koala", "Otter", "Dolphin", "Cheetah", "Penguin", "Falcon", "Sloth", "Fox", "Squirrel",
  "Rabbit", "Deer", "Hedgehog", "Capybara", "Alpaca", "Wombat", "Platypus", "Lemur", "Meerkat", "Quokka",
  "Octopus", "Seahorse", "Turtle", "Flamingo", "Peacock", "Beaver", "Badger", "Owl"
];

function getAnonymousAnimalName(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ANIMALS.length;
  return `Anonymous ${ANIMALS[index]}`;
}

export const ApplicantList: React.FC<ApplicantListProps> = ({ hangoutId }) => {
  const { applications, profiles, hangouts, currentUser, manageApplication, setViewedProfile } = useApp();
  const [selectedAppForReject, setSelectedAppForReject] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});

  const hangout = hangouts.find(h => h.id === hangoutId);
  const isCreatorMe = currentUser && hangout && hangout.creator_id === currentUser.id;
  const isAdmin = currentUser?.is_admin;

  // Retrieve active and pending applications
  const hangoutApps = applications.filter(
    a => a.hangout_id === hangoutId && (a.status === "pending" || a.status === "accepted")
  );

  const getApplicantProfile = (applicantId: string): Profile | undefined => {
    return profiles.find(p => p.id === applicantId);
  };

  const handleOpenReject = (appId: string) => {
    setSelectedAppForReject(appId);
    setRejectReason("");
  };

  const handleConfirmReject = () => {
    if (selectedAppForReject) {
      manageApplication(selectedAppForReject, "rejected", rejectReason.trim());
      setSelectedAppForReject(null);
    }
  };

  const handleAccept = (appId: string) => {
    manageApplication(appId, "accepted");
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRowIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div id={`applicant-list-container-${hangoutId}`} className="space-y-3 pt-1">
      <h4 id="applicant-sections-title" className="text-xs font-bold text-slate-700 flex items-center gap-1.5 pb-2 border-b border-rose-100/10">
        Applicants & Companions ({hangoutApps.length})
      </h4>

      {hangoutApps.length === 0 ? (
        <p id="no-applicants-msg" className="text-[11px] text-slate-400 py-3 text-center bg-slate-50/50 rounded-xl border border-slate-100/40">
          No current applicants for this hangout plan.
        </p>
      ) : (
        <div className="space-y-3">
          {hangoutApps.map(app => {
            const realProfile = getApplicantProfile(app.applicant_id);
            if (!realProfile) return null;

            // Resolve whether viewer has privilege to see real identity
            const hasPrivilege = isCreatorMe || isAdmin || (currentUser && currentUser.id === app.applicant_id);

            // Anonymize profile if anonymous and viewer lacks privilege
            const profileToRender: Profile = (app.is_anonymous && !hasPrivilege)
              ? {
                  ...buildAnonymousAliasProfile(realProfile, {
                    seed: app.applicant_id,
                    aboutMe: "This student requested to participate in this plan anonymously."
                  }),
                  name: getAnonymousAnimalName(app.applicant_id),
                  flag_status: "none"
                }
              : realProfile;

            const isExpanded = !!expandedRowIds[app.id];

            return (
              <div
                id={`applicant-row-${app.id}`}
                key={app.id}
                className="bg-slate-50/40 rounded-2xl p-3 border border-slate-100/30 space-y-2.5 transition-all text-xs"
              >
                {/* Visual note if user applied anonymously (planner view) */}
                {app.is_anonymous && isCreatorMe && (
                  <div className="bg-slate-150/40 border border-slate-200/40 text-[10px] text-slate-500 px-2.5 py-2 rounded-xl flex items-start gap-1.5 font-sans leading-relaxed">
                    <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      Applied anonymously. General students see <strong>{getAnonymousAnimalName(app.applicant_id)}</strong>. However, as the planner, you can view details to verify eligibility.
                    </span>
                  </div>
                )}

                {/* Anonymity note for general students */}
                {app.is_anonymous && !hasPrivilege && (
                  <div className="bg-slate-50 border border-slate-100 text-[10px] text-slate-400 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 font-sans">
                     Anonymous applicant name mapping active. Original details hidden.
                  </div>
                )}

                {/* Compact Row Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setViewedProfile(profileToRender)}
                    className="flex items-center gap-2.5 min-w-0 text-left hover:text-rose-600 transition-all cursor-pointer group outline-none animate-in fade-in"
                    title={`View ${profileToRender.name}'s Profile`}
                  >
                    <AvatarSVG id={profileToRender.avatar_id} size={36} className="ring-2 ring-rose-100/20 group-hover:scale-105 transition-transform shrink-0" />
                    <div className="min-w-0">
                      <h5 className="font-bold text-slate-800 text-xs sm:text-sm truncate group-hover:underline">
                        {profileToRender.name}
                      </h5>
                      <p className="text-[10px] text-slate-500 capitalize truncate">
                        {profileToRender.gender} · {profileToRender.year_of_study} · {profileToRender.program || "General Program"}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    {/* Integrated status pill */}
                    <span className={`text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded-xl border ${
                      app.status === "accepted" 
                        ? "bg-emerald-55/60 text-emerald-700 border-emerald-100/30" 
                        : "bg-amber-55/65 text-amber-700 border-amber-100/30"
                    }`}>
                      {app.status === "accepted" ? "Approved" : "Pending"}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleRowExpand(app.id)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-250/90 text-slate-600 px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer outline-none"
                    >
                      {isExpanded ? (
                        <>Hide <EyeOff className="w-3 h-3 text-slate-450" /></>
                      ) : (
                        <>Profile <Eye className="w-3 h-3 text-slate-450" /></>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Profile Details */}
                {isExpanded && (
                  <div className="pt-2.5 pb-1 border-t border-slate-100/50 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <ProfileCard 
                      profile={profileToRender} 
                      viewMode={hasPrivilege ? "full" : "auto"} 
                      flat={true} 
                      hideHeader={true} 
                    />
                  </div>
                )}

                {/* If viewer is creator of the hangout, render control actions */}
                {isCreatorMe && app.status === "pending" && (
                  <div className="flex gap-2.5 pt-2 border-t border-slate-100/50 mt-1.5">
                    <button
                      id={`accept-applicant-${app.id}`}
                      onClick={() => handleAccept(app.id)}
                      className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-extrabold py-1.5 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve Request
                    </button>

                    <button
                      id={`reject-applicant-${app.id}`}
                      onClick={() => handleOpenReject(app.id)}
                      className="flex-1 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 text-slate-600 font-semibold py-1.5 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Decline Request
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Decline Flow Modal */}
      {selectedAppForReject && (
        <div id="rejection-modal-backdrop" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div id="rejection-modal" className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="text-center">
              <span className="inline-flex p-2.5 rounded-full bg-slate-100 text-gray-500 mb-3">
                <HelpCircle className="w-5 h-5" />
              </span>
              <h3 id="rejection-modal-title" className="text-gray-900 font-extrabold text-sm">Decline Request</h3>
              <p className="text-gray-400 text-xs mt-1.5">
                Are you sure you want to decline this request?
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">
                Custom decline message (optional)
              </label>
              <textarea
                id="reject-reason-input"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Sorry, we are already full."
                className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-rose-450 placeholder-gray-400 h-20"
              />
            </div>

            <div className="flex gap-2">
              <button
                id="reject-confirm-btn"
                onClick={handleConfirmReject}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Yes, Decline
              </button>
              <button
                id="reject-cancel-btn"
                onClick={() => setSelectedAppForReject(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
