import React, { useEffect, useState } from 'react';
import {
  Download,
  Smartphone,
  Tag,
  Database,
  CheckCircle2,
  Share2,
  FileSpreadsheet,
} from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { useUIStore } from '../../store/useUIStore';
import ThemeToggle from './ThemeToggle';

export const SettingsModal = ({
  isOpen,
  onClose,
  onOpenCategories,
  onOpenExport,
  onOpenImport,
}) => {
  const { isInstallable, setIsInstallable, triggerPWAInstall, addToast } = useUIStore();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const standaloneCheck =
      Boolean(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)')?.matches) ||
      Boolean(typeof window !== 'undefined' && window.navigator && window.navigator.standalone === true);
    setIsStandalone(standaloneCheck);

    const handleInstallReady = () => setIsInstallable(true);
    const handleInstalled = () => {
      setIsInstallable(false);
      setIsStandalone(true);
      addToast({ type: 'success', message: 'FinTrack installed successfully!' });
    };

    if (window.deferredPWAInstallPrompt) {
      setIsInstallable(true);
    }

    window.addEventListener('pwa-install-ready', handleInstallReady);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-install-ready', handleInstallReady);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, [setIsInstallable, addToast]);

  const handleInstallClick = async () => {
    if (window.deferredPWAInstallPrompt) {
      const accepted = await triggerPWAInstall();
      if (accepted) {
        addToast({ type: 'success', message: 'App install initiated!' });
      }
    } else {
      addToast({
        type: 'info',
        message: 'To install on iOS: Tap Share and then "Add to Home Screen". On Android/Chrome, use the browser menu.',
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="App Options & Settings" maxWidth="max-w-md">
      <div className="space-y-5">
        {/* PWA Install Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-slate-50 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-900/60">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white font-['Outfit']">
                {isStandalone ? 'FinTrack Installed' : 'Install FinTrack App'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {isStandalone
                  ? 'Running in full-screen standalone mobile mode.'
                  : 'Add to your device home screen for quick offline access and full-screen mobile experience.'}
              </p>
              {!isStandalone && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleInstallClick}
                    icon={Download}
                  >
                    Install to Home Screen
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Theme & Appearance */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white font-['Outfit']">
                Appearance
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customize your color theme preference
              </p>
            </div>
            <ThemeToggle variant="segmented" />
          </div>
        </div>

        {/* Quick Management Actions */}
        <div className="space-y-2">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Quick Actions
          </h5>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenCategories?.();
              }}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800 transition-colors text-left group min-h-[44px]"
            >
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">
                  Manage Categories
                </span>
              </div>
              <span className="text-xs text-slate-400">Add / Edit</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenExport?.();
              }}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800 transition-colors text-left group min-h-[44px]"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">
                  Export Data (CSV / JSON)
                </span>
              </div>
              <span className="text-xs text-slate-400">Backup</span>
            </button>
          </div>
        </div>

        {/* App & Database Status */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Database
            </span>
            <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live PostgreSQL
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>Display Currency</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">INR (₹)</span>
          </div>

          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>App Version</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">FinTrack PWA v1.0</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
