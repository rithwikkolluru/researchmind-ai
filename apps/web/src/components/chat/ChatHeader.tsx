"use client";

import { ChevronDown, Languages, Sparkles } from "lucide-react";
import { Language, MentorMode, StudentLevel } from "@/store/useChatStore";
import LevelSelector from "@/components/voice/LevelSelector";

interface ChatHeaderProps {
  level: StudentLevel;
  language: Language;
  mode: MentorMode;
  setLevel: (level: StudentLevel) => void;
  setLanguage: (language: Language) => void;
  setMode: (mode: MentorMode) => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onExportMarkdown: () => void;
  onExportPdf: () => void;
}

const LANGUAGES: Language[] = ["English", "Hindi", "Telugu"];
const MODE_LABELS: Record<MentorMode, string> = {
  default: "Default",
  teach: "Teach",
  paper_discussion: "Paper Room",
  roadmap: "Roadmap",
  debate: "Debate",
};

export default function ChatHeader({
  level,
  language,
  mode,
  setLevel,
  setLanguage,
  setMode,
  onToggleSidebar,
  sidebarOpen,
  onExportMarkdown,
  onExportPdf,
}: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0f1117]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-200 transition hover:bg-white/10"
            aria-label="Toggle session sidebar"
          >
            <ChevronDown className={`h-4 w-4 transition ${sidebarOpen ? "rotate-180" : ""}`} />
          </button>

          <div className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2">
            <Sparkles className="h-4 w-4 text-indigo-300" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-300">ResearchMind</p>
              <p className="text-sm font-semibold text-white">AI Mentor</p>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <LevelSelector />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
            <Languages className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              className="bg-transparent text-xs font-medium text-gray-100 outline-none"
            >
              {LANGUAGES.map((value) => (
                <option key={value} value={value} className="bg-[#0f1117] text-white">
                  {value}
                </option>
              ))}
            </select>
          </div>

          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as MentorMode)}
            className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium text-gray-100 outline-none"
          >
            {Object.entries(MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value} className="bg-[#0f1117] text-white">
                {label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onExportMarkdown}
            className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
          >
            .md
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/20"
          >
            PDF
          </button>
        </div>
      </div>
    </header>
  );
}
