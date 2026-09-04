import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, 
  Volume2,
  ChevronRight,
  Award
} from 'lucide-react';
import { useBudgetStore } from '../../store/useBudgetStore';
import { useUIStore } from '../../store/useUIStore';

export const FinancialMoodAvatar = ({ summary, onOpenBudgetModal, onOpenAIAdvisor }) => {
  const { status: budgetStatus, budgets } = useBudgetStore();
  const { openGlobalAIChat, openGlobalMonthlyDigest } = useUIStore();
  const [pokeCount, setPokeCount] = useState(0);
  const [isWobbling, setIsWobbling] = useState(false);
  const [useMarathiFlair, setUseMarathiFlair] = useState(false);

  // 1. Overall monthly budget limit
  const overallLimit = Number(
    summary?.overall_budget_status?.limit_amount ??
    budgetStatus?.overall?.limit_amount ??
    0
  );

  // 2. Sum of category budgets (if user configured category-level budgets)
  const categoryBudgetsSum = Array.isArray(budgetStatus?.categories) && budgetStatus.categories.length > 0
    ? budgetStatus.categories.reduce((acc, curr) => acc + Number(curr.limit_amount || 0), 0)
    : Array.isArray(budgets) && budgets.length > 0
    ? budgets.reduce((acc, curr) => acc + Number(curr.limit_amount || 0), 0)
    : 0;

  // Active budget is either overall budget or sum of category budgets
  const budget = overallLimit > 0 ? overallLimit : categoryBudgetsSum;

  // Current spent amount
  const spent = Number(
    summary?.overall_budget_status?.spent_amount ??
    budgetStatus?.overall?.spent_amount ??
    summary?.total_spent_current_month ??
    0
  );

  // Remaining budget
  const remaining = budget > 0 
    ? Number(
        summary?.overall_budget_status?.remaining_amount ??
        budgetStatus?.overall?.remaining_amount ??
        (budget - spent)
      )
    : 0;

  const daysPassed = Number(summary?.days_passed_in_month || new Date().getDate());
  const now = new Date();
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(0, totalDays - daysPassed);

  const spentRatio = budget > 0 ? (spent / budget) * 100 : 0;
  const timeRatio = (daysPassed / totalDays) * 100;

  // Derive dynamic mood state
  const mood = useMemo(() => {
    if (budget <= 0) {
      return {
        id: 'curious',
        label: 'Curious & Waiting',
        labelMr: 'बजेटची वाट पाहत आहे',
        score: 60,
        emoji: '🤔',
        secondaryEmoji: '🧐',
        theme: {
          border: 'border-purple-200 dark:border-purple-800/50',
          bg: 'from-purple-500/10 via-indigo-500/5 to-pink-500/10',
          badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          meterBg: 'bg-purple-500',
          glow: 'hover:shadow-purple-500/10',
          avatarBg: 'bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-purple-500/25',
          speechBorder: 'border-purple-200/80 dark:border-purple-800/60',
          speechBg: 'bg-purple-50/80 dark:bg-purple-950/30 text-purple-950 dark:text-purple-100',
        },
        dialoguesEn: [
          "I need a target to track! Click 'Set Budget' above so I can monitor our financial mood.",
          "A budget is telling your money where to go instead of wondering where it went!",
          "Set your monthly goal to unlock real-time financial mood swings & proactive alerts."
        ],
        dialoguesMr: [
          "मला एक बजेट टार्गेट द्या! वरच्या 'Set Budget' वर क्लिक करून बजेट सेट करा.",
          "बजेट सेट केल्यावर तुमचे पैसे कुठे खर्च होत आहेत हे मी अचूकपणे ट्रॅक करेन.",
          "महिन्याचे बजेट ठरवा आणि माझा लाइव्ह मूड कसा बदलतो ते पहा!"
        ],
        actionText: "Set Monthly Budget",
        actionType: "budget"
      };
    }

    if (spentRatio > 100) {
      const overspentAmt = Math.abs(remaining);
      return {
        id: 'panic',
        label: 'Shocked / Overspent!',
        labelMr: 'बजेट ओलांडले! सावध!',
        score: 20,
        emoji: '😱',
        secondaryEmoji: '🚨',
        theme: {
          border: 'border-rose-300 dark:border-rose-800/60 shadow-rose-500/10',
          bg: 'from-rose-500/15 via-red-500/10 to-orange-500/10',
          badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300 dark:border-rose-800',
          meterBg: 'bg-rose-500',
          glow: 'hover:shadow-rose-500/20 ring-1 ring-rose-500/20',
          avatarBg: 'bg-gradient-to-tr from-rose-600 to-red-500 shadow-rose-500/30 animate-pulse',
          speechBorder: 'border-rose-200/90 dark:border-rose-800/70',
          speechBg: 'bg-rose-50/90 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100',
        },
        dialoguesEn: [
          `Arey baap re! We exceeded our monthly limit by ₹${overspentAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}! Discretionary spending freeze recommended.`,
          "Emergency brakes on non-essentials! Let's save dining & shopping for next month.",
          "Don't worry, we can recover! Review recent spike expenses and ask AI Advisor for a recovery plan."
        ],
        dialoguesMr: [
          `अरे बापरे! आपले बजेट ₹${overspentAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ने ओलांडले गेले आहे! अनावश्यक खर्च लगेच थांबवा.`,
          "हॉटेलिंग आणि ऑनलाइन शॉपिंगवर तात्पुरती बंदी आणा, महिन्याचे काही दिवस बाकी आहेत.",
          "काळजी करू नका! AI Advisor ला रिकव्हरी प्लॅन विचारा आणि पुढील महिन्याचे नियोजन करा."
        ],
        actionText: "Ask AI for Recovery Plan",
        actionType: "advisor"
      };
    }

    if (spentRatio > 80 || (spentRatio > 70 && timeRatio < 50)) {
      return {
        id: 'nervous',
        label: 'Sweating / Tight Budget',
        labelMr: 'सावध! बजेट मर्यादा जवळ आली',
        score: 48,
        emoji: '😬',
        secondaryEmoji: '😰',
        theme: {
          border: 'border-amber-300 dark:border-amber-800/50',
          bg: 'from-amber-500/15 via-orange-500/5 to-yellow-500/10',
          badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          meterBg: 'bg-amber-500',
          glow: 'hover:shadow-amber-500/15',
          avatarBg: 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/30',
          speechBorder: 'border-amber-200/90 dark:border-amber-800/60',
          speechBg: 'bg-amber-50/90 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100',
        },
        dialoguesEn: [
          `Tight corridor! We've used ${spentRatio.toFixed(0)}% of our budget with ${daysRemaining} days remaining. ₹${remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })} left in safe reserve.`,
          "How about a 2-day 'Zero-Spend Challenge'? It will restore our buffer nicely.",
          "Slow down the throttle! Prioritize essential grocery and utilities over impulse buys."
        ],
        dialoguesMr: [
          `सावध राहा! ${daysRemaining} दिवस शिल्लक असताना आपण बजेटचे ${spentRatio.toFixed(0)}% वापरले आहे. फक्त ₹${remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })} उरले आहेत.`,
          "पुढील २ दिवस विनाकारण एकही रुपया खर्च न करण्याचे 'Zero-Spend Challenge' घेऊन पहा!",
          "फक्त आवश्यक गोष्टींवर खर्च करा, जेणेकरून महिना अखेरपर्यंत बजेट पुरेल."
        ],
        actionText: "View Forecast & Insights",
        actionType: "forecast"
      };
    }

    if (spentRatio > 55) {
      return {
        id: 'chill',
        label: 'Chill & On-Track',
        labelMr: 'संतुलित आणि योग्य ट्रॅकवर',
        score: 78,
        emoji: '😌',
        secondaryEmoji: '😎',
        theme: {
          border: 'border-sky-200 dark:border-sky-800/50',
          bg: 'from-sky-500/10 via-blue-500/5 to-cyan-500/10',
          badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
          meterBg: 'bg-sky-500',
          glow: 'hover:shadow-sky-500/15',
          avatarBg: 'bg-gradient-to-tr from-sky-500 to-blue-600 shadow-sky-500/25',
          speechBorder: 'border-sky-200/80 dark:border-sky-800/60',
          speechBg: 'bg-sky-50/80 dark:bg-sky-950/30 text-sky-950 dark:text-sky-100',
        },
        dialoguesEn: [
          `Smooth sailing! Daily spending rate is well-disciplined. You have ₹${remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })} safe runway for ${daysRemaining} days.`,
          "Everything is balanced. Stick to this rhythm and you'll close the month with good savings.",
          "Consistency is the superpower of wealth. Keep maintaining this pace!"
        ],
        dialoguesMr: [
          `उत्कृष्ट नियंत्रण! खर्च योग्य गतीने चालू आहे. पुढील ${daysRemaining} दिवसांसाठी ₹${remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })} शिल्लक आहेत.`,
          "सर्व काही नियंत्रणात आहे. याच शिस्तीने महिना संपल्यास चांगली बचत होईल.",
          "दररोजचा खर्च असाच संतुलित ठेवा, काळजीचे काहीही कारण नाही!"
        ],
        actionText: "Check Forecast",
        actionType: "forecast"
      };
    }

    // Default: Thriving / Party (< 55%)
    return {
      id: 'thriving',
      label: 'Super Happy & Thriving!',
      labelMr: 'आनंदी आणि सुरक्षित!',
      score: 95,
      emoji: '🥳',
      secondaryEmoji: '🤑',
      theme: {
        border: 'border-emerald-300 dark:border-emerald-800/60',
        bg: 'from-emerald-500/15 via-teal-500/5 to-green-500/10',
        badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        meterBg: 'bg-emerald-500',
        glow: 'hover:shadow-emerald-500/20',
        avatarBg: 'bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/30',
        speechBorder: 'border-emerald-200/90 dark:border-emerald-800/70',
        speechBg: 'bg-emerald-50/90 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100',
      },
      dialoguesEn: [
        `You are rocking your finances! Only ${spentRatio.toFixed(0)}% used with ₹${remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })} healthy surplus in hand.`,
        "Fantastic discipline! Your future self is thanking you for this surplus.",
        "Your wallet is smiling and so am I! Keep this streak alive."
      ],
      dialoguesMr: [
        `अप्रतिम आर्थिक नियोजन! फक्त ${spentRatio.toFixed(0)}% खर्च झाला आहे आणि ₹${remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })} चा मोठा सरप्लस शिल्लक आहे.`,
        "तुमच्या पैशांची बचत उत्तम होत आहे! तुमचा खिसा आणि मन दोन्ही सुरक्षित आहेत.",
        "अशीच बचत चालू ठेवा, महिन्याअखेर मोठी रक्कम शिल्लक राहील!"
      ],
      actionText: "Explore AI Forecast",
      actionType: "forecast"
    };
  }, [budget, spent, remaining, daysRemaining, spentRatio, timeRatio]);

  // Handle Mascot Poke
  const handlePoke = () => {
    setIsWobbling(true);
    setPokeCount((prev) => prev + 1);
    setTimeout(() => setIsWobbling(false), 600);
  };

  const activeDialogueList = useMarathiFlair ? mood.dialoguesMr : mood.dialoguesEn;
  const currentDialogue = activeDialogueList[pokeCount % activeDialogueList.length];

  const handleActionClick = () => {
    if (mood.actionType === 'budget' && onOpenBudgetModal) {
      onOpenBudgetModal();
    } else if (mood.actionType === 'advisor') {
      if (onOpenAIAdvisor) onOpenAIAdvisor();
      else openGlobalAIChat();
    } else if (mood.actionType === 'forecast') {
      const el = document.getElementById('ai-forecast');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const el = document.getElementById('ai-forecast');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 bg-gradient-to-br ${mood.theme.bg} ${mood.theme.border} shadow-sm ${mood.theme.glow} transition-all duration-300`}
    >
      {/* Background ambient decorative shapes */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-36 h-36 rounded-full bg-white/40 dark:bg-white/5 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-8 w-32 h-32 rounded-full bg-purple-500/5 blur-xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left: Avatar Character & Mood Meter */}
        <div className="flex items-center gap-3.5 sm:gap-4 shrink-0">
          {/* Animated Avatar Button */}
          <button
            type="button"
            onClick={handlePoke}
            title="Click to poke Finny the Mascot!"
            className={`relative group flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${mood.theme.avatarBg} text-white shadow-lg cursor-pointer transform transition-transform duration-200 hover:scale-105 active:scale-95 ${
              isWobbling ? 'animate-bounce' : ''
            }`}
          >
            <span className="text-3xl sm:text-4xl filter drop-shadow-md transition-transform duration-200 group-hover:scale-110 select-none">
              {isWobbling ? mood.secondaryEmoji : mood.emoji}
            </span>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${mood.theme.meterBg} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-4 w-4 ${mood.theme.meterBg} border-2 border-white dark:border-slate-900`}></span>
            </span>
          </button>

          {/* Mood Label & Sentiment Health Score */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-['Outfit']">
                Financial Mood
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${mood.theme.badgeBg}`}>
                {useMarathiFlair ? mood.labelMr : mood.label}
              </span>
            </div>

            {/* Health Meter Bar */}
            <div className="mt-1.5 flex items-center gap-2">
              <div className="w-28 sm:w-36 h-2 bg-slate-200/80 dark:bg-slate-700/60 rounded-full overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ease-out ${mood.theme.meterBg}`}
                  style={{ width: `${mood.score}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {mood.score}% Score
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click mascot to interact • {pokeCount > 0 ? `Poked ${pokeCount}x` : 'Tap for tips'}
            </p>
          </div>
        </div>

        {/* Center: Interactive Speech Bubble */}
        <div className="flex-1 w-full md:w-auto">
          <div 
            onClick={handlePoke}
            className={`relative rounded-xl border p-3 sm:p-3.5 cursor-pointer transition-all duration-200 hover:shadow-sm ${mood.theme.speechBorder} ${mood.theme.speechBg}`}
          >
            {/* Triangular Speech Pointer */}
            <div className="hidden md:block absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border-l border-b border-inherit bg-inherit" />

            <div className="flex items-start gap-2.5">
              <MessageSquare className="w-4 h-4 shrink-0 mt-0.5 text-slate-500 dark:text-slate-400" />
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium leading-snug">
                  "{currentDialogue}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Language Toggle, Scorecard & Quick Action */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-end md:self-center shrink-0">
          <button
            type="button"
            onClick={() => setUseMarathiFlair((prev) => !prev)}
            title="Toggle Marathi / English mascot responses"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer min-h-[34px]"
          >
            <Volume2 className="w-3.5 h-3.5 text-purple-600" />
            <span>{useMarathiFlair ? 'मराठी' : 'English'}</span>
          </button>

          <button
            type="button"
            onClick={() => openGlobalMonthlyDigest()}
            title="View AI Monthly Health Digest & Scorecard"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors flex items-center gap-1 cursor-pointer min-h-[34px]"
          >
            <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Digest</span>
          </button>

          <button
            type="button"
            onClick={handleActionClick}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm flex items-center gap-1 cursor-pointer min-h-[34px]"
          >
            <span>{mood.actionText}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default FinancialMoodAvatar;
