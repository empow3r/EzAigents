'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/src/components/ui/card';
import * as Icons from 'lucide-react';
import { Progress } from '@radix-ui/react-progress';

// Sound URLs (these would need to be added to public/sounds/)
const SOUNDS = {
  typing: '/sounds/typing.mp3',
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  thinking: '/sounds/ambient.mp3'
};

export default function EnhancedAgentDashboard({ darkMode = true }) {
  const [agents, setAgents] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(false); // Disabled by default
  const [thinkingAgents, setThinkingAgents] = useState(new Set());
  
  // Sound functions (fallback when use-sound is not available)
  const playTyping = () => {};
  const playSuccess = () => {};
  const playError = () => {};
  const playThinking = () => {};

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/agent-stats');
        const stats = await response.json();
        
        const formattedAgents = Object.entries(stats).map(([type, s]) => ({
          id: type,
          name: type.toUpperCase(),
          status: s.status || 'idle',
          tokens: s.avgTokens || 0,
          runs: s.runs || 0,
          currentTask: s.currentTask || null,
          progress: s.progress || 0,
          thinking: s.thinking || '',
          lastActivity: s.lastActivity || Date.now(),
          efficiency: s.efficiency || Math.random() * 100,
          icon: getAgentIcon(type),
          color: getAgentColor(type),
          specialization: getAgentSpecialization(type)
        }));
        
        setAgents(formattedAgents);
        
        // Update thinking agents
        const thinking = new Set(
          formattedAgents
            .filter(agent => agent.status === 'processing')
            .map(agent => agent.id)
        );
        setThinkingAgents(thinking);
        
      } catch (error) {
        console.error('Failed to fetch agent stats:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Play sounds based on agent activities
  useEffect(() => {
    if (!soundEnabled) return;
    
    agents.forEach(agent => {
      if (agent.status === 'processing' && Math.random() > 0.8) {
        playTyping();
      }
      if (agent.status === 'completed' && Math.random() > 0.9) {
        playSuccess();
      }
      if (agent.status === 'error' && Math.random() > 0.95) {
        playError();
      }
    });
  }, [agents, soundEnabled, playTyping, playSuccess, playError]);

  const getAgentIcon = (type) => {
    const icons = {
      claude: Brain,
      gpt: Code,
      deepseek: Zap,
      mistral: Activity,
      gemini: Timer
    };
    return icons[type] || Brain;
  };

  const getAgentColor = (type) => {
    const colors = {
      claude: 'from-purple-500 to-pink-500',
      gpt: 'from-green-500 to-blue-500',
      deepseek: 'from-yellow-500 to-orange-500',
      mistral: 'from-blue-500 to-purple-500',
      gemini: 'from-red-500 to-pink-500'
    };
    return colors[type] || 'from-gray-500 to-gray-600';
  };

  const getAgentSpecialization = (type) => {
    const specs = {
      claude: 'Architecture & Refactoring',
      gpt: 'Backend Logic',
      deepseek: 'Testing & Validation',
      mistral: 'Documentation',
      gemini: 'Code Analysis'
    };
    return specs[type] || 'General AI Assistant';
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'processing': return '🧠';
      case 'completed': return '✅';
      case 'error': return '❌';
      case 'idle': return '😴';
      default: return '🤖';
    }
  };

  const ThinkingBubble = ({ thinking, visible }) => (
    <AnimatePresence>
      {visible && thinking && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          className="absolute -top-2 -right-2 bg-white border-2 border-blue-200 rounded-lg p-2 shadow-lg max-w-xs z-10"
        >
          <div className="text-xs text-gray-600 font-medium">💭 Thinking...</div>
          <div className="text-xs text-gray-500 mt-1 line-clamp-2">{thinking}</div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"
          >
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const ProgressRing = ({ progress, size = 60 }) => {
    const radius = (size - 8) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="text-blue-500 transition-all duration-500 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold">{Math.round(progress)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen p-3 sm:p-4 lg:p-6 ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            🤖 AI Agent Command Center
          </h1>
          <p className={`text-sm sm:text-base ${
            darkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>Real-time agent orchestration and monitoring</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`backdrop-blur-sm border rounded-lg p-2 sm:p-3 transition-all ${
              darkMode 
                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                : 'bg-black/10 border-black/20 text-gray-900 hover:bg-black/20'
            }`}
          >
            {soundEnabled ? <Icons.Volume2 size={18} className="sm:w-5 sm:h-5" /> : <Icons.VolumeX size={18} className="sm:w-5 sm:h-5" />}
          </motion.button>
          
          <div className={`backdrop-blur-sm border rounded-lg px-3 py-2 sm:px-4 ${
            darkMode 
              ? 'bg-white/10 border-white/20' 
              : 'bg-black/10 border-black/20'
          }`}>
            <div className={`text-xs sm:text-sm ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Active: <span className="font-bold text-green-400">{agents.filter(a => a.status === 'processing').length}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {agents.map((agent, index) => {
          const IconComponent = agent.icon;
          const isThinking = thinkingAgents.has(agent.id);
          
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="relative"
            >
              <Card className={`backdrop-blur-sm border rounded-xl overflow-hidden ${
                darkMode 
                  ? 'bg-white/10 border-white/20' 
                  : 'bg-white/80 border-gray-200'
              }`}>
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  {/* Agent Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <motion.div
                        animate={isThinking ? { 
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.1, 1] 
                        } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`w-12 h-12 rounded-lg bg-gradient-to-r ${agent.color} flex items-center justify-center`}
                      >
                        <IconComponent className="text-white" size={24} />
                      </motion.div>
                      <div className="min-w-0 flex-1">
                        <h3 className={`font-bold text-base sm:text-lg break-words ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>{agent.name}</h3>
                        <p className={`text-xs sm:text-sm break-words ${
                          darkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>{agent.specialization}</p>
                      </div>
                    </div>
                    
                    <div className="text-2xl">
                      {getStatusEmoji(agent.status)}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center space-x-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${
                      agent.status === 'processing' ? 'bg-green-400 animate-pulse' :
                      agent.status === 'completed' ? 'bg-blue-400' :
                      agent.status === 'error' ? 'bg-red-400' :
                      'bg-gray-400'
                    }`}></div>
                    <span className={`text-xs sm:text-sm capitalize ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>{agent.status}</span>
                  </div>

                  {/* Progress Ring */}
                  {agent.status === 'processing' && (
                    <div className="flex justify-center mb-4">
                      <ProgressRing progress={agent.progress} />
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
                    <div className={`rounded-lg p-2 sm:p-3 ${
                      darkMode ? 'bg-white/5' : 'bg-black/5'
                    }`}>
                      <div className={`text-xs ${
                        darkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>Runs</div>
                      <div className={`font-bold text-sm sm:text-lg ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>{agent.runs}</div>
                    </div>
                    <div className={`rounded-lg p-2 sm:p-3 ${
                      darkMode ? 'bg-white/5' : 'bg-black/5'
                    }`}>
                      <div className={`text-xs ${
                        darkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>Efficiency</div>
                      <div className={`font-bold text-sm sm:text-lg ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>{Math.round(agent.efficiency)}%</div>
                    </div>
                  </div>

                  {/* Current Task */}
                  {agent.currentTask && (
                    <div className={`rounded-lg p-2 sm:p-3 mb-4 ${
                      darkMode ? 'bg-white/5' : 'bg-black/5'
                    }`}>
                      <div className={`text-xs mb-1 ${
                        darkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>Current Task</div>
                      <div className={`text-xs sm:text-sm line-clamp-2 break-words ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>{agent.currentTask}</div>
                    </div>
                  )}

                  {/* Activity Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Activity Level</span>
                      <span className={darkMode ? 'text-white' : 'text-gray-900'}>{Math.round(agent.tokens / 10)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(agent.tokens / 10, 100)}%` }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                        className={`h-2 rounded-full bg-gradient-to-r ${agent.color}`}
                      />
                    </div>
                  </div>
                </CardContent>

                {/* Thinking Bubble */}
                <ThinkingBubble 
                  thinking={agent.thinking} 
                  visible={isThinking}
                />

                {/* Pulse Animation for Active Agents */}
                {agent.status === 'processing' && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-xl border-2 border-green-400 pointer-events-none"
                  />
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-8 right-8"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg flex items-center justify-center text-white text-2xl"
        >
          <Icons.Coffee />
        </motion.button>
      </motion.div>
    </div>
  );
}