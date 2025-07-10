'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import SafeErrorBoundary from './components/SafeErrorBoundary';

// Dynamic import with no SSR for the dashboards
const UnifiedFastDashboard = dynamic(
  () => import('./components/UnifiedFastDashboard'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }
);

const UltraFuturisticDashboard = dynamic(
  () => import('./components/UltraFuturisticDashboard'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-[0_0_20px_rgba(0,255,255,0.5)]" />
          <p className="text-cyan-400 font-mono">INITIALIZING NEURAL INTERFACE...</p>
        </div>
      </div>
    )
  }
);

const SimpleWorkingDashboard = dynamic(
  () => import('./components/SimpleWorkingDashboard'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading dashboard...</p>
        </div>
      </div>
    )
  }
);

const ExecutiveDashboard = dynamic(
  () => import('./components/ExecutiveDashboardPage'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-[0_0_20px_rgba(255,255,0,0.5)]" />
          <p className="text-yellow-400 font-mono">LOADING EXECUTIVE COMMAND CENTER...</p>
        </div>
      </div>
    )
  }
);

const ConsolidatedDashboard = () => {
  const [currentView, setCurrentView] = useState('simple'); // simple, futuristic, executive

  // Dashboard selector positioned absolutely
  const DashboardSelector = () => (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      <button
        onClick={() => setCurrentView('simple')}
        className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
          currentView === 'simple' 
            ? 'bg-blue-600 text-white shadow-lg' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        📊 Simple
      </button>
      <button
        onClick={() => setCurrentView('futuristic')}
        className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
          currentView === 'futuristic' 
            ? 'bg-cyan-500/20 border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-500/30 shadow-[0_0_20px_rgba(0,255,255,0.5)]' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        🚀 Futuristic
      </button>
      <button
        onClick={() => setCurrentView('executive')}
        className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
          currentView === 'executive' 
            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-[0_0_20px_rgba(255,255,0,0.3)]' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        👑 Executive
      </button>
    </div>
  );

  const renderDashboard = () => {
    switch (currentView) {
      case 'futuristic':
        return <UltraFuturisticDashboard />;
      case 'executive':
        return <ExecutiveDashboard />;
      default:
        return <SimpleWorkingDashboard />;
    }
  };

  return (
    <SafeErrorBoundary
      fallback={
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Ez Aigent Dashboard</h1>
            <p className="text-gray-400">Loading simplified interface...</p>
          </div>
        </div>
      }
    >
      <DashboardSelector />
      {renderDashboard()}
    </SafeErrorBoundary>
  );
};

export default ConsolidatedDashboard;