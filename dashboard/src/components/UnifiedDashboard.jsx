'use client';
import React, { useState, useEffect } from 'react';
import TestSimple from './TestSimple';
import PriorityQueueController from './PriorityQueueController';
import ContentReviewDashboard from './ContentReviewDashboard';
import ScrapingFeedsPage from './ScrapingFeedsPage';
import ViralityIdeaPage from './ViralityIdeaPage';
import ContentGeneratorPage from './ContentGeneratorPage';
import MediaAssetsPage from './MediaAssetsPage';
import CharactersPersonasPage from './CharactersPersonasPage';
import EnhancedAgentWorkflows from './EnhancedAgentWorkflows';
import EnhancedAnalyticsDashboard from './EnhancedAnalyticsDashboard';
import IntelligentWorkflowEngine from './IntelligentWorkflowEngine';
import AutomatedOptimizer from './AutomatedOptimizer';
import NicheResearchDashboard from './NicheResearchDashboard';
import OverviewPage from '../pages/OverviewPage';

const UnifiedDashboard = ({ 
  mode = 'simple', 
  features = ['agents', 'queues', 'tasks'],
  refreshInterval = 30000 
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

  useEffect(() => {
    if (isClient) {
      loadDashboardData();
      const interval = setInterval(loadDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, isClient]);

  const loadDashboardData = async () => {
    try {
      // Load all data in parallel
      const [agentsRes, queuesRes, healthRes] = await Promise.all([
        features.includes('agents') ? fetch('/api/agents?stats=true') : null,
        features.includes('queues') ? fetch('/api/queue-stats') : null,
        features.includes('health') ? fetch('/api/health?service=all') : null
      ].filter(Boolean));

      const newData = { ...data };
      
      if (agentsRes?.ok) {
        const agentData = await agentsRes.json();
        newData.agents = agentData.agents || [];
        newData.stats = agentData.stats || {};
      }
      
      if (queuesRes?.ok) {
        const queueData = await queuesRes.json();
        newData.queues = queueData.queues || [];
      }
      
      if (healthRes?.ok) {
        newData.health = await healthRes.json();
      }

      setData(newData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const renderModeContent = () => {
    switch (mode) {
      case 'executive':
        return (
          <div className="executive-layout">
            <TestSimple 
              agents={data.agents}
              stats={data.stats}
              queues={data.queues}
              health={data.health}
              onTaskSubmit={loadDashboardData}
            />
          </div>
        );
      
      case 'minimal':
        return (
          <div className="minimal-layout">
            <TestSimple 
              agents={data.agents}
              stats={data.stats}
              queues={data.queues}
              health={data.health}
              onTaskSubmit={loadDashboardData}
            />
          </div>
        );
      
      case 'priority':
        return (
          <div className="priority-layout">
            <PriorityQueueController />
          </div>
        );
      
      case 'review':
        return (
          <div className="review-layout">
            <ContentReviewDashboard />
          </div>
        );
      
      case 'research':
        return (
          <div className="research-layout">
            <NicheResearchDashboard />
          </div>
        );
      
      default: // simple
        return (
          <div className="simple-layout">
            <OverviewPage realTimeData={{
              activeAgents: data.agents?.filter(a => a.status === 'healthy').length || 0,
              totalTasks: data.stats?.total || 0,
              completedTasks: data.stats?.completed || 0,
              queueDepth: data.queues?.reduce((sum, q) => sum + (q.length || 0), 0) || 0,
              systemHealth: data.health,
              performance: data.stats?.performance || {}
            }} />
            {(features.includes('agents') || features.includes('tasks') || features.includes('queues') || features.includes('health')) && (
              <div className="mt-8">
                <TestSimple />
              </div>
            )}
          </div>
        );
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'agents', label: 'Agents & Tasks', icon: '🤖', show: features.includes('agents') || features.includes('tasks') || features.includes('queues') || features.includes('health') },
    { id: 'reviews', label: 'Reviews', icon: '⭐', show: features.includes('reviews') },
    { id: 'scraping', label: 'Scraping', icon: '🕷️', show: true },
    { id: 'virality', label: 'Virality', icon: '📈', show: true },
    { id: 'content', label: 'Content', icon: '📝', show: true },
    { id: 'media', label: 'Media', icon: '🎬', show: true },
    { id: 'characters', label: 'Characters', icon: '🎭', show: true },
    { id: 'workflows', label: 'Workflows', icon: '🔄', show: true },
    { id: 'analytics', label: 'Analytics', icon: '📊', show: true },
    { id: 'intelligence', label: 'AI Engine', icon: '🧠', show: true },
    { id: 'optimizer', label: 'Auto-Optimize', icon: '⚡', show: true },
    { id: 'research', label: 'Niche Research', icon: '🔬', show: true }
  ].filter(tab => tab.show !== false);

  if (!isClient) {
    return (
      <div className="unified-dashboard p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unified-dashboard p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            EzAigents Dashboard
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
            </p>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">Live</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        {mode !== 'minimal' && (
          <div className="mb-6">
            <nav className="flex space-x-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Content */}
        <div className="dashboard-content">
          {activeTab === 'overview' ? (
            <OverviewPage realTimeData={{
              activeAgents: data.agents?.filter(a => a.status === 'healthy').length || 0,
              totalTasks: data.stats?.total || 0,
              completedTasks: data.stats?.completed || 0,
              queueDepth: data.queues?.reduce((sum, q) => sum + (q.length || 0), 0) || 0,
              systemHealth: data.health,
              performance: data.stats?.performance || {}
            }} />
          ) : (
            <div className="tab-content">
              {activeTab === 'agents' && (
                <TestSimple />
              )}
              {activeTab === 'reviews' && features.includes('reviews') && (
                <ContentReviewDashboard />
              )}
              {activeTab === 'scraping' && <ScrapingFeedsPage />}
              {activeTab === 'virality' && <ViralityIdeaPage />}
              {activeTab === 'content' && <ContentGeneratorPage />}
              {activeTab === 'media' && <MediaAssetsPage />}
              {activeTab === 'characters' && <CharactersPersonasPage />}
              {activeTab === 'workflows' && <EnhancedAgentWorkflows />}
              {activeTab === 'analytics' && <EnhancedAnalyticsDashboard />}
              {activeTab === 'intelligence' && <IntelligentWorkflowEngine />}
              {activeTab === 'optimizer' && <AutomatedOptimizer />}
              {activeTab === 'research' && <NicheResearchDashboard />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedDashboard;