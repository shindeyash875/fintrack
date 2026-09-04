import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Plus,
  Trash2,
  Check,
  Receipt,
  Sparkles,
  AlertCircle,
  Clock,
  Tv,
  Wifi,
  Home,
  Dumbbell,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import Button from '../common/Button';
import { useUIStore } from '../../store/useUIStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useCategoryStore } from '../../store/useCategoryStore';

const DEFAULT_SUBSCRIPTIONS = [
  { id: 'sub-1', name: 'Netflix Premium (4K)', amount: 649, renewalDay: 5, category: 'Entertainment', cycle: 'monthly' },
  { id: 'sub-2', name: 'Spotify Individual', amount: 119, renewalDay: 12, category: 'Entertainment', cycle: 'monthly' },
  { id: 'sub-3', name: 'Apartment Maintenance / Rent', amount: 12500, renewalDay: 1, category: 'Housing & Rent', cycle: 'monthly' },
  { id: 'sub-4', name: 'JioFiber Broadband (100 Mbps)', amount: 825, renewalDay: 18, category: 'Utilities', cycle: 'monthly' },
  { id: 'sub-5', name: 'Cult.fit Gym & Fitness', amount: 1450, renewalDay: 25, category: 'Health & Fitness', cycle: 'monthly' },
];

export const SubscriptionsModal = ({ isOpen, onClose, onSuccess }) => {
  const { addToast } = useUIStore();
  const { addExpense } = useExpenseStore();
  const { categories } = useCategoryStore();

  const [subscriptions, setSubscriptions] = useState(() => {
    try {
      const saved = localStorage.getItem('fintrack_subscriptions');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_SUBSCRIPTIONS;
  });

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSub, setNewSub] = useState({
    name: '',
    amount: '',
    renewalDay: 1,
    category: 'Entertainment',
  });
  const [loggingId, setLoggingId] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem('fintrack_subscriptions', JSON.stringify(subscriptions));
    } catch (e) {}
  }, [subscriptions]);

  if (!isOpen) return null;

  const totalMonthlyCommitment = subscriptions.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const annualCommitment = totalMonthlyCommitment * 12;

  // Calculate days remaining until next renewal
  const getDaysUntilRenewal = (renewalDay) => {
    const today = new Date();
    const currentDay = today.getDate();
    if (renewalDay >= currentDay) {
      return renewalDay - currentDay;
    }
    // Days left in current month + renewal day
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return (lastDayOfMonth - currentDay) + renewalDay;
  };

  const handleAddSubscription = (e) => {
    e.preventDefault();
    if (!newSub.name.trim() || !newSub.amount) {
      addToast('Please provide a name and amount for the subscription.', 'error');
      return;
    }

    const item = {
      id: 'sub-' + Date.now(),
      name: newSub.name.trim(),
      amount: parseFloat(newSub.amount),
      renewalDay: parseInt(newSub.renewalDay) || 1,
      category: newSub.category || 'General',
      cycle: 'monthly',
    };

    setSubscriptions((prev) => [...prev, item]);
    setNewSub({ name: '', amount: '', renewalDay: 1, category: 'Entertainment' });
    setIsAddingNew(false);
    addToast(`Added "${item.name}" to Subscriptions Radar!`, 'success');
  };

  const handleDeleteSubscription = (id) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    addToast('Subscription removed from radar.', 'info');
  };

  const handleLogForThisMonth = async (sub) => {
    setLoggingId(sub.id);
    try {
      // Find matching category or fallback
      const matchedCat = categories.find((c) =>
        c.name.toLowerCase().includes(sub.category.toLowerCase()) ||
        c.name.toLowerCase().includes('utilities') ||
        c.name.toLowerCase().includes('bills')
      ) || categories[0];

      const today = new Date().toISOString().split('T')[0];

      await addExpense({
        title: sub.name,
        amount: parseFloat(sub.amount),
        category_id: matchedCat ? matchedCat.id : 1,
        expense_date: today,
        payment_mode: 'upi',
        description: `Recurring bill / subscription (Monthly cycle: ${sub.renewalDay}th)`,
      });

      addToast(`Logged ₹${sub.amount} for "${sub.name}" to this month's expenses!`, 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      addToast(err.message || 'Failed to log subscription expense.', 'error');
    } finally {
      setLoggingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        aria-label="Close modal"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col my-auto z-10 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                  Subscriptions & Recurring Bills Radar
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  Radar
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track fixed monthly commitments, upcoming renewals & log bills with 1-click
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[72vh]">
          {/* Summary Bento Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/20">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Monthly Fixed Commitment
              </span>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white font-['Outfit']">
                ₹{totalMonthlyCommitment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subscriptions.length} active recurring services tracked
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-transparent border border-purple-500/20">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Annual Run Rate
              </span>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white font-['Outfit']">
                ₹{annualCommitment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Projected 12-month fixed outflow
              </p>
            </div>
          </div>

          {/* Subscriptions List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-['Outfit']">
                Active Subscriptions ({subscriptions.length})
              </h3>
              {!isAddingNew && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Plus}
                  onClick={() => setIsAddingNew(true)}
                >
                  Add Subscription
                </Button>
              )}
            </div>

            {/* Inline Add Form */}
            {isAddingNew && (
              <form
                onSubmit={handleAddSubscription}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 animate-fade-in"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Add Recurring Subscription / Bill
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={newSub.name}
                      onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
                      placeholder="Service name (e.g. Disney+ Hotstar, Rent)..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newSub.amount}
                      onChange={(e) => setNewSub({ ...newSub, amount: e.target.value })}
                      placeholder="Amount (₹)..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-['Outfit']"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Day of Month (1 - 31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={newSub.renewalDay}
                      onChange={(e) => setNewSub({ ...newSub, renewalDay: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Category
                    </label>
                    <select
                      value={newSub.category}
                      onChange={(e) => setNewSub({ ...newSub, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Entertainment">Entertainment</option>
                      <option value="Utilities">Utilities & WiFi</option>
                      <option value="Housing & Rent">Housing & Rent</option>
                      <option value="Health & Fitness">Health & Fitness</option>
                      <option value="Investment / SIP">Investment / SIP</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="submit" size="sm" icon={Check}>
                    Save to Radar
                  </Button>
                </div>
              </form>
            )}

            {/* List */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {subscriptions.map((sub) => {
                const daysLeft = getDaysUntilRenewal(sub.renewalDay);
                const isDueSoon = daysLeft <= 3;
                const isDueToday = daysLeft === 0;

                return (
                  <div
                    key={sub.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {sub.name}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isDueToday
                                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse'
                                : isDueSoon
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {isDueToday ? 'Due Today' : `Renews in ${daysLeft} days`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {sub.category} • Every {sub.renewalDay}th of month
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                      <span className="text-base font-bold text-slate-900 dark:text-white font-['Outfit']">
                        ₹{Number(sub.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          icon={Receipt}
                          isLoading={loggingId === sub.id}
                          onClick={() => handleLogForThisMonth(sub)}
                          title="Log as an expense for current month"
                          className="!py-1.5 !px-2.5 !text-xs"
                        >
                          Log for Month
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubscription(sub.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete subscription"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Never miss an unwanted auto-debit renewal again.
          </p>
          <Button type="button" variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsModal;
