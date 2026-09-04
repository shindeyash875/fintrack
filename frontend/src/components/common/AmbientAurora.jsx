import React from 'react';

/**
 * AmbientAurora component creates a mesmerizing, slow-morphing
 * ambient gradient aura in the background with zero CPU lag.
 */
export const AmbientAurora = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden -z-10 select-none opacity-80 dark:opacity-90"
      aria-hidden="true"
    >
      {/* Orb 1: Emerald & Cyan Dream (Top-Left) */}
      <div
        className="absolute -top-32 -left-32 w-[32rem] sm:w-[45rem] h-[32rem] sm:h-[45rem] rounded-full bg-gradient-to-br from-emerald-400/20 via-teal-400/15 to-cyan-500/5 dark:from-emerald-500/12 dark:via-teal-500/10 dark:to-transparent blur-[90px] sm:blur-[120px] animate-aurora-1"
      />

      {/* Orb 2: Cosmic Indigo & Electric Violet (Top-Right) */}
      <div
        className="absolute -top-24 -right-24 w-[30rem] sm:w-[42rem] h-[30rem] sm:h-[42rem] rounded-full bg-gradient-to-bl from-indigo-400/15 via-purple-400/12 to-pink-500/5 dark:from-indigo-600/16 dark:via-purple-600/10 dark:to-transparent blur-[90px] sm:blur-[120px] animate-aurora-2"
      />

      {/* Orb 3: Warm Ambient Glow (Bottom-Right / Center) */}
      <div
        className="absolute top-1/2 left-1/3 w-[26rem] sm:w-[38rem] h-[26rem] sm:h-[38rem] rounded-full bg-gradient-to-tr from-teal-300/10 via-emerald-300/10 to-transparent dark:from-emerald-900/15 dark:via-teal-900/10 dark:to-transparent blur-[80px] sm:blur-[100px] animate-aurora-1"
      />

      {/* Subtle Dot Matrix Pattern overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-15 dark:opacity-20 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
    </div>
  );
};

export default AmbientAurora;
