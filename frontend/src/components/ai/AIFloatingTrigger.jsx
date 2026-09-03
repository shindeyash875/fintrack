import React from 'react';
import { Sparkles, Bot } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const AIFloatingTrigger = () => {
  const { openGlobalAIChat, isGlobalAIChatOpen } = useUIStore();

  if (isGlobalAIChatOpen) return null;

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 group">
      <button
        onClick={openGlobalAIChat}
        type="button"
        aria-label="Open AI Financial Advisor"
        className="relative flex items-center gap-2.5 px-4 py-3 sm:px-4.5 sm:py-3.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-semibold shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 hover:scale-105 active:scale-95 transition-all duration-200 border border-emerald-400/30"
      >
        {/* Pulsing ring */}
        <span className="absolute -inset-1 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />

        <div className="relative flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-emerald-100 animate-pulse" />
        </div>

        <span className="text-xs sm:text-sm tracking-wide font-bold">Ask AI Advisor</span>

        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full text-[9px] uppercase font-extrabold bg-white/20 text-emerald-100 border border-white/30">
          AI
        </span>
      </button>
    </div>
  );
};
