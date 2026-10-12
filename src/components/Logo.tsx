import React from 'react';
import { Sparkles, Brain } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showSubtitle = true }) => {
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div className="flex items-center gap-2.5 group select-none">
      <div className="relative">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-105">
          <Brain className={`${iconSize} text-white transition-transform duration-300 group-hover:rotate-6`} />
        </div>
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-1 ring-slate-900"></span>
        </span>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight text-white ${textSize} bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200`}>
            Maddy AI
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            PRO
          </span>
        </div>
        {showSubtitle && (
          <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">
            Knowledge & Reasoning System
          </p>
        )}
      </div>
    </div>
  );
};
