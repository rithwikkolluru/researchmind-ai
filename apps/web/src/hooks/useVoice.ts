"use client";

/**
 * useVoice — Custom hook managing the complete voice pipeline.
 *
 * Responsibilities:
 *  - Browser SpeechRecognition (STT) — capture and transcribe mic input
 *  - WebSocket connection to /api/voice/ws/{sessionId} — send transcripts, receive responses
 *  - Audio playback — decode base64 MP3 and play via AudioContext
 *  - Voice state machine: idle → listening → thinking → speaking → idle
 *
 * Why a custom hook (not a library)?
 *  The Web Speech API and AudioContext have complex lifecycle requirements
 *  that are easier to control precisely in a focused hook than via a
 *  generic third-party wrapper.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useChatStore } from "@/store/useChatStore";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

interface UseVoiceReturn {
  voiceState: VoiceState;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  errorMessage: string | null;
}

export function useVoice(): UseVoiceReturn {
  const { addMessage, sessionId, level, language } = useChatStore();
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isSupported, setIsSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || (window as typeof window & { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  // Connect WebSocket once on mount
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
          await playBase64Audio(msg.data);
          setVoiceState("idle");
        }

        if (msg.type === "error") {
          console.error("[Voice] Server error:", msg.message);
          setErrorMessage(msg.message);
          setVoiceState("error");
          setTimeout(() => setVoiceState("idle"), 3000);
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

      return new Promise((resolve) => {
        source.onended = () => resolve();
        source.start(0);
      });
    } catch (err) {
      console.error("[Voice] Audio playback error:", err);
    }
  };

  const startListening = useCallback(() => {
    if (!isSupported) {
      setErrorMessage("Voice is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (voiceState !== "idle") return;

    setErrorMessage(null);

    const SpeechRecognition =
      window.SpeechRecognition || (window as typeof window & { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = language === "Hindi" ? "hi-IN" : language === "Telugu" ? "te-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setVoiceState("listening");

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
      } else {
        setErrorMessage("Lost connection to voice server. Please refresh.");
        setVoiceState("error");
      }
    };

    recognition.onerror = (event) => {
      console.error("[Voice] SpeechRecognition error:", event.error);
      if (event.error === "no-speech") {
        setVoiceState("idle"); // Silent — not an error worth displaying
      } else {
        setErrorMessage(`Microphone error: ${event.error}`);
        setVoiceState("error");
        setTimeout(() => setVoiceState("idle"), 3000);
      }
    };

    recognition.onend = () => {
      if (voiceState === "listening") setVoiceState("idle");
    };

    recognition.start();
  }, [isSupported, voiceState, language, level, addMessage]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setVoiceState("idle");
  }, []);

  return { voiceState, isSupported, startListening, stopListening, errorMessage };
}
