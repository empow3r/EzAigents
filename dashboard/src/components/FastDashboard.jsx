import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import PerformanceOptimizer from '../services/performance-optimizer';
import DataOptimizer from '../services/data-optimizer';
import ReliabilityMonitor from '../services/reliability-monitor';
import { usePerformanceBoost } from '../hooks/usePerformanceBoost';

// Lazy load heavy components
const EnhancementDashboard = lazy(() => import('./EnhancementDashboard'));
const AgentDashboard = lazy(() => import('../AgentDashboard'));
const VoiceControl = lazy(() => import('./VoiceControl'));
const GamificationPanel = lazy(() => import('./GamificationPanel'));
const MobilePWA = lazy(() => import('./MobilePWA'));

// Simple loading component
const QuickLoader = ({ text = "Loading..." }) => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    <span className="ml-2 text-gray-600">{text}</span>
  </div>
);

// Lightweight card component
const FastCard = ({ title, children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
    {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
    {children}
  </div>
);

// Quick stats component
const QuickStats = () => {
  const [stats, setStats] = useState({
    agents: 0,
    tasks: 0,
    queue: 0,
    success: 0
  });

  useEffect(() => {
    // Simulate quick stats load
    const timer = setTimeout(() => {
      setStats({
        agents: 5,
        tasks: 127,
        queue: 8,
        success: 94
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <FastCard className="text-center">
        <div className="text-2xl font-bold text-blue-600">{stats.agents}</div>
        <div className="text-sm text-gray-600">Active Agents</div>
      </FastCard>
      <FastCard className="text-center">
        <div className="text-2xl font-bold text-green-600">{stats.tasks}</div>
        <div className="text-sm text-gray-600">Tasks Done</div>
      </FastCard>
      <FastCard className="text-center">
        <div className="text-2xl font-bold text-yellow-600">{stats.queue}</div>
        <div className="text-sm text-gray-600">In Queue</div>
      </FastCard>
      <FastCard className="text-center">
        <div className="text-2xl font-bold text-purple-600">{stats.success}%</div>
        <div className="text-sm text-gray-600">Success Rate</div>
      </FastCard>
    </div>
  );
};

// Quick actions component
const QuickActions = () => (
  <FastCard title="Quick Actions" className="mb-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <button className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
        Deploy Agent
      </button>
      <button className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600">
        Add Task
      </button>
      <button className="px-3 py-2 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600">
        View Queue
      </button>
      <button className="px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600">
        Settings
      </button>
    </div>
  </FastCard>
);

// Main fast dashboard component
export default function FastDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoaded, setIsLoaded] = useState(false);
  const [healthStatus, setHealthStatus] = useState({});
  const [loadingProgress, setLoadingProgress] = useState(0);
  const { isOptimized, metrics, clearCache, optimizeMemory } = usePerformanceBoost();

  useEffect(() => {
    // Initialize performance optimizations
    initializeOptimizations();
    
    // Set up health monitoring
    setupHealthMonitoring();
    
    // Mark as loaded quickly
    setIsLoaded(true);
  }, []);

  const initializeOptimizations = async () => {
    try {
      // Initialize performance optimizer
      await PerformanceOptimizer.initialize();
      
      // Enable data optimization
      await DataOptimizer.optimizePayload({}, { sanitize: true });
      
      // Start reliability monitoring
      ReliabilityMonitor.runAllHealthChecks();
      
      console.log('Performance optimizations initialized');
    } catch (error) {
      console.error('Failed to initialize optimizations:', error);
    }
  };

  const setupHealthMonitoring = () => {
    // Monitor system health
    const updateHealth = () => {
      const status = ReliabilityMonitor.getOverallHealth();
      setHealthStatus(status);
    };
    
    updateHealth();
    const healthInterval = setInterval(updateHealth, 30000); // Check every 30 seconds
    
    return () => clearInterval(healthInterval);
  };

  const tabs = [
    { id: 'overview', name: 'Overview', component: 'overview' },
    { id: 'agents', name: 'Agents', component: 'agents' },
    { id: 'enhancements', name: 'Features', component: 'enhancements' },
    { id: 'voice', name: 'Voice', component: 'voice' },
    { id: 'mobile', name: 'Mobile', component: 'mobile' },
    { id: 'gamification', name: 'Gaming', component: 'gamification' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div>
            <QuickStats />
            <QuickActions />
            <FastCard title="System Status" className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    healthStatus.status === 'healthy' ? 'bg-green-500' : 
                    healthStatus.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm">
                    {healthStatus.status === 'healthy' ? 'All systems operational' :
                     healthStatus.status === 'degraded' ? 'Some systems degraded' : 'System issues detected'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {healthStatus.healthy || 0}/{healthStatus.total || 0} checks passing
                </div>
              </div>
            </FastCard>
            <FastCard title="Performance Metrics" className="mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-blue-600">
                    {metrics.memoryUsage}MB
                  </div>
                  <div className="text-xs text-gray-600">Memory Usage</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-600">
                    {Math.round(metrics.loadTime)}ms
                  </div>
                  <div className="text-xs text-gray-600">Load Time</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-purple-600">
                    {Math.round(metrics.cacheHits)}
                  </div>
                  <div className="text-xs text-gray-600">Cache Hits</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-orange-600">
                    {Math.round(metrics.compressionRatio * 100)}%
                  </div>
                  <div className="text-xs text-gray-600">Compression</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button 
                  onClick={clearCache}
                  className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                >
                  Clear Cache
                </button>
                <button 
                  onClick={optimizeMemory}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                >
                  Optimize Memory
                </button>
              </div>
            </FastCard>
          </div>
        );
      
      case 'agents':
        return (
          <Suspense fallback={<QuickLoader text="Loading agents..." />}>
            <AgentDashboard />
          </Suspense>
        );
      
      case 'enhancements':
        return (
          <Suspense fallback={<QuickLoader text="Loading enhancements..." />}>
            <EnhancementDashboard />
          </Suspense>
        );
      
      case 'voice':
        return (
          <Suspense fallback={<QuickLoader text="Loading voice controls..." />}>
            <VoiceControl />
          </Suspense>
        );
      
      case 'mobile':
        return (
          <Suspense fallback={<QuickLoader text="Loading mobile features..." />}>
            <MobilePWA />
          </Suspense>
        );
      
      case 'gamification':
        return (
          <Suspense fallback={<QuickLoader text="Loading gamification..." />}>
            <GamificationPanel />
          </Suspense>
        );
      
      default:
        return <div>Tab content not found</div>;
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading EzAugent Dashboard...</p>
          <div className="mt-2 text-sm text-gray-500">Optimizing performance...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 sm:mb-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">E</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">EzAugent Dashboard</h1>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <div className={`w-2 h-2 rounded-full ${
                    isOptimized ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <span>{isOptimized ? 'Ultra Fast Mode' : 'Optimizing...'}</span>
                  {healthStatus.status && (
                    <>
                      <span>•</span>
                      <div className={`w-2 h-2 rounded-full ${
                        healthStatus.status === 'healthy' ? 'bg-green-500' : 
                        healthStatus.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span>{healthStatus.status}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Tab navigation */}
            <div className="flex flex-wrap justify-center sm:justify-end gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </div>
    </div>
  );
}