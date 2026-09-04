import React from 'react';
import { Sparkles } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const AIFloatingTrigger = () => {
  const { openGlobalAIChat, isGlobalAIChatOpen } = useUIStore();

  if (isGlobalAIChatOpen) return null;

  return (
    <div className="fixed bottom-20 right-3.5 sm:bottom-20 sm:right-5 lg:bottom-6 lg:right-6 z-30 group">
      {/* Holographic Glowing Ambient Halo */}
      <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-violet-500 opacity-60 dark:opacity-75 blur-md animate-holographic group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Main Trigger Button */}
      <button
        onClick={openGlobalAIChat}
        type="button"
        aria-label="Open AI Financial Advisor"
        className="relative flex items-center gap-2 sm:gap-2.5 px-3.5 py-2.5 sm:px-4.5 sm:py-3.5 rounded-full bg-slate-900/90 text-white font-semibold shadow-xl shadow-emerald-950/50 hover:shadow-2xl hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all duration-200 border border-emerald-400/50 backdrop-blur-xl cursor-pointer overflow-hidden"
      >
        {/* Subtle Shimmer Ray */}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

        <div className="relative flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
          </div>
        </div>

        <span className="text-xs sm:text-sm tracking-wide font-bold font-['Outfit'] text-white">
          <span className="inline sm:hidden">Ask AI</span>
          <span className="hidden sm:inline">Ask AI Advisor</span>
        </span>

        <span className="px-1.5 py-0.5 rounded-full text-[9px] uppercase font-extrabold bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
          Copilot
        </span>
      </button>
    </div>
  );
};

export default AIFloatingTrigger;
