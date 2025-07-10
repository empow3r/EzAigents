'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Target, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity, 
  Cpu, 
  Gauge,
  Command,
  Crown,
  Brain,
  Rocket,
  Shield,
  Settings,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX
} from 'lucide-react';

export default function ExecutiveCommandCenter({ darkMode = true }) {
  const [godMode, setGodMode] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [aiAdvisorActive, setAiAdvisorActive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [contextualMenu, setContextualMenu] = useState(null);
  const [agentSwarmStatus, setAgentSwarmStatus] = useState('active');
  
  const canvasRef = useRef(null);

  // Real-time metrics simulation
  const [metrics, setMetrics] = useState({
    roi: { value: 847, target: 1000, trend: '+23%' },
    agents: { active: 47, total: 100, efficiency: 94 },
    revenue: { current: 2.4, projected: 3.1, growth: 29 },
    tasks: { completed: 1247, pending: 234, success: 97.8 },
    performance: { cpu: 78, memory: 65, latency: 12 },
    threat: { level: 'low', score: 15, incidents: 0 }
  });

  // Executive-level insights
  const [aiInsights, setAiInsights] = useState([
    { priority: 'critical', text: 'Deploy 15 more agents to backend optimization - projected +$280K ROI this quarter', action: 'deploy' },
    { priority: 'high', text: 'Customer acquisition velocity up 34% - scale marketing agents immediately', action: 'scale' },
    { priority: 'medium', text: 'Consider pivoting 20% of agents to mobile optimization for Q4 push', action: 'analyze' }
  ]);

  // Radial gauge component
  const RadialGauge = ({ value, max, label, color, size = 120, thickness = 8 }) => {
    const percentage = (value / max) * 100;
    const circumference = 2 * Math.PI * (size / 2 - thickness);
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <motion.div 
        className="relative flex items-center justify-center cursor-pointer group"
        whileHover={{ scale: 1.05 }}
        onClick={() => setSelectedMetric(label)}
      >
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - thickness}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={thickness}
            fill="none"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - thickness}
            stroke={color}
            strokeWidth={thickness}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="drop-shadow-lg"
            style={{
              filter: `drop-shadow(0 0 8px ${color})`
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.div 
            className="text-2xl font-bold text-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            {value}
          </motion.div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div>
        </div>
      </motion.div>
    );
  };

  // Contextual command panel
  const ContextualPanel = ({ metric }) => (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-gray-900/95 backdrop-blur-lg border border-cyan-500/30 rounded-2xl p-6 min-w-80 z-50"
      style={{
        boxShadow: '0 0 30px rgba(6, 182, 212, 0.3)'
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-cyan-400">{metric} Command</h3>
        <button 
          onClick={() => setSelectedMetric(null)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-3">
        <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all">
          Optimize Now
        </button>
        <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-lg hover:from-blue-500 hover:to-cyan-500 transition-all">
          Scale Up
        </button>
        <button className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-2 px-4 rounded-lg hover:from-orange-500 hover:to-red-500 transition-all">
          Emergency Stop
        </button>
      </div>
    </motion.div>
  );

  // AI Strategic Advisor
  const AIAdvisor = () => (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-purple-900/90 to-indigo-900/90 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-4 z-40"
      style={{
        boxShadow: '0 0 30px rgba(147, 51, 234, 0.3)'
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-purple-300">Strategic AI Advisor</h3>
          <div className="text-xs text-gray-400">Analyzing market conditions & agent performance</div>
        </div>
        <button 
          onClick={() => setAiAdvisorActive(!aiAdvisorActive)}
          className="ml-auto text-purple-400 hover:text-purple-300"
        >
          {aiAdvisorActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>
      
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {aiInsights.map((insight, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.2 }}
            className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${
              insight.priority === 'critical' 
                ? 'bg-red-900/30 border-red-500' 
                : insight.priority === 'high'
                ? 'bg-orange-900/30 border-orange-500'
                : 'bg-blue-900/30 border-blue-500'
            }`}
          >
            <div className="flex-1 text-sm text-gray-200">{insight.text}</div>
            <button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-3 py-1 rounded-full text-xs hover:from-cyan-400 hover:to-blue-400 transition-all">
              Execute
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden relative">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" 
             style={{
               backgroundImage: `
                 radial-gradient(circle at 1px 1px, rgba(6, 182, 212, 0.3) 1px, transparent 0)
               `,
               backgroundSize: '50px 50px'
             }} 
        />
      </div>

      {/* God Mode Toggle */}
      <motion.button
        className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-full font-bold tracking-wide transition-all ${
          godMode 
            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-2xl' 
            : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'
        }`}
        onClick={() => setGodMode(!godMode)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          boxShadow: godMode ? '0 0 30px rgba(251, 191, 36, 0.5)' : 'none'
        }}
      >
        <Crown className={`w-5 h-5 inline mr-2 ${godMode ? 'text-black' : 'text-gray-400'}`} />
        GOD MODE
      </motion.button>

      {/* Main Command Center */}
      <div className="container mx-auto px-6 py-8">
        {/* Executive Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Executive Command Center
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>Agent Swarm: <span className="text-green-400 font-semibold">47 Active</span></span>
            <span>Revenue Impact: <span className="text-green-400 font-semibold">+$2.4M</span></span>
            <span>Success Rate: <span className="text-green-400 font-semibold">97.8%</span></span>
          </div>
        </motion.div>

        {/* Primary Radial Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Panel - Key Metrics */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                ROI Performance
              </h3>
              <div className="flex justify-center mb-4">
                <RadialGauge 
                  value={metrics.roi.value} 
                  max={metrics.roi.target} 
                  label="ROI" 
                  color="#10B981" 
                  size={140}
                />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">${metrics.roi.value}K</div>
                <div className="text-sm text-gray-400">Target: ${metrics.roi.target}K</div>
                <div className="text-lg font-semibold text-green-400">{metrics.roi.trend}</div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Agent Fleet
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <RadialGauge 
                  value={metrics.agents.active} 
                  max={metrics.agents.total} 
                  label="Active" 
                  color="#3B82F6" 
                  size={100}
                />
                <RadialGauge 
                  value={metrics.agents.efficiency} 
                  max={100} 
                  label="Efficiency" 
                  color="#8B5CF6" 
                  size={100}
                />
              </div>
            </div>
          </motion.div>

          {/* Center Panel - Main Display */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-1"
          >
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50 h-full flex flex-col items-center justify-center">
              <motion.div
                className="relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-48 h-48 border-4 border-cyan-500/30 rounded-full relative flex items-center justify-center">
                  <div className="w-32 h-32 border-2 border-blue-500/50 rounded-full flex items-center justify-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Command className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  
                  {/* Floating metrics around the circle */}
                  {[
                    { icon: DollarSign, value: '$2.4M', position: 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-4' },
                    { icon: Activity, value: '97.8%', position: 'right-0 top-1/2 transform translate-x-4 -translate-y-1/2' },
                    { icon: Cpu, value: '47 Active', position: 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-4' },
                    { icon: Shield, value: 'Secure', position: 'left-0 top-1/2 transform -translate-x-4 -translate-y-1/2' }
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      className={`absolute ${item.position} bg-gray-900/90 backdrop-blur-lg border border-cyan-500/30 rounded-lg px-3 py-2`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.2 }}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-semibold text-white">{item.value}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              
              <motion.div 
                className="mt-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  System Optimal
                </div>
                <div className="text-sm text-gray-400 mt-2">All agents performing within parameters</div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Panel - Action Center */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-orange-400 mb-4 flex items-center">
                <Rocket className="w-5 h-5 mr-2" />
                Quick Actions
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Deploy New Agents', color: 'from-green-500 to-emerald-500', icon: Play },
                  { label: 'Emergency Stop', color: 'from-red-500 to-orange-500', icon: Pause },
                  { label: 'System Reset', color: 'from-blue-500 to-cyan-500', icon: RotateCcw },
                  { label: 'Scale Operations', color: 'from-purple-500 to-pink-500', icon: TrendingUp }
                ].map((action, idx) => (
                  <motion.button
                    key={idx}
                    className={`w-full bg-gradient-to-r ${action.color} text-white py-3 px-4 rounded-lg hover:shadow-lg transition-all flex items-center justify-between group`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center">
                      <action.icon className="w-4 h-4 mr-3" />
                      {action.label}
                    </div>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center">
                <Gauge className="w-5 h-5 mr-2" />
                Performance
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>CPU Usage</span>
                    <span>{metrics.performance.cpu}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <motion.div 
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${metrics.performance.cpu}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Memory</span>
                    <span>{metrics.performance.memory}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <motion.div 
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${metrics.performance.memory}%` }}
                      transition={{ duration: 1, delay: 0.7 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Contextual Panels */}
      <AnimatePresence>
        {selectedMetric && (
          <ContextualPanel metric={selectedMetric} />
        )}
      </AnimatePresence>

      {/* AI Strategic Advisor */}
      <AnimatePresence>
        {aiAdvisorActive && (
          <AIAdvisor />
        )}
      </AnimatePresence>

      {/* God Mode Overlay */}
      <AnimatePresence>
        {godMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-lg z-30 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-gradient-to-br from-yellow-900/90 to-orange-900/90 border border-yellow-500/50 rounded-3xl p-8 max-w-4xl mx-4"
            >
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-yellow-400 mb-4">GOD MODE ACTIVATED</h2>
                <p className="text-gray-300">Advanced controls and system overrides available</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  'System Override', 'Agent Deployment', 'Revenue Optimization', 'Emergency Protocols',
                  'Market Analysis', 'Competitive Intel', 'Resource Allocation', 'Strategic Planning'
                ].map((feature, idx) => (
                  <motion.button
                    key={idx}
                    className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-4 px-6 rounded-xl hover:from-yellow-500 hover:to-orange-500 transition-all font-semibold"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    {feature}
                  </motion.button>
                ))}
              </div>
              
              <div className="mt-8 text-center">
                <button 
                  onClick={() => setGodMode(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-xl transition-all"
                >
                  Exit God Mode
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}