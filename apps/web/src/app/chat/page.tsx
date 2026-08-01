import React from 'react';
import ChatInterface from '@/components/chat/ChatInterface';

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col pt-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            ResearchMind AI
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Your personalized learning and research assistant.
          </p>
        </div>
        <ChatInterface />
      </div>
    </main>
  );
}
