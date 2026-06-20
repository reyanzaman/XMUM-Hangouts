/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AVATAR_LIST, AvatarSVG } from "./AvatarSVG";

interface AvatarPickerProps {
  selectedId: string;
  onChange: (id: string) => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ selectedId, onChange }) => {
  return (
    <div id="avatar-picker-container" className="space-y-3">
      <label id="avatar-picker-label" className="block text-sm font-semibold text-gray-700">
        Choose Profile Avatar
      </label>
      <div
        id="avatar-picker-grid"
        className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 items-center justify-items-center"
      >
        {AVATAR_LIST.map(avatar => {
          const isSelected = selectedId === avatar.id;
          return (
            <button
              id={`avatar-option-${avatar.id}`}
              key={avatar.id}
              type="button"
              onClick={() => onChange(avatar.id)}
              className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl transition-all duration-200 outline-none w-full max-w-[70px] aspect-square ${
                isSelected
                  ? "bg-white scale-105 shadow-md ring-2 ring-rose-300"
                  : "hover:bg-white/50 grayscale hover:grayscale-0"
              }`}
            >
              <AvatarSVG id={avatar.id} size={50} />
              <span
                id={`avatar-name-${avatar.id}`}
                className={`text-[10px] font-medium truncate w-16 text-center ${
                  isSelected ? "text-rose-600 font-bold" : "text-gray-500"
                }`}
              >
                {avatar.name.split(" ")[1]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
