'use client';
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useCachedFetch } from '../hooks/usePerformanceOptimized';
import { cacheApiResponse, getCachedApiResponse } from '../utils/cacheManager';

// Lazy load all heavy components
const SimpleDashboard = lazy(() => import('./SimpleDashboard'));
const PriorityQueueController = lazy(() => import('./PriorityQueueController'));
const ContentReviewDashboard = lazy(() => import('./ContentReviewDashboard'));
const ScrapingFeedsPage = lazy(() => import('./ScrapingFeedsPage'));
const ViralityIdeaPage = lazy(() => import('./ViralityIdeaPage'));
const ContentGeneratorPage = lazy(() => import('./ContentGeneratorPage'));
const MediaAssetsPage = lazy(() => import('./MediaAssetsPage'));
const CharactersPersonasPage = lazy(() => import('./CharactersPersonasPage'));
const EnhancedAgentWorkflows = lazy(() => import('./EnhancedAgentWorkflows'));
const EnhancedAnalyticsDashboard = lazy(() => import('./EnhancedAnalyticsDashboard'));
const IntelligentWorkflowEngine = lazy(() => import('./IntelligentWorkflowEngine'));
const AutomatedOptimizer = lazy(() => import('./AutomatedOptimizer'));
const NicheResearchDashboard = lazy(() => import('./NicheResearchDashboard'));
const OverviewPage = lazy(() => import('../pages/OverviewPage'));

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

const OptimizedUnifiedDashboard = ({ 
  mode = 'simple', 
  features = ['agents', 'queues', 'tasks'],
  refreshInterval = 5000 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState({
    agents: [],
    queues: [],
    health: {},
    stats: {}
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Optimized data fetching with caching
  const loadDashboardData = useCallback(async () => {
    try {
      const fetchPromises = [];
      const cacheKeys = [];

      // Check cache first
      if (features.includes('agents')) {
        const cachedAgents = getCachedApiResponse('/api/agents?stats=true');
        if (cachedAgents) {
          setData(prev => ({ ...prev, agents: cachedAgents.agents || [], stats: cachedAgents.stats || {} }));
        } else {
          fetchPromises.push(fetch('/api/agents?stats=true'));
          cacheKeys.push('agents');
        }
      }

      if (features.includes('queues')) {
        const cachedQueues = getCachedApiResponse('/api/queue-stats');
        if (cachedQueues) {
          setData(prev => ({ ...prev, queues: cachedQueues.queues || [] }));
        } else {
          fetchPromises.push(fetch('/api/queue-stats'));
          cacheKeys.push('queues');
        }
      }

      if (features.includes('health')) {
        const cachedHealth = getCachedApiResponse('/api/health?service=all');
        if (cachedHealth) {
          setData(prev => ({ ...prev, health: cachedHealth }));
        } else {
          fetchPromises.push(fetch('/api/health?service=all'));
          cacheKeys.push('health');
        }
      }

      // Fetch only uncached data
      if (fetchPromises.length > 0) {
        const responses = await Promise.all(fetchPromises);
        const newData = { ...data };

        for (let i = 0; i < responses.length; i++) {
          const res = responses[i];
          const key = cacheKeys[i];

          if (res.ok) {
            const jsonData = await res.json();
            
            // Cache the response
            switch (key) {
              case 'agents':
                cacheApiResponse('/api/agents?stats=true', jsonData, 10000);
                newData.agents = jsonData.agents || [];
                newData.stats = jsonData.stats || {};
                break;
              case 'queues':
                cacheApiResponse('/api/queue-stats', jsonData, 15000);
                newData.queues = jsonData.queues || [];
                break;
              case 'health':
                cacheApiResponse('/api/health?service=all', jsonData, 5000);
                newData.health = jsonData;
                break;
            }
          }
        }

        setData(newData);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, [features, data]);

  // Smart polling - only when tab is visible
  useEffect(() => {
    if (!isClient) return;

    let interval;
    
    const startPolling = () => {
      loadDashboardData();
      interval = setInterval(loadDashboardData, refreshInterval);
    };

    const stopPolling = () => {
      if (interval) clearInterval(interval);
    };

    // Page visibility API
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial load
    if (!document.hidden) {
      startPolling();
    }

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshInterval, isClient, loadDashboardData]);

  // Memoized tab switching
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // Memoized mode content
  const renderModeContent = useMemo(() => {
    const componentProps = {
      agents: data.agents,
      stats: data.stats,
      queues: data.queues,
      health: data.health,
      onTaskSubmit: loadDashboardData
    };

    switch (mode) {
      case 'executive':
      case 'minimal':
        return <SimpleDashboard {...componentProps} />;
      
      case 'priority':
        return <PriorityQueueController />;
      
      case 'review':
        return <ContentReviewDashboard />;
      
      case 'content':
        return (
          <div className="content-suite">
            {features.includes('scraping') && activeTab === 'scraping' && <ScrapingFeedsPage />}
            {features.includes('virality') && activeTab === 'virality' && <ViralityIdeaPage />}
            {features.includes('content') && activeTab === 'content' && <ContentGeneratorPage />}
            {features.includes('media') && activeTab === 'media' && <MediaAssetsPage />}
            {features.includes('characters') && activeTab === 'characters' && <CharactersPersonasPage />}
            {features.includes('workflows') && activeTab === 'workflows' && <EnhancedAgentWorkflows />}
            {features.includes('analytics') && activeTab === 'analytics' && <EnhancedAnalyticsDashboard />}
            {features.includes('intelligence') && activeTab === 'intelligence' && <IntelligentWorkflowEngine />}
            {features.includes('optimizer') && activeTab === 'optimizer' && <AutomatedOptimizer />}
          </div>
        );
      
      case 'research':
        return <NicheResearchDashboard />;
      
      default:
        return <SimpleDashboard {...componentProps} />;
    }
  }, [mode, features, activeTab, data, loadDashboardData]);

  // Navigation tabs (memoized)
  const navigationTabs = useMemo(() => {
    if (mode !== 'content') return null;

    return (
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {features.map(feature => (
            <button
              key={feature}
              onClick={() => handleTabChange(feature)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === feature
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {feature.charAt(0).toUpperCase() + feature.slice(1)}
            </button>
          ))}
        </nav>
      </div>
    );
  }, [mode, features, activeTab, handleTabChange]);

  if (!isClient) {
    return <LoadingFallback />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<LoadingFallback />}>
        {navigationTabs}
        {renderModeContent}
      </Suspense>
    </div>
  );
};

export default React.memo(OptimizedUnifiedDashboard);