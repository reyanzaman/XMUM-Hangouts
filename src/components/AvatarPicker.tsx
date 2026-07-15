/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, CircleUserRound, Frame, Sparkles } from "lucide-react";
import { AVATAR_LIST, AvatarSVG } from "./AvatarSVG";
import { companionTierStates } from "../config/companionConfig";
import {
  AVATAR_BORDER_CHOICES,
  companionAvatarId,
  decodeAvatarSelection,
  encodeAvatarSelection,
  getAvatarBorderReward,
  getCompanionStateIdFromAvatar
} from "../lib/avatarRewards";

interface AvatarPickerProps {
  selectedId: string;
  onChange: (id: string) => void;
  petCount?: number;
  isAdmin?: boolean;
}

type PickerTab = "regular" | "companions" | "borders";

const COMPANIONS_PER_PAGE = 30;
const companionAvatarOptions = [
  { id: "base-sprout", name: "Original Sprout" },
  ...companionTierStates.filter(state => state.count > 1000 || Boolean(state.activityUnlock))
];

const pickerTabs: Array<{ id: PickerTab; label: string; icon: typeof CircleUserRound }> = [
  { id: "regular", label: "Avatars", icon: CircleUserRound },
  { id: "companions", label: "Companions", icon: Sparkles },
  { id: "borders", label: "Borders", icon: Frame }
];

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ selectedId, onChange, petCount = 0, isAdmin = false }) => {
  const selection = decodeAvatarSelection(selectedId);
  const selectedCompanionId = getCompanionStateIdFromAvatar(selection.avatarId);
  const initialCompanionIndex = Math.max(0, companionAvatarOptions.findIndex(option => option.id === selectedCompanionId));
  const [activeTab, setActiveTab] = useState<PickerTab>(() => selectedCompanionId ? "companions" : selection.borderId ? "borders" : "regular");
  const [companionPage, setCompanionPage] = useState(() => Math.floor(initialCompanionIndex / COMPANIONS_PER_PAGE));
  const borderReward = getAvatarBorderReward(petCount, selection.borderId);
  const premiumChoicesUnlocked = petCount >= 2000 || isAdmin;
  const companionPageCount = Math.ceil(companionAvatarOptions.length / COMPANIONS_PER_PAGE);
  const visibleCompanions = companionAvatarOptions.slice(
    companionPage * COMPANIONS_PER_PAGE,
    (companionPage + 1) * COMPANIONS_PER_PAGE
  );

  const chooseAvatar = (avatarId: string) => {
    if (getCompanionStateIdFromAvatar(avatarId) && !premiumChoicesUnlocked) return;
    onChange(encodeAvatarSelection(avatarId, selection.borderId));
  };
  const chooseBorder = (borderId: string | null) => onChange(encodeAvatarSelection(selection.avatarId, borderId));
  const selectedAvatarName = selectedCompanionId
    ? companionAvatarOptions.find(option => option.id === selectedCompanionId)?.name || "Companion"
    : AVATAR_LIST.find(avatar => avatar.id === selection.avatarId)?.name || "Avatar";

  return (
    <div id="avatar-picker-container" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label id="avatar-picker-label" className="text-sm font-semibold text-gray-700">Profile Style</label>
        <div className="flex min-w-0 items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-2.5">
          <AvatarSVG id={selectedId} size={30} petCount={petCount} />
          <span className="max-w-[130px] truncate text-[10px] font-bold text-slate-600">
            {selectedAvatarName}{borderReward ? ` · ${borderReward.name}` : ""}
          </span>
        </div>
      </div>

      <div role="tablist" aria-label="Profile style options" className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100/80 p-1">
        {pickerTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`avatar-picker-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[10px] font-bold transition-all sm:text-xs ${isActive ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:bg-white/60 hover:text-slate-700"}`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-[178px] rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4">
        {activeTab === "regular" && (
          <div id="avatar-picker-panel-regular" role="tabpanel" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {AVATAR_LIST.map(avatar => {
              const isSelected = selection.avatarId === avatar.id;
              return (
                <button
                  id={`avatar-option-${avatar.id}`}
                  key={avatar.id}
                  type="button"
                  onClick={() => chooseAvatar(avatar.id)}
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-xl p-1.5 outline-none transition-all ${isSelected ? "bg-white shadow-sm ring-2 ring-rose-300" : "hover:bg-white/80"}`}
                  title={avatar.name}
                >
                  <AvatarSVG id={encodeAvatarSelection(avatar.id, selection.borderId)} size={46} petCount={petCount} />
                  <span className={`w-full truncate text-center text-[9px] font-bold ${isSelected ? "text-rose-600" : "text-slate-500"}`}>{avatar.name.split(" ").at(-1)}</span>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "companions" && (
          <div id="avatar-picker-panel-companions" role="tabpanel">
            {premiumChoicesUnlocked ? (
              <>
                {companionPageCount > 1 && (
                  <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-violet-100 bg-white px-2 py-1.5">
                    <button type="button" onClick={() => setCompanionPage(page => Math.max(0, page - 1))} disabled={companionPage === 0} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold text-violet-600 transition-colors hover:bg-violet-50 disabled:text-slate-300 disabled:hover:bg-transparent" aria-label="Previous companion page"><ChevronLeft className="h-3.5 w-3.5" /> Previous</button>
                    <span className="text-[9px] font-black tabular-nums text-slate-500">Page {companionPage + 1} of {companionPageCount}</span>
                    <button type="button" onClick={() => setCompanionPage(page => Math.min(companionPageCount - 1, page + 1))} disabled={companionPage === companionPageCount - 1} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold text-violet-600 transition-colors hover:bg-violet-50 disabled:text-slate-300 disabled:hover:bg-transparent" aria-label="Next companion page">Next <ChevronRight className="h-3.5 w-3.5" /></button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {visibleCompanions.map(state => {
                    const avatarId = companionAvatarId(state.id);
                    const isSelected = selection.avatarId === avatarId;
                    return (
                      <button
                        key={avatarId}
                        type="button"
                        onClick={() => chooseAvatar(avatarId)}
                        className={`flex min-w-0 flex-col items-center gap-1 rounded-xl p-1.5 transition-all ${isSelected ? "bg-white shadow-sm ring-2 ring-violet-300" : "hover:bg-white/80"}`}
                        title={state.name}
                      >
                        <AvatarSVG id={encodeAvatarSelection(avatarId, selection.borderId)} size={46} petCount={petCount} />
                        <span className={`w-full truncate text-center text-[8px] font-bold ${isSelected ? "text-violet-700" : "text-slate-500"}`}>{state.name}</span>
                      </button>
                    );
                  })}
                </div>

              </>
            ) : (
              <div className="flex min-h-[145px] items-center justify-center text-center">
                <div><Sparkles className="mx-auto h-5 w-5 text-violet-300" /><p className="mt-2 text-xs font-bold text-slate-600">Unlocks at 2000 pets</p></div>
              </div>
            )}
          </div>
        )}

        {activeTab === "borders" && (
          <div id="avatar-picker-panel-borders" role="tabpanel">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                <button type="button" onClick={() => chooseBorder(null)} className={`flex min-w-0 flex-col items-center gap-0.5 rounded-xl p-1.5 transition-all ${!selection.borderId ? "bg-white shadow-sm ring-2 ring-amber-300" : "hover:bg-white/80"}`} title="Use the latest earned border">
                  <AvatarSVG id={selection.avatarId} size={50} petCount={0} />
                  <span className="w-full truncate text-center text-[8px] font-bold text-slate-500">Default</span>
                  <span className="text-center text-[7px] font-semibold leading-tight text-slate-400">Available to all</span>
                </button>
                <fieldset disabled={!premiumChoicesUnlocked} className="contents disabled:[&_button]:cursor-not-allowed disabled:[&_button]:opacity-70">
                {AVATAR_BORDER_CHOICES.map(border => (
                  <button key={border.id} type="button" onClick={() => chooseBorder(border.id)} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl p-1.5 transition-all ${selection.borderId === border.id ? "bg-white shadow-sm ring-2 ring-amber-300" : "hover:bg-white/80"}`} title={`${border.name} · ${border.count} pets`}>
                    <AvatarSVG id={encodeAvatarSelection(selection.avatarId, border.id)} size={50} petCount={Math.max(petCount, border.count)} />
                    <span className="w-full truncate text-center text-[8px] font-bold text-slate-500">{border.name}</span>
                    <span className="text-center text-[7px] font-semibold leading-tight text-slate-400">Requires {border.count.toLocaleString()} pets</span>
                  </button>
                ))}
                </fieldset>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};
