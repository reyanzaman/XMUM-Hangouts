/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { HangoutRestrictions } from "../types";
import { COUNTRIES, LANGUAGES, XMUM_PROGRAMS } from "../config/xmum-config";
import { X } from "lucide-react";

interface RestrictionBuilderProps {
  restrictions: HangoutRestrictions;
  onChange: (r: HangoutRestrictions) => void;
}

export const RestrictionBuilder: React.FC<RestrictionBuilderProps> = ({ restrictions, onChange }) => {
  const toggleArrayItem = (key: keyof HangoutRestrictions, item: string) => {
    const list = (restrictions[key] as string[]) || [];
    const updated = list.includes(item) ? list.filter(x => x !== item) : [...list, item];
    onChange({
      ...restrictions,
      [key]: updated
    });
  };

  const handleSelectChange = (key: keyof HangoutRestrictions, val: string) => {
    if (!val) return;
    const list = (restrictions[key] as string[]) || [];
    if (!list.includes(val)) {
      onChange({
        ...restrictions,
        [key]: [...list, val]
      });
    }
  };

  const handleAgeChange = (field: "age_min" | "age_max", val: number | null) => {
    onChange({
      ...restrictions,
      [field]: val
    });
  };

  return (
    <div id="restriction-builder-card" className="space-y-4 pt-1">
      {/* 2-Column Responsive Grid with Clean Spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-sans">
        
        {/* Country Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 block">
            Country Preferences
          </label>
          <select
            id="restrict-country-select"
            onChange={e => {
              handleSelectChange("countries", e.target.value);
              e.target.value = "";
            }}
            className="w-full bg-slate-50/60 border border-slate-100/50 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-rose-200 focus:bg-white transition-all cursor-pointer"
          >
            <option value="">Any Country</option>
            {COUNTRIES.filter(c => !restrictions.countries.includes(c)).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {restrictions.countries.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {restrictions.countries.map(c => (
                <span key={c} className="inline-flex items-center gap-1 bg-rose-50/45 text-rose-600 px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-rose-100/20">
                  {c}
                  <button
                    type="button"
                    onClick={() => toggleArrayItem("countries", c)}
                    className="hover:bg-rose-100 text-rose-700 rounded-full p-0.5 focus:outline-none cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Language Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 block">
            Language Preferences
          </label>
          <select
            id="restrict-language-select"
            onChange={e => {
              handleSelectChange("languages", e.target.value);
              e.target.value = "";
            }}
            className="w-full bg-slate-50/60 border border-slate-100/50 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-rose-200 focus:bg-white transition-all cursor-pointer"
          >
            <option value="">Any Language</option>
            {LANGUAGES.filter(l => !restrictions.languages.includes(l)).map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          {restrictions.languages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {restrictions.languages.map(l => (
                <span key={l} className="inline-flex items-center gap-1 bg-rose-50/45 text-rose-600 px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-rose-100/20">
                  {l}
                  <button
                    type="button"
                    onClick={() => toggleArrayItem("languages", l)}
                    className="hover:bg-rose-100 text-rose-700 rounded-full p-0.5 focus:outline-none cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Program Selector */}
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[11px] font-bold text-slate-500 block">
            Academic Program Preferences
          </label>
          <select
            id="restrict-program-select"
            onChange={e => {
              handleSelectChange("programs", e.target.value);
              e.target.value = "";
            }}
            className="w-full bg-slate-50/60 border border-slate-100/50 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-rose-200 focus:bg-white transition-all cursor-pointer"
          >
            <option value="">Any Program</option>
            {XMUM_PROGRAMS.filter(p => !restrictions.programs.includes(p)).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {restrictions.programs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {restrictions.programs.map(p => (
                <span key={p} className="inline-flex items-center gap-1 bg-rose-50/45 text-rose-600 px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-rose-100/20 max-w-full">
                  <span className="truncate">{p}</span>
                  <button
                    type="button"
                    onClick={() => toggleArrayItem("programs", p)}
                    className="hover:bg-rose-100 text-rose-700 rounded-full p-0.5 focus:outline-none cursor-pointer shrink-0"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Student Level Toggles */}
        <div className="space-y-1.5 sm:col-span-1 pt-1">
          <label className="text-[11px] font-bold text-slate-500 block">
            Student Level
          </label>
          <div className="flex flex-wrap gap-2">
            {["foundation", "degree", "postgraduate"].map(t => {
              const active = restrictions.student_types.includes(t);
              return (
                <button
                  id={`restrict-type-${t}`}
                  key={t}
                  type="button"
                  onClick={() => toggleArrayItem("student_types", t)}
                  className={`text-[10px] sm:text-xs py-1.5 px-3 rounded-xl capitalize cursor-pointer text-center transition-all ${
                    active 
                      ? "bg-rose-500 text-white font-semibold" 
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100/90"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Gender Selection */}
        <div className="space-y-1.5 sm:col-span-1 pt-1">
          <label className="text-[11px] font-bold text-slate-500 block">
            Genders
          </label>
          <div className="flex flex-wrap gap-2">
            {["Male", "Female"].map(g => {
              const active = restrictions.genders.includes(g);
              return (
                <button
                  id={`restrict-gender-${g.replace(/\s+/g, '')}`}
                  key={g}
                  type="button"
                  onClick={() => toggleArrayItem("genders", g)}
                  className={`text-[10px] sm:text-xs py-1.5 px-3 rounded-xl cursor-pointer text-center transition-all ${
                    active 
                      ? "bg-rose-500 text-white font-semibold" 
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100/90"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Age Range Inputs */}
        <div className="space-y-1.5 sm:col-span-2 pt-1 border-t border-slate-100/30">
          <label className="text-[11px] font-bold text-slate-500 block">
            Age Bounds
          </label>
          <div className="flex items-center gap-2">
            <input
              id="restrict-age-min"
              type="number"
              min="16"
              max="50"
              value={restrictions.age_min || ""}
              onChange={e => handleAgeChange("age_min", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="e.g. 18"
              className="w-full bg-slate-50/60 border border-slate-100/50 rounded-xl px-3 py-2 text-xs text-slate-750 outline-none focus:border-rose-300 focus:bg-white transition-all font-sans"
            />
            <span className="text-slate-400 font-medium font-sans">to</span>
            <input
              id="restrict-age-max"
              type="number"
              min="16"
              max="50"
              value={restrictions.age_max || ""}
              onChange={e => handleAgeChange("age_max", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="e.g. 25"
              className="w-full bg-slate-50/60 border border-slate-100/50 rounded-xl px-3 py-2 text-xs text-slate-750 outline-none focus:border-rose-300 focus:bg-white transition-all font-sans"
            />
          </div>
        </div>

      </div>
    </div>
  );
};
