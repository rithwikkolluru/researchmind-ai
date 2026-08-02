"use client";

/**
 * VaaniInterface — The complete voice-first research mentor UI.
 *
 * Layout:
 *  ┌─────────────────────────────────────┐
 *  │  Header: logo + level selector       │
 *  ├─────────────────────────────────────┤
 *  │  Transcript panel (scrollable)       │
 *  │  (shows conversation history)        │
 *  ├─────────────────────────────────────┤
 *  │  Voice Orb (primary interaction)     │
 *  │  + Text fallback input              │
 *  └─────────────────────────────────────┘
 *
 * Voice is the primary mode; text is the accessible fallback.
 * The transcript panel makes ephemeral voice reviewable (accessibility).
 */

import React, { useRef, useEffect, useState } from "react";
import { useChatStore } from "@/store/useChatStore";
import { useVoice } from "@/hooks/useVoice";
import VoiceOrb from "@/components/voice/VoiceOrb";
import LevelSelector from "@/components/voice/LevelSelector";
import { Send, Trash2, BookOpen } from "lucide-react";

export default function VaaniInterface() {
  const { messages, addMessage, setTyping, isTyping, sessionId, level, language, clearMessages } =
    useChatStore();
  const { voiceState, isSupported, startListening, stopListening, errorMessage } = useVoice();

  const [textInput, setTextInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, voiceState]);

  // Text-mode send (fallback to voice)
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
          session_id: sessionId,
          message: msg,
          level,
          language,
        }),
      });
      const data = await res.json();
      addMessage({ role: "assistant", content: data.response });

      // Also play TTS for text-mode responses
      try {
        const ttsRes = await fetch("http://localhost:8000/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.response, language: "en" }),
        });
        if (ttsRes.ok) {
          const audioBlob = await ttsRes.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.play();
        }
      } catch {
        // TTS failure is non-fatal — text response is already shown
      }
    } catch {
      addMessage({
        role: "assistant",
        content: "Sorry, I couldn't reach the server. Please try again.",
      });
    } finally {
      setTyping(false);
    }
  };

  const activeColor =
    voiceState === "listening" ? "border-violet-500/50 shadow-violet-500/20" :
    voiceState === "thinking"  ? "border-amber-500/50 shadow-amber-500/20"  :
    voiceState === "speaking"  ? "border-emerald-500/50 shadow-emerald-500/20" :
    "border-white/10 shadow-transparent";

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white flex flex-col font-sans">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 backdrop-blur-sm sticky top-0 z-10 bg-[#0d0f14]/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-none">Vaani</h1>
            <p className="text-[10px] text-gray-500 leading-none mt-0.5">ResearchMind AI</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
            <span className={`w-2 h-2 rounded-full ${
              voiceState === "error" ? "bg-red-500" : "bg-emerald-500 animate-pulse"
            }`} />
            <span className="text-[10px] text-gray-500">
              {voiceState === "error" ? "Error" : "Live"}
            </span>
          </div>
        </div>
      </header>

      {/* ── Transcript Panel ── */}
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-900/30 border border-indigo-500/20 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-indigo-400 opacity-60" />
            </div>
            <div>
              <p className="text-gray-300 font-medium">Hello, I am Vaani.</p>
              <p className="text-gray-500 text-sm mt-1">
                Your AI research mentor. Hold the mic button to speak, or type below.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                "Help me write a literature review",
                "Explain backpropagation intuitively",
                "What is the research gap in my thesis?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setTextInput(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-gray-400 hover:text-gray-200 hover:border-indigo-500/40 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-indigo-900/60 border border-indigo-500/30 flex-shrink-0 flex items-center justify-center mt-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
                </div>
              )}
              <div
                className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : "bg-[#1a1d27] text-gray-200 border border-white/8 rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {/* Thinking indicator */}
        {(isTyping || voiceState === "thinking") && (
          <div className="flex justify-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-900/60 border border-indigo-500/30 flex-shrink-0 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
            </div>
            <div className="bg-[#1a1d27] border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-end gap-1 h-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* ── Error Banner ── */}
      {errorMessage && (
        <div className="mx-auto max-w-3xl w-full px-4">
          <div className="bg-red-950/40 border border-red-500/30 text-red-300 text-xs px-4 py-2 rounded-lg mb-2">
            {errorMessage}
          </div>
        </div>
      )}

      {/* ── Voice + Text Input Area ── */}
      <footer className={`border-t transition-all duration-500 ${activeColor} border shadow-lg`}
        style={{ background: "linear-gradient(to top, #0d0f14, #0f1219)" }}
      >
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col items-center gap-5">
          {/* Voice Orb — primary */}
          <VoiceOrb
            voiceState={voiceState}
            isSupported={isSupported}
            onPress={startListening}
            onRelease={stopListening}
          />

          {/* Divider */}
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[10px] text-gray-600 uppercase tracking-widest">or type</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Text fallback input */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleTextSend(); }}
            className="flex items-center gap-2 w-full"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your research question..."
              disabled={isTyping || voiceState === "thinking" || voiceState === "speaking"}
              className="flex-1 bg-[#1a1d27] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isTyping}
              className="p-3 bg-indigo-600 rounded-xl hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
