"use client";

/**
 * VaaniInterface — Voice-first research mentor UI with:
 *  - Level-specific color themes (B.Tech=Cyan, M.Tech=Indigo, PhD=Emerald)
 *  - Advanced Mentor Mode switcher (Teach, Paper Discussion, Roadmap, Debate)
 *  - Research Quality Tracker toggle
 *  - Split-screen PDF viewer
 *  - Document upload with Paperclip button
 */

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useChatStore, MentorMode } from "@/store/useChatStore";
import { useVoice } from "@/hooks/useVoice";
import VoiceOrb from "@/components/voice/VoiceOrb";
import LevelSelector from "@/components/voice/LevelSelector";
import {
  Send, Trash2, BookOpen, Sparkles, Paperclip, Loader2, X,
  GraduationCap, FlaskConical, Map, Swords, BarChart3, ChevronDown, Mail
} from "lucide-react";

// ── Level theme config ──────────────────────────────────────────────────────
const LEVEL_THEME = {
  btech: {
    name: "B.Tech",
    bg: "bg-[#0a1628]",
    headerBg: "bg-[#0a1628]/80",
    accent: "#06b6d4",          // cyan-500
    accentDark: "#0e7490",      // cyan-700
    userBubble: "bg-cyan-600",
    focusRing: "focus:ring-cyan-500/50",
    sendBtn: "bg-cyan-600 hover:bg-cyan-500",
    logoIcon: "bg-cyan-700",
    dotColor: "bg-cyan-400",
    levelBadge: "bg-cyan-900/50 text-cyan-300 border-cyan-700/50",
    glow: "rgba(6,182,212,0.15)",
    label: "B.Tech Mode",
    subtitle: "Intuition-first, friendly",
    emoji: "🎓",
  },
  mtech: {
    name: "M.Tech",
    bg: "bg-[#0d0f14]",
    headerBg: "bg-[#0d0f14]/80",
    accent: "#6366f1",          // indigo-500
    accentDark: "#4338ca",      // indigo-700
    userBubble: "bg-indigo-600",
    focusRing: "focus:ring-indigo-500/50",
    sendBtn: "bg-indigo-600 hover:bg-indigo-500",
    logoIcon: "bg-indigo-600",
    dotColor: "bg-indigo-400",
    levelBadge: "bg-indigo-900/50 text-indigo-300 border-indigo-700/50",
    glow: "rgba(99,102,241,0.15)",
    label: "M.Tech Mode",
    subtitle: "Balanced rigor & research",
    emoji: "🔬",
  },
  phd: {
    name: "PhD",
    bg: "bg-[#07100e]",
    headerBg: "bg-[#07100e]/80",
    accent: "#10b981",          // emerald-500
    accentDark: "#065f46",      // emerald-800
    userBubble: "bg-emerald-700",
    focusRing: "focus:ring-emerald-500/50",
    sendBtn: "bg-emerald-700 hover:bg-emerald-600",
    logoIcon: "bg-emerald-700",
    dotColor: "bg-emerald-400",
    levelBadge: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
    glow: "rgba(16,185,129,0.15)",
    label: "PhD Mode",
    subtitle: "Research-peer, critical depth",
    emoji: "⚗️",
  },
};

// ── Mentor modes config ─────────────────────────────────────────────────────
const MENTOR_MODES: { value: MentorMode; label: string; icon: React.ReactNode; desc: string; forLevels: string[] }[] = [
  { value: "default",          label: "Default",     icon: <BookOpen size={14} />,     desc: "Standard mentor mode",              forLevels: ["btech","mtech","phd"] },
  { value: "teach",            label: "Teach Mode",  icon: <GraduationCap size={14} />,desc: "Checks understanding after each section", forLevels: ["btech","mtech","phd"] },
  { value: "paper_discussion", label: "Paper Room",  icon: <FlaskConical size={14} />, desc: "Socratic paper discussion (Socrates method)", forLevels: ["mtech","phd"] },
  { value: "roadmap",          label: "Roadmap",     icon: <Map size={14} />,          desc: "Generates your research learning path", forLevels: ["btech","mtech","phd"] },
  { value: "debate",           label: "Debate Mode", icon: <Swords size={14} />,       desc: "AI debates your ideas to sharpen thinking", forLevels: ["mtech","phd"] },
];

export default function VaaniInterface() {
  const {
    messages, addMessage, setTyping, isTyping,
    sessionId, level, language, clearMessages,
    mode, setMode, enableQualityTracker, setEnableQualityTracker,
  } = useChatStore();

  const {
    voiceState, isSupported, isCallMode, micLevel,
    startListening, stopListening, startCall, endCall, errorMessage,
  } = useVoice();

  const [textInput, setTextInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showModePanel, setShowModePanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const theme = LEVEL_THEME[level];
  const activeModeConfig = MENTOR_MODES.find(m => m.value === mode) || MENTOR_MODES[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, voiceState]);

  // ── Text Send ────────────────────────────────────────────────────────────
  const handleTextSend = async () => {
    const msg = textInput.trim();
    if (!msg || isTyping) return;
    setTextInput("");
    addMessage({ role: "user", content: msg });
    setTyping(true);
    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId, message: msg,
          level, language, mode, enable_quality_tracker: enableQualityTracker,
        }),
      });
      const data = await res.json();
      addMessage({ role: "assistant", content: data.response });
      try {
        const ttsRes = await fetch("http://localhost:8000/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.response, language: "en" }),
        });
        if (ttsRes.ok) {
          const audioBlob = await ttsRes.blob();
          const audio = new Audio(URL.createObjectURL(audioBlob));
          audio.play();
        }
      } catch { /* TTS non-fatal */ }
    } catch {
      addMessage({ role: "assistant", content: "Sorry, I couldn't reach the server. Please try again." });
    } finally {
      setTyping(false);
    }
  };

  // ── File Upload ──────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (file.name.toLowerCase().endsWith(".pdf")) {
      setPdfUrl(URL.createObjectURL(file));
    } else {
      setPdfUrl(null);
    }
    setIsUploading(true);
    addMessage({ role: "user", content: `[Uploading Document: ${file.name}...]` });
    setTyping(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("session_id", sessionId);
      const res = await fetch("http://localhost:8000/api/chat/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to upload document");
      }
      addMessage({ role: "user", content: `Uploaded ${file.name} successfully.` });
      addMessage({ role: "assistant", content: `I have received and read the document '${file.name}'. What would you like to know about it?` });
    } catch (error: unknown) {
      addMessage({ role: "assistant", content: `Sorry, I couldn't process the document. Error: ${error instanceof Error ? error.message : "Unknown error"}` });
    } finally {
      setIsUploading(false);
      setTyping(false);
    }
  };

  const activeColor =
    voiceState === "listening" ? "border-violet-500/50 shadow-violet-500/20" :
    voiceState === "thinking"  ? "border-amber-500/50 shadow-amber-500/20"  :
    voiceState === "speaking"  ? "border-emerald-500/50 shadow-emerald-500/20" :
    "border-white/10 shadow-transparent";

  return (
    <div
      className={`min-h-screen ${theme.bg} text-white flex flex-col font-sans transition-colors duration-700`}
      style={{
        background: `radial-gradient(ellipse 80% 50% at 50% -20%, ${theme.glow}, transparent),
                     radial-gradient(ellipse 60% 40% at 80% 90%, ${theme.glow}88, transparent)`,
        backgroundColor: theme.bg.replace("bg-", ""),
      }}
    >
      {/* ── Header ── */}
      <header className={`flex items-center justify-between px-6 py-4 border-b border-white/10 backdrop-blur-sm sticky top-0 z-20 ${theme.headerBg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${theme.logoIcon} flex items-center justify-center`}>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-none">Vaani</h1>
            <p className="text-[10px] text-gray-500 leading-none mt-0.5">ResearchMind AI</p>
          </div>
        </div>

        {/* Level badge */}
        <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${theme.levelBadge}`}>
          <span>{theme.emoji}</span>
          <span>{theme.label}</span>
          <span className="text-white/30">·</span>
          <span className="text-white/50 font-normal">{theme.subtitle}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode indicator */}
          <button
            onClick={() => setShowModePanel(!showModePanel)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            {activeModeConfig.icon}
            {activeModeConfig.label}
            <ChevronDown size={12} className={`transition-transform ${showModePanel ? "rotate-180" : ""}`} />
          </button>

          {/* Quality Tracker toggle (PhD/MTech only) */}
          {(level === "phd" || level === "mtech") && (
            <button
              onClick={() => setEnableQualityTracker(!enableQualityTracker)}
              title={enableQualityTracker ? "Quality Tracker ON" : "Quality Tracker OFF"}
              className={`p-2 rounded-lg border transition-all ${enableQualityTracker ? "bg-amber-900/40 border-amber-500/50 text-amber-400" : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"}`}
            >
              <BarChart3 size={14} />
            </button>
          )}

          <Link
            href="/communicate"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)", boxShadow: "0 0 12px rgba(99,102,241,0.3)" }}
          >
            <Mail className="w-3 h-3" />
            Communicate
          </Link>
          <Link
            href="/fun"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", boxShadow: "0 0 12px rgba(168,85,247,0.3)" }}
          >
            <Sparkles className="w-3 h-3" />
            Fun Zone
          </Link>
          <LevelSelector />
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              title="Clear conversation"
              className="p-2 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${voiceState === "error" ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
            <span className="text-[10px] text-gray-500">{voiceState === "error" ? "Error" : "Live"}</span>
          </div>
        </div>
      </header>

      {/* ── Mode Switcher Dropdown Panel ── */}
      {showModePanel && (
        <div className="sticky top-[73px] z-10 px-6 py-3 border-b border-white/5 bg-black/40 backdrop-blur-md">
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Active Mentor Mode</p>
          <div className="flex flex-wrap gap-2">
            {MENTOR_MODES
              .filter(m => m.forLevels.includes(level))
              .map(m => (
                <button
                  key={m.value}
                  onClick={() => { setMode(m.value); setShowModePanel(false); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    mode === m.value
                      ? "border-transparent text-white"
                      : "border-white/10 text-white/50 hover:text-white hover:border-white/20 bg-white/5"
                  }`}
                  style={mode === m.value ? { background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentDark})` } : {}}
                >
                  {m.icon}
                  {m.label}
                  {mode === m.value && <span className="text-white/60">✓</span>}
                </button>
              ))}
          </div>
          {(level === "phd" || level === "mtech") && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setEnableQualityTracker(!enableQualityTracker)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  enableQualityTracker
                    ? "bg-amber-900/40 border-amber-500/50 text-amber-300"
                    : "border-white/10 text-white/40 hover:text-white/70 bg-white/5"
                }`}
              >
                <BarChart3 size={12} />
                Research Quality Tracker {enableQualityTracker ? "(ON)" : "(OFF)"}
              </button>
              <span className="text-[10px] text-white/20">Scores your research depth every 3 messages</span>
            </div>
          )}
        </div>
      )}

      {/* ── Main Content Area (Split Screen) ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* PDF Viewer */}
        {pdfUrl && (
          <div className="w-1/2 border-r border-white/10 bg-[#13151c] flex flex-col hidden md:flex">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0d0f14]">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5" /> Document View
              </span>
              <button onClick={() => setPdfUrl(null)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-2">
              <iframe src={pdfUrl} className="w-full h-full rounded-xl border border-white/5 bg-white" title="PDF Viewer" />
            </div>
          </div>
        )}

        {/* Chat Panel */}
        <div className={`flex flex-col transition-all duration-300 ${pdfUrl ? "w-full md:w-1/2" : "w-full"}`}>

          {/* Transcript */}
          <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${theme.accent}40, ${theme.accentDark}40)`, border: `1px solid ${theme.accent}30` }}
                >
                  <span className="text-3xl">{theme.emoji}</span>
                </div>
                <div>
                  <p className="text-gray-300 font-medium">Hello, I am Vaani.</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Your {theme.name} AI research mentor.
                    {mode !== "default" && <span className="ml-1" style={{ color: theme.accent }}>[ {activeModeConfig.label} active ]</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {(level === "btech"
                    ? ["Explain backpropagation simply", "Help me write a literature review", "What is gradient descent?"]
                    : level === "mtech"
                    ? ["What is the research gap in transformers?", "Explain attention mechanism formally", "Compare CNNs vs ViTs"]
                    : ["What assumptions does this paper make?", "Help me find a research gap in LLMs", "Critique my methodology"]
                  ).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setTextInput(suggestion)}
                      className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-gray-400 hover:text-gray-200 transition-all"
                      style={{ borderColor: `${theme.accent}30` }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}>
                  {msg.role === "assistant" && (
                    <div
                      className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-1 text-xs"
                      style={{ background: `${theme.accent}20`, border: `1px solid ${theme.accent}30` }}
                    >
                      {theme.emoji}
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === "user"
                        ? `${theme.userBubble} text-white rounded-tr-sm`
                        : "bg-[#1a1d27] text-gray-200 border border-white/8 rounded-tl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}

            {/* Thinking dots */}
            {(isTyping || voiceState === "thinking") && (
              <div className="flex justify-start gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs"
                  style={{ background: `${theme.accent}20`, border: `1px solid ${theme.accent}30` }}
                >
                  {theme.emoji}
                </div>
                <div className="bg-[#1a1d27] border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-end gap-1 h-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className={`w-1.5 h-1.5 ${theme.dotColor} rounded-full animate-bounce`} style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </main>

          {/* Error */}
          {errorMessage && (
            <div className="mx-auto max-w-3xl w-full px-4">
              <div className="bg-red-950/40 border border-red-500/30 text-red-300 text-xs px-4 py-2 rounded-lg mb-2">{errorMessage}</div>
            </div>
          )}

          {/* Footer */}
          <footer className={`border-t transition-all duration-500 ${activeColor} border shadow-lg`} style={{ background: "linear-gradient(to top, #0d0f14, #0f1219)" }}>
            <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col items-center gap-5">
              <VoiceOrb
                voiceState={voiceState} isSupported={isSupported} isCallMode={isCallMode}
                micLevel={micLevel} onPress={startListening} onRelease={stopListening}
                onStartCall={startCall} onEndCall={endCall}
              />
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-[10px] text-gray-600 uppercase tracking-widest">or type</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleTextSend(); }} className="flex items-center gap-2 w-full">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.txt" className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isTyping}
                  title="Upload PDF or TXT document"
                  className="p-3 bg-[#1a1d27] border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </button>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={
                    mode === "debate" ? "State your argument..." :
                    mode === "roadmap" ? "Tell me your research goal..." :
                    mode === "paper_discussion" ? "What did you observe in the paper?" :
                    mode === "teach" ? "Ask me anything to learn..." :
                    "Type your research question..."
                  }
                  disabled={isTyping || voiceState === "thinking" || voiceState === "speaking" || isUploading}
                  className={`flex-1 bg-[#1a1d27] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none ${theme.focusRing} focus:ring-1 focus:bg-white/5 transition-all disabled:opacity-40`}
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || isTyping}
                  className={`p-3 ${theme.sendBtn} rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all`}
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </form>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
