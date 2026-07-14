import React from "react";

type ClassicMark =
  | "sprout" | "leaf" | "ribbon" | "bell" | "glasses" | "tea" | "star" | "crown"
  | "wings" | "book" | "halo" | "chef" | "satchel" | "fitness" | "wizard" | "comet"
  | "golf" | "quill" | "teapot" | "sail" | "medal" | "orbit" | "gala" | "heart";

type IconTheme = { bg: string; fur: string; accent: string; mark: ClassicMark };

const classicThemes: Record<string, IconTheme> = {
  "base-sprout": { bg: "#ecfdf5", fur: "#fff7ed", accent: "#4ade80", mark: "sprout" },
  "leaf-bud": { bg: "#ecfdf5", fur: "#f8fafc", accent: "#22c55e", mark: "leaf" },
  "ribbon-beginner": { bg: "#fff1f2", fur: "#fff7ed", accent: "#fb7185", mark: "ribbon" },
  "bell-bouncer": { bg: "#fffbeb", fur: "#fefce8", accent: "#f59e0b", mark: "bell" },
  "study-scout": { bg: "#eff6ff", fur: "#f8fafc", accent: "#60a5fa", mark: "glasses" },
  "tea-drifter": { bg: "#fff7ed", fur: "#fffbeb", accent: "#c08457", mark: "tea" },
  "sprout-star": { bg: "#fefce8", fur: "#fff7ed", accent: "#facc15", mark: "star" },
  "bell-captain": { bg: "#fffbeb", fur: "#fef3c7", accent: "#d97706", mark: "crown" },
  "tea-scout": { bg: "#fff7ed", fur: "#fffbeb", accent: "#fb923c", mark: "tea" },
  "cloud-angel": { bg: "#f0f9ff", fur: "#ffffff", accent: "#7dd3fc", mark: "wings" },
  "library-leader": { bg: "#f0fdfa", fur: "#f8fafc", accent: "#14b8a6", mark: "book" },
  "halo-drifter": { bg: "#f5f3ff", fur: "#faf5ff", accent: "#a78bfa", mark: "halo" },
  "cozy-chef": { bg: "#fff7ed", fur: "#fffaf0", accent: "#fb923c", mark: "chef" },
  "walker-club": { bg: "#ecfdf5", fur: "#fff7ed", accent: "#34d399", mark: "satchel" },
  "fitness-friend": { bg: "#f7fee7", fur: "#f8fafc", accent: "#84cc16", mark: "fitness" },
  "wizard-guide": { bg: "#fdf4ff", fur: "#faf5ff", accent: "#c026d3", mark: "wizard" },
  "comet-runner": { bg: "#ecfeff", fur: "#f8fafc", accent: "#06b6d4", mark: "comet" },
  "golf-ace": { bg: "#ecfdf5", fur: "#f8fafc", accent: "#059669", mark: "golf" },
  "study-mentor": { bg: "#eef2ff", fur: "#f8fafc", accent: "#6366f1", mark: "quill" },
  "tea-host": { bg: "#fff1f2", fur: "#fff7ed", accent: "#f43f5e", mark: "teapot" },
  "moon-sailor": { bg: "#eff6ff", fur: "#f8fafc", accent: "#3b82f6", mark: "sail" },
  "kitchen-captain": { bg: "#fff7ed", fur: "#fffaf0", accent: "#f97316", mark: "chef" },
  "trainer-champion": { bg: "#f7fee7", fur: "#f8fafc", accent: "#65a30d", mark: "medal" },
  "orbit-monarch": { bg: "#f5f3ff", fur: "#faf5ff", accent: "#7c3aed", mark: "orbit" },
  "gala-star": { bg: "#fdf2f8", fur: "#fff7ed", accent: "#ec4899", mark: "gala" },
  "ultimate-heartkeeper": { bg: "#fdf2f8", fur: "#fce7f3", accent: "#db2777", mark: "heart" }
};

const CuteFace = ({ color = "#1e293b" }: { color?: string }) => (
  <g>
    <circle cx="25" cy="31" r="3.5" fill={color} /><circle cx="39" cy="31" r="3.5" fill={color} />
    <circle cx="24" cy="30" r="1" fill="white" /><circle cx="38" cy="30" r="1" fill="white" />
    <ellipse cx="19" cy="38" rx="4" ry="2" fill="#fda4af" opacity="0.5" /><ellipse cx="45" cy="38" rx="4" ry="2" fill="#fda4af" opacity="0.5" />
    <path d="M 29 38 Q 32 41, 35 38" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </g>
);

const ClassicMarkSvg = ({ mark, accent }: { mark: ClassicMark; accent: string }) => {
  switch (mark) {
    case "sprout": case "leaf": return <g><path d="M 32 17 Q 27 8, 20 12 Q 23 19, 32 18 Q 37 8, 45 12 Q 42 20, 32 18" fill={accent} stroke="#334155" strokeWidth="1.3" /><path d="M 32 18 V 23" stroke="#334155" strokeWidth="1.3" /></g>;
    case "ribbon": case "gala": return <g><path d="M 32 20 Q 23 13, 20 20 Q 23 27, 32 22 Q 41 27, 44 20 Q 41 13, 32 20 Z" fill={accent} stroke="#334155" strokeWidth="1.4" /><circle cx="32" cy="21" r="3" fill="#fff" /></g>;
    case "bell": return <g><path d="M 25 49 Q 32 41, 39 49 L 37 55 H 27 Z" fill={accent} stroke="#334155" strokeWidth="1.4" /><circle cx="32" cy="55" r="2" fill="#334155" /></g>;
    case "glasses": return <g><circle cx="25" cy="31" r="6" fill="none" stroke={accent} strokeWidth="2" /><circle cx="39" cy="31" r="6" fill="none" stroke={accent} strokeWidth="2" /><path d="M 31 31 H 33" stroke={accent} strokeWidth="2" /></g>;
    case "tea": return <g><rect x="25" y="45" width="14" height="13" rx="3" fill={accent} stroke="#334155" strokeWidth="1.3" /><path d="M 39 48 Q 46 49, 40 54" fill="none" stroke="#334155" strokeWidth="1.5" /><path d="M 29 45 L 27 37" stroke="#334155" strokeWidth="1.3" /></g>;
    case "star": case "comet": return <g><path d="M 32 13 L 35 20 L 43 20 L 37 25 L 39 33 L 32 28 L 25 33 L 27 25 L 21 20 L 29 20 Z" fill={accent} stroke="#334155" strokeWidth="1.2" />{mark === "comet" && <path d="M 21 17 Q 10 21, 9 31" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />}</g>;
    case "crown": return <path d="M 20 22 L 23 11 L 31 18 L 39 10 L 44 22 Z" fill={accent} stroke="#334155" strokeWidth="1.5" />;
    case "wings": return <g><path d="M 16 34 Q 3 28, 8 45 Q 14 50, 20 40" fill="#fff" stroke={accent} strokeWidth="1.6" /><path d="M 48 34 Q 61 28, 56 45 Q 50 50, 44 40" fill="#fff" stroke={accent} strokeWidth="1.6" /></g>;
    case "book": return <g><path d="M 18 47 Q 25 44, 32 49 V 58 Q 25 53, 18 55 Z" fill="#fff" stroke={accent} strokeWidth="1.5" /><path d="M 46 47 Q 39 44, 32 49 V 58 Q 39 53, 46 55 Z" fill="#fff" stroke={accent} strokeWidth="1.5" /></g>;
    case "halo": case "orbit": return <g><ellipse cx="32" cy="17" rx="14" ry="5" fill="none" stroke={accent} strokeWidth="2.2" />{mark === "orbit" && <ellipse cx="32" cy="39" rx="25" ry="8" fill="none" stroke={accent} strokeWidth="1.5" strokeDasharray="3 3" />}</g>;
    case "chef": return <path d="M 19 23 Q 16 15, 24 14 Q 26 7, 32 13 Q 38 7, 40 14 Q 49 15, 45 23 L 42 27 H 22 Z" fill="#fff" stroke={accent} strokeWidth="1.6" />;
    case "satchel": return <g><rect x="35" y="43" width="14" height="12" rx="3" fill={accent} stroke="#334155" strokeWidth="1.4" /><path d="M 22 27 L 44 47" stroke={accent} strokeWidth="2.5" /></g>;
    case "fitness": return <g><path d="M 19 22 Q 32 17, 45 22" fill="none" stroke={accent} strokeWidth="4" /><path d="M 19 50 H 45" stroke="#334155" strokeWidth="3" /><rect x="15" y="46" width="5" height="8" rx="1" fill={accent} /><rect x="44" y="46" width="5" height="8" rx="1" fill={accent} /></g>;
    case "wizard": return <g><path d="M 19 24 L 34 4 L 46 25 Z" fill={accent} stroke="#334155" strokeWidth="1.5" /><path d="M 15 25 Q 32 20, 49 25" fill="none" stroke="#334155" strokeWidth="3" /><circle cx="34" cy="14" r="2" fill="#fef08a" /></g>;
    case "golf": return <g><path d="M 41 18 L 35 52 Q 38 57, 44 54" fill="none" stroke={accent} strokeWidth="2.5" /><circle cx="25" cy="55" r="3" fill="#fff" stroke="#334155" strokeWidth="1" /></g>;
    case "quill": return <g><path d="M 42 15 Q 21 17, 24 46 Q 34 36, 42 15 Z" fill={accent} stroke="#334155" strokeWidth="1.2" /><path d="M 20 52 L 38 22" stroke="#334155" strokeWidth="1.5" /></g>;
    case "teapot": return <g><ellipse cx="32" cy="50" rx="11" ry="8" fill={accent} stroke="#334155" strokeWidth="1.4" /><path d="M 21 48 Q 13 45, 15 52 Q 18 56, 23 53 M 42 47 Q 51 44, 49 51" fill="none" stroke="#334155" strokeWidth="1.5" /></g>;
    case "sail": return <g><path d="M 32 12 V 48" stroke="#334155" strokeWidth="1.8" /><path d="M 34 14 Q 49 21, 45 39 L 34 35 Z" fill={accent} stroke="#334155" strokeWidth="1.3" /><path d="M 17 50 Q 32 58, 47 50" fill="none" stroke={accent} strokeWidth="4" /></g>;
    case "medal": return <g><path d="M 25 18 L 32 33 L 39 18" fill="none" stroke={accent} strokeWidth="4" /><circle cx="32" cy="39" r="7" fill="#fde68a" stroke="#334155" strokeWidth="1.4" /></g>;
    case "heart": return <path d="M 32 54 C 18 44, 20 34, 27 34 Q 32 34, 32 40 Q 32 34, 37 34 C 44 34, 46 44, 32 54 Z" fill={accent} stroke="#831843" strokeWidth="1.4" />;
  }
};

const SpecialIcon = ({ stateId }: { stateId: string }) => {
  const face = <CuteFace />;
  switch (stateId) {
    case "moon-mochi-bun": return <g><ellipse cx="20" cy="17" rx="6" ry="14" fill="#c4b5fd" stroke="#312e81" strokeWidth="1.5" /><ellipse cx="44" cy="17" rx="6" ry="14" fill="#c4b5fd" stroke="#312e81" strokeWidth="1.5" /><ellipse cx="32" cy="38" rx="22" ry="21" fill="#ede9fe" stroke="#312e81" strokeWidth="2" />{face}<path d="M 20 48 Q 32 57, 44 48" fill="none" stroke="#6366f1" strokeWidth="5" /></g>;
    case "strawberry-puff": return <g><path d="M 32 59 C 15 51, 10 24, 32 17 C 54 24, 49 51, 32 59 Z" fill="#fb7185" stroke="#881337" strokeWidth="2" /><path d="M 32 19 Q 22 9, 16 17 Q 26 18, 32 24 Q 38 18, 48 17 Q 42 9, 32 19" fill="#4ade80" />{face}</g>;
    case "cloud-lamb": return <g><path d="M 12 40 Q 5 28, 17 24 Q 16 12, 29 16 Q 37 8, 43 19 Q 57 20, 51 34 Q 58 45, 45 51 Q 38 62, 28 54 Q 14 59, 14 47 Z" fill="#fff" stroke="#475569" strokeWidth="2" /><path d="M 19 25 Q 7 18, 14 11 Q 24 9, 23 21 M 45 25 Q 57 18, 50 11 Q 40 9, 41 21" fill="#fde68a" stroke="#92400e" strokeWidth="2" />{face}</g>;
    case "honey-bumble-bear": return <g><circle cx="18" cy="20" r="9" fill="#fbbf24" stroke="#78350f" strokeWidth="2" /><circle cx="46" cy="20" r="9" fill="#fbbf24" stroke="#78350f" strokeWidth="2" /><circle cx="32" cy="37" r="23" fill="#fcd34d" stroke="#78350f" strokeWidth="2" /><path d="M 10 35 Q 32 43, 54 35 M 12 48 Q 32 55, 52 48" stroke="#451a03" strokeWidth="5" />{face}</g>;
    case "sakura-kitsune": return <g><path d="M 14 29 L 19 10 L 29 22 Q 32 20, 35 22 L 45 10 L 50 29 Q 55 51, 32 58 Q 9 51, 14 29 Z" fill="#fff7ed" stroke="#9f1239" strokeWidth="2" /><path d="M 18 47 Q 4 42, 8 58 Q 19 61, 25 52 M 46 47 Q 60 42, 56 58 Q 45 61, 39 52" fill="#f9a8d4" stroke="#9f1239" strokeWidth="2" />{face}</g>;
    case "pearl-tide-otter": return <g><ellipse cx="32" cy="37" rx="23" ry="25" fill="#22d3ee" stroke="#164e63" strokeWidth="2" /><ellipse cx="32" cy="42" rx="15" ry="16" fill="#cffafe" /><path d="M 22 17 Q 32 5, 42 17 L 37 20 L 32 15 L 27 20 Z" fill="#fef3c7" />{face}<circle cx="46" cy="12" r="4" fill="none" stroke="#67e8f9" strokeWidth="2" /></g>;
    case "starlight-owl": return <g><path d="M 10 38 Q 9 16, 23 11 L 32 20 L 41 11 Q 55 16, 54 38 Q 55 57, 32 59 Q 9 57, 10 38 Z" fill="#312e81" stroke="#172554" strokeWidth="2" /><circle cx="23" cy="31" r="10" fill="#e0e7ff" /><circle cx="41" cy="31" r="10" fill="#e0e7ff" />{face}<path d="M 28 45 L 32 49 L 36 45" fill="#fde68a" /></g>;
    case "royal-red-panda": return <g><path d="M 13 29 L 18 11 L 28 22 Q 32 20, 36 22 L 46 11 L 51 29 Q 56 53, 32 59 Q 8 53, 13 29 Z" fill="#f97316" stroke="#431407" strokeWidth="2" /><path d="M 15 31 Q 23 22, 29 31 Q 32 37, 35 31 Q 41 22, 49 31" fill="#fff7ed" />{face}<path d="M 22 17 L 25 7 L 32 13 L 39 7 L 42 17 Z" fill="#fde68a" /></g>;
    case "dream-dragon": return <g><ellipse cx="32" cy="38" rx="23" ry="22" fill="#6ee7b7" stroke="#134e4a" strokeWidth="2" /><path d="M 21 19 Q 16 6, 29 15 L 26 24 M 43 19 Q 48 6, 35 15 L 38 24" fill="#c4b5fd" stroke="#134e4a" strokeWidth="2" /><path d="M 12 38 Q 1 31, 6 49 Q 14 54, 20 44 M 52 38 Q 63 31, 58 49 Q 50 54, 44 44" fill="#67e8f9" stroke="#134e4a" strokeWidth="1.5" />{face}</g>;
    case "eternal-heart-cosmos": return <g><path d="M 32 59 C 25 51, 8 45, 9 28 C 10 15, 25 12, 32 23 C 39 12, 54 15, 55 28 C 56 45, 39 51, 32 59 Z" fill="#f9a8d4" stroke="#4c1d95" strokeWidth="2.2" /><path d="M 13 31 Q 1 20, 3 42 Q 10 52, 18 40 M 51 31 Q 63 20, 61 42 Q 54 52, 46 40" fill="#67e8f9" stroke="#4c1d95" strokeWidth="2" /><path d="M 23 20 L 26 7 L 32 14 L 38 7 L 41 20" fill="#fef08a" stroke="#4c1d95" strokeWidth="1.5" />{face}</g>;
    case "campus-capybara": return <g><ellipse cx="32" cy="39" rx="24" ry="20" fill="#b7794b" stroke="#572f1d" strokeWidth="2" /><circle cx="15" cy="28" r="7" fill="#9a633f" /><circle cx="49" cy="28" r="7" fill="#9a633f" /><ellipse cx="32" cy="42" rx="12" ry="8" fill="#e7b98b" /><path d="M 23 20 Q 32 11 41 20" fill="#fbbf24" stroke="#572f1d" strokeWidth="1.5" /><path d="M 42 44 L 53 53 L 45 58 L 36 48 Z" fill="#65a30d" />{face}</g>;
    case "ribbon-swan": return <g><ellipse cx="30" cy="45" rx="24" ry="14" fill="#fff" stroke="#64748b" strokeWidth="2" /><path d="M 19 45 Q 5 34 8 51 Q 16 60 27 50 M 41 45 Q 56 34 55 51 Q 47 60 35 50" fill="#fce7f3" stroke="#f472b6" strokeWidth="1.5" /><path d="M 28 47 Q 22 32 29 22 Q 35 14 43 19 Q 49 24 44 31 Q 40 36 35 31 Q 34 39 40 47" fill="#fff" stroke="#64748b" strokeWidth="2" strokeLinejoin="round" /><circle cx="43" cy="23" r="8" fill="#fff" stroke="#64748b" strokeWidth="1.7" /><circle cx="41" cy="22" r="1.5" fill="#334155" /><path d="M 50 23 L 59 27 L 50 30 Z" fill="#fbbf24" stroke="#92400e" strokeWidth="1" /><path d="M 23 36 Q 30 30 37 36" fill="none" stroke="#fb7185" strokeWidth="4" /></g>;
    case "bamboo-panda": return <g><circle cx="17" cy="22" r="9" fill="#1f2937" /><circle cx="47" cy="22" r="9" fill="#1f2937" /><ellipse cx="32" cy="39" rx="23" ry="22" fill="#fff7ed" stroke="#1f2937" strokeWidth="2" /><ellipse cx="24" cy="32" rx="7" ry="9" fill="#1f2937" transform="rotate(18 24 32)" /><ellipse cx="40" cy="32" rx="7" ry="9" fill="#1f2937" transform="rotate(-18 40 32)" /><path d="M 13 48 Q 32 42 51 48 L 47 59 H 17 Z" fill="#34d399" /><path d="M 45 17 Q 53 7 58 12 Q 54 20 45 22" fill="#84cc16" />{face}</g>;
    case "story-grizzly": return <g><circle cx="17" cy="22" r="9" fill="#8b5a3c" stroke="#422006" strokeWidth="2" /><circle cx="47" cy="22" r="9" fill="#8b5a3c" stroke="#422006" strokeWidth="2" /><ellipse cx="32" cy="39" rx="24" ry="22" fill="#a96845" stroke="#422006" strokeWidth="2" /><ellipse cx="32" cy="43" rx="12" ry="9" fill="#e7b98b" /><path d="M 12 48 Q 32 57 52 48" fill="none" stroke="#be123c" strokeWidth="5" /><rect x="38" y="47" width="16" height="12" rx="3" fill="#fef3c7" stroke="#422006" strokeWidth="1.3" />{face}</g>;
    default: return null;
  }
};

export const CompanionStateIcon: React.FC<{ stateId: string; special?: boolean }> = ({ stateId, special = false }) => {
  const theme = classicThemes[stateId] || classicThemes["base-sprout"];
  return (
    <svg viewBox="0 0 64 64" role="img" aria-hidden="true" className="h-full w-full overflow-visible drop-shadow-sm">
      <circle cx="32" cy="32" r="30" fill={special ? "#faf5ff" : theme.bg} stroke={special ? "#e9d5ff" : "#ffe4e6"} strokeWidth="1.5" />
      {special ? (
        <SpecialIcon stateId={stateId} />
      ) : (
        <g>
          <circle cx="19" cy="23" r="9" fill={theme.fur} stroke="#334155" strokeWidth="2" />
          <circle cx="45" cy="23" r="9" fill={theme.fur} stroke="#334155" strokeWidth="2" />
          <circle cx="19" cy="23" r="4.5" fill="#fda4af" opacity="0.65" />
          <circle cx="45" cy="23" r="4.5" fill="#fda4af" opacity="0.65" />
          <ellipse cx="32" cy="39" rx="23" ry="21" fill={theme.fur} stroke="#334155" strokeWidth="2" />
          <ellipse cx="32" cy="52" rx="13" ry="5" fill="#fff" opacity="0.3" />
          <CuteFace />
          <ClassicMarkSvg mark={theme.mark} accent={theme.accent} />
        </g>
      )}
    </svg>
  );
};
