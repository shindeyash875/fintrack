import React, { useEffect, useState } from 'react';
import { X, Smartphone, Globe, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { authApi } from '../../api/endpoints/auth';
import { useAuthStore } from '../../store/useAuthStore';

export const ActiveSessionsModal = ({ isOpen, onClose }) => {
  const { logoutAll } = useAuthStore();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSessions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authApi.getSessions();
        const data = res.data || res;
        setSessions(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Failed to load active sessions.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogoutAll = async () => {
    setIsTerminating(true);
    try {
      await logoutAll();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to revoke sessions.');
      setIsTerminating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Active Sessions</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
              <span>Loading devices...</span>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No other active sessions detected.</p>
              ) : (
                sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          {sess.user_agent ? sess.user_agent.split(' ')[0] : 'Web Browser'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          IP: {sess.ip_address || 'Current connection'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      Active
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleLogoutAll}
              disabled={isTerminating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-60"
            >
              {isTerminating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>Logout All Devices</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveSessionsModal;
