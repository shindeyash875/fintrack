import { create } from 'zustand';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem('fintrack_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) {
    // Ignore localStorage errors in private mode
  }
  return 'light';
};

const applyThemeToDOM = (theme) => {
  if (typeof document === 'undefined') return;
  const isDark = theme === 'dark';
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Initial DOM sync on load
if (typeof window !== 'undefined') {
  applyThemeToDOM(getInitialTheme());
}

export const useUIStore = create((set, get) => ({
  // Theme state ('light' | 'dark')
  theme: getInitialTheme(),
  setTheme: (newTheme) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('fintrack_theme', newTheme);
      }
    } catch (e) {}
    applyThemeToDOM(newTheme);
    set({ theme: newTheme });
  },
  toggleTheme: () => {
    const current = get().theme;
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('fintrack_theme', nextTheme);
      }
    } catch (e) {}
    applyThemeToDOM(nextTheme);
    set({ theme: nextTheme });
  },

  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),

  isGlobalAddExpenseOpen: false,
  openGlobalAddExpense: () => set({ isGlobalAddExpenseOpen: true }),
  closeGlobalAddExpense: () => set({ isGlobalAddExpenseOpen: false }),

  isGlobalReceiptScannerOpen: false,
  openGlobalReceiptScanner: () => set({ isGlobalReceiptScannerOpen: true }),
  closeGlobalReceiptScanner: () => set({ isGlobalReceiptScannerOpen: false }),

  isGlobalAIChatOpen: false,
  openGlobalAIChat: () => set({ isGlobalAIChatOpen: true }),
  closeGlobalAIChat: () => set({ isGlobalAIChatOpen: false }),
  toggleGlobalAIChat: () => set((state) => ({ isGlobalAIChatOpen: !state.isGlobalAIChatOpen })),

  isGlobalBudgetOpen: false,
  openGlobalBudget: () => set({ isGlobalBudgetOpen: true }),
  closeGlobalBudget: () => set({ isGlobalBudgetOpen: false }),

  isGlobalCategoryOpen: false,
  openGlobalCategory: () => set({ isGlobalCategoryOpen: true }),
  closeGlobalCategory: () => set({ isGlobalCategoryOpen: false }),

  isGlobalSettingsOpen: false,
  openGlobalSettings: () => set({ isGlobalSettingsOpen: true }),
  closeGlobalSettings: () => set({ isGlobalSettingsOpen: false }),

  isGlobalMonthlyDigestOpen: false,
  openGlobalMonthlyDigest: () => set({ isGlobalMonthlyDigestOpen: true }),
  closeGlobalMonthlyDigest: () => set({ isGlobalMonthlyDigestOpen: false }),

  isGlobalAffordabilityOpen: false,
  openGlobalAffordability: () => set({ isGlobalAffordabilityOpen: true }),
  closeGlobalAffordability: () => set({ isGlobalAffordabilityOpen: false }),

  isGlobalAutoBudgetOpen: false,
  openGlobalAutoBudget: () => set({ isGlobalAutoBudgetOpen: true }),
  closeGlobalAutoBudget: () => set({ isGlobalAutoBudgetOpen: false }),

  // Spotlight Command Palette (Ctrl+K / Cmd+K)
  isCommandPaletteOpen: false,
  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  // Feature: Smart Group & Bill Splitter
  isBillSplitterOpen: false,
  openBillSplitter: () => set({ isBillSplitterOpen: true }),
  closeBillSplitter: () => set({ isBillSplitterOpen: false }),

  // Feature: Subscriptions & Recurring Bills Radar
  isSubscriptionsOpen: false,
  openSubscriptions: () => set({ isSubscriptionsOpen: true }),
  closeSubscriptions: () => set({ isSubscriptionsOpen: false }),

  // Feature: "What-If" Financial Time Machine Simulator
  isTimeMachineOpen: false,
  openTimeMachine: () => set({ isTimeMachineOpen: true }),
  closeTimeMachine: () => set({ isTimeMachineOpen: false }),

  // Financial Milestone Confetti Celebration
  isConfettiActive: false,
  triggerConfetti: () => {
    set({ isConfettiActive: true });
    setTimeout(() => {
      set({ isConfettiActive: false });
    }, 3000);
  },

  // PWA Install State
  isInstallable: false,
  setIsInstallable: (val) => set({ isInstallable: val }),
  triggerPWAInstall: async () => {
    const promptEvent = window.deferredPWAInstallPrompt;
    if (!promptEvent) return false;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    window.deferredPWAInstallPrompt = null;
    set({ isInstallable: false });
    return choice.outcome === 'accepted';
  },

  // Toast notification system
  toasts: [],
  addToast: (toastOrMessage, optionalType) => {
    let type = 'info';
    let message = '';

    if (typeof toastOrMessage === 'string') {
      message = toastOrMessage;
      if (typeof optionalType === 'string') {
        type = optionalType;
      }
    } else if (toastOrMessage && typeof toastOrMessage === 'object') {
      type = toastOrMessage.type || 'info';
      message = toastOrMessage.message || '';
    }

    if (!message) return;

    // Prevent duplicate toast messages
    const currentToasts = get().toasts;
    if (currentToasts.some((t) => t.message === message)) {
      return;
    }

    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
