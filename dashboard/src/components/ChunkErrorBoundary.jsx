'use client';
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('Chunk loading error:', error, errorInfo);
    
    // Check if it's a chunk loading error
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      // Attempt to recover by clearing module cache
      if (window.location.reload) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.name === 'ChunkLoadError' || 
                           this.state.error?.message?.includes('Loading chunk');
      
      return (
        <div className={`p-6 min-h-[400px] flex items-center justify-center ${
          this.props.darkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
          <Card className={`max-w-md w-full ${
            this.props.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span>{isChunkError ? 'Loading Error' : 'Component Error'}</span>
              </CardTitle>
              <CardDescription>
                {isChunkError 
                  ? 'Failed to load application resources. This usually happens due to a network issue or outdated cache.'
                  : 'An unexpected error occurred while rendering this component.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`text-sm ${
                this.props.darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {isChunkError ? (
                  <>
                    <p>The page will automatically refresh in a moment. If the problem persists:</p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>Check your internet connection</li>
                      <li>Clear your browser cache (Ctrl/Cmd + Shift + R)</li>
                      <li>Try using a different browser</li>
                    </ul>
                  </>
                ) : (
                  <p className="text-xs font-mono break-all">
                    {this.state.error?.message || 'Unknown error'}
                  </p>
                )}
              </div>
              
              <Button 
                onClick={this.handleReset}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;