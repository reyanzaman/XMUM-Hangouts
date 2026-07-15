export const PROFILE_AVATARS = [
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
] as const;

export const getRandomProfileAvatarId = () =>
  PROFILE_AVATARS[Math.floor(Math.random() * PROFILE_AVATARS.length)]?.id || "panda";
