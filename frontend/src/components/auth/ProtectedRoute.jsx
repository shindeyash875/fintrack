import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Wallet, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isAuthLoading } = useAuthStore();
  const location = useLocation();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-pulse shadow-lg shadow-emerald-500/10">
            <Wallet className="w-7 h-7" />
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Securing your session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
