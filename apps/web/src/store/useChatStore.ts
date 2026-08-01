import { create } from 'zustand';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

interface ChatState {
  messages: Message[];
  sessionId: string;
  isTyping: boolean;
  addMessage: (message: Message) => void;
  setTyping: (typing: boolean) => void;
  setSessionId: (id: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  sessionId: Math.random().toString(36).substring(7),
  isTyping: false,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setTyping: (typing) => set({ isTyping: typing }),
  setSessionId: (id) => set({ sessionId: id }),
}));
