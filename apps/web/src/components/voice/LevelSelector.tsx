"use client";

/**
 * LevelSelector — One-click academic level switcher.
 *
 * Per design spec: visible and one-click changeable, not buried in settings.
 * Immediately updates the Zustand store so all subsequent voice/text turns
 * use the new level's persona.
 */

import { useChatStore, StudentLevel } from "@/store/useChatStore";

const LEVELS: { value: StudentLevel; label: string; desc: string }[] = [
  { value: "btech", label: "B.Tech", desc: "Intuition-first, friendly" },
  { value: "mtech", label: "M.Tech", desc: "Balanced rigor" },
  { value: "phd", label: "PhD", desc: "Research-peer mode" },
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
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
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
