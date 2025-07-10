'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import Agent3DFallback from './components/Agent3DFallback';

export default function Agent3DWorkspaceFixed({ darkMode = true }) {
  const [is3DReady, setIs3DReady] = useState(false);
  const [ThreeComponents, setThreeComponents] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load3D = async () => {
      try {
        // Check WebGL support first
        if (typeof window === 'undefined') {
          throw new Error('Not in browser environment');
        }

        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
          throw new Error('WebGL not supported');
        }

        console.log('WebGL check passed, loading Three.js...');

        // Dynamic import with timeout
        const loadPromise = Promise.all([
          import('@react-three/fiber'),
          import('@react-three/drei')
        ]);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Import timeout')), 10000)
        );

        const [fiberModule, dreiModule] = await Promise.race([loadPromise, timeoutPromise]);

        if (!mounted) return;

        console.log('Three.js modules loaded successfully');

        // Create the 3D components
        const { Canvas, useFrame } = fiberModule;
        const { OrbitControls, Box, Sphere, Html } = dreiModule;

        const AgentNode = ({ position, agent, onClick, isActive }) => {
          const meshRef = React.useRef();
          const [hovered, setHovered] = React.useState(false);

          useFrame((state) => {
            if (meshRef.current) {
              meshRef.current.rotation.y += 0.01;
              if (isActive) {
                meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
              }
            }
          });

          const getAgentColor = (type) => {
            const colors = {
              claude: '#8B5CF6',
              gpt: '#10B981',
              deepseek: '#F59E0B',
              mistral: '#EF4444',
              gemini: '#3B82F6'
            };
            return colors[type] || '#6B7280';
          };

          return React.createElement('group', { position },
            React.createElement(Box, {
              ref: meshRef,
              args: [1, 1, 1],
              onClick,
              onPointerOver: () => setHovered(true),
              onPointerOut: () => setHovered(false),
              scale: hovered ? 1.2 : 1
            },
              React.createElement('meshStandardMaterial', {
                color: getAgentColor(agent.type),
                emissive: getAgentColor(agent.type),
                emissiveIntensity: isActive ? 0.3 : 0.1,
                metalness: 0.5,
                roughness: 0.3
              })
            ),
            React.createElement(Html, { distanceFactor: 10 },
              React.createElement('div', {
                className: `p-2 rounded text-xs whitespace-nowrap pointer-events-none backdrop-blur-sm transition-colors ${
                  darkMode 
                    ? 'bg-black/80 text-white border border-white/20'
                    : 'bg-white/80 text-gray-900 border border-gray-300'
                }`
              },
                React.createElement('div', { 
                  className: `font-bold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`
                }, agent.name),
                React.createElement('div', { 
                  className: darkMode ? 'text-gray-300' : 'text-gray-600'
                }, `${agent.tasks} tasks`),
                React.createElement('div', {
                  className: `text-xs ${
                    agent.status === 'active' ? 'text-green-400' :
                    agent.status === 'busy' ? 'text-yellow-400' : 
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`
                }, agent.status)
              )
            )
          );
        };

        const ThreeWorkspace = () => {
          const [agents, setAgents] = React.useState([
            { id: 'claude', name: 'Claude', type: 'claude', status: 'active', tasks: 12, position: [3, 0, 3] },
            { id: 'gpt', name: 'GPT-4o', type: 'gpt', status: 'busy', tasks: 8, position: [-3, 0, 3] },
            { id: 'deepseek', name: 'DeepSeek', type: 'deepseek', status: 'idle', tasks: 3, position: [3, 0, -3] },
            { id: 'mistral', name: 'Mistral', type: 'mistral', status: 'active', tasks: 6, position: [-3, 0, -3] },
            { id: 'gemini', name: 'Gemini', type: 'gemini', status: 'busy', tasks: 5, position: [0, 3, 0] }
          ]);

          const [selectedAgent, setSelectedAgent] = React.useState(null);

          React.useEffect(() => {
            const interval = setInterval(() => {
              setAgents(prev => prev.map(agent => ({
                ...agent,
                tasks: Math.max(0, agent.tasks + Math.floor(Math.random() * 3) - 1)
              })));
            }, 5000);

            return () => clearInterval(interval);
          }, []);

          return React.createElement('div', {
            className: `h-screen transition-colors duration-300 p-6 ${
              darkMode 
                ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
                : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
            }`
          },
            React.createElement('div', { className: 'max-w-7xl mx-auto h-full' },
              // Header
              React.createElement('div', { className: 'flex justify-between items-center mb-6' },
                React.createElement('div', {},
                  React.createElement('h1', {
                    className: `text-3xl font-bold mb-2 transition-colors ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`
                  }, '3D Agent Workspace'),
                  React.createElement('p', {
                    className: `transition-colors ${
                      darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`
                  }, 'Interactive 3D visualization of AI agents')
                ),
                selectedAgent && React.createElement(motion.div, {
                  initial: { opacity: 0, scale: 0.9 },
                  animate: { opacity: 1, scale: 1 },
                  className: `p-4 rounded-lg shadow-lg backdrop-blur-sm border transition-colors ${
                    darkMode 
                      ? 'bg-gray-800/90 border-gray-700'
                      : 'bg-white/90 border-gray-200'
                  }`
                },
                  React.createElement('h3', {
                    className: `font-bold transition-colors ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`
                  }, selectedAgent.name),
                  React.createElement('p', {
                    className: `text-sm transition-colors ${
                      darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`
                  }, `Status: ${selectedAgent.status}`),
                  React.createElement('p', {
                    className: `text-sm transition-colors ${
                      darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`
                  }, `Tasks: ${selectedAgent.tasks}`),
                  React.createElement('button', {
                    onClick: () => setSelectedAgent(null),
                    className: `mt-2 px-3 py-1 text-xs rounded transition-colors hover:opacity-80 ${
                      darkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`
                  }, 'Close')
                )
              ),
              // 3D Canvas
              React.createElement('div', {
                className: `h-[calc(100%-120px)] rounded-xl overflow-hidden border transition-colors ${
                  darkMode 
                    ? 'bg-black/20 border-white/10'
                    : 'bg-white/20 border-black/10'
                }`
              },
                React.createElement(Canvas, {
                  camera: { position: [8, 8, 8], fov: 60 },
                  gl: { 
                    antialias: true, 
                    alpha: true,
                    clearColor: darkMode ? '#1F2937' : '#F8FAFC'
                  }
                },
                  React.createElement(Suspense, { fallback: null },
                    React.createElement('ambientLight', { 
                      intensity: darkMode ? 0.4 : 0.8 
                    }),
                    React.createElement('pointLight', { 
                      position: [10, 10, 10], 
                      intensity: darkMode ? 1 : 0.8,
                      color: darkMode ? '#FFFFFF' : '#F0F0F0'
                    }),
                    React.createElement('pointLight', { 
                      position: [-10, -10, -10], 
                      intensity: darkMode ? 0.5 : 0.3, 
                      color: darkMode ? '#8B5CF6' : '#6366F1'
                    }),
                    
                    // Central hub
                    React.createElement(Sphere, { position: [0, 0, 0], args: [0.5] },
                      React.createElement('meshStandardMaterial', {
                        color: darkMode ? '#1F2937' : '#E5E7EB',
                        emissive: darkMode ? '#374151' : '#D1D5DB',
                        emissiveIntensity: darkMode ? 0.2 : 0.1,
                        metalness: 0.8,
                        roughness: 0.2
                      })
                    ),

                    // Agent nodes
                    ...agents.map((agent) =>
                      React.createElement(AgentNode, {
                        key: agent.id,
                        position: agent.position,
                        agent: agent,
                        onClick: () => setSelectedAgent(agent),
                        isActive: agent.status === 'active'
                      })
                    ),

                    React.createElement(OrbitControls, {
                      enablePan: true,
                      enableZoom: true,
                      enableRotate: true,
                      autoRotate: true,
                      autoRotateSpeed: 0.5
                    })
                  )
                )
              ),
              // Controls
              React.createElement('div', { className: 'mt-4 text-center' },
                React.createElement('p', {
                  className: `text-sm transition-colors ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`
                }, 'Click and drag to rotate • Scroll to zoom • Click agents for details')
              )
            )
          );
        };

        setThreeComponents({ ThreeWorkspace });
        setIs3DReady(true);
        console.log('3D workspace ready!');

      } catch (error) {
        console.warn('3D workspace not available:', error.message);
        setError(error.message);
        if (mounted) {
          setIs3DReady(false);
        }
      }
    };

    load3D();

    return () => {
      mounted = false;
    };
  }, []);

  // Loading state
  if (!is3DReady && !error) {
    return (
      <div className={`flex items-center justify-center h-screen transition-colors ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full"
        />
        <span className={`ml-4 transition-colors ${
          darkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          Loading 3D workspace...
        </span>
      </div>
    );
  }

  // Error or unsupported
  if (error || !ThreeComponents) {
    return <Agent3DFallback darkMode={darkMode} />;
  }

  // Render 3D workspace
  const { ThreeWorkspace } = ThreeComponents;
  return (
    <Suspense fallback={<Agent3DFallback darkMode={darkMode} />}>
      <ThreeWorkspace />
    </Suspense>
  );
}