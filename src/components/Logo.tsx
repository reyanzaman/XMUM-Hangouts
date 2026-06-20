/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";

export const Logo: React.FC<{ size?: "sm" | "md" | "lg"; noBg?: boolean }> = ({ size = "md", noBg = true }) => {
  const dimensions = {
    sm: { container: "h-9 w-9", p: "p-0.5" },
    md: { container: "h-12 w-12", p: "p-0.5" },
    lg: { container: "h-16 w-16", p: "p-0.5" }
  }[size];

  // Colors
  const kittyColor = "#ffffff";
  const contourColor = "#1e293b"; // cute dark slate for lines and pupils
  const blushColor = "#fecdd3"; // soft baby pink blush

  const renderFluffyKittySVG = () => (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full text-white drop-shadow-[0_2.5px_4.5px_rgba(0,0,0,0.14)] select-none aspect-square shrink-0"
    >
      {/* 1. Kitty Ears protruding (tilted, chubby Scottish Fold-like style) */}
      <path d="M 22 36 C 18 22, 33 19, 37 30 Z" fill={kittyColor} stroke={contourColor} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M 25 34 C 22 25, 31 24, 33 30 Z" fill="#fda4af" />
      
      <path d="M 78 36 C 82 22, 67 19, 63 30 Z" fill={kittyColor} stroke={contourColor} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M 75 34 C 72 25, 69 24, 67 30 Z" fill="#fda4af" />

      {/* 2. Round Fluffy Body (incredibly chubby ball kitty silhouette) */}
      <path 
        d="M 50 26 C 25 26, 12 37, 12 59 C 12 79, 26 89, 50 89 C 74 89, 88 79, 88 59 C 88 37, 75 26, 50 26 Z" 
        fill={kittyColor} 
        stroke={contourColor}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* 3. Extra Cheek Fluff Tufts filled white merged with cheek */}
      <path d="M 13 48 C 4 52, 5 62, 13 66 Z" fill="#ffffff" />
      <path d="M 13 48 C 4 52, 5 62, 13 66" stroke={contourColor} strokeWidth="2.2" strokeLinecap="round" />

      <path d="M 87 48 C 96 52, 95 62, 87 66 Z" fill="#ffffff" />
      <path d="M 87 48 C 96 52, 95 62, 87 66" stroke={contourColor} strokeWidth="2.2" strokeLinecap="round" />

      {/* 5. Glistening anime baby-doll eyes */}
      {/* Left Eye */}
      <circle cx="35" cy="52" r="7" fill={contourColor} />
      <circle cx="32.5" cy="49.5" r="2.4" fill="#ffffff" />
      <circle cx="37.2" cy="54.2" r="1.1" fill="#ffffff" />

      {/* Right Eye */}
      <circle cx="65" cy="52" r="7" fill={contourColor} />
      <circle cx="62.5" cy="49.5" r="2.4" fill="#ffffff" />
      <circle cx="67.2" cy="54.2" r="1.1" fill="#ffffff" />

      {/* 6. Soft Rosy Cheek Blush */}
      <circle cx="22" cy="62" r="5" fill={blushColor} opacity="0.95" />
      <circle cx="78" cy="62" r="5" fill={blushColor} opacity="0.95" />

      {/* 7. Cute Curved Soft Whiskers */}
      <path d="M 18 58 Q 8 57, 2 55" stroke={contourColor} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 19 63 Q 9 64, 3 65" stroke={contourColor} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      
      <path d="M 82 58 Q 92 57, 98 55" stroke={contourColor} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M 81 63 Q 91 64, 97 65" stroke={contourColor} strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* 8. Super Smiley "3" muzzle and pink dot nose */}
      <polygon points="48.5,56 51.5,56 50,57.5" fill="#f43f5e" />
      <path d="M 45 60 C 47.5 63, 50 62.5, 50 60 C 50 62.5, 52.5 63, 55 60" stroke={contourColor} strokeWidth="2.2" strokeLinecap="round" />

      {/* 9. Adorable paws with pink toe beans resting under chin */}
      {/* Left Paw */}
      <ellipse cx="36" cy="79" rx="7" ry="6" fill="#ffffff" stroke={contourColor} strokeWidth="2.2" />
      <ellipse cx="36" cy="80" rx="3.5" ry="2.5" fill="#fda4af" />
      <circle cx="31" cy="74" r="1.8" fill="#fda4af" />
      <circle cx="36" cy="72" r="1.8" fill="#fda4af" />
      <circle cx="41" cy="74" r="1.8" fill="#fda4af" />

      {/* Right Paw */}
      <ellipse cx="64" cy="79" rx="7" ry="6" fill="#ffffff" stroke={contourColor} strokeWidth="2.2" />
      <ellipse cx="64" cy="80" rx="3.5" ry="2.5" fill="#fda4af" />
      <circle cx="59" cy="74" r="1.8" fill="#fda4af" />
      <circle cx="64" cy="72" r="1.8" fill="#fda4af" />
      <circle cx="69" cy="74" r="1.8" fill="#fda4af" />
    </svg>
  );

  return (
    <div className="relative select-none flex items-center justify-center shrink-0 aspect-square" id="campus-hangouts-logo">
      <motion.div
        className={`relative ${dimensions.container} flex items-center justify-center shrink-0 aspect-square`}
        whileHover={{ scale: 1.15, rotate: [0, -4, 4, -2, 0] }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="w-full h-full shrink-0 aspect-square">
          {renderFluffyKittySVG()}
        </div>
      </motion.div>
    </div>
  );
};
