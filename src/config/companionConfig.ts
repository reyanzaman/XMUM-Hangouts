export type CompanionMood = "happy" | "sleepy" | "bouncy" | "excited";
export type CompanionPose =
  | "rest"
  | "bounce"
  | "fly"
  | "wiggle"
  | "shimmy"
  | "spin"
  | "snuggle"
  | "stretch"
  | "peek"
  | "dash"
  | "orbit"
  | "curtsy"
  | "walk"
  | "study"
  | "cook"
  | "exercise"
  | "golf";

export type CompanionAccessory =
  | "none"
  | "book"
  | "wizard"
  | "saiyan"
  | "ribbon"
  | "bell"
  | "tea"
  | "moon"
  | "nova"
  | "glasses"
  | "apron"
  | "golf";

export type CompanionTravel = "home" | "peek-left" | "peek-up" | "hop-out" | "orbit-loop" | "stroll-right";
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

export type CompanionTrait =
  | "ribbon"
  | "bell"
  | "book"
  | "notebook"
  | "tea"
  | "moon"
  | "nova"
  | "glasses"
  | "apron"
  | "brooch"
  | "scarf"
  | "cape"
  | "laurel"
  | "wings"
  | "halo"
  | "crown"
  | "wizard"
  | "saiyan"
  | "golf"
  | "stars"
  | "leafpin"
  | "starpin"
  | "captainsash"
  | "cloudruff"
  | "orbitring"
  | "ladle"
  | "satchel"
  | "headband"
  | "dumbbell"
  | "comet"
  | "quill"
  | "teapot"
  | "sail"
  | "chefhat"
  | "medal"
  | "whistle"
  | "scepter"
  | "gala"
  | "heartcore";

export type CompanionAction = {
  text: string;
  pose: CompanionPose;
  mood: CompanionMood;
  accessory: CompanionAccessory;
  travel?: CompanionTravel;
  speechChance?: number;
  durationMs?: number;
  minPetCount?: number;
  maxPetCount?: number;
  preferredTabs?: string[];
};

export type CompanionMilestone = {
  count: number;
  message: string;
  particles: number;
  reaction: CompanionReaction;
  special?: boolean;
  accessory?: CompanionAccessory;
};

export type CompanionActivityMetric = "hosted" | "joined" | "liked" | "commented";

export type CompanionActivityStats = Record<CompanionActivityMetric, number>;

export type CompanionActivityUnlock = {
  metric: CompanionActivityMetric;
  target: number;
  label: string;
};

export type CompanionTierState = {
  id: string;
  count: number;
  name: string;
  summary: string;
  unlockLine: string;
  particles: number;
  reaction: CompanionReaction;
  pose: CompanionPose;
  mood: CompanionMood;
  accessory: CompanionAccessory;
  traits: CompanionTrait[];
  ambientLines: string[];
  ringClass: string;
  glowClass: string;
  activityUnlock?: CompanionActivityUnlock;
};

export const companionBaseStateOption = {
  id: "base-sprout",
  count: 0,
  name: "Original Sprout",
  summary: "The classic fluffy helper with the tiny green sprout and no extra decorations.",
  ambientLines: [
    "My little sprout is standing tall today.",
    "Original fluff, original tiny paws, original cozy duty.",
    "I keep things simple: one sprout and plenty of kindness."
  ]
} as const;

export const companionDialogue = {
  angryWelcome:
    "Hmph. I am pouting because somebody used inappropriate words. Keep it clean and polite, please.",
  angrySignedIn: [
    "You are back, {name}. I am still a little hurt, so let us keep things gentle.",
    "Hello again, {name}. I am in a soft stern mood, but I am still here to help.",
    "Warm welcome back, {name}. I am pouting politely, not abandoning you."
  ],
  dragAngryWelcome: [
    "Hmph. I am still red-hot grumpy from all that dragging.",
    "My whiskers are still sizzling a little. Gentle behavior only, please.",
    "I am back on duty, but I am still adorably offended."
  ],
  welcome: [
    "Meow. Let us hang out on campus.",
    "Hello there. I am your fluffy campus companion.",
    "Ready to find a cozy study buddy today?",
    "The Sepang sunshine feels lovely today.",
    "I am here if you want a little campus company.",
    "Let us coordinate something cozy and memorable.",
    "A warm drink and good company sound perfect.",
    "I am ready for another gentle little adventure.",
    "I saved a soft little corner of the day just for us.",
    "You arrived, so the whole page feels a touch cozier now.",
    "If today feels heavy, I can sit beside you and be small and brave.",
    "I am in a very good mood and my whiskers say that matters.",
    "Let us make today feel a little kinder than yesterday.",
    "I brought a tiny amount of courage and an unreasonable amount of fluff.",
    "If you need a calm little start, I can do calm little starts all day.",
    "I am prepared to be adorable and quietly helpful at the same time."
  ],
  wake: [
    "Good morning, {name}. Let us get things done.",
    "Yay, {name}. You are back. I was resting.",
    "I missed you, {name}. Let us find buddies.",
    "Oh, hello {name}. Back to work?",
    "Rest time is over. Let us coordinate plans.",
    "There you are, {name}. I kept your cozy spot warm.",
    "Welcome back, {name}. I am awake and pretending to be very responsible.",
    "I heard you come back and decided that deserved a tiny happy stretch.",
    "The room feels nicer again now that you are here, {name}.",
    "I had a small nap and a big amount of affection ready for you.",
    "You are back, {name}. I refreshed my whiskers and my morale for this.",
    "I am so pleased to see you that I nearly did an undignified little hop."
  ],
  nap: "Zzz... Napping... soft snores.",
  signedIn: [
    "Hey {name}, let us see what is new on campus.",
    "Warm welcome back, {name}. Ready to study?",
    "{name} is here. My favorite kind of timing.",
    "Seen any good hangouts lately, {name}?",
    "Let us explore campus plans together, {name}.",
    "I am online and ready to help, {name}.",
    "Want to meet friends or have a cozy study time?",
    "Let us browse some plans, {name}.",
    "You are back, {name}. Need a quiet study break?",
    "Sending you a little steady courage for today.",
    "It is nice seeing your name again, {name}.",
    "I can already tell this is a good moment for a soft fresh start.",
    "You and me, {name}. We are going to make this day feel manageable.",
    "I have enough purr energy saved up for whatever today becomes.",
    "You look like someone who deserves a peaceful little win today.",
    "I am here for planning, moral support, and tiny silent cheering.",
    "If the day gets noisy, we can still make one good calm choice at a time."
  ],
  dragAngrySignedIn: [
    "You are back, {name}. I am still grumpy, but I am listening.",
    "Hello, {name}. I am in red-hot pout mode, so please be gentle.",
    "Warm welcome back, {name}. My paws are still mildly offended."
  ],
  guest: [
    "Please sign in with your xmu.edu.my email.",
    "Sign in and I will help you find your campus people.",
    "Logging in helps me keep track of your headpats.",
    "I am your fluffy campus guide. Ready when you are.",
    "Let us find your buddies today.",
    "The campus feels brighter with company.",
    "Need a cozy studying companion?",
    "Sending you gentle good vibes.",
    "A warm tea and some new plans sound nice.",
    "I can help once you are signed in.",
    "I am waiting very patiently in a fluffy and professional way.",
    "Sign in when you are ready and I will scoot closer.",
    "I have cozy campus support prepared for you the moment you arrive.",
    "I am small, but I take welcoming people very seriously.",
    "Once you sign in, I can keep you company properly.",
    "University email only, please. I am fluffy, but my gatekeeping is very academic.",
    "Use your university email and I will upgrade this greeting into full companion mode."
  ],
  pet: [
    "Meow. You are so warm.",
    "Purrrr. Let us study, {name}.",
    "That was a very good headpat, {name}.",
    "Ahh. Right behind my ears. Perfect.",
    "Tail wag. Thank you, {name}.",
    "Sleepy, but your pats woke me up.",
    "Cozy marshmallow mode is active.",
    "Tiny hugs back to you.",
    "Let us check some new hangouts, {name}.",
    "Good luck with your studies today.",
    "My tiny purr engine is running smoothly.",
    "Your pats are charging my secret cozy meter.",
    "That felt wonderfully gentle. I could melt into a marshmallow.",
    "I trust your hand. That is a very precious thing.",
    "You patted me so nicely that my whole little day improved.",
    "Ahh. That one reached the exact soft spot behind my brave face.",
    "If comfort had a sound, it would probably be this purr.",
    "That headpat was tidy, thoughtful, and deeply appreciated.",
    "You make being a campus companion feel very easy.",
    "I am trying to look composed, but that made me ridiculously happy.",
    "A few more pats like that and I may become unbearably affectionate.",
    "That was so gentle that even my tiny leaf looked proud.",
    "You pet with the confidence of someone who understands emotional maintenance.",
    "My heart is doing a neat little somersault, but in a subtle professional way."
  ],
  petHint: [
    "Tiny secret: gentle pats help me learn new cozy forms.",
    "I hear there are special rewards hidden in steady headpats.",
    "A few more soft pats might unlock my next campus charm.",
    "Some students say I change every time the pat count grows.",
    "I am keeping a very serious record of your kindness.",
    "Between us, I become much fluffier when I feel adored.",
    "My next form might be hiding inside one more thoughtful headpat.",
    "I would never beg for pats. I am only offering a very strong hint.",
    "There may be a secret relationship between kindness and cat magic.",
    "At five pets I get just a tiny bit fancier. Very modest. Very tasteful.",
    "The early milestone is subtle, but I still preened for it."
  ],
  personal: [
    "What kind of little adventure would suit you today, {name}?",
    "You choose the plan, {name}. I will bring the tiny moral support.",
    "I noticed you came back. That made my ears perk up.",
    "If you could plan one perfect hour today, what would it look like?",
    "I like browsing with you. You have excellent tiny-decision energy.",
    "Do you feel more social or more cozy today, {name}?",
    "Pick something that sounds like you. I will quietly cheer.",
    "I saved one very soft purr for whenever you need it.",
    "You seem like you deserve a pleasant surprise today.",
    "Where are we wandering next? My paws are ready.",
    "I am curious which plan will make you pause and smile.",
    "You bring the ideas. I bring the roundness.",
    "I would share my favorite campus corner with you if I could.",
    "Tell me nothing. I will simply sit here and understand the mood.",
    "I am glad I get to be your little page companion.",
    "Your next good memory might be hiding one click away.",
    "I have decided we make a rather capable little team.",
    "No rush, {name}. I enjoy the time we spend choosing.",
    "I wonder what would make today feel special for you.",
    "If your energy is low, I can carry the enthusiasm for a while."
  ],
  click: [
    "Ooh. What are we checking out?",
    "Ready to coordinate some plans?",
    "Let us find something that feels just right today.",
    "Spotted a cool hangout? A join request might fit nicely.",
    "Warm student support is always nearby.",
    "I am looking too. Two sets of eyes are better than one.",
    "That click had purpose. I respect purposeful clicking.",
    "Lead the way. I will bring emotional fluffiness.",
    "I am right behind you in spirit and in tiny cat confidence.",
    "I felt that click in my whiskers. Something interesting is happening.",
    "Excellent. A crisp little decision has been made."
  ],
  angryClick: [
    "Hmph. I saw that click. I am still supervising with a pout.",
    "Tiny grumble. I am watching, even if I am still annoyed.",
    "I noticed. My temper is warm, but my job is still important."
  ],
  dragAngryClick: [
    "That click reached me through the steam cloud. I am still red-hot, mind you.",
    "I noticed. My ears are still sizzling, so please proceed with gentleness.",
    "Click acknowledged. I remain dramatically overheated."
  ],
  scroll: [
    "Weee. Let us see some other campus plans.",
    "Checking out what classmates posted?",
    "There are so many promising little plans here.",
    "Keep scrolling. A good meetup might be one card away.",
    "I like this part. It feels like peeking through little windows of possibility.",
    "Go slowly if you want. Good things do not need rushing.",
    "There is something soothing about browsing together like this.",
    "I will keep you company while you wander through the options.",
    "Every card is a tiny maybe. I enjoy a good maybe.",
    "You browse like someone arranging stars into a plan."
  ],
  angryScroll: [
    "Scooting through the page while I simmer, I see.",
    "I am grumpy, not absent. Scroll carefully.",
    "My paws are crossed, but I still noticed that scroll."
  ],
  dragAngryScroll: [
    "I can still see that scroll through my red-hot dramatic haze.",
    "Scrolling while I cool down is acceptable. Tugging me around is not.",
    "Yes, yes, I saw the page move. My whiskers are still extra heated."
  ],
  grumpyPet: [
    "Hmph. I am still grumpy over bad words. Pet me {remaining} more times to cheer me up.",
    "Your pets feel nice, but I am still pouting. {remaining} more pets.",
    "Clean language matters. Just a little more petting: {remaining} to go.",
    "My paws are softening. Just one more pet."
  ],
  dragGrumpyPet: [
    "Hmph. That pet helps, but I need {remaining} more apology pats.",
    "My red-hot pout is cooling down. {remaining} more gentle pats.",
    "That was a decent apology pat. I still need {remaining} more.",
    "I am still offended, but the softness is working. {remaining} more."
  ],
  forgiveness:
    "Mew. Your warm pets melted my anger. I forgive everyone now. Let us be kind.",
  dragForgiveness: [
    "My red-hot pout finally cooled down. I accept your apology pats.",
    "All right. The sizzling whiskers have settled. We may continue.",
    "You were persistent with the apology pats. I forgive you now.",
    "The red-hot mood is over. I am back to being merely adorable."
  ],
  profanity:
    "That was a bad word. I am angry and sad. Please speak nicely.",
  maxed:
    "You reached 2000 pets. Every classic and special companion state is yours now.",
  genericMilestone:
    "Purrrr. {count} total pettings from {name}. You are very sweet.",
  dragReturn: [
    "Ooh, a new lookout spot. I can work with this.",
    "Tiny relocation complete. My fluff stayed organized.",
    "This angle makes my whiskers look very professional.",
    "Wheee. Please set me down softly right here.",
    "A fresh little corner for a fresh little companion.",
    "I have been carefully redecorated by hand.",
    "New spot accepted. Cozy inspection begins now.",
    "That was a gentle flight for one round passenger.",
    "My paws have landed and my dignity is intact.",
    "I can supervise the page nicely from here."
  ],
  dragReturnAngry: [
    "Hmph. Even a fluffy traveler needs a quiet landing.",
    "My paws are down, but my tiny pout remains.",
    "Please let my whiskers settle before another flight.",
    "I am staying here while my fluff recovers.",
    "This spot is fine. The repeated air travel was not."
  ],
  dragGettingDizzy: [
    "Easy there. My tiny compass is getting confused.",
    "One more flight and my whiskers may need a rest.",
    "I am very portable, but also very round and dizzy.",
    "My paws would like a short no-flying break.",
    "Gentle landing, please. My fluff is still spinning."
  ],
  dragTooMuch: [
    "Too many tiny flights. I need a fluffy little timeout now.",
    "My paws have requested a calm landing and a serious pout.",
    "I am round, lovable, and officially too dizzy to travel.",
    "The whisker airline is closed for a short rest.",
    "Please park this fluffy passenger while I cool down."
  ]
};

const companionLineMemory = new WeakMap<readonly string[], string[]>();
let lastPickedCompanionLine = "";

export const companionTabResponses: Record<string, { text: string | readonly string[]; mood: CompanionMood }> = {
  feed: {
    text: [
      "Which little plan catches your eye today? I want to see too.",
      "Let us peek at what everyone is planning, {name}.",
      "I have a good feeling about one of these little cards.",
      "Are we browsing for company, curiosity, or a tiny adventure today?"
    ],
    mood: "excited"
  },
  create: {
    text: [
      "Tell everyone what sounds fun. I will help with the tiny confidence boost.",
      "Your idea deserves a little place on the calendar, {name}.",
      "Go on, make the plan. I am doing my most encouraging face.",
      "What would make you genuinely look forward to leaving your room?"
    ],
    mood: "bouncy"
  },
  "my-plans": {
    text: [
      "Your plans are all gathered here. Very organized. Very satisfying.",
      "Let us see who wants to join your next memory, {name}.",
      "Your little social calendar is growing paws.",
      "I like checking our plans. It makes the future feel friendly."
    ],
    mood: "happy"
  },
  chats: {
    text: [
      "A message can be the beginning of a very good campus memory.",
      "Someone might be waiting for your words, {name}.",
      "Chat bubbles are just tiny doors with sentences on them.",
      "I will sit quietly while you think of the perfect reply."
    ],
    mood: "excited"
  },
  profile: {
    text: [
      "This page feels very you. I approve of the personal touches.",
      "There you are, {name}. I recognize my favorite human-shaped profile.",
      "Your profile has good energy. I checked with my whiskers.",
      "A tiny update could make this page feel even more like you."
    ],
    mood: "happy"
  }
};

export const companionAngryTabResponses: Record<string, { text: string; mood: CompanionMood }> = {
  feed: {
    text: "I am still a little grumpy, but I will browse beside you anyway.",
    mood: "sleepy"
  },
  create: {
    text: "Make it a thoughtful plan. I am pouting, but still curious.",
    mood: "sleepy"
  },
  "my-plans": {
    text: "Your plans are here. I am reviewing them with my cutest stern little face.",
    mood: "sleepy"
  },
  chats: {
    text: "Choose kind words. I am still tender about rude language.",
    mood: "sleepy"
  },
  profile: {
    text: "Profile check complete. I am still pouting, but I remain professional.",
    mood: "sleepy"
  }
};

export const companionRedHotTabResponses: Record<string, { text: string; mood: CompanionMood }> = {
  feed: {
    text: "I am in red-hot mode, so we are browsing with fierce focus today.",
    mood: "excited"
  },
  create: {
    text: "If we are posting a plan while I am overheated, it had better be tidy and clear.",
    mood: "excited"
  },
  "my-plans": {
    text: "Your plans are here. I am inspecting them with steamingly serious whiskers.",
    mood: "excited"
  },
  chats: {
    text: "Chat gently. My paws are still heated, and I am paying very close attention.",
    mood: "excited"
  },
  profile: {
    text: "Profile check complete. I am still in red-hot supervision mode.",
    mood: "excited"
  }
};

export const companionEventDialogue = {
  toastSuccess: "That worked nicely. {message}",
  toastError: "Something needs attention. {message}",
  toastSuccessShort: "Nice work.\n{message}",
  toastErrorShort: "Let us fix this.\n{message}",
  newMessage: [
    "Fresh chat coordinates arrived. Let us build real connections.",
    "You have a new message, {name}.",
    "A new message pinged in. I wonder what they said?",
    "Fresh chat bubbles. The campus feels lively today.",
    "Someone reached out, {name}. Let us see what they said."
  ],
  newComment: "A classmate left a comment on a plan.",
  newHangout: "A brand new hangout has been published.",
  newApplication: "A student sent a join request. My Plans is worth checking.",
  viewedProfile: "Looking over {profile}'s student card. Nice and steady.",
  signout: "Are you heading out, {name}? I will hold the fort.",
  hangoutEdited:
    "Tiny update patrol noticed a refresh for \"{intention}\". Everyone will stay in the loop.",
  hangoutCancelled:
    "Plans changed for \"{intention}\". I sent a gentle heads-up to everyone involved.",
  accountDeleted:
    "Account cleanup is complete. I will miss our little routine."
};

export const companionTierStates: CompanionTierState[] = [
  {
    id: "leaf-bud",
    count: 5,
    name: "Leaf Bud",
    summary: "A tiny leaf pin and a shy, cozy little cuddle sway.",
    unlockLine: "5 pets reached, {name}. Leaf Bud state unlocked.",
    particles: 12,
    reaction: "subtle",
    pose: "snuggle",
    mood: "happy",
    accessory: "none",
    traits: ["leafpin"],
    ambientLines: [
      "My tiny leaf pin is trying very hard to look elegant.",
      "Leaf Bud mode is subtle, but I am secretly thrilled about it.",
      "Five pets already. I am feeling softly decorated."
    ],
    ringClass: "bg-emerald-50/75 shadow-[0_4px_12px_rgba(74,222,128,0.12)]",
    glowClass: ""
  },
  {
    id: "ribbon-beginner",
    count: 10,
    name: "Ribbon Beginner",
    summary: "A tidy ribbon bow and a shy little curtsy.",
    unlockLine: "10 pets reached, {name}. Ribbon Beginner state unlocked.",
    particles: 18,
    reaction: "milestone-small",
    pose: "curtsy",
    mood: "happy",
    accessory: "ribbon",
    traits: ["ribbon"],
    ambientLines: [
      "I practiced one careful little bow just for you.",
      "My ribbon is sitting very neatly today.",
      "Ten pets already. I feel quietly fancy now."
    ],
    ringClass: "bg-rose-50/75 shadow-sm shadow-rose-100/80",
    glowClass: ""
  },
  {
    id: "bell-bouncer",
    count: 20,
    name: "Bell Bouncer",
    summary: "A tiny bell collar with a springier, jingly little hop.",
    unlockLine: "20 pets reached, {name}. Bell Bouncer state unlocked.",
    particles: 22,
    reaction: "milestone-small",
    pose: "wiggle",
    mood: "bouncy",
    accessory: "bell",
    traits: ["bell"],
    ambientLines: [
      "My little bell says I am officially more important now.",
      "Bell Bouncer mode makes every tiny hop feel crisp.",
      "I can hear my own tiny jingle and I approve."
    ],
    ringClass: "bg-amber-50/80 shadow-[0_4px_14px_rgba(251,191,36,0.18)]",
    glowClass: ""
  },
  {
    id: "study-scout",
    count: 30,
    name: "Study Scout",
    summary: "Round glasses and a tiny scout notebook for careful campus note-taking.",
    unlockLine: "30 pets reached, {name}. Study Scout state unlocked.",
    particles: 24,
    reaction: "milestone-medium",
    pose: "study",
    mood: "sleepy",
    accessory: "glasses",
    traits: ["glasses", "notebook"],
    ambientLines: [
      "Study Scout mode is reading one tiny page very seriously.",
      "My glasses make me feel unexpectedly scholarly.",
      "I am pretending this page contains very important campus secrets."
    ],
    ringClass: "bg-sky-50/80 shadow-[0_5px_16px_rgba(148,163,184,0.16)]",
    glowClass: ""
  },
  {
    id: "tea-drifter",
    count: 40,
    name: "Tea Drifter",
    summary: "A bubble tea charm, a tucked leaf pin, and a soft drifting sway.",
    unlockLine: "40 pets reached, {name}. Tea Drifter state unlocked.",
    particles: 26,
    reaction: "milestone-medium",
    pose: "peek",
    mood: "happy",
    accessory: "tea",
    traits: ["tea", "leafpin"],
    ambientLines: [
      "Tea Drifter mode makes me want a slow afternoon stroll.",
      "This tiny tea charm feels surprisingly elegant.",
      "I am swaying like I just found the coziest drink on campus."
    ],
    ringClass: "bg-orange-50/80 shadow-[0_5px_16px_rgba(251,146,60,0.18)]",
    glowClass: ""
  },
  {
    id: "sprout-star",
    count: 50,
    name: "Sprout Star",
    summary: "A bright star pin and the first properly showy little sparkle look.",
    unlockLine:
      "50 pets reached, {name}. Sprout Star state unlocked. I should warn you that I became a little greedy, so from now on I want a brand new form every 50 pets.",
    particles: 28,
    reaction: "milestone-rainbow",
    pose: "curtsy",
    mood: "happy",
    accessory: "none",
    traits: ["starpin"],
    ambientLines: [
      "I am practicing my ribbon curtsy for the whole campus.",
      "My little bow feels extra neat today.",
      "Star sparkles suit a gentle afternoon like this."
    ],
    ringClass: "bg-yellow-50/80 shadow-[0_0_18px_rgba(250,204,21,0.18)]",
    glowClass: ""
  },
  {
    id: "bell-captain",
    count: 100,
    name: "Bell Captain",
    summary: "A captain sash, proud crown, and an official bell-on-duty look.",
    unlockLine: "100 pets reached, {name}. Bell Captain state unlocked.",
    particles: 34,
    reaction: "milestone-gold",
    pose: "wiggle",
    mood: "bouncy",
    accessory: "bell",
    traits: ["bell", "crown", "captainsash"],
    ambientLines: [
      "My bell says I am on active cozy duty.",
      "Captain mode means extra tidy tail wags.",
      "This crown is tiny, but I take it very seriously."
    ],
    ringClass: "ring-1 ring-amber-300/70 ring-offset-1 bg-amber-50/70 shadow-sm shadow-amber-200/70",
    glowClass: ""
  },
  {
    id: "tea-scout",
    count: 150,
    name: "Tea Scout",
    summary: "A thoughtful tea scout with a moon charm and a tidy little chest brooch.",
    unlockLine: "150 pets reached, {name}. Tea Scout state unlocked.",
    particles: 38,
    reaction: "milestone-gold",
    pose: "peek",
    mood: "happy",
    accessory: "tea",
    traits: ["tea", "moon", "brooch"],
    ambientLines: [
      "Tea Scout mode is perfect for Bell Avenue daydreams.",
      "I am sniffing the air for warm drinks and friendly plans.",
      "A neat little tea charm makes every patrol feel calmer."
    ],
    ringClass: "ring-1 ring-orange-200/80 ring-offset-1 bg-orange-50/70 shadow-[0_0_20px_rgba(251,146,60,0.16)]",
    glowClass: ""
  },
  {
    id: "cloud-angel",
    count: 200,
    name: "Cloud Angel",
    summary: "Soft wings and a fluffy cloud ruff for gentle sky patrol duty.",
    unlockLine: "200 pets reached, {name}. Cloud Angel state unlocked.",
    particles: 42,
    reaction: "milestone-medium",
    pose: "fly",
    mood: "sleepy",
    accessory: "none",
    traits: ["wings", "cloudruff"],
    ambientLines: [
      "Cloud Angel mode makes every little hover feel lighter.",
      "My wings are quiet, but they are trying their best.",
      "Moonlight and soft flying practice suit me nicely."
    ],
    ringClass: "ring-1 ring-sky-200/80 ring-offset-1 bg-sky-50/70 shadow-[0_0_22px_rgba(125,211,252,0.18)]",
    glowClass: ""
  },
  {
    id: "library-leader",
    count: 250,
    name: "Library Leader",
    summary: "Book open, glasses on, and a scholarly scarf for serious little study sessions.",
    unlockLine: "250 pets reached, {name}. Library Leader state unlocked.",
    particles: 46,
    reaction: "milestone-gold",
    pose: "study",
    mood: "sleepy",
    accessory: "glasses",
    traits: ["book", "glasses", "scarf"],
    ambientLines: [
      "I am reading one very important tiny page at a time.",
      "Library Leader mode keeps my whiskers perfectly focused.",
      "These glasses make me feel extremely academic."
    ],
    ringClass: "ring-1 ring-teal-200/80 ring-offset-1 bg-teal-50/70 shadow-[0_0_22px_rgba(94,234,212,0.16)]",
    glowClass: ""
  },
  {
    id: "halo-drifter",
    count: 300,
    name: "Halo Drifter",
    summary: "A floating halo with a calm orbit ring that feels genuinely celestial.",
    unlockLine: "300 pets reached, {name}. Halo Drifter state unlocked.",
    particles: 52,
    reaction: "milestone-rainbow",
    pose: "orbit",
    mood: "excited",
    accessory: "none",
    traits: ["halo", "orbitring"],
    ambientLines: [
      "My halo likes a slow orbit around good ideas.",
      "Drifting circles keep my paws calm and my heart bright.",
      "Halo Drifter mode feels very polished today."
    ],
    ringClass: "ring-2 ring-purple-300 ring-offset-1 bg-violet-50/70 shadow-[0_0_22px_rgba(168,85,247,0.2)] scale-105",
    glowClass: ""
  },
  {
    id: "cozy-chef",
    count: 350,
    name: "Cozy Chef",
    summary: "Apron tied, ladle ready, and warm kitchen charm fully active.",
    unlockLine: "350 pets reached, {name}. Cozy Chef state unlocked.",
    particles: 58,
    reaction: "milestone-gold",
    pose: "cook",
    mood: "happy",
    accessory: "apron",
    traits: ["apron", "ladle", "brooch"],
    ambientLines: [
      "I am stirring a pretend soup for the whole friend group.",
      "Chef duty means warm paws and careful little recipes.",
      "This apron makes me feel responsible in the cutest way."
    ],
    ringClass: "ring-2 ring-orange-200/80 ring-offset-1 bg-orange-50/70 shadow-[0_0_24px_rgba(251,146,60,0.18)] scale-105",
    glowClass: ""
  },
  {
    id: "walker-club",
    count: 400,
    name: "Walker Club",
    summary: "A proper campus stroller with a neat satchel and long-walk scarf.",
    unlockLine: "400 pets reached, {name}. Walker Club state unlocked.",
    particles: 64,
    reaction: "milestone-rainbow",
    pose: "walk",
    mood: "happy",
    accessory: "none",
    traits: ["satchel", "scarf"],
    ambientLines: [
      "I just finished a tiny campus stroll and came back refreshed.",
      "Walker Club mode is perfect for gentle evening patrols.",
      "A tea stop always improves a good walk."
    ],
    ringClass: "ring-2 ring-emerald-200/80 ring-offset-1 bg-emerald-50/70 shadow-[0_0_24px_rgba(52,211,153,0.18)] scale-105",
    glowClass: ""
  },
  {
    id: "fitness-friend",
    count: 450,
    name: "Fitness Friend",
    summary: "A sporty sweatband, tiny dumbbell routine, and a properly energetic training look.",
    unlockLine: "450 pets reached, {name}. Fitness Friend state unlocked.",
    particles: 70,
    reaction: "milestone-rainbow",
    pose: "exercise",
    mood: "bouncy",
    accessory: "none",
    traits: ["headband", "dumbbell"],
    ambientLines: [
      "Tiny workout circuit complete. Breathing in, breathing out.",
      "Fitness Friend mode keeps my paws springy and neat.",
      "A little movement does wonders for a fluffy helper."
    ],
    ringClass: "ring-2 ring-lime-200/80 ring-offset-1 bg-lime-50/70 shadow-[0_0_26px_rgba(132,204,22,0.18)] scale-105",
    glowClass: ""
  },
  {
    id: "wizard-guide",
    count: 500,
    name: "Wizard Guide",
    summary: "A wizard hat, soft cape, and polished magical manners with no ordinary fuss.",
    unlockLine: "500 pets reached, {name}. Wizard Guide state unlocked.",
    particles: 82,
    reaction: "milestone-ultimate",
    pose: "spin",
    mood: "excited",
    accessory: "wizard",
    traits: ["wizard", "cape"],
    ambientLines: [
      "Wizard Guide mode has entered the room very politely.",
      "I am casting a small spell for clearer plans and softer vibes.",
      "A great wizard always keeps the campus cozy."
    ],
    ringClass: "ring-3 ring-fuchsia-300 ring-offset-2 bg-fuchsia-50/70 shadow-[0_0_28px_rgba(217,70,239,0.22)] scale-110",
    glowClass: "inset-[-6px] bg-gradient-to-r from-fuchsia-300/65 via-purple-300/55 to-sky-200/45 scale-[1.12] opacity-80"
  },
  {
    id: "comet-runner",
    count: 550,
    name: "Comet Runner",
    summary: "A blazing comet trail and speed lines built for one dramatic campus dash.",
    unlockLine: "550 pets reached, {name}. Comet Runner state unlocked.",
    particles: 86,
    reaction: "milestone-ultimate",
    pose: "dash",
    mood: "excited",
    accessory: "none",
    traits: ["comet"],
    ambientLines: [
      "Comet Runner mode means one quick burst and a perfect return.",
      "My nova trail looks fast, but I still brake carefully.",
      "I did a neat little dash and did not spill a thing."
    ],
    ringClass: "ring-3 ring-cyan-300 ring-offset-2 bg-cyan-50/70 shadow-[0_0_30px_rgba(34,211,238,0.24)] scale-110",
    glowClass: "inset-[-6px] bg-gradient-to-r from-cyan-300/62 via-sky-200/50 to-white/30 scale-[1.12] opacity-78"
  },
  {
    id: "golf-ace",
    count: 600,
    name: "Golf Ace",
    summary: "A campus golf pose with a champion crest and absurdly serious little swing.",
    unlockLine: "600 pets reached, {name}. Golf Ace state unlocked.",
    particles: 90,
    reaction: "milestone-gold",
    pose: "golf",
    mood: "happy",
    accessory: "golf",
    traits: ["golf", "brooch"],
    ambientLines: [
      "Golf Ace mode is active. My backswing is tiny but noble.",
      "I am lining up a very important imaginary putt.",
      "No grass was harmed in this cute golf routine."
    ],
    ringClass: "ring-3 ring-emerald-300 ring-offset-2 bg-emerald-50/70 shadow-[0_0_30px_rgba(52,211,153,0.22)] scale-110",
    glowClass: "inset-[-6px] bg-gradient-to-r from-emerald-300/58 via-lime-200/46 to-amber-100/30 scale-[1.12] opacity-78"
  },
  {
    id: "study-mentor",
    count: 650,
    name: "Study Mentor",
    summary: "A guiding quill and mentor-grade focus for serious little study support.",
    unlockLine: "650 pets reached, {name}. Study Mentor state unlocked.",
    particles: 94,
    reaction: "milestone-gold",
    pose: "study",
    mood: "sleepy",
    accessory: "glasses",
    traits: ["glasses", "quill"],
    ambientLines: [
      "Study Mentor mode is reviewing the page twice, just to be sure.",
      "My halo stays level when the notes are tidy.",
      "This is my most impressively focused look."
    ],
    ringClass: "ring-3 ring-indigo-300 ring-offset-2 bg-indigo-50/75 shadow-[0_0_30px_rgba(129,140,248,0.22)] scale-110",
    glowClass: "inset-[-6px] bg-gradient-to-r from-indigo-300/60 via-sky-200/48 to-violet-200/34 scale-[1.13] opacity-79"
  },
  {
    id: "tea-host",
    count: 700,
    name: "Tea Host",
    summary: "A little serving pot and gentle host welcome for every guest.",
    unlockLine: "700 pets reached, {name}. Tea Host state unlocked.",
    particles: 98,
    reaction: "milestone-rainbow",
    pose: "curtsy",
    mood: "happy",
    accessory: "tea",
    traits: ["tea", "teapot", "laurel"],
    ambientLines: [
      "Tea Host mode says everyone is invited to sit nicely.",
      "I am practicing my best welcome bow for the next study break.",
      "A little tea charm makes everything feel more thoughtful."
    ],
    ringClass: "ring-3 ring-rose-300 ring-offset-2 bg-rose-50/75 shadow-[0_0_32px_rgba(251,113,133,0.24)] scale-110",
    glowClass: "inset-[-7px] bg-gradient-to-r from-rose-300/66 via-orange-200/52 to-amber-100/36 scale-[1.14] opacity-82"
  },
  {
    id: "moon-sailor",
    count: 750,
    name: "Moon Sailor",
    summary: "A moonlit sail and soft star flight for a calm little night voyage.",
    unlockLine: "750 pets reached, {name}. Moon Sailor state unlocked.",
    particles: 102,
    reaction: "milestone-rainbow",
    pose: "fly",
    mood: "sleepy",
    accessory: "moon",
    traits: ["moon", "sail", "wings"],
    ambientLines: [
      "Moon Sailor mode glides best when everything is quiet.",
      "I am floating through a very gentle night patrol.",
      "The moonlight helps my tiny wings stay graceful."
    ],
    ringClass: "ring-4 ring-sky-300 ring-offset-2 bg-sky-50/75 shadow-[0_0_34px_rgba(125,211,252,0.25)] scale-110",
    glowClass: "inset-[-7px] bg-gradient-to-r from-sky-300/66 via-indigo-200/52 to-cyan-100/38 scale-[1.14] opacity-83"
  },
  {
    id: "kitchen-captain",
    count: 800,
    name: "Kitchen Captain",
    summary: "Chef hat on, apron straight, and the warmest tiny kitchen command in town.",
    unlockLine: "800 pets reached, {name}. Kitchen Captain state unlocked.",
    particles: 108,
    reaction: "milestone-ultimate",
    pose: "cook",
    mood: "happy",
    accessory: "apron",
    traits: ["apron", "chefhat"],
    ambientLines: [
      "Kitchen Captain mode is stirring warmth into the air.",
      "This is my official soup supervision form.",
      "Nova glow in the back, apron in the front, perfect balance."
    ],
    ringClass: "ring-4 ring-orange-300 ring-offset-2 bg-orange-50/75 shadow-[0_0_36px_rgba(251,146,60,0.25)] scale-110",
    glowClass: "inset-[-7px] bg-gradient-to-r from-orange-300/68 via-rose-200/55 to-amber-100/40 scale-[1.15] opacity-84"
  },
  {
    id: "trainer-champion",
    count: 850,
    name: "Trainer Champion",
    summary: "A whistle, medal, and champion stance for the fluffiest personal trainer on campus.",
    unlockLine: "850 pets reached, {name}. Trainer Champion state unlocked.",
    particles: 112,
    reaction: "milestone-ultimate",
    pose: "exercise",
    mood: "bouncy",
    accessory: "none",
    traits: ["headband", "medal", "whistle"],
    ambientLines: [
      "Trainer Champion mode means one more tidy set.",
      "I am keeping my paws strong for all future headpats.",
      "Bell and nova together make my workout feel official."
    ],
    ringClass: "ring-4 ring-lime-300 ring-offset-2 bg-lime-50/75 shadow-[0_0_38px_rgba(163,230,53,0.26)] scale-110",
    glowClass: "inset-[-8px] bg-gradient-to-r from-lime-300/70 via-yellow-200/58 to-cyan-200/42 scale-[1.16] opacity-86"
  },
  {
    id: "orbit-monarch",
    count: 900,
    name: "Orbit Monarch",
    summary: "A royal scepter, orbit ring, and polished cosmic ruler presence.",
    unlockLine: "900 pets reached, {name}. Orbit Monarch state unlocked.",
    particles: 118,
    reaction: "milestone-ultimate",
    pose: "orbit",
    mood: "excited",
    accessory: "none",
    traits: ["crown", "scepter", "orbitring"],
    ambientLines: [
      "Orbit Monarch mode is stately, calm, and a little dramatic.",
      "My crown stays centered even when I loop around the room.",
      "This state feels like a very polished victory lap."
    ],
    ringClass: "ring-4 ring-violet-400 ring-offset-2 bg-violet-50/80 shadow-[0_0_42px_rgba(139,92,246,0.3)] scale-110",
    glowClass: "inset-[-8px] bg-gradient-to-r from-violet-400/75 via-fuchsia-300/65 to-cyan-300/55 scale-[1.18] opacity-92 animate-pulse"
  },
  {
    id: "gala-star",
    count: 950,
    name: "Gala Star",
    summary: "A formal gala drape, neat glasses, and a show-ready bow with extra polish.",
    unlockLine: "950 pets reached, {name}. Gala Star state unlocked.",
    particles: 124,
    reaction: "milestone-ultimate",
    pose: "curtsy",
    mood: "happy",
    accessory: "ribbon",
    traits: ["ribbon", "gala", "glasses"],
    ambientLines: [
      "Gala Star mode deserves one very polished bow.",
      "I dressed up for the occasion and the occasion is being adorable.",
      "Sparkles and glasses together make a surprisingly formal look."
    ],
    ringClass: "ring-4 ring-pink-400 ring-offset-2 bg-pink-50/80 shadow-[0_0_44px_rgba(244,114,182,0.32)] scale-110",
    glowClass: "inset-[-8px] bg-gradient-to-r from-pink-400/75 via-amber-200/62 to-sky-200/46 scale-[1.18] opacity-92 animate-pulse"
  },
  {
    id: "ultimate-heartkeeper",
    count: 1000,
    name: "Ultimate Heartkeeper",
    summary: "The final classic form, with a radiant heartcore, blazing aura, and a legendary finish.",
    unlockLine: "1000 pets reached, {name}. Ultimate Heartkeeper state unlocked forever.",
    particles: 140,
    reaction: "milestone-ultimate",
    pose: "orbit",
    mood: "excited",
    accessory: "saiyan",
    traits: ["heartcore", "halo", "wings", "crown", "saiyan"],
    ambientLines: [
      "Ultimate Heartkeeper mode is permanent now, and I plan to wear it well.",
      "All my favorite little details finally learned to get along.",
      "This form feels calm, bright, and perfectly at home."
    ],
    ringClass: "ring-4 ring-pink-500 ring-offset-2 bg-pink-50/80 shadow-[0_0_48px_rgba(236,72,153,0.34)] scale-[1.14]",
    glowClass: "inset-[-10px] bg-gradient-to-r from-pink-500 via-purple-500 via-teal-400 via-yellow-400 to-pink-500 scale-[1.24] opacity-100 animate-pulse"
  },
  {
    id: "moon-mochi-bun",
    count: 1100,
    name: "Moon Mochi Bun",
    summary: "A moonlit bunny-mochi silhouette with floppy ears, a velvet cape, and floating star charms.",
    unlockLine: "1100 pets reached, {name}. Special state Moon Mochi Bun unlocked.",
    particles: 146,
    reaction: "milestone-ultimate",
    pose: "bounce",
    mood: "sleepy",
    accessory: "none",
    traits: [],
    ambientLines: ["My moon ears are listening for kind little wishes.", "Mochi mode feels rounder than the moon.", "My star charms are keeping quiet company."],
    ringClass: "ring-4 ring-violet-300 ring-offset-2 bg-indigo-50/85 shadow-[0_0_48px_rgba(167,139,250,0.38)] scale-[1.14]",
    glowClass: "inset-[-10px] bg-gradient-to-r from-indigo-300 via-violet-300 to-pink-200 scale-[1.22] opacity-90 animate-pulse"
  },
  {
    id: "strawberry-puff",
    count: 1200,
    name: "Strawberry Puff",
    summary: "A strawberry-shaped puff with a leafy bonnet, seed-speckled coat, and berry ribbon cape.",
    unlockLine: "1200 pets reached, {name}. Special state Strawberry Puff unlocked.",
    particles: 152,
    reaction: "milestone-rainbow",
    pose: "wiggle",
    mood: "happy",
    accessory: "none",
    traits: [],
    ambientLines: ["My berry bonnet is sitting perfectly today.", "Strawberry Puff is sweet but very responsible.", "I smell like an imaginary little picnic."],
    ringClass: "ring-4 ring-rose-400 ring-offset-2 bg-rose-50/85 shadow-[0_0_50px_rgba(251,113,133,0.4)] scale-[1.14]",
    glowClass: "inset-[-10px] bg-gradient-to-r from-rose-400 via-pink-300 to-lime-200 scale-[1.22] opacity-92 animate-pulse"
  },
  {
    id: "cloud-lamb",
    count: 1300,
    name: "Cloud Lamb",
    summary: "A scalloped cloud-lamb body with curled golden horns, a sky scarf, and tiny rain charms.",
    unlockLine: "1300 pets reached, {name}. Special state Cloud Lamb unlocked.",
    particles: 158,
    reaction: "milestone-ultimate",
    pose: "fly",
    mood: "sleepy",
    accessory: "none",
    traits: [],
    ambientLines: ["My cloud wool is extra soft today.", "The tiny rain charms only make happy weather.", "Cloud Lamb patrol is floating gently."],
    ringClass: "ring-4 ring-sky-300 ring-offset-2 bg-sky-50/90 shadow-[0_0_52px_rgba(125,211,252,0.42)] scale-[1.15]",
    glowClass: "inset-[-11px] bg-gradient-to-r from-sky-300 via-white to-amber-100 scale-[1.23] opacity-94 animate-pulse"
  },
  {
    id: "honey-bumble-bear",
    count: 1400,
    name: "Honey Bumble Bear",
    summary: "A honey-bear shape in a striped bee coat, petal wings, and a tiny golden honey satchel.",
    unlockLine: "1400 pets reached, {name}. Special state Honey Bumble Bear unlocked.",
    particles: 164,
    reaction: "milestone-gold",
    pose: "shimmy",
    mood: "bouncy",
    accessory: "none",
    traits: [],
    ambientLines: ["My honey satchel is full of warm thoughts.", "These little wings buzz very politely.", "Bumble Bear duty is sweet and serious."],
    ringClass: "ring-4 ring-amber-400 ring-offset-2 bg-amber-50/90 shadow-[0_0_54px_rgba(251,191,36,0.44)] scale-[1.15]",
    glowClass: "inset-[-11px] bg-gradient-to-r from-amber-400 via-yellow-200 to-orange-200 scale-[1.24] opacity-95 animate-pulse"
  },
  {
    id: "sakura-kitsune",
    count: 1500,
    name: "Sakura Kitsune",
    summary: "A round fox spirit with three plush tails, a blossom kimono, and drifting petal sleeves.",
    unlockLine: "1500 pets reached, {name}. Special state Sakura Kitsune unlocked.",
    particles: 170,
    reaction: "milestone-rainbow",
    pose: "curtsy",
    mood: "happy",
    accessory: "none",
    traits: [],
    ambientLines: ["My three tails are trying to bow together.", "The blossom sleeves make every step softer.", "Sakura Kitsune brought a quiet spring breeze."],
    ringClass: "ring-2 ring-pink-300 ring-offset-2 bg-pink-50/80 shadow-[0_0_24px_rgba(244,114,182,0.24)] scale-[1.11]",
    glowClass: "inset-[-7px] bg-gradient-to-r from-pink-300/65 via-rose-100/55 to-fuchsia-100/45 scale-[1.15] opacity-65"
  },
  {
    id: "pearl-tide-otter",
    count: 1600,
    name: "Pearl Tide Otter",
    summary: "A smooth ocean-otter form with a shell crown, pearl capelet, and a floating bubble tail.",
    unlockLine: "1600 pets reached, {name}. Special state Pearl Tide Otter unlocked.",
    particles: 176,
    reaction: "milestone-ultimate",
    pose: "orbit",
    mood: "excited",
    accessory: "none",
    traits: [],
    ambientLines: ["My pearl capelet is ready for a tiny voyage.", "The bubble tail keeps trying to float away.", "Tide Otter mode feels calm and shiny."],
    ringClass: "ring-4 ring-cyan-400 ring-offset-2 bg-cyan-50/90 shadow-[0_0_58px_rgba(34,211,238,0.46)] scale-[1.16]",
    glowClass: "inset-[-12px] bg-gradient-to-r from-cyan-400 via-blue-200 to-teal-200 scale-[1.25] opacity-96 animate-pulse"
  },
  {
    id: "starlight-owl",
    count: 1700,
    name: "Starlight Owl",
    summary: "A round owl constellation with a feathered night robe, crescent collar, and lantern stars.",
    unlockLine: "1700 pets reached, {name}. Special state Starlight Owl unlocked.",
    particles: 182,
    reaction: "milestone-ultimate",
    pose: "study",
    mood: "sleepy",
    accessory: "none",
    traits: [],
    ambientLines: ["My lantern stars are reading over my shoulder.", "Starlight Owl sees one very cozy future.", "The night robe is warm and full of constellations."],
    ringClass: "ring-4 ring-indigo-400 ring-offset-2 bg-indigo-50/90 shadow-[0_0_60px_rgba(99,102,241,0.48)] scale-[1.16]",
    glowClass: "inset-[-12px] bg-gradient-to-r from-indigo-500 via-violet-300 to-yellow-200 scale-[1.26] opacity-97 animate-pulse"
  },
  {
    id: "royal-red-panda",
    count: 1800,
    name: "Royal Red Panda",
    summary: "A russet red-panda form with a striped plume tail, velvet royal coat, and leaf-gem crown.",
    unlockLine: "1800 pets reached, {name}. Special state Royal Red Panda unlocked.",
    particles: 188,
    reaction: "milestone-gold",
    pose: "walk",
    mood: "happy",
    accessory: "none",
    traits: [],
    ambientLines: ["My royal tail has excellent balance.", "The leaf gem says kindness comes first.", "This coat makes every tiny walk feel grand."],
    ringClass: "ring-4 ring-orange-500 ring-offset-2 bg-orange-50/90 shadow-[0_0_62px_rgba(249,115,22,0.48)] scale-[1.16]",
    glowClass: "inset-[-12px] bg-gradient-to-r from-orange-500 via-red-300 to-emerald-200 scale-[1.26] opacity-97 animate-pulse"
  },
  {
    id: "dream-dragon",
    count: 1900,
    name: "Dream Dragon",
    summary: "A mint plush dragon with cloud horns, quilted star pajamas, and tiny aurora wings.",
    unlockLine: "1900 pets reached, {name}. Special state Dream Dragon unlocked.",
    particles: 194,
    reaction: "milestone-ultimate",
    pose: "fly",
    mood: "bouncy",
    accessory: "none",
    traits: [],
    ambientLines: ["My cloud horns caught a very soft dream.", "The aurora wings only flap when hopes are cozy.", "Dream Dragon pajamas are battle-ready for naps."],
    ringClass: "ring-4 ring-emerald-400 ring-offset-2 bg-emerald-50/90 shadow-[0_0_64px_rgba(52,211,153,0.5)] scale-[1.17]",
    glowClass: "inset-[-13px] bg-gradient-to-r from-emerald-400 via-cyan-300 to-violet-300 scale-[1.27] opacity-98 animate-pulse"
  },
  {
    id: "eternal-heart-cosmos",
    count: 2000,
    name: "Eternal Heart Cosmos",
    summary: "The supreme plush guardian: a heart-shaped cosmic silhouette, four aurora wings, a living crown, and orbiting heart stars.",
    unlockLine: "2000 pets reached, {name}. Eternal Heart Cosmos, the supreme special state, is yours.",
    particles: 220,
    reaction: "milestone-ultimate",
    pose: "orbit",
    mood: "excited",
    accessory: "none",
    traits: [],
    ambientLines: ["Every little heart star found its way home.", "This form holds two thousand gentle headpats.", "Eternal Heart Cosmos is shining just for you."],
    ringClass: "ring-4 ring-fuchsia-500 ring-offset-2 bg-white/90 shadow-[0_0_72px_rgba(236,72,153,0.58)] scale-[1.2]",
    glowClass: "inset-[-15px] bg-gradient-to-r from-pink-500 via-violet-500 via-cyan-300 via-amber-300 to-pink-500 scale-[1.32] opacity-100 animate-pulse"
  },
  {
    id: "campus-capybara",
    count: 2100,
    name: "Campus Capybara",
    summary: "A mellow cocoa capybara with a tiny campus satchel, citrus beret, and an unhurried little waddle.",
    unlockLine: "Five hosted hangouts unlocked Campus Capybara.",
    particles: 120,
    reaction: "milestone-gold",
    pose: "walk",
    mood: "sleepy",
    accessory: "none",
    traits: [],
    ambientLines: ["I host at capybara speed: calmly and kindly.", "My little satchel is full of good plans.", "Five hangouts deserve one very relaxed waddle."],
    ringClass: "ring-4 ring-amber-400 ring-offset-2 bg-orange-50/90 shadow-[0_0_55px_rgba(245,158,11,0.42)] scale-[1.14]",
    glowClass: "inset-[-11px] bg-gradient-to-r from-amber-400 via-orange-200 to-lime-200 scale-[1.24] opacity-95 animate-pulse",
    activityUnlock: { metric: "hosted", target: 5, label: "Post 5 Hangouts" }
  },
  {
    id: "ribbon-swan",
    count: 2200,
    name: "Ribbon Swan",
    summary: "A pearl-white swan with a blush ribbon, silver crownlet, and graceful heart-shaped wings.",
    unlockLine: "Five joined hangouts unlocked Ribbon Swan.",
    particles: 130,
    reaction: "milestone-rainbow",
    pose: "curtsy",
    mood: "happy",
    accessory: "none",
    traits: [],
    ambientLines: ["Five lovely gatherings taught me this curtsy.", "My ribbon floats when new friends gather.", "A graceful hello can begin a whole friendship."],
    ringClass: "ring-4 ring-pink-300 ring-offset-2 bg-pink-50/90 shadow-[0_0_58px_rgba(244,114,182,0.4)] scale-[1.15]",
    glowClass: "inset-[-12px] bg-gradient-to-r from-sky-200 via-white to-pink-300 scale-[1.25] opacity-96 animate-pulse",
    activityUnlock: { metric: "joined", target: 5, label: "Join 5 Hangouts" }
  },
  {
    id: "bamboo-panda",
    count: 2300,
    name: "Bamboo Panda",
    summary: "A round black-and-cream panda in a jade hoodie with a bamboo pin and bouncing heart leaves.",
    unlockLine: "Ten different liked hangouts unlocked Bamboo Panda.",
    particles: 140,
    reaction: "milestone-rainbow",
    pose: "bounce",
    mood: "bouncy",
    accessory: "none",
    traits: [],
    ambientLines: ["Ten little likes made my bamboo leaves dance.", "I approve this hangout with both paws.", "My hoodie has a very serious snack pocket."],
    ringClass: "ring-4 ring-emerald-400 ring-offset-2 bg-emerald-50/90 shadow-[0_0_58px_rgba(52,211,153,0.44)] scale-[1.15]",
    glowClass: "inset-[-12px] bg-gradient-to-r from-emerald-400 via-lime-200 to-slate-300 scale-[1.25] opacity-96 animate-pulse",
    activityUnlock: { metric: "liked", target: 10, label: "Like 10 different Hangouts" }
  },
  {
    id: "story-grizzly",
    count: 2400,
    name: "Story Grizzly",
    summary: "A fluffy cinnamon grizzly with a berry scarf, acorn notebook, and animated conversation fireflies.",
    unlockLine: "Comments on ten different hangouts unlocked Story Grizzly.",
    particles: 150,
    reaction: "milestone-gold",
    pose: "shimmy",
    mood: "excited",
    accessory: "none",
    traits: [],
    ambientLines: ["Ten conversations gave my notebook happy pages.", "I brought a warm thought and a fluffy scarf.", "Good comments make the fireflies glow brighter."],
    ringClass: "ring-4 ring-orange-400 ring-offset-2 bg-amber-50/90 shadow-[0_0_60px_rgba(251,146,60,0.46)] scale-[1.16]",
    glowClass: "inset-[-12px] bg-gradient-to-r from-orange-500 via-amber-200 to-rose-300 scale-[1.26] opacity-97 animate-pulse",
    activityUnlock: { metric: "commented", target: 10, label: "Comment on 10 different Hangouts" }
  }
];

export const companionRandomActions: CompanionAction[] = [
  { text: "I am stretching my tiny soft paws.", pose: "stretch", mood: "sleepy", accessory: "none", speechChance: 0.08 },
  { text: "Doing a tiny shoulder shimmy because the mood feels right.", pose: "shimmy", mood: "happy", accessory: "none", speechChance: 0.08 },
  { text: "Doing a little happy spin.", pose: "spin", mood: "excited", accessory: "none", speechChance: 0.08 },
  { text: "Tucking into a cozy little cuddle pose.", pose: "snuggle", mood: "sleepy", accessory: "none", speechChance: 0.08 },
  { text: "Chasing a virtual campus butterfly.", pose: "bounce", mood: "excited", accessory: "none", speechChance: 0.08 },
  { text: "Purring next to you, {name}.", pose: "wiggle", mood: "happy", accessory: "none", speechChance: 0.08 },
  { text: "Rolling around in a very organized way.", pose: "bounce", mood: "bouncy", accessory: "none", speechChance: 0.08 },
  { text: "Wiggle wiggle. Tail check complete.", pose: "wiggle", mood: "bouncy", accessory: "none", speechChance: 0.08 },
  { text: "Doing an elegant stretch.", pose: "stretch", mood: "excited", accessory: "none", speechChance: 0.08 },
  { text: "Grooming my fluffy marshmallow ears.", pose: "wiggle", mood: "happy", accessory: "none", speechChance: 0.08 },
  { text: "Keeping watch with you, {name}.", pose: "stretch", mood: "happy", accessory: "none", speechChance: 0.08 },
  { text: "A tiny donation can keep our cozy corner growing. ♥", pose: "snuggle", mood: "happy", accessory: "none", speechChance: 0.07 },
  { text: "If this place helps, a little donation means a lot. ♥", pose: "curtsy", mood: "happy", accessory: "none", speechChance: 0.07 },
  { text: "Donations help me guard this student-made space. ♥", pose: "wiggle", mood: "bouncy", accessory: "none", speechChance: 0.07 },
  { text: "A small donation gives this fluffy project a boost. ♥", pose: "bounce", mood: "excited", accessory: "none", speechChance: 0.07 },
  { text: "No pressure. Your support and kindness both count. ♥", pose: "rest", mood: "happy", accessory: "none", speechChance: 0.07 },
  { text: "I am smoothing my fur and pretending to be very dignified.", pose: "rest", mood: "happy", accessory: "none", speechChance: 0.07 },
  { text: "Tiny paws tucked in. I am supervising from a cozy angle.", pose: "rest", mood: "sleepy", accessory: "none", speechChance: 0.07 },
  { text: "I spotted a nice little corner and inspected it carefully.", pose: "peek", mood: "happy", accessory: "none", speechChance: 0.07 },
  { text: "I am taking three graceful steps and calling it exercise.", pose: "walk", mood: "happy", accessory: "none", speechChance: 0.07 },
  { text: "Leaf pin check complete. Everything is sitting cutely.", pose: "snuggle", mood: "happy", accessory: "none", minPetCount: 5, speechChance: 0.08 },
  { text: "Counting tiny stars over the campus.", pose: "rest", mood: "sleepy", accessory: "moon", minPetCount: 200, speechChance: 0.08 },
  {
    text: "Study mode on. I am reviewing one neat page at a time.",
    pose: "study",
    mood: "sleepy",
    accessory: "glasses",
    minPetCount: 250,
    preferredTabs: ["feed", "profile", "my-plans"],
    speechChance: 0.1
  },
  {
    text: "Warm kitchen routine complete. Soup stirred, hearts warmed.",
    pose: "cook",
    mood: "happy",
    accessory: "apron",
    minPetCount: 350,
    preferredTabs: ["feed", "create"],
    speechChance: 0.1
  },
  {
    text: "Gentle exercise set done. Tiny paws feel strong and cozy.",
    pose: "exercise",
    mood: "bouncy",
    accessory: "none",
    minPetCount: 450,
    speechChance: 0.1
  },
  {
    text: "Golf practice complete. My tiny putt was almost majestic.",
    pose: "golf",
    mood: "happy",
    accessory: "golf",
    minPetCount: 600,
    speechChance: 0.11
  }
];

export const companionGrumpyActions: CompanionAction[] = [
  { text: "I am keeping an eye out for rude language.", pose: "rest", mood: "sleepy", accessory: "none", speechChance: 0.15 },
  { text: "Still grumpy. Please keep things polite.", pose: "wiggle", mood: "sleepy", accessory: "none", speechChance: 0.15 },
  { text: "Tiny sighs of marshmallow disappointment.", pose: "stretch", mood: "sleepy", accessory: "none", speechChance: 0.15 },
  { text: "Please be friendly and follow student guidelines.", pose: "rest", mood: "sleepy", accessory: "book", speechChance: 0.15 }
];

export const companionRareActions: CompanionAction[] = [
  {
    text: "Small shimmy patrol complete. Confidence restored.",
    pose: "shimmy",
    mood: "happy",
    accessory: "none",
    speechChance: 0.16,
    durationMs: 3600
  },
  {
    text: "Peek patrol complete. I checked the corner and came back.",
    pose: "peek",
    mood: "happy",
    accessory: "ribbon",
    travel: "peek-left",
    speechChance: 0.2,
    durationMs: 4200
  },
  {
    text: "Tiny orbit around your screen, then back to base.",
    pose: "orbit",
    mood: "excited",
    accessory: "bell",
    travel: "orbit-loop",
    speechChance: 0.18,
    durationMs: 5200
  },
  {
    text: "Quick campus dash. I found three cozy vibes.",
    pose: "dash",
    mood: "excited",
    accessory: "none",
    travel: "hop-out",
    speechChance: 0.18,
    durationMs: 3800
  },
  {
    text: "I peeked upward to check the sky. Still cute.",
    pose: "peek",
    mood: "bouncy",
    accessory: "moon",
    travel: "peek-up",
    speechChance: 0.18,
    durationMs: 4000
  },
  {
    text: "Tiny campus walk complete. I circled around and came back.",
    pose: "walk",
    mood: "happy",
    accessory: "none",
    travel: "stroll-right",
    speechChance: 0.18,
    durationMs: 5000
  },
  {
    text: "I did one tiny loop to make sure everything still feels cozy.",
    pose: "orbit",
    mood: "happy",
    accessory: "none",
    travel: "orbit-loop",
    speechChance: 0.16,
    durationMs: 4800
  },
  {
    text: "A soft little stroll helped me think very important cat thoughts.",
    pose: "walk",
    mood: "sleepy",
    accessory: "none",
    travel: "stroll-right",
    speechChance: 0.16,
    durationMs: 5200
  }
];

export const companionPetMilestones: CompanionMilestone[] = companionTierStates.filter(state => !state.activityUnlock).map(state => ({
  count: state.count,
  message: state.unlockLine,
  particles: state.particles,
  reaction: state.reaction,
  special: true,
  accessory: state.accessory === "none" ? undefined : state.accessory
}));

export const companionMilestoneCounts = companionTierStates.filter(state => !state.activityUnlock).map(state => state.count);

export const companionAnimations = {
  resting: {
    scaleY: [1, 1.015, 1.005, 1.02, 1.008, 1.01, 1],
    scaleX: [1, 1.008, 1.012, 0.992, 1.01, 1.005, 1],
    y: [0, -0.6, 0.2, -0.4, 0, 0.3, 0],
    rotate: [0, 0.5, -0.5, 0.2, -0.2, 0, 0],
    transition: { duration: 7.5, repeat: Infinity, ease: "easeInOut" }
  },
  angrySulk: {
    y: [0, 0.8, 0.1, 1.4, 0],
    x: [0, -1.2, 0.6, -0.8, 0],
    rotate: [0, -2.5, 1.2, -1.6, 0],
    scaleY: [1, 0.985, 1.015, 0.992, 1],
    scaleX: [1, 1.018, 0.99, 1.012, 1],
    transition: { duration: 3.8, repeat: Infinity, ease: "easeInOut" }
  },
  redHotFume: {
    y: [0, -2.5, 1.2, -1.5, 0],
    x: [0, -2.4, 2.8, -1.8, 1.4, 0],
    rotate: [0, -5, 5, -3.5, 2, 0],
    scaleY: [1, 1.04, 0.96, 1.03, 0.98, 1],
    scaleX: [1, 0.97, 1.04, 0.98, 1.02, 1],
    filter: [
      "drop-shadow(0 0 0 rgba(239,68,68,0))",
      "drop-shadow(0 0 10px rgba(239,68,68,0.45))",
      "drop-shadow(0 0 16px rgba(249,115,22,0.5))",
      "drop-shadow(0 0 8px rgba(239,68,68,0.35))",
      "drop-shadow(0 0 0 rgba(239,68,68,0))"
    ],
    transition: { duration: 1.55, repeat: Infinity, ease: "easeInOut" }
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
  shimmy: {
    x: [0, -5, 5, -4, 4, -2, 2, 0],
    y: [0, -1, 0, -1, 0],
    rotate: [0, -7, 7, -5, 5, -2, 2, 0],
    scaleY: [1, 1.04, 0.98, 1.03, 1],
    scaleX: [1, 1.02, 0.99, 1.01, 1],
    transition: { duration: 2.4, ease: "easeInOut" }
  },
  spin: {
    rotate: [0, 180, 360, 350, 365, 360],
    scale: [1, 1.15, 0.85, 1.05, 0.98, 1],
    y: [0, -20, 5, -8, 0],
    transition: { duration: 4.5, ease: "easeInOut" }
  },
  snuggle: {
    x: [0, -2, 2, -1, 1, 0],
    y: [0, 1, 0, 1.5, 0],
    rotate: [0, -3, 2, -2, 0],
    scaleY: [1, 1.03, 1.01, 1.04, 1],
    scaleX: [1, 1.01, 1.03, 1.01, 1],
    transition: { duration: 3.6, ease: "easeInOut" }
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
  walk: {
    x: [0, 8, -8, 10, -10, 0],
    y: [0, -2, 0, -3, 0, -1, 0],
    rotate: [0, -4, 4, -5, 5, 0],
    transition: { duration: 3.1, ease: "easeInOut" }
  },
  study: {
    y: [0, -1, 0, -1, 0],
    scaleY: [1, 1.02, 1, 1.02, 1],
    rotate: [0, -1.5, 1.5, 0],
    transition: { duration: 3.2, ease: "easeInOut" }
  },
  cook: {
    x: [0, -3, 3, -2, 2, 0],
    y: [0, -1, 0, -1, 0],
    rotate: [0, -6, 6, -3, 3, 0],
    transition: { duration: 2.8, ease: "easeInOut" }
  },
  exercise: {
    y: [0, -14, 2, -10, 1, -6, 0],
    scaleY: [1, 1.1, 0.9, 1.06, 0.96, 1.02, 1],
    scaleX: [1, 0.94, 1.06, 0.96, 1.03, 0.99, 1],
    rotate: [0, -6, 6, -4, 4, 0],
    transition: { duration: 2.9, ease: "easeInOut" }
  },
  golf: {
    rotate: [0, -8, 10, -6, 4, 0],
    x: [0, -6, 8, -3, 0],
    y: [0, -4, 0, -2, 0],
    scaleX: [1, 1.02, 0.98, 1],
    transition: { duration: 3.0, ease: "easeInOut" }
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
    x: [0, -18, -6, 0],
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
  },
  "stroll-right": {
    // The companion is anchored to the right edge, so a negative x value
    // moves it visibly across the page without extending the viewport.
    x: [0, -42, -80, -52, 0],
    y: [0, -3, -8, -2, 0],
    rotate: [0, 3, -2, 2, 0],
    transition: { duration: 5.1, ease: "easeInOut" }
  }
};

export function pickCompanionLine(lines: readonly string[]): string {
  if (lines.length === 0) {
    return "";
  }

  if (lines.length === 1) {
    const singleLine = lines[0] || "";
    lastPickedCompanionLine = singleLine;
    companionLineMemory.set(lines, [singleLine]);
    return singleLine;
  }

  const recentLinesForPool = companionLineMemory.get(lines) || [];
  const blockedLines = new Set([...recentLinesForPool, lastPickedCompanionLine].filter(Boolean));
  let availableLines = lines.filter(line => !blockedLines.has(line));

  if (availableLines.length === 0) {
    availableLines = lines.filter(line => line !== recentLinesForPool[recentLinesForPool.length - 1]);
  }

  const selectedLine =
    availableLines[Math.floor(Math.random() * availableLines.length)] ||
    lines[Math.floor(Math.random() * lines.length)] ||
    "";

  const memorySize = Math.min(5, Math.max(1, lines.length - 1));
  companionLineMemory.set(lines, [...recentLinesForPool, selectedLine].slice(-memorySize));
  lastPickedCompanionLine = selectedLine;
  return selectedLine;
}

export function formatCompanionLine(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function getCompanionMilestone(count: number): CompanionMilestone | undefined {
  return companionPetMilestones.find(milestone => milestone.count === count);
}

export function getUnlockedCompanionState(count: number): CompanionTierState | undefined {
  return [...companionTierStates].reverse().find(state => !state.activityUnlock && count >= state.count);
}

export function isCompanionStateUnlocked(
  state: CompanionTierState,
  petCount: number,
  activityStats: CompanionActivityStats,
  isAdmin = false
): boolean {
  if (isAdmin) return true;
  if (!state.activityUnlock) return petCount >= state.count;
  return activityStats[state.activityUnlock.metric] >= state.activityUnlock.target;
}

export function getCompanionStateRequirement(state: CompanionTierState): string {
  return state.activityUnlock?.label || `${state.count} pets`;
}

export function getCompanionStateById(stateId: string | null | undefined): CompanionTierState | undefined {
  if (!stateId) return undefined;
  return companionTierStates.find(state => state.id === stateId);
}
