import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Users, 
  DollarSign,
  Zap,
  Target,
  Brain,
  Shield,
  Eye,
  GitBranch,
  Settings,
  BarChart3
} from 'lucide-react';

const EnhancementCommandCenter = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [coordinationData, setCoordinationData] = useState(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState({});
  const [selectedEnhancement, setSelectedEnhancement] = useState(null);

  // Enhancement icons mapping
  const enhancementIcons = {
    'security-layer': Shield,
    'observability-stack': Eye,
    'distributed-queue-system': GitBranch,
    'intelligent-orchestration': Brain,
    'collaboration-framework': Users,
    'self-healing-infrastructure': Settings
  };

  // Enhancement colors
  const enhancementColors = {
    'security-layer': 'from-red-500 to-pink-500',
    'observability-stack': 'from-blue-500 to-cyan-500',
    'distributed-queue-system': 'from-green-500 to-emerald-500',
    'intelligent-orchestration': 'from-purple-500 to-violet-500',
    'collaboration-framework': 'from-orange-500 to-yellow-500',
    'self-healing-infrastructure': 'from-indigo-500 to-blue-500'
  };

  useEffect(() => {
    fetchAnalytics();
    fetchCoordination();
    const interval = setInterval(() => {
      fetchRealTimeMetrics();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/enhancement-analytics');
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchCoordination = async () => {
    try {
      const response = await fetch('/api/enhancement-coordination');
      const data = await response.json();
      setCoordinationData(data);
    } catch (error) {
      console.error('Failed to fetch coordination data:', error);
    }
  };

  const fetchRealTimeMetrics = async () => {
    try {
      const response = await fetch('/api/real-time-metrics');
      const data = await response.json();
      setRealTimeMetrics(data);
    } catch (error) {
      console.error('Failed to fetch real-time metrics:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'in_progress': return 'text-blue-400';
      case 'pending': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (!analyticsData || !coordinationData) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center"
            >
              <Zap className="text-white" size={20} />
            </motion.div>
            Enhancement Command Center
          </h1>
          <p className="text-gray-300 mt-1">Real-time monitoring and analytics for system enhancements</p>
        </div>
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30"
          >
            System Online
          </motion.div>
        </div>
      </motion.div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Overall Progress */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between mb-4">
            <Target className="text-blue-400" size={24} />
            <span className="text-2xl font-bold text-white">
              {coordinationData.overall_progress}%
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Overall Progress</h3>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${coordinationData.overall_progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
            />
          </div>
        </motion.div>

        {/* Active Tasks */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between mb-4">
            <Activity className="text-green-400" size={24} />
            <span className="text-2xl font-bold text-white">
              {analyticsData.overview.inProgressTasks}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Active Tasks</h3>
          <p className="text-gray-300 text-sm">
            {analyticsData.overview.completedTasks} completed
          </p>
        </motion.div>

        {/* Cost Efficiency */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="text-yellow-400" size={24} />
            <span className="text-2xl font-bold text-white">
              ${analyticsData.costs.totalCost.toFixed(2)}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Total Cost</h3>
          <p className="text-gray-300 text-sm">
            ${analyticsData.costs.averageCostPerTask.toFixed(2)} per task
          </p>
        </motion.div>

        {/* Quality Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="text-purple-400" size={24} />
            <span className="text-2xl font-bold text-white">
              {analyticsData.quality.overallQualityScore}%
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Quality Score</h3>
          <p className="text-gray-300 text-sm">
            Across all enhancements
          </p>
        </motion.div>
      </div>

      {/* Enhancement Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(coordinationData.enhancements).map(([enhancementId, enhancement]) => {
          const Icon = enhancementIcons[enhancementId] || Settings;
          const colorClass = enhancementColors[enhancementId] || 'from-gray-500 to-gray-600';
          
          return (
            <motion.div
              key={enhancementId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedEnhancement(enhancementId)}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 cursor-pointer hover:border-white/40 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                  <Icon className="text-white" size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(enhancement.priority)}`} />
                  <span className="text-xs text-gray-300 uppercase tracking-wide">
                    {enhancement.priority}
                  </span>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2 capitalize">
                {enhancementId.replace(/-/g, ' ')}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">Progress</span>
                    <span className="text-white font-medium">{enhancement.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${enhancement.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`bg-gradient-to-r ${colorClass} h-2 rounded-full`}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className={`${getStatusColor(enhancement.status)} capitalize font-medium`}>
                    {enhancement.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-gray-400">
                    {enhancement.availableAgents.length} agents
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recommendations */}
      {analyticsData.recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="text-blue-400" size={24} />
            AI Recommendations
          </h2>
          <div className="space-y-4">
            {analyticsData.recommendations.slice(0, 3).map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 bg-white/5 rounded-lg border border-white/10"
              >
                <div className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(rec.priority.toUpperCase())}`} />
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{rec.title}</h4>
                  <p className="text-gray-300 text-sm mb-2">{rec.description}</p>
                  <p className="text-blue-400 text-sm font-medium">{rec.action}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Agent Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
      >
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Users className="text-green-400" size={24} />
          Agent Network Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(analyticsData.agents).map(([agentName, agent]) => (
            <div
              key={agentName}
              className="p-4 bg-white/5 rounded-lg border border-white/10"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-white capitalize">{agentName}</h4>
                <div className={`w-2 h-2 rounded-full ${
                  agent.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                }`} />
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Completed:</span>
                  <span className="text-white">{agent.tasksCompleted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Success Rate:</span>
                  <span className="text-white">{agent.successRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Queued:</span>
                  <span className="text-white">{agent.tasksQueued}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Performance Metrics */}
      {analyticsData.performance.bottlenecks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="text-orange-400" size={24} />
            Performance Alerts
          </h2>
          <div className="space-y-3">
            {analyticsData.performance.bottlenecks.map((bottleneck, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-orange-500/10 rounded-lg border border-orange-500/30"
              >
                <div>
                  <h4 className="font-semibold text-white">{bottleneck.model} Bottleneck</h4>
                  <p className="text-orange-300 text-sm">
                    Queue: {bottleneck.queueDepth} | Processing: {bottleneck.processingCount}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  bottleneck.severity === 'high' 
                    ? 'bg-red-500/20 text-red-400' 
                    : 'bg-orange-500/20 text-orange-400'
                }`}>
                  {bottleneck.severity.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EnhancementCommandCenter;