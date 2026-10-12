import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Paperclip,
  Mic,
  MicOff,
  Sparkles,
  Database,
  CornerDownLeft,
} from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  isStreaming: boolean;
  onStopGeneration: () => void;
  onOpenDocuments: () => void;
  activeDocCount: number;
  model: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isStreaming,
  onStopGeneration,
  onOpenDocuments,
  activeDocCount,
  model,
}) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [text]);

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setText((prev) => (prev ? prev + ' ' + transcript : transcript));
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleToggleVoice = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Speech error:', err);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || isStreaming) return;
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 pt-2">
      <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
        {/* Input Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Maddy AI anything, analyze code, or query documents..."
          rows={1}
          className="w-full bg-transparent px-4 pt-3.5 pb-12 text-sm md:text-base text-slate-100 placeholder-slate-500 resize-none outline-none max-h-48"
        />

        {/* Toolbar: Attachments, Voice, Stop/Send */}
        <div className="absolute left-3 right-3 bottom-2.5 flex items-center justify-between pointer-events-none">
          {/* Left tools: Knowledge Base trigger & Voice */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={onOpenDocuments}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                activeDocCount > 0
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Ground chat with Knowledge Base documents"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span className="text-[11px]">
                {activeDocCount > 0 ? `${activeDocCount} docs linked` : 'Add Context'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-1.5 rounded-lg transition ${
                isRecording
                  ? 'bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isRecording ? 'Stop recording' : 'Dictate with voice'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Right tools: Status badge & Send/Stop */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded-md bg-slate-950/60 border border-slate-800">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>{model}</span>
            </span>

            {isStreaming ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim()}
                className="flex items-center justify-center p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 shadow-lg shadow-indigo-600/30 transition disabled:shadow-none"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Under-input info */}
      <div className="flex items-center justify-between px-2 pt-1.5 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <CornerDownLeft className="w-3 h-3 text-slate-400" />
          <span>Press Enter to send, Shift + Enter for new line</span>
        </span>
        <span>Maddy AI can synthesize documents & reasoning</span>
      </div>
    </div>
  );
};
