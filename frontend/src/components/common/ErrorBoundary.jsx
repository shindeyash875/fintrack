import React, { Component } from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';
import Button from './Button';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('FinTrack UI ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/50 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-['Outfit']">
                Something went wrong
              </h1>
              <p className="text-sm text-slate-500">
                An unexpected application error occurred while rendering the page. Your underlying financial data in PostgreSQL remains completely safe.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-left overflow-hidden">
                <p className="text-[11px] font-mono text-slate-600 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={this.handleReset}
                icon={Home}
                className="w-full sm:w-auto"
              >
                Go to Dashboard
              </Button>
              <Button
                variant="primary"
                onClick={this.handleReload}
                icon={RefreshCw}
                className="w-full sm:w-auto"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
