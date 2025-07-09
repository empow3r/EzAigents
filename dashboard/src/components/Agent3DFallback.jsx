'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
export default function Agent3DFallback() {
  const [agents, setAgents] = useState([
    { id: 'claude', name: 'Claude', status: 'active', tasks: 12, position: { x: 20, y: 30 } },
    { id: 'gpt', name: 'GPT-4o', status: 'busy', tasks: 8, position: { x: 60, y: 40 } },
    { id: 'deepseek', name: 'DeepSeek', status: 'idle', tasks: 3, position: { x: 80, y: 70 } },
    { id: 'mistral', name: 'Mistral', status: 'active', tasks: 6, position: { x: 30, y: 80 } },
    { id: 'gemini', name: 'Gemini', status: 'busy', tasks: 5, position: { x: 70, y: 20 } }
  ]);
  
  const [loadingFullVersion, setLoadingFullVersion] = useState(false);

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
    setLoadingFullVersion(true);
    try {
      // Dynamic import of the full 3D workspace
      const { default: Agent3DWorkspace } = await import('../Agent3DWorkspace');
      // Replace this component with the full version
      // This would require a state management solution in practice
      console.log('Full 3D workspace loaded');
    } catch (error) {
      console.warn('Could not load full 3D workspace:', error);
    } finally {
      setLoadingFullVersion(false);
    }
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

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto h-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Agent Workspace (2D View)
            </h1>
            <p className="text-gray-300">
              Lightweight version - Click below to load full 3D experience
            </p>
          </div>
          
          <button
            onClick={loadFullWorkspace}
            disabled={loadingFullVersion}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {loadingFullVersion ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <Box size={16} />
            )}
            <span>{loadingFullVersion ? 'Loading...' : 'Load 3D View'}</span>
          </button>
        </div>

        {/* 2D Agent Visualization */}
        <div className="relative h-[calc(100%-120px)] bg-black/20 rounded-xl border border-white/10 overflow-hidden">
          {/* Grid background */}
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
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
                className={`w-20 h-20 rounded-full bg-gradient-to-br ${getStatusColor(agent.status)} flex items-center justify-center shadow-lg cursor-pointer relative`}
              >
                <Brain className="text-white" size={24} />
                
                {/* Status indicator */}
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
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
              <div className="mt-3 text-center">
                <h3 className="text-white font-semibold text-sm">{agent.name}</h3>
                <p className="text-gray-300 text-xs">{agent.tasks} tasks</p>
                <div className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${
                  agent.status === 'active' ? 'bg-green-500/20 text-green-300' :
                  agent.status === 'busy' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {agent.status}
                </div>
              </div>

              {/* Connection lines to other agents */}
              {index === 0 && (
                <svg className="absolute top-10 left-10 w-96 h-96 pointer-events-none">
                  {agents.slice(1).map((targetAgent, targetIndex) => (
                    <motion.line
                      key={targetIndex}
                      x1={0}
                      y1={0}
                      x2={(targetAgent.position.x - agent.position.x) * 4}
                      y2={(targetAgent.position.y - agent.position.y) * 4}
                      stroke="rgba(255,255,255,0.2)"
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
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                {agents.map(agent => (
                  <div key={agent.id}>
                    <div className="text-2xl font-bold text-white">{agent.tasks}</div>
                    <div className="text-sm text-gray-300">{agent.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features note */}
        <div className="mt-4 text-center text-gray-400 text-sm">
          This is a lightweight 2D visualization. Load the full 3D view for interactive workspace with WebGL acceleration.
        </div>
      </div>
    </div>
  );
}