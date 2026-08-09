"use client";

import { useChatStore, StudentLevel } from "@/store/useChatStore";

const LEVELS: { value: StudentLevel; label: string; desc: string; activeClass: string }[] = [
  { value: "btech", label: "B.Tech", desc: "Intuition-first, friendly",   activeClass: "bg-cyan-600 shadow-cyan-500/30 text-white" },
  { value: "mtech", label: "M.Tech", desc: "Balanced rigor",              activeClass: "bg-indigo-600 shadow-indigo-500/30 text-white" },
  { value: "phd",   label: "PhD",    desc: "Research-peer mode",          activeClass: "bg-emerald-700 shadow-emerald-500/30 text-white" },
];

export default function LevelSelector() {
  const { level, setLevel } = useChatStore();

  return (
    <div className="flex items-center gap-1 bg-gray-900/60 rounded-lg p-1 border border-white/10">
      {LEVELS.map((l) => (
        <button
          key={l.value}
          onClick={() => setLevel(l.value)}
          title={l.desc}
          className={`
            px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200
            ${level === l.value
              ? `${l.activeClass} shadow-lg`
              : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
            }
          `}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
