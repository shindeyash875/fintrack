import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),

  isGlobalAddExpenseOpen: false,
  openGlobalAddExpense: () => set({ isGlobalAddExpenseOpen: true }),
  closeGlobalAddExpense: () => set({ isGlobalAddExpenseOpen: false }),

  isGlobalReceiptScannerOpen: false,
  openGlobalReceiptScanner: () => set({ isGlobalReceiptScannerOpen: true }),
  closeGlobalReceiptScanner: () => set({ isGlobalReceiptScannerOpen: false }),

  isGlobalBudgetOpen: false,
  openGlobalBudget: () => set({ isGlobalBudgetOpen: true }),
  closeGlobalBudget: () => set({ isGlobalBudgetOpen: false }),

  isGlobalCategoryOpen: false,
  openGlobalCategory: () => set({ isGlobalCategoryOpen: true }),
  closeGlobalCategory: () => set({ isGlobalCategoryOpen: false }),

  isGlobalSettingsOpen: false,
  openGlobalSettings: () => set({ isGlobalSettingsOpen: true }),
  closeGlobalSettings: () => set({ isGlobalSettingsOpen: false }),

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
