import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Line, Html } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import soundService from '../services/safeSoundService';

// 3D Node Component
const NavigationNode = ({ position, label, isActive, onClick, connections = [] }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      if (hovered) {
        meshRef.current.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.1);
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }
  });

  return (
    <group position={position}>
      {/* Node Sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          soundService.play('perfectClick');
          onClick();
        }}
        onPointerOver={() => {
          setHovered(true);
          soundService.play('buttonHover');
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshPhongMaterial
          color={isActive ? '#00ffff' : '#0088ff'}
          emissive={isActive ? '#00ffff' : '#0088ff'}
          emissiveIntensity={hovered ? 0.5 : 0.2}
          wireframe={false}
        />
      </mesh>
      
      {/* Glow Effect */}
      {(isActive || hovered) && (
        <mesh scale={[1.5, 1.5, 1.5]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial
            color="#00ffff"
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      
      {/* Label */}
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.2}
        color={isActive ? '#00ffff' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      
      {/* HTML Overlay for hover */}
      {hovered && (
        <Html position={[0, 1.2, 0]} center>
          <div className="bg-black/80 text-cyan-400 px-3 py-1 rounded-lg text-xs whitespace-nowrap backdrop-blur-sm border border-cyan-400/30">
            Click to navigate
          </div>
        </Html>
      )}
    </group>
  );
};

// Connection Line Component
const ConnectionLine = ({ start, end, isActive = false }) => {
  const points = [start, end];
  
  return (
    <Line
      points={points}
      color={isActive ? '#00ffff' : '#0088ff'}
      lineWidth={isActive ? 3 : 1}
      opacity={isActive ? 1 : 0.3}
      transparent
    />
  );
};

// 3D Grid Component
const SpaceGrid = () => {
  return (
    <group>
      <gridHelper args={[20, 20, '#00ffff', '#004488']} position={[0, -2, 0]} />
      <gridHelper args={[20, 20, '#00ffff', '#004488']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -10]} />
    </group>
  );
};

// Camera Controller
const CameraController = ({ target }) => {
  const { camera } = useThree();
  
  useEffect(() => {
    if (target) {
      camera.lookAt(target[0], target[1], target[2]);
    }
  }, [target, camera]);
  
  return null;
};

// Main Spatial Navigation System
const SpatialNavigationSystem = ({ darkMode, onNavigate }) => {
  const [activeNode, setActiveNode] = useState('overview');
  const [cameraTarget, setCameraTarget] = useState([0, 0, 0]);
  
  // Navigation nodes with 3D positions
  const nodes = [
    { id: 'overview', label: 'Overview', position: [0, 0, 0] },
    { id: 'agents', label: 'AI Agents', position: [4, 1, 0] },
    { id: 'analytics', label: 'Analytics', position: [-4, 1, 0] },
    { id: 'network', label: 'Network', position: [0, 1, 4] },
    { id: 'security', label: 'Security', position: [0, 1, -4] },
    { id: 'code', label: 'Code Lab', position: [3, -1, 3] },
    { id: 'monitoring', label: 'Monitoring', position: [-3, -1, 3] },
    { id: 'deployment', label: 'Deployment', position: [3, -1, -3] },
    { id: 'settings', label: 'Settings', position: [-3, -1, -3] },
  ];
  
  // Define connections between nodes
  const connections = [
    ['overview', 'agents'],
    ['overview', 'analytics'],
    ['overview', 'network'],
    ['overview', 'security'],
    ['agents', 'code'],
    ['agents', 'deployment'],
    ['analytics', 'monitoring'],
    ['network', 'security'],
    ['code', 'deployment'],
    ['monitoring', 'settings'],
  ];
  
  const handleNodeClick = (nodeId) => {
    setActiveNode(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setCameraTarget(node.position);
      soundService.play('tabSwitch');
      onNavigate(nodeId);
    }
  };
  
  const getNodePosition = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? node.position : [0, 0, 0];
  };
  
  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [5, 5, 10], fov: 60 }}>
        <fog attach="fog" args={[darkMode ? '#000011' : '#f0f0f0', 5, 30]} />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00ffff" />
        
        {/* Camera Controller */}
        <CameraController target={cameraTarget} />
        
        {/* Space Grid */}
        <SpaceGrid />
        
        {/* Connections */}
        {connections.map(([start, end], idx) => (
          <ConnectionLine
            key={idx}
            start={getNodePosition(start)}
            end={getNodePosition(end)}
            isActive={activeNode === start || activeNode === end}
          />
        ))}
        
        {/* Navigation Nodes */}
        {nodes.map(node => (
          <NavigationNode
            key={node.id}
            position={node.position}
            label={node.label}
            isActive={activeNode === node.id}
            onClick={() => handleNodeClick(node.id)}
          />
        ))}
        
        {/* Floating particles for ambiance */}
        <group>
          {Array.from({ length: 50 }).map((_, i) => (
            <mesh
              key={i}
              position={[
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
              ]}
            >
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial color="#00ffff" transparent opacity={0.5} />
            </mesh>
          ))}
        </group>
        
        {/* Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={true}
          autoRotateSpeed={0.5}
          maxDistance={20}
          minDistance={5}
        />
      </Canvas>
      
      {/* UI Overlay */}
      <div className="absolute bottom-4 left-4 right-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/80 backdrop-blur-lg border border-cyan-400/30 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-cyan-400 font-medium mb-1">3D Navigation</h3>
              <p className="text-xs text-gray-400">
                Click nodes to navigate • Scroll to zoom • Drag to rotate
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-cyan-400 font-mono">
                Current: {nodes.find(n => n.id === activeNode)?.label}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Mini Map */}
      <div className="absolute top-4 right-4 w-48 h-48 bg-black/80 backdrop-blur-lg border border-cyan-400/30 rounded-lg p-2">
        <div className="w-full h-full relative">
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1">
            {nodes.map(node => {
              const x = ((node.position[0] + 5) / 10) * 100;
              const z = ((node.position[2] + 5) / 10) * 100;
              return (
                <div
                  key={node.id}
                  className={`absolute w-2 h-2 rounded-full transition-all cursor-pointer ${
                    activeNode === node.id ? 'bg-cyan-400' : 'bg-cyan-600'
                  }`}
                  style={{
                    left: `${x}%`,
                    top: `${z}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={() => handleNodeClick(node.id)}
                  title={node.label}
                />
              );
            })}
          </div>
          <div className="absolute inset-0 border border-cyan-400/20 rounded" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-cyan-400/10" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-cyan-400/10" />
        </div>
      </div>
    </div>
  );
};

export default SpatialNavigationSystem;