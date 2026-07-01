export type CompanionMood = "happy" | "sleepy" | "bouncy" | "excited";
export type CompanionPose =
  | "rest"
  | "bounce"
  | "fly"
  | "wiggle"
  | "spin"
  | "stretch"
  | "peek"
  | "dash"
  | "orbit"
  | "curtsy";
export type CompanionAccessory = "none" | "book" | "wizard" | "saiyan" | "ribbon" | "bell" | "tea" | "moon" | "nova";
export type CompanionTravel = "home" | "peek-left" | "peek-up" | "hop-out" | "orbit-loop";
export type CompanionReaction =
  | "none"
  | "success"
  | "error"
  | "subtle"
  | "milestone-small"
  | "milestone-medium"
  | "milestone-gold"
  | "milestone-rainbow"
  | "milestone-ultimate";

export type CompanionAction = {
  text: string;
  pose: CompanionPose;
  mood: CompanionMood;
  accessory: CompanionAccessory;
  travel?: CompanionTravel;
  speechChance?: number;
  durationMs?: number;
};

export type CompanionMilestone = {
  count: number;
  message: string;
  particles: number;
  reaction: CompanionReaction;
  special?: boolean;
  accessory?: CompanionAccessory;
};

export const companionDialogue = {
  angryWelcome:
    "Hmph! I am pouting because somebody used inappropriate words. Keep it clean and polite, please.",
  welcome: [
    "Meow! Let us hang out on campus. *wag*",
    "Hewwo! I am your fluffy marshmallow kitty. Ready for some fun?",
    "Kawaii kitten alert! Let us find your study buddies today.",
    "Purrrr! The Sepang sunshine is lovely. Want to explore Bell Avenue?",
    "Hi friend! Need a cozy studying companion? I am always here. *purr*",
    "Mew! Sending you fluffy good vibes for your lectures.",
    "Let us grab a warm bubble tea and coordinate some plans.",
    "Boop! *nudges your hand* Let us make today extra cute."
  ],
  wake: [
    "Good morning, {name}. Let us get things done.",
    "Yay, {name}. You are back. I was resting.",
    "Mew! I missed you, {name}. Let us find buddies.",
    "*stretches paws* Oh, hello {name}. Back to work?",
    "Meow! Rest time is over. Let us coordinate plans."
  ],
  nap: "Zzz... Napping... *soft snores*",
  signedIn: [
    "Meow! Hey {name}, let us find what is new on campus.",
    "Purrrr! Warm hug to {name}. Ready to study?",
    "Ah, {name} is here. My favorite student. *purr*",
    "Mew! Hey {name}, seen any cool hangouts lately?",
    "Meow! Warmest welcome back, {name}. Let us have fun.",
    "Oh, hello {name}. Let us explore campus plans together.",
    "Boop! Fluffy marshmallow helper is online for you, {name}.",
    "Mew! Want to meet friends or have a cozy study time?",
    "Purrrr... Let us browse some plans, {name}.",
    "Yay, you are back, {name}. Need a cozy study break?",
    "Sending you positive energy, {name}. You are doing amazing."
  ],
  guest: [
    "Please register or log in with your xmu.edu.my email.",
    "Mew! Sign in to join plans and chat safely.",
    "Logging in lets me keep track of your cute pats.",
    "Hewwo! I am your fluffy kitty. Ready for some fun?",
    "Kawaii kitten alert! Let us find your buddies today.",
    "Purrrr! The sunshine is lovely. Want to walk?",
    "Hi friend! Need a cozy studying companion?",
    "Mew! Sending you fluffy good vibes.",
    "Let us grab a warm tea and find some plans.",
    "Boop! *nudges your hand* Let us make today extra cute."
  ],
  pet: [
    "Meow! *nuzzles* You are so warm.",
    "Purrrr... *headbutts* Let us study, {name}.",
    "Aww... *paw stretch* I love being here with you, {name}.",
    "Ahhh, right behind my ears. Perfect.",
    "Tail wag! Thank you for petting me, {name}.",
    "Sleepy... but your pats woke me up.",
    "Warm marshmallow cozy ball mode: ON.",
    "Meow! Huge warm hugs to you.",
    "Purrrr! Let us check new hangouts, {name}.",
    "Meow! Good luck with your studies today.",
    "Tiny purr engine activated.",
    "Your pats are charging my secret cozy meter.",
    "Mew... if you keep petting me, I might unlock another little outfit.",
    "My paws are guarding a special reward. More pats might open it.",
    "That pat felt like warm tea after class."
  ],
  petHint: [
    "Tiny secret: gentle pats help me learn new cozy forms.",
    "I heard there are special companion rewards hidden in headpats.",
    "If your hand happens to land on my head, I may sparkle a little.",
    "Some students say I change when I receive enough tiny pats.",
    "A few more soft pats might unlock my next campus charm."
  ],
  safety: [
    "Always meet in busy, public areas of XMUM campus first.",
    "Meeting coordinates stay locked until you authorize meetups.",
    "Let us play some board games in the hostel lobby room.",
    "Fancy a coffee trip to Bell Avenue after evening lectures?",
    "If you experience bad behavior, press the Safety Report button.",
    "A quick jog around Sepang lake is always refreshing.",
    "Trust your peers, but verify their student profiles first.",
    "You can hide your details from strangers using the Profile Shield.",
    "Your campus life, warm and cozy. Let us build a tight-knit community."
  ],
  click: [
    "Ooh! What are we checking out?",
    "Ready to coordinate some plans?",
    "Let us stay safe and have fun on campus.",
    "Spotted a cool hangout? Give it a join request.",
    "Warm student support is always around you."
  ],
  scroll: [
    "Weee! Let us see some other awesome campus plans.",
    "Checking out what our fellow classmates posted?",
    "So many exciting XMUM plans are listed here.",
    "Keep scrolling, new meetups might appear."
  ],
  grumpyPet: [
    "Hmph! I am still grumpy over bad words. Pet me {remaining} more times to cheer me up.",
    "Mew... *ears twitch* Your pets feel nice, but I am still pouting. {remaining} more pets.",
    "*sighs fluffily* Clean language is so important. Just a little more petting: {remaining} to go.",
    "*paws soften* Okay, I can feel your kind heart. Just one more pet."
  ],
  forgiveness:
    "Mew! *purrr* Okay, your warm pets melted my anger. I forgive everyone. Let us stay best buddies and play nice.",
  profanity:
    "HMPH! That was a bad word. I am very angry and sad. Speak nicely, please.",
  maxed: "Level 1000: Max cozy companion mode is permanently saved.",
  genericMilestone:
    "Purrrr! {count} total pettings from {name}. You are so sweet.",
  extendedMilestone:
    "Milestone extend! Total pets: {count}. Keep petting, {name}."
};

export const companionTabResponses: Record<string, { text: string; mood: CompanionMood }> = {
  feed: {
    text: "Browse verified student plans. Choose public areas to socialise.",
    mood: "excited"
  },
  create: {
    text: "Post an intention. Be exact but keep precise meetups hidden.",
    mood: "bouncy"
  },
  "my-plans": {
    text: "All approved peer activities are tracked here. Stay safe.",
    mood: "happy"
  },
  chats: {
    text: "Encrypted chat coordinates. Use this to safely establish meetups.",
    mood: "excited"
  },
  profile: {
    text: "Verify your identity with @xmu.edu.my to join peer plans.",
    mood: "happy"
  }
};

export const companionEventDialogue = {
  toastSuccess: "Mew! Success: \"{message}\". Keep it up.",
  toastError: "Oh no! Error occurred: \"{message}\". Let me help you stay safe.",
  toastSuccessShort: "Meow! Perfect!\n{message}",
  toastErrorShort: "Oh dear!\n{message}",
  newMessage: [
    "Ooh! Fresh chat coordinates. Let us build real connections.",
    "Meow! You have a new pin, {name}. A classmate wants to chat.",
    "Mew! A new message pinged. Time to make some study plans?",
    "Yippee! Fresh chat bubbles. Keep the warm campus vibe alive.",
    "Someone shared a thought, {name}. Let us read what they wrote.",
    "A peer is reaching out. Check coordinates to explore more."
  ],
  newComment: "Eek! A peer left some words on a plan. Open details to join in.",
  newHangout: "Purrrr! A brand new hangout has been published.",
  newApplication: "Hooray! A student made a join request. Go check My Plans.",
  viewedProfile: "Checking student profile of {profile}. Safe to trust.",
  signout: "Nooo! Are you leaving me, {name}? Please stay.",
  hangoutEdited:
    "Tiny update patrol noticed a refresh for \"{intention}\". Everyone will stay in the loop.",
  hangoutCancelled:
    "Plans changed for \"{intention}\". I helped send a gentle heads-up to everyone involved.",
  accountDeleted:
    "Account cleanup is complete. I made sure active plans were wrapped up carefully."
};

export const companionRandomActions: CompanionAction[] = [
  { text: "Hi {name}! Stretching my tiny soft paws.", pose: "stretch", mood: "sleepy", accessory: "none" },
  { text: "Doing a little happy spin. Wheee!", pose: "spin", mood: "excited", accessory: "none" },
  { text: "Chasing a virtual campus butterfly.", pose: "bounce", mood: "excited", accessory: "none" },
  { text: "Purring next to you, {name}.", pose: "wiggle", mood: "happy", accessory: "none" },
  { text: "Rolling around. *tumble tumble*", pose: "bounce", mood: "bouncy", accessory: "none" },
  { text: "Wiggle wiggle wiggle. *soft tail shakes*", pose: "wiggle", mood: "bouncy", accessory: "none" },
  { text: "Doing an elegant backflip stretch. Whee!", pose: "stretch", mood: "excited", accessory: "none" },
  { text: "Grooming my soft fluffy marshmallow ears.", pose: "wiggle", mood: "happy", accessory: "none" },
  { text: "I love keeping watch with you, {name}.", pose: "stretch", mood: "happy", accessory: "none" },
  { text: "Tornado spin practice. Zoom zoom.", pose: "spin", mood: "excited", accessory: "none" },
  { text: "Napping on a warm laptop keyboard.", pose: "wiggle", mood: "sleepy", accessory: "none" },
  { text: "Mew! Shhh, I am reading for you, {name}.", pose: "rest", mood: "sleepy", accessory: "book" },
  { text: "Abracadabra! I am the Grand Wizard of XMUM.", pose: "spin", mood: "excited", accessory: "wizard" },
  { text: "Campus overdrive sparkle mode.", pose: "bounce", mood: "excited", accessory: "saiyan" },
  { text: "Sniffing a sweet virtual hibiscus flower.", pose: "wiggle", mood: "happy", accessory: "none" },
  { text: "Practicing my tiny campus hops. Yah!", pose: "bounce", mood: "excited", accessory: "none" },
  { text: "Muffins? Did someone say muffins?", pose: "bounce", mood: "excited", accessory: "none" },
  { text: "*pokes screen* Hello {name}. Can you hear me?", pose: "stretch", mood: "happy", accessory: "none" },
  { text: "Searching for cool study coordinates.", pose: "fly", mood: "excited", accessory: "none" },
  { text: "Counting stars over the campus.", pose: "rest", mood: "sleepy", accessory: "book" },
  { text: "Tiny ribbon twirl completed.", pose: "curtsy", mood: "happy", accessory: "ribbon" },
  { text: "Tea charm inspection complete. Warm and approved.", pose: "peek", mood: "happy", accessory: "tea" },
  { text: "Soft bell wiggle. I am nearby if you need me.", pose: "wiggle", mood: "bouncy", accessory: "bell" },
  { text: "Moonlit study guardian mode.", pose: "fly", mood: "sleepy", accessory: "moon" }
];

export const companionGrumpyActions: CompanionAction[] = [
  { text: "Hmph! Fluffy is keeping an eye out for naughty words.", pose: "rest", mood: "sleepy", accessory: "none" },
  { text: "Feeling grumpy and sad. Please keep talks polite.", pose: "wiggle", mood: "sleepy", accessory: "none" },
  { text: "*sighs softly* Tiny sighs of marshmallow sadness.", pose: "stretch", mood: "sleepy", accessory: "none" },
  { text: "Please be friendly and follow Student Guidelines.", pose: "rest", mood: "sleepy", accessory: "book" },
  { text: "Hmph! Speak nicely to your classmates.", pose: "wiggle", mood: "sleepy", accessory: "none" }
];

export const companionRareActions: CompanionAction[] = [
  {
    text: "Peek patrol! I checked the corner and came back.",
    pose: "peek",
    mood: "happy",
    accessory: "ribbon",
    travel: "peek-left",
    speechChance: 0.35,
    durationMs: 4200
  },
  {
    text: "Tiny orbit around your screen, then back to base.",
    pose: "orbit",
    mood: "excited",
    accessory: "bell",
    travel: "orbit-loop",
    speechChance: 0.28,
    durationMs: 5200
  },
  {
    text: "Quick campus dash. I found three cozy vibes.",
    pose: "dash",
    mood: "excited",
    accessory: "none",
    travel: "hop-out",
    speechChance: 0.3,
    durationMs: 3800
  },
  {
    text: "I peeked upward to check the sky. Still cute.",
    pose: "peek",
    mood: "bouncy",
    accessory: "moon",
    travel: "peek-up",
    speechChance: 0.3,
    durationMs: 4000
  }
];

export const companionPetMilestones: CompanionMilestone[] = [
  {
    count: 10,
    message: "Level 10 reached, {name}. Ribbon Sprout state unlocked.",
    particles: 12,
    reaction: "milestone-small",
    accessory: "ribbon"
  },
  {
    count: 20,
    message: "Level 20 reached, {name}. Tiny Bell state unlocked.",
    particles: 16,
    reaction: "milestone-small",
    accessory: "bell"
  },
  {
    count: 30,
    message: "Level 30 reached, {name}. Study Book state unlocked.",
    particles: 20,
    reaction: "milestone-medium",
    accessory: "book",
    special: true
  },
  {
    count: 40,
    message: "Level 40 reached, {name}. Bubble Tea Charm state unlocked.",
    particles: 24,
    reaction: "milestone-medium",
    accessory: "tea",
    special: true
  },
  {
    count: 50,
    message: "Level 50 reached, {name}. Best Buddy Stars state unlocked.",
    particles: 30,
    reaction: "milestone-rainbow",
    accessory: "ribbon",
    special: true
  },
  {
    count: 100,
    message: "100 pets reached, {name}. Golden Heart Crown unlocked.",
    particles: 35,
    reaction: "milestone-gold",
    special: true
  },
  {
    count: 150,
    message: "150 pets reached, {name}. Double-cute cozy aura enabled.",
    particles: 40,
    reaction: "milestone-gold",
    special: true
  },
  {
    count: 200,
    message: "200 pets reached, {name}. Angel Wing state unlocked.",
    particles: 45,
    reaction: "milestone-medium",
    special: true
  },
  {
    count: 300,
    message: "300 pets reached, {name}. Rainbow Halo state unlocked.",
    particles: 55,
    reaction: "milestone-rainbow",
    special: true
  },
  {
    count: 500,
    message: "500 pets reached, {name}. Supreme Fluffy Nova state unlocked.",
    particles: 90,
    reaction: "milestone-ultimate",
    accessory: "nova",
    special: true
  },
  {
    count: 1000,
    message: "1000 pets reached, {name}. Permanent Ascension is yours.",
    particles: 120,
    reaction: "milestone-ultimate",
    accessory: "nova",
    special: true
  }
];

export const companionMilestoneCounts = companionPetMilestones.map(milestone => milestone.count);

export const companionAnimations = {
  resting: {
    scaleY: [1, 1.015, 1.005, 1.02, 1.008, 1.01, 1],
    scaleX: [1, 1.008, 1.012, 0.992, 1.01, 1.005, 1],
    y: [0, -0.6, 0.2, -0.4, 0, 0.3, 0],
    rotate: [0, 0.5, -0.5, 0.2, -0.2, 0, 0],
    transition: { duration: 7.5, repeat: Infinity, ease: "easeInOut" }
  },
  subtle: {
    scaleY: [1, 1.05, 0.96, 1],
    scaleX: [1, 0.97, 1.03, 1],
    transition: { duration: 0.35, ease: "easeOut" }
  },
  success: {
    scaleY: [1, 1.12, 0.9, 1.04, 1],
    scaleX: [1, 0.92, 1.08, 0.98, 1],
    transition: { duration: 0.6, ease: "easeInOut" }
  },
  error: {
    x: [0, -4, 4, -4, 4, -2, 2, 0],
    scale: [1, 0.96, 1.04, 1],
    transition: { duration: 0.45, ease: "easeInOut" }
  },
  milestoneSmall: {
    scale: [1, 1.25, 0.85, 1.1, 1],
    rotate: [0, -8, 8, -4, 4, 0],
    transition: { duration: 0.65, ease: "easeInOut" }
  },
  milestoneMedium: {
    scale: [1, 1.35, 0.75, 1.15, 0.95, 1.05, 1],
    rotate: [0, 15, -15, 8, -8, 0],
    y: [0, -20, 5, -5, 0],
    transition: { duration: 0.85, ease: "easeOut" }
  },
  milestoneGold: {
    scale: [1, 1.45, 0.7, 1.25, 0.88, 1.1, 1],
    rotate: [0, -20, 20, -12, 12, 0],
    y: [0, -35, 8, -10, 0],
    transition: { duration: 1.0, ease: "backOut" }
  },
  milestoneRainbow: {
    scale: [1, 1.5, 0.65, 1.3, 0.85, 1.15, 0.98, 1.03, 1],
    rotate: [0, 35, -35, 18, -18, 0],
    y: [0, -50, 12, -15, 0],
    transition: { duration: 1.25, ease: "easeInOut" }
  },
  milestoneUltimate: {
    scale: [1, 1.8, 0.5, 1.55, 0.72, 1.36, 0.84, 1.18, 0.94, 1.04, 1],
    rotate: [0, 120, -120, 70, -70, 25, -25, 0],
    y: [0, -88, 22, -42, 12, -8, 0],
    filter: [
      "drop-shadow(0 0 0 rgba(236,72,153,0))",
      "drop-shadow(0 0 18px rgba(236,72,153,0.9))",
      "drop-shadow(0 0 28px rgba(34,211,238,0.95))",
      "drop-shadow(0 0 16px rgba(251,191,36,0.9))",
      "drop-shadow(0 0 0 rgba(236,72,153,0))"
    ],
    transition: { duration: 2.15, ease: "easeInOut" }
  },
  bounce: {
    y: [0, -18, 4, -12, 2, -6, 1, -2, 0],
    scaleY: [1, 1.15, 0.88, 1.08, 0.94, 1.03, 0.97, 1.01, 1],
    scaleX: [1, 0.9, 1.1, 0.94, 1.05, 0.98, 1.02, 0.99, 1],
    rotate: [0, -4, 4, -2, 2, 0],
    transition: { duration: 2.8, ease: "easeInOut" }
  },
  fly: {
    y: [0, -28, -20, -24, -10, 4, -2, 0],
    x: [0, -12, 12, -6, 6, -2, 2, 0],
    rotate: [0, -15, 15, -10, 8, -4, 0],
    scale: [1, 1.05, 0.98, 1.03, 0.99, 1],
    transition: { duration: 3.5, ease: "easeInOut" }
  },
  wiggle: {
    rotate: [0, -12, 12, -8, 8, -10, 10, -5, 5, -2, 2, 0],
    scaleY: [1, 1.08, 0.96, 1.04, 0.98, 1.02, 1],
    scaleX: [1, 1.04, 0.98, 1.02, 1],
    y: [0, -2, 2, -1, 1, 0],
    transition: { duration: 3.0, ease: "easeInOut" }
  },
  spin: {
    rotate: [0, 180, 360, 350, 365, 360],
    scale: [1, 1.15, 0.85, 1.05, 0.98, 1],
    y: [0, -20, 5, -8, 0],
    transition: { duration: 4.5, ease: "easeInOut" }
  },
  stretch: {
    scaleY: [1, 1.35, 0.8, 1.15, 0.95, 1.02, 1],
    scaleX: [1, 0.75, 1.2, 0.88, 1.05, 0.98, 1],
    y: [0, -10, 0, -2, 0],
    transition: { duration: 4.0, ease: "easeInOut" }
  },
  peek: {
    x: [0, -14, 8, -6, 0],
    rotate: [0, -10, 8, -4, 0],
    scale: [1, 1.06, 0.98, 1.02, 1],
    transition: { duration: 2.6, ease: "easeInOut" }
  },
  dash: {
    x: [0, -36, 18, -10, 0],
    y: [0, -14, -4, -8, 0],
    rotate: [0, -18, 12, -8, 0],
    scaleX: [1, 1.22, 0.88, 1.06, 1],
    transition: { duration: 2.3, ease: "easeInOut" }
  },
  orbit: {
    x: [0, -18, 0, 18, 0],
    y: [0, -22, -34, -18, 0],
    rotate: [0, -20, 0, 20, 0],
    transition: { duration: 3.4, ease: "easeInOut" }
  },
  curtsy: {
    y: [0, 5, -6, 2, 0],
    rotate: [0, -7, 7, -3, 0],
    scaleY: [1, 0.9, 1.08, 0.98, 1],
    transition: { duration: 2.7, ease: "easeInOut" }
  },
  napping: {
    scaleY: [1, 1.04, 1.01, 1.05, 1],
    scaleX: [1, 1.01, 1.03, 1.01, 1],
    y: [0, 1.5, 0.5, 1.8, 0],
    transition: { duration: 10.0, repeat: Infinity, ease: "easeInOut" }
  }
};

export const companionTravelAnimations: Record<CompanionTravel, any> = {
  home: { x: 0, y: 0, rotate: 0 },
  "peek-left": {
    x: [0, -72, -54, -68, 0],
    y: [0, -8, -18, -6, 0],
    rotate: [0, -8, 6, -4, 0],
    transition: { duration: 4.2, ease: "easeInOut" }
  },
  "peek-up": {
    x: [0, -18, 8, 0],
    y: [0, -92, -70, 0],
    rotate: [0, 8, -6, 0],
    transition: { duration: 4.0, ease: "easeInOut" }
  },
  "hop-out": {
    x: [0, -120, -80, -140, 0],
    y: [0, -34, -70, -22, 0],
    rotate: [0, -12, 14, -8, 0],
    transition: { duration: 3.8, ease: "easeInOut" }
  },
  "orbit-loop": {
    x: [0, -95, -130, -42, 0],
    y: [0, -92, -24, -118, 0],
    rotate: [0, -22, 18, -10, 0],
    transition: { duration: 5.2, ease: "easeInOut" }
  }
};

export function pickCompanionLine(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)] || "";
}

export function formatCompanionLine(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function getCompanionMilestone(count: number): CompanionMilestone | undefined {
  return companionPetMilestones.find(milestone => milestone.count === count);
}
