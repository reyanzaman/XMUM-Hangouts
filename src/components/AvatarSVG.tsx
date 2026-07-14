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
  { id: "dog", name: "Happy Puppy", bg: "bg-rose-100" },
  { id: "axolotl", name: "Bubbly Axolotl", bg: "bg-pink-100" },
  { id: "penguin", name: "Cozy Penguin", bg: "bg-cyan-100" },
  { id: "hamster", name: "Tiny Hamster", bg: "bg-amber-100" },
  { id: "duckling", name: "Sunny Duckling", bg: "bg-yellow-100" },
  { id: "red-panda", name: "Rosy Red Panda", bg: "bg-orange-100" },
  { id: "otter", name: "Pebble Otter", bg: "bg-cyan-100" },
  { id: "lamb", name: "Cloudy Lamb", bg: "bg-violet-100" },
  { id: "seal", name: "Marshmallow Seal", bg: "bg-sky-100" }
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
            <circle cx="23" cy="24" r="5" fill="#FFF7ED" opacity="0.75" />
            <circle cx="78" cy="20" r="3" fill="#FFF7ED" opacity="0.85" />

            {/* Soft rounded ears */}
            <path d="M20 43 Q10 25 17 13 Q32 18 39 34 Z" fill="#F97316" stroke="#7C2D12" strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M80 43 Q90 25 83 13 Q68 18 61 34 Z" fill="#F97316" stroke="#7C2D12" strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M22 34 Q17 24 20 20 Q29 24 34 34 Z" fill="#FDA4AF" />
            <path d="M78 34 Q83 24 80 20 Q71 24 66 34 Z" fill="#FDA4AF" />

            {/* Chubby plush head with fluffy side tufts */}
            <path d="M17 57 Q8 62 18 69 L25 67 M83 57 Q92 62 82 69 L75 67" fill="#FB923C" stroke="#7C2D12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="50" cy="56" r="33" fill="#F97316" stroke="#7C2D12" strokeWidth="2.6" />
            <path d="M20 57 Q28 44 45 51 Q50 54 50 61 Q50 54 55 51 Q72 44 80 57 Q76 74 58 77 Q50 78 42 77 Q24 74 20 57 Z" fill="#FFF7ED" />

            {/* Large sparkling eyes */}
            <circle cx="37" cy="52" r="5.5" fill="#431407" />
            <circle cx="63" cy="52" r="5.5" fill="#431407" />
            <circle cx="39" cy="50" r="1.8" fill="#FFFFFF" /><circle cx="35.5" cy="54" r="0.8" fill="#FFFFFF" />
            <circle cx="65" cy="50" r="1.8" fill="#FFFFFF" /><circle cx="61.5" cy="54" r="0.8" fill="#FFFFFF" />

            {/* Tiny nose, smile and rosy cheeks */}
            <path d="M46 61 Q50 58 54 61 Q53 66 50 66 Q47 66 46 61 Z" fill="#431407" />
            <path d="M43 68 Q47 72 50 68 Q53 72 57 68" stroke="#7C2D12" strokeWidth="2.2" strokeLinecap="round" />
            <ellipse cx="27" cy="64" rx="6" ry="3.5" fill="#FDA4AF" opacity="0.85" />
            <ellipse cx="73" cy="64" rx="6" ry="3.5" fill="#FDA4AF" opacity="0.85" />

            {/* Leaf beret and fluffy chest */}
            <path d="M35 29 Q50 17 65 29 Q51 33 35 29 Z" fill="#FBBF24" stroke="#92400E" strokeWidth="1.6" />
            <path d="M50 23 Q55 12 63 17 Q60 26 50 27" fill="#4ADE80" stroke="#166534" strokeWidth="1.5" />
            <path d="M38 78 Q50 70 62 78 L58 87 Q50 91 42 87 Z" fill="#FFFFFF" opacity="0.92" />
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
            <circle cx="24" cy="22" r="5" fill="#FFFFFF" opacity="0.65" />
            <circle cx="78" cy="30" r="3.5" fill="#FFFFFF" opacity="0.75" />
            <path d="M13 79 Q23 84 33 79 T53 79 T73 79 T87 79" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" />

            {/* Round floating body and heart-like feather wings */}
            <ellipse cx="51" cy="67" rx="34" ry="23" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2.3" />
            <path d="M43 65 C28 48, 16 56, 20 71 C24 84, 39 82, 49 71 C42 73, 35 70, 31 65 C35 66, 40 66, 43 65 Z" fill="#FCE7F3" stroke="#F9A8D4" strokeWidth="1.8" />
            <path d="M60 64 C76 48, 87 57, 82 72 C77 84, 64 80, 54 70 C61 72, 68 69, 72 64 C68 66, 64 65, 60 64 Z" fill="#FCE7F3" stroke="#F9A8D4" strokeWidth="1.8" />

            {/* Soft curved neck with a clearly rounded head */}
            <path d="M46 69 C39 58, 39 45, 44 36 C48 29, 54 26, 61 28 C67 30, 70 36, 67 42 C64 48, 57 49, 53 44 C51 50, 53 60, 61 68" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2.4" strokeLinejoin="round" />
            <circle cx="61" cy="34" r="13" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2.2" />

            {/* Sparkly eye, tiny beak and blush */}
            <circle cx="58" cy="33" r="3" fill="#1E293B" />
            <circle cx="59" cy="32" r="1" fill="#FFFFFF" />
            <path d="M72 34 L84 39 L72 43 Q75 39 72 34 Z" fill="#FBBF24" stroke="#C2410C" strokeWidth="1.3" />
            <ellipse cx="64" cy="42" rx="4.5" ry="2.5" fill="#FDA4AF" opacity="0.75" />

            {/* Bow and tiny pearl crown */}
            <path d="M43 48 Q34 41 31 49 Q34 57 46 52 Q51 58 56 52 Q68 57 71 49 Q68 41 59 48 Q51 42 43 48 Z" fill="#FB7185" stroke="#BE185D" strokeWidth="1.5" />
            <circle cx="51" cy="50" r="3.5" fill="#FFF1F2" />
            <path d="M52 23 L56 14 L61 20 L67 14 L69 26" fill="#FDE68A" stroke="#A16207" strokeWidth="1.4" strokeLinejoin="round" />
            <circle cx="61" cy="19" r="2" fill="#FFFFFF" />
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
      case "axolotl":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#FCE7F3" />
            <g strokeLinecap="round" strokeLinejoin="round">
              <path d="M27 37 L14 25 M27 43 L10 42 M28 50 L15 59" stroke="#F472B6" strokeWidth="7" />
              <path d="M73 37 L86 25 M73 43 L90 42 M72 50 L85 59" stroke="#F472B6" strokeWidth="7" />
              <circle cx="14" cy="25" r="4" fill="#FDA4AF" /><circle cx="10" cy="42" r="4" fill="#FDA4AF" /><circle cx="15" cy="59" r="4" fill="#FDA4AF" />
              <circle cx="86" cy="25" r="4" fill="#FDA4AF" /><circle cx="90" cy="42" r="4" fill="#FDA4AF" /><circle cx="85" cy="59" r="4" fill="#FDA4AF" />
              <rect x="20" y="24" width="60" height="60" rx="28" fill="#F9A8D4" stroke="#BE185D" strokeWidth="2.5" />
              <ellipse cx="37" cy="50" rx="5" ry="6" fill="#4C1D95" /><ellipse cx="63" cy="50" rx="5" ry="6" fill="#4C1D95" />
              <circle cx="38.5" cy="48" r="1.6" fill="white" /><circle cx="64.5" cy="48" r="1.6" fill="white" />
              <path d="M43 61 Q50 68 57 61" stroke="#831843" strokeWidth="2.5" />
              <ellipse cx="28" cy="61" rx="6" ry="3.5" fill="#FB7185" opacity="0.65" /><ellipse cx="72" cy="61" rx="6" ry="3.5" fill="#FB7185" opacity="0.65" />
              <path d="M45 29 Q50 21 55 29" stroke="#FDF2F8" strokeWidth="3" />
            </g>
          </svg>
        );
      case "penguin":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#CFFAFE" />
            <ellipse cx="50" cy="55" rx="31" ry="35" fill="#1E293B" stroke="#0F172A" strokeWidth="2.5" />
            <path d="M26 51 Q30 26 50 37 Q70 26 74 51 Q76 77 50 85 Q24 77 26 51 Z" fill="#F8FAFC" />
            <path d="M25 57 Q8 61 20 76 Q29 78 33 66 M75 57 Q92 61 80 76 Q71 78 67 66" fill="#334155" stroke="#0F172A" strokeWidth="2" />
            <circle cx="39" cy="50" r="4.5" fill="#0F172A" /><circle cx="61" cy="50" r="4.5" fill="#0F172A" />
            <circle cx="40.5" cy="48.5" r="1.4" fill="white" /><circle cx="62.5" cy="48.5" r="1.4" fill="white" />
            <path d="M43 58 L50 64 L57 58 L50 55 Z" fill="#FBBF24" stroke="#92400E" strokeWidth="1.3" />
            <ellipse cx="31" cy="60" rx="5" ry="3" fill="#FDA4AF" opacity="0.7" /><ellipse cx="69" cy="60" rx="5" ry="3" fill="#FDA4AF" opacity="0.7" />
            <path d="M28 32 Q50 22 72 32" stroke="#FB7185" strokeWidth="7" strokeLinecap="round" /><path d="M67 31 L77 40" stroke="#FB7185" strokeWidth="7" strokeLinecap="round" />
            <ellipse cx="39" cy="88" rx="10" ry="4" fill="#FBBF24" /><ellipse cx="61" cy="88" rx="10" ry="4" fill="#FBBF24" />
          </svg>
        );
      case "hamster":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#FEF3C7" />
            <circle cx="25" cy="31" r="13" fill="#D97706" stroke="#78350F" strokeWidth="2.5" /><circle cx="75" cy="31" r="13" fill="#D97706" stroke="#78350F" strokeWidth="2.5" />
            <circle cx="25" cy="31" r="6" fill="#FDA4AF" /><circle cx="75" cy="31" r="6" fill="#FDA4AF" />
            <circle cx="50" cy="57" r="32" fill="#F59E0B" stroke="#78350F" strokeWidth="2.5" />
            <path d="M27 55 Q31 38 50 46 Q69 38 73 55 Q75 78 50 85 Q25 78 27 55 Z" fill="#FFF7ED" />
            <circle cx="38" cy="53" r="4.5" fill="#451A03" /><circle cx="62" cy="53" r="4.5" fill="#451A03" />
            <circle cx="39.5" cy="51.5" r="1.3" fill="white" /><circle cx="63.5" cy="51.5" r="1.3" fill="white" />
            <ellipse cx="50" cy="62" rx="4" ry="3" fill="#FB7185" />
            <path d="M46 66 Q50 70 54 66" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
            <circle cx="28" cy="64" r="8" fill="#FDBA74" /><circle cx="72" cy="64" r="8" fill="#FDBA74" />
            <path d="M43 71 L47 78 L53 78 L57 71" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.2" />
            <path d="M34 83 Q50 74 66 83" stroke="#D97706" strokeWidth="5" strokeLinecap="round" />
          </svg>
        );
      case "duckling":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#FEF9C3" />
            <path d="M16 73 Q27 78 38 73 T60 73 T82 73" stroke="#7DD3FC" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="50" cy="58" rx="31" ry="29" fill="#FDE047" stroke="#CA8A04" strokeWidth="2.5" />
            <path d="M29 52 Q10 50 16 68 Q26 76 38 62 M71 52 Q90 50 84 68 Q74 76 62 62" fill="#FACC15" stroke="#CA8A04" strokeWidth="2" />
            <path d="M35 31 Q42 17 51 29 Q59 15 67 31" fill="#FDE047" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" />
            <circle cx="39" cy="52" r="4.5" fill="#422006" /><circle cx="61" cy="52" r="4.5" fill="#422006" />
            <circle cx="40.5" cy="50.5" r="1.4" fill="white" /><circle cx="62.5" cy="50.5" r="1.4" fill="white" />
            <path d="M39 61 Q50 53 61 61 Q50 70 39 61 Z" fill="#FB923C" stroke="#9A3412" strokeWidth="1.5" />
            <ellipse cx="28" cy="61" rx="5" ry="3" fill="#FB7185" opacity="0.65" /><ellipse cx="72" cy="61" rx="5" ry="3" fill="#FB7185" opacity="0.65" />
            <path d="M44 82 Q50 87 56 82" stroke="#CA8A04" strokeWidth="3" strokeLinecap="round" />
          </svg>
        );
      case "red-panda":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#FFEDD5" />
            <path d="M20 42 Q12 24 20 15 Q34 20 40 34 M80 42 Q88 24 80 15 Q66 20 60 34" fill="#EA580C" stroke="#431407" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M22 33 Q19 24 23 21 Q31 25 35 33 M78 33 Q81 24 77 21 Q69 25 65 33" fill="#FDE68A" />
            <circle cx="50" cy="56" r="33" fill="#F97316" stroke="#431407" strokeWidth="2.5" />
            <path d="M21 51 Q32 39 44 49 Q50 56 56 49 Q68 39 79 51 Q73 69 50 72 Q27 69 21 51 Z" fill="#FFF7ED" />
            <ellipse cx="37" cy="51" rx="8" ry="7" fill="#431407" transform="rotate(-13 37 51)" /><ellipse cx="63" cy="51" rx="8" ry="7" fill="#431407" transform="rotate(13 63 51)" />
            <circle cx="38" cy="50" r="3" fill="#FFFFFF" /><circle cx="62" cy="50" r="3" fill="#FFFFFF" /><circle cx="39" cy="49" r="1" fill="#431407" /><circle cx="61" cy="49" r="1" fill="#431407" />
            <ellipse cx="50" cy="61" rx="4" ry="3" fill="#431407" /><path d="M44 66 Q50 72 56 66" stroke="#431407" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="27" cy="62" rx="5" ry="3" fill="#FDA4AF" /><ellipse cx="73" cy="62" rx="5" ry="3" fill="#FDA4AF" />
            <path d="M30 79 Q50 70 70 79 L63 89 Q50 94 37 89 Z" fill="#BE123C" /><path d="M44 79 L50 86 L56 79" fill="none" stroke="#FDE68A" strokeWidth="3" />
          </svg>
        );
      case "otter":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#CFFAFE" />
            <circle cx="25" cy="31" r="11" fill="#8B5E3C" stroke="#422006" strokeWidth="2.2" /><circle cx="75" cy="31" r="11" fill="#8B5E3C" stroke="#422006" strokeWidth="2.2" />
            <circle cx="25" cy="31" r="5" fill="#D6A273" /><circle cx="75" cy="31" r="5" fill="#D6A273" />
            <ellipse cx="50" cy="57" rx="32" ry="33" fill="#9A6846" stroke="#422006" strokeWidth="2.5" />
            <ellipse cx="50" cy="61" rx="22" ry="23" fill="#F1D0AC" />
            <circle cx="39" cy="51" r="4" fill="#422006" /><circle cx="61" cy="51" r="4" fill="#422006" /><circle cx="40.5" cy="49.5" r="1.2" fill="#FFFFFF" /><circle cx="62.5" cy="49.5" r="1.2" fill="#FFFFFF" />
            <ellipse cx="50" cy="60" rx="5" ry="3.5" fill="#422006" /><path d="M44 65 Q50 71 56 65" stroke="#422006" strokeWidth="2" strokeLinecap="round" />
            <path d="M35 61 L19 57 M35 66 L18 68 M65 61 L81 57 M65 66 L82 68" stroke="#6B442A" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="29" cy="61" r="4" fill="#FDA4AF" opacity="0.7" /><circle cx="71" cy="61" r="4" fill="#FDA4AF" opacity="0.7" />
            <path d="M39 80 Q50 69 61 80 Q57 90 50 92 Q43 90 39 80 Z" fill="#FB7185" stroke="#9F1239" strokeWidth="1.5" />
            <circle cx="81" cy="23" r="4" fill="none" stroke="#38BDF8" strokeWidth="2" /><circle cx="86" cy="35" r="2.5" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
          </svg>
        );
      case "lamb":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#EDE9FE" />
            <path d="M22 39 Q8 32 13 20 Q24 14 32 29 M78 39 Q92 32 87 20 Q76 14 68 29" fill="#FDE68A" stroke="#92400E" strokeWidth="2.3" strokeLinejoin="round" />
            <path d="M16 49 Q5 38 17 31 Q15 16 31 20 Q38 7 50 18 Q62 7 69 20 Q85 16 83 31 Q95 38 84 49 Q91 63 77 68 Q70 84 57 76 Q50 88 43 76 Q30 84 23 68 Q9 63 16 49 Z" fill="#FFFFFF" stroke="#64748B" strokeWidth="2.3" />
            <ellipse cx="50" cy="56" rx="24" ry="23" fill="#FFF7ED" />
            <circle cx="40" cy="52" r="4.5" fill="#334155" /><circle cx="60" cy="52" r="4.5" fill="#334155" /><circle cx="41.5" cy="50.5" r="1.3" fill="#FFFFFF" /><circle cx="61.5" cy="50.5" r="1.3" fill="#FFFFFF" />
            <path d="M46 60 Q50 56 54 60 Q53 64 50 64 Q47 64 46 60 Z" fill="#FB7185" /><path d="M44 67 Q50 72 56 67" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="30" cy="62" rx="5" ry="3" fill="#FDA4AF" /><ellipse cx="70" cy="62" rx="5" ry="3" fill="#FDA4AF" />
            <path d="M35 78 Q50 70 65 78" stroke="#A78BFA" strokeWidth="6" strokeLinecap="round" /><circle cx="50" cy="80" r="4" fill="#FDE68A" />
          </svg>
        );
      case "seal":
        return (
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#E0F2FE" />
            <path d="M14 79 Q25 84 36 79 T58 79 T80 79" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" />
            <ellipse cx="50" cy="58" rx="34" ry="31" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2.5" />
            <path d="M22 63 Q6 67 18 80 Q29 80 35 70 M78 63 Q94 67 82 80 Q71 80 65 70" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
            <circle cx="39" cy="51" r="5" fill="#334155" /><circle cx="61" cy="51" r="5" fill="#334155" /><circle cx="40.5" cy="49" r="1.5" fill="#FFFFFF" /><circle cx="62.5" cy="49" r="1.5" fill="#FFFFFF" />
            <ellipse cx="50" cy="62" rx="5" ry="3.5" fill="#475569" /><path d="M44 67 Q50 73 56 67" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
            <path d="M40 61 L19 57 M40 66 L18 68 M60 61 L81 57 M60 66 L82 68" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
            <ellipse cx="28" cy="62" rx="6" ry="3.5" fill="#FDA4AF" opacity="0.8" /><ellipse cx="72" cy="62" rx="6" ry="3.5" fill="#FDA4AF" opacity="0.8" />
            <path d="M36 30 Q50 18 64 30" fill="#F9A8D4" stroke="#BE185D" strokeWidth="2" /><circle cx="50" cy="22" r="5" fill="#FDE68A" />
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
