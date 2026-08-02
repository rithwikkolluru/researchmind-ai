"use client";

/**
 * useVoice — Custom hook managing the complete voice pipeline.
 *
 * Supports two modes:
 *  1. Push-to-Talk (Walkie-Talkie): Press to speak, release to send.
 *  2. Phone Call Mode (Hands-free): Microphone stays open, detects end of utterance,
 *     plays AI voice response, and automatically resumes listening when done.
 *
 * Responsibilities:
 *  - Browser SpeechRecognition (STT) — capture and transcribe mic input.
 *  - WebSocket connection to /api/voice/ws/{sessionId} — send transcripts, receive responses.
 *  - Audio playback — decode base64 MP3 and play via AudioContext.
 *  - Voice state machine: idle → listening → thinking → speaking → error
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useChatStore } from "@/store/useChatStore";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

interface UseVoiceReturn {
  voiceState: VoiceState;
  isSupported: boolean;
  isCallMode: boolean;
  startListening: () => void;
  stopListening: () => void;
  startCall: () => void;
  endCall: () => void;
  errorMessage: string | null;
}

export function useVoice(): UseVoiceReturn {
  const { addMessage, sessionId, level, language } = useChatStore();
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isSupported, setIsSupported] = useState(false);
  const [isCallMode, setIsCallMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Keep refs for active state tracking to avoid closures in event listeners
  const isCallModeRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>("idle");
  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Sync refs with states
  useEffect(() => {
    isCallModeRef.current = isCallMode;
  }, [isCallMode]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  // Check browser SpeechRecognition support on mount
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || (window as typeof window & { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  // Connect and manage WebSocket connection
  useEffect(() => {
    const wsUrl = `ws://localhost:8000/api/voice/ws/${sessionId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[Voice] WebSocket connected");
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "thinking") {
          setVoiceState("thinking");
        }

        if (msg.type === "response") {
          addMessage({ role: "assistant", content: msg.text });
        }

        if (msg.type === "audio") {
          setVoiceState("speaking");
          // Stop any active recognition before speaking to prevent feedback
          if (recognitionRef.current) {
            try {
              recognitionRef.current.abort();
            } catch (e) {}
          }
          await playBase64Audio(msg.data);
          
          setVoiceState("idle");
          // If in Call Mode, automatically resume listening after speaking completes
          if (isCallModeRef.current) {
            triggerNextListen();
          }
        }

        if (msg.type === "error") {
          console.warn("[Voice] Server error:", msg.message);
          setErrorMessage(msg.message);
          setVoiceState("error");
          setTimeout(() => {
            setVoiceState("idle");
            if (isCallModeRef.current) triggerNextListen();
          }, 3000);
        }
      } catch (err) {
        console.error("[Voice] Failed to parse WebSocket message:", err);
      }
    };

    ws.onerror = () => {
      setErrorMessage("Could not connect to the voice server. Is the backend running?");
      setVoiceState("error");
    };

    ws.onclose = () => {
      console.log("[Voice] WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, [sessionId, addMessage]);

  // Decode and play incoming audio bytes
  const playBase64Audio = async (base64Data: string): Promise<void> => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;

      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      activeAudioSourceRef.current = source;

      return new Promise((resolve) => {
        source.onended = () => {
          activeAudioSourceRef.current = null;
          resolve();
        };
        source.start(0);
      });
    } catch (err) {
      console.error("[Voice] Audio playback error:", err);
    }
  };

  // Safe wrapper to start listening
  const triggerNextListen = useCallback(() => {
    if (!isSupported) return;
    // Don't listen if we are currently thinking or speaking
    if (voiceStateRef.current === "thinking" || voiceStateRef.current === "speaking") {
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    } catch (e) {}

    const SpeechRecognition =
      window.SpeechRecognition || (window as typeof window & { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = language === "Hindi" ? "hi-IN" : language === "Telugu" ? "te-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setVoiceState("listening");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (!transcript) return;

      addMessage({ role: "user", content: transcript });

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "transcript",
            text: transcript,
            level: level,
            language: language,
          })
        );
        setVoiceState("thinking");
      } else {
        setErrorMessage("Lost connection to voice server.");
        setVoiceState("error");
      }
    };

    recognition.onerror = (event) => {
      // Use console.warn instead of console.error for "no-speech" to prevent Next.js overlay triggers
      if (event.error === "no-speech") {
        console.warn("[Voice] SpeechRecognition status: no speech detected.");
        setVoiceState("idle");
      } else {
        console.warn("[Voice] SpeechRecognition error:", event.error);
        setErrorMessage(`Microphone error: ${event.error}`);
        setVoiceState("error");
        setTimeout(() => setVoiceState("idle"), 3000);
      }
    };

    recognition.onend = () => {
      // If we are in Call Mode, still idle, and recognition stops naturally, restart it
      if (isCallModeRef.current && voiceStateRef.current === "listening") {
        setVoiceState("idle");
        // Delay slightly to prevent rapid cycling loops
        setTimeout(() => {
          if (isCallModeRef.current && voiceStateRef.current === "idle") {
            triggerNextListen();
          }
        }, 300);
      } else if (!isCallModeRef.current && voiceStateRef.current === "listening") {
        setVoiceState("idle");
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn("[Voice] Start error:", e);
    }
  }, [isSupported, language, level, addMessage]);

  // Walkie-Talkie actions
  const startListening = useCallback(() => {
    if (isCallMode) return;
    setErrorMessage(null);
    triggerNextListen();
  }, [isCallMode, triggerNextListen]);

  const stopListening = useCallback(() => {
    if (isCallMode) return;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setVoiceState("idle");
  }, [isCallMode]);

  // Phone Call Mode actions
  const startCall = useCallback(() => {
    setIsCallMode(true);
    setErrorMessage(null);
    // Let's start the listening loop
    setTimeout(() => {
      triggerNextListen();
    }, 100);
  }, [triggerNextListen]);

  const endCall = useCallback(() => {
    setIsCallMode(false);
    setVoiceState("idle");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    if (activeAudioSourceRef.current) {
      try {
        activeAudioSourceRef.current.stop();
      } catch (e) {}
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (activeAudioSourceRef.current) {
        try {
          activeAudioSourceRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  return {
    voiceState,
    isSupported,
    isCallMode,
    startListening,
    stopListening,
    startCall,
    endCall,
    errorMessage,
  };
}
