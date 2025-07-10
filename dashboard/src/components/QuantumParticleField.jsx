import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Quantum Particle System
const QuantumParticles = ({ count = 5000, color = '#00ffff' }) => {
  const ref = useRef();
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      
      const col = new THREE.Color(color);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    
    return { positions, colors };
  }, [count, color]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.05;
      ref.current.rotation.y = state.clock.elapsedTime * 0.075;
      
      // Quantum fluctuation effect
      const positions = ref.current.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        positions[idx + 1] += Math.sin(state.clock.elapsedTime + i) * 0.01;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <Points ref={ref} positions={particles.positions} colors={particles.colors}>
      <PointMaterial
        size={0.1}
        vertexColors
        blending={THREE.AdditiveBlending}
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </Points>
  );
};

// Energy Wave Effect
const EnergyWave = ({ color = '#ff00ff' }) => {
  const meshRef = useRef();
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(100, 100, 128, 128);
    return geo;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      const { position } = meshRef.current.geometry.attributes;
      const time = state.clock.elapsedTime;
      
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const distance = Math.sqrt(x * x + y * y);
        const z = Math.sin(distance * 0.1 - time * 2) * 2;
        position.setZ(i, z);
      }
      position.needsUpdate = true;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshPhongMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        side={THREE.DoubleSide}
        wireframe
        transparent
        opacity={0.3}
      />
    </mesh>
  );
};

// Data Stream Visualization
const DataStream = ({ start = [0, 0, 0], end = [10, 10, 10], color = '#00ff00' }) => {
  const ref = useRef();
  const particleCount = 100;
  
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const point = new THREE.Vector3().lerpVectors(startVec, endVec, t);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    }
    
    return positions;
  }, [start, end, particleCount]);

  useFrame((state) => {
    if (ref.current) {
      const time = state.clock.elapsedTime;
      const positions = ref.current.geometry.attributes.position.array;
      const startVec = new THREE.Vector3(...start);
      const endVec = new THREE.Vector3(...end);
      
      for (let i = 0; i < particleCount; i++) {
        const t = ((i / particleCount + time * 0.5) % 1);
        const point = new THREE.Vector3().lerpVectors(startVec, endVec, t);
        
        // Add some spiral motion
        const angle = t * Math.PI * 4;
        const radius = 0.5;
        point.x += Math.cos(angle) * radius;
        point.z += Math.sin(angle) * radius;
        
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <Points ref={ref} positions={particles}>
      <PointMaterial
        size={0.2}
        color={color}
        blending={THREE.AdditiveBlending}
        transparent
        opacity={0.8}
      />
    </Points>
  );
};

// Neural Network Visualization
const NeuralNetwork = ({ nodes = 20, connections = 40 }) => {
  const networkData = useMemo(() => {
    const nodePositions = [];
    const connectionPairs = [];
    
    // Create nodes in 3D space
    for (let i = 0; i < nodes; i++) {
      nodePositions.push([
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      ]);
    }
    
    // Create random connections
    for (let i = 0; i < connections; i++) {
      const start = Math.floor(Math.random() * nodes);
      const end = Math.floor(Math.random() * nodes);
      if (start !== end) {
        connectionPairs.push([nodePositions[start], nodePositions[end]]);
      }
    }
    
    return { nodePositions, connectionPairs };
  }, [nodes, connections]);

  return (
    <group>
      {/* Nodes */}
      {networkData.nodePositions.map((pos, idx) => (
        <mesh key={`node-${idx}`} position={pos}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshPhongMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
      
      {/* Connections */}
      {networkData.connectionPairs.map((pair, idx) => (
        <DataStream
          key={`connection-${idx}`}
          start={pair[0]}
          end={pair[1]}
          color="#00ff00"
        />
      ))}
    </group>
  );
};

// Main Quantum Particle Field Component
const QuantumParticleField = ({ intensity = 'medium' }) => {
  const counts = {
    low: 1000,
    medium: 3000,
    high: 5000
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 30], fov: 60 }}>
        <fog attach="fog" args={['#000011', 10, 100]} />
        
        {/* Multiple particle layers */}
        <QuantumParticles count={counts[intensity]} color="#00ffff" />
        <QuantumParticles count={counts[intensity] / 2} color="#ff00ff" />
        <QuantumParticles count={counts[intensity] / 3} color="#ffff00" />
        
        {/* Energy waves */}
        <EnergyWave color="#00ffff" />
        
        {/* Neural network */}
        <NeuralNetwork nodes={15} connections={25} />
        
        {/* Ambient lighting */}
        <ambientLight intensity={0.1} />
        <pointLight position={[10, 10, 10]} intensity={0.5} color="#00ffff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff00ff" />
      </Canvas>
    </div>
  );
};

export default QuantumParticleField;