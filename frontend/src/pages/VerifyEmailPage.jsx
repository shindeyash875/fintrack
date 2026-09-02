import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Wallet, CheckCircle2, AlertCircle, Loader2, ArrowRight, Mail, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, resendVerification, isAuthenticated } = useAuthStore();

  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token in URL. Please check your verification link.');
      return;
    }

    let isMounted = true;
    const performVerification = async () => {
      setStatus('loading');
      try {
        await verifyEmail(token);
        if (isMounted) {
          setStatus('success');
          setMessage('Your email address has been successfully verified! You now have full access to all FinTrack features.');
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          setMessage(err.message || 'Verification link is invalid or has expired. Please request a new verification email.');
        }
      }
    };

    performVerification();
    return () => {
      isMounted = false;
    };
  }, [token, verifyEmail]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setIsResending(true);
    setResendSuccess(false);
    try {
      await resendVerification(resendEmail.trim());
      setResendSuccess(true);
    } catch (err) {
      setMessage(err.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30 text-white mb-3">
          <Wallet className="w-7 h-7" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight font-['Outfit']">
          Email Verification
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Securing your FinTrack account
        </p>
      </div>

      {/* Status Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-slate-900/80 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800/80 text-center">
          {status === 'loading' && (
            <div className="py-8 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-white">Verifying Your Email...</h3>
              <p className="text-xs text-slate-400">Please wait while we validate your verification link.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4 space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Email Verified!</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
              </div>

              <div className="pt-2">
                {isAuthenticated ? (
                  <Link
                    to="/"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all"
                  >
                    <span>Sign In to Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-2 space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Verification Failed</h3>
                <p className="text-xs text-red-300/90 leading-relaxed">{message}</p>
              </div>

              {/* Resend Section */}
              <div className="mt-6 pt-6 border-t border-slate-800/80 text-left space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Request a New Verification Link</span>
                </h4>

                {resendSuccess ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                    A fresh verification link has been sent to your email address!
                  </div>
                ) : (
                  <form onSubmit={handleResend} className="space-y-3">
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        placeholder="your-email@example.com"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isResending}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>{isResending ? 'Sending...' : 'Resend Verification Email'}</span>
                    </button>
                  </form>
                )}
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
