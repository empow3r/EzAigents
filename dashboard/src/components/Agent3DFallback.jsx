'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import soundService from '../services/optimizedSoundService';
import { 
  Box, 
  Cpu, 
  Activity, 
  Zap, 
  Brain,
  Eye,
  RefreshCw
} from 'lucide-react';

// Lightweight 3D workspace fallback
export default function Agent3DFallback({ darkMode = true }) {
  const [agents, setAgents] = useState([
    { id: 'claude', name: 'Claude', status: 'active', tasks: 12, position: { x: 20, y: 30 } },
    { id: 'gpt', name: 'GPT-4o', status: 'busy', tasks: 8, position: { x: 60, y: 40 } },
    { id: 'deepseek', name: 'DeepSeek', status: 'idle', tasks: 3, position: { x: 80, y: 70 } },
    { id: 'mistral', name: 'Mistral', status: 'active', tasks: 6, position: { x: 30, y: 80 } },
    { id: 'gemini', name: 'Gemini', status: 'busy', tasks: 5, position: { x: 70, y: 20 } }
  ]);
  
  const [loadingFullVersion, setLoadingFullVersion] = useState(false);
  const [currentMode, setCurrentMode] = useState('2d');
  const [ThreeWorkspace, setThreeWorkspace] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'from-green-400 to-emerald-500';
      case 'busy': return 'from-yellow-400 to-orange-500';
      case 'idle': return 'from-gray-400 to-slate-500';
      default: return 'from-blue-400 to-indigo-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Activity size={16} />;
      case 'busy': return <Zap size={16} />;
      case 'idle': return <Eye size={16} />;
      default: return <Cpu size={16} />;
    }
  };

  const loadFullWorkspace = async () => {
    soundService.play('exploration');
    setTimeout(() => soundService.play('engagement'), 300);
    setLoadingFullVersion(true);
    try {
      // Dynamic import of the full 3D workspace
      const { default: Agent3DWorkspace } = await import('../Agent3DWorkspace');
      setThreeWorkspace(() => Agent3DWorkspace);
      setCurrentMode('3d');
      soundService.play('dopamineHit');
      setTimeout(() => soundService.play('quickWin'), 200);
      console.log('Full 3D workspace loaded');
    } catch (error) {
      console.warn('Could not load full 3D workspace:', error);
      soundService.play('error');
      alert('3D workspace could not be loaded. Staying in 2D mode.');
    } finally {
      setLoadingFullVersion(false);
    }
  };

  const switchTo2D = () => {
    soundService.play('swoosh');
    setCurrentMode('2d');
  };

  useEffect(() => {
    // Simulate agent status updates
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => ({
        ...agent,
        tasks: Math.max(0, agent.tasks + Math.floor(Math.random() * 3) - 1)
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // If 3D mode is active and workspace is loaded, render the 3D workspace
  if (currentMode === '3d' && ThreeWorkspace) {
    return <ThreeWorkspace darkMode={darkMode} onBackTo2D={switchTo2D} />;
  }

  // Render 2D workspace
  return (
    <div className={`min-h-screen p-3 sm:p-4 lg:p-6 transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      <div className="max-w-7xl mx-auto h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
          <div className="min-w-0 flex-1">
            <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-2 break-words transition-colors ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Agent Workspace
            </h1>
            <p className={`text-sm sm:text-base break-words transition-colors ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Real-time agent monitoring and task visualization
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`text-xs sm:text-sm transition-colors ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>Current mode:</span>
              <span className="text-xs sm:text-sm font-semibold text-blue-400">2D View</span>
            </div>
          </div>
          
          <div className="flex space-x-2 flex-shrink-0">
            <button
              onClick={switchTo2D}
              onMouseEnter={() => soundService.play('buttonHover')}
              disabled={currentMode === '2d'}
              className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all flex items-center space-x-2 text-sm sm:text-base ${
                currentMode === '2d'
                  ? 'bg-blue-600 text-white cursor-default'
                  : darkMode
                    ? 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <Activity size={16} />
              <span className="hidden sm:inline">2D View</span>
              <span className="sm:hidden">2D</span>
            </button>
            
            <button
              onClick={loadFullWorkspace}
              onMouseEnter={() => soundService.play('buttonHover')}
              disabled={loadingFullVersion || currentMode === '3d'}
              className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all flex items-center space-x-2 disabled:opacity-50 text-sm sm:text-base ${
                currentMode === '3d'
                  ? 'bg-purple-600 text-white cursor-default'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
              }`}
            >
              {loadingFullVersion ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <Box size={16} />
              )}
              <span className="hidden sm:inline">{loadingFullVersion ? 'Loading...' : '3D View'}</span>
              <span className="sm:hidden">{loadingFullVersion ? '...' : '3D'}</span>
            </button>
          </div>
        </div>

        {/* 2D Agent Visualization */}
        <div className={`relative h-[400px] sm:h-[500px] lg:h-[calc(100%-120px)] rounded-xl border overflow-hidden transition-colors ${
          darkMode 
            ? 'bg-black/20 border-white/10'
            : 'bg-white/20 border-black/10'
        }`}>
          {/* Grid background */}
          <div className="absolute inset-0 opacity-10 sm:opacity-20">
            <svg width="100%" height="100%">
              <defs>
                <pattern id={`grid-${darkMode ? 'dark' : 'light'}`} width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke={darkMode ? "white" : "black"} strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#grid-${darkMode ? 'dark' : 'light'})`} />
            </svg>
          </div>

          {/* Agent nodes */}
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="absolute"
              style={{
                left: `${agent.position.x}%`,
                top: `${agent.position.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {/* Agent circle */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                className={`w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br ${getStatusColor(agent.status)} flex items-center justify-center shadow-lg cursor-pointer relative`}
              >
                <Brain className={darkMode ? "text-white" : "text-gray-900"} size={16} />
                
                {/* Status indicator */}
                <div className={`absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                  darkMode ? 'bg-gray-900' : 'bg-white'
                }`}>
                  {getStatusIcon(agent.status)}
                </div>

                {/* Pulse animation for active agents */}
                {agent.status === 'active' && (
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-green-400"
                  />
                )}
              </motion.div>

              {/* Agent info */}
              <div className="mt-1 sm:mt-3 text-center">
                <h3 className={`font-semibold text-xs sm:text-sm break-words transition-colors ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>{agent.name}</h3>
                <p className={`text-xs hidden sm:block transition-colors ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>{agent.tasks} tasks</p>
                <div className={`inline-block px-1 sm:px-2 py-1 rounded-full text-xs mt-1 ${
                  agent.status === 'active' 
                    ? darkMode 
                      ? 'bg-green-500/20 text-green-300' 
                      : 'bg-green-100 text-green-800'
                    : agent.status === 'busy' 
                      ? darkMode 
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-yellow-100 text-yellow-800'
                      : darkMode
                        ? 'bg-gray-500/20 text-gray-300'
                        : 'bg-gray-100 text-gray-700'
                }`}>
                  <span className="hidden sm:inline">{agent.status}</span>
                  <span className="sm:hidden">{agent.status.charAt(0).toUpperCase()}</span>
                </div>
              </div>

              {/* Connection lines to other agents - Hidden on mobile for cleaner view */}
              {index === 0 && (
                <svg className="absolute top-6 sm:top-10 left-6 sm:left-10 w-48 h-48 sm:w-96 sm:h-96 pointer-events-none hidden sm:block">
                  {agents.slice(1).map((targetAgent, targetIndex) => (
                    <motion.line
                      key={targetIndex}
                      x1={0}
                      y1={0}
                      x2={(targetAgent.position.x - agent.position.x) * 2}
                      y2={(targetAgent.position.y - agent.position.y) * 2}
                      stroke={darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                      strokeWidth="1"
                      strokeDasharray="5,5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, delay: targetIndex * 0.5 }}
                    />
                  ))}
                </svg>
              )}
            </motion.div>
          ))}

          {/* Performance info */}
          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4">
            <div className={`backdrop-blur-sm rounded-lg p-2 sm:p-4 border transition-colors ${
              darkMode 
                ? 'bg-black/40 border-white/10'
                : 'bg-white/40 border-black/10'
            }`}>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4 text-center">
                {agents.map(agent => (
                  <div key={agent.id} className="min-w-0">
                    <div className={`text-lg sm:text-2xl font-bold transition-colors ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>{agent.tasks}</div>
                    <div className={`text-xs sm:text-sm break-words transition-colors ${
                      darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>{agent.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features note */}
        <div className={`mt-4 text-center text-sm transition-colors ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Interactive 2D workspace with real-time agent updates. Switch between 2D and 3D views using the buttons above.
        </div>
      </div>
    </div>
  );
}