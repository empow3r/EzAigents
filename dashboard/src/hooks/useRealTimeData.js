import { useState, useEffect } from 'react';

/**
 * Custom hook for real-time data fetching and management
 * Provides simulated real-time data for the dashboard
 */
export const useRealTimeData = (endpoint = null, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Simulate real-time data
  const generateMockData = () => {
    const agents = [
      { id: 1, name: 'Claude-US-East', status: 'active', tasks: Math.floor(Math.random() * 500) + 200, location: 'New York', cpu: Math.random() * 100 },
      { id: 2, name: 'GPT-Europe', status: 'active', tasks: Math.floor(Math.random() * 500) + 200, location: 'London', cpu: Math.random() * 100 },
      { id: 3, name: 'Gemini-Asia', status: 'active', tasks: Math.floor(Math.random() * 500) + 200, location: 'Tokyo', cpu: Math.random() * 100 },
      { id: 4, name: 'Mistral-Pacific', status: Math.random() > 0.8 ? 'idle' : 'active', tasks: Math.floor(Math.random() * 300) + 100, location: 'Sydney', cpu: Math.random() * 100 },
    ];

    const metrics = {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'active').length,
      totalTasks: agents.reduce((sum, a) => sum + a.tasks, 0),
      successRate: 99.8 + Math.random() * 0.2,
      uptime: 99.9 + Math.random() * 0.1,
      avgCpu: agents.reduce((sum, a) => sum + a.cpu, 0) / agents.length,
      memory: 4.2 + Math.random() * 0.8,
      timestamp: new Date().toISOString(),
    };

    const activity = [
      { action: 'Deploy Agent', agent: 'Claude-US-East', time: '2 min ago', status: 'success' },
      { action: 'Complete Task', agent: 'GPT-Europe', time: '5 min ago', status: 'success' },
      { action: 'Start Processing', agent: 'Gemini-Asia', time: '8 min ago', status: 'info' },
      { action: 'System Update', agent: 'All Agents', time: '1 hour ago', status: 'info' },
    ];

    return {
      agents,
      metrics,
      activity,
      network: {
        connections: agents.length * 2,
        latency: Math.random() * 50 + 10,
        throughput: Math.random() * 1000 + 500,
      },
      system: {
        version: '2.1.0',
        build: 'stable',
        environment: 'production',
      }
    };
  };

  useEffect(() => {
    // Initial data load
    setLoading(true);
    setError(null);

    // Simulate API call delay
    const initialLoad = setTimeout(() => {
      try {
        const mockData = generateMockData();
        setData(mockData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }, 500);

    // Set up real-time updates
    const interval = setInterval(() => {
      try {
        const mockData = generateMockData();
        setData(mockData);
      } catch (err) {
        setError(err.message);
      }
    }, options.refreshInterval || 5000);

    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [endpoint, options.refreshInterval]);

  const refetch = () => {
    setLoading(true);
    setError(null);
    
    setTimeout(() => {
      try {
        const mockData = generateMockData();
        setData(mockData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }, 300);
  };

  return {
    data,
    loading,
    error,
    refetch,
    isConnected: !error && !loading,
  };
};

// Additional utility hooks for specific data types
export const useAgentData = () => {
  const { data, loading, error, refetch } = useRealTimeData('/api/agents', { refreshInterval: 3000 });
  
  return {
    agents: data?.agents || [],
    metrics: data?.metrics || {},
    loading,
    error,
    refetch,
  };
};

export const useSystemMetrics = () => {
  const { data, loading, error, refetch } = useRealTimeData('/api/metrics', { refreshInterval: 2000 });
  
  return {
    metrics: data?.metrics || {},
    system: data?.system || {},
    network: data?.network || {},
    loading,
    error,
    refetch,
  };
};

export const useActivityFeed = () => {
  const { data, loading, error, refetch } = useRealTimeData('/api/activity', { refreshInterval: 1000 });
  
  return {
    activity: data?.activity || [],
    loading,
    error,
    refetch,
  };
};

// Real-time metrics hook
export const useRealTimeMetrics = () => {
  const { data, loading, error, refetch } = useRealTimeData('/api/real-time-metrics', { refreshInterval: 1000 });
  
  return {
    metrics: data?.metrics || {},
    performance: data?.performance || {},
    alerts: data?.alerts || [],
    loading,
    error,
    refetch,
  };
};

// Predictive analytics hook
export const usePredictiveAnalytics = () => {
  const { data, loading, error, refetch } = useRealTimeData('/api/predictive-analytics', { refreshInterval: 5000 });
  
  const generatePredictiveData = () => {
    const now = new Date();
    const predictions = [];
    
    // Generate 24 hours of predictions
    for (let i = 0; i < 24; i++) {
      const time = new Date(now.getTime() + i * 60 * 60 * 1000);
      predictions.push({
        time: time.toISOString(),
        taskLoad: Math.sin(i * Math.PI / 12) * 200 + 400 + Math.random() * 100,
        agentUtilization: Math.sin((i + 6) * Math.PI / 12) * 30 + 70 + Math.random() * 10,
        errorRate: Math.max(0, Math.sin(i * Math.PI / 8) * 2 + 1 + Math.random() * 0.5),
        confidence: Math.max(0.6, Math.min(0.95, Math.random() * 0.3 + 0.7)),
      });
    }
    
    return {
      predictions,
      trends: {
        taskLoadTrend: Math.random() > 0.5 ? 'increasing' : 'decreasing',
        utilizationTrend: Math.random() > 0.5 ? 'stable' : 'optimizing',
        errorTrend: Math.random() > 0.7 ? 'improving' : 'stable',
      },
      recommendations: [
        'Consider scaling up agents during peak hours (10-14)',
        'Monitor error rates in Tokyo region',
        'Optimize task distribution for better load balancing',
      ],
    };
  };
  
  return {
    analytics: data?.analytics || generatePredictiveData(),
    insights: data?.insights || {},
    recommendations: data?.recommendations || [],
    loading,
    error,
    refetch,
  };
};

export default useRealTimeData;