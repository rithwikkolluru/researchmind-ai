import { create } from "zustand";

export type StudentLevel = "btech" | "mtech" | "phd";
export type Language = "English" | "Hindi" | "Telugu";

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

  addMessage: (message: Omit<Message, "timestamp">) => void;
  setTyping: (typing: boolean) => void;
  setLevel: (level: StudentLevel) => void;
  setLanguage: (language: Language) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  sessionId: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  isTyping: false,
  level: "btech",
  language: "English",

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...message, timestamp: Date.now() },
      ],
    })),

  setTyping: (typing) => set({ isTyping: typing }),
  setLevel: (level) => set({ level }),
  setLanguage: (language) => set({ language }),
  clearMessages: () => set({ messages: [] }),
}));
