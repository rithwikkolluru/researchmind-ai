"use client";

/**
 * VoiceOrb — The primary voice interaction element.
 *
 * Displays a large animated orb that reflects the current voice state:
 *   idle      → subtle pulsing glow, ready to tap
 *   listening → active waveform bars animation (you're being heard)
 *   thinking  → rotating spinner / "brain working" animation
 *   speaking  → ripple waves emanating outward (AI is talking)
 *   error     → red flash with error message
 *
 * Design rationale: voice state is the #1 UI element per the design spec.
 * It must be immediately obvious, never ambiguous, and visually calming
 * for long study sessions (no harsh colors or jarring animations).
 */

import { VoiceState } from "@/hooks/useVoice";

interface VoiceOrbProps {
  voiceState: VoiceState;
  isSupported: boolean;
  onPress: () => void;
  onRelease: () => void;
}

const STATE_CONFIG = {
  idle: {
    label: "Tap & Hold to Speak",
    ringColor: "ring-indigo-400/40",
    bgColor: "bg-indigo-600",
    glowColor: "shadow-indigo-500/30",
  },
  listening: {
    label: "Listening...",
    ringColor: "ring-violet-400/60",
    bgColor: "bg-violet-600",
    glowColor: "shadow-violet-500/50",
  },
  thinking: {
    label: "Thinking...",
    ringColor: "ring-amber-400/50",
    bgColor: "bg-amber-500",
    glowColor: "shadow-amber-400/40",
  },
  speaking: {
    label: "Speaking",
    ringColor: "ring-emerald-400/60",
    bgColor: "bg-emerald-600",
    glowColor: "shadow-emerald-500/50",
  },
  error: {
    label: "Error — Try Again",
    ringColor: "ring-red-400/60",
    bgColor: "bg-red-600",
    glowColor: "shadow-red-500/40",
  },
};

export default function VoiceOrb({ voiceState, isSupported, onPress, onRelease }: VoiceOrbProps) {
  const config = STATE_CONFIG[voiceState];

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center opacity-40">
          <MicIcon />
        </div>
        <p className="text-xs text-gray-500 text-center max-w-[140px]">
          Voice not supported. Use Chrome or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Outer ripple rings — visible when listening or speaking */}
      <div className="relative">
        {(voiceState === "listening" || voiceState === "speaking") && (
          <>
            <span className={`absolute inset-0 rounded-full animate-ping opacity-20 ${config.bgColor}`} />
            <span className={`absolute -inset-3 rounded-full animate-ping opacity-10 ${config.bgColor} animation-delay-150`} />
          </>
        )}

        {/* Main orb button */}
        <button
          onMouseDown={onPress}
          onMouseUp={onRelease}
          onTouchStart={onPress}
          onTouchEnd={onRelease}
          disabled={voiceState === "thinking" || voiceState === "speaking"}
          aria-label={`Voice button — ${config.label}`}
          className={`
            relative w-20 h-20 rounded-full flex items-center justify-center
            ring-4 ${config.ringColor} ${config.bgColor}
            shadow-2xl ${config.glowColor}
            transition-all duration-300 ease-out
            hover:scale-105 active:scale-95
            disabled:cursor-not-allowed disabled:opacity-80
            focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40
          `}
        >
          {voiceState === "thinking" ? (
            <ThinkingSpinner />
          ) : voiceState === "speaking" ? (
            <WaveformIcon />
          ) : (
            <MicIcon />
          )}
        </button>
      </div>

      {/* State label */}
      <span className={`text-xs font-medium tracking-wide transition-all duration-200 ${
        voiceState === "error" ? "text-red-400" :
        voiceState === "listening" ? "text-violet-300" :
        voiceState === "thinking" ? "text-amber-300" :
        voiceState === "speaking" ? "text-emerald-300" :
        "text-gray-400"
      }`}>
        {config.label}
      </span>
    </div>
  );
}

function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-8 h-8">
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" />
      <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V21H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-3.08A7 7 0 0 0 19 11z" />
    </svg>
  );
}

function ThinkingSpinner() {
  return (
    <svg className="w-8 h-8 animate-spin text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function WaveformIcon() {
  return (
    <div className="flex items-end gap-[3px] h-8">
      {[3, 6, 9, 6, 3].map((h, i) => (
        <div
          key={i}
          className="w-[4px] bg-white rounded-full animate-bounce"
          style={{
            height: `${h * 3}px`,
            animationDelay: `${i * 100}ms`,
            animationDuration: "600ms",
          }}
        />
      ))}
    </div>
  );
}
