'use client';
import React, { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import Agent3DFallback from './components/Agent3DFallback';
import soundService from './services/optimizedSoundService';

// Enhanced 3D Workspace with error handling
export default function Agent3DWorkspace({ darkMode = true, onBackTo2D = null }) {
  const [isSupported, setIsSupported] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ThreeComponents, setThreeComponents] = useState(null);

  useEffect(() => {
    const checkWebGLSupport = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        console.log('WebGL support check:', !!gl);
        return !!gl;
      } catch (e) {
        console.warn('WebGL check failed:', e);
        return false;
      }
    };

    const loadThreeJS = async () => {
      try {
        // Check WebGL support first
        if (!checkWebGLSupport()) {
          console.warn('WebGL not supported, falling back to 2D view');
          setIsSupported(false);
          setIsLoading(false);
          return;
        }

        // Check if running in browser environment
        if (typeof window === 'undefined') {
          setIsSupported(false);
          setIsLoading(false);
          return;
        }

        // Dynamically import Three.js components with better error handling
        console.log('Loading Three.js dependencies...');
        const fiberModule = await import('@react-three/fiber').catch((e) => {
          console.error('Failed to load @react-three/fiber:', e);
          return null;
        });
        const dreiModule = await import('@react-three/drei').catch((e) => {
          console.error('Failed to load @react-three/drei:', e);
          return null;
        });
        const threeModule = await import('three').catch((e) => {
          console.error('Failed to load three:', e);
          return null;
        });

        console.log('Three.js modules loaded:', { 
          fiber: !!fiberModule, 
          drei: !!dreiModule, 
          three: !!threeModule 
        });

        if (!fiberModule || !dreiModule || !threeModule) {
          throw new Error('Failed to load required 3D libraries');
        }

        const ThreeWorkspace = createThreeWorkspace(fiberModule, dreiModule, threeModule);
        setThreeComponents({ ThreeWorkspace });
        setIsSupported(true);
      } catch (error) {
        console.error('Failed to load 3D components:', error);
        setIsSupported(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadThreeJS();
  }, []);

  const createThreeWorkspace = (fiber, drei, THREE) => {
    try {
      const { Canvas, useFrame } = fiber;
      const { OrbitControls, Text, Box, Sphere, Html } = drei;

    const AgentNode = ({ position, agent, onClick, isActive }) => {
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
            <div className="bg-black/80 text-white p-2 rounded text-xs whitespace-nowrap">
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
    };

    const ConnectionLine = ({ start, end, active }) => {
      const points = useMemo(() => [
        new THREE.Vector3(...start),
        new THREE.Vector3(...end)
      ], [start, end]);

      return (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([...start, ...end])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial 
            color={active ? "#60A5FA" : "#374151"} 
            opacity={active ? 0.8 : 0.3}
            transparent
          />
        </line>
      );
    };

    return function ThreeWorkspace() {
      const [agents, setAgents] = useState([
        { id: 'claude', name: 'Claude', type: 'claude', status: 'active', tasks: 12, position: [3, 0, 3] },
        { id: 'gpt', name: 'GPT-4o', type: 'gpt', status: 'busy', tasks: 8, position: [-3, 0, 3] },
        { id: 'deepseek', name: 'DeepSeek', type: 'deepseek', status: 'idle', tasks: 3, position: [3, 0, -3] },
        { id: 'mistral', name: 'Mistral', type: 'mistral', status: 'active', tasks: 6, position: [-3, 0, -3] },
        { id: 'gemini', name: 'Gemini', type: 'gemini', status: 'busy', tasks: 5, position: [0, 3, 0] }
      ]);

      const [selectedAgent, setSelectedAgent] = useState(null);

      const handleAgentClick = (agent) => {
        soundService.play('agentActivate');
        setSelectedAgent(agent);
      };

      return (
        <div className={`h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} p-6`}>
          <div className="max-w-7xl mx-auto h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    3D Agent Workspace
                  </h1>
                  <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                    Interactive 3D visualization of AI agents
                  </p>
                </div>
                
                {onBackTo2D && (
                  <button
                    onClick={() => {
                      soundService.play('swoosh');
                      onBackTo2D();
                    }}
                    onMouseEnter={() => soundService.play('buttonHover')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center space-x-2"
                  >
                    <Activity size={16} />
                    <span>Back to 2D</span>
                  </button>
                )}
              </div>
              
              {selectedAgent && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                  <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedAgent.name}
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Status: {selectedAgent.status}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Tasks: {selectedAgent.tasks}
                  </p>
                </div>
              )}
            </div>

            {/* 3D Canvas */}
            <div className="h-[calc(100%-120px)] rounded-xl overflow-hidden">
              <Canvas 
                camera={{ position: [8, 8, 8], fov: 60 }}
                gl={{ antialias: true, alpha: true }}
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

                  {/* Connection lines */}
                  {agents.map((agent) => (
                    <ConnectionLine
                      key={`connection-${agent.id}`}
                      start={[0, 0, 0]}
                      end={agent.position}
                      active={agent.status === 'active'}
                    />
                  ))}

                  <OrbitControls 
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    autoRotate={false}
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
    };
    } catch (error) {
      console.error('Error creating 3D workspace:', error);
      return function ThreeWorkspaceFallback() {
        return <Agent3DFallback />;
      };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full"
        />
        <span className="ml-4 text-gray-600">Loading 3D workspace...</span>
      </div>
    );
  }

  if (!isSupported || !ThreeComponents) {
    return <Agent3DFallback />;
  }

  const { ThreeWorkspace } = ThreeComponents;

  return (
    <Suspense fallback={<Agent3DFallback />}>
      <ThreeWorkspace />
    </Suspense>
  );
}