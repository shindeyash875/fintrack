import React, { useState, useRef, useMemo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  Wifi, 
  RotateCw, 
  ShieldCheck, 
  Sparkles, 
  CreditCard,
  Lock,
  Unlock,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import AnimatedCounter from '../common/AnimatedCounter';

/**
 * 3D Interactive Holographic FinTrack Metal Card
 * Features real-time 3D cursor gyro tilt, specular reflection beam, 
 * and interactive 180° flip revealing Financial Health Score & security controls.
 */
export const FinTrackCard3D = ({ 
  currentMonthSpent = 0, 
  budgetStatus = null,
  className = '' 
}) => {
  const { user } = useAuthStore();
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCardLocked, setIsCardLocked] = useState(false);
  const cardRef = useRef(null);

  // Mouse tilt motion values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for high-end physical inertia
  const mouseXSpring = useSpring(x, { stiffness: 220, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 220, damping: 20 });

  // Map mouse coordinates to 3D tilt angles (-14deg to +14deg)
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['14deg', '-14deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-16deg', '16deg']);

  // Dynamic specular light reflection glint
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ['0%', '100%']);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseXFromCenter = e.clientX - rect.left - width / 2;
    const mouseYFromCenter = e.clientY - rect.top - height / 2;

    x.set(mouseXFromCenter / width);
    y.set(mouseYFromCenter / height);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const userName = useMemo(() => {
    if (user?.full_name && user.full_name.trim()) {
      return user.full_name.toUpperCase();
    }
    if (user?.email) {
      return user.email.split('@')[0].toUpperCase();
    }
    return 'VALUED MEMBER';
  }, [user]);

  // Calculate dynamic financial health credit score (300 to 900)
  const healthScore = useMemo(() => {
    if (!budgetStatus) return 780;
    const percent = Number(budgetStatus.percentage_used || 0);
    if (percent <= 50) return 880;
    if (percent <= 75) return 840;
    if (percent <= 90) return 760;
    if (percent <= 100) return 690;
    return 540;
  }, [budgetStatus]);

  const scoreBadge = useMemo(() => {
    if (healthScore >= 800) return { text: 'Tier 1 • Excellent', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' };
    if (healthScore >= 700) return { text: 'Tier 2 • Healthy', color: 'text-blue-400 bg-blue-950/60 border-blue-500/40' };
    return { text: 'Tier 3 • Caution', color: 'text-amber-400 bg-amber-950/60 border-amber-500/40' };
  }, [healthScore]);

  return (
    <div className={`perspective-1000 ${className}`}>
      {/* 3D Motion Container */}
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative w-full max-w-[380px] h-[225px] sm:h-[235px] cursor-pointer transition-shadow duration-300 group select-none"
      >
        {/* Flipping Inner Wrapper */}
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full h-full preserve-3d"
        >
          {/* ==================== FRONT FACE ==================== */}
          <div
            className="absolute inset-0 rounded-2xl p-5 sm:p-6 backface-hidden flex flex-col justify-between overflow-hidden shadow-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white"
          >
            {/* Holographic metallic background texture & sheen */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.15),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(99,102,241,0.15),transparent_60%)]" />
            <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none animate-metallic-glint" />

            {/* Top Row: Brand & Contactless Chip */}
            <div className="relative z-10 flex items-center justify-between translate-z-30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center shadow-md">
                  <Sparkles className="w-4 h-4 text-slate-950" />
                </div>
                <div>
                  <span className="text-xs font-black tracking-widest uppercase font-['Outfit'] bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    FinTrack
                  </span>
                  <span className="ml-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                    Platinum
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Wifi className="w-4 h-4 text-slate-400 rotate-90" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                  title="Flip card for health score"
                  className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-90"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Middle Row: EMV Metallic Chip & Monthly Spend Readout */}
            <div className="relative z-10 flex items-end justify-between my-auto translate-z-40">
              {/* EMV Metallic Gold Smart Chip */}
              <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-0.5 shadow-md border border-amber-300/80 flex flex-col justify-between overflow-hidden relative">
                <div className="w-full h-[1px] bg-amber-900/40 my-auto" />
                <div className="absolute inset-x-2 top-0 bottom-0 border-x border-amber-900/40" />
                <div className="w-2.5 h-2.5 rounded-full border border-amber-900/30 m-auto" />
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Month Spend
                </span>
                <p className="text-xl sm:text-2xl font-bold font-['Outfit'] text-white tracking-tight drop-shadow-sm">
                  <AnimatedCounter value={currentMonthSpent} prefix="₹" />
                </p>
              </div>
            </div>

            {/* Bottom Row: Cardholder Name, Virtual Card Number & Expiry */}
            <div className="relative z-10 flex items-end justify-between translate-z-30 pt-1 border-t border-slate-800/80">
              <div>
                <span className="text-[9px] font-semibold tracking-wider text-slate-400 uppercase block">
                  Cardholder
                </span>
                <span className="text-xs font-bold tracking-wider text-slate-200 uppercase font-mono truncate max-w-[170px] block">
                  {userName}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-mono tracking-widest text-slate-400 block">
                  •••• 8752
                </span>
                <span className="text-[10px] font-mono font-semibold text-slate-300">
                  EXP 12/29
                </span>
              </div>
            </div>
          </div>

          {/* ==================== BACK FACE ==================== */}
          <div
            className="absolute inset-0 rounded-2xl p-5 sm:p-6 backface-hidden rotate-y-180 flex flex-col justify-between overflow-hidden shadow-2xl border border-slate-700/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white"
          >
            {/* Magnetic Stripe */}
            <div className="absolute top-4 left-0 right-0 h-9 bg-slate-950 border-y border-slate-800 flex items-center px-4">
              <span className="text-[8px] font-mono tracking-widest text-slate-600 uppercase">
                FINTRACK SECURE FINANCIAL TOKEN 3D ENCRYPTED
              </span>
            </div>

            {/* CVV & Signature Area */}
            <div className="mt-10 flex items-center justify-between translate-z-30">
              <div className="h-6 w-36 bg-slate-200/90 rounded px-2 flex items-center justify-end text-[10px] font-mono font-bold text-slate-900">
                CVV <span className="ml-1 tracking-widest">••• 842</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
                className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Flip back to front"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Financial Health Score Matrix */}
            <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between translate-z-30">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Financial Health Score
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-bold font-['Outfit'] text-white">
                    {healthScore}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">/ 900</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${scoreBadge.color}`}>
                {scoreBadge.text}
              </span>
            </div>

            {/* Bottom Controls: Lock Card & Security Check */}
            <div className="flex items-center justify-between text-xs translate-z-30 pt-1">
              <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero-Liability Active</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCardLocked(!isCardLocked);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  isCardLocked
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {isCardLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                <span>{isCardLocked ? 'Card Frozen' : 'Card Active'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default FinTrackCard3D;
