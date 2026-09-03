import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Send, 
  Check, 
  X, 
  Edit3, 
  Loader2, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Calendar, 
  Tag, 
  Zap,
  Volume2
} from 'lucide-react';
import { aiApi } from '../../api/endpoints/ai';
import { expensesApi } from '../../api/endpoints/expenses';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useUIStore } from '../../store/useUIStore';

const SAMPLE_PROMPTS = [
  'Spent ₹350 on Uber to office via UPI today',
  'Dinner at Barbeque Nation 2450 on credit card yesterday',
  'Paid 12000 house rent via bank transfer',
  '150 chai & snacks cash',
  'Grocery shopping at D-Mart 1850 UPI'
];

export const AIQuickInput = ({ onExpenseCreated, onOpenEditModal, className = '' }) => {
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedResult, setParsedResult] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [sampleIndex, setSampleIndex] = useState(0);

  const recognitionRef = useRef(null);
  const { categories, fetchCategories } = useCategoryStore();
  const { addToast } = useUIStore();

  // Cycle sample prompts for inspiration
  useEffect(() => {
    const interval = setInterval(() => {
      setSampleIndex((prev) => (prev + 1) % SAMPLE_PROMPTS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English handles Hinglish & local terms

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          addToast('Microphone permission denied. Please allow microphone access in your browser.', 'error');
        } else if (event.error !== 'no-speech') {
          addToast(`Voice recognition error: ${event.error}`, 'error');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [addToast]);

  const toggleListening = () => {
    if (!speechSupported) {
      addToast('Voice input is not supported by your browser. You can type your expense instead!', 'warning');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInputText('');
      setParsedResult(null);
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  const handleParse = async (e) => {
    if (e) e.preventDefault();
    const textToParse = inputText.trim();
    if (!textToParse) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    setIsParsing(true);
    setParsedResult(null);

    try {
      const res = await aiApi.parseExpense(textToParse);
      if (res.data) {
        setParsedResult(res.data);
      } else {
        throw new Error('No structured expense data returned.');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to parse natural language expense.';
      addToast(errorMsg, 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!parsedResult) return;

    // Ensure category_id is resolved
    let categoryId = parsedResult.suggested_category_id;
    if (!categoryId && categories.length > 0) {
      categoryId = categories[0].id;
    }

    if (!categoryId) {
      addToast('Please create at least one category before logging expenses.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: parsedResult.title,
        amount: Number(parsedResult.amount),
        expense_date: parsedResult.expense_date,
        category_id: categoryId,
        payment_mode: parsedResult.payment_mode || null,
        notes: parsedResult.notes || (parsedResult.raw_summary ? `Parsed via AI: ${parsedResult.raw_summary}` : null),
      };

      await expensesApi.create(payload);
      addToast(`Logged ₹${Number(parsedResult.amount).toFixed(2)} for ${parsedResult.title}!`, 'success');
      
      // Auto-refresh categories and parent dashboard
      fetchCategories();

      // Reset component state
      setInputText('');
      setParsedResult(null);
      
      if (onExpenseCreated) {
        onExpenseCreated();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to save parsed expense.';
      addToast(errorMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditInModal = () => {
    if (!parsedResult) return;
    
    let categoryId = parsedResult.suggested_category_id;
    if (!categoryId && categories.length > 0) {
      categoryId = categories[0].id;
    }

    const prefillData = {
      title: parsedResult.title,
      amount: Number(parsedResult.amount),
      expense_date: parsedResult.expense_date,
      category_id: categoryId || '',
      payment_mode: parsedResult.payment_mode || '',
      notes: parsedResult.notes || '',
    };

    if (onOpenEditModal) {
      onOpenEditModal(prefillData);
    }
    setParsedResult(null);
    setInputText('');
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className={`w-full bg-gradient-to-br from-emerald-900/90 via-slate-900 to-slate-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-emerald-500/25 relative overflow-hidden ${className}`}>
      {/* Background ambient decorative glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight text-emerald-300 font-['Outfit'] flex items-center gap-1.5">
            AI Quick-Add Expense
            <span className="px-1.5 py-0.2 rounded-full text-[9px] uppercase font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
              Type or Speak
            </span>
          </span>
        </div>

        {/* Listening indicator */}
        {isListening && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>Listening... Speak now</span>
          </div>
        )}
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleParse} className="relative z-10">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isParsing || isSaving}
            placeholder={`e.g., "${SAMPLE_PROMPTS[sampleIndex]}"`}
            className="w-full pl-4 pr-24 sm:pr-28 py-3 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-emerald-500/40 focus:border-emerald-400 focus:bg-slate-800 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all duration-150 shadow-inner"
          />

          <div className="absolute right-1.5 flex items-center gap-1">
            {/* Voice Input Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={isParsing || isSaving}
                title={isListening ? 'Stop recording' : 'Speak expense (Voice Input)'}
                className={`p-2 rounded-lg transition-all duration-150 flex items-center justify-center min-h-[34px] min-w-[34px] focus:outline-none ${
                  isListening
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'
                    : 'bg-slate-700/70 hover:bg-emerald-600/30 text-slate-300 hover:text-emerald-300'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            {/* Submit / Parse Action Button */}
            <button
              type="submit"
              disabled={isParsing || isSaving || !inputText.trim()}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all duration-150 min-h-[34px]"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">AI Parsing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Sample clickable suggestion chips */}
      {!parsedResult && (
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 text-[11px] text-slate-400 relative z-10 scrollbar-none">
          <span className="shrink-0 text-slate-400 font-medium">Quick Suggestions:</span>
          {SAMPLE_PROMPTS.slice(0, 3).map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInputText(prompt);
              }}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 hover:border-emerald-500/30 text-slate-300 hover:text-white transition-all duration-150 text-[11px]"
            >
              "{prompt}"
            </button>
          ))}
        </div>
      )}

      {/* Parsed Result Confirmation Card */}
      {parsedResult && (
        <div className="mt-3.5 p-3.5 sm:p-4 rounded-xl bg-slate-800/95 border border-emerald-500/40 shadow-md relative z-10 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Details */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-lg font-bold text-white font-['Outfit'] truncate">
                  {parsedResult.title}
                </span>
                <span className="text-lg font-extrabold text-emerald-400 font-['Outfit']">
                  {formatCurrency(parsedResult.amount)}
                </span>
                {parsedResult.confidence && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {Math.round(parsedResult.confidence * 100)}% match
                  </span>
                )}
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
                {/* Interactive Category Selector */}
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/60 border border-slate-600/50 text-slate-200">
                  <Tag className="w-3 h-3 text-emerald-400 shrink-0" />
                  <select
                    value={parsedResult.suggested_category_id || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedCat = categories.find((c) => c.id === selectedId);
                      setParsedResult((prev) => ({
                        ...prev,
                        suggested_category_id: selectedId,
                        suggested_category_name: selectedCat ? selectedCat.name : prev.suggested_category_name,
                      }));
                    }}
                    className="bg-transparent border-0 text-slate-200 text-xs font-medium focus:outline-none focus:ring-0 cursor-pointer max-w-[140px] truncate"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-slate-800 text-white">
                        {cat.name}
                      </option>
                    ))}
                    {!categories.some((c) => c.id === parsedResult.suggested_category_id) && parsedResult.suggested_category_name && (
                      <option value={parsedResult.suggested_category_id || ''} className="bg-slate-800 text-white">
                        {parsedResult.suggested_category_name}
                      </option>
                    )}
                  </select>
                </div>

                {parsedResult.payment_mode && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/60 border border-slate-600/50 text-slate-200 uppercase font-semibold text-[10px]">
                    {parsedResult.payment_mode === 'upi' && <Smartphone className="w-3 h-3 text-emerald-400" />}
                    {parsedResult.payment_mode === 'card' && <CreditCard className="w-3 h-3 text-sky-400" />}
                    {parsedResult.payment_mode === 'cash' && <Banknote className="w-3 h-3 text-amber-400" />}
                    <span>{parsedResult.payment_mode}</span>
                  </div>
                )}

                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/60 border border-slate-600/50 text-slate-200">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{parsedResult.expense_date}</span>
                </div>

                {parsedResult.notes && (
                  <span className="text-slate-400 text-xs truncate max-w-xs italic">
                    "{parsedResult.notes}"
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700">
              <button
                type="button"
                onClick={handleSaveExpense}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all min-h-[36px]"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
                <span>Save Expense</span>
              </button>

              <button
                type="button"
                onClick={handleEditInModal}
                disabled={isSaving}
                className="px-3 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all min-h-[36px]"
                title="Edit details in full form"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>

              <button
                type="button"
                onClick={() => setParsedResult(null)}
                disabled={isSaving}
                className="p-2 rounded-xl hover:bg-slate-700/80 text-slate-400 hover:text-white transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIQuickInput;
