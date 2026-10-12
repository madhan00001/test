import React from 'react';
import {
  X,
  Sliders,
  Cpu,
  Sparkles,
  Bot,
  Volume2,
  RefreshCw,
  Check,
} from 'lucide-react';
import { AppSettings } from '../types';
import { PERSONAS } from '../config/personas';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetSettings: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Maddy AI Configuration</h2>
              <p className="text-xs text-slate-400">
                Persona instructions, model behavior, and reasoning parameters.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Persona selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Active Persona
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {PERSONAS.map((p) => {
                const isSelected = settings.persona === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => onUpdateSettings({ persona: p.id })}
                    className={`text-left p-3 rounded-xl border transition ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/70 shadow-sm ring-1 ring-indigo-500/30'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{p.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <p className="text-[11px] text-indigo-300/80 font-medium mt-0.5">{p.tagline}</p>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom System Prompt override */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-400" />
                Custom System Instructions (Optional)
              </span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">
                Overrides preset persona
              </span>
            </label>
            <textarea
              rows={3}
              value={settings.customSystemPrompt}
              onChange={(e) => onUpdateSettings({ customSystemPrompt: e.target.value })}
              placeholder="e.g. Always respond in Spanish, or end every answer with a summary checklist..."
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Model selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              Foundation Model
            </label>
            <select
              value={settings.model}
              onChange={(e) => onUpdateSettings({ model: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="gemini-3.1-flash-lite">Google Gemini 3.1 Flash Lite (High Speed, Generous Free Quota - Recommended)</option>
              <option value="gemini-3.8-flash">Google Gemini 3.8 Flash (Advanced Multimodal & Reasoning)</option>
              <option value="gemini-3.1-pro-preview">Google Gemini 3.1 Pro (Deep STEM Reasoning)</option>
            </select>
          </div>

          {/* Sliders: Temperature & RAG top-K */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Creativity / Temperature
                </label>
                <span className="text-xs font-mono text-indigo-400 font-bold">
                  {settings.temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={settings.temperature}
                onChange={(e) => onUpdateSettings({ temperature: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Exact & Factual (0.0)</span>
                <span>Creative (1.0)</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  RAG Chunks Retrieved (Top-K)
                </label>
                <span className="text-xs font-mono text-indigo-400 font-bold">
                  {settings.topK}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={settings.topK}
                onChange={(e) => onUpdateSettings({ topK: parseInt(e.target.value, 10) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Precise (1 chunk)</span>
                <span>Broad (5 chunks)</span>
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-xs font-semibold text-white">Voice Readout Support</p>
                <p className="text-[11px] text-slate-400">
                  Allow speech synthesis to read Maddy's answers aloud
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.speechVoice}
              onChange={(e) => onUpdateSettings({ speechVoice: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onResetSettings}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset to defaults
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/30"
          >
            Save & Done
          </button>
        </div>
      </div>
    </div>
  );
};
