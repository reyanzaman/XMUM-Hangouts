/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../context/AppContext";
import { Heart } from "lucide-react";
import {
  companionAnimations,
  companionDialogue,
  companionEventDialogue,
  companionGrumpyActions,
  companionMilestoneCounts,
  companionRandomActions,
  companionRareActions,
  companionTabResponses,
  companionTravelAnimations,
  formatCompanionLine,
  getCompanionMilestone,
  pickCompanionLine,
  type CompanionAccessory,
  type CompanionMood,
  type CompanionPose,
  type CompanionReaction,
  type CompanionTravel
} from "../config/companionConfig";

interface CampusCompanionProps {
  activeTab: string;
}

export const CampusCompanion: React.FC<CampusCompanionProps> = ({ activeTab }) => {
  const { 
    currentUser, 
    toast,
    hangouts,
    messages,
    comments,
    applications,
    viewedProfile
  } = useApp();

  const [bubbleText, setBubbleTextInternal] = useState<string>(() => {
    try {
      const lastAngerTimeStr = localStorage.getItem("xmum_companion_anger_time");
      if (lastAngerTimeStr) {
        const diff = Date.now() - new Date(lastAngerTimeStr).getTime();
        if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
          return companionDialogue.angryWelcome;
        }
      }
    } catch (e) {
      console.error(e);
    }

    return pickCompanionLine(companionDialogue.welcome);
  });
  const queueRef = useRef<string[]>([]);
  const processingQueueRef = useRef<boolean>(false);
  const lastSpeechTimeRef = useRef<number>(0);
  const [showBubble, setShowBubble] = useState<boolean>(true);

  const processQueue = () => {
    if (processingQueueRef.current) return;
    if (queueRef.current.length === 0) return;

    const now = Date.now();
    const timeSinceLast = now - lastSpeechTimeRef.current;
    
    // Strict delay waiting time between consecutive speeches (9 seconds total cycle)
    const requiredWait = 9500;

    if (timeSinceLast < requiredWait) {
      const waitTime = requiredWait - timeSinceLast;
      processingQueueRef.current = true;
      setTimeout(() => {
        processingQueueRef.current = false;
        processQueue();
      }, waitTime);
      return;
    }

    const nextText = queueRef.current.shift();
    if (nextText) {
      setBubbleTextInternal(nextText);
      setShowBubble(true);
      lastSpeechTimeRef.current = Date.now();
      
      // Auto-hide speaking bubble after 5.5 seconds, leaving a clean 4-second rest gap before next message can show!
      setTimeout(() => {
        setShowBubble(false);
      }, 5500);
    }

    if (queueRef.current.length > 0) {
      processingQueueRef.current = true;
      setTimeout(() => {
        processingQueueRef.current = false;
        processQueue();
      }, requiredWait);
    }
  };

  const setBubbleText = (val: string | ((prev: string) => string)) => {
    const textStr = typeof val === "function" ? (val as any)(bubbleText) : val;
    
    if (textStr.includes("Zzz... Napping") && queueRef.current.some(t => t.includes("Zzz... Napping"))) {
      return; // prevent spamming idle napping text
    }

    queueRef.current.push(textStr);
    processQueue();
  };

  const [mood, setMood] = useState<CompanionMood>("happy");
  const [isReady, setIsReady] = useState<boolean>(false);
  const [companionPose, setCompanionPose] = useState<CompanionPose>("rest");
  const [accessory, setAccessory] = useState<CompanionAccessory>("none");
  const [travelMode, setTravelMode] = useState<CompanionTravel>("home");

  // Idle and sleeping state tracking
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const [zzzParticles, setZzzParticles] = useState<{ id: number; fontSize: number; x: number; y: number }[]>([]);

  const [isCompanionAngry, setIsCompanionAngry] = useState<boolean>(() => {
    try {
      const lastAngerTimeStr = localStorage.getItem("xmum_companion_anger_time");
      if (lastAngerTimeStr) {
        const diff = Date.now() - new Date(lastAngerTimeStr).getTime();
        return diff > 0 && diff < 24 * 60 * 60 * 1000;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  });

  const getUserFirstName = () => {
    if (!currentUser || !currentUser.name) return "friend";
    return currentUser.name.trim().split(/\s+/)[0];
  };
  const fName = getUserFirstName();

  // Track user active movements to sleep and wake the companion up dynamically
  useEffect(() => {
    let idleTimeout: any;

    const resetIdleTimer = () => {
      setIsIdle(prev => {
        if (prev) {
          setBubbleText(formatCompanionLine(pickCompanionLine(companionDialogue.wake), { name: fName }));
          setShowBubble(true);
          setMood("happy");
          setCompanionPose("rest");
        }
        return false;
      });

      clearTimeout(idleTimeout);
      // Wait for 30 seconds of absolute stillness before taking a deep cozy nap
      idleTimeout = setTimeout(() => {
        setIsIdle(true);
        setMood("sleepy");
        setCompanionPose("rest");
        setAccessory("none");
        setBubbleText(companionDialogue.nap);
        setShowBubble(true);
      }, 30000);
    };

    window.addEventListener("mousemove", resetIdleTimer);
    window.addEventListener("mousedown", resetIdleTimer);
    window.addEventListener("keydown", resetIdleTimer);
    window.addEventListener("scroll", resetIdleTimer);

    resetIdleTimer();

    return () => {
      clearTimeout(idleTimeout);
      window.removeEventListener("mousemove", resetIdleTimer);
      window.removeEventListener("mousedown", resetIdleTimer);
      window.removeEventListener("keydown", resetIdleTimer);
      window.removeEventListener("scroll", resetIdleTimer);
    };
  }, []);

  // Floating sleepy Zzz bubbles interval
  useEffect(() => {
    if (!isIdle) {
      setZzzParticles([]);
      return;
    }

    const interval = setInterval(() => {
      setZzzParticles(prev => [
        ...prev.slice(-4),
        {
          id: Date.now() + Math.random(),
          fontSize: Math.floor(Math.random() * 6) + 12, // 12px to 18px
          x: (Math.random() - 0.5) * 20 + 20, // offset slightly to the upper right side
          y: -15 + (Math.random() - 0.5) * 10
        }
      ]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isIdle]);

  // Periodic subtle cute random companion movement triggers and rare screen hops.
  useEffect(() => {
    if (isIdle) return;

    const triggerRandomMovement = () => {
      const rareAction = !isCompanionAngry && Math.random() < 0.12;
      const actionsToUse = isCompanionAngry
        ? companionGrumpyActions
        : rareAction
        ? companionRareActions
        : companionRandomActions;
      const action = actionsToUse[Math.floor(Math.random() * actionsToUse.length)];

      setCompanionPose(action.pose);
      setMood(action.mood);
      setAccessory(action.accessory);
      if (action.travel) setTravelMode(action.travel);

      const speechChance = action.speechChance ?? (rareAction ? 0.3 : 0.15);
      if (Math.random() < speechChance) {
        setBubbleText(formatCompanionLine(action.text, { name: fName }));
      }

      setTimeout(() => {
        setCompanionPose("rest");
        setMood(isCompanionAngry ? "sleepy" : "happy");
        setAccessory("none");
        setTravelMode("home");
      }, action.durationMs ?? 8000);
    };

    let timerId: any;

    const scheduleNext = () => {
      const delay = Math.floor(Math.random() * 22000) + 26000;
      timerId = setTimeout(() => {
        triggerRandomMovement();
        scheduleNext();
      }, delay);
    };

    timerId = setTimeout(() => {
      triggerRandomMovement();
      scheduleNext();
    }, 22000);

    return () => clearTimeout(timerId);
  }, [isIdle, isCompanionAngry, fName]);

  // Suppress transient hydration alarms during database loading on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);
  
  const [angryPetCount, setAngryPetCount] = useState<number>(0);

  // Initialize petCount from persistent localStorage with 1-day rotation expiry check
  const [petCount, setPetCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("xmum_companion_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        if (parsed.isPermanent) {
          return 1000;
        } else if (parsed.lastMilestoneReached > 0 && parsed.milestoneTimestamp && (now - parsed.milestoneTimestamp > oneDayMs)) {
          // One day passed: refresh state back to 0 baseline
          return 0;
        } else {
          return parsed.petCount || 0;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return 0;
  });

  const [particles, setParticles] = useState<{ id: number; x: number; y: number; rotate: number; size: number; color: string }[]>([]);
  
  
  // Triggers visual animation loops for click, scroll, and strategic events
  const [actionCount, setActionCount] = useState<number>(0);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [reactionType, setReactionType] = useState<CompanionReaction>("none");
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep track of reference lengths to accurately detect additions/changes
  const prevMessagesLen = useRef<number>(messages?.length || 0);
  const prevCommentsLen = useRef<number>(comments?.length || 0);
  const prevHangoutsLen = useRef<number>(hangouts?.length || 0);
  const prevApplicationsLen = useRef<number>(applications?.length || 0);
  const prevViewedProfileId = useRef<string | null>(viewedProfile?.id || null);


  // Auto-hide bubble after a period of inactivity
  useEffect(() => {
    if (showBubble) {
      const timer = setTimeout(() => {
        setShowBubble(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [bubbleText, showBubble]);

  // Hook into activeTab changes
  useEffect(() => {
    const response = companionTabResponses[activeTab];
    if (!response) return;

    setBubbleText(response.text);
    setMood(response.mood);
    setShowBubble(true);
    setActionCount((prev) => prev + 1);
  }, [activeTab]);

  // Connection events
  useEffect(() => {
    if (currentUser) {
      setBubbleText(formatCompanionLine(pickCompanionLine(companionDialogue.signedIn), { name: fName }));
      setMood("excited");
    } else {
      setBubbleText(pickCompanionLine(companionDialogue.guest));
      setMood("happy");
    }

    setShowBubble(true);
    setActionCount((prev) => prev + 1);
  }, [currentUser, fName]);

  // Handle global error/success messages
  useEffect(() => {
    if (toast) {
      if (toast.type === "error") {
        setBubbleText(formatCompanionLine(companionEventDialogue.toastError, { message: toast.message }));
        setMood("sleepy");
        setShowBubble(true);
        setActionCount((prev) => prev + 1);
      } else if (toast.type === "success") {
        setBubbleText(formatCompanionLine(companionEventDialogue.toastSuccess, { message: toast.message }));
        setMood("excited");
        setShowBubble(true);
        setActionCount((prev) => prev + 1);
      }
    }
  }, [toast]);

  // Handle new chat messages event
  useEffect(() => {
    const currentLen = messages?.length || 0;
    if (currentLen > prevMessagesLen.current) {
      prevMessagesLen.current = currentLen;
      if (isReady) {
        setBubbleText(formatCompanionLine(pickCompanionLine(companionEventDialogue.newMessage), { name: fName }));
        setReactionType("success");
        setMood("excited");
        setShowBubble(true);
        setActionCount((prev) => prev + 2);
        setTimeout(() => setReactionType("none"), 1200);
      }
    } else {
      prevMessagesLen.current = currentLen;
    }
  }, [messages, isReady]);

  // Handle new comment additions event
  useEffect(() => {
    const currentLen = comments?.length || 0;
    if (currentLen > prevCommentsLen.current) {
      prevCommentsLen.current = currentLen;
      if (isReady) {
        setBubbleText(companionEventDialogue.newComment);
        setReactionType("subtle");
        setMood("bouncy");
        setShowBubble(true);
        setActionCount((prev) => prev + 1);
        setTimeout(() => setReactionType("none"), 1200);
      }
    } else {
      prevCommentsLen.current = currentLen;
    }
  }, [comments, isReady]);

  // Handle new hangouts posted event
  useEffect(() => {
    const currentLen = hangouts?.length || 0;
    if (currentLen > prevHangoutsLen.current) {
      prevHangoutsLen.current = currentLen;
      if (isReady) {
        setBubbleText(companionEventDialogue.newHangout);
        setReactionType("success");
        setMood("excited");
        setShowBubble(true);
        setActionCount((prev) => prev + 2);
        setTimeout(() => setReactionType("none"), 1200);
      }
    } else {
      prevHangoutsLen.current = currentLen;
    }
  }, [hangouts, isReady]);

  // Handle applications changes
  useEffect(() => {
    const currentLen = applications?.length || 0;
    if (currentLen > prevApplicationsLen.current) {
      prevApplicationsLen.current = currentLen;
      if (isReady) {
        setBubbleText(companionEventDialogue.newApplication);
        setReactionType("success");
        setMood("excited");
        setShowBubble(true);
        setActionCount((prev) => prev + 2);
        setTimeout(() => setReactionType("none"), 1200);
      }
    } else {
      prevApplicationsLen.current = currentLen;
    }
  }, [applications, isReady]);

  // Handle viewedProfile changes
  useEffect(() => {
    if (viewedProfile && viewedProfile.id !== prevViewedProfileId.current) {
      prevViewedProfileId.current = viewedProfile.id;
      setBubbleText(formatCompanionLine(companionEventDialogue.viewedProfile, { profile: viewedProfile.name || "peer" }));
      setReactionType("subtle");
      setMood("happy");
      setShowBubble(true);
      setActionCount((prev) => prev + 1);
      setTimeout(() => setReactionType("none"), 1200);
    } else if (!viewedProfile) {
      prevViewedProfileId.current = null;
    }
  }, [viewedProfile]);

  // Natural blinking eye timer loop
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      const timer = setTimeout(() => {
        setIsBlinking(false);
      }, 160);
      return () => clearTimeout(timer);
    }, 4500);

    return () => clearInterval(blinkInterval);
  }, []);

  // Listen for simulated sign out attempt to play dramatic cute reaction
  useEffect(() => {
    const handleSignoutIntent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const userName = customEvent.detail?.name || "friend";
      setBubbleText(formatCompanionLine(companionEventDialogue.signout, { name: userName }));
      setMood("sleepy");
      setReactionType("error");
      setShowBubble(true);
      setActionCount(prev => prev + 1);
      setTimeout(() => setReactionType("none"), 2000);
    };

    window.addEventListener("xmum-signout-intent", handleSignoutIntent);
    return () => {
      window.removeEventListener("xmum-signout-intent", handleSignoutIntent);
    };
  }, []);

  useEffect(() => {
    const handleHangoutEdited = (e: Event) => {
      const customEvent = e as CustomEvent;
      const intention = customEvent.detail?.intention || "your hangout";
      setBubbleText(formatCompanionLine(companionEventDialogue.hangoutEdited, { intention }));
      setMood("happy");
      setReactionType("success");
      setShowBubble(true);
      setTimeout(() => setReactionType("none"), 1800);
    };

    const handleHangoutCancelled = (e: Event) => {
      const customEvent = e as CustomEvent;
      const intention = customEvent.detail?.intention || "that hangout";
      setBubbleText(formatCompanionLine(companionEventDialogue.hangoutCancelled, { intention }));
      setMood("sleepy");
      setReactionType("error");
      setShowBubble(true);
      setTimeout(() => setReactionType("none"), 1800);
    };

    const handleAccountDeleted = () => {
      setBubbleText(companionEventDialogue.accountDeleted);
      setMood("sleepy");
      setReactionType("success");
      setShowBubble(true);
      setTimeout(() => setReactionType("none"), 1800);
    };

    window.addEventListener("xmum-hangout-edited", handleHangoutEdited);
    window.addEventListener("xmum-hangout-cancelled", handleHangoutCancelled);
    window.addEventListener("xmum-account-deleted", handleAccountDeleted);

    return () => {
      window.removeEventListener("xmum-hangout-edited", handleHangoutEdited);
      window.removeEventListener("xmum-hangout-cancelled", handleHangoutCancelled);
      window.removeEventListener("xmum-account-deleted", handleAccountDeleted);
    };
  }, []);

  // Listen for profanity warning events and monitor anger status
  useEffect(() => {
    const checkAnger = () => {
      try {
        const lastAngerTimeStr = localStorage.getItem("xmum_companion_anger_time");
        if (lastAngerTimeStr) {
          const diff = Date.now() - new Date(lastAngerTimeStr).getTime();
          setIsCompanionAngry(diff > 0 && diff < 24 * 60 * 60 * 1000);
        } else {
          setIsCompanionAngry(false);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const handleProfanityWarned = () => {
      setIsCompanionAngry(true);
      setAngryPetCount(0);
      setBubbleText(companionDialogue.profanity);
      setShowBubble(true);
      setMood("sleepy");
      setReactionType("error");
      setTimeout(() => setReactionType("none"), 2500);
    };

    window.addEventListener("xmum-profanity-warned", handleProfanityWarned);
    const intv = setInterval(checkAnger, 20000);

    return () => {
      window.removeEventListener("xmum-profanity-warned", handleProfanityWarned);
      clearInterval(intv);
    };
  }, []);

  // Synchronise system toasts to play animated error and success reactions
  useEffect(() => {
    if (toast) {
      if (toast.type === "success") {
        setReactionType("success");
        setBubbleText(formatCompanionLine(companionEventDialogue.toastSuccessShort, { message: toast.message }));
        setShowBubble(true);
        setActionCount((prev) => prev + 1);
        const timer = setTimeout(() => setReactionType("none"), 1500);
        return () => clearTimeout(timer);
      } else if (toast.type === "error") {
        setReactionType("error");
        setBubbleText(formatCompanionLine(companionEventDialogue.toastErrorShort, { message: toast.message }));
        setShowBubble(true);
        setActionCount((prev) => prev + 1);
        const timer = setTimeout(() => setReactionType("none"), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [toast]);

  // Global click outside to dismiss the bubble, and gentle scroll listener
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const clickedTarget = event.target as HTMLElement;
      
      // If clicked anywhere else, hide bubble text immediately!
      if (containerRef.current && !containerRef.current.contains(clickedTarget)) {
        setShowBubble(false);
        
        // Trigger subtle responsive animation on ANY click anywhere!
        setActionCount((prev) => prev + 1);
        setReactionType("subtle");
        setTimeout(() => setReactionType("none"), 250);

        // Very tiny chance to wake up with guidance
        const luckyChance = Math.random() < 0.08;
        if (luckyChance) {
          const mix = [...companionDialogue.click, ...companionDialogue.safety, ...companionDialogue.petHint];
          const choice = mix[Math.floor(Math.random() * mix.length)];
          setBubbleText(choice);
          setMood("bouncy");
          setShowBubble(true);
        }
      }
    };

    let lastScrollTime = 0;
    const handleGlobalScroll = () => {
      const now = Date.now();
      if (now - lastScrollTime > 300) {
        lastScrollTime = now;
        
        // Trigger responsive tail wag and subtle body twitch on scroll!
        setActionCount((prev) => prev + 1);
        setReactionType("subtle");
        setTimeout(() => setReactionType("none"), 250);

        if (Math.random() < 0.04 && !showBubble) {
          setBubbleText(pickCompanionLine(companionDialogue.scroll));
          setMood("happy");
          setShowBubble(true);
        }
      }
    };

    document.addEventListener("click", handleGlobalClick, { capture: true });
    window.addEventListener("scroll", handleGlobalScroll, { passive: true });

    return () => {
      document.removeEventListener("click", handleGlobalClick, { capture: true });
      window.removeEventListener("scroll", handleGlobalScroll);
    };
  }, [showBubble]);

  const handlePetKitty = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompanionAngry) {
      const nextAngryPets = angryPetCount + 1;
      const remainingPets = Math.max(5 - nextAngryPets, 0);
      setAngryPetCount(nextAngryPets);
      if (nextAngryPets >= 5) {
        localStorage.removeItem("xmum_companion_anger_time");
        setIsCompanionAngry(false);
        setAngryPetCount(0);
        setMood("excited");
        setBubbleText(companionDialogue.forgiveness);
        setReactionType("milestone-rainbow");
        setShowBubble(true);
        setTimeout(() => {
          setReactionType("none");
        }, 2200);

        const colors = ["#fb7185", "#f43f5e", "#ec4899", "#fda4af"];
        const newP = Array.from({ length: 25 }).map((_, idx) => ({
          id: Date.now() + idx,
          x: Math.random() * 120 - 60,
          y: Math.random() * 120 - 70,
          rotate: Math.random() * 360,
          size: Math.random() * 16 + 10,
          color: colors[Math.floor(Math.random() * colors.length)]
        }));
        setParticles(newP);
        setTimeout(() => setParticles([]), 2500);
        return;
      }

      const grumpyQuote = companionDialogue.grumpyPet[nextAngryPets - 1] || companionDialogue.grumpyPet[0];
      setBubbleText(formatCompanionLine(grumpyQuote, { remaining: remainingPets }));
      setReactionType("error");
      setShowBubble(true);
      setTimeout(() => {
        setReactionType("none");
      }, 1500);
      return;
    }

    if (petCount >= 1000) {
      setBubbleText(companionDialogue.maxed);
      setReactionType("milestone-ultimate");
      setAccessory("nova");
      return;
    }

    const nextCount = petCount + 1;
    setPetCount(nextCount);
    setMood("excited");
    setShowBubble(true);
    setActionCount((prev) => prev + 1);

    const milestone = getCompanionMilestone(nextCount);
    const isExtendedMilestone = nextCount > 500 && nextCount < 1000 && nextCount % 50 === 0;
    const isTenStep = nextCount % 10 === 0;
    const shouldHint = !milestone && !isTenStep && Math.random() < 0.12;

    let milestoneMessage = "";
    let particlesToSpawn = 4;
    let isVerySpecial = false;
    let rType: CompanionReaction = "success";

    if (milestone) {
      milestoneMessage = formatCompanionLine(milestone.message, { name: fName, count: nextCount });
      particlesToSpawn = milestone.particles;
      isVerySpecial = Boolean(milestone.special);
      rType = milestone.reaction;
      if (milestone.accessory) {
        setAccessory(milestone.accessory);
        setTimeout(() => setAccessory("none"), rType === "milestone-ultimate" ? 4200 : 2600);
      }
    } else if (isExtendedMilestone) {
      milestoneMessage = formatCompanionLine(companionDialogue.extendedMilestone, { name: fName, count: nextCount });
      particlesToSpawn = 30;
      rType = "milestone-medium";
      isVerySpecial = true;
    } else if (isTenStep) {
      milestoneMessage = formatCompanionLine(companionDialogue.genericMilestone, { name: fName, count: nextCount });
      particlesToSpawn = 8;
    } else if (shouldHint) {
      milestoneMessage = pickCompanionLine(companionDialogue.petHint);
      particlesToSpawn = 5;
    } else {
      milestoneMessage = formatCompanionLine(pickCompanionLine(companionDialogue.pet), { name: fName });
      particlesToSpawn = 4;
    }

    setReactionType(rType);
    setBubbleText(milestoneMessage);

    try {
      const isMilestone = companionMilestoneCounts.includes(nextCount) || isExtendedMilestone;
      const existingState = JSON.parse(localStorage.getItem("xmum_companion_state") || "{}");
      const savedStateObj = {
        petCount: nextCount,
        lastMilestoneReached: isMilestone ? nextCount : (existingState.lastMilestoneReached || 0),
        milestoneTimestamp: isMilestone ? Date.now() : (existingState.milestoneTimestamp || Date.now()),
        isPermanent: nextCount >= 1000
      };
      localStorage.setItem("xmum_companion_state", JSON.stringify(savedStateObj));
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      setReactionType("none");
    }, rType === "milestone-ultimate" ? 3000 : rType === "milestone-rainbow" ? 1900 : 1200);

    const colors = isVerySpecial
      ? ["#fbbf24", "#fb7185", "#f43f5e", "#ec4899", "#fda4af", "#ffedd5", "#a78bfa", "#22d3ee"]
      : ["#f43f5e", "#ec4899", "#fda4af", "#f472b6", "#f43f5e"];

    const newParticles = Array.from({ length: particlesToSpawn }).map((_, i) => ({
      id: Date.now() + Math.random() + i,
      x: (Math.random() - 0.5) * 85,
      y: (Math.random() - 0.5) * 20 - 15,
      rotate: (Math.random() - 0.5) * 90,
      size: isVerySpecial ? Math.random() * 18 + 12 : Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));

    setParticles(prev => [...prev.slice(-80), ...newParticles]);
  };
  let activeAnimation: any = isIdle ? companionAnimations.napping : companionAnimations.resting;
  if (reactionType === "success") {
    activeAnimation = companionAnimations.success;
  } else if (reactionType === "error") {
    activeAnimation = companionAnimations.error;
  } else if (reactionType === "subtle") {
    activeAnimation = companionAnimations.subtle;
  } else if (reactionType === "milestone-small") {
    activeAnimation = companionAnimations.milestoneSmall;
  } else if (reactionType === "milestone-medium") {
    activeAnimation = companionAnimations.milestoneMedium;
  } else if (reactionType === "milestone-gold") {
    activeAnimation = companionAnimations.milestoneGold;
  } else if (reactionType === "milestone-rainbow") {
    activeAnimation = companionAnimations.milestoneRainbow;
  } else if (reactionType === "milestone-ultimate") {
    activeAnimation = companionAnimations.milestoneUltimate;
  } else if (companionPose === "bounce") {
    activeAnimation = companionAnimations.bounce;
  } else if (companionPose === "fly") {
    activeAnimation = companionAnimations.fly;
  } else if (companionPose === "wiggle") {
    activeAnimation = companionAnimations.wiggle;
  } else if (companionPose === "spin") {
    activeAnimation = companionAnimations.spin;
  } else if (companionPose === "stretch") {
    activeAnimation = companionAnimations.stretch;
  } else if (companionPose === "peek") {
    activeAnimation = companionAnimations.peek;
  } else if (companionPose === "dash") {
    activeAnimation = companionAnimations.dash;
  } else if (companionPose === "orbit") {
    activeAnimation = companionAnimations.orbit;
  } else if (companionPose === "curtsy") {
    activeAnimation = companionAnimations.curtsy;
  };

  // Eyes rendering based on states
  const renderEyes = () => {
    if (reactionType === "error") {
      // Dizzy crossed/spiral eyes on error
      return (
        <g>
          {/* Left Cross */}
          <line x1="30" y1="42" x2="38" y2="50" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="38" y1="42" x2="30" y2="50" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
          
          {/* Right Cross */}
          <line x1="62" y1="42" x2="70" y2="50" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="70" y1="42" x2="62" y2="50" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    }

    if (isCompanionAngry) {
      // Angry slanted eyes with downward tears for sadness
      return (
        <g>
          {/* Left Glistening Eye */}
          <circle cx="34" cy="48" r="6" fill="#1e293b" />
          <circle cx="32" cy="46" r="2.5" fill="#ffffff" />
          
          {/* Right Glistening Eye */}
          <circle cx="66" cy="48" r="6" fill="#1e293b" />
          <circle cx="64" cy="46" r="2.5" fill="#ffffff" />
          
          {/* Angry Eyebrows tilted inward/downward */}
          <path d="M 26 38 L 40 43" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          <path d="M 74 38 L 60 43" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />

          {/* Saddy little tear dots */}
          <circle cx="28" cy="56" r="1.6" fill="#60a5fa" />
          <circle cx="72" cy="56" r="1.6" fill="#60a5fa" />
        </g>
      );
    }

    if (isIdle) {
      // Real proper closed sleeping eyes that gently breathe with motion!
      return (
        <g>
          {/* Left Sleeping eye line curves downwards */}
          <motion.g
            animate={{ y: [0, 1, 0], scaleY: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ originX: 0.34, originY: 0.46 }}
          >
            <path
              d="M 28 45 Q 34 51, 40 45"
              stroke="#1e293b"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          </motion.g>
          {/* Right Sleeping eye line curves downwards */}
          <motion.g
            animate={{ y: [0, 1, 0], scaleY: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ originX: 0.66, originY: 0.46 }}
          >
            <path
              d="M 60 45 Q 66 51, 72 45"
              stroke="#1e293b"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          </motion.g>
        </g>
      );
    }

    if (isBlinking || mood === "sleepy") {
      // Cute happy curved sleepy eyes (for blink or transient sleepy poses)
      return (
        <g>
          <path d="M 29 46 Q 34 50, 39 46" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M 61 46 Q 66 50, 71 46" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    }

    // Love heart eyes for Milestone 500+ (Extremely polished, bouncy micro-scale heartbeat on heart shape)
    if (petCount >= 500) {
      return (
        <g>
          {/* Left Heart Eye */}
          <motion.path 
            d="M 34 49 C 31 45, 26 47, 30 52 Q 34 56, 34 56 Q 34 56, 38 52 C 42 47, 37 45, 34 49 Z" 
            fill="#ff1493" 
            stroke="#1e293b" 
            strokeWidth="1.6"
            animate={{ scale: [1, 1.18, 0.94, 1.12, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ originX: 0.34, originY: 0.49 }}
          />
          {/* Right Heart Eye */}
          <motion.path 
            d="M 66 49 C 63 45, 58 47, 62 52 Q 66 56, 66 56 Q 66 56, 70 52 C 74 47, 69 45, 66 49 Z" 
            fill="#ff1493" 
            stroke="#1e293b" 
            strokeWidth="1.6"
            animate={{ scale: [1, 1.18, 0.94, 1.12, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
            style={{ originX: 0.66, originY: 0.49 }}
          />
        </g>
      );
    }

    // Glistening anime eyes
    return (
      <g>
        {/* Left Eye */}
        <circle cx="34" cy="46" r="6.5" fill="#1e293b" />
        <circle cx="31.8" cy="43.5" r="2.2" fill="#ffffff" />
        <circle cx="35.8" cy="48" r="1.0" fill="#ffffff" />

        {/* Right Eye */}
        <circle cx="66" cy="46" r="6.5" fill="#1e293b" />
        <circle cx="63.8" cy="43.5" r="2.2" fill="#ffffff" />
        <circle cx="67.8" cy="48" r="1.0" fill="#ffffff" />
      </g>
    );
  };

  return (
    <motion.div 
      ref={containerRef}
      initial={{ scale: 0, opacity: 0, y: 150, rotate: -25 }}
      animate={
        travelMode === "home"
          ? { scale: 1, opacity: 1, y: 0, rotate: 0 }
          : { scale: 1, opacity: 1, ...companionTravelAnimations[travelMode] }
      }
      transition={{ 
        type: "spring", 
        stiffness: 280, 
        damping: 18, 
        delay: 0.8
      }}
      className={`fixed ${currentUser ? "bottom-21 right-2 md:bottom-4 md:right-4" : "bottom-4 right-2 md:bottom-4 md:right-4"} z-40 flex flex-col items-end pointer-events-none font-sans select-none`}
    >
      {/* Dynamic Bubble text */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="mb-1.5 bg-white text-slate-800 text-[10px] md:text-[11px] font-bold p-2.5 md:p-3 rounded-2xl border border-slate-100 shadow-xl max-w-[140px] md:max-w-[190px] text-right pointer-events-auto leading-relaxed relative flex flex-col items-end gap-1 border-rose-50"
            id="companion-speech-bubble"
          >
            {/* Tiny bubble point arrow */}
            <div className="absolute bottom-[-5px] right-4 md:right-6 w-2.5 h-2.5 bg-white border-r border-b border-rose-50/50 rotate-45" />
            <p className="whitespace-pre-line text-slate-755 leading-normal">{bubbleText}</p>
            {petCount > 0 && (
              <span className="text-[9px] text-rose-500 font-extrabold flex items-center gap-0.5 mt-0.5">
                <Heart className="w-2.5 h-2.5 fill-rose-500 animate-pulse" /> pet x{petCount}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Animated Ultra Cute Round Fluffy Kitty Mascot */}
      <motion.div
        className={`pointer-events-auto cursor-pointer relative group flex items-center justify-center p-1 rounded-full transition-all duration-350 ${
          petCount >= 500
            ? "ring-4 ring-pink-500 ring-offset-2 scale-110"
          : petCount >= 300
            ? "ring-2 ring-purple-500 ring-offset-1 scale-105"
          : petCount >= 100
            ? "ring-2 ring-amber-400 ring-offset-1"
          : petCount >= 50
            ? "ring-2 ring-rose-300 ring-offset-1"
          : petCount >= 30
            ? "ring-1 ring-teal-300 ring-offset-1"
          : ""
        }`}
        onClick={handlePetKitty}
        initial={{ scale: 1 }}
        animate={activeAnimation}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        id="campus-companion-widget"
      >
        {/* Floating Heart Particles */}
        <AnimatePresence>
          {particles.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, y: p.y, x: p.x, scale: 0.2, rotate: p.rotate }}
              animate={{ 
                opacity: 0, 
                y: p.y - 120 - Math.random() * 60, 
                x: p.x + (Math.random() - 0.5) * 40,
                scale: [0.5, 1.4, 0.3],
                rotate: p.rotate + (Math.random() - 0.5) * 90
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute pointer-events-none z-50 origin-center"
              style={{ left: "50%", top: "45%", transform: "translate(-50%, -50%)" }}
            >
              <Heart 
                style={{ width: p.size, height: p.size, fill: p.color }} 
                className="text-transparent drop-shadow-[0_1px_1.5px_rgba(244,63,94,0.4)]" 
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Floating Sleeping Zzz Particles */}
        <AnimatePresence>
          {isIdle && zzzParticles.map(z => (
            <motion.div
              key={z.id}
              initial={{ opacity: 0, y: z.y, x: z.x, scale: 0.5 }}
              animate={{ 
                opacity: [0, 1, 1, 0], 
                y: z.y - 75, 
                x: z.x + 25,
                scale: [0.7, 1.25, 0.9]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3.2, ease: "easeOut" }}
              className="absolute pointer-events-none z-50 font-black text-rose-500/80 font-mono"
              style={{ left: "55%", top: "30%", fontSize: z.fontSize }}
            >
              Zzz
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Sparkly dynamic orbit ring when excited or clicked */}
        {(mood === "excited" || reactionType === "success") && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-dashed border-rose-300/40 opacity-30 scale-105"
          />
        )}

        {/* Outer ambient glow */}
        <div className={`absolute rounded-full blur-md transition-all duration-300 ${
          isCompanionAngry
            ? "inset-[-6px] bg-gradient-to-r from-red-600 via-orange-500 to-amber-600 scale-108 opacity-95 animate-pulse"
            : petCount >= 500
            ? "inset-[-8px] bg-gradient-to-r from-pink-500 via-purple-500 via-teal-400 via-yellow-400 to-pink-500 scale-120 opacity-95 animate-pulse"
            : petCount >= 300
            ? "inset-[-5px] bg-gradient-to-r from-purple-500 via-rose-400 to-blue-500 scale-115 opacity-90 animate-pulse"
            : petCount >= 100
            ? "inset-[-3px] bg-gradient-to-r from-amber-400 via-rose-400 to-yellow-500 scale-110 opacity-90 animate-pulse"
            : petCount >= 50
            ? "inset-[-1px] bg-gradient-to-r from-rose-300 via-sky-200 to-amber-200 scale-105 opacity-80"
            : petCount >= 40
            ? "inset-0 bg-gradient-to-r from-teal-200 via-rose-200 to-amber-200 scale-[1.04] opacity-75"
            : petCount >= 30
            ? "inset-0 bg-teal-200/60 scale-[1.03] opacity-70"
            : petCount >= 20
            ? "inset-0 bg-amber-200/60 scale-[1.02] opacity-70"
            : petCount >= 10
            ? "inset-0 bg-rose-200/70 scale-[1.01] opacity-70"
            : "inset-1 bg-rose-200/40 group-hover:bg-rose-300/45"
        }`} />

        <div className="relative w-14 h-14 md:w-17 md:h-17 flex items-center justify-center">
          {/* Extremely Fluffy, Chubby Marshmallow Cat SVG */}
          <svg
            viewBox="0 0 100 100"
            fill="none"
            className="w-full h-full drop-shadow-[0_2.5px_4.5px_rgba(244,63,94,0.3)] select-none"
          >
            {/* Super Saiyan Golden aura and hair backplate */}
            {accessory === "saiyan" && (
              <g id="saiyan-aura">
                {/* Blazing animated pulse fire aura */}
                <motion.path
                  d="M 50 2 Q 12 22, 5 55 T 50 98 T 95 55 T 50 2 Z"
                  fill="rgba(251, 191, 36, 0.55)"
                  filter="drop-shadow(0 0 12px rgba(245, 158, 11, 0.85))"
                  animate={{ scale: [1, 1.15, 0.96, 1.12], opacity: [0.75, 0.98, 0.82, 0.75] }}
                  transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Golden spiky hair protruding behind head */}
                <path
                  d="M 18 28 L 6 10 L 26 21 L 30 2 L 44 18 L 50 -2 L 56 18 L 70 2 L 74 21 L 94 10 L 82 28 Z"
                  fill="#fbbf24"
                  stroke="#d97706"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                {/* Sparking bio-electricity lightning */}
                <motion.path
                  d="M 10 40 L 15 35 L 20 45 M 90 45 L 85 38 L 78 42 M 35 92 L 40 82 L 45 87"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  strokeLinecap="round"
                  animate={{ opacity: [0, 1, 0, 1, 0] }}
                  transition={{ duration: 0.35, repeat: Infinity }}
                />
              </g>
            )}

            {(petCount >= 500 || accessory === "nova") && (
              <g id="nova-aura">
                <motion.circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="1.4"
                  strokeDasharray="6 8"
                  animate={{ rotate: 360, opacity: [0.35, 0.9, 0.35], scale: [0.94, 1.08, 0.94] }}
                  transition={{ rotate: { repeat: Infinity, duration: 5.5, ease: "linear" }, opacity: { repeat: Infinity, duration: 2.2 }, scale: { repeat: Infinity, duration: 2.2 } }}
                  style={{ originX: 0.5, originY: 0.5 }}
                />
                <motion.path
                  d="M 50 0 L 54 11 L 66 7 L 61 19 L 74 23 L 61 29 L 68 40 L 55 37 L 50 50 L 45 37 L 32 40 L 39 29 L 26 23 L 39 19 L 34 7 L 46 11 Z"
                  fill="rgba(255,255,255,0.55)"
                  stroke="#f9a8d4"
                  strokeWidth="1.2"
                  animate={{ rotate: [0, 18, -18, 0], opacity: [0.2, 0.55, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  style={{ originX: 0.5, originY: 0.5 }}
                />
              </g>
            )}

            {accessory === "moon" && (
              <motion.path
                id="moon-charm"
                d="M 70 12 C 61 16, 62 29, 72 32 C 65 35, 55 30, 54 21 C 53 12, 61 7, 70 12 Z"
                fill="#fde68a"
                stroke="#1e293b"
                strokeWidth="1.6"
                animate={{ y: [0, -2, 0], rotate: [-8, 8, -8] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            {/* 0. Fluffy Tail (Wags behind the body) */}
            <motion.path
              d="M 80 80 Q 94 82, 95 68 C 96 60, 90 58, 86 64 C 83 68, 80 72, 78 76"
              fill="#ffffff"
              stroke="#1e293b"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ originX: 0.8, originY: 0.8 }}
              animate={{
                rotate: reactionType === "success" ? [0, 20, -20, 15, -15, 0] : [0, 8, -8, 8, -4, 0],
              }}
              transition={{
                duration: reactionType === "success" ? 0.7 : 2.5,
                repeat: reactionType === "none" ? Infinity : 0,
              }}
            />

            {/* 0.5 Flapping Angel Wings (sit behind the main body for 200+ pets) */}
            {petCount >= 200 && (
              <g id="kitty-wings">
                {/* Left Wing */}
                <motion.path
                  d="M 16 55 C -6 45, -2 25, 10 37 C 2 30, 4 15, 12 27"
                  stroke="#1e293b"
                  strokeWidth="2.2"
                  fill="#ffffff"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ originX: 0.16, originY: 0.55 }}
                  animate={{
                    rotate: [0, -11, 8, -4, 0],
                    scale: [1, 1.05, 0.95, 1]
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                {/* Right Wing */}
                <motion.path
                  d="M 84 55 C 106 45, 102 25, 90 37 C 98 30, 96 15, 88 27"
                  stroke="#1e293b"
                  strokeWidth="2.2"
                  fill="#ffffff"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ originX: 0.84, originY: 0.55 }}
                  animate={{
                    rotate: [0, 11, -8, 4, 0],
                    scale: [1, 1.05, 0.95, 1]
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </g>
            )}

            {/* 1. Kitty Ears protruding with subtle interactive twitching */}
            {/* Left Ear */}
            <motion.path 
              d="M 22 36 C 18 22, 33 19, 37 30 Z" 
              fill="#ffffff" 
              stroke="#1e293b" 
              strokeWidth="2.2" 
              strokeLinejoin="round" 
              style={{ originX: 0.3, originY: 0.32 }}
              animate={{
                rotate: reactionType === "none" ? [0, -2, 2, 0] : [0, -12, 8, -4, 0]
              }}
              transition={{
                duration: reactionType === "none" ? 4 : 0.35,
                repeat: reactionType === "none" ? Infinity : 0,
                repeatDelay: 2,
                ease: "easeInOut"
              }}
            />
            <path d="M 25 34 C 22 25, 31 24, 33 30 Z" fill="#fda4af" />
            
            {/* Right Ear */}
            <motion.path 
              d="M 78 36 C 82 22, 67 19, 63 30 Z" 
              fill="#ffffff" 
              stroke="#1e293b" 
              strokeWidth="2.2" 
              strokeLinejoin="round" 
              style={{ originX: 0.7, originY: 0.32 }}
              animate={{
                rotate: reactionType === "none" ? [0, 2, -2, 0] : [0, 12, -8, 4, 0]
              }}
              transition={{
                duration: reactionType === "none" ? 4 : 0.35,
                repeat: reactionType === "none" ? Infinity : 0,
                repeatDelay: 2.2,
                ease: "easeInOut"
              }}
            />
            <path d="M 75 34 C 72 25, 69 24, 67 30 Z" fill="#fda4af" />

            {/* 2. Round Fluffy Body (extremely plump marshmallow ball cat) */}
            <path 
              d="M 50 26 C 25 26, 12 37, 12 59 C 12 79, 26 89, 50 89 C 74 89, 88 79, 88 59 C 88 37, 75 26, 50 26 Z" 
              fill="#ffffff" 
              stroke="#1e293b" 
              strokeWidth="2.2" 
              strokeLinejoin="round" 
            />

            {/* 3. Extra Cheek Fluff Tufts filled and integrated on sides */}
            <path d="M 13 48 C 4 52, 5 62, 13 66 Z" fill="#ffffff" />
            <path d="M 13 48 C 4 52, 5 62, 13 66" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />

            <path d="M 87 48 C 96 52, 95 62, 87 66 Z" fill="#ffffff" />
            <path d="M 87 48 C 96 52, 95 62, 87 66" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />

            {/* 4. Cute sprout resting cozy on top of kitty's head */}
            <g id="kitty-sprout">
              <path d="M 50 26 Q 48 18, 43 16" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M 50 26 Q 52 18, 57 16" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" fill="none" />
              {/* Left leaf */}
              <path d="M 43 16 Q 37 13, 40 19 Q 43 19, 43 16 Z" fill="#22c55e" stroke="#1e293b" strokeWidth="1" />
              {/* Right leaf */}
              <path d="M 57 16 Q 63 13, 60 19 Q 57 19, 57 16 Z" fill="#22c55e" stroke="#1e293b" strokeWidth="1" />
            </g>

            {/* Level 10 ribbon state */}
            {(petCount >= 10 || accessory === "ribbon") && (
              <motion.g
                id="ribbon-state"
                animate={{ rotate: [-3, 3, -3], y: [0, -0.8, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: 0.5, originY: 0.27 }}
              >
                <path d="M 43 27 C 35 22, 33 31, 42 33 Z" fill="#fb7185" stroke="#1e293b" strokeWidth="1.5" />
                <path d="M 57 27 C 65 22, 67 31, 58 33 Z" fill="#fb7185" stroke="#1e293b" strokeWidth="1.5" />
                <circle cx="50" cy="30" r="4" fill="#fda4af" stroke="#1e293b" strokeWidth="1.4" />
              </motion.g>
            )}

            {/* 5. Draw Dynamic Responsive Eyes */}
            {renderEyes()}

            {/* 6. Soft Rosy Cheek Blush */}
            <circle cx="22" cy="62" r="5" fill="#fda4af" opacity="0.95" />
            <circle cx="78" cy="62" r="5" fill="#fda4af" opacity="0.95" />

            {/* 7. Cute Curved Soft Whiskers with subtle bounce */}
            <motion.g
              animate={{
                y: [0, -0.3, 0.3, 0],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {/* Left whiskers */}
              <path d="M 18 58 Q 8 57, 2 55" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M 19 63 Q 9 64, 3 65" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              {/* Right whiskers */}
              <path d="M 82 58 Q 92 57, 98 55" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M 81 63 Q 91 64, 97 65" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            </motion.g>

            {/* 8. Super Smiley "3" muzzle or grumpy frown for anger */}
            <polygon points="48.5,56 51.5,56 50,57.5" fill="#f43f5e" />
            {isCompanionAngry ? (
              // Grumpy upside-down frown mouth
              <path d="M 44 65 Q 50 59, 56 65" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            ) : (
              // Smiley "3" muzzle
              <path d="M 45 60 C 47.5 63, 50 62.5, 50 60 C 50 62.5, 52.5 63, 55 60" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
            )}

            {/* 9. Adorable paws resting cute at the bottom under chin */}
            {/* Left Paw */}
            <ellipse cx="36" cy="79" rx="7" ry="6" fill="#ffffff" stroke="#1e293b" strokeWidth="2.2" />
            <ellipse cx="36" cy="80" rx="3.5" ry="2.5" fill="#fda4af" />
            <circle cx="31" cy="74" r="1.8" fill="#fda4af" />
            <circle cx="36" cy="72" r="1.8" fill="#fda4af" />
            <circle cx="41" cy="74" r="1.8" fill="#fda4af" />

            {/* Right Paw */}
            <ellipse cx="64" cy="79" rx="7" ry="6" fill="#ffffff" stroke="#1e293b" strokeWidth="2.2" />
            <ellipse cx="64" cy="80" rx="3.5" ry="2.5" fill="#fda4af" />
            <circle cx="59" cy="74" r="1.8" fill="#fda4af" />
            <circle cx="64" cy="72" r="1.8" fill="#fda4af" />
            <circle cx="69" cy="74" r="1.8" fill="#fda4af" />

            {/* Level 20 bell state */}
            {(petCount >= 20 || accessory === "bell") && (
              <motion.g
                id="bell-state"
                animate={{ rotate: [-4, 4, -2, 2, 0] }}
                transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: 0.5, originY: 0.75 }}
              >
                <path d="M 39 72 Q 50 77, 61 72" stroke="#fb7185" strokeWidth="2.3" strokeLinecap="round" fill="none" />
                <path d="M 45 75 C 45 69, 55 69, 55 75 L 57 82 L 43 82 Z" fill="#fbbf24" stroke="#1e293b" strokeWidth="1.7" strokeLinejoin="round" />
                <circle cx="50" cy="82" r="2" fill="#d97706" />
              </motion.g>
            )}

            {/* Level 30 study book charm */}
            {petCount >= 30 && accessory !== "book" && (
              <motion.g
                id="study-book-charm"
                animate={{ y: [0, -1.5, 0], rotate: [-2, 2, -2] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              >
                <path d="M 14 78 Q 22 75, 30 80 L 30 88 Q 22 84, 14 87 Z" fill="#fef3c7" stroke="#1e293b" strokeWidth="1.5" />
                <path d="M 30 80 Q 38 75, 46 78 L 46 87 Q 38 84, 30 88 Z" fill="#fff7ed" stroke="#1e293b" strokeWidth="1.5" />
                <line x1="18" y1="81" x2="27" y2="82" stroke="#78716c" strokeWidth="0.8" strokeLinecap="round" />
                <line x1="34" y1="81" x2="42" y2="80" stroke="#78716c" strokeWidth="0.8" strokeLinecap="round" />
              </motion.g>
            )}

            {/* Level 40 bubble tea charm */}
            {(petCount >= 40 || accessory === "tea") && (
              <motion.g
                id="tea-charm"
                animate={{ y: [0, -2, 0], rotate: [2, -2, 2] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <path d="M 70 75 L 86 75 L 83 92 L 73 92 Z" fill="#fed7aa" stroke="#1e293b" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M 72 79 L 84 79" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" />
                <path d="M 76 74 L 73 64" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="76" cy="88" r="1.4" fill="#78350f" />
                <circle cx="81" cy="87" r="1.4" fill="#78350f" />
              </motion.g>
            )}

            {/* Sparkle stars side additions for 50+ */}
            {petCount >= 50 && (
              <g id="sparkle-stars">
                <motion.path 
                  d="M 12,20 L 14,23 L 17,23 L 15,25 L 16,28 L 12,26 L 8,28 L 9,25 L 7,23 L 10,23 Z" 
                  fill="#fbbf24" 
                  animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  style={{ originX: 0.12, originY: 0.20 }}
                />
                <motion.path 
                  d="M 88,20 L 90,23 L 93,23 L 91,25 L 92,28 L 88,26 L 84,28 L 85,25 L 83,23 L 86,23 Z" 
                  fill="#fbbf24" 
                  animate={{ scale: [1.2, 0.8, 1.2], opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                  style={{ originX: 0.88, originY: 0.20 }}
                />
              </g>
            )}

            {/* 11. Celestial Rainbow Halo above crown for 300+ */}
            {petCount >= 300 && (
              <motion.ellipse
                cx="50"
                cy="6"
                rx="14"
                ry="4"
                stroke="#ec4899"
                strokeWidth="2.2"
                fill="none"
                animate={{
                  y: [0, -3, 0],
                  opacity: [0.7, 1, 0.7],
                  stroke: ["#ec4899", "#3b82f6", "#f59e0b", "#ec4899"]
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}

            {/* 10. Golden Crown badge (unlocked at 100 pets) */}
            {petCount >= 100 && (
              <g id="crown-badge">
                <path 
                  d="M 38 24 L 34 14 L 42 18 L 50 10 L 58 18 L 66 14 L 62 24 Z" 
                  fill="#fbbf24" 
                  stroke="#1e293b" 
                  strokeWidth="2.2" 
                  strokeLinejoin="round" 
                />
                {/* Shiny crown jewels */}
                <circle cx="34" cy="14" r="2.2" fill="#ef4444" />
                <circle cx="50" cy="10" r="2.2" fill="#3b82f6" />
                <circle cx="66" cy="14" r="2.2" fill="#ef4444" />
                <circle cx="50" cy="20" r="1.5" fill="#ffffff" />

                {/* Extra sparkling jewel items for 150+ */}
                {petCount >= 150 && (
                  <g>
                    <motion.circle cx="28" cy="18" r="1.8" fill="#a78bfa" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
                    <motion.circle cx="72" cy="18" r="1.8" fill="#22d3ee" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.5 }} />
                  </g>
                )}

                {/* Supreme Unicorn Horn / Tiara additions for 500+ */}
                {petCount >= 500 && (
                  <g id="unicorn-horn">
                    <motion.polygon 
                      points="50,4 45,14 55,14" 
                      fill="#ffd700" 
                      stroke="#1e293b" 
                      strokeWidth="1.8" 
                      strokeLinejoin="round"
                      animate={{
                        fill: ["#ffd700", "#ff69b4", "#00ffff", "#ffd700"]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    <motion.circle 
                      cx="50" 
                      cy="2" 
                      r="2.5" 
                      fill="#ffffff"
                      animate={{ scale: [1, 1.8, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    />
                  </g>
                )}
              </g>
            )}

            {/* 12. Wizard Hat accessory (render on top of head) */}
            {accessory === "wizard" && (
              <g id="wizard-hat">
                <motion.path
                  d="M 15 32 C 15 32, 50 28, 85 32 C 78 28, 68 8, 50 2 L 48 2 C 30 8, 20 28, 15 32 Z"
                  fill="#5b21b6"
                  stroke="#1e293b"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                  animate={{ rotate: [-2, 3, -2], y: [0, -1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Wizard hat golden buckle band */}
                <path d="M 23 29 Q 50 25, 77 29 L 75 32 Q 50 28, 25 32 Z" fill="#fbbf24" />
                {/* Shiny star decorations */}
                <polygon points="48,15 50,17 52,15 50,13" fill="#fbbf24" />
                <polygon points="35,22 36.5,23 38,22 36.5,21" fill="#fbbf24" />
                <polygon points="63,20 64.5,21 66,20 64.5,19" fill="#fbbf24" />
              </g>
            )}

            {/* 13. Open Book accessory (render in front at the bottom) */}
            {accessory === "book" && (
              <g id="reading-book" className="pointer-events-none">
                <motion.g
                  animate={{ y: [0, 1.2, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {/* Book cover backplate */}
                  <path d="M 20 84 L 20 90 C 20 92, 50 94, 50 88 C 50 94, 80 92, 80 90 L 80 84 Z" fill="#b91c1c" stroke="#1e293b" strokeWidth="2.2" />
                  {/* Left Book Page */}
                  <path d="M 22 82 Q 36 80, 50 86 L 50 91 Q 36 85, 22 87 Z" fill="#fafaf9" stroke="#1e293b" strokeWidth="1.8" />
                  {/* Right Book Page */}
                  <path d="M 78 82 Q 64 80, 50 86 L 50 91 Q 64 85, 78 87 Z" fill="#fafaf9" stroke="#1e293b" strokeWidth="1.8" />
                  {/* Tiny lines to simulate text */}
                  <line x1="26" y1="84" x2="44" y2="84" stroke="#78716c" strokeWidth="1" strokeLinecap="round" />
                  <line x1="26" y1="86.5" x2="40" y2="86.5" stroke="#78716c" strokeWidth="1" strokeLinecap="round" />
                  <line x1="26" y1="89" x2="42" y2="89" stroke="#78716c" strokeWidth="1" strokeLinecap="round" />
                  <line x1="56" y1="84" x2="74" y2="84" stroke="#78716c" strokeWidth="1" strokeLinecap="round" />
                  <line x1="60" y1="86.5" x2="74" y2="86.5" stroke="#78716c" strokeWidth="1" strokeLinecap="round" />
                  <line x1="56" y1="89" x2="70" y2="89" stroke="#78716c" strokeWidth="1" strokeLinecap="round" />
                </motion.g>
              </g>
            )}
          </svg>
        </div>
      </motion.div>
    </motion.div>
  );
};
