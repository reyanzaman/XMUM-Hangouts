/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ShieldCheck, X, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";

export const SafetyBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(() => {
    try {
      const dismissed = localStorage.getItem("xmum_safety_banner_dismissed");
      return dismissed !== "true";
    } catch {
      return true;
    }
  });

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem("xmum_safety_banner_dismissed", "true");
    } catch (e) {
      // ignore
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      id="safety-guideline-banner"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-4 relative shadow-sm flex gap-3.5 items-start text-xs sm:text-sm text-amber-900 font-sans"
    >
      <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
        <ShieldCheck className="w-5 h-5" />
      </div>
      <div className="flex-1 space-y-1 pr-6">
        <h4 id="safety-banner-title" className="font-bold text-amber-950 flex items-center gap-1.5">
          XMUM Student Safety First! 🛡️
        </h4>
        <p id="safety-banner-desc" className="text-amber-800 leading-relaxed text-xs">
          Always arrange meetups in <strong>public, on-campus locations</strong> (like the Courtyard, Block B Hall, or Library). Under no circumstances agree to meet alone in private locations off-campus. Host or travel together, trust your instincts, and file safety reports right away if anyone acts suspiciously.
        </p>
      </div>
      <button
        id="dismiss-safety-banner-btn"
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-amber-500 hover:text-amber-800 hover:bg-amber-100 p-1 rounded-lg transition-colors cursor-pointer"
        title="Dismiss guidance"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};
