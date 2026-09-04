import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * 3D Isometric Rotating Gold/Emerald Coin Component
 * Uses native CSS 3D transforms (preserve-3d, translateZ, rotateY)
 * @param {'sm' | 'md' | 'lg'} size
 * @param {'gold' | 'emerald'} variant
 * @param {boolean} isInteractive - Accelerates spin on hover
 */
export const Coin3D = ({ 
  size = 'md', 
  variant = 'gold', 
  isInteractive = true,
  className = '' 
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', text: 'text-xs', border: 'border' },
    md: { box: 'w-10 h-10', text: 'text-base font-bold', border: 'border-2' },
    lg: { box: 'w-16 h-16', text: 'text-2xl font-black', border: 'border-2' },
  };

  const selectedSize = sizeMap[size] || sizeMap.md;
  const isGold = variant === 'gold';

  return (
    <div 
      className={`perspective-600 inline-block select-none ${className}`}
      title="3D Wealth Coin"
    >
      <div
        className={`relative ${selectedSize.box} preserve-3d animate-coin-spin ${
          isInteractive ? 'hover:[animation-duration:2.5s]' : ''
        } transition-transform duration-300`}
      >
        {/* Front Face */}
        <div
          className={`absolute inset-0 rounded-full flex items-center justify-center backface-hidden translate-z-10 shadow-lg ${
            isGold
              ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-amber-950 border-amber-200/90 shadow-amber-500/30'
              : 'bg-gradient-to-br from-emerald-300 via-emerald-400 to-emerald-600 text-emerald-950 border-emerald-200/90 shadow-emerald-500/30'
          } ${selectedSize.border}`}
        >
          {/* Inner ring */}
          <div className="w-4/5 h-4/5 rounded-full border border-dashed border-amber-900/20 dark:border-amber-900/40 flex items-center justify-center">
            <span className={`${selectedSize.text} font-['Outfit'] drop-shadow-xs`}>
              ₹
            </span>
          </div>
          {/* Specular highlight */}
          <div className="absolute top-1 left-2 w-2 h-1 bg-white/60 rounded-full blur-[0.5px] rotate-[-30deg]" />
        </div>

        {/* 3D Rim / Middle Depth layer */}
        <div
          className={`absolute inset-0 rounded-full ${
            isGold ? 'bg-amber-600' : 'bg-emerald-700'
          }`}
        />

        {/* Back Face */}
        <div
          className={`absolute inset-0 rounded-full flex items-center justify-center backface-hidden rotate-y-180 translate-z-10 shadow-lg ${
            isGold
              ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 text-amber-950 border-amber-300/80 shadow-amber-500/30'
              : 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 text-emerald-950 border-emerald-300/80 shadow-emerald-500/30'
          } ${selectedSize.border}`}
        >
          <div className="w-4/5 h-4/5 rounded-full border border-dashed border-amber-900/20 flex items-center justify-center">
            <Sparkles className="w-1/2 h-1/2 text-amber-950/80 drop-shadow-xs" />
          </div>
          <div className="absolute top-1 left-2 w-2 h-1 bg-white/50 rounded-full blur-[0.5px] rotate-[-30deg]" />
        </div>
      </div>
    </div>
  );
};

export default Coin3D;
