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
  useTexture,
  Trail,
  Float,
  Sparkles,
  PointMaterial,
  Points
} from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, Shield, Database, Cpu } from 'lucide-react';

// Enhanced Globe with real-time textures
const EnhancedGlobe = ({ onLocationClick }) => {
  const globeRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [time, setTime] = useState(0);
  
  useFrame((state) => {
    setTime(state.clock.elapsedTime);
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.002;
    }
  });

  // Advanced Earth texture with real-time effects
  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Deep space ocean gradient
    const oceanGradient = ctx.createRadialGradient(
      canvas.width/2, canvas.height/2, 0,
      canvas.width/2, canvas.height/2, canvas.width/2
    );
    oceanGradient.addColorStop(0, '#001122');
    oceanGradient.addColorStop(0.5, '#002244');
    oceanGradient.addColorStop(1, '#000011');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Glowing continents
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 20;
    ctx.globalAlpha = 0.8;
    
    // North America with glow
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
    
    // Add city lights effect
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffff00';
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Grid lines with glow
    ctx.strokeStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2;
    
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

  return (
    <group>
      {/* Main globe */}
      <mesh 
        ref={globeRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={onLocationClick}
      >
        <sphereGeometry args={[2, 128, 128]} />
        <meshPhongMaterial
          map={earthTexture}
          emissive="#002244"
          emissiveIntensity={0.2}
          bumpScale={0.1}
          specular="#00ffff"
          shininess={20}
        />
      </mesh>
      
      {/* Dynamic atmosphere layers */}
      <mesh scale={[1.05, 1.05, 1.05]}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshBasicMaterial
          color="#00aaff"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>
      
      <mesh scale={[1.1, 1.1, 1.1]}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshBasicMaterial
          color="#0088ff"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Outer glow */}
      <mesh scale={[1.2, 1.2, 1.2]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={hovered ? 0.4 : 0.15}
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Floating particles around globe */}
      <Sparkles
        count={200}
        scale={[6, 6, 6]}
        size={1}
        speed={0.5}
        opacity={0.4}
        color="#00ffff"
      />
    </group>
  );
};

// Advanced Agent Marker with real-time data
const EnhancedAgentMarker = ({ position, agent, onClick, time }) => {
  const [hovered, setHovered] = useState(false);
  const markerRef = useRef();
  const trailRef = useRef();
  
  useFrame((state) => {
    if (markerRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3 + agent.id) * 0.2;
      markerRef.current.scale.setScalar(scale);
    }
  });

  const getStatusColor = () => {
    switch (agent.status) {
      case 'active': return '#00ff00';
      case 'processing': return '#ffff00';
      case 'idle': return '#ff9900';
      case 'error': return '#ff0000';
      default: return '#888888';
    }
  };

  const getIntensity = () => {
    return agent.tasks > 300 ? 3 : agent.tasks > 200 ? 2 : 1;
  };

  return (
    <group position={position}>
      {/* Main marker */}
      <Trail
        width={2}
        length={8}
        color={new THREE.Color(getStatusColor())}
        attenuation={(t) => t * t}
      >
        <mesh
          ref={markerRef}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onClick={() => onClick(agent)}
        >
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial 
            color={getStatusColor()} 
            emissive={getStatusColor()}
            emissiveIntensity={getIntensity()}
          />
        </mesh>
      </Trail>
      
      {/* Activity pulse rings */}
      {[1, 2, 3].map((ring, idx) => (
        <mesh key={idx} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1 + idx * 0.05, 0.15 + idx * 0.05, 32]} />
          <meshBasicMaterial 
            color={getStatusColor()} 
            transparent 
            opacity={0.3 - idx * 0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      
      {/* Data flow effect */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.3}>
        <mesh position={[0, 0.2, 0]}>
          <octahedronGeometry args={[0.03, 0]} />
          <meshBasicMaterial 
            color="#ffffff" 
            emissive="#ffffff"
            emissiveIntensity={1}
            transparent
            opacity={0.8}
          />
        </mesh>
      </Float>
      
      {/* Enhanced label */}
      {hovered && (
        <Html position={[0, 0.3, 0]} center>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/95 text-cyan-400 px-4 py-3 rounded-xl text-xs backdrop-blur-sm border border-cyan-400/40 shadow-2xl"
          >
            <div className="font-bold text-lg mb-1">{agent.name}</div>
            <div className="text-cyan-300/80 mb-2">{agent.location}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span className={`font-medium ${agent.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {agent.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span className="text-white">{agent.tasks}</span>
              </div>
              <div className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                <span className="text-white">{agent.cpu}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span className="text-white">{agent.memory}%</span>
              </div>
            </div>
          </motion.div>
        </Html>
      )}
    </group>
  );
};

// Advanced connection with data flow
const DataConnection = ({ start, end, active = false, dataFlow = 0 }) => {
  const lineRef = useRef();
  
  useFrame((state) => {
    if (lineRef.current) {
      lineRef.current.material.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  const curve = useMemo(() => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const midVec = startVec.clone().add(endVec).multiplyScalar(0.5);
    midVec.normalize().multiplyScalar(2.8);
    
    return new THREE.QuadraticBezierCurve3(startVec, midVec, endVec);
  }, [start, end]);

  const points = curve.getPoints(100);
  
  // Create custom shader material for data flow
  const flowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(active ? '#00ffff' : '#0088ff') }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        
        void main() {
          float flow = mod(vUv.x * 10.0 - time * 3.0, 1.0);
          float alpha = step(0.7, flow) * ${active ? '1.0' : '0.5'};
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
  }, [active]);
  
  return (
    <group>
      <Line
        points={points}
        color={active ? '#00ffff' : '#0088ff'}
        lineWidth={active ? 3 : 1}
        opacity={active ? 0.8 : 0.4}
        transparent
      />
      
      {/* Data packets flowing */}
      {active && (
        <Float speed={4} rotationIntensity={0} floatIntensity={0}>
          <mesh>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
          </mesh>
        </Float>
      )}
    </group>
  );
};

// Real-time data visualization
const DataVisualization = ({ agents }) => {
  const particlesRef = useRef();
  
  const particleCount = 1000;
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      // Create particles in a sphere around the globe
      const radius = 3 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      const color = new THREE.Color().setHSL(Math.random() * 0.3 + 0.5, 1, 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    return { positions, colors };
  }, []);
  
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        vertexColors
        blending={THREE.AdditiveBlending}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
};

// Convert lat/lon to 3D position
const latLonToVector3 = (lat, lon, radius = 2) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return [x, y, z];
};

// Main Enhanced 3D Globe Component
const EnhancedAgent3DGlobe = ({ agents = [], connections = [], onAgentClick }) => {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [time, setTime] = useState(0);
  const [viewMode, setViewMode] = useState('global'); // global, regional, local
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Enhanced agent data with more properties
  const defaultAgents = [
    { id: 1, name: 'Claude-US-East', location: 'New York', lat: 40.7128, lon: -74.0060, status: 'active', tasks: 342, cpu: 67, memory: 42, type: 'claude' },
    { id: 2, name: 'GPT-Europe', location: 'London', lat: 51.5074, lon: -0.1278, status: 'processing', tasks: 287, cpu: 89, memory: 55, type: 'gpt' },
    { id: 3, name: 'Gemini-Asia', location: 'Tokyo', lat: 35.6762, lon: 139.6503, status: 'active', tasks: 415, cpu: 72, memory: 38, type: 'gemini' },
    { id: 4, name: 'Mistral-Pacific', location: 'Sydney', lat: -33.8688, lon: 151.2093, status: 'idle', tasks: 156, cpu: 23, memory: 28, type: 'mistral' },
    { id: 5, name: 'DeepSeek-Americas', location: 'São Paulo', lat: -23.5505, lon: -46.6333, status: 'active', tasks: 223, cpu: 58, memory: 45, type: 'deepseek' },
    { id: 6, name: 'Llama-Africa', location: 'Cape Town', lat: -33.9249, lon: 18.4241, status: 'active', tasks: 189, cpu: 64, memory: 33, type: 'llama' },
    { id: 7, name: 'Claude-Singapore', location: 'Singapore', lat: 1.3521, lon: 103.8198, status: 'active', tasks: 367, cpu: 78, memory: 52, type: 'claude' },
    { id: 8, name: 'GPT-Canada', location: 'Toronto', lat: 43.6532, lon: -79.3832, status: 'error', tasks: 92, cpu: 12, memory: 15, type: 'gpt' }
  ];
  
  const agentData = agents.length > 0 ? agents : defaultAgents;
  
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
        
        {/* Enhanced lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={0.7} color="#0088ff" />
        <pointLight position={[0, 10, 0]} intensity={0.5} color="#00ffff" />
        
        {/* Stars background */}
        <Stars
          radius={200}
          depth={100}
          count={8000}
          factor={6}
          saturation={0}
          fade
          speed={2}
        />
        
        {/* Enhanced Globe */}
        <EnhancedGlobe onLocationClick={() => {}} />
        
        {/* Data visualization */}
        <DataVisualization agents={agentData} />
        
        {/* Agent Markers */}
        {agentData.map(agent => (
          <EnhancedAgentMarker
            key={agent.id}
            position={latLonToVector3(agent.lat, agent.lon)}
            agent={agent}
            onClick={handleAgentClick}
            time={time}
          />
        ))}
        
        {/* Enhanced Connections */}
        {connectionData.map(([startId, endId], idx) => {
          const startAgent = agentData.find(a => a.id === startId);
          const endAgent = agentData.find(a => a.id === endId);
          if (startAgent && endAgent) {
            return (
              <DataConnection
                key={idx}
                start={latLonToVector3(startAgent.lat, startAgent.lon)}
                end={latLonToVector3(endAgent.lat, endAgent.lon)}
                active={selectedAgent?.id === startId || selectedAgent?.id === endId}
                dataFlow={Math.random()}
              />
            );
          }
          return null;
        })}
        
        {/* Orbital rings */}
        {[3.2, 3.5, 3.8].map((radius, idx) => (
          <mesh key={idx} rotation={[Math.PI / 2, 0, idx * Math.PI / 3]}>
            <torusGeometry args={[radius, 0.005, 16, 100]} />
            <meshBasicMaterial 
              color="#00ffff" 
              transparent 
              opacity={0.2 - idx * 0.05}
            />
          </mesh>
        ))}
        
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3}
          maxDistance={12}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>
      
      {/* Enhanced Info Panel */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/90 backdrop-blur-xl border border-cyan-400/40 rounded-xl p-6 pointer-events-auto shadow-2xl"
        >
          <h3 className="text-cyan-400 font-bold text-lg mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Global AI Network
          </h3>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span className="text-cyan-300/70">Active:</span>
                <span className="text-green-400 font-bold">{agentData.filter(a => a.status === 'active').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-300/70">Processing:</span>
                <span className="text-yellow-400 font-bold">{agentData.filter(a => a.status === 'processing').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-300/70">Idle:</span>
                <span className="text-gray-400 font-bold">{agentData.filter(a => a.status === 'idle').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-300/70">Errors:</span>
                <span className="text-red-400 font-bold">{agentData.filter(a => a.status === 'error').length}</span>
              </div>
            </div>
            <div className="border-t border-cyan-400/20 pt-3">
              <div className="flex justify-between">
                <span className="text-cyan-300/70">Total Tasks:</span>
                <span className="text-cyan-400 font-bold">{agentData.reduce((sum, a) => sum + a.tasks, 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-300/70">Connections:</span>
                <span className="text-cyan-400 font-bold">{connectionData.length}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Selected Agent Details */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-4 right-4 pointer-events-auto"
          >
            <div className="bg-black/90 backdrop-blur-xl border border-cyan-400/40 rounded-xl p-6 max-w-sm shadow-2xl">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-cyan-400 font-bold text-lg">{selectedAgent.name}</h4>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-gray-400 hover:text-white transition-colors text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-300/70">Location:</span>
                  <span className="text-white font-medium">{selectedAgent.location}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-cyan-300/70">Status:</span>
                  <span className={`font-bold ${
                    selectedAgent.status === 'active' ? 'text-green-400' : 
                    selectedAgent.status === 'processing' ? 'text-yellow-400' :
                    selectedAgent.status === 'error' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {selectedAgent.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-cyan-300/70 text-xs">Tasks</div>
                    <div className="text-white font-bold text-lg">{selectedAgent.tasks}</div>
                  </div>
                  <div>
                    <div className="text-cyan-300/70 text-xs">CPU</div>
                    <div className="text-white font-bold text-lg">{selectedAgent.cpu}%</div>
                  </div>
                  <div>
                    <div className="text-cyan-300/70 text-xs">Memory</div>
                    <div className="text-white font-bold text-lg">{selectedAgent.memory}%</div>
                  </div>
                  <div>
                    <div className="text-cyan-300/70 text-xs">Type</div>
                    <div className="text-white font-bold text-lg capitalize">{selectedAgent.type}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedAgent3DGlobe;