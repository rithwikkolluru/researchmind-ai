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
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useChatStore } from "@/store/useChatStore";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

interface UseVoiceReturn {
  voiceState: VoiceState;
  isSupported: boolean;
  isCallMode: boolean;
  micLevel: number;
  startListening: () => void;
  stopListening: () => void;
  startCall: () => void;
  endCall: () => void;
  errorMessage: string | null;
}

const SILENCE_THRESHOLD_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 30000;

export function useVoice(): UseVoiceReturn {
  const { addMessage, sessionId, level, language } = useChatStore();
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isSupported, setIsSupported] = useState(false);
  const [isCallMode, setIsCallMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountedRef = useRef(false);

  const isCallModeRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>("idle");
  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const pendingAudioQueueRef = useRef<string[]>([]);

  const accumulatedTextRef = useRef<string>("");
  const lastSpeechTimeRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    isCallModeRef.current = isCallMode;
  }, [isCallMode]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const supported = Boolean(SpeechRecognition);
    setIsSupported(supported);
    if (!supported) {
      setErrorMessage("Speech recognition is unavailable in this browser. Use Chrome/Edge or type your question instead.");
    }
  }, []);

  const interruptAudioPlayback = useCallback(() => {
    pendingAudioQueueRef.current = [];

    if (activeAudioSourceRef.current) {
      try {
        activeAudioSourceRef.current.onended = null;
        activeAudioSourceRef.current.stop();
      } catch (error) {
        console.warn("[Voice] Failed to stop active TTS source", error);
      }
      activeAudioSourceRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state === "running") {
      void audioContextRef.current.suspend();
    }
  }, []);

  const stopVolumeAnalyser = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioSourceNodeRef.current) {
      try {
        audioSourceNodeRef.current.disconnect();
      } catch (error) {
        console.warn("[Voice] Failed to disconnect audio source", error);
      }
      audioSourceNodeRef.current = null;
    }
    analyserRef.current = null;
    setMicLevel(0);
  }, []);

  const playBase64Audio = useCallback(async (base64Data: string): Promise<void> => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContext();
      }

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      const ctx = audioContextRef.current;
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }

      const buffer = await ctx.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      activeAudioSourceRef.current = source;

      return await new Promise<void>((resolve) => {
        source.onended = () => {
          activeAudioSourceRef.current = null;
          resolve();
        };
        source.start(0);
      });
    } catch (error) {
      console.error("[Voice] Audio playback error:", error);
    }
  }, []);

  const flushAudioQueue = useCallback(async () => {
    while (pendingAudioQueueRef.current.length > 0) {
      const nextChunk = pendingAudioQueueRef.current.shift();
      if (!nextChunk) break;
      setVoiceState("speaking");
      await playBase64Audio(nextChunk);
    }

    setVoiceState("idle");
    if (isCallModeRef.current) {
      setTimeout(() => {
        if (isCallModeRef.current) {
          if (recognitionRef.current && voiceStateRef.current !== "thinking") {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.warn("[Voice] Could not restart recognition after TTS", error);
            }
          }
        }
      }, 150);
    }
  }, [playBase64Audio]);

  const connectSocket = useCallback(() => {
    const wsBase = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000").replace(/^http/, "ws").replace(/\/$/, "");
    const wsUrl = `${wsBase}/api/voice/ws/${sessionId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setErrorMessage(null);
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "thinking") {
          setVoiceState("thinking");
          return;
        }

        if (msg.type === "response") {
          addMessage({ role: "assistant", content: msg.text });
          return;
        }

        if (msg.type === "audio") {
          pendingAudioQueueRef.current.push(msg.data);
          if (pendingAudioQueueRef.current.length === 1) {
            void flushAudioQueue();
          }
          return;
        }

        if (msg.type === "error") {
          console.warn("[Voice] Server error:", msg.message);
          setErrorMessage(msg.message || "Voice connection error");
          setVoiceState("error");
          setTimeout(() => {
            setVoiceState("idle");
          }, 3000);
        }
      } catch (error) {
        console.error("[Voice] Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = () => {
      setErrorMessage("Could not connect to the voice server. Is the backend running?");
      setVoiceState("error");
    };

    ws.onclose = () => {
      if (isUnmountedRef.current) return;
      const delay = Math.min(MAX_RECONNECT_DELAY_MS, 500 * 2 ** reconnectAttemptsRef.current);
      reconnectAttemptsRef.current += 1;
      setErrorMessage(`Voice connection dropped. Reconnecting in ${Math.round(delay / 1000)}s...`);
      reconnectTimerRef.current = window.setTimeout(() => {
        connectSocket();
      }, delay);
    };
  }, [addMessage, flushAudioQueue, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    connectSocket();
    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectSocket, sessionId]);

  const sendTranscriptToSocket = useCallback(
    (transcript: string) => {
      addMessage({ role: "user", content: transcript });

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "transcript",
            text: transcript,
            level,
            language,
          }),
        );
        setVoiceState("thinking");
      } else {
        setErrorMessage("Voice connection lost. Reconnecting...");
        setVoiceState("error");
      }
    },
    [addMessage, language, level],
  );

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
          accumulatedTextRef.current = "";
          lastSpeechTimeRef.current = null;
          if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
          sendTranscriptToSocket(accumulated);
        }
      }
    }, 500);
  }, [sendTranscriptToSocket]);

  const startVolumeAnalyser = useCallback((stream: MediaStream) => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContext();
      }

      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      audioSourceNodeRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let index = 0; index < bufferLength; index += 1) {
          sum += dataArray[index];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setMicLevel(normalized);
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (error) {
      console.warn("[Voice] Failed to start audio analyser:", error);
    }
  }, []);

  const triggerNextListen = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("Speech recognition is unavailable in this browser. Please use text input or Chrome/Edge.");
      setVoiceState("error");
      return;
    }

    if (voiceStateRef.current === "thinking" || (voiceStateRef.current === "listening" && recognitionRef.current)) {
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    } catch (error) {
      console.warn("[Voice] Could not stop previous recognition", error);
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === "Hindi" ? "hi-IN" : language === "Telugu" ? "te-IN" : "en-US";
    recognition.maxAlternatives = 1;
    recognition.continuous = Boolean(isCallModeRef.current);
    recognition.interimResults = Boolean(isCallModeRef.current);
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      if (voiceStateRef.current !== "speaking") {
        setVoiceState("listening");
      }
    };

    recognition.onresult = (event: any) => {
      if (isCallModeRef.current) {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcriptChunk = result[0].transcript.trim();
          if (result.isFinal) {
            finalTranscript += `${transcriptChunk} `;
          } else if (transcriptChunk) {
            interimTranscript += `${transcriptChunk} `;
          }
        }

        const speech = `${finalTranscript}${interimTranscript}`.trim();
        if (speech.length > 0) {
          lastSpeechTimeRef.current = Date.now();

          if (voiceStateRef.current === "speaking") {
            interruptAudioPlayback();
            setVoiceState("listening");
            accumulatedTextRef.current = "";
          }
        }

        if (finalTranscript.trim()) {
          accumulatedTextRef.current = (accumulatedTextRef.current + " " + finalTranscript).trim();
        }
      } else {
        const transcript = event.results[0][0].transcript.trim();
        if (transcript) {
          sendTranscriptToSocket(transcript);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") {
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
      if (isCallModeRef.current) {
        const shouldResume = voiceStateRef.current === "idle" || voiceStateRef.current === "listening";
        setVoiceState(shouldResume ? "idle" : voiceStateRef.current);
        setTimeout(() => {
          if (isCallModeRef.current && !voiceStateRef.current.includes("speaking" as any)) {
            triggerNextListen();
          }
        }, 250);
      } else if (voiceStateRef.current === "listening") {
        setVoiceState("idle");
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.warn("[Voice] Start error:", error);
    }
  }, [interruptAudioPlayback, language, sendTranscriptToSocket]);

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
      } catch (error) {
        console.warn("[Voice] Could not stop recognition", error);
      }
    }
    setVoiceState("idle");
  }, [isCallMode]);

  const startCall = useCallback(() => {
    setIsCallMode(true);
    setErrorMessage(null);
    setVoiceState("thinking");
    accumulatedTextRef.current = "";
    lastSpeechTimeRef.current = null;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        micStreamRef.current = stream;
        startVolumeAnalyser(stream);
        startSilenceTimer();
        setTimeout(() => triggerNextListen(), 200);
      })
      .catch((error) => {
        console.error("[Voice] Microphone capture failed:", error);
        setErrorMessage("Microphone permission denied. Enable microphone access in your browser settings.");
      });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "start_call", language }));
    }
  }, [language, startSilenceTimer, startVolumeAnalyser, triggerNextListen]);

  const endCall = useCallback(() => {
    setIsCallMode(false);
    setVoiceState("idle");

    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    stopVolumeAnalyser();
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (error) {
        console.warn("[Voice] Failed to abort recognition on endCall", error);
      }
    }

    interruptAudioPlayback();
  }, [interruptAudioPlayback, stopVolumeAnalyser]);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
      }
      stopVolumeAnalyser();
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.warn("[Voice] Cleanup abort error", error);
        }
      }
      interruptAudioPlayback();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [interruptAudioPlayback, stopVolumeAnalyser]);

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
