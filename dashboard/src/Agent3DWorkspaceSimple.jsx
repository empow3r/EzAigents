'use client';
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { motion } from 'framer-motion';
import Agent3DFallback from './components/Agent3DFallback';

// Import Three.js components directly
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Sphere, Html } from '@react-three/drei';

// Check WebGL support
const checkWebGLSupport = () => {
  if (typeof window === 'undefined') return false;
  
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const supported = !!gl;
    console.log('WebGL support:', supported);
    return supported;
  } catch (e) {
    console.warn('WebGL check failed:', e);
    return false;
  }
};

// Agent Node Component
function AgentNode({ position, agent, onClick, isActive }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

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

  return (
    <group position={position}>
      <Box
        ref={meshRef}
        args={[1, 1, 1]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.2 : 1}
      >
        <meshStandardMaterial
          color={getAgentColor(agent.type)}
          emissive={getAgentColor(agent.type)}
          emissiveIntensity={isActive ? 0.3 : 0.1}
          metalness={0.5}
          roughness={0.3}
        />
      </Box>
      
      <Html distanceFactor={10}>
        <div className="bg-black/80 text-white p-2 rounded text-xs whitespace-nowrap pointer-events-none">
          <div className="font-bold">{agent.name}</div>
          <div className="text-gray-300">{agent.tasks} tasks</div>
          <div className={`text-xs ${
            agent.status === 'active' ? 'text-green-400' :
            agent.status === 'busy' ? 'text-yellow-400' : 'text-gray-400'
          }`}>
            {agent.status}
          </div>
        </div>
      </Html>
    </group>
  );
}

// 3D Workspace Component
function ThreeWorkspace({ darkMode }) {
  const [agents, setAgents] = useState([
    { id: 'claude', name: 'Claude', type: 'claude', status: 'active', tasks: 12, position: [3, 0, 3] },
    { id: 'gpt', name: 'GPT-4o', type: 'gpt', status: 'busy', tasks: 8, position: [-3, 0, 3] },
    { id: 'deepseek', name: 'DeepSeek', type: 'deepseek', status: 'idle', tasks: 3, position: [3, 0, -3] },
    { id: 'mistral', name: 'Mistral', type: 'mistral', status: 'active', tasks: 6, position: [-3, 0, -3] },
    { id: 'gemini', name: 'Gemini', type: 'gemini', status: 'busy', tasks: 5, position: [0, 3, 0] }
  ]);

  const [selectedAgent, setSelectedAgent] = useState(null);

  const handleAgentClick = (agent) => {
    setSelectedAgent(agent);
  };

  // Update agent data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => ({
        ...agent,
        tasks: Math.max(0, agent.tasks + Math.floor(Math.random() * 3) - 1)
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} p-6`}>
      <div className="max-w-7xl mx-auto h-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              3D Agent Workspace
            </h1>
            <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              Interactive 3D visualization of AI agents
            </p>
          </div>
          
          {selectedAgent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}
            >
              <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedAgent.name}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Status: {selectedAgent.status}
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Tasks: {selectedAgent.tasks}
              </p>
              <button
                onClick={() => setSelectedAgent(null)}
                className={`mt-2 px-3 py-1 text-xs rounded ${
                  darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Close
              </button>
            </motion.div>
          )}
        </div>

        {/* 3D Canvas */}
        <div className="h-[calc(100%-120px)] rounded-xl overflow-hidden bg-black/10">
          <Canvas 
            camera={{ position: [8, 8, 8], fov: 60 }}
            gl={{ antialias: true, alpha: true }}
            onCreated={({ gl }) => {
              console.log('Canvas created successfully');
            }}
          >
            <Suspense fallback={null}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8B5CF6" />
            
              {/* Central hub */}
              <Sphere position={[0, 0, 0]} args={[0.5]}>
                <meshStandardMaterial 
                  color="#1F2937" 
                  emissive="#374151" 
                  emissiveIntensity={0.2}
                  metalness={0.8}
                  roughness={0.2}
                />
              </Sphere>

              {/* Agent nodes */}
              {agents.map((agent) => (
                <AgentNode
                  key={agent.id}
                  position={agent.position}
                  agent={agent}
                  onClick={() => handleAgentClick(agent)}
                  isActive={agent.status === 'active'}
                />
              ))}

              <OrbitControls 
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                autoRotate={true}
                autoRotateSpeed={0.5}
              />
            </Suspense>
          </Canvas>
        </div>

        {/* Controls */}
        <div className="mt-4 text-center">
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Click and drag to rotate • Scroll to zoom • Click agents for details
          </p>
        </div>
      </div>
    </div>
  );
}

// Error Boundary
class ThreeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    console.error('3D Workspace Error:', error);
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <Agent3DFallback />;
    }
    return this.props.children;
  }
}

// Main Component
export default function Agent3DWorkspaceSimple({ darkMode = true }) {
  const [isReady, setIsReady] = useState(false);
  const [canUse3D, setCanUse3D] = useState(false);

  useEffect(() => {
    // Check if we can use 3D
    const webglSupported = checkWebGLSupport();
    const can3D = webglSupported; // Since we're importing directly, Three.js is available
    
    console.log('3D Workspace capabilities:', {
      webglSupported,
      canUse3D: can3D
    });
    
    setCanUse3D(can3D);
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full"
        />
        <span className="ml-4 text-gray-600">Checking 3D capabilities...</span>
      </div>
    );
  }

  if (!canUse3D) {
    console.log('Falling back to 2D workspace');
    return <Agent3DFallback />;
  }

  return (
    <ThreeErrorBoundary>
      <ThreeWorkspace darkMode={darkMode} />
    </ThreeErrorBoundary>
  );
}