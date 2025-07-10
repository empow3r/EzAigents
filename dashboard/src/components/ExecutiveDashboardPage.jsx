'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Users, 
  Command, 
  Brain,
  Settings,
  Crown,
  Eye,
  Maximize2,
  Minimize2,
  Layers,
  Zap
} from 'lucide-react';

import ExecutiveCommandCenter from './ExecutiveCommandCenter';
import AgentSwarmCommander from './AgentSwarmCommander';
import { CockpitGauge, StratifiedGauge, MiniGauge } from './ui/CockpitGauges';
import { ParticleField, HolographicGrid, DataStream, HolographicScanline, QuantumField } from './HolographicEffects';
import { useExecutiveVoiceCommands, useVoiceFeedback } from '../hooks/useAdvancedVoiceCommands';
import { useRealTimeMetrics, usePredictiveAnalytics } from '../hooks/useRealTimeData';
import EnhancedPredictiveAnalytics from './EnhancedPredictiveAnalytics';
import { businessContentService, getContentByRole, getEntrepreneurContent } from '../services/businessContentService';

export default function ExecutiveDashboardPage() {
  const [activeView, setActiveView] = useState('command'); // command, swarm, analytics, fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [godMode, setGodMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [immersiveMode, setImmersiveMode] = useState(false);

  // Enhanced real-time data with predictive analytics
  const { metrics: realTimeMetrics, isLoading } = useRealTimeMetrics({
    totalRevenue: 2400000,
    revenueGrowth: 23.7,
    activeAgents: 47,
    agentEfficiency: 94.2,
    tasksCompleted: 1247,
    taskSuccessRate: 97.8,
    systemHealth: 96.5,
    threatLevel: 15,
    energyConsumption: 78.3,
    costOptimization: 31.2
  });

  // Voice command integration
  const { speak, speakCommand } = useVoiceFeedback();
  const { isListening, transcript, toggleListening } = useExecutiveVoiceCommands((action, target) => {
    handleVoiceCommand(action, target);
  });

  // Historical data for predictive analytics
  const [historicalData, setHistoricalData] = useState([]);
  const { predictions, trends, anomalies } = usePredictiveAnalytics(historicalData);

  // Voice command handler
  const handleVoiceCommand = (action, target) => {
    speakCommand(action);
    
    switch (action) {
      case 'navigate':
        if (target === 'agents') setActiveView('swarm');
        else if (target === 'analytics') setActiveView('analytics');
        else if (target === 'revenue') setActiveView('analytics');
        break;
      case 'toggle':
        if (target === 'godMode') setGodMode(!godMode);
        else if (target === 'fullscreen') setIsFullscreen(!isFullscreen);
        break;
      case 'emergency':
        setGodMode(true);
        speak('Emergency protocols activated', { rate: 1.5, pitch: 1.2 });
        break;
      default:
        speak(`Executing ${action} on ${target}`);
    }
  };

  // Advanced metrics for executive overview
  const executiveMetrics = [
    {
      label: 'Revenue',
      value: realTimeMetrics.totalRevenue / 1000000,
      max: 5,
      color: '#10B981',
      unit: 'M',
      trend: '+23.7%',
      critical: false
    },
    {
      label: 'Agent Fleet',
      value: realTimeMetrics.activeAgents,
      max: 100,
      color: '#3B82F6',
      unit: 'agents',
      trend: '+12 today',
      critical: false
    },
    {
      label: 'Efficiency',
      value: realTimeMetrics.agentEfficiency,
      max: 100,
      color: '#8B5CF6',
      unit: '%',
      trend: '+2.3%',
      critical: false
    },
    {
      label: 'Success Rate',
      value: realTimeMetrics.taskSuccessRate,
      max: 100,
      color: '#F59E0B',
      unit: '%',
      trend: 'stable',
      critical: realTimeMetrics.taskSuccessRate < 95
    }
  ];

  const stratifiedLayers = [
    { label: 'Performance', value: 94, max: 100, color: '#10B981' },
    { label: 'Security', value: 85, max: 100, color: '#3B82F6' },
    { label: 'Efficiency', value: 91, max: 100, color: '#8B5CF6' },
    { label: 'Innovation', value: 78, max: 100, color: '#F59E0B' }
  ];

  // Navigation tabs
  const navigationTabs = [
    { id: 'command', label: 'Command Center', icon: Command, color: 'from-cyan-500 to-blue-500' },
    { id: 'swarm', label: 'Agent Swarm', icon: Users, color: 'from-green-500 to-emerald-500' },
    { id: 'analytics', label: 'Executive Analytics', icon: BarChart3, color: 'from-purple-500 to-pink-500' },
    { id: 'intelligence', label: 'AI Intelligence', icon: Brain, color: 'from-orange-500 to-red-500' }
  ];

  const handleMetricClick = (metricName) => {
    console.log(`Metric clicked: ${metricName}`);
    // Add contextual actions based on metric
  };

  const handleAgentCommand = (command, agentId) => {
    console.log(`Agent command: ${command} for agent: ${agentId}`);
    // Execute agent command
  };

  const AnalyticsView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Executive KPI Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {executiveMetrics.map((metric, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-6"
          >
            <CockpitGauge
              value={metric.value}
              max={metric.max}
              label={metric.label}
              unit={metric.unit}
              color={metric.color}
              critical={metric.critical}
              onClick={() => handleMetricClick(metric.label)}
            />
            <div className="mt-4 text-center">
              <div className={`text-lg font-semibold ${
                metric.trend.includes('+') ? 'text-green-400' : 'text-gray-400'
              }`}>
                {metric.trend}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Advanced Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Layers className="w-5 h-5 mr-2 text-cyan-400" />
            System Health Matrix
          </h3>
          <div className="flex justify-center">
            <StratifiedGauge
              layers={stratifiedLayers}
              label="Overall Health"
              onClick={() => handleMetricClick('System Health')}
            />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-400" />
            Resource Optimization
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <MiniGauge 
              value={realTimeMetrics.energyConsumption} 
              max={100} 
              label="Energy" 
              color="#F59E0B" 
            />
            <MiniGauge 
              value={100 - realTimeMetrics.costOptimization} 
              max={100} 
              label="Cost Savings" 
              color="#10B981" 
            />
            <MiniGauge 
              value={realTimeMetrics.systemHealth} 
              max={100} 
              label="Health" 
              color="#3B82F6" 
            />
            <MiniGauge 
              value={100 - realTimeMetrics.threatLevel} 
              max={100} 
              label="Security" 
              color="#8B5CF6" 
            />
          </div>
        </div>
      </div>
    </motion.div>
  );

  const IntelligenceView = () => {
    const entrepreneurContent = getEntrepreneurContent('daily');
    const wealthStrategies = businessContentService.wealthManagement;
    const healthPriorities = businessContentService.healthWellness;
    const ethicsGuidelines = businessContentService.ethicsResponsibilities;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Executive Business Intelligence */}
        <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-6 flex items-center">
            <Brain className="w-6 h-6 mr-2" />
            Executive Business Intelligence
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-purple-200">Daily Entrepreneur Priorities</h3>
              <div className="space-y-3">
                {entrepreneurContent.map((priority, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border-l-4 bg-blue-900/30 border-blue-500"
                  >
                    <div className="text-sm text-gray-200">{priority}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-purple-200">Wealth Management Principles</h3>
              <div className="space-y-3">
                {wealthStrategies.principles.slice(0, 3).map((principle, idx) => (
                  <div key={idx} className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-300">{principle}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Health & Wellness for Executives */}
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 backdrop-blur-lg border border-emerald-500/30 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-emerald-300 mb-6 flex items-center">
            <Eye className="w-6 h-6 mr-2" />
            Executive Health & Performance
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-emerald-200">Daily Health Priorities</h3>
              <div className="space-y-3">
                {healthPriorities.daily.map((priority, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border-l-4 bg-emerald-900/30 border-emerald-500"
                  >
                    <div className="text-sm text-gray-200">{priority}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-emerald-200">Performance Responsibilities</h3>
              <div className="space-y-3">
                {healthPriorities.responsibilities.map((responsibility, idx) => (
                  <div key={idx} className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-300">{responsibility}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Business Ethics & Stakeholder Responsibility */}
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 backdrop-blur-lg border border-orange-500/30 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-orange-300 mb-6 flex items-center">
            <Settings className="w-6 h-6 mr-2" />
            Business Ethics & Stakeholder Responsibility
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-orange-200">Stakeholder Responsibilities</h3>
              <div className="space-y-3">
                {ethicsGuidelines.stakeholder.map((responsibility, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border-l-4 bg-orange-900/30 border-orange-500"
                  >
                    <div className="text-sm text-gray-200">{responsibility}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-orange-200">Leadership Principles</h3>
              <div className="space-y-3">
                {ethicsGuidelines.leadership.map((principle, idx) => (
                  <div key={idx} className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-300">{principle}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Traditional AI Intelligence Section */}
        <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-6 flex items-center">
            <Brain className="w-6 h-6 mr-2" />
            AI Strategic Intelligence
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-purple-200">Market Intelligence</h3>
              <div className="space-y-3">
                {[
                  { priority: 'critical', text: 'Competitor launched similar AI solution - recommend immediate feature enhancement' },
                  { priority: 'high', text: 'Market demand for automation increased 47% this quarter' },
                  { priority: 'medium', text: 'New regulatory requirements may affect deployment strategy' }
                ].map((insight, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-l-4 ${
                      insight.priority === 'critical' 
                        ? 'bg-red-900/30 border-red-500' 
                        : insight.priority === 'high'
                        ? 'bg-orange-900/30 border-orange-500'
                        : 'bg-blue-900/30 border-blue-500'
                    }`}
                  >
                    <div className="text-sm text-gray-200">{insight.text}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-purple-200">Optimization Recommendations</h3>
              <div className="space-y-3">
                {[
                  { action: 'Scale Up', roi: '+$280K', description: 'Deploy 15 more agents to backend optimization' },
                  { action: 'Reallocate', roi: '+$150K', description: 'Move 20% of agents to mobile optimization' },
                  { action: 'Optimize', roi: '+$95K', description: 'Implement advanced caching on Claude agents' }
                ].map((rec, idx) => (
                  <div key={idx} className="bg-gray-800/50 p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">{rec.action}</div>
                      <div className="text-sm text-gray-400">{rec.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-bold">{rec.roi}</div>
                      <button className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-full mt-1">
                        Execute
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white relative overflow-hidden ${
      isFullscreen ? 'fixed inset-0 z-50' : ''
    }`}>
      {/* Immersive Background Effects */}
      {immersiveMode && (
        <>
          <ParticleField density={100} color="#00D4FF" interactive={true} />
          <HolographicGrid size={60} opacity={0.15} color="#00D4FF" />
          <QuantumField complexity={3} />
          <HolographicScanline speed={3} height={2} color="#00D4FF" />
          <DataStream direction="up" speed={1.5} density={15} />
        </>
      )}
      {/* Top Navigation */}
      <div className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Executive Command Dashboard
              </h1>
              
              {/* Tab Navigation */}
              <div className="flex bg-gray-800/50 rounded-lg p-1">
                {navigationTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeView === tab.id
                        ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Voice Control Button */}
              <motion.button
                onClick={() => {
                  setVoiceEnabled(!voiceEnabled);
                  toggleListening();
                }}
                className={`p-2 rounded-lg transition-all ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : voiceEnabled
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Brain className="w-4 h-4" />
              </motion.button>

              {/* Immersive Mode Toggle */}
              <motion.button
                onClick={() => setImmersiveMode(!immersiveMode)}
                className={`p-2 rounded-lg transition-all ${
                  immersiveMode 
                    ? 'bg-cyan-500 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Zap className="w-4 h-4" />
              </motion.button>

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              
              <button
                onClick={() => setGodMode(!godMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                  godMode 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Crown className="w-4 h-4" />
                GOD MODE
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          {activeView === 'command' && (
            <motion.div
              key="command"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <ExecutiveCommandCenter darkMode={true} />
            </motion.div>
          )}
          
          {activeView === 'swarm' && (
            <motion.div
              key="swarm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <AgentSwarmCommander 
                onAgentCommand={handleAgentCommand}
                onMetricClick={handleMetricClick}
                realTimeData={realTimeMetrics}
              />
            </motion.div>
          )}
          
          {activeView === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <AnalyticsView />
            </motion.div>
          )}
          
          {activeView === 'intelligence' && (
            <motion.div
              key="intelligence"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <IntelligenceView />
            </motion.div>
          )}
          
          {activeView === 'predictive' && (
            <motion.div
              key="predictive"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <EnhancedPredictiveAnalytics
                predictions={predictions}
                trends={trends}
                anomalies={anomalies}
                realTimeMetrics={realTimeMetrics}
                onInsightClick={(insight) => speak(`Insight selected: ${insight.title}`)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* God Mode Overlay */}
      <AnimatePresence>
        {godMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-lg z-40 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-gradient-to-br from-yellow-900/90 to-orange-900/90 border border-yellow-500/50 rounded-3xl p-8 max-w-6xl mx-4"
            >
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-yellow-400 mb-4">EXECUTIVE GOD MODE</h2>
                <p className="text-gray-300">Complete system control and advanced executive functions</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  'CEO Dashboard', 'CFO Analytics', 'CTO Systems', 'COO Operations',
                  'Marketing Intelligence', 'Sales Pipeline', 'HR Management', 'Strategic Planning',
                  'Wealth Management', 'Health Tracking', 'Ethics Compliance', 'Decision Framework'
                ].map((feature, idx) => (
                  <motion.button
                    key={idx}
                    className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-4 px-6 rounded-xl hover:from-yellow-500 hover:to-orange-500 transition-all font-semibold text-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => {
                      const departmentMap = {
                        'CEO Dashboard': 'ceo',
                        'CFO Analytics': 'cfo',
                        'CTO Systems': 'cto',
                        'COO Operations': 'coo',
                        'Marketing Intelligence': 'marketing',
                        'Sales Pipeline': 'sales',
                        'HR Management': 'hr'
                      };
                      const dept = departmentMap[feature];
                      if (dept) {
                        const content = getContentByRole(dept);
                        if (content) {
                          speak(`Loading ${feature} priorities and responsibilities`);
                        }
                      }
                    }}
                  >
                    {feature}
                  </motion.button>
                ))}
              </div>
              
              <div className="text-center">
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