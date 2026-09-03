import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  User,
  Send,
  Mic,
  MicOff,
  Sparkles,
  X,
  RotateCcw,
  Loader2,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { aiApi } from '../../api/endpoints/ai';
import { useUIStore } from '../../store/useUIStore';

const INITIAL_SUGGESTIONS = [
  '📊 How much did I spend this month vs last month?',
  '🎯 Am I on track with my monthly budget?',
  '💡 Give me 3 tips to save ₹3,000 on my top category.',
  '🍕 What were my highest 3 expenses recently?',
];

export const AIChatAdvisorModal = () => {
  const { isGlobalAIChatOpen, closeGlobalAIChat } = useUIStore();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "👋 **Namaste! I'm your FinTrack AI Financial Advisor.**\n\nI have real-time access to your expenses, categories, and budgets. Ask me anything about your spending trends, budget limits, or ways to save money!",
      suggested_actions: INITIAL_SUGGESTIONS,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Web Speech API for voice queries
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInput(transcript);
          }
          setIsRecording(false);
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Mic start error:', err);
        setIsRecording(false);
      }
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    if (isGlobalAIChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isGlobalAIChatOpen, loading]);

  const handleSendMessage = async (textToSend = null) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || loading) return;

    const userMessage = { role: 'user', content: messageContent };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Build lightweight conversation history for backend context
      const historyPayload = newMessages
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await aiApi.chat({
        message: messageContent,
        history: historyPayload,
      });

      if (res?.data?.data) {
        const aiResponse = res.data.data;
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: aiResponse.reply,
            suggested_actions: aiResponse.suggested_actions || [],
            metrics: aiResponse.referenced_metrics,
          },
        ]);
      } else {
        throw new Error('No response from advisor.');
      }
    } catch (err) {
      const errMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'Unable to connect to AI Advisor. Please verify your API key configuration in settings.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Oops!** ${errMsg}`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          "✨ **Chat reset!** How can I assist you with your finances today? You can ask about your budgets, top spending categories, or recent transactions.",
        suggested_actions: INITIAL_SUGGESTIONS,
      },
    ]);
  };

  if (!isGlobalAIChatOpen) return null;

  // Simple Markdown Parser for bold text, headers, and bullet lists
  const renderFormattedContent = (content) => {
    return content.split('\n').map((line, idx) => {
      let trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;

      // Header ## or ###
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-2 mb-1">
            {trimmed.replace('### ', '')}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} className="font-bold text-slate-900 dark:text-white text-base mt-2 mb-1">
            {trimmed.replace('## ', '')}
          </h3>
        );
      }

      // Bullet list item
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
      if (isBullet) {
        trimmed = trimmed.substring(2);
      }

      // Parse **bold** parts
      const parts = trimmed.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-emerald-700 dark:text-emerald-300">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 my-0.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
            <span className="text-emerald-500 font-bold">•</span>
            <span>{formattedParts}</span>
          </div>
        );
      }

      return (
        <p key={idx} className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 my-0.5 leading-relaxed">
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
      <div
        className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col transition-all duration-300 overflow-hidden ${
          isExpanded
            ? 'sm:w-[700px] h-[90vh] sm:h-[85vh]'
            : 'sm:w-[460px] h-[85vh] sm:h-[620px]'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Sparkles className="w-5 h-5 text-emerald-100 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base leading-tight">FinTrack AI Advisor</h3>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold bg-emerald-400/30 text-emerald-100 border border-emerald-300/40">
                  Live Grounded
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/80">Real-time personalized financial guidance</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleResetChat}
              title="Reset Conversation"
              className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse' : 'Expand'}
              className="hidden sm:block p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={closeGlobalAIChat}
              className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Context Banner */}
        <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 px-4 py-1.5 flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Connected to your live PostgreSQL accounts & budgets</span>
          </div>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">100% Private</span>
        </div>

        {/* Chat Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth bg-slate-50/50 dark:bg-slate-900/50">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div key={index} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`flex gap-2.5 max-w-[90%] sm:max-w-[85%] ${
                    isUser ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Avatar Icon */}
                  <div
                    className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold shadow-sm ${
                      isUser
                        ? 'bg-slate-800 dark:bg-slate-700 text-white'
                        : msg.isError
                        ? 'bg-rose-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl shadow-sm ${
                      isUser
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : msg.isError
                        ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 rounded-tl-none'
                        : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/70 text-slate-800 dark:text-slate-100 rounded-tl-none'
                    }`}
                  >
                    {isUser ? (
                      <p className="text-xs sm:text-sm whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      renderFormattedContent(msg.content)
                    )}
                  </div>
                </div>

                {/* Follow-up Action Suggestion Chips */}
                {!isUser && msg.suggested_actions && msg.suggested_actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 ml-9 max-w-[90%]">
                    {msg.suggested_actions.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSendMessage(sug)}
                        disabled={loading}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-colors shadow-2xs"
                      >
                        <span>{sug}</span>
                        <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center gap-2 text-slate-500 text-xs ml-9 animate-pulse">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </div>
              <span>FinTrack AI is analyzing your finances...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Controls */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Voice Mic Button */}
            <button
              type="button"
              onClick={toggleRecording}
              title={isRecording ? 'Listening... click to stop' : 'Ask with Voice'}
              className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0 ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30 ring-2 ring-rose-400'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Message Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isRecording
                  ? '🎙️ Listening to your question...'
                  : 'Ask about spending, budgets, savings...'
              }
              disabled={loading}
              className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm hover:shadow transition-all shrink-0 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400">
            <span>Powered by Multi-Model Universal AI</span>
            <span>Press Enter ↵ to send</span>
          </div>
        </div>
      </div>
    </div>
  );
};
