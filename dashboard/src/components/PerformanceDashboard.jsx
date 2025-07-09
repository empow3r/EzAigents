'use client';

import React, { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Clock, 
  Zap, 
  Database, 
  Monitor, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Download
} from 'lucide-react';
import { usePerformanceMonitor } from '../utils/performance';
import { apiCache } from '../utils/apiCache';

const MetricCard = memo(({ title, value, unit, icon: Icon, status = 'good', trend }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
  >
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-2">
        <Icon className={`w-5 h-5 ${
          status === 'good' ? 'text-green-400' : 
          status === 'warning' ? 'text-yellow-400' : 'text-red-400'
        }`} />
        <span className="text-sm font-medium text-gray-300">{title}</span>
      </div>
      {trend && (
        <TrendingUp className={`w-4 h-4 ${
          trend > 0 ? 'text-green-400' : 'text-red-400'
        } transform ${trend < 0 ? 'rotate-180' : ''}`} />
      )}
    </div>
    <div className="text-2xl font-bold text-white">
      {value}
      <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
    </div>
  </motion.div>
));

const PerformanceScore = memo(({ score }) => {
  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreStatus = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 text-center"
    >
      <div className="relative w-32 h-32 mx-auto mb-4">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={351.86}
            strokeDashoffset={351.86 - (351.86 * score) / 100}
            className={`transition-all duration-1000 ${getScoreColor(score)}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-3xl font-bold text-white">{score}</div>
        </div>
      </div>
      <div className="text-lg font-semibold text-white mb-1">Performance Score</div>
      <div className={`text-sm ${getScoreColor(score)}`}>
        {getScoreStatus(score)}
      </div>
    </motion.div>
  );
});

const ComponentMetrics = memo(({ componentRenderTimes }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
  >
    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
      <Monitor className="w-5 h-5 mr-2" />
      Component Render Times
    </h3>
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {componentRenderTimes.map((component, index) => (
        <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
          <span className="text-sm text-gray-300">{component.component}</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-white">{component.averageTime.toFixed(2)}ms</span>
            <div className="w-16 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(component.averageTime / 100 * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
));

const ApiMetrics = memo(({ apiResponseTimes }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
  >
    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
      <Database className="w-5 h-5 mr-2" />
      API Response Times
    </h3>
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {apiResponseTimes.map((api, index) => (
        <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
          <span className="text-sm text-gray-300">{api.endpoint.split('/').pop()}</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-white">{api.averageTime.toFixed(2)}ms</span>
            <div className="w-16 bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  api.averageTime > 1000 ? 'bg-red-400' : 
                  api.averageTime > 500 ? 'bg-yellow-400' : 'bg-green-400'
                }`}
                style={{ width: `${Math.min(api.averageTime / 2000 * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
));

const CacheStats = memo(({ cacheStats }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
  >
    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
      <Database className="w-5 h-5 mr-2" />
      Cache Statistics
    </h3>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-sm text-gray-300">Hit Rate</div>
        <div className="text-xl font-bold text-white">{cacheStats.hitRate.toFixed(1)}%</div>
      </div>
      <div>
        <div className="text-sm text-gray-300">Cache Size</div>
        <div className="text-xl font-bold text-white">{cacheStats.cacheSize}/{cacheStats.maxSize}</div>
      </div>
      <div>
        <div className="text-sm text-gray-300">Hits</div>
        <div className="text-xl font-bold text-green-400">{cacheStats.hitCount}</div>
      </div>
      <div>
        <div className="text-sm text-gray-300">Misses</div>
        <div className="text-xl font-bold text-red-400">{cacheStats.missCount}</div>
      </div>
    </div>
  </motion.div>
));

const PerformanceDashboard = memo(() => {
  const { metrics, getScore, exportData } = usePerformanceMonitor();
  const [cacheStats, setCacheStats] = useState(null);
  const [performanceScore, setPerformanceScore] = useState(0);

  useEffect(() => {
    const updateStats = () => {
      setCacheStats(apiCache.getStats());
      setPerformanceScore(getScore());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [getScore]);

  const handleExportData = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <Activity className="w-6 h-6 animate-pulse text-blue-400" />
          <span className="text-gray-300">Loading performance metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Performance Dashboard</h2>
        <button
          onClick={handleExportData}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Data</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PerformanceScore score={performanceScore} />
        
        <MetricCard
          title="Page Load Time"
          value={metrics.pageLoadTime?.toFixed(0) || 0}
          unit="ms"
          icon={Clock}
          status={metrics.pageLoadTime > 3000 ? 'poor' : metrics.pageLoadTime > 1000 ? 'warning' : 'good'}
        />
        
        <MetricCard
          title="LCP"
          value={metrics.coreWebVitals?.lcp?.toFixed(0) || 0}
          unit="ms"
          icon={Zap}
          status={metrics.coreWebVitals?.lcp > 2500 ? 'poor' : metrics.coreWebVitals?.lcp > 1000 ? 'warning' : 'good'}
        />
        
        <MetricCard
          title="Bundle Size"
          value={metrics.bundleSize ? (metrics.bundleSize / 1024).toFixed(0) : 0}
          unit="KB"
          icon={Database}
          status={metrics.bundleSize > 1000000 ? 'poor' : metrics.bundleSize > 500000 ? 'warning' : 'good'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ComponentMetrics componentRenderTimes={metrics.componentRenderTimes || []} />
        <ApiMetrics apiResponseTimes={metrics.apiResponseTimes || []} />
        {cacheStats && <CacheStats cacheStats={cacheStats} />}
      </div>

      {/* Core Web Vitals Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Core Web Vitals
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">
              {metrics.coreWebVitals?.lcp?.toFixed(0) || 0}ms
            </div>
            <div className="text-sm text-gray-300 mb-2">Largest Contentful Paint</div>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
              (metrics.coreWebVitals?.lcp || 0) < 2500 ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'
            }`}>
              {(metrics.coreWebVitals?.lcp || 0) < 2500 ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
              {(metrics.coreWebVitals?.lcp || 0) < 2500 ? 'Good' : 'Poor'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">
              {metrics.coreWebVitals?.fid?.toFixed(0) || 0}ms
            </div>
            <div className="text-sm text-gray-300 mb-2">First Input Delay</div>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
              (metrics.coreWebVitals?.fid || 0) < 100 ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'
            }`}>
              {(metrics.coreWebVitals?.fid || 0) < 100 ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
              {(metrics.coreWebVitals?.fid || 0) < 100 ? 'Good' : 'Poor'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">
              {metrics.coreWebVitals?.cls?.toFixed(3) || 0}
            </div>
            <div className="text-sm text-gray-300 mb-2">Cumulative Layout Shift</div>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
              (metrics.coreWebVitals?.cls || 0) < 0.1 ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'
            }`}>
              {(metrics.coreWebVitals?.cls || 0) < 0.1 ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
              {(metrics.coreWebVitals?.cls || 0) < 0.1 ? 'Good' : 'Poor'}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

PerformanceDashboard.displayName = 'PerformanceDashboard';

export default PerformanceDashboard;