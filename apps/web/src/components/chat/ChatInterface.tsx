"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { Send, User, Bot, Loader2 } from 'lucide-react';

export default function ChatInterface() {
  const { messages, addMessage, isTyping, setTyping, sessionId } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userMsg });
    setTyping(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMsg,
          language: 'English'
        })
      });

      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      addMessage({ role: 'assistant', content: data.response });
    } catch (error) {
      console.error('Failed to send message:', error);
      addMessage({ role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' });
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">ResearchMind Mentor</h2>
          <p className="text-sm text-gray-500">Your AI Academic Advisor</p>
        </div>
        <div className="flex items-center space-x-2">
           <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
           <span className="text-xs text-gray-500">Online</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <Bot className="w-12 h-12 text-blue-500 opacity-50" />
            <p className="text-gray-500 dark:text-gray-400">
              Hello! I am ResearchMind AI, your academic mentor.<br/>
              How can I assist you with your research today?
            </p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-tl-none shadow-sm'}`}>
                <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-none">
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
              <span className="text-sm text-gray-500 font-medium">Researching...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center space-x-2 relative"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your research question..."
            className="flex-1 p-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm text-gray-800 dark:text-gray-200"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
      
    </div>
  );
}
