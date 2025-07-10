'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 max-w-md w-full">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="text-red-400" size={32} />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-white text-center mb-4">
              Something went wrong
            </h2>
            
            <p className="text-gray-300 text-center mb-6">
              An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
            </p>
            
            {this.state.error && (
              <details className="mb-6">
                <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                  Error details
                </summary>
                <pre className="mt-2 text-xs text-gray-400 bg-black/30 p-3 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            
            <button
              onClick={this.handleReset}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;