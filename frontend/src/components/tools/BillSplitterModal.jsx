import React, { useState } from 'react';
import {
  X,
  Users,
  Plus,
  Trash2,
  Copy,
  Check,
  Share2,
  Receipt,
  Sparkles,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import Button from '../common/Button';
import { useUIStore } from '../../store/useUIStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useCategoryStore } from '../../store/useCategoryStore';

export const BillSplitterModal = ({ isOpen, onClose, onSuccess }) => {
  const { addToast } = useUIStore();
  const { addExpense } = useExpenseStore();
  const { categories } = useCategoryStore();

  const [billTitle, setBillTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' | 'custom'
  const [upiId, setUpiId] = useState('');
  const [members, setMembers] = useState([
    { id: '1', name: 'You (Payer)', isPayer: true, customAmount: '' },
    { id: '2', name: 'Rahul', isPayer: false, customAmount: '' },
    { id: '3', name: 'Priya', isPayer: false, customAmount: '' },
  ]);
  const [newMemberName, setNewMemberName] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const numTotal = parseFloat(totalAmount) || 0;
  const memberCount = Math.max(members.length, 1);
  const equalShare = numTotal > 0 ? (numTotal / memberCount) : 0;

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const newId = Date.now().toString();
    setMembers((prev) => [
      ...prev,
      { id: newId, name: newMemberName.trim(), isPayer: false, customAmount: '' },
    ]);
    setNewMemberName('');
  };

  const handleRemoveMember = (id) => {
    if (members.length <= 2) {
      addToast('A group must have at least 2 people to split a bill.', 'error');
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleCustomAmountChange = (id, val) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, customAmount: val } : m))
    );
  };

  const getMemberShare = (member) => {
    if (splitMode === 'equal') {
      return equalShare;
    }
    return parseFloat(member.customAmount) || 0;
  };

  const customTotal = members.reduce(
    (sum, m) => sum + (parseFloat(m.customAmount) || 0),
    0
  );
  const customDiff = numTotal - customTotal;

  // Generate WhatsApp message breakdown
  const generateBreakdownText = () => {
    const titleText = billTitle.trim() || 'Group Expense';
    let text = `🧾 *FinTrack Bill Split: ${titleText}*\n`;
    text += `💰 Total Bill: ₹${numTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
    text += `👥 Members (${members.length}):\n`;
    text += `─────────────────────────\n`;

    members.forEach((m) => {
      const share = getMemberShare(m);
      text += `• ${m.name}: ₹${share.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
    });

    if (upiId.trim()) {
      text += `─────────────────────────\n`;
      text += `📲 Pay your share via UPI:\n${upiId.trim()}\n`;
    }
    text += `\n_Calculated with FinTrack Smart Tools_`;
    return text;
  };

  const handleCopyWhatsApp = () => {
    if (numTotal <= 0) {
      addToast('Please enter a valid bill amount first.', 'error');
      return;
    }
    const text = generateBreakdownText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('Bill breakdown copied to clipboard for WhatsApp!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleLogMyShare = async () => {
    if (numTotal <= 0) {
      addToast('Please enter a valid bill amount.', 'error');
      return;
    }

    const payer = members.find((m) => m.isPayer) || members[0];
    const myShare = getMemberShare(payer);

    if (myShare <= 0) {
      addToast('Your share amount cannot be zero.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find food or general category or fallback to first available
      const matchedCat =
        categories.find((c) =>
          c.name.toLowerCase().includes('food') ||
          c.name.toLowerCase().includes('dining') ||
          c.name.toLowerCase().includes('entertainment')
        ) || categories[0];

      const today = new Date().toISOString().split('T')[0];

      await addExpense({
        title: billTitle.trim() ? `My Share: ${billTitle.trim()}` : 'My Share: Group Split',
        amount: parseFloat(myShare.toFixed(2)),
        category_id: matchedCat ? matchedCat.id : 1,
        expense_date: today,
        payment_mode: 'upi',
        description: `Split among ${members.length} people (Total bill ₹${numTotal.toFixed(2)}). Members: ${members.map((m) => m.name).join(', ')}`,
      });

      addToast(`Logged your share of ₹${myShare.toFixed(2)} to your expenses!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to log share as expense.', 'error');
    } finally {
      setIsSubmitting(false);
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
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col my-auto z-10 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                  Smart Bill & Group Splitter
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Tool
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Split restaurant bills, trips & group costs with 1-click expense logging
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
        <div className="p-6 space-y-5 overflow-y-auto max-h-[72vh]">
          {/* Bill Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Expense Title / Occasion
              </label>
              <input
                type="text"
                value={billTitle}
                onChange={(e) => setBillTitle(e.target.value)}
                placeholder="e.g. Dinner at Barbeque Nation"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Total Bill Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none font-['Outfit']"
                />
              </div>
            </div>
          </div>

          {/* Split Mode Switcher */}
          <div className="flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setSplitMode('equal')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                splitMode === 'equal'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Split Equally ({members.length} people)
            </button>
            <button
              type="button"
              onClick={() => setSplitMode('custom')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                splitMode === 'custom'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Custom Amounts per Person
            </button>
          </div>

          {/* Group Members List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Group Members ({members.length})
              </label>
              {splitMode === 'equal' && numTotal > 0 && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{equalShare.toFixed(2)} / person
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {members.map((member) => {
                const share = getMemberShare(member);
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          member.isPayer
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {member.name}
                        </p>
                        {member.isPayer && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Paid the bill
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {splitMode === 'custom' ? (
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={member.customAmount}
                            onChange={(e) =>
                              handleCustomAmountChange(member.id, e.target.value)
                            }
                            className="w-full pl-6 pr-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-right text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-['Outfit']">
                          ₹{share.toFixed(2)}
                        </span>
                      )}

                      {!member.isPayer && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Member Bar */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                placeholder="Enter friend's name (e.g. Ankit, Rohan)..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={handleAddMember}
              >
                Add Person
              </Button>
            </div>
          </div>

          {/* Optional UPI ID for WhatsApp collection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Your UPI ID (Optional — for WhatsApp pay link)
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. yourname@oksbi or 9876543210@paytm"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Breakdown summary card */}
          {numTotal > 0 && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-900 dark:text-emerald-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Your Net Share to Log:
                </p>
                <p className="text-xl font-bold font-['Outfit']">
                  ₹{getMemberShare(members[0]).toFixed(2)}
                </p>
              </div>
              <div className="text-right text-xs text-emerald-700 dark:text-emerald-300">
                <p>{members.length - 1} friends to collect from</p>
                <p className="font-semibold">
                  Total: ₹{(numTotal - getMemberShare(members[0])).toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            icon={copied ? Check : Share2}
            onClick={handleCopyWhatsApp}
            className="flex-1"
          >
            {copied ? 'Copied!' : 'Copy WhatsApp Share'}
          </Button>

          <Button
            type="button"
            icon={Receipt}
            isLoading={isSubmitting}
            onClick={handleLogMyShare}
            className="flex-1"
          >
            Log My Share (₹{getMemberShare(members[0]).toFixed(0)})
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BillSplitterModal;
