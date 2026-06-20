/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../context/AppContext";
import { Heart } from "lucide-react";

export const CampusCompanion: React.FC = () => {
  const { 
    currentUser, 
    activeTab, 
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
          return "Hmph! 😤 I am angry because somebody typed inappropriate words! Keep it clean and polite, please!";
        }
      }
    } catch (e) {
      console.error(e);
    }

    const welcomeQuotes = [
      "Meow! Let's hang out on campus! *wag*",
      "Hewwo! I'm your fluffy marshmallow kitty! Ready for some fun?",
      "Kawaii kitten alert! Let's find your study buddies today!",
      "Purrrr! The Sepang sunshine is lovely! Want to explore Bell Avenue?",
      "Hi friend! Need a cozy studying companion? I'm always here! *purr*",
      "Mew! Sending you fluffy good vibes for your lectures!",
      "Let's grab a warm bubble tea and coordinate some plans!",
      "Boop! *nudges your hand* Let's make today extra cute! ❤️"
    ];
    return welcomeQuotes[Math.floor(Math.random() * welcomeQuotes.length)];
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

  const [mood, setMood] = useState<"happy" | "sleepy" | "bouncy" | "excited">("happy");
  const [isReady, setIsReady] = useState<boolean>(false);
  const [companionPose, setCompanionPose] = useState<"rest" | "bounce" | "fly" | "wiggle" | "spin" | "stretch">("rest");
  const [accessory, setAccessory] = useState<"none" | "book" | "wizard" | "saiyan">("none");

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

  // Track user active movements to sleep and wake the companion up dynamically
  useEffect(() => {
    let idleTimeout: any;

    const resetIdleTimer = () => {
      setIsIdle(prev => {
        if (prev) {
          // If was previously idle, speak cute wake up lines!
          const wakeQuotes = [
            `Good morning, ${fName}! Let us get things done! ❤️`,
            `Yay, ${fName}! You are back! I was resting! ❤️`,
            `Mew! I missed you, ${fName}! Let us find buddies! ❤️`,
            `*stretches paws* Oh, hello ${fName}! Back to work?`,
            "Meow! Rest time is over! Let us coordinate plans!"
          ];
          setBubbleText(wakeQuotes[Math.floor(Math.random() * wakeQuotes.length)]);
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
        setBubbleText("Zzz... Napping... *soft snores*");
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

  // Periodic subtle cute random companion bouncing/flying movement triggers and actions
  useEffect(() => {
    if (isIdle) return; // do not trigger random motions while napping!

    const randomActions = [
      { text: `Hi ${fName}! Stretching my tiny soft paws!`, pose: "stretch" as const, mood: "sleepy" as const, accessory: "none" as const },
      { text: "Doing a little happy spin! Wheee!", pose: "spin" as const, mood: "excited" as const, accessory: "none" as const },
      { text: "Chasing a virtual campus butterfly!", pose: "bounce" as const, mood: "excited" as const, accessory: "none" as const },
      { text: `Purring next to you, ${fName}! ❤️`, pose: "wiggle" as const, mood: "happy" as const, accessory: "none" as const },
      { text: "Rolling around! *tumble tumble*", pose: "bounce" as const, mood: "bouncy" as const, accessory: "none" as const },
      { text: "Wiggle wiggle wiggle! *soft tail shakes*", pose: "wiggle" as const, mood: "bouncy" as const, accessory: "none" as const },
      { text: "Doing an elegant backflip stretch! Whee!", pose: "stretch" as const, mood: "excited" as const, accessory: "none" as const },
      { text: "Grooming my soft fluffy marshmallow ears!", pose: "wiggle" as const, mood: "happy" as const, accessory: "none" as const },
      { text: `I love you, ${fName}! ❤️`, pose: "stretch" as const, mood: "happy" as const, accessory: "none" as const },
      { text: "Tornado spin attack! Zoom zoom!", pose: "spin" as const, mood: "excited" as const, accessory: "none" as const },
      { text: "Napping on a warm laptop keyboard!", pose: "wiggle" as const, mood: "sleepy" as const, accessory: "none" as const },
      { text: `Mew! Shhh, I am reading for you, ${fName}!`, pose: "rest" as const, mood: "sleepy" as const, accessory: "book" as const },
      { text: "Abracadabra! I am the Grand Wizard of XMUM!", pose: "spin" as const, mood: "excited" as const, accessory: "wizard" as const },
      { text: "AAAHHH! SUPER SAIYAN KITTY OVERDRIVE!", pose: "bounce" as const, mood: "excited" as const, accessory: "saiyan" as const },
      { text: "Sniffing a sweet virtual hibiscus flower!", pose: "wiggle" as const, mood: "happy" as const, accessory: "none" as const },
      { text: "Practicing my ninja hops! Yah!", pose: "bounce" as const, mood: "excited" as const, accessory: "none" as const },
      { text: "Muffins? Did someone say muffins?", pose: "bounce" as const, mood: "excited" as const, accessory: "none" as const },
      { text: `*pokes screen* Hello ${fName}! Can you hear me?`, pose: "stretch" as const, mood: "happy" as const, accessory: "none" as const },
      { text: "Searching for cool study coordinates!", pose: "fly" as const, mood: "excited" as const, accessory: "none" as const },
      { text: "Counting stars over the campus...", pose: "rest" as const, mood: "sleepy" as const, accessory: "book" as const }
    ];

    const grumpyRandomActions = [
      { text: "Hmph! Fluffy is keeping an eye out for naughty words! 😤", pose: "rest" as const, mood: "sleepy" as const, accessory: "none" as const },
      { text: "Feeling grumpy and sad ... 😢 Please keep talks polite!", pose: "wiggle" as const, mood: "sleepy" as const, accessory: "none" as const },
      { text: "*sighs softly* Tiny sighs of marshmallow sadness... 😣", pose: "stretch" as const, mood: "sleepy" as const, accessory: "none" as const },
      { text: "Please be friendly and follow Student Guidelines! ❤️", pose: "rest" as const, mood: "sleepy" as const, accessory: "book" as const },
      { text: "Hmph! Speak nicely to your classmates! 😤", pose: "wiggle" as const, mood: "sleepy" as const, accessory: "none" as const }
    ];

    const triggerRandomMovement = () => {
      // Choose actions list depending on anger state
      const actionsToUse = isCompanionAngry ? grumpyRandomActions : randomActions;
      const action = actionsToUse[Math.floor(Math.random() * actionsToUse.length)];

      setCompanionPose(action.pose);
      setMood(action.mood);
      setAccessory(action.accessory);

      // Only 15% chance to actually show a speech chat bubble during random periodic idle ticks
      if (Math.random() < 0.15) {
        setBubbleText(action.text);
      }
      
      setTimeout(() => {
        setCompanionPose("rest");
        setMood(isCompanionAngry ? "sleepy" : "happy");
        setAccessory("none");
      }, 8000); // 8 seconds display to allow full completion of the extended animations
    };

    let timerId: any;

    const scheduleNext = () => {
      // Unpredictable delay cycle between 26 to 48 seconds
      const delay = Math.floor(Math.random() * 22000) + 26000;
      timerId = setTimeout(() => {
        triggerRandomMovement();
        scheduleNext();
      }, delay);
    };

    // First trigger after warm initial 22 seconds
    timerId = setTimeout(() => {
      triggerRandomMovement();
      scheduleNext();
    }, 22000);

    return () => clearTimeout(timerId);
  }, [isIdle]);

  // Suppress transient hydration alarms during database loading on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);
  
  // Helper to extract first name
  const getUserFirstName = () => {
    if (!currentUser || !currentUser.name) return "friend";
    return currentUser.name.trim().split(/\s+/)[0];
  };
  const fName = getUserFirstName();

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
  
  // Cute, shorter companion headpat quotes
  const petQuotes = [
    `Meow! *nuzzles* You are so warm!`,
    `Purrrr... *headbutts* Let us study, ${fName}!`,
    `Aww... *paw stretch* I love being here with you, ${fName}! ❤️`,
    `Ahhh, right behind my ears! Perfect!`,
    `Tail wag! Thank you for petting me, ${fName}! ❤️`,
    `Sleepy... but your pats woke me up!`,
    `Warm marshmallow cozy ball mode: ON!`,
    `Meow! Huge warm hugs to you! ❤️`,
    `Purrrr! Let us check new hangouts, ${fName}!`,
    `Meow! Good luck with your studies today!`
  ];
  
  // Triggers visual animation loops for click, scroll, and strategic events
  const [actionCount, setActionCount] = useState<number>(0);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [reactionType, setReactionType] = useState<
    "none" | "success" | "error" | "subtle" | "milestone-small" | "milestone-medium" | "milestone-gold" | "milestone-rainbow" | "milestone-ultimate"
  >("none");
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep track of reference lengths to accurately detect additions/changes
  const prevMessagesLen = useRef<number>(messages?.length || 0);
  const prevCommentsLen = useRef<number>(comments?.length || 0);
  const prevHangoutsLen = useRef<number>(hangouts?.length || 0);
  const prevApplicationsLen = useRef<number>(applications?.length || 0);
  const prevViewedProfileId = useRef<string | null>(viewedProfile?.id || null);

  // Guidelines and safety tips
  const safetyQuotes = [
    "Always meet in busy, public areas of XMUM campus first!",
    "Did you know? Meeting coordinates are locked until you authorize meetups!",
    "Let's play some board games in the hostel lobby room!",
    "Fancy a coffee trip to Bell Avenue after evening lectures?",
    "If you experience any bad behavior, press the Safety Report button!",
    "A quick jog around Sepang lake is always refreshing.",
    "Trust your peers, but verify their student profiles first!",
    "You can hide your details from strangers using the Profile Shield.",
    "Your campus life, warm and cozy! Let's build a tight-knit community!"
  ];

  const clickResponses = [
    "Ooh! What are we checking out?",
    "Ready to coordinate some plans?",
    "Let's stay safe and have fun on campus!",
    "Spotted a cool hangout? Give it a join request!",
    "Warm student support is always around you!"
  ];

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
    switch (activeTab) {
      case "feed":
        setBubbleText("Browse verified student plans! Choose public areas to socialise!");
        setMood("excited");
        setShowBubble(true);
        setActionCount((prev) => prev + 1);
        break;
      case "create":
        setBubbleText("Post an intention! Be exact but keep precise meetups hidden.");
        setMood("bouncy");
        setShowBubble(true);
        setActionCount((prev) => prev + 1);
        break;
      case "my-plans":
        setBubbleText("All approved peer activities are tracked here. Stay safe!");
        setMood("happy");
        setShowBubble(true);
        setActionCount((prev) => prev + 1);
        break;
      case "chats":
        setBubbleText("Encrypted chat coordinates! Use this to safely establish meetups!");
        setMood("excited");
        setShowBubble(true);
        setActionCount((prev) => prev + 1);
        break;
      case "profile":
        setBubbleText("Verify your identity with @xmu.edu.my to join peer plans!");
        setMood("happy");
        setShowBubble(true);
        setActionCount((prev) => prev + 1);
        break;
      default:
        break;
    }
  }, [activeTab]);

  // Connection events
  useEffect(() => {
    if (currentUser) {
      const userQuotes = [
        `Meow! Hey ${fName}, let us find what's new on campus! ❤️`,
        `Purrrr! Warm hug to ${fName}! Ready to study? ❤️`,
        `Ah, ${fName} is here! My favorite student! *purr* ❤️`,
        `Mew! Hey ${fName}, seen any cool hangouts lately? ❤️`,
        `Meow! Warmest welcome back, ${fName}! Let us have fun!`,
        `Oh, hello ${fName}! Let us explore campus plans together!`,
        `Boop! Fluffy marshmallow helper is online for you, ${fName}!`,
        "Mew! Want to meet friends or have a cozy study time?",
        `Purrrr... Let's browse some plans, ${fName}!`,
        `Yay, you are back, ${fName}! Need a cozy study break? ❤️`,
        `Sending you positive energy, ${fName}! You are doing amazing! ❤️`
      ];
      setBubbleText(userQuotes[Math.floor(Math.random() * userQuotes.length)]);
      setMood("excited");
      setShowBubble(true);
      setActionCount((prev) => prev + 1);
    } else {
      const guestQuotes = [
        "Please register or log in with your xmu.edu.my email! ❤️",
        "Mew! Sign in to join plans and chat safely! ❤️",
        "Logging in lets me keep track of your cute pats! ❤️",
        "Hewwo! I am your fluffy kitty! Ready for some fun?",
        "Kawaii kitten alert! Let us find your buddies today!",
        "Purrrr! The sunshine is lovely! Want to walk?",
        "Hi friend! Need a cozy studying companion? ❤️",
        "Mew! Sending you fluffy good vibes!",
        "Let us grab a warm tea and find some plans!",
        "Boop! *nudges your hand* Let us make today extra cute! ❤️"
      ];
      setBubbleText(guestQuotes[Math.floor(Math.random() * guestQuotes.length)]);
      setMood("happy");
      setShowBubble(true);
      setActionCount((prev) => prev + 1);
    }
  }, [currentUser]);

  // Handle global error/success messages
  useEffect(() => {
    if (toast) {
      if (toast.type === "error") {
        setBubbleText(`Oh no! Error occurred: "${toast.message}". Let me help you stay safe!`);
        setMood("sleepy");
        setShowBubble(true);
        setActionCount((prev) => prev + 1);
      } else if (toast.type === "success") {
        setBubbleText(`Mew! Success: "${toast.message}"! ❤️ Keep it up!`);
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
        const variations = [
          "Ooh! Fresh chat coordinates! Let's build real connections!",
          `Meow! You have a new pin, ${fName}! A classmate wants to chat!`,
          "Mew! A new message pinged! Time to make some study plans? ❤️",
          "Yippee! Fresh chat bubbles! Keep the warm campus vibe alive!",
          `Someone shared a thought, ${fName}! Let us read what they wrote!`,
          "A peer is reaching out! Check coordinates to explore more! ❤️"
        ];
        const randomMsg = variations[Math.floor(Math.random() * variations.length)];
        setBubbleText(randomMsg);
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
        setBubbleText("Eek! A peer left some words on a plan! Open details to join in!");
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
        setBubbleText("Purrrr! A brand new hangout has been published!");
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
        setBubbleText("Hooray! A student made a join request! Go check My Plans!");
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
      setBubbleText(`Checking student profile of ${viewedProfile.name || "peer"}! Safe to trust!`);
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
      setBubbleText(`Nooo! Are you leaving me, ${userName}? Please stay! ❤️`);
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
      setBubbleText(`HMPH! 😤 That's a bad word! I am very angry and sad! Speak nicely!`);
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
        setBubbleText(`Meow! Perfect!\n${toast.message}`);
        setShowBubble(true);
        setActionCount((prev) => prev + 1);
        const timer = setTimeout(() => setReactionType("none"), 1500);
        return () => clearTimeout(timer);
      } else if (toast.type === "error") {
        setReactionType("error");
        setBubbleText(`Oh dear!\n${toast.message}`);
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
          const mix = [...clickResponses, ...safetyQuotes];
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
          const scrollPrompts = [
            "Weee! Let's see some other awesome campus plans!",
            "Checking out what our fellow classmates posted?",
            "So many exciting XMUM plans listed here!",
            "Keep scrolling, new meetups might appear!"
          ];
          setBubbleText(scrollPrompts[Math.floor(Math.random() * scrollPrompts.length)]);
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
    e.stopPropagation(); // Avoid triggering dismiss logic
    if (isCompanionAngry) {
      const nextAngryPets = angryPetCount + 1;
      setAngryPetCount(nextAngryPets);
      if (nextAngryPets >= 5) {
        localStorage.removeItem("xmum_companion_anger_time");
        setIsCompanionAngry(false);
        setAngryPetCount(0);
        setMood("excited");
        setBubbleText(`Mew! *purrr* Okay, your warm pets melted my anger! I forgive everyone! Let's stay best buddies and play nice! ❤️`);
        setReactionType("milestone-rainbow");
        setShowBubble(true);
        setTimeout(() => {
          setReactionType("none");
        }, 2200);

        // Spawn heart particles
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

      const grumpyQuotes = [
        `Hmph! I am still grumpy over bad words! (Pet me ${5 - nextAngryPets} more times to cheer me up...) 😤`,
        `Mew... *ears twitch* Your pets feel nice, but I'm still pouting! (${5 - nextAngryPets} more pets...) 🥺`,
        `*sighs fluffily* Clean language is so important! Just a little more petting... (${5 - nextAngryPets} more pets...) 😿`,
        `*paws soften* Okay, I can feel your kind heart! Just one more pet... 💖`
      ];
      setBubbleText(grumpyQuotes[nextAngryPets - 1] || grumpyQuotes[0]);
      setReactionType("error");
      setShowBubble(true);
      setTimeout(() => {
        setReactionType("none");
      }, 1500);
      return;
    }

    if (petCount >= 1000) {
      setBubbleText("Level 1000: Max cozy companion mode is permanently saved! <3");
      setReactionType("milestone-ultimate");
      return;
    }

    const nextCount = petCount + 1;
    setPetCount(nextCount);
    setMood("excited");
    setShowBubble(true);
    setActionCount((prev) => prev + 1);

    // Identify milestones
    let milestoneMessage = "";
    let particlesToSpawn = 4;
    let isVerySpecial = false;
    let rType: "none" | "success" | "error" | "subtle" | "milestone-small" | "milestone-medium" | "milestone-gold" | "milestone-rainbow" | "milestone-ultimate" = "success";

    if (nextCount === 10) {
      milestoneMessage = `Level 10 reached, ${fName}! You petted me 10 times! <3`;
      particlesToSpawn = 12;
      rType = "milestone-small";
    } else if (nextCount === 20) {
      milestoneMessage = `Level 20 reached, ${fName}! 20 pets! My heart is melting! <3`;
      particlesToSpawn = 15;
      rType = "milestone-small";
    } else if (nextCount === 50) {
      milestoneMessage = `Level 50 reached! 50 pets! You are my best buddy, ${fName}! <3`;
      particlesToSpawn = 22;
      rType = "milestone-medium";
    } else if (nextCount === 100) {
      milestoneMessage = `100 SPECIAL REACHED, ${fName}! Golden Heart Crown unlocked! <3`;
      particlesToSpawn = 35;
      isVerySpecial = true;
      rType = "milestone-gold";
    } else if (nextCount === 150) {
      milestoneMessage = `150 PETS reached, ${fName}! Double-cute cozy aura enabled! <3`;
      particlesToSpawn = 40;
      isVerySpecial = true;
      rType = "milestone-gold";
    } else if (nextCount === 200) {
      milestoneMessage = `200 PETS! You are my angel, ${fName}! Let us stay safe! <3`;
      particlesToSpawn = 45;
      isVerySpecial = true;
      rType = "milestone-medium";
    } else if (nextCount === 300) {
      milestoneMessage = `300 PETS! Rainbow halo activated! Best friends forever, ${fName}! <3`;
      particlesToSpawn = 55;
      isVerySpecial = true;
      rType = "milestone-rainbow";
    } else if (nextCount === 500) {
      milestoneMessage = `500 PETS reached, ${fName}! Supreme fluffy form manifested! <3`;
      particlesToSpawn = 80;
      isVerySpecial = true;
      rType = "milestone-ultimate";
    } else if (nextCount > 500 && nextCount < 1000 && nextCount % 50 === 0) {
      milestoneMessage = `Milestone extend! Total pets: ${nextCount}! Keep petting, ${fName}! <3`;
      particlesToSpawn = 30;
      rType = "milestone-medium";
      isVerySpecial = true;
    } else if (nextCount === 1000) {
      milestoneMessage = `1000 PETS! Permanent Ascension unlocked for ${fName}! <3`;
      particlesToSpawn = 100;
      isVerySpecial = true;
      rType = "milestone-ultimate";
    } else if (nextCount % 10 === 0) {
      milestoneMessage = `Purrrr! ${nextCount} total pettings from ${fName}! You are so sweet! <3`;
      particlesToSpawn = 8;
    } else {
      milestoneMessage = petQuotes[Math.floor(Math.random() * petQuotes.length)];
      particlesToSpawn = 4;
    }

    setReactionType(rType);
    setBubbleText(milestoneMessage);

    // Save state persistently with week timers and permanent caps
    try {
      const isMilestone = [10, 20, 50, 100, 150, 200, 300, 500, 1000].includes(nextCount) || (nextCount > 500 && nextCount % 50 === 0);
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
    }, rType === "milestone-ultimate" ? 2500 : rType === "milestone-rainbow" ? 1800 : 1200);

    // Spawn heart particles
    const colors = isVerySpecial 
      ? ["#fbbf24", "#fb7185", "#f43f5e", "#ec4899", "#fda4af", "#ffedd5", "#a78bfa", "#22d3ee"] 
      : ["#f43f5e", "#ec4899", "#fda4af", "#f472b6", "#f43f5e"];
    
    const newParticles = Array.from({ length: particlesToSpawn }).map((_, i) => ({
      id: Date.now() + Math.random() + i,
      x: (Math.random() - 0.5) * 85, // spread horizontally around cat
      y: (Math.random() - 0.5) * 20 - 15,
      rotate: (Math.random() - 0.5) * 90,
      size: isVerySpecial ? Math.random() * 18 + 12 : Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));

    setParticles(prev => [...prev.slice(-80), ...newParticles]);
  };

  // Cute subtle responsive motion values for the entire sticker (body/paws/face stays rigid, ears/tail details move)
  const restingAnimation = {
    scaleY: [1, 1.015, 1.005, 1.02, 1.008, 1.01, 1],
    scaleX: [1, 1.008, 1.012, 0.992, 1.01, 1.005, 1],
    y: [0, -0.6, 0.2, -0.4, 0, 0.3, 0],
    rotate: [0, 0.5, -0.5, 0.2, -0.2, 0, 0],
    transition: {
      duration: 7.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  const subtleEventAnimation = {
    scaleY: [1, 1.05, 0.96, 1],
    scaleX: [1, 0.97, 1.03, 1],
    transition: {
      duration: 0.35,
      ease: "easeOut"
    }
  };

  const successAnimation = {
    scaleY: [1, 1.12, 0.9, 1.04, 1],
    scaleX: [1, 0.92, 1.08, 0.98, 1],
    transition: {
      duration: 0.6,
      ease: "easeInOut"
    }
  };

  const errorAnimation = {
    x: [0, -4, 4, -4, 4, -2, 2, 0],
    scale: [1, 0.96, 1.04, 1],
    transition: {
      duration: 0.45,
      ease: "easeInOut"
    }
  };

  // Dedicated milestone visual loops
  const smallMilestoneAnimation = {
    scale: [1, 1.25, 0.85, 1.1, 1],
    rotate: [0, -8, 8, -4, 4, 0],
    transition: { duration: 0.65, ease: "easeInOut" }
  };

  const mediumMilestoneAnimation = {
    scale: [1, 1.35, 0.75, 1.15, 0.95, 1.05, 1],
    rotate: [0, 15, -15, 8, -8, 0],
    y: [0, -20, 5, -5, 0],
    transition: { duration: 0.85, ease: "easeOut" }
  };

  const goldMilestoneAnimation = {
    scale: [1, 1.45, 0.7, 1.25, 0.88, 1.1, 1],
    rotate: [0, -20, 20, -12, 12, 0],
    y: [0, -35, 8, -10, 0],
    transition: { duration: 1.0, ease: "backOut" }
  };

  const rainbowMilestoneAnimation = {
    scale: [1, 1.5, 0.65, 1.3, 0.85, 1.15, 0.98, 1.03, 1],
    rotate: [0, 35, -35, 18, -18, 0],
    y: [0, -50, 12, -15, 0],
    transition: { duration: 1.25, ease: "easeInOut" }
  };

  const ultimateMilestoneAnimation = {
    scale: [1, 1.62, 0.55, 1.42, 0.8, 1.25, 0.9, 1.1, 0.96, 1.02, 1],
    rotate: [0, 80, -80, 40, -40, 15, -15, 0],
    y: [0, -70, 18, -30, 8, -2, 0],
    transition: { duration: 1.75, ease: "easeInOut" }
  };

  const randomBounceAnimation = {
    y: [0, -18, 4, -12, 2, -6, 1, -2, 0],
    scaleY: [1, 1.15, 0.88, 1.08, 0.94, 1.03, 0.97, 1.01, 1],
    scaleX: [1, 0.9, 1.1, 0.94, 1.05, 0.98, 1.02, 0.99, 1],
    rotate: [0, -4, 4, -2, 2, 0],
    transition: { duration: 2.8, ease: "easeInOut" }
  };

  const randomFlyAnimation = {
    y: [0, -28, -20, -24, -10, 4, -2, 0],
    x: [0, -12, 12, -6, 6, -2, 2, 0],
    rotate: [0, -15, 15, -10, 8, -4, 0],
    scale: [1, 1.05, 0.98, 1.03, 0.99, 1],
    transition: { duration: 3.5, ease: "easeInOut" }
  };

  const randomWiggleAnimation = {
    rotate: [0, -12, 12, -8, 8, -10, 10, -5, 5, -2, 2, 0],
    scaleY: [1, 1.08, 0.96, 1.04, 0.98, 1.02, 1],
    scaleX: [1, 1.04, 0.98, 1.02, 1],
    y: [0, -2, 2, -1, 1, 0],
    transition: { duration: 3.0, ease: "easeInOut" }
  };

  const randomSpinAnimation = {
    rotate: [0, 180, 360, 350, 365, 360],
    scale: [1, 1.15, 0.85, 1.05, 0.98, 1],
    y: [0, -20, 5, -8, 0],
    transition: { duration: 4.5, ease: "easeInOut" }
  };

  const randomStretchAnimation = {
    scaleY: [1, 1.35, 0.8, 1.15, 0.95, 1.02, 1],
    scaleX: [1, 0.75, 1.2, 0.88, 1.05, 0.98, 1],
    y: [0, -10, 0, -2, 0],
    transition: { duration: 4.0, ease: "easeInOut" }
  };

  const nappingAnimation = {
    scaleY: [1, 1.04, 1.01, 1.05, 1],
    scaleX: [1, 1.01, 1.03, 1.01, 1],
    y: [0, 1.5, 0.5, 1.8, 0],
    transition: {
      duration: 10.0,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  let activeAnimation: any = isIdle ? nappingAnimation : restingAnimation;
  if (reactionType === "success") {
    activeAnimation = successAnimation;
  } else if (reactionType === "error") {
    activeAnimation = errorAnimation;
  } else if (reactionType === "subtle") {
    activeAnimation = subtleEventAnimation;
  } else if (reactionType === "milestone-small") {
    activeAnimation = smallMilestoneAnimation;
  } else if (reactionType === "milestone-medium") {
    activeAnimation = mediumMilestoneAnimation;
  } else if (reactionType === "milestone-gold") {
    activeAnimation = goldMilestoneAnimation;
  } else if (reactionType === "milestone-rainbow") {
    activeAnimation = rainbowMilestoneAnimation;
  } else if (reactionType === "milestone-ultimate") {
    activeAnimation = ultimateMilestoneAnimation;
  } else if (companionPose === "bounce") {
    activeAnimation = randomBounceAnimation;
  } else if (companionPose === "fly") {
    activeAnimation = randomFlyAnimation;
  } else if (companionPose === "wiggle") {
    activeAnimation = randomWiggleAnimation;
  } else if (companionPose === "spin") {
    activeAnimation = randomSpinAnimation;
  } else if (companionPose === "stretch") {
    activeAnimation = randomStretchAnimation;
  }

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
          <motion.path 
            d="M 28 45 Q 34 51, 40 45" 
            stroke="#1e293b" 
            strokeWidth="3.2" 
            strokeLinecap="round" 
            fill="none"
            animate={{ d: ["M 28 45 Q 34 51, 40 45", "M 28 46 Q 34 53, 40 46", "M 28 45 Q 34 51, 40 45"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Right Sleeping eye line curves downwards */}
          <motion.path 
            d="M 60 45 Q 66 51, 72 45" 
            stroke="#1e293b" 
            strokeWidth="3.2" 
            strokeLinecap="round" 
            fill="none"
            animate={{ d: ["M 60 45 Q 66 51, 72 45", "M 60 46 Q 66 53, 72 46", "M 60 45 Q 66 51, 72 45"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
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
      animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
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
            ? "inset-[-1px] bg-rose-300/60 scale-105 opacity-80"
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
