'use client';
import React, { useState, useRef, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Float, MeshDistortMaterial, Environment, PerspectiveCamera, Stars } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import DailyDock from './components/InfinityBoard/DailyDock';
import ZoneInterface from './components/InfinityBoard/ZoneInterface';
import OnboardingFlow from './components/InfinityBoard/OnboardingFlow';
import { useInfinityBoardStore } from './stores/infinityBoardStore';

// Life domain zones configuration
const LIFE_ZONES = [
  { id: 'mind', name: 'Mind & Vision', icon: '🧠', color: '#9333EA', position: [0, 2, 0] },
  { id: 'business', name: 'Business Empire', icon: '💼', color: '#3B82F6', position: [2, 1, 0] },
  { id: 'health', name: 'Peak Performance', icon: '💪', color: '#10B981', position: [2, -1, 0] },
  { id: 'wealth', name: 'Wealth Vault', icon: '🏦', color: '#F59E0B', position: [0, -2, 0] },
  { id: 'relationships', name: 'Connections', icon: '❤️', color: '#EF4444', position: [-2, -1, 0] },
  { id: 'lifestyle', name: 'Dream Life', icon: '✈️', color: '#8B5CF6', position: [-2, 1, 0] },
  { id: 'productivity', name: 'Execution Hub', icon: '📈', color: '#06B6D4', position: [1.4, 1.4, 1.4] },
  { id: 'selfcare', name: 'Inner Temple', icon: '🧘‍♂️', color: '#EC4899', position: [-1.4, 1.4, 1.4] },
  { id: 'communication', name: 'Command Center', icon: '🗣️', color: '#6366F1', position: [1.4, -1.4, -1.4] },
  { id: 'delegation', name: 'AI Army', icon: '🤖', color: '#14B8A6', position: [-1.4, -1.4, -1.4] }
];

// Floating Island Component
const FloatingIsland = ({ zone, onClick, isActive }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      if (hovered || isActive) {
        meshRef.current.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.1);
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <group position={zone.position}>
        <mesh
          ref={meshRef}
          onClick={() => onClick(zone)}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[0.5, 32, 32]} />
          <MeshDistortMaterial
            color={zone.color}
            attach="material"
            distort={0.3}
            speed={2}
            emissive={zone.color}
            emissiveIntensity={hovered || isActive ? 0.5 : 0.2}
          />
        </mesh>
        <Text
          position={[0, 0.8, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {zone.icon}
        </Text>
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {zone.name}
        </Text>
      </group>
    </Float>
  );
};

// Central Globe
const CentralGlobe = () => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#1a1a2e"
        emissive="#0f3460"
        emissiveIntensity={0.5}
        metalness={0.8}
        roughness={0.2}
        wireframe
      />
    </mesh>
  );
};

// Camera Controller
const CameraController = ({ targetPosition, activeZone }) => {
  const { camera } = useThree();
  
  useFrame(() => {
    if (activeZone) {
      const target = new THREE.Vector3(...targetPosition);
      camera.position.lerp(target.multiplyScalar(3), 0.05);
      camera.lookAt(0, 0, 0);
    } else {
      const defaultPosition = new THREE.Vector3(5, 5, 5);
      camera.position.lerp(defaultPosition, 0.05);
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
};

// Main InfinityBoard Component
export default function InfinityBoard() {
  const [activeZone, setActiveZone] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, theme, setTheme } = useInfinityBoardStore();

  useEffect(() => {
    // Check if first time user
    if (!user?.hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, [user]);

  const handleZoneClick = (zone) => {
    setActiveZone(zone);
  };

  const handleCloseZone = () => {
    setActiveZone(null);
  };

  const themeStyles = {
    luxe: 'bg-gradient-to-br from-gray-900 via-gray-800 to-black',
    zen: 'bg-gradient-to-br from-green-900 via-teal-900 to-blue-900',
    futurist: 'bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900'
  };

  return (
    <div className={`relative w-full h-screen overflow-hidden ${themeStyles[theme]}`}>
      {/* 3D Scene */}
      <Canvas className="absolute inset-0">
        <PerspectiveCamera makeDefault position={[5, 5, 5]} />
        <OrbitControls 
          enablePan={!activeZone}
          enableZoom={!activeZone}
          enableRotate={!activeZone}
          autoRotate={!activeZone}
          autoRotateSpeed={0.5}
        />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8B5CF6" />
        
        <Suspense fallback={null}>
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
          <Environment preset="night" />
          
          <CentralGlobe />
          
          {LIFE_ZONES.map((zone) => (
            <FloatingIsland
              key={zone.id}
              zone={zone}
              onClick={handleZoneClick}
              isActive={activeZone?.id === zone.id}
            />
          ))}
          
          <CameraController 
            targetPosition={activeZone?.position || [5, 5, 5]}
            activeZone={activeZone}
          />
        </Suspense>
      </Canvas>

      {/* Daily Dock */}
      <AnimatePresence>
        {!activeZone && !showOnboarding && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0"
          >
            <DailyDock />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone Interface */}
      <AnimatePresence>
        {activeZone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 pointer-events-none"
          >
            <ZoneInterface zone={activeZone} onClose={handleCloseZone} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Flow */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>

      {/* Theme Switcher */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="absolute top-4 right-4 z-50"
      >
        <div className="flex gap-2 bg-black/50 backdrop-blur-xl p-2 rounded-xl">
          <button
            onClick={() => setTheme('luxe')}
            className={`px-3 py-1 rounded-lg text-xs transition-all ${
              theme === 'luxe' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            ⚡ Luxe
          </button>
          <button
            onClick={() => setTheme('zen')}
            className={`px-3 py-1 rounded-lg text-xs transition-all ${
              theme === 'zen' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            🌿 Zen
          </button>
          <button
            onClick={() => setTheme('futurist')}
            className={`px-3 py-1 rounded-lg text-xs transition-all ${
              theme === 'futurist' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            🚀 Futurist
          </button>
        </div>
      </motion.div>
    </div>
  );
}