"use client";

import { Loader2 } from "lucide-react";
import MessageBubble from "./MessageBubble";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
};

interface MessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
  voiceState: string;
  accentColor: string;
  streamingText?: string;
}

export default function MessageList({
  messages,
  isTyping,
  voiceState,
  accentColor,
  streamingText,
}: MessageListProps) {
  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <div className="flex min-h-[18rem] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#121720] p-6 text-center text-sm text-slate-400">
          Start a research conversation to see responses here.
        </div>
      ) : (
        messages.map((message, index) => (
          <MessageBubble
            key={`${message.role}-${index}-${message.timestamp ?? index}`}
            role={message.role}
            content={message.content}
            accentColor={accentColor}
          />
        ))
      )}

      {streamingText && (
        <MessageBubble role="assistant" content={streamingText} accentColor={accentColor} isStreaming />
      )}

      {(isTyping || voiceState === "thinking") && !streamingText && (
        <div className="flex justify-start">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#171b22] px-4 py-3 text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
            <span className="text-sm">Thinking…</span>
          </div>
        </div>
      )}
    </div>
  );
}
