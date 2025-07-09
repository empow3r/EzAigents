// Optimized App Entry Point with Performance Enhancements
import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './globals.css';

// Loading component for suspense fallback
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Dashboard...</p>
    </div>
  </div>
);

// Lazy load the main dashboard
const OptimizedMainDashboard = lazy(() => 
  import('./components/OptimizedMainDashboard')
);

// Error boundary for graceful error handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              Something went wrong
            </h2>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// App component with performance optimizations
function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <OptimizedMainDashboard />
      </Suspense>
    </ErrorBoundary>
  );
}

// Only render if we're in the browser
if (typeof window !== 'undefined') {
  const container = document.getElementById('root');
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}

export default App;