'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Zap,
  Users,
  TrendingUp,
  Server,
  Cpu,
  Memory
} from 'lucide-react';

// Lightweight dashboard fallback without heavy dependencies
export default function SimpleDashboard() {
  const [agentStats, setAgentStats] = useState({
    claude: { active: true, tasks: 12, completed: 45, errors: 1, cpu: 65, memory: 42 },
    gpt: { active: true, tasks: 8, completed: 38, errors: 0, cpu: 45, memory: 38 },
    deepseek: { active: true, tasks: 3, completed: 22, errors: 2, cpu: 25, memory: 28 },
    mistral: { active: false, tasks: 0, completed: 15, errors: 0, cpu: 0, memory: 12 },
    gemini: { active: true, tasks: 6, completed: 31, errors: 1, cpu: 55, memory: 35 }
  });

  const [systemMetrics, setSystemMetrics] = useState({
    totalTasks: 29,
    completedToday: 151,
    errorRate: 2.6,
    avgResponseTime: 1.2,
    uptime: 99.8
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAgentStats(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(agent => {
          if (updated[agent].active) {
            // Simulate task progress
            if (Math.random() > 0.7) {
              updated[agent].completed += 1;
              updated[agent].tasks = Math.max(0, updated[agent].tasks - 1);
            }
            // Simulate new tasks
            if (Math.random() > 0.8) {
              updated[agent].tasks += Math.floor(Math.random() * 3);
            }
            // Simulate CPU/memory fluctuation
            updated[agent].cpu = Math.max(0, Math.min(100, 
              updated[agent].cpu + (Math.random() - 0.5) * 10
            ));
            updated[agent].memory = Math.max(0, Math.min(100, 
              updated[agent].memory + (Math.random() - 0.5) * 5
            ));
          }
        });
        return updated;
      });

      // Update system metrics
      setSystemMetrics(prev => ({
        ...prev,
        totalTasks: Object.values(agentStats).reduce((sum, agent) => sum + agent.tasks, 0),
        avgResponseTime: 0.8 + Math.random() * 0.8,
        errorRate: Math.max(0, prev.errorRate + (Math.random() - 0.5) * 0.2)
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [agentStats]);

  const totalActiveAgents = useMemo(() => 
    Object.values(agentStats).filter(agent => agent.active).length,
    [agentStats]
  );

  const MetricCard = ({ title, value, icon: Icon, trend, color = "blue" }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-300 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trend > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
              <span className="ml-1">{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-500/20`}>
          <Icon className={`text-${color}-400`} size={24} />
        </div>
      </div>
    </motion.div>
  );

  const AgentCard = ({ name, stats, color }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${color} rounded-lg p-6 text-white relative overflow-hidden`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{name}</h3>
        <div className={`flex items-center space-x-1 ${
          stats.active ? 'text-green-300' : 'text-gray-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            stats.active ? 'bg-green-400' : 'bg-gray-400'
          }`} />
          <span className="text-sm">{stats.active ? 'Active' : 'Offline'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs opacity-75">Active Tasks</p>
          <p className="text-xl font-bold">{stats.tasks}</p>
        </div>
        <div>
          <p className="text-xs opacity-75">Completed</p>
          <p className="text-xl font-bold">{stats.completed}</p>
        </div>
      </div>

      {/* Resource usage bars */}
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>CPU</span>
            <span>{stats.cpu}%</span>
          </div>
          <div className="h-2 bg-black/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.cpu}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-white/40 rounded-full"
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Memory</span>
            <span>{stats.memory}%</span>
          </div>
          <div className="h-2 bg-black/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.memory}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-white/40 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Background pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <Cpu size={128} />
      </div>
    </motion.div>
  );

  const agentColors = {
    claude: 'from-orange-500 to-red-600',
    gpt: 'from-green-500 to-emerald-600',
    deepseek: 'from-blue-500 to-indigo-600',
    mistral: 'from-purple-500 to-pink-600',
    gemini: 'from-cyan-500 to-blue-600'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Agent Dashboard (Lightweight)
          </h1>
          <p className="text-gray-300">
            Simplified view without heavy animations and 3D effects
          </p>
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <MetricCard
            title="Active Agents"
            value={totalActiveAgents}
            icon={Users}
            trend={5}
            color="green"
          />
          <MetricCard
            title="Active Tasks"
            value={systemMetrics.totalTasks}
            icon={Activity}
            trend={-2}
            color="blue"
          />
          <MetricCard
            title="Completed Today"
            value={systemMetrics.completedToday}
            icon={CheckCircle2}
            trend={12}
            color="emerald"
          />
          <MetricCard
            title="Error Rate"
            value={`${systemMetrics.errorRate.toFixed(1)}%`}
            icon={AlertCircle}
            trend={-15}
            color="red"
          />
          <MetricCard
            title="Avg Response"
            value={`${systemMetrics.avgResponseTime.toFixed(1)}s`}
            icon={Clock}
            trend={8}
            color="yellow"
          />
        </div>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {Object.entries(agentStats).map(([name, stats]) => (
            <AgentCard
              key={name}
              name={name.charAt(0).toUpperCase() + name.slice(1)}
              stats={stats}
              color={agentColors[name]}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex items-center justify-center space-x-2 p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-300 transition-colors">
              <Zap size={16} />
              <span>Start All</span>
            </button>
            <button className="flex items-center justify-center space-x-2 p-3 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-300 transition-colors">
              <Server size={16} />
              <span>Stop All</span>
            </button>
            <button className="flex items-center justify-center space-x-2 p-3 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-300 transition-colors">
              <Memory size={16} />
              <span>Clear Cache</span>
            </button>
            <button className="flex items-center justify-center space-x-2 p-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-purple-300 transition-colors">
              <Activity size={16} />
              <span>View Logs</span>
            </button>
          </div>
        </div>

        {/* Performance Note */}
        <div className="mt-6 text-center text-gray-400 text-sm">
          This is a lightweight dashboard optimized for performance. For advanced features, 
          use the Enhanced Dashboard tab.
        </div>
      </div>
    </div>
  );
}