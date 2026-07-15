import React from "react";
import { motion } from "motion/react";

interface SpecialCompanionFormsProps {
  stateId: string;
  isSleeping?: boolean;
}

const SoftFace: React.FC<{ eyeColor?: string; blush?: string; y?: number; isSleeping?: boolean }> = ({
  eyeColor = "#1e293b",
  blush = "#fda4af",
  y = 48,
  isSleeping = false
}) => (
  <g>
    {isSleeping ? (
      <g>
        <motion.path d={`M 30 ${y} Q 36 ${y + 6}, 42 ${y}`} fill="none" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" animate={{ y: [0, 1, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
        <motion.path d={`M 58 ${y} Q 64 ${y + 6}, 70 ${y}`} fill="none" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" animate={{ y: [0, 1, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
      </g>
    ) : (
      <g>
        <motion.ellipse cx="36" cy={y} rx="5" ry="6" fill={eyeColor} animate={{ scaleY: [1, 0.12, 1] }} transition={{ duration: 4.8, repeat: Infinity }} />
        <motion.ellipse cx="64" cy={y} rx="5" ry="6" fill={eyeColor} animate={{ scaleY: [1, 0.12, 1] }} transition={{ duration: 4.8, repeat: Infinity }} />
        <circle cx="34.5" cy={y - 2} r="1.5" fill="white" />
        <circle cx="62.5" cy={y - 2} r="1.5" fill="white" />
      </g>
    )}
    <ellipse cx="25" cy={y + 10} rx="7" ry="3.5" fill={blush} opacity="0.48" />
    <ellipse cx="75" cy={y + 10} rx="7" ry="3.5" fill={blush} opacity="0.48" />
    <path d={`M 46 ${y + 9} Q 50 ${y + 13}, 54 ${y + 9}`} fill="none" stroke={eyeColor} strokeWidth="2" strokeLinecap="round" />
  </g>
);

export const SpecialCompanionForms: React.FC<SpecialCompanionFormsProps> = ({ stateId, isSleeping = false }) => {
  switch (stateId) {
    case "moon-mochi-bun":
      return (
        <motion.g animate={{ y: [1, -3, 1], rotate: [-1.5, 1.5, -1.5] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}>
          <defs>
            <linearGradient id="moonMochiFur" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f5f3ff" /><stop offset="1" stopColor="#c4b5fd" /></linearGradient>
          </defs>
          <motion.ellipse cx="23" cy="21" rx="12" ry="25" fill="#ddd6fe" stroke="#312e81" strokeWidth="2.2" animate={{ rotate: [-8, -14, -8] }} style={{ originX: 0.23, originY: 0.32 }} transition={{ duration: 2.4, repeat: Infinity }} />
          <motion.ellipse cx="77" cy="21" rx="12" ry="25" fill="#ddd6fe" stroke="#312e81" strokeWidth="2.2" animate={{ rotate: [8, 14, 8] }} style={{ originX: 0.77, originY: 0.32 }} transition={{ duration: 2.4, repeat: Infinity }} />
          <ellipse cx="23" cy="21" rx="5" ry="17" fill="#fbcfe8" />
          <ellipse cx="77" cy="21" rx="5" ry="17" fill="#fbcfe8" />
          <path d="M 13 73 Q 9 42, 29 31 Q 50 17, 71 31 Q 91 42, 87 73 Q 78 94, 50 96 Q 22 94, 13 73 Z" fill="url(#moonMochiFur)" stroke="#312e81" strokeWidth="2.5" />
          <path d="M 16 67 Q 50 82, 84 67 L 78 88 Q 50 101, 22 88 Z" fill="#4338ca" opacity="0.9" />
          <path d="M 50 70 L 55 78 L 50 86 L 45 78 Z" fill="#fde68a" stroke="#312e81" strokeWidth="1.3" />
          <SoftFace isSleeping={isSleeping} eyeColor="#312e81" y={49} />
          {[18, 50, 82].map((x, index) => <motion.path key={x} d={`M ${x} ${index === 1 ? 8 : 34} l 2 4 4 1 -4 2 -2 4 -2 -4 -4 -2 4 -1 Z`} fill="#fef08a" animate={{ opacity: [0.35, 1, 0.35], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 1.8 + index * 0.3, repeat: Infinity }} />)}
          <path d="M 44 30 Q 50 20, 56 30 Q 50 36, 44 30 Z" fill="#fef3c7" stroke="#312e81" strokeWidth="1.2" />
        </motion.g>
      );

    case "strawberry-puff":
      return (
        <motion.g animate={{ scaleX: [1, 1.04, 0.98, 1], scaleY: [1, 0.97, 1.04, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
          <defs><linearGradient id="berryFur" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fda4af" /><stop offset="1" stopColor="#fb7185" /></linearGradient></defs>
          <path d="M 50 14 C 73 14, 91 32, 86 59 C 82 81, 65 96, 50 99 C 35 96, 18 81, 14 59 C 9 32, 27 14, 50 14 Z" fill="url(#berryFur)" stroke="#881337" strokeWidth="2.5" />
          <motion.path d="M 50 18 Q 36 6, 24 18 Q 37 21, 40 29 Q 50 21, 60 29 Q 63 21, 76 18 Q 64 6, 50 18 Z" fill="#4ade80" stroke="#14532d" strokeWidth="2" animate={{ rotate: [-3, 3, -3] }} style={{ originX: 0.5, originY: 0.18 }} transition={{ duration: 2.6, repeat: Infinity }} />
          <path d="M 17 65 Q 32 72, 50 67 Q 68 72, 83 65 L 78 86 Q 50 101, 22 86 Z" fill="#fff1f2" opacity="0.95" />
          <path d="M 40 69 Q 50 77, 60 69 L 66 82 Q 50 88, 34 82 Z" fill="#be123c" />
          {[[27,38],[72,36],[22,57],[79,58],[34,78],[66,78]].map(([x,y],i)=><motion.ellipse key={i} cx={x} cy={y} rx="1.5" ry="3" fill="#fef08a" animate={{ rotate: [0, 12, 0] }} transition={{ duration: 1.5+i*0.15, repeat: Infinity }} />)}
          <SoftFace isSleeping={isSleeping} eyeColor="#881337" y={48} />
          <motion.path d="M 82 44 Q 96 50, 83 62" fill="none" stroke="#4ade80" strokeWidth="5" strokeLinecap="round" animate={{ rotate: [-8, 8, -8] }} style={{ originX: 0.82, originY: 0.52 }} transition={{ duration: 1.8, repeat: Infinity }} />
        </motion.g>
      );

    case "cloud-lamb":
      return (
        <motion.g animate={{ y: [2, -4, 2] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
          <path d="M 20 39 C 5 30, 8 14, 24 17 C 29 4, 47 7, 50 18 C 57 5, 76 8, 76 20 C 93 18, 98 35, 86 44 C 97 55, 89 70, 78 69 C 78 88, 60 97, 48 88 C 36 98, 18 87, 22 72 C 4 71, 2 50, 20 39 Z" fill="#f8fafc" stroke="#334155" strokeWidth="2.4" />
          <motion.path d="M 25 35 C 6 31, 8 8, 28 13 C 17 17, 17 29, 29 30" fill="#fde68a" stroke="#92400e" strokeWidth="2.5" animate={{ rotate: [-5, 4, -5] }} style={{ originX: 0.27, originY: 0.3 }} transition={{ duration: 2.3, repeat: Infinity }} />
          <motion.path d="M 75 35 C 94 31, 92 8, 72 13 C 83 17, 83 29, 71 30" fill="#fde68a" stroke="#92400e" strokeWidth="2.5" animate={{ rotate: [5, -4, 5] }} style={{ originX: 0.73, originY: 0.3 }} transition={{ duration: 2.3, repeat: Infinity }} />
          <path d="M 18 62 Q 50 78, 82 62 L 78 76 Q 50 90, 22 76 Z" fill="#7dd3fc" stroke="#075985" strokeWidth="1.8" />
          <SoftFace isSleeping={isSleeping} eyeColor="#334155" blush="#bae6fd" y={47} />
          {[30,50,70].map((x,i)=><motion.g key={x} animate={{ y: [0, 7, 0], opacity: [0.3, 1, 0.3] }} transition={{ duration: 2+i*0.35, repeat: Infinity }}><path d={`M ${x} 78 Q ${x-4} 84 ${x} 89 Q ${x+4} 84 ${x} 78 Z`} fill="#38bdf8" /></motion.g>)}
        </motion.g>
      );

    case "honey-bumble-bear":
      return (
        <motion.g animate={{ rotate: [-2, 2, -2], y: [1, -2, 1] }} transition={{ duration: 1.7, repeat: Infinity }}>
          <motion.ellipse cx="14" cy="55" rx="12" ry="22" fill="#fef3c7" stroke="#92400e" strokeWidth="2" opacity="0.9" animate={{ rotate: [-12, -25, -12] }} style={{ originX: 0.2, originY: 0.55 }} transition={{ duration: 0.8, repeat: Infinity }} />
          <motion.ellipse cx="86" cy="55" rx="12" ry="22" fill="#fef3c7" stroke="#92400e" strokeWidth="2" opacity="0.9" animate={{ rotate: [12, 25, 12] }} style={{ originX: 0.8, originY: 0.55 }} transition={{ duration: 0.8, repeat: Infinity }} />
          <circle cx="27" cy="25" r="13" fill="#fbbf24" stroke="#78350f" strokeWidth="2.5" /><circle cx="73" cy="25" r="13" fill="#fbbf24" stroke="#78350f" strokeWidth="2.5" />
          <path d="M 12 57 Q 13 26, 34 18 Q 50 11, 66 18 Q 87 26, 88 57 Q 87 91, 50 96 Q 13 91, 12 57 Z" fill="#fcd34d" stroke="#78350f" strokeWidth="2.6" />
          <path d="M 14 48 Q 50 61, 86 48 L 87 63 Q 50 74, 13 63 Z" fill="#451a03" /><path d="M 18 72 Q 50 82, 82 72 L 75 91 Q 50 99, 25 91 Z" fill="#451a03" />
          <path d="M 46 12 Q 50 2, 54 12" fill="none" stroke="#78350f" strokeWidth="2" /><circle cx="50" cy="5" r="3" fill="#f59e0b" />
          <SoftFace isSleeping={isSleeping} eyeColor="#451a03" blush="#fb7185" y={43} />
          <motion.path d="M 68 67 Q 88 64, 82 88 Q 70 93, 65 80 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="2" animate={{ rotate: [-3, 5, -3] }} style={{ originX: 0.72, originY: 0.78 }} transition={{ duration: 2, repeat: Infinity }} />
        </motion.g>
      );

    case "sakura-kitsune":
      return (
        <motion.g animate={{ y: [1, -2, 1] }} transition={{ duration: 2.8, repeat: Infinity }}>
          {[20,50,80].map((x,i)=><motion.path key={x} d={`M 48 75 C ${x-25} 62, ${x-23} 35, ${x} 40 C ${x+22} 47, ${x+18} 76, 50 91 Z`} fill={i===1?"#f9a8d4":"#fecdd3"} stroke="#9f1239" strokeWidth="2" animate={{ rotate: [i-2, 5-i, i-2] }} style={{ originX: 0.5, originY: 0.8 }} transition={{ duration: 2+i*0.3, repeat: Infinity }} />)}
          <path d="M 17 40 L 24 10 L 42 28 Q 50 22, 58 28 L 76 10 L 83 40 Q 93 58, 82 79 Q 69 96, 50 95 Q 31 96, 18 79 Q 7 58, 17 40 Z" fill="#fff7ed" stroke="#7f1d1d" strokeWidth="2.6" />
          <path d="M 24 10 L 29 31 L 42 28 Z M 76 10 L 71 31 L 58 28 Z" fill="#fda4af" />
          <path d="M 14 62 Q 50 48, 86 62 L 81 91 Q 50 102, 19 91 Z" fill="#fb7185" opacity="0.9" />
          <path d="M 30 61 L 50 79 L 70 61" fill="none" stroke="#fff7ed" strokeWidth="5" /><path d="M 50 68 L 57 79 L 50 89 L 43 79 Z" fill="#fde68a" />
          <SoftFace isSleeping={isSleeping} eyeColor="#7f1d1d" y={46} />
          {[18,79].map((x,i)=><motion.path key={x} d={`M ${x} 31 q 5 -7 10 0 q -5 7 -10 0 Z`} fill="#f472b6" animate={{ y: [0,5,0], rotate:[0,30,0] }} transition={{ duration: 2.1+i*0.4, repeat: Infinity }} />)}
        </motion.g>
      );

    case "pearl-tide-otter":
      return (
        <motion.g animate={{ rotate: [-1.5, 2, -1.5], y: [2, -3, 2] }} transition={{ duration: 3.4, repeat: Infinity }}>
          <motion.path d="M 76 69 Q 101 56, 94 81 Q 88 96, 69 85" fill="#67e8f9" stroke="#164e63" strokeWidth="3" animate={{ rotate: [-8, 10, -8] }} style={{ originX: 0.75, originY: 0.75 }} transition={{ duration: 1.9, repeat: Infinity }} />
          <ellipse cx="25" cy="28" rx="13" ry="11" fill="#0891b2" stroke="#164e63" strokeWidth="2.5" /><ellipse cx="75" cy="28" rx="13" ry="11" fill="#0891b2" stroke="#164e63" strokeWidth="2.5" />
          <path d="M 13 55 C 13 25, 29 15, 50 15 C 71 15, 87 25, 87 55 C 87 85, 72 97, 50 97 C 28 97, 13 85, 13 55 Z" fill="#22d3ee" stroke="#164e63" strokeWidth="2.7" />
          <ellipse cx="50" cy="59" rx="27" ry="30" fill="#cffafe" opacity="0.92" />
          <path d="M 35 17 Q 50 1, 65 17 L 58 23 L 50 16 L 42 23 Z" fill="#fef3c7" stroke="#164e63" strokeWidth="1.8" /><circle cx="50" cy="12" r="4" fill="#f8fafc" />
          <path d="M 20 72 Q 50 82, 80 72 L 70 91 Q 50 101, 30 91 Z" fill="#0e7490" /><circle cx="34" cy="76" r="3" fill="white" /><circle cx="50" cy="80" r="4" fill="#f8fafc" /><circle cx="66" cy="76" r="3" fill="white" />
          <SoftFace isSleeping={isSleeping} eyeColor="#164e63" blush="#67e8f9" y={48} />
          {[84,91,76].map((x,i)=><motion.circle key={x} cx={x} cy={32+i*10} r={3+i} fill="none" stroke="#a5f3fc" strokeWidth="1.5" animate={{ y: [8,-12,8], opacity:[0,1,0] }} transition={{ duration: 2+i*0.4, repeat: Infinity }} />)}
        </motion.g>
      );

    case "starlight-owl":
      return (
        <motion.g animate={{ y: [1, -3, 1], rotate: [-1, 1, -1] }} transition={{ duration: 3.6, repeat: Infinity }}>
          <path d="M 14 55 Q 11 25, 31 15 L 50 25 L 69 15 Q 89 25, 86 55 Q 91 80, 70 94 L 50 88 L 30 94 Q 9 80, 14 55 Z" fill="#312e81" stroke="#172554" strokeWidth="2.7" />
          <motion.path d="M 16 48 Q 1 58, 17 83 Q 28 75, 31 56 Z" fill="#6366f1" stroke="#172554" strokeWidth="2" animate={{ rotate: [-5,-14,-5] }} style={{ originX: 0.25, originY: 0.58 }} transition={{ duration: 2.2, repeat: Infinity }} />
          <motion.path d="M 84 48 Q 99 58, 83 83 Q 72 75, 69 56 Z" fill="#6366f1" stroke="#172554" strokeWidth="2" animate={{ rotate: [5,14,5] }} style={{ originX: 0.75, originY: 0.58 }} transition={{ duration: 2.2, repeat: Infinity }} />
          <circle cx="34" cy="45" r="14" fill="#e0e7ff" /><circle cx="66" cy="45" r="14" fill="#e0e7ff" />
          <SoftFace isSleeping={isSleeping} eyeColor="#172554" blush="#a5b4fc" y={45} />
          <path d="M 43 58 L 50 64 L 57 58" fill="#fde68a" stroke="#172554" strokeWidth="1.3" />
          <path d="M 22 66 Q 50 76, 78 66 L 72 93 Q 50 101, 28 93 Z" fill="#1e1b4b" />
          <path d="M 39 66 Q 50 55, 61 66 Q 55 73, 50 79 Q 45 73, 39 66 Z" fill="#fef08a" opacity="0.9" />
          {[[29,76],[47,86],[68,75],[74,30],[25,28]].map(([x,y],i)=><motion.circle key={i} cx={x} cy={y} r="1.8" fill="#fef9c3" animate={{ opacity:[0.2,1,0.2] }} transition={{ duration: 1.3+i*0.25, repeat: Infinity }} />)}
        </motion.g>
      );

    case "royal-red-panda":
      return (
        <motion.g animate={{ y: [1, -2, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
          <motion.path d="M 78 69 Q 103 55, 94 88 Q 81 100, 67 87" fill="#ea580c" stroke="#431407" strokeWidth="5" strokeDasharray="8 5" animate={{ rotate: [-10, 12, -10] }} style={{ originX: 0.75, originY: 0.75 }} transition={{ duration: 1.7, repeat: Infinity }} />
          <path d="M 13 48 L 20 17 L 39 30 Q 50 23, 61 30 L 80 17 L 87 48 Q 92 76, 75 91 Q 50 103, 25 91 Q 8 76, 13 48 Z" fill="#f97316" stroke="#431407" strokeWidth="2.8" />
          <path d="M 20 17 L 27 36 L 39 30 Z M 80 17 L 73 36 L 61 30 Z" fill="#431407" />
          <path d="M 18 46 Q 30 34, 43 43 Q 50 51, 57 43 Q 70 34, 82 46 Q 73 66, 50 66 Q 27 66, 18 46 Z" fill="#fff7ed" />
          <SoftFace isSleeping={isSleeping} eyeColor="#431407" blush="#fdba74" y={48} />
          <path d="M 17 68 Q 50 54, 83 68 L 77 94 Q 50 103, 23 94 Z" fill="#7f1d1d" /><path d="M 43 65 L 50 76 L 57 65 L 63 85 L 50 92 L 37 85 Z" fill="#fbbf24" />
          <motion.path d="M 35 25 L 40 9 L 50 17 L 60 9 L 65 25 Z" fill="#fde68a" stroke="#431407" strokeWidth="2" animate={{ rotate: [-3,3,-3] }} style={{ originX: 0.5, originY: 0.22 }} transition={{ duration: 2, repeat: Infinity }} /><path d="M 47 15 L 50 10 L 53 15 L 50 20 Z" fill="#34d399" />
        </motion.g>
      );

    case "dream-dragon":
      return (
        <motion.g animate={{ y: [3, -5, 3], rotate: [-2, 2, -2] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
          <motion.path d="M 20 52 Q -3 43, 7 73 Q 20 84, 31 64 Z" fill="#c4b5fd" stroke="#134e4a" strokeWidth="2.2" animate={{ rotate: [-5,-18,-5] }} style={{ originX: 0.23, originY: 0.58 }} transition={{ duration: 1.2, repeat: Infinity }} />
          <motion.path d="M 80 52 Q 103 43, 93 73 Q 80 84, 69 64 Z" fill="#67e8f9" stroke="#134e4a" strokeWidth="2.2" animate={{ rotate: [5,18,5] }} style={{ originX: 0.77, originY: 0.58 }} transition={{ duration: 1.2, repeat: Infinity }} />
          <path d="M 15 55 Q 14 27, 34 20 Q 50 10, 66 20 Q 86 27, 85 55 Q 90 86, 65 97 Q 50 102, 35 97 Q 10 86, 15 55 Z" fill="#6ee7b7" stroke="#134e4a" strokeWidth="2.7" />
          <path d="M 30 27 Q 24 8, 42 18 L 38 31 Z M 70 27 Q 76 8, 58 18 L 62 31 Z" fill="#ddd6fe" stroke="#134e4a" strokeWidth="2" />
          <path d="M 16 67 Q 50 57, 84 67 L 77 94 Q 50 104, 23 94 Z" fill="#312e81" opacity="0.92" />
          <path d="M 25 71 L 30 77 L 37 75 L 33 82 L 37 88 L 30 86 L 25 92 L 24 84 L 17 81 L 24 78 Z" fill="#fef08a" /><path d="M 63 76 L 67 80 L 72 79 L 69 84 L 72 89 L 66 87 L 62 92 L 62 86 L 56 83 L 62 81 Z" fill="#f9a8d4" />
          <SoftFace isSleeping={isSleeping} eyeColor="#134e4a" blush="#a7f3d0" y={48} />
          <motion.path d="M 80 78 Q 99 83, 86 97" fill="none" stroke="#6ee7b7" strokeWidth="7" strokeLinecap="round" animate={{ rotate:[-8,10,-8] }} style={{ originX:0.8,originY:0.8 }} transition={{duration:1.8,repeat:Infinity}} />
        </motion.g>
      );

    case "eternal-heart-cosmos":
      return (
        <motion.g animate={{ y: [2, -6, 2], scale: [1, 1.04, 1] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}>
          <defs><radialGradient id="cosmosHeart" cx="45%" cy="35%" r="70%"><stop stopColor="#ffffff" /><stop offset="0.3" stopColor="#f9a8d4" /><stop offset="0.65" stopColor="#a78bfa" /><stop offset="1" stopColor="#22d3ee" /></radialGradient></defs>
          {[{d:"M 31 52 Q -6 25, 4 70 Q 15 93, 36 69",c:"#f9a8d4"},{d:"M 69 52 Q 106 25, 96 70 Q 85 93, 64 69",c:"#67e8f9"},{d:"M 31 61 Q 2 55, 14 88 Q 28 100, 40 73",c:"#c4b5fd"},{d:"M 69 61 Q 98 55, 86 88 Q 72 100, 60 73",c:"#fde68a"}].map((w,i)=><motion.path key={i} d={w.d} fill={w.c} stroke="#4c1d95" strokeWidth="2" animate={{ rotate: i%2===0?[-4,-12,-4]:[4,12,4] }} style={{originX:i%2===0?0.35:0.65,originY:0.62}} transition={{duration:1.2+i*0.15,repeat:Infinity}} />)}
          <path d="M 50 97 C 42 87, 12 73, 13 44 C 14 20, 38 12, 50 31 C 62 12, 86 20, 87 44 C 88 73, 58 87, 50 97 Z" fill="url(#cosmosHeart)" stroke="#4c1d95" strokeWidth="3" />
          <motion.path d="M 30 29 L 36 7 L 50 20 L 64 7 L 70 29 L 60 25 L 50 33 L 40 25 Z" fill="#fef08a" stroke="#4c1d95" strokeWidth="2.2" animate={{ y:[0,-3,0],rotate:[-2,2,-2] }} transition={{duration:1.8,repeat:Infinity}} />
          <SoftFace isSleeping={isSleeping} eyeColor="#4c1d95" blush="#fb7185" y={48} />
          <motion.path d="M 37 68 C 37 58, 47 57, 50 64 C 53 57, 63 58, 63 68 C 63 76, 50 84, 50 84 C 50 84, 37 76, 37 68 Z" fill="#ffffff" stroke="#be185d" strokeWidth="1.8" animate={{ scale:[0.9,1.16,0.9] }} style={{originX:0.5,originY:0.7}} transition={{duration:1.1,repeat:Infinity}} />
          {[0,1,2,3].map(i=><motion.g key={i} animate={{ rotate: 360 }} style={{originX:0.5,originY:0.55}} transition={{duration:5+i,repeat:Infinity,ease:"linear"}}><path d={`M ${50+i*3} ${5+i*2} C ${47+i*3} ${1+i*2}, ${42+i*3} ${5+i*2}, ${50+i*3} ${12+i*2} C ${58+i*3} ${5+i*2}, ${53+i*3} ${1+i*2}, ${50+i*3} ${5+i*2} Z`} fill={["#fb7185","#22d3ee","#fde68a","#c4b5fd"][i]} /></motion.g>)}
        </motion.g>
      );

    case "campus-capybara":
      return (
        <motion.g animate={{ x: [-2, 3, -2], y: [1, -1, 1], rotate: [-1.5, 1.5, -1.5] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}>
          <motion.ellipse cx="22" cy="32" rx="13" ry="12" fill="#9a633f" stroke="#572f1d" strokeWidth="2.5" animate={{ rotate: [-4, 5, -4] }} style={{ originX: 0.22, originY: 0.32 }} transition={{ duration: 2.4, repeat: Infinity }} />
          <motion.ellipse cx="78" cy="32" rx="13" ry="12" fill="#9a633f" stroke="#572f1d" strokeWidth="2.5" animate={{ rotate: [4, -5, 4] }} style={{ originX: 0.78, originY: 0.32 }} transition={{ duration: 2.4, repeat: Infinity }} />
          <path d="M 10 59 C 10 28, 28 18, 50 18 C 72 18, 90 28, 90 59 C 90 86, 72 98, 50 98 C 28 98, 10 86, 10 59 Z" fill="#b7794b" stroke="#572f1d" strokeWidth="2.8" />
          <ellipse cx="50" cy="61" rx="23" ry="20" fill="#d9a777" />
          <path d="M 35 22 Q 50 7 65 22 L 59 29 Q 50 23 41 29 Z" fill="#fbbf24" stroke="#572f1d" strokeWidth="2" /><circle cx="50" cy="15" r="5" fill="#fb923c" /><path d="M 50 10 L 54 4" stroke="#65a30d" strokeWidth="2" />
          <SoftFace isSleeping={isSleeping} eyeColor="#572f1d" blush="#fb7185" y={49} />
          <motion.path d="M 66 65 L 88 73 L 77 94 L 58 79 Z" fill="#65a30d" stroke="#365314" strokeWidth="2" animate={{ rotate: [-2, 4, -2] }} style={{ originX: 0.7, originY: 0.72 }} transition={{ duration: 2.2, repeat: Infinity }} /><path d="M 67 66 L 82 82" stroke="#fef3c7" strokeWidth="3" />
        </motion.g>
      );

    case "ribbon-swan":
      return (
        <motion.g animate={{ y: [2, -4, 2], rotate: [-0.8, 0.8, -0.8] }} transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}>
          <motion.ellipse cx="50" cy="71" rx="39" ry="26" fill="#fff" stroke="#64748b" strokeWidth="2.7" animate={{ scaleX: [1, 1.025, 1], scaleY: [1, 0.98, 1] }} style={{ originX: 0.5, originY: 0.71 }} transition={{ duration: 2.8, repeat: Infinity }} />
          <motion.path d="M 36 67 C 17 47, 4 58, 13 79 C 20 94, 37 89, 46 76 C 39 77, 31 74, 25 68 C 30 69, 34 69, 36 67 Z" fill="#fce7f3" stroke="#f472b6" strokeWidth="2" animate={{ rotate: [-2, -11, -2] }} style={{ originX: 0.34, originY: 0.7 }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />
          <motion.path d="M 64 67 C 83 47, 96 58, 87 79 C 80 94, 63 89, 54 76 C 61 77, 69 74, 75 68 C 70 69, 66 69, 64 67 Z" fill="#fce7f3" stroke="#f472b6" strokeWidth="2" animate={{ rotate: [2, 11, 2] }} style={{ originX: 0.66, originY: 0.7 }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />
          <path d="M 43 69 C 35 57, 35 43, 40 33 C 45 23, 53 19, 62 22 C 70 25, 73 34, 69 42 C 65 50, 55 51, 50 45 C 47 51, 49 61, 57 69 Z" fill="#fff" stroke="#64748b" strokeWidth="2.7" strokeLinejoin="round" />
          <motion.circle cx="60" cy="31" r="14" fill="#fff" stroke="#64748b" strokeWidth="2.4" animate={{ y: [0, -1.5, 0], rotate: [-1.5, 1.5, -1.5] }} style={{ originX: 0.6, originY: 0.31 }} transition={{ duration: 3, repeat: Infinity }} />
          <motion.path d="M 72 31 L 85 36 L 72 41 Q 75 36, 72 31 Z" fill="#fbbf24" stroke="#92400e" strokeWidth="1.6" animate={{ scaleX: [1, 1.08, 1] }} style={{ originX: 0.72, originY: 0.36 }} transition={{ duration: 2, repeat: Infinity }} />
          {isSleeping ? (
            <motion.path d="M 50 30 Q 55 35, 60 30" fill="none" stroke="#334155" strokeWidth="2.6" strokeLinecap="round" animate={{ y: [0, 0.8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
          ) : (
            <g><motion.ellipse cx="55" cy="30" rx="3.2" ry="4.4" fill="#334155" animate={{ scaleY: [1, 0.12, 1] }} transition={{ duration: 4.6, repeat: Infinity }} /><circle cx="54" cy="28.5" r="1" fill="white" /></g>
          )}
          <ellipse cx="65" cy="39" rx="4.5" ry="2.3" fill="#f9a8d4" opacity="0.55" />
          <motion.path d="M 38 51 Q 29 43, 25 51 Q 29 60, 43 54 Q 50 61, 57 54 Q 71 60, 75 51 Q 71 43, 62 51 Q 50 43, 38 51 Z" fill="#fb7185" stroke="#9f1239" strokeWidth="1.8" animate={{ rotate: [-2, 3, -2], scale: [0.97, 1.04, 0.97] }} style={{ originX: 0.5, originY: 0.52 }} transition={{ duration: 2.1, repeat: Infinity }} />
          <path d="M 51 20 L 55 10 L 60 16 L 67 10 L 69 22" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" strokeLinejoin="round" />
          <motion.path d="M 20 91 Q 50 97, 80 91" fill="none" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" animate={{ pathLength: [0.35, 1, 0.35], opacity: [0.25, 0.75, 0.25] }} transition={{ duration: 2.8, repeat: Infinity }} />
        </motion.g>
      );

    case "bamboo-panda":
      return (
        <motion.g animate={{ y: [2, -7, 2], scaleY: [1, 0.96, 1.03, 1] }} transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}>
          <circle cx="24" cy="27" r="15" fill="#1f2937" /><circle cx="76" cy="27" r="15" fill="#1f2937" />
          <path d="M 12 58 Q 12 24, 50 17 Q 88 24, 88 58 Q 88 91, 50 98 Q 12 91, 12 58 Z" fill="#fff7ed" stroke="#1f2937" strokeWidth="2.8" />
          <motion.ellipse cx="34" cy="47" rx="12" ry="15" fill="#1f2937" animate={{ rotate: [15, 20, 15] }} style={{ originX: 0.34, originY: 0.47 }} transition={{ duration: 2, repeat: Infinity }} /><motion.ellipse cx="66" cy="47" rx="12" ry="15" fill="#1f2937" animate={{ rotate: [-15, -20, -15] }} style={{ originX: 0.66, originY: 0.47 }} transition={{ duration: 2, repeat: Infinity }} />
          <SoftFace isSleeping={isSleeping} eyeColor="#111827" blush="#fda4af" y={47} />
          <path d="M 15 69 Q 50 57, 85 69 L 78 95 Q 50 104, 22 95 Z" fill="#34d399" stroke="#065f46" strokeWidth="2" /><path d="M 42 68 L 50 78 L 58 68" fill="none" stroke="#d1fae5" strokeWidth="4" />
          <motion.path d="M 72 35 Q 88 12, 96 20 Q 91 37, 73 43" fill="#84cc16" stroke="#365314" strokeWidth="3" animate={{ rotate: [-8, 10, -8] }} style={{ originX: 0.75, originY: 0.4 }} transition={{ duration: 1.4, repeat: Infinity }} />
          {[28,50,72].map((x, i) => <motion.path key={x} d={`M ${x} 12 C ${x-5} 5, ${x-10} 14, ${x} 22 C ${x+10} 14, ${x+5} 5, ${x} 12 Z`} fill="#4ade80" animate={{ y: [0, -8, 0], rotate: [-8 + i * 7, 12 + i * 5, -8 + i * 7] }} transition={{ duration: 1.8 + i * 0.25, repeat: Infinity }} />)}
        </motion.g>
      );

    case "story-grizzly":
      return (
        <motion.g animate={{ rotate: [-2.5, 2.5, -2.5], y: [1, -3, 1] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}>
          <circle cx="24" cy="28" r="15" fill="#8b5a3c" stroke="#422006" strokeWidth="2.7" /><circle cx="76" cy="28" r="15" fill="#8b5a3c" stroke="#422006" strokeWidth="2.7" />
          <path d="M 10 59 Q 11 24, 50 18 Q 89 24, 90 59 Q 88 91, 50 98 Q 12 91, 10 59 Z" fill="#a96845" stroke="#422006" strokeWidth="2.8" />
          <ellipse cx="50" cy="61" rx="23" ry="20" fill="#d6a273" /><SoftFace isSleeping={isSleeping} eyeColor="#422006" blush="#fb7185" y={48} />
          <motion.path d="M 14 72 Q 50 85, 86 72" fill="none" stroke="#be123c" strokeWidth="8" strokeLinecap="round" animate={{ strokeWidth: [7, 9, 7] }} transition={{ duration: 2, repeat: Infinity }} />
          <motion.g animate={{ rotate: [-3, 4, -3] }} style={{ originX: 0.72, originY: 0.78 }} transition={{ duration: 2.3, repeat: Infinity }}><rect x="58" y="66" width="32" height="27" rx="5" fill="#fef3c7" stroke="#422006" strokeWidth="2" /><path d="M 63 74 H 84 M 63 80 H 80" stroke="#a16207" strokeWidth="2" strokeLinecap="round" /><path d="M 70 65 Q 74 55, 79 65" fill="#92400e" /></motion.g>
          {[[14,43],[87,40],[8,62],[92,65]].map(([x,y],i)=><motion.circle key={i} cx={x} cy={y} r="2.5" fill="#fde047" animate={{ opacity:[0.2,1,0.2], y:[4,-5,4] }} transition={{duration:1.4+i*0.3,repeat:Infinity}} />)}
        </motion.g>
      );

    default:
      return null;
  }
};
