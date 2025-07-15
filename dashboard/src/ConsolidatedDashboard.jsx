'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import SafeErrorBoundary from './components/SafeErrorBoundary';

// Dynamic import with no SSR for the tiered dashboard
const TieredHomeDashboard = dynamic(
  () => import('./components/TieredHomeDashboard'),
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

const ConsolidatedDashboard = () => {
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
      <TieredHomeDashboard />
    </SafeErrorBoundary>
  );
};

export default ConsolidatedDashboard;