import { create } from "zustand";

export type StudentLevel = "btech" | "mtech" | "phd";
export type Language = "English" | "Hindi" | "Telugu";
export type MentorMode = "default" | "teach" | "paper_discussion" | "roadmap" | "debate";

export type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
};

interface ChatState {
  messages: Message[];
  sessionId: string;
  isTyping: boolean;
  level: StudentLevel;
  language: Language;
  mode: MentorMode;
  enableQualityTracker: boolean;

  addMessage: (message: Omit<Message, "timestamp">) => void;
  setMessages: (messages: Message[]) => void;
  appendToLastMessage: (chunk: string) => void;
  setTyping: (typing: boolean) => void;
  setLevel: (level: StudentLevel) => void;
  setLanguage: (language: Language) => void;
  setMode: (mode: MentorMode) => void;
  setEnableQualityTracker: (enabled: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  sessionId: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  isTyping: false,
  level: "btech",
  language: "English",
  mode: "default",
  enableQualityTracker: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...message, timestamp: Date.now() },
      ],
    })),

  setMessages: (messages) => set({ messages }),

  appendToLastMessage: (chunk) =>
    set((state) => {
      if (state.messages.length === 0) return state;
      const updated = [...state.messages];
      const last = updated[updated.length - 1];
      updated[updated.length - 1] = {
        ...last,
        content: last.content + chunk,
      };
      return { messages: updated };
    }),

  setTyping: (typing) => set({ isTyping: typing }),
  setLevel: (level) => set({ level }),
  setLanguage: (language) => set({ language }),
  setMode: (mode) => set({ mode }),
  setEnableQualityTracker: (enabled) => set({ enableQualityTracker: enabled }),
  clearMessages: () => set({ messages: [] }),
}));
