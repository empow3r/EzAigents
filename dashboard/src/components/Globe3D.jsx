'use client';
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

// Rotating Globe Component
const RotatingGlobe = ({ agents = [] }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group>
      {/* Main Globe */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial 
          color="#1e40af" 
          transparent 
          opacity={0.7}
          wireframe={true}
        />
      </mesh>
      
      {/* Agent Markers */}
      {agents.map((agent, index) => (
        <AgentMarker 
          key={agent.id} 
          agent={agent} 
          position={agent.position}
          index={index}
        />
      ))}
    </group>
  );
};

const AgentMarker = ({ agent, position, index }) => {
  const markerRef = useRef();
  
  useFrame((state) => {
    if (markerRef.current) {
      markerRef.current.position.y = Math.sin(state.clock.elapsedTime * 2 + index) * 0.1;
    }
  });

  return (
    <group position={position} ref={markerRef}>
      <mesh>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial 
          color={agent.status === 'active' ? '#10b981' : '#6b7280'} 
          emissive={agent.status === 'active' ? '#10b981' : '#374151'}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Agent Info */}
      <Html distanceFactor={10}>
        <div className="bg-gray-800 text-white p-2 rounded-lg shadow-lg text-xs whitespace-nowrap">
          <div className="font-medium">{agent.name}</div>
          <div className="text-gray-400">{agent.tasks} tasks</div>
        </div>
      </Html>
    </group>
  );
};

const Globe3D = () => {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [businessMetrics, setBusinessMetrics] = useState({
    revenue: 125000,
    growth: 23.5,
    activeUsers: 1847,
    completion: 94
  });

  // Mock agent data with 3D positions
  const agents = useMemo(() => [
    { 
      id: 'claude-us', 
      name: 'Claude US-East', 
      status: 'active', 
      tasks: 5,
      position: [-1.5, 0.8, 1.2],
      region: 'North America',
      performance: 96
    },
    { 
      id: 'gpt-eu', 
      name: 'GPT-4o Europe', 
      status: 'active', 
      tasks: 3,
      position: [0.2, 1.2, 1.8],
      region: 'Europe',
      performance: 92
    },
    { 
      id: 'deepseek-asia', 
      name: 'DeepSeek Asia', 
      status: 'active', 
      tasks: 7,
      position: [1.8, 0.5, 0.8],
      region: 'Asia Pacific',
      performance: 89
    },
    { 
      id: 'mistral-sa', 
      name: 'Mistral S.America', 
      status: 'idle', 
      tasks: 0,
      position: [-1.2, -1.5, 1.0],
      region: 'South America',
      performance: 85
    },
    { 
      id: 'gemini-africa', 
      name: 'Gemini Africa', 
      status: 'active', 
      tasks: 2,
      position: [0.5, -0.8, 1.9],
      region: 'Africa',
      performance: 91
    }
  ], []);

  const businessRegions = useMemo(() => [
    { 
      name: 'North America', 
      revenue: 45000, 
      growth: 18.2, 
      agents: 2,
      color: 'from-blue-500 to-blue-700'
    },
    { 
      name: 'Europe', 
      revenue: 38000, 
      growth: 25.1, 
      agents: 1,
      color: 'from-emerald-500 to-emerald-700'
    },
    { 
      name: 'Asia Pacific', 
      revenue: 32000, 
      growth: 31.8, 
      agents: 1,
      color: 'from-purple-500 to-purple-700'
    },
    { 
      name: 'Other Regions', 
      revenue: 10000, 
      growth: 12.4, 
      agents: 1,
      color: 'from-orange-500 to-orange-700'
    }
  ], []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
            <Icons.Globe className="w-8 h-8 text-blue-400" />
            Global Business Intelligence
          </h1>
          <p className="text-gray-400">Real-time AI agent deployment and performance monitoring</p>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Business Metrics */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800 rounded-lg p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Icons.BarChart3 className="w-5 h-5 text-blue-400" />
              Business Metrics
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-400">Revenue</span>
                </div>
                <div className="text-lg font-bold text-green-400">
                  ${businessMetrics.revenue.toLocaleString()}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-400">Growth</span>
                </div>
                <div className="text-lg font-bold text-blue-400">
                  +{businessMetrics.growth}%
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.Users className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-400">Active Users</span>
                </div>
                <div className="text-lg font-bold text-purple-400">
                  {businessMetrics.activeUsers.toLocaleString()}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.Activity className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-gray-400">Completion</span>
                </div>
                <div className="text-lg font-bold text-yellow-400">
                  {businessMetrics.completion}%
                </div>
              </div>
            </div>
          </motion.div>

          {/* 3D Globe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-lg p-6 xl:col-span-2"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Icons.MapPin className="w-5 h-5 text-emerald-400" />
              Global Agent Distribution
            </h2>
            <div className="h-96 bg-gray-900 rounded-lg overflow-hidden">
              <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <pointLight position={[-10, -10, -10]} color="#3b82f6" />
                <RotatingGlobe agents={agents} />
                <OrbitControls enableZoom={true} enablePan={true} />
              </Canvas>
            </div>
          </motion.div>
        </div>

        {/* Regional Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {businessRegions.map((region, index) => (
            <motion.div
              key={region.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-br ${region.color} rounded-lg p-6 text-white`}
            >
              <h3 className="font-bold text-lg mb-3">{region.name}</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">Revenue</span>
                  <span className="font-bold">${region.revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">Growth</span>
                  <span className="font-bold">+{region.growth}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">Agents</span>
                  <span className="font-bold">{region.agents}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Agent Performance Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-lg p-6"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Icons.Zap className="w-5 h-5 text-yellow-400" />
            Agent Performance Overview
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4">Agent</th>
                  <th className="text-left py-3 px-4">Region</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Tasks</th>
                  <th className="text-left py-3 px-4">Performance</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="py-3 px-4 font-medium">{agent.name}</td>
                    <td className="py-3 px-4 text-gray-400">{agent.region}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        agent.status === 'active' 
                          ? 'bg-green-900 text-green-400' 
                          : 'bg-gray-600 text-gray-400'
                      }`}>
                        {agent.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">{agent.tasks}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${agent.performance}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400">{agent.performance}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Globe3D;