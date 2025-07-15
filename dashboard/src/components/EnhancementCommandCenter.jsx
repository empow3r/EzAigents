'use client';
import React, { useState, useRef, memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/src/components/ui/card';
import { AnimatedTile } from '@/src/components/ui/AnimatedTile';
import { cascadeCards, elasticScale, smoothCounter, tileFloat } from '@/src/components/ui/animations';
import * as Icons from 'lucide-react';

// Icon mapping for better readability
const icons = {
  zap: Zap,
  clock: Clock,
  activity: Activity,
  down: TrendingDown,
  up: TrendingUp,
  users: Users,
  alert: AlertTriangle,
  check: CheckCircle,
  dollar: DollarSign
};

// Component styles
const getStyles = (darkMode) => ({
  container: `p-3 sm:p-4 lg:p-6 space-y-4 min-h-screen ${
    darkMode 
      ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
      : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
  }`,
  card: `backdrop-blur-sm border rounded-xl ${
    darkMode 
      ? 'bg-white/10 border-white/20' 
      : 'bg-white/80 border-gray-200'
  }`,
  text: {
    primary: darkMode ? 'text-white' : 'text-gray-900',
    secondary: darkMode ? 'text-gray-300' : 'text-gray-600',
    accent: darkMode ? 'text-blue-400' : 'text-blue-600',
    muted: darkMode ? 'text-gray-400' : 'text-gray-500'
  },
  button: (active) => `px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all ${
    active
      ? darkMode
        ? 'bg-blue-600 text-white shadow-lg'
        : 'bg-blue-50 text-blue-600 border border-blue-200'
      : darkMode
        ? 'text-gray-300 hover:text-white hover:bg-white/10'
        : 'text-gray-600 hover:text-gray-900 hover:bg-black/5'
  }`
});

// Global cache
let cache = {};
let lastFetch = 0;
let mountedRef;

// Data fetching function
const fetchData = async () => {
  if (Date.now() - lastFetch < 60000 && cache.data) return;
  
  try {
    const [analytics, coordination] = await Promise.all([
      fetch('/api/enhancement-analytics').then(r => r.json()).catch(() => ({})),
      fetch('/api/enhancement-coordination').then(r => r.json()).catch(() => ({}))
    ]);
    
    if (mountedRef?.current) {
      cache.data = { analytics, coordination };
      lastFetch = Date.now();
    }
  } catch (error) {
    console.warn('Failed to fetch enhancement data:', error);
    // Provide fallback data
    cache.data = {
      analytics: {
        overview: { inProgressTasks: 0, completedTasks: 0 },
        costs: { totalCost: 0 },
        quality: { overallQualityScore: 0 },
        agents: {},
        recommendations: [],
        performance: { bottlenecks: [] }
      },
      coordination: {
        overall_progress: 0,
        enhancements: {}
      }
    };
  }
};

const ProgressBar = ({ progress, className = "" }) => (
  <div className={`w-full bg-gray-700 rounded-full h-2 ${className}`}>
    <div 
      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
      style={{ width: `${Math.min(progress || 0, 100)}%` }}
    />
  </div>
);

const LoadingSpinner = ({ darkMode }) => (
  <div className="flex items-center justify-center h-96">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      className={`w-8 h-8 border-2 border-t-transparent rounded-full ${
        darkMode ? 'border-blue-400' : 'border-blue-600'
      }`}
    />
  </div>
);

export default memo(function EnhancementCommandCenter({ darkMode = true }) {
  const [data, setData] = useState(null);
  const [activeView, setActiveView] = useState(0);
  mountedRef = useRef(true);

  const styles = getStyles(darkMode);

  useEffect(() => {
    fetchData().then(() => setData(cache.data));
    const interval = setInterval(() => {
      fetchData().then(() => setData(cache.data));
    }, 30000);
    
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  if (!data) return <LoadingSpinner darkMode={darkMode} />;

  const { analytics, coordination } = data;
  const progress = coordination.overall_progress || 0;
  const enhancements = Object.entries(coordination.enhancements || {}).slice(0, 6);

  return (
    <div className={styles.container}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0"
      >
        <div className="flex items-center space-x-2">
          <Icons.Zap className={`w-6 h-6 ${styles.text.accent}`} />
          <h1 className={`text-xl sm:text-2xl font-bold ${styles.text.primary}`}>
            Command Center
          </h1>
        </div>
        
        <div className="flex space-x-1 sm:space-x-2">
          {['Overview', 'Agents', 'Alerts'].map((tab, index) => (
            <button
              key={tab}
              onClick={() => setActiveView(index)}
              className={styles.button(activeView === index)}
            >
              {tab}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div
        {...cascadeCards.container}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        <AnimatedTile delay={0}>
          <Card className={styles.card}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex justify-between items-center mb-2">
                <Icons.Clock className={`w-5 h-5 ${styles.text.accent}`} />
                <motion.span 
                  className={`text-lg sm:text-xl font-bold ${styles.text.primary}`}
                  {...smoothCounter}
                  key={progress}
                >
                  {progress}%
                </motion.span>
              </div>
              <p className={`text-xs ${styles.text.secondary}`}>Progress</p>
            </CardContent>
          </Card>
        </AnimatedTile>

        <AnimatedTile delay={0.1}>
          <Card className={styles.card}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex justify-between items-center mb-2">
                <Icons.Activity className={`w-5 h-5 ${styles.text.accent}`} />
                <motion.span 
                  className={`text-lg sm:text-xl font-bold ${styles.text.primary}`}
                  {...smoothCounter}
                  key={analytics.overview?.inProgressTasks}
                >
                  {analytics.overview?.inProgressTasks || 0}
                </motion.span>
              </div>
              <p className={`text-xs ${styles.text.secondary}`}>Active</p>
              <p className={`text-xs ${styles.text.muted}`}>
                {analytics.overview?.completedTasks || 0} done
              </p>
            </CardContent>
          </Card>
        </AnimatedTile>

        <AnimatedTile delay={0.2}>
          <Card className={styles.card}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex justify-between items-center mb-2">
                <Icons.DollarSign className={`w-5 h-5 ${styles.text.accent}`} />
                <motion.span 
                  className={`text-lg sm:text-xl font-bold ${styles.text.primary}`}
                  {...smoothCounter}
                  key={Math.round(analytics.costs?.totalCost || 0)}
                >
                  ${Math.round(analytics.costs?.totalCost || 0)}
                </motion.span>
              </div>
              <p className={`text-xs ${styles.text.secondary}`}>Cost</p>
            </CardContent>
          </Card>
        </AnimatedTile>

        <AnimatedTile delay={0.3}>
          <Card className={styles.card}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex justify-between items-center mb-2">
                <Icons.TrendingUp className={`w-5 h-5 ${styles.text.accent}`} />
                <motion.span 
                  className={`text-lg sm:text-xl font-bold ${styles.text.primary}`}
                  {...smoothCounter}
                  key={analytics.quality?.overallQualityScore}
                >
                  {analytics.quality?.overallQualityScore || 0}%
                </motion.span>
              </div>
              <p className={`text-xs ${styles.text.secondary}`}>Quality</p>
            </CardContent>
          </Card>
        </AnimatedTile>
      </motion.div>

      {/* Content Views */}
      <motion.div
        key={activeView}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeView === 0 && (
          <div className="space-y-4">
            {/* Enhancements Grid */}
            {enhancements.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {enhancements.map(([id, enhancement]) => (
                  <Card key={id} className={styles.card}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-sm font-medium ${styles.text.primary}`}>
                          {id.split('-')[0]}
                        </span>
                        <span className={`text-xs ${styles.text.accent}`}>
                          {enhancement.progress || 0}%
                        </span>
                      </div>
                      <ProgressBar progress={enhancement.progress} className="mb-2" />
                      <span className={`text-xs ${styles.text.muted}`}>
                        {enhancement.availableAgents?.length || 0} agents
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {analytics.recommendations?.length > 0 && (
              <Card className={styles.card}>
                <CardContent className="p-3 sm:p-4">
                  <h2 className={`text-sm font-bold ${styles.text.primary} mb-2`}>
                    Recommended Actions
                  </h2>
                  <div className="space-y-2">
                    {analytics.recommendations.slice(0, 2).map((rec, index) => (
                      <p key={index} className={`text-xs ${styles.text.secondary}`}>
                        {rec.title?.slice(0, 60)}...
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeView === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
            {Object.entries(analytics.agents || {}).map(([name, agent]) => (
              <Card key={name} className={styles.card}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-medium ${styles.text.primary}`}>
                      {name}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${
                      agent.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                    }`} />
                  </div>
                  <p className={`text-xs ${styles.text.muted}`}>
                    Done: {agent.tasksCompleted || 0}
                  </p>
                  <p className={`text-xs ${styles.text.muted}`}>
                    Rate: {agent.successRate || 0}%
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeView === 2 && analytics.performance?.bottlenecks?.length > 0 && (
          <div className="space-y-2">
            {analytics.performance.bottlenecks.slice(0, 3).map((bottleneck, index) => (
              <Card key={index} className="bg-orange-500/10 border border-orange-500/30">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${styles.text.primary}`}>
                      {bottleneck.model} (Queue: {bottleneck.queueDepth})
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      bottleneck.severity === 'high' 
                        ? 'bg-red-500/20 text-red-400' 
                        : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {bottleneck.severity}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
});