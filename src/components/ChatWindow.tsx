import React, { useRef, useEffect, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { ChatMessage, PersonaConfig } from '../types';
import { Message } from './Message';
import { WelcomeScreen } from './WelcomeScreen';

interface ChatWindowProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (text: string) => void;
  onRegenerate: () => void;
  persona: PersonaConfig;
  activeDocCount: number;
  speechEnabled: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isStreaming,
  onSendMessage,
  onRegenerate,
  persona,
  activeDocCount,
  speechEnabled,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isUserScrolledUp = useRef(false);

  // Auto-scroll logic
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      });
      isUserScrolledUp.current = false;
      setShowScrollBottom(false);
    }
  };

  useEffect(() => {
    if (!isUserScrolledUp.current) {
      scrollToBottom('smooth');
    }
  }, [messages, isStreaming]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const scrolledUp = distanceToBottom > 120;
    isUserScrolledUp.current = scrolledUp;
    setShowScrollBottom(scrolledUp);
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-950">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto flex flex-col"
      >
        {messages.length === 0 ? (
          <WelcomeScreen
            onSelectPrompt={onSendMessage}
            persona={persona}
            activeDocCount={activeDocCount}
          />
        ) : (
          <div className="py-2 space-y-1">
            {messages.map((msg, index) => {
              const isLatest = index === messages.length - 1;
              return (
                <Message
                  key={msg.id}
                  message={msg}
                  isLatest={isLatest}
                  isStreaming={isLatest && isStreaming}
                  onRegenerate={isLatest && msg.role === 'assistant' ? onRegenerate : undefined}
                  speechEnabled={speechEnabled}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Scroll to bottom float button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-4 right-6 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl transition-all animate-bounce z-20"
          title="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
