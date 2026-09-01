import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Mail, KeyRound, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successData, setSuccessData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessData(null);
    setIsLoading(true);

    try {
      const res = await forgotPassword(email);
      const data = res.data || res;
      setSuccessData(data);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit reset request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30 text-white mb-3">
          <Wallet className="w-7 h-7" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight font-['Outfit']">
          Reset Password
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Enter your account email to receive password reset instructions
        </p>
      </div>

      {/* Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-slate-900/80 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800/80">
          {errorMessage && (
            <div className="mb-5 flex items-start gap-3 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successData ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-400 text-sm">Reset request processed</p>
                  <p>
                    If an account matches <span className="font-semibold text-white">{email}</span>, a secure password reset link has been issued.
                  </p>
                </div>
              </div>

              {/* Dev token convenience link */}
              {successData.debug_reset_token && (
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 space-y-2">
                  <p className="font-semibold text-blue-400">Development / Demo Reset Link:</p>
                  <Link
                    to={`/reset-password?token=${successData.debug_reset_token}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Proceed to Reset Password</span>
                  </Link>
                </div>
              )}

              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Login</span>
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>{isLoading ? 'Sending Link...' : 'Send Reset Link'}</span>
              </button>

              <div className="mt-4 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
