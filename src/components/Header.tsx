import React, { useState } from 'react';
import {
  Menu,
  Sliders,
  Database,
  Download,
  Share2,
  Trash2,
  ChevronDown,
  Sparkles,
  Check,
  FileDown,
  Layers,
} from 'lucide-react';
import { Conversation, AppSettings } from '../types';
import { PERSONAS } from '../config/personas';

interface HeaderProps {
  conversation: Conversation | null;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenDocuments: () => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  onClearMessages: () => void;
  activeDocCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  conversation,
  settings,
  onUpdateSettings,
  onOpenDocuments,
  onOpenSettings,
  onToggleSidebar,
  onClearMessages,
  activeDocCount,
}) => {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const currentPersona =
    PERSONAS.find((p) => p.id === settings.persona) || PERSONAS[0];

  const handleExport = (format: 'markdown' | 'json') => {
    if (!conversation) return;
    let dataStr = '';
    let fileName = `${conversation.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${
      format === 'markdown' ? 'md' : 'json'
    }`;

    if (format === 'markdown') {
      dataStr = `# ${conversation.title}\n*Exported from Maddy AI on ${new Date().toLocaleString()}*\n\n`;
      for (const m of conversation.messages) {
        dataStr += `### ${m.role === 'user' ? 'User' : 'Maddy AI'} (${new Date(
          m.timestamp
        ).toLocaleTimeString()})\n\n${m.content}\n\n---\n\n`;
      }
    } else {
      dataStr = JSON.stringify(conversation, null, 2);
    }

    const blob = new Blob([dataStr], {
      type: format === 'markdown' ? 'text/markdown' : 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/70 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30">
      {/* Left: Mobile menu toggle + Chat Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex items-center gap-2">
          <h1 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
            {conversation?.title || 'New Conversation'}
          </h1>
        </div>
      </div>

      {/* Right: Persona dropdown, Document indicator, Export, Settings */}
      <div className="flex items-center gap-2">
        {/* Persona quick switch */}
        <div className="relative">
          <button
            onClick={() => setShowPersonaMenu(!showPersonaMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-medium hidden sm:inline">{currentPersona.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showPersonaMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowPersonaMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Switch Persona
                </div>
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onUpdateSettings({ persona: p.id });
                      setShowPersonaMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                      settings.persona === p.id
                        ? 'text-indigo-400 font-semibold bg-indigo-950/30'
                        : 'text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs">{p.name}</div>
                      <div className="text-[10px] text-slate-500">{p.tagline}</div>
                    </div>
                    {settings.persona === p.id && (
                      <Check className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Knowledge Base Doc Count Badge */}
        <button
          onClick={onOpenDocuments}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-xs text-slate-200 transition"
          title="Manage RAG Knowledge Documents"
        >
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-mono font-bold text-indigo-300">
            {activeDocCount}
          </span>
          <span className="hidden lg:inline text-slate-400">docs linked</span>
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={!conversation || conversation.messages.length === 0}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-40"
            title="Export conversation"
          >
            <Download className="w-4 h-4" />
          </button>

          {showExportMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowExportMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-44 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-40">
                <button
                  onClick={() => handleExport('markdown')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileDown className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Export as Markdown</span>
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export as JSON</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Clear messages button */}
        {conversation && conversation.messages.length > 0 && (
          <button
            onClick={onClearMessages}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            title="Clear chat messages"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Open Settings Modal */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Open settings"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
