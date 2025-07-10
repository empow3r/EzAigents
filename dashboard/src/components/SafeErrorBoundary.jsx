import React from 'react';

class SafeErrorBoundary extends React.Component {
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

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
          <div className="text-center max-w-lg">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-cyan-400 mb-4">Component Error</h1>
            <p className="text-gray-300 mb-6">
              Something went wrong loading this component. Using fallback interface.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
            >
              Try Again
            </button>
            {this.props.fallback && (
              <div className="mt-8">
                {this.props.fallback}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SafeErrorBoundary;