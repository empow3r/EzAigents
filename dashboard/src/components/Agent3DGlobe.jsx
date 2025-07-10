import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { 
  OrbitControls, 
  Sphere, 
  Stars,
  Text,
  Line,
  Html,
  PerspectiveCamera,
  useTexture
} from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

// Globe Component
const Globe = ({ onLocationClick }) => {
  const globeRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  // Create Earth texture
  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Create gradient for ocean
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    oceanGradient.addColorStop(0, '#001a33');
    oceanGradient.addColorStop(0.5, '#003366');
    oceanGradient.addColorStop(1, '#001a33');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw continents (simplified)
    ctx.fillStyle = '#00ff88';
    ctx.globalAlpha = 0.6;
    
    // North America
    ctx.beginPath();
    ctx.arc(canvas.width * 0.25, canvas.height * 0.3, 150, 0, Math.PI * 2);
    ctx.fill();
    
    // Europe & Asia
    ctx.beginPath();
    ctx.arc(canvas.width * 0.6, canvas.height * 0.3, 200, 0, Math.PI * 2);
    ctx.fill();
    
    // Africa
    ctx.beginPath();
    ctx.arc(canvas.width * 0.55, canvas.height * 0.6, 120, 0, Math.PI * 2);
    ctx.fill();
    
    // South America
    ctx.beginPath();
    ctx.arc(canvas.width * 0.3, canvas.height * 0.7, 100, 0, Math.PI * 2);
    ctx.fill();
    
    // Australia
    ctx.beginPath();
    ctx.arc(canvas.width * 0.8, canvas.height * 0.75, 80, 0, Math.PI * 2);
    ctx.fill();
    
    // Grid lines
    ctx.strokeStyle = '#00ffff';
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 1;
    
    // Latitude lines
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (canvas.height / 12) * i);
      ctx.lineTo(canvas.width, (canvas.height / 12) * i);
      ctx.stroke();
    }
    
    // Longitude lines
    for (let i = 0; i < 24; i++) {
      ctx.beginPath();
      ctx.moveTo((canvas.width / 24) * i, 0);
      ctx.lineTo((canvas.width / 24) * i, canvas.height);
      ctx.stroke();
    }
    
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((state) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group>
      <mesh 
        ref={globeRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={onLocationClick}
      >
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial
          map={earthTexture}
          emissive="#004488"
          emissiveIntensity={0.1}
          bumpScale={0.05}
          specular="#00ffff"
          shininess={10}
        />
      </mesh>
      
      {/* Atmosphere */}
      <mesh scale={[1.1, 1.1, 1.1]}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial
          color="#00ccff"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Glow effect */}
      <mesh scale={[1.2, 1.2, 1.2]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={hovered ? 0.3 : 0.1}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
};

// Agent Location Marker
const AgentMarker = ({ position, agent, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const markerRef = useRef();
  
  useFrame((state) => {
    if (markerRef.current) {
      markerRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.1);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={markerRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => onClick(agent)}
      >
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial 
          color={agent.status === 'active' ? '#00ff00' : '#ff9900'} 
          emissive={agent.status === 'active' ? '#00ff00' : '#ff9900'}
          emissiveIntensity={2}
        />
      </mesh>
      
      {/* Pulse effect */}
      <mesh>
        <ringGeometry args={[0.1, 0.15, 32]} />
        <meshBasicMaterial 
          color={agent.status === 'active' ? '#00ff00' : '#ff9900'} 
          transparent 
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Label on hover */}
      {hovered && (
        <Html position={[0, 0.2, 0]} center>
          <div className="bg-black/90 text-cyan-400 px-3 py-2 rounded-lg text-xs whitespace-nowrap backdrop-blur-sm border border-cyan-400/30">
            <div className="font-bold">{agent.name}</div>
            <div className="text-cyan-300/70">{agent.location}</div>
            <div className={`text-xs ${agent.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
              {agent.status.toUpperCase()}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// Connection Line between agents
const AgentConnection = ({ start, end, active = false }) => {
  const curve = useMemo(() => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const midVec = startVec.clone().add(endVec).multiplyScalar(0.5);
    midVec.normalize().multiplyScalar(2.5);
    
    return new THREE.QuadraticBezierCurve3(startVec, midVec, endVec);
  }, [start, end]);

  const points = curve.getPoints(50);
  
  return (
    <Line
      points={points}
      color={active ? '#00ffff' : '#0088ff'}
      lineWidth={active ? 2 : 1}
      opacity={active ? 0.8 : 0.3}
      transparent
    />
  );
};

// Convert lat/lon to 3D position on sphere
const latLonToVector3 = (lat, lon, radius = 2) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return [x, y, z];
};

// Main 3D Globe Component
const Agent3DGlobe = ({ agents = [], connections = [], onAgentClick }) => {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [rotation, setRotation] = useState([0, 0, 0]);
  
  // Sample agent data if none provided
  const defaultAgents = [
    { id: 1, name: 'Claude-US-East', location: 'New York', lat: 40.7128, lon: -74.0060, status: 'active', tasks: 342 },
    { id: 2, name: 'GPT-Europe', location: 'London', lat: 51.5074, lon: -0.1278, status: 'active', tasks: 287 },
    { id: 3, name: 'Gemini-Asia', location: 'Tokyo', lat: 35.6762, lon: 139.6503, status: 'active', tasks: 415 },
    { id: 4, name: 'Mistral-Pacific', location: 'Sydney', lat: -33.8688, lon: 151.2093, status: 'idle', tasks: 156 },
    { id: 5, name: 'DeepSeek-Americas', location: 'São Paulo', lat: -23.5505, lon: -46.6333, status: 'active', tasks: 223 },
    { id: 6, name: 'Llama-Africa', location: 'Cape Town', lat: -33.9249, lon: 18.4241, status: 'active', tasks: 189 },
    { id: 7, name: 'Claude-Singapore', location: 'Singapore', lat: 1.3521, lon: 103.8198, status: 'active', tasks: 367 },
    { id: 8, name: 'GPT-Canada', location: 'Toronto', lat: 43.6532, lon: -79.3832, status: 'idle', tasks: 92 }
  ];
  
  const agentData = agents.length > 0 ? agents : defaultAgents;
  
  // Sample connections
  const defaultConnections = [
    [1, 2], [2, 3], [3, 7], [1, 8], [5, 6], [4, 7], [2, 6], [1, 5]
  ];
  
  const connectionData = connections.length > 0 ? connections : defaultConnections;

  const handleAgentClick = (agent) => {
    setSelectedAgent(agent);
    if (onAgentClick) {
      onAgentClick(agent);
    }
  };

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <PerspectiveCamera makeDefault position={[0, 0, 6]} />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#0088ff" />
        
        {/* Stars background */}
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
        
        {/* Globe */}
        <Globe onLocationClick={() => {}} />
        
        {/* Agent Markers */}
        {agentData.map(agent => (
          <AgentMarker
            key={agent.id}
            position={latLonToVector3(agent.lat, agent.lon)}
            agent={agent}
            onClick={handleAgentClick}
          />
        ))}
        
        {/* Connections */}
        {connectionData.map(([startId, endId], idx) => {
          const startAgent = agentData.find(a => a.id === startId);
          const endAgent = agentData.find(a => a.id === endId);
          if (startAgent && endAgent) {
            return (
              <AgentConnection
                key={idx}
                start={latLonToVector3(startAgent.lat, startAgent.lon)}
                end={latLonToVector3(endAgent.lat, endAgent.lon)}
                active={selectedAgent?.id === startId || selectedAgent?.id === endId}
              />
            );
          }
          return null;
        })}
        
        {/* Orbital ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3, 0.01, 16, 100]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.3} />
        </mesh>
        
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3}
          maxDistance={10}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
      
      {/* Info Panel */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/80 backdrop-blur-lg border border-cyan-400/30 rounded-lg p-4 pointer-events-auto"
        >
          <h3 className="text-cyan-400 font-semibold mb-2">Global Agent Network</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-cyan-300/70">Active Agents:</span>
              <span className="text-cyan-400">{agentData.filter(a => a.status === 'active').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cyan-300/70">Total Tasks:</span>
              <span className="text-cyan-400">{agentData.reduce((sum, a) => sum + a.tasks, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cyan-300/70">Connections:</span>
              <span className="text-cyan-400">{connectionData.length}</span>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Selected Agent Details */}
      {selectedAgent && (
        <div className="absolute bottom-4 right-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/80 backdrop-blur-lg border border-cyan-400/30 rounded-lg p-4 pointer-events-auto max-w-xs"
          >
            <h4 className="text-cyan-400 font-semibold mb-2">{selectedAgent.name}</h4>
            <div className="space-y-1 text-sm">
              <p className="text-cyan-300/70">Location: <span className="text-white">{selectedAgent.location}</span></p>
              <p className="text-cyan-300/70">Status: <span className={selectedAgent.status === 'active' ? 'text-green-400' : 'text-yellow-400'}>{selectedAgent.status}</span></p>
              <p className="text-cyan-300/70">Active Tasks: <span className="text-white">{selectedAgent.tasks}</span></p>
            </div>
            <button
              onClick={() => setSelectedAgent(null)}
              className="mt-3 text-xs text-cyan-400 hover:text-cyan-300"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Agent3DGlobe;