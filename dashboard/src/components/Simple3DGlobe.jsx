import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Fallback 3D Globe using CSS transforms
const Simple3DGlobe = ({ onAgentClick }) => {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => prev + 0.5);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Sample agent data
  const agents = [
    { id: 1, name: 'Claude-US-East', location: 'New York', status: 'active', tasks: 342, lat: 40.7128, lon: -74.0060 },
    { id: 2, name: 'GPT-Europe', location: 'London', status: 'active', tasks: 287, lat: 51.5074, lon: -0.1278 },
    { id: 3, name: 'Gemini-Asia', location: 'Tokyo', status: 'active', tasks: 415, lat: 35.6762, lon: 139.6503 },
    { id: 4, name: 'Mistral-Pacific', location: 'Sydney', status: 'idle', tasks: 156, lat: -33.8688, lon: 151.2093 },
    { id: 5, name: 'DeepSeek-Americas', location: 'São Paulo', status: 'active', tasks: 223, lat: -23.5505, lon: -46.6333 },
    { id: 6, name: 'Llama-Africa', location: 'Cape Town', status: 'active', tasks: 189, lat: -33.9249, lon: 18.4241 }
  ];

  const handleAgentClick = (agent) => {
    setSelectedAgent(agent);
    if (onAgentClick) {
      onAgentClick(agent);
    }
  };

  // Convert lat/lon to 2D position on circular projection
  const getAgentPosition = (lat, lon) => {
    const x = ((lon + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return { x: `${x}%`, y: `${y}%` };
  };

  return (
    <div className="w-full h-full relative bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 overflow-hidden">
      {/* Stars background */}
      <div className="absolute inset-0">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Globe container */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="relative w-96 h-96 rounded-full bg-gradient-to-br from-green-400 via-blue-500 to-blue-700 shadow-2xl shadow-blue-500/50"
          style={{
            transform: `rotateY(${rotation}deg)`,
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Globe surface with continents */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-300/20 via-blue-400/30 to-blue-600/40 opacity-80">
            {/* Continent shapes */}
            <div className="absolute top-1/4 left-1/4 w-16 h-12 bg-green-500/60 rounded-lg transform rotate-12" />
            <div className="absolute top-1/3 right-1/4 w-20 h-16 bg-green-500/60 rounded-2xl transform -rotate-6" />
            <div className="absolute bottom-1/3 left-1/3 w-12 h-14 bg-green-500/60 rounded-lg transform rotate-45" />
            <div className="absolute bottom-1/4 right-1/3 w-10 h-8 bg-green-500/60 rounded-full" />
          </div>

          {/* Grid lines */}
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30" />
          <div className="absolute top-0 left-1/2 w-0.5 h-full bg-cyan-400/20" />
          <div className="absolute left-0 top-1/2 w-full h-0.5 bg-cyan-400/20" />
          
          {/* Atmosphere glow */}
          <div className="absolute -inset-4 rounded-full bg-cyan-400/20 blur-xl animate-pulse" />

          {/* Agent markers */}
          {agents.map((agent) => {
            const pos = getAgentPosition(agent.lat, agent.lon);
            return (
              <motion.div
                key={agent.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{ left: pos.x, top: pos.y }}
                whileHover={{ scale: 1.5 }}
                onClick={() => handleAgentClick(agent)}
              >
                <div className={`w-4 h-4 rounded-full shadow-lg ${
                  agent.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'
                } animate-pulse`}>
                  <div className={`absolute inset-0 rounded-full ${
                    agent.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'
                  } animate-ping`} />
                </div>
                
                {selectedAgent?.id === agent.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black/90 text-white p-2 rounded-lg text-xs whitespace-nowrap z-10 border border-cyan-400/50"
                  >
                    <div className="font-bold">{agent.name}</div>
                    <div className="text-cyan-300">{agent.location}</div>
                    <div className={agent.status === 'active' ? 'text-green-400' : 'text-yellow-400'}>
                      {agent.status} • {agent.tasks} tasks
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Info panel */}
      <div className="absolute top-4 left-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/80 backdrop-blur-lg border border-cyan-400/30 rounded-lg p-4"
        >
          <h3 className="text-cyan-400 font-semibold mb-2">Global AI Network</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-cyan-300/70">Active Agents:</span>
              <span className="text-cyan-400">{agents.filter(a => a.status === 'active').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cyan-300/70">Total Tasks:</span>
              <span className="text-cyan-400">{agents.reduce((sum, a) => sum + a.tasks, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cyan-300/70">Locations:</span>
              <span className="text-cyan-400">{agents.length}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/80 backdrop-blur-lg border border-cyan-400/30 rounded-lg p-4 text-center"
        >
          <p className="text-cyan-400 text-sm">
            🌍 Click on agents to view details • Auto-rotating view
          </p>
        </motion.div>
      </div>

      {/* Selected agent details */}
      {selectedAgent && (
        <div className="absolute bottom-4 right-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/90 backdrop-blur-lg border border-cyan-400/30 rounded-lg p-4 max-w-xs"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-cyan-400 font-semibold">{selectedAgent.name}</h4>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="text-sm space-y-1">
              <p className="text-white">📍 {selectedAgent.location}</p>
              <p className={`${selectedAgent.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                ⚡ {selectedAgent.status.toUpperCase()}
              </p>
              <p className="text-cyan-300">📊 {selectedAgent.tasks} active tasks</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Simple3DGlobe;