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
import Link from "next/link";
import { useChatStore } from "@/store/useChatStore";
import { useVoice } from "@/hooks/useVoice";
import VoiceOrb from "@/components/voice/VoiceOrb";
import LevelSelector from "@/components/voice/LevelSelector";
import { Send, Trash2, BookOpen, Sparkles, Paperclip, Loader2, X } from "lucide-react";

export default function VaaniInterface() {
  const { messages, addMessage, setTyping, isTyping, sessionId, level, language, clearMessages } =
    useChatStore();
  const {
    voiceState,
    isSupported,
    isCallMode,
    micLevel,
    startListening,
    stopListening,
    startCall,
    endCall,
    errorMessage,
  } = useVoice();

  const [textInput, setTextInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Document Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    
    // Reset input so the same file can be uploaded again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";

    // If it's a PDF, we can render it in the browser
    if (file.name.toLowerCase().endsWith('.pdf')) {
      // Create a local blob URL for the iframe
      const objectUrl = URL.createObjectURL(file);
      setPdfUrl(objectUrl);
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

      const res = await fetch("http://localhost:8000/api/chat/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to upload document");
      }

      // Add success messages
      addMessage({ role: "user", content: `Uploaded ${file.name} successfully.` });
      addMessage({ 
        role: "assistant", 
        content: `I have received and read the document '${file.name}'. What would you like to know about it?` 
      });

    } catch (error: any) {
      addMessage({
        role: "assistant",
        content: `Sorry, I couldn't process the document. Error: ${error.message}`,
      });
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
            <span className={`w-2 h-2 rounded-full ${
              voiceState === "error" ? "bg-red-500" : "bg-emerald-500 animate-pulse"
            }`} />
            <span className="text-[10px] text-gray-500">
              {voiceState === "error" ? "Error" : "Live"}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Content Area (Split Screen Support) ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PDF Viewer Side Panel */}
        {pdfUrl && (
          <div className="w-1/2 border-r border-white/10 bg-[#13151c] flex flex-col hidden md:flex animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0d0f14]">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5" />
                Document View
              </span>
              <button 
                onClick={() => setPdfUrl(null)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                title="Close Document View"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-2">
              <iframe 
                src={pdfUrl} 
                className="w-full h-full rounded-xl border border-white/5 bg-white"
                title="PDF Viewer"
              />
            </div>
          </div>
        )}

        {/* Chat Side Panel */}
        <div className={`flex flex-col h-full transition-all duration-300 ${pdfUrl ? 'w-full md:w-1/2' : 'w-full'}`}>
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
                isCallMode={isCallMode}
                micLevel={micLevel}
                onPress={startListening}
                onRelease={stopListening}
                onStartCall={startCall}
                onEndCall={endCall}
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
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.txt"
                  className="hidden"
                />
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
                  placeholder="Type your research question..."
                  disabled={isTyping || voiceState === "thinking" || voiceState === "speaking" || isUploading}
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
      </div>
    </div>
  );
}
