import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const ToastContainer = () => {
  const { toasts, removeToast } = useUIStore();

  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  };

  const colors = {
    success: 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
    error: 'bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800',
    info: 'bg-blue-50 dark:bg-blue-950/90 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  };

  return (
    <div className="fixed bottom-20 lg:bottom-4 right-3 sm:right-4 left-3 sm:left-auto z-50 flex flex-col gap-2 max-w-sm pointer-events-none mx-auto sm:mx-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type] || Info;
          const colorClass = colors[toast.type] || colors.info;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              layout
              className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border shadow-lg ${colorClass}`}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1.5 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
