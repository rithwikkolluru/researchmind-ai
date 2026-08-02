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
 * It supports both Push-to-Talk (Hold to speak) and hands-free Phone Call Mode.
 */

import { VoiceState } from "@/hooks/useVoice";
import { Phone, PhoneOff, Mic } from "lucide-react";

interface VoiceOrbProps {
  voiceState: VoiceState;
  isSupported: boolean;
  isCallMode: boolean;
  onPress: () => void;
  onRelease: () => void;
  onStartCall: () => void;
  onEndCall: () => void;
}

const STATE_CONFIG = {
  idle: {
    label: "Hold to Speak",
    ringColor: "ring-indigo-500/20",
    bgColor: "bg-indigo-600 hover:bg-indigo-500",
    glowColor: "shadow-indigo-500/30",
  },
  listening: {
    label: "Listening...",
    ringColor: "ring-violet-500/40",
    bgColor: "bg-violet-600",
    glowColor: "shadow-violet-500/40",
  },
  thinking: {
    label: "Thinking...",
    ringColor: "ring-amber-500/30",
    bgColor: "bg-amber-500",
    glowColor: "shadow-amber-500/30",
  },
  speaking: {
    label: "Speaking...",
    ringColor: "ring-emerald-500/40",
    bgColor: "bg-emerald-600",
    glowColor: "shadow-emerald-500/40",
  },
  error: {
    label: "Connection error",
    ringColor: "ring-red-500/40",
    bgColor: "bg-red-600",
    glowColor: "shadow-red-500/40",
  },
};

export default function VoiceOrb({
  voiceState,
  isSupported,
  isCallMode,
  onPress,
  onRelease,
  onStartCall,
  onEndCall,
}: VoiceOrbProps) {
  const config = STATE_CONFIG[voiceState];

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center opacity-40">
          <Mic className="w-6 h-6 text-gray-500" />
        </div>
        <p className="text-xs text-gray-500 text-center">
          Speech recognition not supported in this browser.
        </p>
      </div>
    );
  }

  // Active call layout
  if (isCallMode) {
    const activeLabel =
      voiceState === "listening" ? "Listening to you..." :
      voiceState === "thinking"  ? "Thinking..." :
      voiceState === "speaking"  ? "Mentor speaking..." :
      "Connected (Waiting for speech...)";

    const activeColor =
      voiceState === "listening" ? "ring-violet-500/40 bg-violet-600" :
      voiceState === "thinking"  ? "ring-amber-500/30 bg-amber-500" :
      voiceState === "speaking"  ? "ring-emerald-500/40 bg-emerald-600 animate-pulse" :
      "ring-indigo-500/20 bg-indigo-900";

    return (
      <div className="flex flex-col items-center gap-4 select-none w-full">
        <div className="flex items-center gap-6">
          {/* Active Call Orb */}
          <div className="relative">
            {(voiceState === "listening" || voiceState === "speaking") && (
              <>
                <span className={`absolute inset-0 rounded-full animate-ping opacity-25 ${activeColor}`} />
                <span className={`absolute -inset-3 rounded-full animate-ping opacity-10 ${activeColor} animation-delay-150`} />
              </>
            )}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ring-4 shadow-xl transition-all duration-300 ${activeColor}`}>
              {voiceState === "thinking" ? (
                <ThinkingSpinner />
              ) : voiceState === "speaking" ? (
                <WaveformIcon />
              ) : voiceState === "listening" ? (
                <WaveformIcon />
              ) : (
                <Phone className="w-8 h-8 text-indigo-200 animate-pulse" />
              )}
            </div>
          </div>

          {/* End Call (Hang Up) button */}
          <button
            onClick={onEndCall}
            aria-label="End call"
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 focus:outline-none"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs font-semibold text-indigo-400 tracking-wider uppercase">Live Mentor Call</p>
          <p className="text-xs text-gray-400 mt-1">{activeLabel}</p>
        </div>
      </div>
    );
  }

  // Walkie-Talkie layout (default)
  return (
    <div className="flex flex-col items-center gap-3 select-none w-full">
      <div className="flex items-center gap-4">
        {/* Main Press-to-Talk button */}
        <div className="relative">
          {voiceState === "listening" && (
            <>
              <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-violet-600" />
              <span className="absolute -inset-3 rounded-full animate-ping opacity-10 bg-violet-600" />
            </>
          )}

          <button
            onMouseDown={onPress}
            onMouseUp={onRelease}
            onTouchStart={onPress}
            onTouchEnd={onRelease}
            disabled={voiceState === "thinking" || voiceState === "speaking"}
            aria-label="Hold to speak"
            className={`
              w-16 h-16 rounded-full flex items-center justify-center
              ring-4 ${config.ringColor} ${config.bgColor}
              shadow-lg ${config.glowColor}
              transition-all duration-200
              hover:scale-105 active:scale-95
              disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none
            `}
          >
            {voiceState === "thinking" ? (
              <ThinkingSpinner />
            ) : voiceState === "speaking" ? (
              <WaveformIcon />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Start Phone Call button */}
        <button
          onClick={onStartCall}
          title="Start continuous hands-free call"
          className="w-12 h-12 rounded-full bg-indigo-950/60 border border-indigo-500/30 hover:bg-indigo-900/50 shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 focus:outline-none"
        >
          <Phone className="w-5 h-5 text-indigo-400" />
        </button>
      </div>

      <span className="text-[11px] text-gray-500 font-medium tracking-wide">
        {config.label} <span className="text-gray-600">or tap call icon for hands-free</span>
      </span>
    </div>
  );
}

function ThinkingSpinner() {
  return (
    <svg className="w-6 h-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function WaveformIcon() {
  return (
    <div className="flex items-end gap-[3px] h-6">
      {[2, 4, 6, 4, 2].map((h, i) => (
        <div
          key={i}
          className="w-[3px] bg-white rounded-full animate-bounce"
          style={{
            height: `${h * 3.5}px`,
            animationDelay: `${i * 100}ms`,
            animationDuration: "600ms",
          }}
        />
      ))}
    </div>
  );
}
