import React, { useState } from 'react';
import {
  Brain,
  User,
  Volume2,
  VolumeX,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';
import { ChatMessage } from '../types';
import { Markdown } from './Markdown';
import { CopyButton } from './CopyButton';

interface MessageProps {
  message: ChatMessage;
  isLatest: boolean;
  isStreaming: boolean;
  onRegenerate?: () => void;
  speechEnabled: boolean;
}

export const Message: React.FC<MessageProps> = ({
  message,
  isLatest,
  isStreaming,
  onRegenerate,
  speechEnabled,
}) => {
  const isUser = message.role === 'user';
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown before speaking
    const cleanText = message.content
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/[#*_~`>]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      className={`group w-full py-4 px-4 md:px-6 transition-colors ${
        isUser ? 'bg-transparent' : 'bg-slate-900/40 border-y border-slate-800/40'
      }`}
    >
      <div className="max-w-4xl mx-auto flex gap-3.5 md:gap-4 items-start">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 shadow-sm">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-400 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 ring-1 ring-white/10">
              <Brain className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                {isUser ? 'You' : 'Maddy AI'}
              </span>
              {!isUser && message.model && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  {message.model}
                </span>
              )}
              <span className="text-[10px] text-slate-500 font-mono">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Citations Pill Badge */}
            {message.citations && message.citations.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-indigo-400 flex items-center gap-1 bg-indigo-950/50 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
                  <Layers className="w-3 h-3 text-indigo-400" />
                  <span>
                    {message.citations.length} Source{message.citations.length > 1 ? 's' : ''} Cited
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Citations List if provided */}
          {message.citations && message.citations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5 pb-1">
              {message.citations.map((c, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono"
                >
                  📄 {c}
                </span>
              ))}
            </div>
          )}

          {/* Body */}
          <div className="text-slate-200">
            {isUser ? (
              <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed text-slate-100">
                {message.content}
              </div>
            ) : (
              <div>
                <Markdown content={message.content} />
                {isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />
                )}
              </div>
            )}
          </div>

          {/* Assistant Action Bar */}
          {!isUser && !isStreaming && (
            <div className="flex items-center gap-1 pt-1 opacity-70 group-hover:opacity-100 transition">
              <CopyButton text={message.content} />

              {speechEnabled && (
                <button
                  onClick={handleSpeak}
                  className={`p-1.5 rounded-md text-xs transition ${
                    isPlayingAudio
                      ? 'text-indigo-400 bg-indigo-950/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={isPlayingAudio ? 'Stop speaking' : 'Read aloud'}
                >
                  {isPlayingAudio ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              {isLatest && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition"
                  title="Regenerate response"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                className={`p-1.5 rounded-md text-xs transition ${
                  feedback === 'up'
                    ? 'text-emerald-400 bg-emerald-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Helpful response"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                className={`p-1.5 rounded-md text-xs transition ${
                  feedback === 'down'
                    ? 'text-rose-400 bg-rose-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Not helpful"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
