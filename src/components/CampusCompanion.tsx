/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../context/AppContext";
import { Heart } from "lucide-react";
import { resolveStoredCompanionState, writeStoredCompanionState, type StoredCompanionState } from "../lib/companionState";
import {
  companionAnimations,
  companionAngryTabResponses,
  companionBaseStateOption,
  companionDialogue,
  companionEventDialogue,
  companionGrumpyActions,
  companionMilestoneCounts,
  companionRandomActions,
  companionRareActions,
  companionRedHotTabResponses,
  companionTabResponses,
  companionTierStates,
  companionTravelAnimations,
  formatCompanionLine,
  getCompanionStateById,
  getCompanionMilestone,
  getUnlockedCompanionState,
  pickCompanionLine,
  type CompanionAccessory,
  type CompanionAction,
  type CompanionMood,
  type CompanionPose,
  type CompanionReaction,
  type CompanionTrait,
  type CompanionTravel
} from "../config/companionConfig";

interface CampusCompanionProps {
  activeTab: string;
}

const companionStateUpdateEvent = "xmum-companion-state-updated";
const companionAngerSourceStorageKey = "xmum_companion_anger_source";
const normalAngerPetsRequired = 5;
const redHotAngerPetsRequired = 9;

type CompanionAngerSource = "none" | "profanity" | "drag";
type DragReturnStyle =
  | "steady-bounce"
  | "orbit-swoop"
  | "feather-float"
  | "grumpy-wobble"
  | "grumpy-stomp"
  | "hot-streak";
type DragReturnMotion = {
  x: number | number[];
  y: number | number[];
  rotate?: number | number[];
  scale?: number | number[];
  scaleX?: number | number[];
  scaleY?: number | number[];
  transition?: Record<string, unknown>;
};

const getCompanionAngerSource = (): CompanionAngerSource => {
  try {
    const raw = localStorage.getItem(companionAngerSourceStorageKey);
    return raw === "drag" || raw === "profanity" ? raw : "none";
  } catch {
    return "none";
  }
};

const getCompanionAngerUntil = () => {
  try {
    const raw = localStorage.getItem("xmum_companion_anger_until");
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
};

const clearCompanionAngerState = () => {
  try {
    localStorage.removeItem("xmum_companion_anger_time");
    localStorage.removeItem("xmum_companion_anger_until");
    localStorage.removeItem(companionAngerSourceStorageKey);
  } catch (error) {
    console.error(error);
  }
};

export const CampusCompanion: React.FC<CampusCompanionProps> = ({ activeTab }) => {
  const { 
    currentUser, 
    toast,
    hangouts,
    messages,
    comments,
    applications,
    viewedProfile,
    syncCompanionProgress
  } = useApp();

  const [bubbleText, setBubbleTextInternal] = useState<string>(() => {
    try {
      const angerSource = getCompanionAngerSource();
      const lastAngerTimeStr = localStorage.getItem("xmum_companion_anger_time");
      if (lastAngerTimeStr) {
        const diff = Date.now() - new Date(lastAngerTimeStr).getTime();
        if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
          return angerSource === "drag"
            ? pickCompanionLine(companionDialogue.dragAngryWelcome)
            : companionDialogue.angryWelcome;
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
  const draggedRef = useRef<boolean>(false);
  const dragHistoryRef = useRef<number[]>([]);
  const [showBubble, setShowBubble] = useState<boolean>(true);

  const processQueue = () => {
    if (processingQueueRef.current) return;
    if (queueRef.current.length === 0) return;

    const now = Date.now();
    const timeSinceLast = now - lastSpeechTimeRef.current;
    
    const requiredWait = 26000;

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
      
      setTimeout(() => {
        setShowBubble(false);
      }, 7200);
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
  const [dragReturnStyle, setDragReturnStyle] = useState<DragReturnStyle>("steady-bounce");
  const [isDragReturning, setIsDragReturning] = useState<boolean>(false);
  const [dragReturnMotion, setDragReturnMotion] = useState<DragReturnMotion>({
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    transition: { duration: 0.01 }
  });
  const [selectedStateId, setSelectedStateId] = useState<string | null>(() => {
    const stored = resolveStoredCompanionState(currentUser?.email, currentUser || undefined);
    return typeof stored.selectedStateId === "string" ? stored.selectedStateId : null;
  });

  // Idle and sleeping state tracking
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const [zzzParticles, setZzzParticles] = useState<{ id: number; fontSize: number; x: number; y: number }[]>([]);

  const [isCompanionAngry, setIsCompanionAngry] = useState<boolean>(() => {
    try {
      const angerUntil = getCompanionAngerUntil();
      if (angerUntil) {
        return angerUntil > Date.now();
      }

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
  const [angerSource, setAngerSource] = useState<CompanionAngerSource>(() => {
    try {
      const angerUntil = getCompanionAngerUntil();
      const storedSource = getCompanionAngerSource();
      if (angerUntil && angerUntil > Date.now()) {
        return storedSource === "drag" ? "drag" : "profanity";
      }

      const lastAngerTimeStr = localStorage.getItem("xmum_companion_anger_time");
      if (lastAngerTimeStr) {
        const diff = Date.now() - new Date(lastAngerTimeStr).getTime();
        if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
          return storedSource === "drag" ? "drag" : "profanity";
        }
      }
    } catch (e) {
      console.error(e);
    }
    return "none";
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

  // Suppress transient hydration alarms during database loading on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);
  
  const [angryPetCount, setAngryPetCount] = useState<number>(0);

  // Initialize petCount from user-specific persistent storage and profile backup
  const [petCount, setPetCount] = useState<number>(() => {
    try {
      const parsed = resolveStoredCompanionState(currentUser?.email, currentUser || undefined);
      if (Object.keys(parsed).length > 0) {
        return Math.max(0, Number(parsed.petCount || 0));
      }
    } catch (e) {
      console.error(e);
    }
    return 0;
  });

  const unlockedTierState = getUnlockedCompanionState(petCount);
  const isOriginalStateSelected = petCount >= 1000 && selectedStateId === companionBaseStateOption.id;
  const activeTierState =
    isOriginalStateSelected
      ? undefined
      : petCount >= 1000
      ? getCompanionStateById(selectedStateId) || unlockedTierState
      : unlockedTierState;
  const activeTraits = new Set<CompanionTrait>(activeTierState?.traits || []);

  if (accessory !== "none") {
    activeTraits.add(accessory);
  }

  const hasTrait = (trait: CompanionTrait) => activeTraits.has(trait);
  const activeRingClass = activeTierState?.ringClass || "";
  const activeGlowClass = activeTierState?.glowClass || "";
  const isRedHotAngry = isCompanionAngry && angerSource === "drag";

  // Periodic subtle cute random companion movement triggers and rare screen hops.
  useEffect(() => {
    if (isIdle) return;

    const triggerRandomMovement = () => {
      const stateAmbientAction: CompanionAction | null =
        activeTierState && activeTierState.ambientLines.length > 0
          ? {
              text: pickCompanionLine(activeTierState.ambientLines),
              pose: activeTierState.pose,
              mood: activeTierState.mood,
              accessory: activeTierState.accessory,
              speechChance: 0.08,
              durationMs: 4600,
              minPetCount: activeTierState.count
            }
          : null;
      const petHintAction: CompanionAction | null =
        !isCompanionAngry && petCount < 1000 && Math.random() < 0.08
          ? {
              text: pickCompanionLine(companionDialogue.petHint),
              pose: petCount >= 20 ? "wiggle" : "rest",
              mood: "happy",
              accessory: activeTierState?.accessory || "none",
              speechChance: 0.18,
              durationMs: 4200,
              maxPetCount: 999
            }
          : null;
      const rareAction = !isCompanionAngry && Math.random() < (petCount >= 50 ? 0.14 : 0.08);
      const baseActions = isCompanionAngry
        ? companionGrumpyActions
        : rareAction
        ? [...companionRandomActions, ...(stateAmbientAction ? [stateAmbientAction] : []), ...(petHintAction ? [petHintAction] : []), ...companionRareActions]
        : [...companionRandomActions, ...(stateAmbientAction ? [stateAmbientAction] : []), ...(petHintAction ? [petHintAction] : [])];
      const eligibleActions = baseActions.filter(action => {
        const reachedMin = action.minPetCount === undefined || petCount >= action.minPetCount;
        const underMax = action.maxPetCount === undefined || petCount <= action.maxPetCount;
        const tabMatch = !action.preferredTabs || action.preferredTabs.includes(activeTab);
        return reachedMin && underMax && tabMatch;
      });
      const actionsToUse = eligibleActions.length > 0 ? eligibleActions : baseActions;
      const action = actionsToUse[Math.floor(Math.random() * actionsToUse.length)];

      setCompanionPose(action.pose);
      setMood(action.mood);
      setAccessory(action.accessory);
      if (action.travel) setTravelMode(action.travel);

      const speechChance = action.speechChance ?? (rareAction ? 0.08 : 0.04);
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
      const delay = Math.floor(Math.random() * 38000) + 58000;
      timerId = setTimeout(() => {
        triggerRandomMovement();
        scheduleNext();
      }, delay);
    };

    timerId = setTimeout(() => {
      triggerRandomMovement();
      scheduleNext();
    }, 38000);

    return () => clearTimeout(timerId);
  }, [isIdle, isCompanionAngry, fName, petCount, activeTab, activeTierState]);

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
      }, 7800);
      return () => clearTimeout(timer);
    }
  }, [bubbleText, showBubble]);

  // Hook into activeTab changes
  useEffect(() => {
    const angryResponses = isRedHotAngry ? companionRedHotTabResponses : companionAngryTabResponses;
    const response = isCompanionAngry
      ? angryResponses[activeTab] || companionTabResponses[activeTab]
      : companionTabResponses[activeTab];
    if (!response) return;
    const recentSpeech = Date.now() - lastSpeechTimeRef.current < 22000;
    if (recentSpeech && Math.random() < 0.82) {
      return;
    }

    setBubbleText(response.text);
    setMood(response.mood);
    setShowBubble(true);
    setActionCount((prev) => prev + 1);
  }, [activeTab, isCompanionAngry]);

  // Connection events
  useEffect(() => {
    if (currentUser) {
      const signedInLine =
        angerSource === "drag" && isCompanionAngry
          ? pickCompanionLine(companionDialogue.dragAngrySignedIn)
          : angerSource === "profanity" && isCompanionAngry
          ? formatCompanionLine(pickCompanionLine(companionDialogue.angrySignedIn), { name: fName })
          : pickCompanionLine(companionDialogue.signedIn);
      setBubbleText(
        angerSource === "profanity" && isCompanionAngry
          ? signedInLine
          : formatCompanionLine(signedInLine, { name: fName })
      );
      setMood(
        angerSource === "drag" && isCompanionAngry
          ? "excited"
          : angerSource === "profanity" && isCompanionAngry
          ? "sleepy"
          : "excited"
      );
    } else {
      setBubbleText(pickCompanionLine(companionDialogue.guest));
      setMood("happy");
    }

    setShowBubble(true);
    setActionCount((prev) => prev + 1);
  }, [currentUser, fName, angerSource, isCompanionAngry]);

  useEffect(() => {
    const handleCompanionStateUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<StoredCompanionState>;
      const detail = customEvent.detail || {};
      if (typeof detail.petCount === "number") {
        setPetCount(Math.max(0, detail.petCount));
      }
      if (detail.selectedStateId !== undefined) {
        setSelectedStateId(detail.selectedStateId || null);
      }
    };

    window.addEventListener(companionStateUpdateEvent, handleCompanionStateUpdated);
    return () => window.removeEventListener(companionStateUpdateEvent, handleCompanionStateUpdated);
  }, []);

  useEffect(() => {
    const resolvedState = resolveStoredCompanionState(currentUser?.email, currentUser || undefined);
    const nextPetCount = Math.max(0, Number(resolvedState.petCount || 0));
    const nextSelectedStateId =
      typeof resolvedState.selectedStateId === "string" ? resolvedState.selectedStateId : null;

    setPetCount(nextPetCount);
    setSelectedStateId(nextSelectedStateId);

    if (
      currentUser &&
      (
        nextPetCount !== Math.max(0, Number(currentUser.companion_pet_count || 0)) ||
        nextSelectedStateId !== (currentUser.companion_selected_state_id ?? null)
      )
    ) {
      syncCompanionProgress({
        petCount: nextPetCount,
        selectedStateId: nextSelectedStateId,
        isPermanent: nextPetCount >= 1000
      });
    }
  }, [currentUser?.email]);

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
        const angerUntil = getCompanionAngerUntil();
        if (angerUntil) {
          if (angerUntil > Date.now()) {
            setIsCompanionAngry(true);
            setAngerSource(getCompanionAngerSource() === "drag" ? "drag" : "profanity");
            return;
          }
          clearCompanionAngerState();
          setIsCompanionAngry(false);
          setAngerSource("none");
          return;
        }

        const lastAngerTimeStr = localStorage.getItem("xmum_companion_anger_time");
        if (lastAngerTimeStr) {
          const diff = Date.now() - new Date(lastAngerTimeStr).getTime();
          const isStillAngry = diff > 0 && diff < 24 * 60 * 60 * 1000;
          setIsCompanionAngry(isStillAngry);
          setAngerSource(isStillAngry ? (getCompanionAngerSource() === "drag" ? "drag" : "profanity") : "none");
        } else {
          setIsCompanionAngry(false);
          setAngerSource("none");
        }
      } catch (e) {
        console.error(e);
      }
    };

    const handleProfanityWarned = () => {
      clearCompanionAngerState();
      localStorage.setItem("xmum_companion_anger_time", new Date().toISOString());
      localStorage.setItem(companionAngerSourceStorageKey, "profanity");
      setIsCompanionAngry(true);
      setAngerSource("profanity");
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
        const luckyChance = Math.random() < 0.02;
        if (luckyChance) {
          const mix = isCompanionAngry
            ? isRedHotAngry
              ? companionDialogue.dragAngryClick
              : companionDialogue.angryClick
            : [...companionDialogue.click, ...companionDialogue.safety, ...companionDialogue.petHint];
          const choice = mix[Math.floor(Math.random() * mix.length)];
          setBubbleText(choice);
          setMood(isCompanionAngry ? (isRedHotAngry ? "excited" : "sleepy") : "bouncy");
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

        if (Math.random() < 0.012 && !showBubble) {
          setBubbleText(
            pickCompanionLine(
              isCompanionAngry
                ? isRedHotAngry
                  ? companionDialogue.dragAngryScroll
                  : companionDialogue.angryScroll
                : companionDialogue.scroll
            )
          );
          setMood(isCompanionAngry ? (isRedHotAngry ? "excited" : "sleepy") : "happy");
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
  }, [isCompanionAngry, showBubble]);

  const emitCompanionStateUpdate = (detail: StoredCompanionState) => {
    window.dispatchEvent(new CustomEvent(companionStateUpdateEvent, { detail }));
  };

  const saveCompanionState = (detail: StoredCompanionState) => {
    try {
      const existingState = resolveStoredCompanionState(currentUser?.email, currentUser || undefined);
      const savedStateObj: StoredCompanionState = {
        ...existingState,
        ...detail
      };
      const persistedState = writeStoredCompanionState(currentUser?.email, savedStateObj);
      emitCompanionStateUpdate(persistedState);
      syncCompanionProgress(persistedState);
    } catch (error) {
      console.error(error);
    }
  };

  const buildDragReturnMotion = (style: DragReturnStyle, offsetX: number, offsetY: number): DragReturnMotion => {
    const safeX = Number.isFinite(offsetX) ? offsetX : 0;
    const safeY = Number.isFinite(offsetY) ? offsetY : 0;

    const motions: Record<DragReturnStyle, DragReturnMotion> = {
      "steady-bounce": {
        x: 0,
        y: 0,
        rotate: [-4, 3, 0],
        scale: [1, 0.985, 1.01, 1],
        transition: {
          x: { type: "spring", stiffness: 240, damping: 24, mass: 0.7 },
          y: { type: "spring", stiffness: 240, damping: 24, mass: 0.7 },
          rotate: { duration: 0.8, ease: "easeOut" },
          scale: { duration: 0.8, ease: "easeOut" }
        }
      },
      "orbit-swoop": {
        x: 0,
        y: 0,
        rotate: [8, -6, 2, 0],
        scale: [1, 1.02, 0.995, 1.01, 1],
        transition: {
          x: { type: "spring", stiffness: 185, damping: 22, mass: 0.9 },
          y: { type: "spring", stiffness: 185, damping: 22, mass: 0.9 },
          rotate: { duration: 1.02, ease: "easeInOut" },
          scale: { duration: 1.02, ease: "easeInOut" }
        }
      },
      "feather-float": {
        x: 0,
        y: 0,
        rotate: [-7, 4, 0],
        scaleY: [1, 0.98, 1.015, 1],
        scaleX: [1, 1.02, 0.995, 1],
        transition: {
          x: { type: "spring", stiffness: 150, damping: 20, mass: 1 },
          y: { type: "spring", stiffness: 150, damping: 20, mass: 1 },
          rotate: { duration: 1.08, ease: "easeInOut" },
          scaleY: { duration: 1.08, ease: "easeInOut" },
          scaleX: { duration: 1.08, ease: "easeInOut" }
        }
      },
      "grumpy-wobble": {
        x: 0,
        y: 0,
        rotate: [-10, 7, -3, 0],
        scale: [1, 0.985, 1.01, 0.995, 1],
        transition: {
          x: { type: "spring", stiffness: 205, damping: 19, mass: 0.82 },
          y: { type: "spring", stiffness: 205, damping: 19, mass: 0.82 },
          rotate: { duration: 0.92, ease: "easeOut" },
          scale: { duration: 0.92, ease: "easeOut" }
        }
      },
      "grumpy-stomp": {
        x: 0,
        y: 0,
        rotate: [-6, 4, 0],
        scaleY: [1, 0.92, 1.06, 0.99, 1],
        scaleX: [1, 1.04, 0.97, 1.01, 1],
        transition: {
          x: { type: "spring", stiffness: 260, damping: 21, mass: 0.78 },
          y: { type: "spring", stiffness: 260, damping: 21, mass: 0.78 },
          rotate: { duration: 0.82, ease: "easeOut" },
          scaleY: { duration: 0.82, ease: "easeOut" },
          scaleX: { duration: 0.82, ease: "easeOut" }
        }
      },
      "hot-streak": {
        x: 0,
        y: 0,
        rotate: [12, -8, 2, 0],
        scaleY: [1, 0.9, 1.08, 0.98, 1],
        scaleX: [1, 1.08, 0.95, 1.02, 1],
        transition: {
          x: { type: "spring", stiffness: 310, damping: 20, mass: 0.72 },
          y: { type: "spring", stiffness: 310, damping: 20, mass: 0.72 },
          rotate: { duration: 0.78, ease: "easeOut" },
          scaleY: { duration: 0.78, ease: "easeOut" },
          scaleX: { duration: 0.78, ease: "easeOut" }
        }
      }
    };

    return motions[style];
  };

  const triggerDragAnger = () => {
    const angerTimestamp = new Date().toISOString();
    const dragAngerDurationMs = (Math.floor(Math.random() * 5) + 1) * 60 * 1000;
    try {
      localStorage.setItem("xmum_companion_anger_time", angerTimestamp);
      localStorage.setItem("xmum_companion_anger_until", String(Date.now() + dragAngerDurationMs));
      localStorage.setItem(companionAngerSourceStorageKey, "drag");
    } catch (error) {
      console.error(error);
    }
    setIsCompanionAngry(true);
    setAngerSource("drag");
    setAngryPetCount(0);
    setMood("sleepy");
    setReactionType("error");
    setBubbleText(pickCompanionLine(companionDialogue.dragTooMuch));
    setShowBubble(true);
    setTimeout(() => setReactionType("none"), 2400);
  };

  const handlePetKitty = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }

    if (isCompanionAngry) {
      const requiredPets = angerSource === "drag" ? redHotAngerPetsRequired : normalAngerPetsRequired;
      const nextAngryPets = angryPetCount + 1;
      const remainingPets = Math.max(requiredPets - nextAngryPets, 0);
      setAngryPetCount(nextAngryPets);
      if (nextAngryPets >= requiredPets) {
        clearCompanionAngerState();
        setIsCompanionAngry(false);
        setAngerSource("none");
        setAngryPetCount(0);
        setMood("excited");
        setBubbleText(
          angerSource === "drag"
            ? pickCompanionLine(companionDialogue.dragForgiveness)
            : companionDialogue.forgiveness
        );
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

      const grumpyPool = angerSource === "drag" ? companionDialogue.dragGrumpyPet : companionDialogue.grumpyPet;
      const grumpyQuote = grumpyPool[nextAngryPets - 1] || grumpyPool[0];
      setBubbleText(formatCompanionLine(grumpyQuote, { remaining: remainingPets }));
      setReactionType("error");
      setShowBubble(true);
      setTimeout(() => {
        setReactionType("none");
      }, 1500);
      return;
    }

    const nextCount = petCount + 1;
    setPetCount(nextCount);
    setMood("excited");
    setShowBubble(true);
    setActionCount((prev) => prev + 1);

    const milestone = getCompanionMilestone(nextCount);
    const isExtendedMilestone = nextCount > 500 && nextCount !== 1000 && nextCount % 50 === 0;
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
    } else if (isExtendedMilestone) {
      milestoneMessage = formatCompanionLine(companionDialogue.genericMilestone, { name: fName, count: nextCount });
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
      const existingState = resolveStoredCompanionState(currentUser?.email, currentUser || undefined);
      const newSelectedStateId =
        nextCount >= 1000
          ? existingState.selectedStateId || companionTierStates[companionTierStates.length - 1]?.id || null
          : existingState.selectedStateId || null;
      saveCompanionState({
        petCount: nextCount,
        lastMilestoneReached: isMilestone ? nextCount : (existingState.lastMilestoneReached || 0),
        milestoneTimestamp: isMilestone ? Date.now() : (existingState.milestoneTimestamp || Date.now()),
        isPermanent: nextCount >= 1000,
        selectedStateId: newSelectedStateId
      });
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
  let activeAnimation: any = isIdle
    ? companionAnimations.napping
    : activeTierState
    ? companionAnimations[activeTierState.pose]
    : companionAnimations.resting;
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
  } else if (isRedHotAngry) {
    activeAnimation = companionAnimations.redHotFume;
  } else if (isCompanionAngry) {
    activeAnimation = companionAnimations.angrySulk;
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
  } else if (companionPose === "walk") {
    activeAnimation = companionAnimations.walk;
  } else if (companionPose === "study") {
    activeAnimation = companionAnimations.study;
  } else if (companionPose === "cook") {
    activeAnimation = companionAnimations.cook;
  } else if (companionPose === "exercise") {
    activeAnimation = companionAnimations.exercise;
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
      if (isRedHotAngry) {
        return (
          <g>
            <ellipse cx="34" cy="48" rx="6.6" ry="5.8" fill="#7f1d1d" />
            <ellipse cx="66" cy="48" rx="6.6" ry="5.8" fill="#7f1d1d" />
            <circle cx="33" cy="47" r="1.5" fill="#ffffff" />
            <circle cx="65" cy="47" r="1.5" fill="#ffffff" />
            <path d="M 24 36 L 40 41" stroke="#991b1b" strokeWidth="3.8" strokeLinecap="round" />
            <path d="M 76 36 L 60 41" stroke="#991b1b" strokeWidth="3.8" strokeLinecap="round" />
            <path d="M 27 41 L 40 44" stroke="#1e293b" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M 73 41 L 60 44" stroke="#1e293b" strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="28" cy="56" r="1.8" fill="#fca5a5" />
            <circle cx="72" cy="56" r="1.8" fill="#fca5a5" />
          </g>
        );
      }

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
    if (activeTierState?.count === 1000) {
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
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.82, filter: "blur(1px)" }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="mb-2 bg-white/98 text-slate-800 text-[10px] md:text-[11px] font-bold p-2.5 md:p-3 rounded-2xl border border-slate-100 shadow-xl max-w-[150px] md:max-w-[205px] text-right pointer-events-auto leading-relaxed relative flex flex-col items-end gap-1 border-rose-50 z-[80]"
            id="companion-speech-bubble"
          >
            {/* Tiny bubble point arrow */}
            <div className="absolute bottom-[-5px] right-4 md:right-6 w-2.5 h-2.5 bg-white border-r border-b border-rose-50/50 rotate-45" />
            <p className="whitespace-pre-line text-slate-755 leading-normal">{bubbleText}</p>
            {petCount > 0 && (
              <span className="text-[9px] text-rose-500 font-extrabold flex items-center gap-1 mt-0.5">
                <Heart className="w-2.5 h-2.5 fill-rose-500 animate-pulse" /> pet x{petCount}
                {activeTierState && <span className="text-slate-500 font-bold">• {activeTierState.name}</span>}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Animated Ultra Cute Round Fluffy Kitty Mascot */}
      <motion.div
        className="pointer-events-auto relative"
        drag
        dragSnapToOrigin
        dragElastic={0.08}
        dragMomentum={false}
        dragTransition={{ bounceStiffness: 560, bounceDamping: 28, power: 0.08, timeConstant: 120 }}
        animate={dragReturnMotion}
        whileDrag={{ scale: 1.02 }}
        onPointerDown={() => {
          draggedRef.current = false;
        }}
        onDragStart={() => {
          draggedRef.current = true;
          setIsDragReturning(false);
          setDragReturnMotion({
            x: 0,
            y: 0,
            rotate: 0,
            scale: 1,
            scaleX: 1,
            scaleY: 1,
            transition: { duration: 0.01 }
          });
          setReactionType("subtle");
          setMood("excited");
        }}
        onDragEnd={(_, info) => {
          draggedRef.current = true;
          const movedFarEnough = Math.abs(info.offset.x) > 12 || Math.abs(info.offset.y) > 12;
          const now = Date.now();
          const recentDrags = [...dragHistoryRef.current.filter(timestamp => now - timestamp < 22000)];
          if (movedFarEnough) {
            recentDrags.push(now);
          }
          dragHistoryRef.current = recentDrags;

          const triggeredDragAnger = movedFarEnough && recentDrags.length >= 5;
          const selectedReturnStyle = triggeredDragAnger || isCompanionAngry
            ? (["grumpy-wobble", "grumpy-stomp", "hot-streak"] as DragReturnStyle[])[
                Math.floor(Math.random() * 3)
              ]
            : (["steady-bounce", "orbit-swoop", "feather-float"] as DragReturnStyle[])[
                Math.floor(Math.random() * 3)
              ];

          setDragReturnStyle(selectedReturnStyle);
          setIsDragReturning(true);
          setDragReturnMotion(buildDragReturnMotion(selectedReturnStyle, info.offset.x, info.offset.y));
          setReactionType(triggeredDragAnger || isCompanionAngry ? "error" : "subtle");
          setMood(triggeredDragAnger || isCompanionAngry ? "sleepy" : (activeTierState?.mood || "happy"));

          if (movedFarEnough && triggeredDragAnger) {
            triggerDragAnger();
          } else if (movedFarEnough) {
            setBubbleText(
              pickCompanionLine(
                isCompanionAngry ? companionDialogue.dragReturnAngry : companionDialogue.dragReturn
              )
            );
            setShowBubble(true);
          }
          window.setTimeout(() => {
            draggedRef.current = false;
            setIsDragReturning(false);
            setDragReturnMotion({
              x: 0,
              y: 0,
              rotate: 0,
              scale: 1,
              scaleX: 1,
              scaleY: 1,
              transition: { duration: 0.01 }
            });
            setReactionType("none");
          }, 1100);
        }}
      >
        <motion.div
          className={`cursor-pointer relative group flex items-center justify-center p-1 rounded-full transition-all duration-350 ${
            isRedHotAngry
              ? "ring-4 ring-red-500/80 ring-offset-2 ring-offset-orange-100 shadow-[0_0_26px_rgba(239,68,68,0.45)]"
              : isCompanionAngry
              ? "ring-4 ring-rose-300/75 ring-offset-2 ring-offset-slate-50 shadow-[0_0_18px_rgba(251,113,133,0.24)]"
              : activeRingClass
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
        {(isRedHotAngry || isCompanionAngry || activeGlowClass) && (
          <div className={`absolute rounded-full blur-md transition-all duration-300 ${
            isRedHotAngry
              ? "inset-[-8px] bg-gradient-to-r from-red-700 via-orange-500 to-yellow-400 scale-110 opacity-95 animate-pulse"
              : isCompanionAngry
              ? "inset-[-5px] bg-gradient-to-r from-slate-300 via-rose-200 to-pink-200 scale-105 opacity-85"
              : activeGlowClass
          }`} />
        )}

        <div className="relative w-14 h-14 md:w-17 md:h-17 flex items-center justify-center">
          {/* Extremely Fluffy, Chubby Marshmallow Cat SVG */}
          <svg
            viewBox="0 0 100 100"
            fill="none"
            className="w-full h-full drop-shadow-[0_2.5px_4.5px_rgba(244,63,94,0.3)] select-none"
          >
            {isCompanionAngry && !isRedHotAngry && (
              <g id="stormy-sulk-aura">
                <motion.path
                  d="M 29 16 C 26 10, 34 7, 39 12 C 41 7, 48 7, 51 12 C 55 8, 63 10, 64 16 C 69 16, 72 20, 70 24 C 68 29, 61 29, 58 26 C 55 30, 46 30, 43 26 C 40 30, 31 29, 29 24 C 27 20, 29 17, 29 16 Z"
                  fill="rgba(226,232,240,0.9)"
                  stroke="rgba(148,163,184,0.85)"
                  strokeWidth="1.2"
                  animate={{ y: [0, -1.5, 0.8, 0], x: [0, -0.7, 0.6, 0], opacity: [0.78, 0.98, 0.82] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.path
                  d="M 31 26 C 28 29, 31 33, 34 33"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  animate={{ x: [0, -1, 0], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.path
                  d="M 65 26 C 68 29, 65 33, 62 33"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  animate={{ x: [0, 1, 0], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.22 }}
                />
              </g>
            )}

            {isRedHotAngry && (
              <g id="red-hot-aura">
                <motion.path
                  d="M 50 7 C 22 9, 8 30, 9 56 C 10 82, 28 95, 50 95 C 72 95, 90 82, 91 56 C 92 30, 78 9, 50 7 Z"
                  fill="rgba(239,68,68,0.2)"
                  stroke="rgba(248,113,113,0.32)"
                  strokeWidth="1.4"
                  animate={{ scale: [0.98, 1.05, 0.99], opacity: [0.5, 0.95, 0.55] }}
                  transition={{ duration: 1.05, repeat: Infinity, ease: "easeInOut" }}
                  style={{ originX: 0.5, originY: 0.5 }}
                />
                <motion.path
                  d="M 24 18 C 20 12, 28 10, 25 3"
                  stroke="#fb7185"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ y: [0, -4, 0], opacity: [0.45, 0.95, 0.45] }}
                  transition={{ duration: 0.85, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.path
                  d="M 50 14 C 46 8, 54 7, 50 1"
                  stroke="#f97316"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.72, repeat: Infinity, ease: "easeInOut", delay: 0.12 }}
                />
                <motion.path
                  d="M 76 18 C 80 12, 72 10, 75 3"
                  stroke="#fb7185"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ y: [0, -4, 0], opacity: [0.45, 0.95, 0.45] }}
                  transition={{ duration: 0.92, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                />
              </g>
            )}

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

            {hasTrait("nova") && (
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

            {hasTrait("comet") && (
              <g id="comet-trail">
                <motion.path
                  d="M 20 32 C 6 36, 2 56, 15 68 C 31 82, 56 79, 76 62"
                  fill="none"
                  stroke="#67e8f9"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="2 8"
                  animate={{ pathLength: [0.45, 1, 0.45], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.path
                  d="M 80 56 L 85 63 L 94 64 L 88 70 L 90 79 L 80 74 L 70 79 L 72 70 L 66 64 L 75 63 Z"
                  fill="#fef08a"
                  stroke="#1e293b"
                  strokeWidth="1.5"
                  animate={{ x: [0, 2, -1, 0], y: [0, -2, 1, 0], rotate: [0, 9, -9, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{ originX: 0.8, originY: 0.65 }}
                />
              </g>
            )}

            {hasTrait("moon") && (
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

            {hasTrait("orbitring") && (
              <motion.ellipse
                id="orbit-ring"
                cx="50"
                cy="57"
                rx="40"
                ry="11"
                fill="none"
                stroke="#a78bfa"
                strokeWidth="2"
                strokeDasharray="10 8"
                animate={{ rotate: 360, opacity: [0.35, 0.85, 0.35] }}
                transition={{ rotate: { duration: 9, repeat: Infinity, ease: "linear" }, opacity: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}
                style={{ originX: 0.5, originY: 0.57 }}
              />
            )}

            {hasTrait("sail") && (
              <g id="moon-sail">
                <motion.path
                  d="M 70 28 Q 88 34, 86 61 Q 72 58, 64 46 Z"
                  fill="#dbeafe"
                  stroke="#1e293b"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                  animate={{ rotate: [-4, 5, -3, 0], y: [0, -1, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{ originX: 0.72, originY: 0.44 }}
                />
                <path d="M 67 30 L 67 59" stroke="#475569" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M 67 30 Q 74 32, 78 37" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              </g>
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
            {hasTrait("wings") && (
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

            {hasTrait("cloudruff") && (
              <g id="cloud-ruff">
                <path d="M 24 58 C 22 50, 30 46, 36 50 C 38 43, 49 43, 52 50 C 57 46, 65 49, 64 57 C 70 56, 74 61, 71 66 C 67 70, 30 70, 25 66 C 22 63, 22 60, 24 58 Z" fill="#eff6ff" stroke="#1e293b" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M 31 55 Q 38 52, 45 55" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />
                <path d="M 54 55 Q 61 52, 67 56" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />
              </g>
            )}

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

            {hasTrait("chefhat") && (
              <motion.g
                id="chef-hat"
                animate={{ y: [0, -1.5, 0], rotate: [-1.5, 1.5, -1.5] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: 0.5, originY: 0.18 }}
              >
                <path d="M 35 24 C 31 14, 39 8, 46 12 C 49 7, 58 7, 61 13 C 68 10, 74 17, 70 25 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M 38 24 L 68 24 L 66 31 L 40 31 Z" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M 43 28 L 61 28" stroke="#fb7185" strokeWidth="1.4" strokeLinecap="round" />
              </motion.g>
            )}

            {hasTrait("headband") && (
              <g id="training-headband">
                <path d="M 29 38 Q 50 31, 71 38" stroke="#ef4444" strokeWidth="4.6" strokeLinecap="round" fill="none" />
                <motion.path
                  d="M 70 38 Q 80 34, 85 41 Q 78 44, 74 49"
                  fill="none"
                  stroke="#f87171"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  animate={{ rotate: [-6, 8, -4, 0], y: [0, -1, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{ originX: 0.76, originY: 0.4 }}
                />
              </g>
            )}

            {hasTrait("leafpin") && (
              <motion.g
                id="leaf-pin"
                animate={{ rotate: [-4, 4, -4], y: [0, -0.6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: 0.34, originY: 0.28 }}
              >
                <path d="M 31 30 Q 24 24, 26 18 Q 35 18, 38 27 Z" fill="#4ade80" stroke="#1e293b" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M 31 30 Q 34 22, 37 18" fill="none" stroke="#166534" strokeWidth="1" strokeLinecap="round" />
              </motion.g>
            )}

            {hasTrait("starpin") && (
              <motion.g
                id="star-pin"
                animate={{ scale: [0.95, 1.08, 0.95], rotate: [-6, 6, -6] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: 0.7, originY: 0.26 }}
              >
                <path d="M 69 18 L 72 24 L 79 25 L 74 30 L 75.5 37 L 69 33.5 L 62.5 37 L 64 30 L 59 25 L 66 24 Z" fill="#fbbf24" stroke="#1e293b" strokeWidth="1.3" strokeLinejoin="round" />
                <circle cx="69" cy="27" r="1.4" fill="#fff7ed" />
              </motion.g>
            )}

            {/* Level 10 ribbon state */}
            {hasTrait("ribbon") && (
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

            {hasTrait("glasses") && (
              <g id="reading-glasses">
                <circle cx="34" cy="46" r="8.5" fill="none" stroke="#0f172a" strokeWidth="1.8" />
                <circle cx="66" cy="46" r="8.5" fill="none" stroke="#0f172a" strokeWidth="1.8" />
                <line x1="42.5" y1="46" x2="57.5" y2="46" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="25.5" y1="43" x2="21" y2="40" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="74.5" y1="43" x2="79" y2="40" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
              </g>
            )}

            {hasTrait("laurel") && (
              <g id="laurel-crown">
                <path d="M 32 25 C 28 19, 27 15, 29 11" stroke="#84cc16" strokeWidth="1.9" strokeLinecap="round" fill="none" />
                <path d="M 68 25 C 72 19, 73 15, 71 11" stroke="#84cc16" strokeWidth="1.9" strokeLinecap="round" fill="none" />
                <path d="M 31 20 C 27 19, 26 15, 29 14 C 31 15, 32 17, 31 20 Z" fill="#a3e635" stroke="#1e293b" strokeWidth="0.8" />
                <path d="M 36 16 C 33 15, 33 11, 36 10 C 38 11, 39 13, 36 16 Z" fill="#a3e635" stroke="#1e293b" strokeWidth="0.8" />
                <path d="M 69 20 C 73 19, 74 15, 71 14 C 69 15, 68 17, 69 20 Z" fill="#a3e635" stroke="#1e293b" strokeWidth="0.8" />
                <path d="M 64 16 C 67 15, 67 11, 64 10 C 62 11, 61 13, 64 16 Z" fill="#a3e635" stroke="#1e293b" strokeWidth="0.8" />
              </g>
            )}

            {hasTrait("gala") && (
              <g id="gala-drape">
                <path d="M 29 57 Q 39 49, 50 54 Q 60 49, 71 57" fill="none" stroke="#be185d" strokeWidth="3.2" strokeLinecap="round" />
                <path d="M 33 58 Q 28 72, 33 84 Q 42 79, 46 69 L 43 58 Z" fill="#f9a8d4" stroke="#1e293b" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M 67 58 Q 72 72, 67 84 Q 58 79, 54 69 L 57 58 Z" fill="#fbcfe8" stroke="#1e293b" strokeWidth="1.3" strokeLinejoin="round" />
                <circle cx="50" cy="56" r="2.6" fill="#fef3c7" stroke="#1e293b" strokeWidth="1" />
              </g>
            )}

            {/* 6. Soft Rosy Cheek Blush */}
            <circle cx="22" cy="62" r="5" fill={isRedHotAngry ? "#f87171" : "#fda4af"} opacity={isRedHotAngry ? 1 : 0.95} />
            <circle cx="78" cy="62" r="5" fill={isRedHotAngry ? "#f87171" : "#fda4af"} opacity={isRedHotAngry ? 1 : 0.95} />
            {isRedHotAngry && <circle cx="50" cy="31" r="6.5" fill="#fecaca" opacity="0.7" />}

            {hasTrait("scarf") && (
              <g id="cozy-scarf">
                <path d="M 34 56 Q 50 62, 66 56" stroke="#ef4444" strokeWidth="4.4" strokeLinecap="round" fill="none" />
                <path d="M 44 58 L 47 82" stroke="#ef4444" strokeWidth="3.7" strokeLinecap="round" />
                <path d="M 52 58 L 57 76" stroke="#fda4af" strokeWidth="3.2" strokeLinecap="round" />
                <circle cx="50" cy="58" r="2.4" fill="#fef2f2" stroke="#1e293b" strokeWidth="0.8" />
              </g>
            )}

            {hasTrait("captainsash") && (
              <g id="captain-sash">
                <path d="M 35 49 L 43 46 L 61 79 L 53 82 Z" fill="#fde68a" stroke="#1e293b" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M 39 53 L 46 50" stroke="#d97706" strokeWidth="1.1" strokeLinecap="round" />
                <path d="M 51 74 L 58 71" stroke="#d97706" strokeWidth="1.1" strokeLinecap="round" />
              </g>
            )}

            {hasTrait("brooch") && (
              <g id="chest-brooch">
                <path d="M 46 62 L 50 58 L 54 62 L 50 66 Z" fill="#fbbf24" stroke="#1e293b" strokeWidth="1.2" />
                <circle cx="50" cy="62" r="1.2" fill="#fff7ed" />
              </g>
            )}

            {hasTrait("satchel") && (
              <g id="walk-satchel">
                <path d="M 62 54 Q 70 51, 76 56 L 74 74 Q 68 78, 60 75 Z" fill="#c2410c" stroke="#1e293b" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M 43 39 Q 55 45, 67 58" fill="none" stroke="#7c2d12" strokeWidth="2.1" strokeLinecap="round" />
                <path d="M 63 60 L 72 60" stroke="#fed7aa" strokeWidth="1.1" strokeLinecap="round" />
              </g>
            )}

            {hasTrait("medal") && (
              <g id="champion-medal">
                <path d="M 43 57 L 47 67" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M 57 57 L 53 67" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="50" cy="72" r="6" fill="#fbbf24" stroke="#1e293b" strokeWidth="1.5" />
                <path d="M 47 72 L 49.2 74.2 L 54 69.8" fill="none" stroke="#fff7ed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}

            {hasTrait("heartcore") && (
              <g id="heartcore-emblem">
                <motion.path
                  d="M 50 64 C 46 57, 37 58, 37 66 C 37 73, 45 78, 50 83 C 55 78, 63 73, 63 66 C 63 58, 54 57, 50 64 Z"
                  fill="#fb7185"
                  stroke="#1e293b"
                  strokeWidth="1.6"
                  animate={{
                    scale: [1, 1.12, 1],
                    filter: [
                      "drop-shadow(0 0 0 rgba(251,113,133,0))",
                      "drop-shadow(0 0 8px rgba(251,113,133,0.7))",
                      "drop-shadow(0 0 0 rgba(251,113,133,0))"
                    ]
                  }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{ originX: 0.5, originY: 0.72 }}
                />
                <motion.ellipse
                  cx="50"
                  cy="70"
                  rx="16"
                  ry="6"
                  fill="none"
                  stroke="#f9a8d4"
                  strokeWidth="1.4"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4.8, repeat: Infinity, ease: "linear" }}
                  style={{ originX: 0.5, originY: 0.7 }}
                />
              </g>
            )}

            {hasTrait("apron") && (
              <g id="chef-apron">
                <path d="M 36 59 Q 50 53, 64 59 L 61 83 Q 50 87, 39 83 Z" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M 41 58 C 43 54, 47 53, 50 54 C 53 53, 57 54, 59 58" fill="none" stroke="#1e293b" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M 43 69 L 57 69" stroke="#fb7185" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="50" cy="76" r="2" fill="#fb7185" />
              </g>
            )}

            {hasTrait("ladle") && (
              <motion.g
                id="cozy-ladle"
                animate={{ rotate: [-8, 10, -5, 0], y: [0, -1, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: 0.74, originY: 0.68 }}
              >
                <line x1="68" y1="58" x2="79" y2="79" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" />
                <ellipse cx="82" cy="82" rx="5.5" ry="4" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.2" />
              </motion.g>
            )}

            {hasTrait("cape") && (
              <g id="hero-cape">
                <path
                  d="M 28 58 Q 20 70, 28 87 Q 38 82, 44 71 L 41 58 Z"
                  fill="#f43f5e"
                  opacity="0.9"
                  stroke="#1e293b"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M 72 58 Q 80 70, 72 87 Q 62 82, 56 71 L 59 58 Z"
                  fill="#fb7185"
                  opacity="0.86"
                  stroke="#1e293b"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </g>
            )}

            {hasTrait("scepter") && (
              <g id="orbit-scepter">
                <motion.path
                  d="M 79 36 L 69 80"
                  stroke="#7c3aed"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  animate={{ rotate: [-6, 7, -3, 0], y: [0, -1.5, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  style={{ originX: 0.74, originY: 0.58 }}
                />
                <circle cx="81" cy="33" r="4.4" fill="#c4b5fd" stroke="#1e293b" strokeWidth="1.3" />
                <path d="M 81 27 L 83 31 L 87 31 L 84 34 L 85 38 L 81 36 L 77 38 L 78 34 L 75 31 L 79 31 Z" fill="#fef08a" stroke="#1e293b" strokeWidth="0.9" />
              </g>
            )}

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
              isRedHotAngry ? (
                <path d="M 43 64 Q 46 69, 50 63 Q 54 69, 57 64" stroke="#991b1b" strokeWidth="2.7" strokeLinecap="round" fill="none" />
              ) : (
                <path d="M 44 65 Q 50 59, 56 65" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              )
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
            {hasTrait("bell") && (
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
            {hasTrait("book") && (
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

            {hasTrait("notebook") && (
              <motion.g
                id="scout-notebook"
                animate={{ y: [0, -1.2, 0], rotate: [-2, 2, -2] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: 0.2, originY: 0.8 }}
              >
                <path d="M 15 74 L 31 72 L 33 88 L 17 90 Z" fill="#dbeafe" stroke="#1e293b" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M 18 76 L 29 75" stroke="#60a5fa" strokeWidth="1" strokeLinecap="round" />
                <path d="M 19 80 L 30 79" stroke="#60a5fa" strokeWidth="1" strokeLinecap="round" />
                <path d="M 20 84 L 29 83" stroke="#60a5fa" strokeWidth="1" strokeLinecap="round" />
                <path d="M 16.5 75 L 18 89" stroke="#1e293b" strokeWidth="0.9" strokeLinecap="round" />
              </motion.g>
            )}

            {/* Level 40 bubble tea charm */}
            {hasTrait("tea") && (
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

            {hasTrait("teapot") && (
              <motion.g
                id="teapot-service"
                animate={{ y: [0, -1.2, 0], rotate: [1.5, -1.5, 1.5] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: 0.22, originY: 0.82 }}
              >
                <ellipse cx="22" cy="87" rx="12" ry="2.4" fill="#fecdd3" opacity="0.6" />
                <path d="M 18 73 Q 12 76, 14 84 L 28 84 Q 31 75, 24 72 Z" fill="#fde68a" stroke="#1e293b" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M 27 76 Q 34 76, 32 81 Q 31 84, 27 82" fill="none" stroke="#1e293b" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M 16 76 Q 11 75, 11 79 Q 11 83, 15 82" fill="none" stroke="#1e293b" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M 18 73 Q 20 69, 24 72" fill="none" stroke="#1e293b" strokeWidth="1.1" strokeLinecap="round" />
              </motion.g>
            )}

            {/* Sparkle stars side additions for 50+ */}
            {hasTrait("stars") && (
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

            {hasTrait("quill") && (
              <motion.g
                id="mentor-quill"
                animate={{ y: [0, -1.5, 0], rotate: [-4, 5, -4] }}
                transition={{ duration: 2.7, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: 0.18, originY: 0.28 }}
              >
                <path d="M 17 26 C 10 30, 10 41, 18 44 C 25 41, 27 31, 22 25 C 20 24, 18 24, 17 26 Z" fill="#c4b5fd" stroke="#1e293b" strokeWidth="1.2" />
                <path d="M 18 43 L 28 58" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 23 50 L 33 48 L 31 57 L 21 58 Z" fill="#fff7ed" stroke="#1e293b" strokeWidth="1.1" strokeLinejoin="round" />
                <line x1="24.5" y1="51.5" x2="30.5" y2="51.5" stroke="#a8a29e" strokeWidth="0.8" strokeLinecap="round" />
                <line x1="24.5" y1="54" x2="29.5" y2="54" stroke="#a8a29e" strokeWidth="0.8" strokeLinecap="round" />
              </motion.g>
            )}

            {/* 11. Celestial Rainbow Halo above crown for 300+ */}
            {hasTrait("halo") && (
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
            {hasTrait("crown") && (
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

                {activeTierState && activeTierState.count >= 650 && (
                  <g>
                    <motion.circle cx="28" cy="18" r="1.8" fill="#a78bfa" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
                    <motion.circle cx="72" cy="18" r="1.8" fill="#22d3ee" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.5 }} />
                  </g>
                )}
              </g>
            )}

            {/* 12. Wizard Hat accessory (render on top of head) */}
            {hasTrait("wizard") && (
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

            {hasTrait("golf") && (
              <g id="golf-club">
                <motion.path
                  d="M 76 40 L 70 70"
                  stroke="#475569"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  animate={{ rotate: [-8, 10, -6, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{ originX: 0.7, originY: 0.55 }}
                />
                <path d="M 68 70 Q 75 72, 79 67" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                <circle cx="82" cy="72" r="2.6" fill="#ffffff" stroke="#1e293b" strokeWidth="1.1" />
                <path d="M 27 22 Q 35 18, 42 22" stroke="#065f46" strokeWidth="3" strokeLinecap="round" />
              </g>
            )}

            {hasTrait("dumbbell") && (
              <motion.g
                id="tiny-dumbbell"
                animate={{ rotate: [-10, 12, -8, 0], y: [0, -1.2, 0] }}
                transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: 0.76, originY: 0.8 }}
              >
                <line x1="66" y1="84" x2="84" y2="84" stroke="#475569" strokeWidth="2.3" strokeLinecap="round" />
                <rect x="62" y="79.5" width="4" height="9" rx="1.3" fill="#94a3b8" stroke="#1e293b" strokeWidth="1" />
                <rect x="84" y="79.5" width="4" height="9" rx="1.3" fill="#94a3b8" stroke="#1e293b" strokeWidth="1" />
                <rect x="58.5" y="77.5" width="3.5" height="13" rx="1.2" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1" />
                <rect x="88" y="77.5" width="3.5" height="13" rx="1.2" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1" />
              </motion.g>
            )}

            {hasTrait("whistle") && (
              <g id="trainer-whistle">
                <path d="M 54 63 Q 60 61, 63 66 Q 60 72, 54 70 Q 50 66, 54 63 Z" fill="#fde68a" stroke="#1e293b" strokeWidth="1.3" />
                <circle cx="58.5" cy="66.5" r="1.4" fill="#fff7ed" stroke="#1e293b" strokeWidth="0.8" />
                <path d="M 50 58 Q 56 56, 61 60" fill="none" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
              </g>
            )}

            {/* 13. Open Book accessory (render in front at the bottom) */}
            {hasTrait("book") && (
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
    </motion.div>
  );
};
