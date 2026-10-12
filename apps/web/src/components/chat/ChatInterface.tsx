"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Download, FileText, LayoutPanelLeft, Loader2, Search, X } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { useVoice } from "@/hooks/useVoice";
import VoiceOrb from "@/components/voice/VoiceOrb";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import PdfViewerModal from "@/components/chat/PdfViewerModal";

const LEVEL_THEME = {
  btech: { accent: "#22d3ee", accentSoft: "rgba(34,211,238,0.18)", surface: "#0b1220" },
  mtech: { accent: "#818cf8", accentSoft: "rgba(129,140,248,0.18)", surface: "#0f172a" },
  phd: { accent: "#34d399", accentSoft: "rgba(52,211,153,0.18)", surface: "#06140f" },
} as const;

type SessionSummary = {
  id: string;
  title: string;
  updatedAt: string;
  level: string;
  mode: string;
  language: string;
  roadmap?: boolean;
  snippet: string;
};

export default function ChatInterface() {
  const {
    messages,
    addMessage,
    appendToLastMessage,
    setTyping,
    isTyping,
    sessionId,
    level,
    language,
    clearMessages,
    mode,
    setMode,
    enableQualityTracker,
    setEnableQualityTracker,
    setLevel,
    setLanguage,
    setMessages,
  } = useChatStore();

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<SessionSummary[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const theme = LEVEL_THEME[level];
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingResponse, voiceState]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("researchmind_sessions") || "[]") as SessionSummary[];
    setSessionHistory(stored);
  }, []);

  useEffect(() => {
    if (!messages.length) return;

    const snapshot = JSON.stringify(messages);
    localStorage.setItem(`researchmind_session_${sessionId}`, snapshot);

    setSessionHistory((current) => {
      const nextHistory = [
        {
          id: sessionId,
          title: (messages.find((message) => message.role === "user")?.content || "New session").slice(0, 42),
          updatedAt: new Date().toISOString(),
          level,
          mode,
          language,
          snippet: messages[messages.length - 1]?.content?.slice(0, 120) || "",
        },
        ...current.filter((item) => item.id !== sessionId),
      ].slice(0, 14);

      localStorage.setItem("researchmind_sessions", JSON.stringify(nextHistory));
      return nextHistory;
    });
  }, [messages, sessionId, level, mode, language]);

  const filteredSessions = sessionHistory.filter((item) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.snippet.toLowerCase().includes(query) ||
      item.mode.toLowerCase().includes(query)
    );
  });

  const handleStreamChat = async (payload: Record<string, unknown>) => {
    let fullResponse = "";
    setStreamingResponse("");

    try {
      // 1. Try real SSE streaming endpoint first
      const res = await fetch(`${apiBase}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                if (parsed.token) {
                  fullResponse += parsed.token;
                  setStreamingResponse(fullResponse);
                }
              } catch {
                // Ignore parse errors on keep-alives
              }
            }
          }
        }

        if (fullResponse) {
          setStreamingResponse("");
          addMessage({ role: "assistant", content: fullResponse });
          return;
        }
      }

      // 2. Fallback to synchronous endpoint
      const syncRes = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (syncRes.ok) {
        const data = await syncRes.json();
        const text = data.response || data.message || "I'm ready to help.";
        setStreamingResponse("");
        addMessage({ role: "assistant", content: text });
        return;
      }
    } catch (error) {
      console.warn("Stream request failed", error);
    }

    setStreamingResponse("");
    addMessage({
      role: "assistant",
      content: "Sorry, I couldn't reach the server right now. Please try again in a moment.",
    });
  };

  const handleTextSend = async () => {
    const trimmed = textInput.trim();
    if (!trimmed || isTyping) return;

    setTextInput("");
    addMessage({ role: "user", content: trimmed });
    setTyping(true);

    try {
      await handleStreamChat({
        session_id: sessionId,
        message: trimmed,
        level,
        language,
        mode,
        enable_quality_tracker: enableQualityTracker,
      });
    } catch (error) {
      console.error("Chat request failed", error);
      addMessage({ role: "assistant", content: "I couldn’t reach the AI mentor. Please try again." });
    } finally {
      setTyping(false);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsUploading(true);
    setTyping(true);
    addMessage({ role: "user", content: `[Document uploaded: ${file.name}]` });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("session_id", sessionId);

      const response = await fetch(`${apiBase}/api/chat/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload document");
      }

      if (file.name.toLowerCase().endsWith(".pdf")) {
        setPdfUrl(URL.createObjectURL(file));
      }

      addMessage({ role: "assistant", content: `I have received and reviewed ${file.name}. What would you like to explore next?` });
    } catch (error) {
      console.error("Upload failed", error);
      addMessage({ role: "assistant", content: "I couldn’t process that document. Please try a PDF or TXT file again." });
    } finally {
      setIsUploading(false);
      setTyping(false);
    }
  };

  const handleExportMarkdown = () => {
    const markdown = messages
      .map((message) => `## ${message.role === "user" ? "You" : "ResearchMind"}\n${message.content}`)
      .join("\n\n");

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `researchmind-session-${sessionId}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const loadSession = (itemId: string) => {
    const saved = localStorage.getItem(`researchmind_session_${itemId}`);
    if (!saved) return;

    const parsed = JSON.parse(saved) as typeof messages;
    setMessages(parsed);
    setTyping(false);
    setSidebarOpen(false);
  };

  const voiceFallbackLabel = !isSupported ? "Unsupported browser" : micLevel > 0 ? `Mic ${micLevel}%` : "Ready";

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      style={{
        background: `radial-gradient(circle at top, ${theme.accentSoft}, transparent 38%), #020817`,
      }}
    >
      <ChatHeader
        level={level}
        language={language}
        mode={mode}
        setLevel={setLevel}
        setLanguage={setLanguage}
        setMode={setMode}
        onToggleSidebar={() => setSidebarOpen((value) => !value)}
        sidebarOpen={sidebarOpen}
        onExportMarkdown={handleExportMarkdown}
        onExportPdf={handleExportPdf}
      />

      <div className="mx-auto flex max-w-[1600px] gap-4 p-4 sm:p-6">
        <aside
          className={`overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120]/90 backdrop-blur-xl transition-all duration-200 ${
            sidebarOpen ? "w-full max-w-[22rem]" : "w-0 border-0 opacity-0"
          }`}
        >
          <div className="h-full border-r border-white/5 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <LayoutPanelLeft className="h-4 w-4 text-indigo-300" />
                Sessions
              </div>
              <button
                type="button"
                onClick={clearMessages}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300"
              >
                Clear
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-[#0f172a] pl-9 pr-3 text-sm text-slate-200 outline-none focus:border-indigo-500/50"
                placeholder="Search sessions"
              />
            </div>

            <div className="space-y-3">
              {filteredSessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                  No saved sessions yet.
                </div>
              ) : (
                filteredSessions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => loadSession(item.id)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-indigo-500/30 hover:bg-white/10"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="line-clamp-1 text-sm font-medium text-white">{item.title}</span>
                      {item.roadmap ? <FileText className="h-3.5 w-3.5 text-indigo-300" /> : null}
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-400">{item.snippet || "No preview available"}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-slate-500">
                      <span>{item.level}</span>
                      <span>{item.mode}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120]/70 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#0f172a]/60 px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Session</p>
              <p className="text-sm font-medium text-white">{sessionId}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-300">
                {level}
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-300">
                {mode}
              </div>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6">
            <MessageList
              messages={messages}
              isTyping={isTyping}
              voiceState={voiceState}
              accentColor={theme.accent}
              streamingText={streamingResponse}
            />
            <div ref={scrollRef} />
          </div>

          {errorMessage || !isSupported ? (
            <div className="border-t border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-300">
              {errorMessage || "Speech recognition is unavailable in this browser. Use text input or switch to Chrome/Edge."}
            </div>
          ) : null}

          <div className="border-t border-white/10 bg-[#0a1020]/90 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <VoiceOrb
                  voiceState={voiceState}
                  isSupported={isSupported}
                  isCallMode={isCallMode}
                  onPress={startListening}
                  onRelease={stopListening}
                  onStartCall={startCall}
                  onEndCall={endCall}
                />
                <div className="text-xs text-slate-400">
                  <div className="font-medium text-slate-200">{voiceFallbackLabel}</div>
                  <div>{micLevel > 0 ? `Mic level: ${micLevel}%` : "Voice idle"}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPdfUrl(null)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <ChatInput
                  value={textInput}
                  onChange={setTextInput}
                  onSubmit={handleTextSend}
                  onAttach={() => fileInputRef.current?.click()}
                  isUploading={isUploading}
                  isTyping={isTyping}
                  voiceState={voiceState}
                  placeholder={mode === "debate" ? "State your argument..." : "Ask your research question..."}
                  accentColor={theme.accent}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      <PdfViewerModal pdfUrl={pdfUrl} onClose={() => setPdfUrl(null)} />
    </div>
  );
}
