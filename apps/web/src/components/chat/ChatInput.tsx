"use client";

import { Loader2, Paperclip, Send } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAttach: () => void;
  isUploading: boolean;
  isTyping: boolean;
  voiceState: string;
  placeholder: string;
  accentColor: string;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  onAttach,
  isUploading,
  isTyping,
  voiceState,
  placeholder,
  accentColor,
}: ChatInputProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827]/80 p-3 shadow-lg shadow-black/10 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAttach}
          disabled={isUploading || isTyping || voiceState === "speaking"}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Attach file"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </button>

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={isTyping || voiceState === "speaking" || isUploading}
          className="h-11 flex-1 rounded-xl border border-white/10 bg-[#0f172a] px-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
        />

        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || isTyping || isUploading}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white transition duration-200 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${accentColor}, rgba(99,102,241,0.9))` }}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
