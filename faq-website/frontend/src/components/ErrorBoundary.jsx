import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 text-slate-400 glass-strong rounded-xl border border-white/10 m-4 flex flex-col items-center justify-center">
          <div className="text-red-400 mb-2">⚠️ Component crashed</div>
          <div className="text-xs text-slate-500">{this.state.error?.message}</div>
          <div className="mt-4 text-sm font-bold text-slate-300">Coming Soon or Unavailable</div>
        </div>
      );
    }
    return this.props.children; 
  }
}

export default ErrorBoundary;
