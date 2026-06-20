/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface AvatarProps {
  id: string;
  className?: string;
  size?: number;
}

export const AVATAR_LIST = [
  { id: "panda", name: "Cute Panda", bg: "bg-teal-100" },
  { id: "cat", name: "Playful Kitten", bg: "bg-amber-100" },
  { id: "bunny", name: "Soft Bunny", bg: "bg-pink-100" },
  { id: "bear", name: "Sleepy Grizzly", bg: "bg-orange-100" },
  { id: "fox", name: "Clever Fox", bg: "bg-red-100" },
  { id: "koala", name: "Chilled Koala", bg: "bg-indigo-100" },
  { id: "owl", name: "Wise Owl", bg: "bg-purple-100" },
  { id: "frog", name: "Happy Frog", bg: "bg-green-100" },
  { id: "capybara", name: "Chill Capybara", bg: "bg-amber-200" },
  { id: "swan", name: "Graceful Swan", bg: "bg-sky-100" },
  { id: "racoon", name: "Masked Raccoon", bg: "bg-slate-300" },
  { id: "dog", name: "Happy Puppy", bg: "bg-rose-100" }
];

export const AvatarSVG: React.FC<AvatarProps> = ({ id, className = "", size = 48 }) => {
  const getSVG = () => {
    switch (id) {
      case "panda":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Background */}
            <circle cx="50" cy="50" r="45" fill="#CCFBF1" />
            {/* Ears */}
            <circle cx="28" cy="30" r="12" fill="#1E293B" />
            <circle cx="72" cy="30" r="12" fill="#1E293B" />
            <circle cx="28" cy="30" r="6" fill="#475569" />
            <circle cx="72" cy="30" r="6" fill="#475569" />
            {/* Head */}
            <circle cx="50" cy="55" r="32" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
            {/* Eye Patches */}
            <ellipse cx="40" cy="55" rx="9" ry="11" transform="rotate(-15 40 55)" fill="#1E293B" />
            <ellipse cx="60" cy="55" rx="9" ry="11" transform="rotate(15 60 55)" fill="#1E293B" />
            {/* Eyes */}
            <circle cx="41" cy="53" r="3.5" fill="#FFFFFF" />
            <circle cx="42" cy="52" r="1.2" fill="#111827" />
            <circle cx="59" cy="53" r="3.5" fill="#FFFFFF" />
            <circle cx="58" cy="52" r="1.2" fill="#111827" />
            {/* Nose & Mouth */}
            <ellipse cx="50" cy="62" rx="4" ry="2.5" fill="#1E293B" />
            <path d="M47 66 C 49 68, 50 68, 50 66 C 50 68, 51 68, 53 66" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Blush */}
            <ellipse cx="26" cy="62" rx="4" ry="2.5" fill="#FDA4AF" opacity="0.6" />
            <ellipse cx="74" cy="62" rx="4" ry="2.5" fill="#FDA4AF" opacity="0.6" />
          </svg>
        );
      case "cat":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#FFEFE6" />
            <g>
              {/* Pointy but soft ears with peach blush inner fields */}
              <path d="M22 42 L12 18 C12 18, 25 18, 38 31 Z" fill="#D97706" stroke="#451A03" strokeWidth="1.5" />
              <path d="M23 39 L16 23 L32 32 Z" fill="#F472B6" />
              <path d="M78 42 L88 18 C88 18, 75 18, 62 31 Z" fill="#D97706" stroke="#451A03" strokeWidth="1.5" />
              <path d="M77 39 L84 23 L68 32 Z" fill="#F472B6" />
              
              {/* Fluffy side fur cheeks */}
              <path d="M12 56 Q6 60, 16 66 L84 66 Q94 60, 88 56 Z" fill="#F59E0B" stroke="#451A03" strokeWidth="1.5" />
              <path d="M14 58 Q8 62, 18 64 L82 64 Q92 62, 86 58 Z" fill="#FDBA74" />
              
              {/* Round chubby marshmallow head */}
              <circle cx="50" cy="55" r="33" fill="#FBBF24" stroke="#D97706" strokeWidth="2.5" />
              
              {/* Cute white fluffy snout belly overlay */}
              <ellipse cx="50" cy="63" rx="14" ry="10" fill="#FFFFFF" />
              
              {/* Sparkly giant adorable baby-cat eyes */}
              <circle cx="37" cy="53" r="5" fill="#1E293B" />
              <circle cx="39" cy="51" r="1.8" fill="#FFFFFF" />
              <circle cx="35.5" cy="54.5" r="0.7" fill="#FFFFFF" />
              
              <circle cx="63" cy="53" r="5" fill="#1E293B" />
              <circle cx="65" cy="51" r="1.8" fill="#FFFFFF" />
              <circle cx="61.5" cy="54.5" r="0.7" fill="#FFFFFF" />
              
              {/* Sweet pink strawberry nose */}
              <polygon points="50,60 46,57 54,57" fill="#FB7185" />
              
              {/* Friendly smiling mouth */}
              <path d="M44 62 C47 64, 50 64, 50 62 C50 64, 53 64, 56 62" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
              
              {/* Golden whiskers */}
              <path d="M22 58 H8 M23 63 L10 67 M78 58 H92 M77 63 L90 67" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
              
              {/* Glowing pink fluff cheeks */}
              <circle cx="26" cy="62" r="5" fill="#FDA4AF" opacity="0.85" />
              <circle cx="74" cy="62" r="5" fill="#FDA4AF" opacity="0.85" />
            </g>
          </svg>
        );
      case "bunny":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#FCE7F3" />
            {/* Ears */}
            <ellipse cx="35" cy="28" rx="8" ry="24" transform="rotate(-10 35 28)" fill="#FFF5F5" stroke="#F472B6" strokeWidth="2" />
            <ellipse cx="35" cy="28" rx="4" ry="18" transform="rotate(-10 35 28)" fill="#F9A8D4" />
            <ellipse cx="65" cy="28" rx="8" ry="24" transform="rotate(10 65 28)" fill="#FFF5F5" stroke="#F472B6" strokeWidth="2" />
            <ellipse cx="65" cy="28" rx="4" ry="18" transform="rotate(10 65 28)" fill="#F9A8D4" />
            {/* Head */}
            <circle cx="50" cy="60" r="28" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
            {/* Eyes */}
            <circle cx="40" cy="56" r="3.5" fill="#1E293B" />
            <circle cx="41.5" cy="54.5" r="1" fill="#FFFFFF" />
            <circle cx="60" cy="56" r="3.5" fill="#1E293B" />
            <circle cx="58.5" cy="54.5" r="1" fill="#FFFFFF" />
            {/* Nose */}
            <polygon points="50,62 47,59 53,59" fill="#F43F5E" />
            {/* Mouth */}
            <path d="M46 65 C 48 67, 50 67, 50 65 C 50 67, 52 67, 54 65" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Blush */}
            <circle cx="28" cy="62" r="4" fill="#FDA4AF" />
            <circle cx="72" cy="62" r="4" fill="#FDA4AF" />
          </svg>
        );
      case "bear":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#FFEDD5" />
            {/* Ears */}
            <circle cx="28" cy="32" r="11" fill="#7C2D12" stroke="#431407" strokeWidth="1.5" />
            <circle cx="28" cy="32" r="5" fill="#FF8A65" />
            <circle cx="72" cy="32" r="11" fill="#7C2D12" stroke="#431407" strokeWidth="1.5" />
            <circle cx="72" cy="32" r="5" fill="#FF8A65" />
            {/* Head */}
            <circle cx="50" cy="58" r="30" fill="#9A3412" stroke="#431407" strokeWidth="2" />
            {/* Snout */}
            <circle cx="50" cy="65" r="11" fill="#FFEDD5" />
            <ellipse cx="50" cy="60" rx="4.5" ry="3" fill="#431407" />
            <path d="M47 64 C 49 67, 50 67, 50 64 C 50 67, 51 67, 53 64" stroke="#431407" strokeWidth="2" fill="none" />
            {/* Eyes */}
            <circle cx="39" cy="52" r="3.5" fill="#431407" />
            <circle cx="40" cy="51" r="1" fill="#FFFFFF" />
            <circle cx="61" cy="52" r="3.5" fill="#431407" />
            <circle cx="60" cy="51" r="1" fill="#FFFFFF" />
            {/* Blush */}
            <ellipse cx="28" cy="61" rx="4" ry="2" fill="#F43F5E" opacity="0.6" />
            <ellipse cx="72" cy="61" rx="4" ry="2" fill="#F43F5E" opacity="0.6" />
          </svg>
        );
      case "fox":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#FFE4E6" />
            {/* Ears */}
            <polygon points="20,40 10,12 40,32" fill="#EA580C" stroke="#7C2D12" strokeWidth="2" />
            <polygon points="23,38 16,19 36,32" fill="#FFFFFF" />
            <polygon points="80,40 90,12 60,32" fill="#EA580C" stroke="#7C2D12" strokeWidth="2" />
            <polygon points="77,38 84,19 64,32" fill="#FFFFFF" />
            {/* Head */}
            <path d="M20 54 C 20 72, 80 72, 80 54 C 80 40, 20 40, 20 54 Z" fill="#EA580C" stroke="#7C2D12" strokeWidth="2" />
            {/* White cheeks */}
            <path d="M21 54 C 23 68, 40 68, 48 58 Q 49 56, 50 58 C 60 68, 77 68, 79 54 Q 70 46, 50 46 Q 30 46, 21 54 Z" fill="#F8FAFC" />
            {/* Eyes */}
            <circle cx="36" cy="50" r="3.5" fill="#1E293B" />
            <circle cx="37" cy="49" r="1" fill="#FFFFFF" />
            <circle cx="64" cy="50" r="3.5" fill="#1E293B" />
            <circle cx="63" cy="49" r="1" fill="#FFFFFF" />
            {/* Nose */}
            <ellipse cx="50" cy="58" rx="3.5" ry="2.5" fill="#1E293B" />
            {/* Blush */}
            <circle cx="26" cy="58" r="3" fill="#FDA4AF" />
            <circle cx="74" cy="58" r="3" fill="#FDA4AF" />
          </svg>
        );
      case "koala":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#E0E7FF" />
            {/* Big fluffy ears */}
            <circle cx="20" cy="40" r="15" fill="#94A3B8" stroke="#475569" strokeWidth="2" />
            <circle cx="20" cy="40" r="9" fill="#FFF1F2" />
            <circle cx="80" cy="40" r="15" fill="#94A3B8" stroke="#475569" strokeWidth="2" />
            <circle cx="80" cy="40" r="9" fill="#FFF1F2" />
            {/* Head */}
            <circle cx="50" cy="58" r="28" fill="#94A3B8" stroke="#475569" strokeWidth="2" />
            {/* Eyes */}
            <circle cx="38" cy="53" r="3" fill="#1E293B" />
            <circle cx="39" cy="51.5" r="1" fill="#FFFFFF" />
            <circle cx="62" cy="53" r="3" fill="#1E293B" />
            <circle cx="61" cy="51.5" r="1" fill="#FFFFFF" />
            {/* Huge Nose */}
            <ellipse cx="50" cy="61" rx="6" ry="10" fill="#334155" />
            {/* Mouth */}
            <path d="M47 73 Q 50 75, 53 73" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            {/* Blush */}
            <circle cx="30" cy="62" r="3.5" fill="#FDA4AF" />
            <circle cx="70" cy="62" r="3.5" fill="#FDA4AF" />
          </svg>
        );
      case "owl":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#F3E8FF" />
            {/* Ears/Tufts */}
            <polygon points="26,30 20,12 40,28" fill="#7E22CE" stroke="#5B21B6" strokeWidth="1.5" />
            <polygon points="74,30 80,12 60,28" fill="#7E22CE" stroke="#5B21B6" strokeWidth="1.5" />
            {/* Body */}
            <circle cx="50" cy="56" r="28" fill="#8B5CF6" stroke="#5B21B6" strokeWidth="2" />
            {/* Chest */}
            <path d="M30 62 C 32 75, 68 75, 70 62 C 70 50, 30 50, 30 62 Z" fill="#F3E8FF" />
            {/* Feathers */}
            <path d="M44 58 Q 47 62, 50 58 M47 64 Q 50 68, 53 64" stroke="#7E22CE" strokeWidth="1.5" strokeLinecap="round" />
            {/* Big Eyes */}
            <circle cx="36" cy="45" r="9" fill="#FFFFFF" stroke="#5B21B6" strokeWidth="1.5" />
            <circle cx="36" cy="45" r="5" fill="#1E293B" />
            <circle cx="37.5" cy="43.5" r="1.5" fill="#FFFFFF" />
            <circle cx="64" cy="45" r="9" fill="#FFFFFF" stroke="#5B21B6" strokeWidth="1.5" />
            <circle cx="64" cy="45" r="5" fill="#1E293B" />
            <circle cx="65.5" cy="43.5" r="1.5" fill="#FFFFFF" />
            {/* Beak */}
            <polygon points="50,47 46,55 54,55" fill="#F59E0B" />
          </svg>
        );
      case "frog":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#DCFCE7" />
            {/* Eye Bulges */}
            <circle cx="34" cy="38" r="11" fill="#10B981" stroke="#047857" strokeWidth="2" />
            <circle cx="66" cy="38" r="11" fill="#10B981" stroke="#047857" strokeWidth="2" />
            {/* Eye Bulge Centers */}
            <circle cx="34" cy="38" r="8" fill="#FFFFFF" />
            <circle cx="34" cy="38" r="4.5" fill="#1E293B" />
            <circle cx="35.5" cy="36.5" r="1" fill="#FFFFFF" />
            <circle cx="66" cy="38" r="8" fill="#FFFFFF" />
            <circle cx="66" cy="38" r="4.5" fill="#1E293B" />
            <circle cx="67.5" cy="36.5" r="1" fill="#FFFFFF" />
            {/* Body */}
            <ellipse cx="50" cy="62" rx="30" ry="24" fill="#10B981" stroke="#047857" strokeWidth="2" />
            {/* Cheeks */}
            <circle cx="28" cy="63" r="5" fill="#F43F5E" opacity="0.6" />
            <circle cx="72" cy="63" r="5" fill="#F43F5E" opacity="0.6" />
            {/* Mouth */}
            <path d="M36 60 Q 50 72, 64 60" stroke="#064E3B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
        );
      case "capybara":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#FEF3E2" />
            <g>
              {/* Cute tiny droopy round ears on sides to make it look like a plushie */}
              <circle cx="20" cy="38" r="7.5" fill="#C59B78" stroke="#1E293B" strokeWidth="2.5" />
              <circle cx="20" cy="38" r="4" fill="#FDA4AF" />
              <circle cx="80" cy="38" r="7.5" fill="#C59B78" stroke="#1E293B" strokeWidth="2.5" />
              <circle cx="80" cy="38" r="4" fill="#FDA4AF" />
              
              {/* Extremely round plushie-like body/head - super chubby squircle (lighter, soft tan color) */}
              <rect x="18" y="25" width="64" height="60" rx="30" fill="#E2B495" stroke="#1E293B" strokeWidth="2.5" />
              
              {/* Mini plushie arms/paws peeking under cheek to look incredibly cute */}
              <ellipse cx="34" cy="80" rx="6.5" ry="5" fill="#C59B78" stroke="#1E293B" strokeWidth="2.5" />
              <ellipse cx="66" cy="80" rx="6.5" ry="5" fill="#C59B78" stroke="#1E293B" strokeWidth="2.5" />

              {/* Fuzzy plush hairy tufts removed to keep head smooth & round like a neat plush toy */}
              
              {/* Sleepy contented lines for eyes (classic cute capybara cozy plush vibe) */}
              <path d="M30 48 Q35 44, 40 48" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M60 48 Q65 44, 70 48" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" fill="none" />
              
              {/* Round blocky cream plush muzzle */}
              <rect x="33" y="52" width="34" height="22" rx="11" fill="#F3E7DD" stroke="#1E293B" strokeWidth="2.5" />
              {/* Soft dark-brown button nose */}
              <ellipse cx="50" cy="58" rx="4" ry="3.5" fill="#1E293B" />
              
              {/* Cute cozy little smile */}
              <path d="M46 65 Q50 68, 54 65" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              
              {/* Rosy blush cheeks like a toy plushie */}
              <circle cx="26" cy="58" r="6" fill="#FDA4AF" opacity="0.95" />
              <circle cx="74" cy="58" r="6" fill="#FDA4AF" opacity="0.95" />
            </g>
          </svg>
        );
      case "swan":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#E0F2FE" />
            {/* Swimming Waves */}
            <path d="M15 78 Q25 82, 35 78 T55 78 T75 78 T85 78" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" fill="none" />
            
            {/* Floating Cloud feathered Body */}
            <path d="M35 75 C30 65, 45 55, 62 60 C75 64, 85 70, 78 78 Z" fill="#FFFFFF" filter="drop-shadow(0px 2px 2px rgba(14, 165, 233, 0.1))" />
            {/* Elegant Swan Wings */}
            <path d="M52 64 C48 55, 66 50, 72 64 C75 70, 68 76, 52 64 Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
            
            {/* Graceful S-Curve Neck */}
            <path d="M42 68 C42 50, 56 46, 56 34 C56 24, 48 22, 44 28" stroke="#FFFFFF" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Sweet round head */}
            <circle cx="45" cy="27" r="7.5" fill="#FFFFFF" />
            
            {/* Cute Yellow Orange Beak */}
            <polygon points="38,27 28,30 38,32" fill="#F59E0B" />
            <polygon points="38,27 33,29 38,30" fill="#EF4444" /> {/* highlight red part */}
            
            {/* Elegant eye with sparkle */}
            <circle cx="44" cy="26" r="1.8" fill="#1E293B" />
            <circle cx="44.5" cy="25.2" r="0.5" fill="#FFFFFF" />
            
            {/* Cute golden crown */}
            <path d="M41 18 L43 22 L45 18 L47 22 L49 18 L48 23 H42 Z" fill="#FBBF24" />
            
            {/* Rosy blush cheeks */}
            <circle cx="47" cy="29" r="1.5" fill="#F43F5E" opacity="0.8" />
          </svg>
        );
      case "racoon":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#F1F5F9" />
            
            {/* Cute round ears */}
            <circle cx="26" cy="28" r="9.5" fill="#475569" stroke="#334155" strokeWidth="1.5" />
            <circle cx="26" cy="28" r="4.5" fill="#FDA4AF" />
            <circle cx="74" cy="28" r="9.5" fill="#475569" stroke="#334155" strokeWidth="1.5" />
            <circle cx="74" cy="28" r="4.5" fill="#FDA4AF" />
            
            {/* Chubby round raccoon face */}
            <circle cx="50" cy="55" r="30" fill="#64748B" stroke="#334155" strokeWidth="2.5" />
            
            {/* Trademark fluffy white cheeks bottom background */}
            <path d="M21 56 C23 68, 38 71, 50 63 C62 71, 77 68, 79 56 Z" fill="#F8FAFC" />
            
            {/* Cute sleep mask eye bands */}
            <ellipse cx="37" cy="53" rx="11" ry="7.5" transform="rotate(-15 37 53)" fill="#334155" />
            <ellipse cx="63" cy="53" rx="11" ry="7.5" transform="rotate(15 63 53)" fill="#334155" />
            
            {/* Sparkling lovely eyes */}
            <circle cx="37" cy="53" r="4" fill="#0F172A" />
            <circle cx="38.5" cy="51.2" r="1.5" fill="#FFFFFF" />
            <circle cx="35.5" cy="54.5" r="0.6" fill="#FFFFFF" />
            <circle cx="63" cy="53" r="4" fill="#0F172A" />
            <circle cx="64.5" cy="51.2" r="1.5" fill="#FFFFFF" />
            <circle cx="61.5" cy="54.5" r="0.6" fill="#FFFFFF" />
            
            {/* Nose and friendly mouth */}
            <ellipse cx="50" cy="59.5" rx="3.5" ry="2.2" fill="#0F172A" />
            <path d="M47 63" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M45 61 C48 63, 50 63, 50 61 C50 63, 52 63, 55 61" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            
            {/* Blushing cheeks */}
            <circle cx="21" cy="58" r="3.5" fill="#F43F5E" opacity="0.7" />
            <circle cx="79" cy="58" r="3.5" fill="#F43F5E" opacity="0.7" />
          </svg>
        );
      case "dog":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#E0F2FE" />
            <g>
              {/* Pointy but soft fluffy Husky ears with pink insides */}
              <path d="M26 36 L15 14 C15 14, 27 15, 36 26 Z" fill="#475569" stroke="#1E293B" strokeWidth="1.5" />
              <path d="M25 31 L18 19 L30 25 Z" fill="#FDA4AF" />
              <path d="M74 36 L85 14 C85 14, 73 15, 64 26 Z" fill="#475569" stroke="#1E293B" strokeWidth="1.5" />
              <path d="M75 31 L82 19 L70 25 Z" fill="#FDA4AF" />
              
              {/* Fluffy side cheeks tufts */}
              <path d="M12 56 Q6 60, 16 66 L84 66 Q94 60, 88 56 Z" fill="#475569" stroke="#1E293B" strokeWidth="1.5" />
              <path d="M14 58 Q8 62, 18 64 L82 64 Q92 62, 86 58 Z" fill="#64748B" />
              
              {/* Extremely round chubby puppy head */}
              <circle cx="50" cy="55" r="33" fill="#64748B" stroke="#334155" strokeWidth="2.5" />
              
              {/* Husky white mask (eyebrows/cheeks overlay) */}
              <path d="M18 56 C18 73, 82 73, 82 56 C82 46, 70 42, 50 48 C30 42, 18 46, 18 56 Z" fill="#F8FAFC" />
              <ellipse cx="36" cy="48" rx="8" ry="7" fill="#F8FAFC" />
              <ellipse cx="64" cy="48" rx="8" ry="7" fill="#F8FAFC" />
              
              {/* Forehead white stripe/star flame */}
              <path d="M50 32 L47 48 L53 48 Z" fill="#F8FAFC" />
              
              {/* Big, glistening blue puppy eyes */}
              <circle cx="36" cy="49" r="6.5" fill="#1E293B" />
              <circle cx="36" cy="49" r="4" fill="#0EA5E9" />
              <circle cx="36" cy="49" r="2" fill="#0284C7" />
              <circle cx="38" cy="46.5" r="2" fill="#FFFFFF" />
              <circle cx="34.5" cy="51.5" r="0.7" fill="#FFFFFF" />
              
              <circle cx="64" cy="49" r="6.5" fill="#1E293B" />
              <circle cx="64" cy="49" r="4" fill="#0EA5E9" />
              <circle cx="64" cy="49" r="2" fill="#0284C7" />
              <circle cx="66" cy="46.5" r="2" fill="#FFFFFF" />
              <circle cx="62.5" cy="51.5" r="0.7" fill="#FFFFFF" />
              
              {/* Fluffy white muzzle snout overlay */}
              <ellipse cx="50" cy="62" rx="14" ry="10" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
              
              {/* Round black nose */}
              <ellipse cx="50" cy="58" rx="4.5" ry="3" fill="#1E293B" />
              
              {/* Puppy "Blep" (pink tongue sticky out!) */}
              <path d="M48 64 C48 70, 52 70, 52 64 Z" fill="#FB7185" />
              
              {/* Smiling mouth lines */}
              <path d="M42 61 Q50 65, 50 61 Q50 65, 58 61" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
              
              {/* Rosy blush cheeks */}
              <circle cx="25" cy="58" r="4.5" fill="#FDA4AF" opacity="0.8" />
              <circle cx="75" cy="58" r="4.5" fill="#FDA4AF" opacity="0.8" />
            </g>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#E2E8F0" />
            <circle cx="50" cy="40" r="18" fill="#94A3B8" />
            <path d="M22 75 C 22 60, 78 60, 78 75 Z" fill="#94A3B8" />
          </svg>
        );
    }
  };

  return (
    <div
      id={`avatar-${id}`}
      className={`rounded-full overflow-hidden flex items-center justify-center border border-gray-100 shrink-0 aspect-square select-none ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size, maxWidth: size, maxHeight: size }}
    >
      {getSVG()}
    </div>
  );
};
