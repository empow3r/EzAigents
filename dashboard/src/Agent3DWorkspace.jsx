'use client';
import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Html } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';

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
      mistral: '#3B82F6',
      gemini: '#EF4444'
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
          color={getAgentColor(agent.id)}
          emissive={isActive ? getAgentColor(agent.id) : '#000000'}
          emissiveIntensity={isActive ? 0.3 : 0}
          metalness={0.5}
          roughness={0.2}
        />
      </Box>
      
      {/* Status indicator */}
      <Sphere position={[0, 1.2, 0]} args={[0.2]}>
        <meshBasicMaterial 
          color={
            agent.status === 'processing' ? '#10B981' :
            agent.status === 'completed' ? '#3B82F6' :
            agent.status === 'error' ? '#EF4444' :
            '#6B7280'
          }
        />
      </Sphere>

      {/* Agent label */}
      <Text
        position={[0, -1.5, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {agent.name}
      </Text>

      {/* Tooltip on hover */}
      {hovered && (
        <Html position={[0, 2, 0]} center>
          <div className="bg-black/80 text-white p-2 rounded text-xs whitespace-nowrap">
            <div>{agent.name}</div>
            <div>Status: {agent.status}</div>
            <div>Runs: {agent.runs}</div>
          </div>
        </Html>
      )}

      {/* Activity particles */}
      {isActive && (
        <group>
          {[...Array(5)].map((_, i) => (
            <Sphere key={i} position={[
              Math.sin(i) * 2,
              Math.cos(i) * 2,
              Math.sin(i * 2) * 2
            ]} args={[0.05]}>
              <meshBasicMaterial color="#FFFFFF" opacity={0.6} transparent />
            </Sphere>
          ))}
        </group>
      )}
    </group>
  );
}

function ConnectionLine({ start, end, active }) {
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial 
        color={active ? "#10B981" : "#374151"} 
        opacity={active ? 0.8 : 0.3}
        transparent
      />
    </line>
  );
}

export default function Agent3DWorkspace() {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [cameraTarget, setCameraTarget] = useState([0, 0, 0]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/agent-stats');
        const stats = await response.json();
        
        const formattedAgents = Object.entries(stats).map(([type, s], index) => ({
          id: type,
          name: type.toUpperCase(),
          status: s.status || 'idle',
          runs: s.runs || 0,
          position: [
            Math.cos((index * 2 * Math.PI) / Object.keys(stats).length) * 3,
            0,
            Math.sin((index * 2 * Math.PI) / Object.keys(stats).length) * 3
          ]
        }));
        
        setAgents(formattedAgents);
      } catch (error) {
        console.error('Failed to fetch agent stats:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAgentClick = (agent) => {
    setSelectedAgent(agent);
    setCameraTarget(agent.position);
  };

  return (
    <div className="h-screen bg-gradient-to-b from-slate-900 to-black">
      <div className="absolute top-4 left-4 z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg p-4"
        >
          <h2 className="text-white text-xl font-bold mb-2">3D Agent Workspace</h2>
          <p className="text-gray-300 text-sm">Click on agents to inspect</p>
          {selectedAgent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-white/10 rounded-lg"
            >
              <h3 className="text-white font-bold">{selectedAgent.name}</h3>
              <p className="text-gray-300 text-sm">Status: {selectedAgent.status}</p>
              <p className="text-gray-300 text-sm">Runs: {selectedAgent.runs}</p>
            </motion.div>
          )}
        </motion.div>
      </div>

      <Canvas camera={{ position: [8, 8, 8], fov: 60 }}>
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
            isActive={agent.status === 'processing'}
          />
        ))}

        {/* Connection lines */}
        {agents.map((agent) => (
          <ConnectionLine
            key={`connection-${agent.id}`}
            start={[0, 0, 0]}
            end={agent.position}
            active={agent.status === 'processing'}
          />
        ))}

        {/* Grid floor */}
        <gridHelper args={[20, 20, '#374151', '#1F2937']} position={[0, -2, 0]} />

        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          target={cameraTarget}
        />
      </Canvas>

      {/* Controls overlay */}
      <div className="absolute bottom-4 right-4 z-10">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg p-3"
        >
          <div className="text-white text-xs space-y-1">
            <div>🖱️ Drag to rotate</div>
            <div>🖱️ Scroll to zoom</div>
            <div>🖱️ Right-click to pan</div>
            <div>🖱️ Click agents to select</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}