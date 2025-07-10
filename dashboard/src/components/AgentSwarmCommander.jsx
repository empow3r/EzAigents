'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Zap, 
  Target, 
  Brain, 
  Cpu, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Eye,
  Command
} from 'lucide-react';

export default function AgentSwarmCommander({ 
  onAgentCommand,
  onMetricClick,
  realTimeData = {}
}) {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [commandMode, setCommandMode] = useState('auto'); // auto, manual, emergency
  const [swarmView, setSwarmView] = useState('grid'); // grid, network, performance
  
  // Mock agent data - replace with real API calls
  const [agents, setAgents] = useState([
    {
      id: 'claude_001',
      type: 'Claude',
      status: 'active',
      performance: 97,
      tasksCompleted: 247,
      currentTask: 'API optimization',
      roi: 45000,
      efficiency: 94,
      uptime: 99.8,
      specialty: 'Backend Architecture'
    },
    {
      id: 'gpt_002',
      type: 'GPT-4',
      status: 'active',
      performance: 89,
      tasksCompleted: 189,
      currentTask: 'Frontend components',
      roi: 32000,
      efficiency: 87,
      uptime: 98.5,
      specialty: 'Frontend Development'
    },
    {
      id: 'deepseek_003',
      type: 'DeepSeek',
      status: 'idle',
      performance: 92,
      tasksCompleted: 156,
      currentTask: 'Standing by',
      roi: 28000,
      efficiency: 91,
      uptime: 99.2,
      specialty: 'Code Testing'
    },
    {
      id: 'mistral_004',
      type: 'Mistral',
      status: 'active',
      performance: 85,
      tasksCompleted: 134,
      currentTask: 'Documentation',
      roi: 22000,
      efficiency: 83,
      uptime: 97.8,
      specialty: 'Documentation'
    },
    {
      id: 'gemini_005',
      type: 'Gemini',
      status: 'warning',
      performance: 76,
      tasksCompleted: 98,
      currentTask: 'Error analysis',
      roi: 18000,
      efficiency: 78,
      uptime: 95.2,
      specialty: 'Error Analysis'
    }
  ]);

  const getStatusColor = (status, performance) => {
    if (status === 'active' && performance > 90) return 'text-green-400';
    if (status === 'active' && performance > 75) return 'text-yellow-400';
    if (status === 'idle') return 'text-gray-400';
    return 'text-red-400';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'idle': return Clock;
      case 'warning': return AlertTriangle;
      default: return Activity;
    }
  };

  const AgentCard = ({ agent, isSelected, onClick }) => {
    const StatusIcon = getStatusIcon(agent.status);
    
    return (
      <motion.div
        className={`relative bg-gray-800/50 backdrop-blur-lg border rounded-xl p-4 cursor-pointer transition-all ${
          isSelected 
            ? 'border-cyan-500 bg-cyan-500/10' 
            : 'border-gray-700/50 hover:border-gray-600/50'
        }`}
        onClick={() => onClick(agent)}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Agent header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              agent.status === 'active' ? 'bg-green-400' :
              agent.status === 'idle' ? 'bg-gray-400' : 'bg-red-400'
            }`} />
            <span className="font-semibold text-white">{agent.type}</span>
          </div>
          <StatusIcon className={`w-4 h-4 ${getStatusColor(agent.status, agent.performance)}`} />
        </div>
        
        {/* Performance metrics */}
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Performance</span>
            <span className="text-white font-mono">{agent.performance}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div 
              className={`h-2 rounded-full ${
                agent.performance > 90 ? 'bg-green-400' :
                agent.performance > 75 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${agent.performance}%` }}
              transition={{ duration: 1, delay: 0.2 }}
            />
          </div>
        </div>
        
        {/* Current task */}
        <div className="text-xs text-gray-400 mb-2">
          <div className="font-semibold">Current Task:</div>
          <div className="text-gray-300">{agent.currentTask}</div>
        </div>
        
        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-gray-400">Tasks</div>
            <div className="text-cyan-400 font-mono">{agent.tasksCompleted}</div>
          </div>
          <div>
            <div className="text-gray-400">ROI</div>
            <div className="text-green-400 font-mono">${agent.roi/1000}K</div>
          </div>
        </div>
        
        {/* Agent specialty badge */}
        <div className="absolute top-2 right-2">
          <div className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">
            {agent.specialty}
          </div>
        </div>
      </motion.div>
    );
  };

  const CommandPanel = ({ agent }) => (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-4 top-1/4 w-80 bg-gray-900/95 backdrop-blur-lg border border-cyan-500/30 rounded-2xl p-6 z-50"
      style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.3)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-cyan-400">
          {agent.type} Command Center
        </h3>
        <button 
          onClick={() => setSelectedAgent(null)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      {/* Agent details */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-gray-400">Status</div>
            <div className={`font-semibold ${getStatusColor(agent.status, agent.performance)}`}>
              {agent.status.toUpperCase()}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Uptime</div>
            <div className="text-green-400 font-mono">{agent.uptime}%</div>
          </div>
          <div>
            <div className="text-gray-400">Efficiency</div>
            <div className="text-blue-400 font-mono">{agent.efficiency}%</div>
          </div>
          <div>
            <div className="text-gray-400">Revenue</div>
            <div className="text-green-400 font-mono">${agent.roi/1000}K</div>
          </div>
        </div>
      </div>
      
      {/* Command buttons */}
      <div className="space-y-3">
        <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all flex items-center justify-center gap-2">
          <Play className="w-4 h-4" />
          Optimize Performance
        </button>
        <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-lg hover:from-blue-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2">
          <ArrowUp className="w-4 h-4" />
          Scale Up
        </button>
        <button className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-2 px-4 rounded-lg hover:from-yellow-500 hover:to-orange-500 transition-all flex items-center justify-center gap-2">
          <Pause className="w-4 h-4" />
          Pause Agent
        </button>
        <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-4 rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset & Restart
        </button>
        <button className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-2 px-4 rounded-lg hover:from-red-500 hover:to-red-600 transition-all flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Emergency Stop
        </button>
      </div>
      
      {/* Quick deployment */}
      <div className="mt-6 p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
        <h4 className="text-blue-400 font-semibold mb-2">Quick Deploy</h4>
        <div className="space-y-2">
          <button className="w-full text-left text-sm text-gray-300 hover:text-white p-2 rounded hover:bg-gray-700/50 transition-all">
            → Deploy to Frontend Tasks
          </button>
          <button className="w-full text-left text-sm text-gray-300 hover:text-white p-2 rounded hover:bg-gray-700/50 transition-all">
            → Deploy to Backend Optimization
          </button>
          <button className="w-full text-left text-sm text-gray-300 hover:text-white p-2 rounded hover:bg-gray-700/50 transition-all">
            → Deploy to Testing Pipeline
          </button>
        </div>
      </div>
    </motion.div>
  );

  const SwarmOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Total Agents', value: agents.length, color: 'text-blue-400', icon: Users },
        { label: 'Active', value: agents.filter(a => a.status === 'active').length, color: 'text-green-400', icon: CheckCircle },
        { label: 'Avg Performance', value: `${Math.round(agents.reduce((sum, a) => sum + a.performance, 0) / agents.length)}%`, color: 'text-cyan-400', icon: Activity },
        { label: 'Total ROI', value: `$${Math.round(agents.reduce((sum, a) => sum + a.roi, 0) / 1000)}K`, color: 'text-green-400', icon: Target }
      ].map((metric, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 rounded-xl p-4 cursor-pointer hover:border-cyan-500/30 transition-all"
          onClick={() => onMetricClick && onMetricClick(metric.label)}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">{metric.label}</div>
              <div className={`text-2xl font-bold ${metric.color}`}>{metric.value}</div>
            </div>
            <metric.icon className={`w-8 h-8 ${metric.color}`} />
          </div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Command Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Command className="w-6 h-6 text-cyan-400" />
            Agent Swarm Commander
          </h2>
          <div className="flex bg-gray-800 rounded-lg p-1">
            {['auto', 'manual', 'emergency'].map((mode) => (
              <button
                key={mode}
                onClick={() => setCommandMode(mode)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  commandMode === mode
                    ? mode === 'emergency' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-cyan-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {['grid', 'network', 'performance'].map((view) => (
            <button
              key={view}
              onClick={() => setSwarmView(view)}
              className={`px-3 py-2 rounded-lg text-xs transition-all ${
                swarmView === view
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {view.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Swarm Overview */}
      <SwarmOverview />

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isSelected={selectedAgent?.id === agent.id}
            onClick={setSelectedAgent}
          />
        ))}
      </div>

      {/* Global Actions */}
      <div className="flex flex-wrap gap-3">
        <button className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all flex items-center gap-2">
          <Play className="w-4 h-4" />
          Deploy All Idle Agents
        </button>
        <button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg hover:from-blue-500 hover:to-cyan-500 transition-all flex items-center gap-2">
          <ArrowUp className="w-4 h-4" />
          Auto-Scale Swarm
        </button>
        <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all flex items-center gap-2">
          <Brain className="w-4 h-4" />
          AI Optimize All
        </button>
        <button className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-lg hover:from-orange-500 hover:to-red-500 transition-all flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Emergency Protocol
        </button>
      </div>

      {/* Command Panel */}
      <AnimatePresence>
        {selectedAgent && (
          <CommandPanel agent={selectedAgent} />
        )}
      </AnimatePresence>
    </div>
  );
}