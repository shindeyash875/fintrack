import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Camera,
  Sparkles,
  Award,
  Target,
  PieChart,
  Users,
  Calendar,
  Hourglass,
  LayoutDashboard,
  Receipt,
  Tag,
  SlidersHorizontal,
  Moon,
  Sun,
  X,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const CommandPalette = () => {
  const navigate = useNavigate();
  const {
    isCommandPaletteOpen,
    closeCommandPalette,
    openCommandPalette,
    openGlobalAddExpense,
    openGlobalReceiptScanner,
    openGlobalAIChat,
    openGlobalMonthlyDigest,
    openGlobalAffordability,
    openGlobalAutoBudget,
    openGlobalBudget,
    openGlobalCategory,
    openGlobalSettings,
    openBillSplitter,
    openSubscriptions,
    openTimeMachine,
    theme,
    toggleTheme,
    addToast,
  } = useUIStore();

  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Global window listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (isCommandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        closeCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, closeCommandPalette, openCommandPalette]);

  // Focus search input on open
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isCommandPaletteOpen]);

  // Command items definitions
  const commandGroups = useMemo(() => [
    {
      group: 'Quick & AI Actions',
      items: [
        {
          id: 'add-expense',
          title: 'Add New Expense',
          subtitle: 'Record an expense manually with tags & receipt',
          icon: Plus,
          iconBg: 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400',
          action: () => {
            closeCommandPalette();
            openGlobalAddExpense();
          },
          keywords: ['add', 'new', 'create', 'expense', 'record', 'spent', 'transaction'],
        },
        {
          id: 'scan-receipt',
          title: 'Scan Receipt with AI OCR',
          subtitle: 'Instantly extract merchant, items, amount & date',
          icon: Camera,
          iconBg: 'bg-teal-500/10 text-teal-500 dark:bg-teal-500/20 dark:text-teal-400',
          action: () => {
            closeCommandPalette();
            openGlobalReceiptScanner();
          },
          keywords: ['scan', 'receipt', 'camera', 'ocr', 'bill', 'photo', 'upload'],
        },
        {
          id: 'ai-advisor',
          title: 'Ask FinTrack AI Advisor',
          subtitle: 'Interactive personalized financial intelligence copilot',
          icon: Sparkles,
          iconBg: 'bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400',
          action: () => {
            closeCommandPalette();
            openGlobalAIChat();
          },
          keywords: ['ai', 'advisor', 'copilot', 'chat', 'ask', 'gemini', 'insights', 'help'],
        },
        {
          id: 'monthly-digest',
          title: 'AI Monthly Health Digest',
          subtitle: 'Health scorecard, savings rate & smart tips',
          icon: Award,
          iconBg: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400',
          action: () => {
            closeCommandPalette();
            openGlobalMonthlyDigest();
          },
          keywords: ['monthly', 'digest', 'health', 'scorecard', 'grade', 'summary', 'report'],
        },
        {
          id: 'affordability',
          title: 'Can I Afford This? Simulator',
          subtitle: 'Simulate the financial impact of a new purchase',
          icon: Target,
          iconBg: 'bg-cyan-500/10 text-cyan-500 dark:bg-cyan-500/20 dark:text-cyan-400',
          action: () => {
            closeCommandPalette();
            openGlobalAffordability();
          },
          keywords: ['afford', 'buy', 'purchase', 'simulator', 'check', 'price', 'can i'],
        },
        {
          id: 'auto-budget',
          title: 'Smart 50/30/20 Auto-Budget',
          subtitle: 'Generate proportional category envelopes based on your income',
          icon: PieChart,
          iconBg: 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400',
          action: () => {
            closeCommandPalette();
            openGlobalAutoBudget();
          },
          keywords: ['budget', 'auto', '50/30/20', 'planner', 'income', 'allocations', 'envelopes'],
        },
      ],
    },
    {
      group: 'Smart Financial Tools ("Hatke" Suite)',
      items: [
        {
          id: 'bill-splitter',
          title: 'Smart Bill & Group Splitter',
          subtitle: 'Split bills, generate WhatsApp copy & log your share in 1-click',
          icon: Users,
          iconBg: 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400',
          badge: 'Smart Tool',
          action: () => {
            closeCommandPalette();
            openBillSplitter();
          },
          keywords: ['split', 'bill', 'group', 'friends', 'trip', 'dinner', 'whatsapp', 'share', 'contribute'],
        },
        {
          id: 'subscriptions',
          title: 'Subscriptions & Recurring Bills Radar',
          subtitle: 'Track Netflix, rent, SIP, gym & 1-click log recurring costs',
          icon: Calendar,
          iconBg: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400',
          badge: 'Radar',
          action: () => {
            closeCommandPalette();
            openSubscriptions();
          },
          keywords: ['subscriptions', 'recurring', 'bills', 'netflix', 'spotify', 'sip', 'rent', 'gym', 'monthly'],
        },
        {
          id: 'time-machine',
          title: '"What-If" Financial Time Machine',
          subtitle: 'Simulate compound wealth growth by cutting small daily expenses',
          icon: Hourglass,
          iconBg: 'bg-violet-500/10 text-violet-500 dark:bg-violet-500/20 dark:text-violet-400',
          badge: 'Wealth Simulator',
          action: () => {
            closeCommandPalette();
            openTimeMachine();
          },
          keywords: ['time machine', 'what if', 'future', 'wealth', 'compound', 'savings', 'invest', 'sip', 'simulate'],
        },
      ],
    },
    {
      group: 'Navigation & Settings',
      items: [
        {
          id: 'nav-dashboard',
          title: 'Go to Financial Dashboard',
          subtitle: 'Live spending metrics, visual charts & trends',
          icon: LayoutDashboard,
          iconBg: 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300',
          action: () => {
            closeCommandPalette();
            navigate('/');
          },
          keywords: ['dashboard', 'home', 'overview', 'metrics', 'stats'],
        },
        {
          id: 'nav-expenses',
          title: 'Go to Expenses Explorer',
          subtitle: 'Search, filter, edit and bulk export transaction records',
          icon: Receipt,
          iconBg: 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300',
          action: () => {
            closeCommandPalette();
            navigate('/expenses');
          },
          keywords: ['expenses', 'history', 'transactions', 'table', 'filter', 'search'],
        },
        {
          id: 'manage-budgets',
          title: 'Manage Monthly Budget Goals',
          subtitle: 'Set overall spending limits and category envelopes',
          icon: Target,
          iconBg: 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400',
          action: () => {
            closeCommandPalette();
            openGlobalBudget();
          },
          keywords: ['budget', 'goal', 'limits', 'envelope', 'target'],
        },
        {
          id: 'manage-categories',
          title: 'Manage Categories & Icons',
          subtitle: 'Customize expense labels, colors and emojis',
          icon: Tag,
          iconBg: 'bg-teal-500/10 text-teal-500 dark:bg-teal-500/20 dark:text-teal-400',
          action: () => {
            closeCommandPalette();
            openGlobalCategory();
          },
          keywords: ['categories', 'labels', 'tags', 'custom', 'colors'],
        },
        {
          id: 'app-settings',
          title: 'App Settings & Data Management',
          subtitle: 'CSV export, backup imports, and security options',
          icon: SlidersHorizontal,
          iconBg: 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300',
          action: () => {
            closeCommandPalette();
            openGlobalSettings();
          },
          keywords: ['settings', 'preferences', 'export', 'import', 'backup', 'csv'],
        },
        {
          id: 'toggle-theme',
          title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
          subtitle: 'Toggle between clean light and sleek dark theme',
          icon: theme === 'dark' ? Sun : Moon,
          iconBg: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400',
          action: () => {
            toggleTheme();
            addToast(`Theme switched to ${theme === 'dark' ? 'Light' : 'Dark'} mode`, 'info');
          },
          keywords: ['theme', 'dark', 'light', 'mode', 'appearance', 'color'],
        },
      ],
    },
  ], [
    closeCommandPalette,
    openGlobalAddExpense,
    openGlobalReceiptScanner,
    openGlobalAIChat,
    openGlobalMonthlyDigest,
    openGlobalAffordability,
    openGlobalAutoBudget,
    openBillSplitter,
    openSubscriptions,
    openTimeMachine,
    navigate,
    openGlobalBudget,
    openGlobalCategory,
    openGlobalSettings,
    theme,
    toggleTheme,
    addToast,
  ]);

  // Flattened filtered items
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return commandGroups;
    const query = search.toLowerCase().trim();

    return commandGroups
      .map((group) => {
        const matchingItems = group.items.filter((item) => {
          const matchTitle = item.title.toLowerCase().includes(query);
          const matchSubtitle = item.subtitle?.toLowerCase().includes(query);
          const matchKeywords = item.keywords.some((k) => k.toLowerCase().includes(query));
          return matchTitle || matchSubtitle || matchKeywords;
        });

        return {
          ...group,
          items: matchingItems,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [search, commandGroups]);

  const flatItemList = useMemo(() => {
    return filteredGroups.flatMap((g) => g.items);
  }, [filteredGroups]);

  // Keyboard navigation within list
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (flatItemList.length === 0 ? 0 : (prev + 1) % flatItemList.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (flatItemList.length === 0 ? 0 : (prev - 1 + flatItemList.length) % flatItemList.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItemList[selectedIndex]) {
        flatItemList[selectedIndex].action();
      }
    }
  };

  if (!isCommandPaletteOpen) return null;

  let currentFlatIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3.5 sm:px-4">
      {/* Backdrop */}
      <div
        onClick={closeCommandPalette}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        aria-label="Close Spotlight Palette"
      />

      {/* Spotlight Window */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] z-10 animate-scale-up">
        {/* Top Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, search features, or ask AI..."
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base font-medium focus:outline-none"
          />
          {search ? (
            <button
              onClick={() => {
                setSearch('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
              <span>ESC</span>
            </div>
          )}
        </div>

        {/* Command Items List */}
        <div ref={listRef} className="overflow-y-auto p-2 sm:p-3 space-y-4 max-h-[60vh]">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No commands found for "{search}"</p>
              <p className="text-xs mt-1 text-slate-400">Try searching for "split", "bill", "scan", "advisor", or "budget"</p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.group}>
                <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.group}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const itemIndex = currentFlatIndex++;
                    const isSelected = itemIndex === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-950 dark:text-emerald-100 shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-semibold truncate ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                                {item.title}
                              </p>
                              {item.badge && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.subtitle && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSelected && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                              <span>Select</span>
                              <CornerDownLeft className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">↵</kbd>
              Open
            </span>
          </div>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            FinTrack Spotlight • Ctrl+K
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
