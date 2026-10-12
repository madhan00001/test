import React from 'react';
import {
  Brain,
  Code2,
  Database,
  Lightbulb,
  FileSearch,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { PersonaConfig } from '../types';

interface WelcomeScreenProps {
  onSelectPrompt: (promptText: string) => void;
  persona: PersonaConfig;
  activeDocCount: number;
}

const STARTER_PROMPTS = [
  {
    category: 'Document RAG',
    icon: Database,
    title: 'Summarize Knowledge Base',
    prompt: 'Summarize the core capabilities and architecture outlined in my indexed documents.',
    color: 'text-indigo-400 group-hover:text-indigo-300',
    border: 'hover:border-indigo-500/50',
    bg: 'bg-indigo-950/20',
  },
  {
    category: 'Code Architecture',
    icon: Code2,
    title: 'Build a Reactive State Hook',
    prompt: 'Write a custom TypeScript React hook for managing undo/redo state with immutability and unit test cases.',
    color: 'text-emerald-400 group-hover:text-emerald-300',
    border: 'hover:border-emerald-500/50',
    bg: 'bg-emerald-950/20',
  },
  {
    category: 'Analysis & Strategy',
    icon: FileSearch,
    title: 'Analyze Vector Embeddings',
    prompt: 'Compare dense vector semantic search against BM25 keyword search for technical document retrieval. What are the key tradeoffs?',
    color: 'text-cyan-400 group-hover:text-cyan-300',
    border: 'hover:border-cyan-500/50',
    bg: 'bg-cyan-950/20',
  },
  {
    category: 'Creative Brainstorm',
    icon: Lightbulb,
    title: 'Design an AI Workflow',
    prompt: 'Design an autonomous multi-agent pipeline for automated code review, security audits, and release note generation.',
    color: 'text-fuchsia-400 group-hover:text-fuchsia-300',
    border: 'hover:border-fuchsia-500/50',
    bg: 'bg-fuchsia-950/20',
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectPrompt,
  persona,
  activeDocCount,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 text-center max-w-4xl mx-auto w-full select-none">
      {/* Animated Brand Aura */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-indigo-400 flex items-center justify-center shadow-2xl shadow-indigo-500/30 ring-1 ring-white/20 animate-pulse">
          <Brain className="w-10 h-10 text-white" />
        </div>
        <div className="absolute -inset-2 rounded-3xl bg-indigo-500/20 blur-xl -z-10" />
      </div>

      {/* Main Title */}
      <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
        How can <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-300 to-white">Maddy AI</span> assist you?
      </h2>

      <p className="text-xs md:text-sm text-slate-400 mt-2 max-w-lg leading-relaxed">
        Active Persona: <strong className="text-indigo-300">{persona.name}</strong> ({persona.tagline}).
        {activeDocCount > 0 ? (
          <span className="text-emerald-400 ml-1">
            • Grounded in {activeDocCount} active document{activeDocCount > 1 ? 's' : ''}.
          </span>
        ) : (
          <span className="text-slate-500 ml-1">
            • No documents linked yet.
          </span>
        )}
      </p>

      {/* Prompt Starter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-8 w-full text-left">
        {STARTER_PROMPTS.map((starter, idx) => {
          const Icon = starter.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(starter.prompt)}
              className={`group p-4 rounded-2xl bg-slate-900/60 border border-slate-800 ${starter.border} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl ${starter.bg} ${starter.color} border border-white/5`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {starter.category}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                  {starter.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {starter.prompt}
                </p>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 group-hover:text-indigo-400 mt-3 transition">
                <span>Ask this</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Feature pill highlights */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-8 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Local isolated RAG indexing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Streaming Gemini 3.8 Flash</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>Source-grounded citations</span>
        </div>
      </div>
    </div>
  );
};
