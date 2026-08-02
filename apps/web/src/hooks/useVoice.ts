"use client";

/**
 * useVoice — Custom hook managing the complete voice pipeline.
 *
 * Supports two modes:
 *  1. Push-to-Talk (Walkie-Talkie): Press to speak, release to send.
 *  2. Phone Call Mode (Hands-free): Microphone stays open, detects end of
 *     utterance via a custom 3-second silence VAD timer, then sends the
 *     accumulated transcript to the AI mentor. The AI voice response plays
 *     back and recognition auto-resumes when playback ends.
 *
 * Responsibilities:
 *  - Browser SpeechRecognition (STT) — capture and transcribe mic input.
 *  - WebSocket connection to /api/voice/ws/{sessionId} — send transcripts, receive responses.
 *  - Audio playback — decode base64 MP3 and play via AudioContext.
 *  - Real-time microphone volume via Web Audio AnalyserNode (exposed as micLevel 0-100).
 *  - Duplex interruption — if user speaks while AI is playing, audio stops instantly.
 *  - Voice state machine: idle → listening → thinking → speaking → error
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useChatStore } from "@/store/useChatStore";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

interface UseVoiceReturn {
  voiceState: VoiceState;
  isSupported: boolean;
  isCallMode: boolean;
  micLevel: number; // Real-time microphone volume (0-100)
  startListening: () => void;
  stopListening: () => void;
  startCall: () => void;
  endCall: () => void;
  errorMessage: string | null;
}

// How long to wait after speech stops before sending to AI (in ms)
const SILENCE_THRESHOLD_MS = 3000;

export function useVoice(): UseVoiceReturn {
  const { addMessage, sessionId, level, language } = useChatStore();
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isSupported, setIsSupported] = useState(false);
  const [isCallMode, setIsCallMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Keep refs for active state tracking to avoid closures in event listeners
  const isCallModeRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>("idle");
  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Call Mode: accumulate speech across multiple interim results
  const accumulatedTextRef = useRef<string>("");
  const lastSpeechTimeRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Microphone volume analyser refs
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  // Helper: send accumulated transcript to AI via WebSocket
  const sendTranscriptToSocket = useCallback((transcript: string) => {
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
  }, [addMessage, level, language]);

  // Start the VAD silence timer — fires when user has been quiet for SILENCE_THRESHOLD_MS
  const startSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
    }
    silenceTimerRef.current = setInterval(() => {
      const lastSpeech = lastSpeechTimeRef.current;
      if (!lastSpeech) return;

      const silenceDuration = Date.now() - lastSpeech;
      if (silenceDuration >= SILENCE_THRESHOLD_MS) {
        const accumulated = accumulatedTextRef.current.trim();
        if (accumulated && isCallModeRef.current && voiceStateRef.current === "listening") {
          console.log("[Voice] Silence detected. Sending:", accumulated);
          accumulatedTextRef.current = "";
          lastSpeechTimeRef.current = null;
          if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
          sendTranscriptToSocket(accumulated);
        }
      }
    }, 500);
  }, [sendTranscriptToSocket]);

  // Real-time microphone level animation loop
  const startVolumeAnalyser = (stream: MediaStream) => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioSourceNodeRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Expose normalized volume level from 0 to 100
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setMicLevel(normalized);

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.warn("[Voice] Failed to start audio analyzer:", err);
    }
  };

  const stopVolumeAnalyser = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioSourceNodeRef.current) {
      try {
        audioSourceNodeRef.current.disconnect();
      } catch (e) {}
      audioSourceNodeRef.current = null;
    }
    analyserRef.current = null;
    setMicLevel(0);
  };

  // Safe wrapper to start listening
  const triggerNextListen = useCallback(() => {
    if (!isSupported) return;
    if (voiceStateRef.current === "thinking" || (voiceStateRef.current === "listening" && recognitionRef.current)) {
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

    // en-US has broad compatibility; fallback from regional dialects
    recognition.lang = language === "Hindi" ? "hi-IN" : language === "Telugu" ? "te-IN" : "en-US";

    if (isCallModeRef.current) {
      recognition.continuous = true;
      recognition.interimResults = true;
    } else {
      recognition.continuous = false;
      recognition.interimResults = false;
    }

    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      if (voiceStateRef.current !== "speaking") {
        setVoiceState("listening");
      }
    };

    recognition.onresult = (event) => {
      if (isCallModeRef.current) {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          } else {
            interimTranscript += event.results[i][0].transcript + " ";
          }
        }

        const speech = (finalTranscript + interimTranscript).trim();

        // Any captured speech resets the silence timer
        if (speech.length > 0) {
          lastSpeechTimeRef.current = Date.now();

          // DUPLEX INTERRUPTION: Stop AI playback instantly if user starts speaking
          if (voiceStateRef.current === "speaking") {
            console.log("[Voice] User speech detected during mentor playback. Interrupting.");
            if (activeAudioSourceRef.current) {
              try {
                activeAudioSourceRef.current.stop();
              } catch (e) {}
              activeAudioSourceRef.current = null;
            }
            setVoiceState("listening");
            accumulatedTextRef.current = "";
          }
        }

        if (finalTranscript.trim()) {
          accumulatedTextRef.current = (accumulatedTextRef.current + " " + finalTranscript).trim();
        }
      } else {
        // Push-to-talk: send transcript immediately on final result
        const transcript = event.results[0][0].transcript.trim();
        if (!transcript) return;
        sendTranscriptToSocket(transcript);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        console.warn("[Voice] SpeechRecognition status: no speech detected.");
        if (voiceStateRef.current !== "speaking") {
          setVoiceState("idle");
        }
      } else {
        console.warn("[Voice] SpeechRecognition error:", event.error);
        setErrorMessage(`Microphone error: ${event.error}`);
        setVoiceState("error");
        setTimeout(() => setVoiceState("idle"), 3000);
      }
    };

    recognition.onend = () => {
      if (isCallModeRef.current && (voiceStateRef.current === "listening" || voiceStateRef.current === "idle" || voiceStateRef.current === "speaking")) {
        const nextState = voiceStateRef.current === "speaking" ? "speaking" : "idle";
        setVoiceState(nextState);

        setTimeout(() => {
          if (isCallModeRef.current && (voiceStateRef.current === "idle" || voiceStateRef.current === "speaking")) {
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
  }, [isSupported, language, level, sendTranscriptToSocket]);

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
    setVoiceState("thinking");

    // Clear accumulations
    accumulatedTextRef.current = "";
    lastSpeechTimeRef.current = null;

    // Capture microphone stream for volume analyser
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        micStreamRef.current = stream;
        startVolumeAnalyser(stream);
        // Start VAD silence monitor
        startSilenceTimer();
        // Begin listening after brief delay for WS to be ready
        setTimeout(() => triggerNextListen(), 200);
      })
      .catch((err) => {
        console.error("[Voice] Microphone capture failed:", err);
        setErrorMessage("Microphone permission denied. Enable microphone access in browser settings.");
      });

    // Send start_call greeting trigger to backend
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "start_call", language }));
    } else {
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "start_call", language }));
        } else {
          setErrorMessage("Failed to connect to mentor voice line.");
          setVoiceState("error");
        }
      }, 1000);
    }
  }, [language, startSilenceTimer, triggerNextListen]);

  const endCall = useCallback(() => {
    setIsCallMode(false);
    setVoiceState("idle");

    // Stop silence timer
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Stop volume analyser and release mic stream
    stopVolumeAnalyser();
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

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
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
      stopVolumeAnalyser();
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
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
    micLevel,
    startListening,
    stopListening,
    startCall,
    endCall,
    errorMessage,
  };
}
