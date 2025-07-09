'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line, Box } from '@react-three/drei';
import * as THREE from 'three';
import { Network } from 'vis-network/standalone';
import { animated, useSpring } from '@react-spring/three';

const NEURON_COLORS = {
  input: '#3B82F6',
  hidden: '#8B5CF6',
  output: '#10B981',
  active: '#F59E0B',
  inactive: '#6B7280'
};

// 3D Neuron component
function Neuron({ position, type, activation, connections, onHover }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  const { scale, color } = useSpring({
    scale: hovered ? 1.5 : 1 + activation * 0.5,
    color: activation > 0.5 ? NEURON_COLORS.active : NEURON_COLORS[type] || NEURON_COLORS.inactive
  });

  useFrame((state) => {
    if (meshRef.current && activation > 0) {
      meshRef.current.rotation.y += activation * 0.02;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * activation * 0.1;
    }
  });

  return (
    <animated.mesh
      ref={meshRef}
      position={position}
      scale={scale}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover({ position, type, activation });
      }}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.3, 32, 16]} />
      <animated.meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={activation}
        metalness={0.3}
        roughness={0.4}
      />
    </animated.mesh>
  );
}

// Synaptic connection component
function Synapse({ start, end, weight, active }) {
  const lineRef = useRef();
  
  const { opacity, width } = useSpring({
    opacity: active ? 0.8 : 0.2,
    width: Math.abs(weight) * 3
  });

  useFrame((state) => {
    if (lineRef.current && active) {
      const pulse = (Math.sin(state.clock.elapsedTime * 5) + 1) / 2;
      lineRef.current.material.opacity = opacity.get() * (0.5 + pulse * 0.5);
    }
  });

  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  const color = weight > 0 ? '#10B981' : '#EF4444';

  return (
    <Line
      ref={lineRef}
      points={points}
      color={color}
      lineWidth={width}
      transparent
      opacity={opacity}
    />
  );
}

// Thought bubble component
function ThoughtBubble({ position, thought }) {
  if (!thought) return null;

  return (
    <group position={[position[0], position[1] + 2, position[2]]}>
      <Box args={[3, 1, 0.1]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#ffffff" opacity={0.9} transparent />
      </Box>
      <Text
        position={[0, 0, 0.1]}
        fontSize={0.2}
        color="#000000"
        anchorX="center"
        anchorY="middle"
      >
        {thought}
      </Text>
    </group>
  );
}

// Main 3D Neural Network Scene
function NeuralNetworkScene({ networkData, activeNeurons, thoughts }) {
  const { camera } = useThree();
  const [hoveredNeuron, setHoveredNeuron] = useState(null);

  useEffect(() => {
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  const neurons = networkData.layers.flatMap((layer, layerIndex) => 
    layer.neurons.map((neuron, neuronIndex) => ({
      ...neuron,
      position: [
        (neuronIndex - layer.neurons.length / 2) * 2,
        (layerIndex - networkData.layers.length / 2) * 3,
        0
      ]
    }))
  );

  const connections = [];
  networkData.layers.forEach((layer, layerIndex) => {
    if (layerIndex < networkData.layers.length - 1) {
      const nextLayer = networkData.layers[layerIndex + 1];
      layer.neurons.forEach((neuron, i) => {
        nextLayer.neurons.forEach((nextNeuron, j) => {
          const weight = networkData.weights[layerIndex]?.[i]?.[j] || 0;
          if (Math.abs(weight) > 0.1) {
            connections.push({
              start: neurons.find(n => n.id === neuron.id).position,
              end: neurons.find(n => n.id === nextNeuron.id).position,
              weight,
              active: activeNeurons.includes(neuron.id) && activeNeurons.includes(nextNeuron.id)
            });
          }
        });
      });
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      
      {neurons.map((neuron) => (
        <Neuron
          key={neuron.id}
          position={neuron.position}
          type={neuron.type}
          activation={neuron.activation}
          connections={neuron.connections}
          onHover={setHoveredNeuron}
        />
      ))}
      
      {connections.map((connection, index) => (
        <Synapse
          key={index}
          start={connection.start}
          end={connection.end}
          weight={connection.weight}
          active={connection.active}
        />
      ))}
      
      {thoughts.map((thought, index) => (
        <ThoughtBubble
          key={index}
          position={thought.position}
          thought={thought.text}
        />
      ))}
    </>
  );
}

export default function AgentBrainVisualizer() {
  const [selectedAgent, setSelectedAgent] = useState('claude');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [networkData, setNetworkData] = useState(null);
  const [activeNeurons, setActiveNeurons] = useState([]);
  const [thoughts, setThoughts] = useState([]);
  const [decisionPath, setDecisionPath] = useState([]);
  
  const visNetworkRef = useRef(null);
  const networkContainerRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    fetchNetworkData();
    startRealtimeUpdates();
  }, [selectedAgent]);

  const fetchNetworkData = async () => {
    try {
      const response = await fetch(`/api/agent-brain/${selectedAgent}`);
      const data = await response.json();
      setNetworkData(data);
      if (visNetworkRef.current) {
        updateVisNetwork(data);
      }
    } catch (error) {
      console.error('Error fetching network data:', error);
      // Use mock data for demonstration
      setNetworkData(generateMockNetworkData());
    }
  };

  const generateMockNetworkData = () => {
    return {
      layers: [
        {
          type: 'input',
          neurons: Array.from({ length: 5 }, (_, i) => ({
            id: `input-${i}`,
            type: 'input',
            activation: Math.random(),
            label: ['Task Complexity', 'Queue Depth', 'CPU Usage', 'Memory', 'Priority'][i]
          }))
        },
        {
          type: 'hidden',
          neurons: Array.from({ length: 8 }, (_, i) => ({
            id: `hidden1-${i}`,
            type: 'hidden',
            activation: Math.random()
          }))
        },
        {
          type: 'hidden',
          neurons: Array.from({ length: 6 }, (_, i) => ({
            id: `hidden2-${i}`,
            type: 'hidden',
            activation: Math.random()
          }))
        },
        {
          type: 'output',
          neurons: Array.from({ length: 3 }, (_, i) => ({
            id: `output-${i}`,
            type: 'output',
            activation: Math.random(),
            label: ['Accept Task', 'Delegate', 'Queue'][i]
          }))
        }
      ],
      weights: [
        Array.from({ length: 5 }, () => Array.from({ length: 8 }, () => Math.random() * 2 - 1)),
        Array.from({ length: 8 }, () => Array.from({ length: 6 }, () => Math.random() * 2 - 1)),
        Array.from({ length: 6 }, () => Array.from({ length: 3 }, () => Math.random() * 2 - 1))
      ]
    };
  };

  const startRealtimeUpdates = () => {
    const updateInterval = setInterval(() => {
      if (isPlaying) {
        updateActivations();
        generateThoughts();
        updateDecisionPath();
      }
    }, 1000 / playbackSpeed);

    return () => clearInterval(updateInterval);
  };

  const updateActivations = () => {
    if (!networkData) return;

    // Simulate neural activations
    const active = [];
    let previousLayerActive = [];

    networkData.layers.forEach((layer, layerIndex) => {
      const layerActive = [];
      
      layer.neurons.forEach((neuron) => {
        const activation = Math.random();
        neuron.activation = activation;
        
        if (activation > 0.5) {
          active.push(neuron.id);
          layerActive.push(neuron.id);
        }
      });
      
      previousLayerActive = layerActive;
    });

    setActiveNeurons(active);
  };

  const generateThoughts = () => {
    const thoughtExamples = [
      "Analyzing task complexity...",
      "High CPU usage detected",
      "Optimal agent: GPT-4",
      "Queue depth increasing",
      "Delegating to available agent",
      "Pattern recognized",
      "Anomaly detected",
      "Calculating confidence..."
    ];

    const newThoughts = [];
    if (Math.random() > 0.7) {
      newThoughts.push({
        position: [Math.random() * 4 - 2, 3, 0],
        text: thoughtExamples[Math.floor(Math.random() * thoughtExamples.length)]
      });
    }

    setThoughts(newThoughts);
  };

  const updateDecisionPath = () => {
    if (!networkData) return;

    const path = [];
    let currentLayer = 0;
    let currentNeuron = Math.floor(Math.random() * networkData.layers[0].neurons.length);

    while (currentLayer < networkData.layers.length) {
      const neuron = networkData.layers[currentLayer].neurons[currentNeuron];
      path.push({
        neuron: neuron.id,
        layer: currentLayer,
        activation: neuron.activation
      });

      if (currentLayer < networkData.layers.length - 1) {
        // Find strongest connection to next layer
        const weights = networkData.weights[currentLayer][currentNeuron];
        currentNeuron = weights.indexOf(Math.max(...weights));
      }
      
      currentLayer++;
    }

    setDecisionPath(path);
  };

  const updateVisNetwork = (data) => {
    if (!networkContainerRef.current) return;

    const nodes = [];
    const edges = [];

    // Create nodes
    data.layers.forEach((layer, layerIndex) => {
      layer.neurons.forEach((neuron, neuronIndex) => {
        nodes.push({
          id: neuron.id,
          label: neuron.label || neuron.id,
          level: layerIndex,
          group: layer.type,
          value: neuron.activation,
          color: {
            background: NEURON_COLORS[layer.type],
            border: NEURON_COLORS[layer.type],
            highlight: {
              background: NEURON_COLORS.active,
              border: NEURON_COLORS.active
            }
          }
        });
      });
    });

    // Create edges
    data.layers.forEach((layer, layerIndex) => {
      if (layerIndex < data.layers.length - 1) {
        layer.neurons.forEach((neuron, i) => {
          data.layers[layerIndex + 1].neurons.forEach((nextNeuron, j) => {
            const weight = data.weights[layerIndex][i][j];
            if (Math.abs(weight) > 0.1) {
              edges.push({
                from: neuron.id,
                to: nextNeuron.id,
                value: Math.abs(weight),
                color: weight > 0 ? '#10B981' : '#EF4444',
                arrows: 'to'
              });
            }
          });
        });
      }
    });

    const options = {
      layout: {
        hierarchical: {
          direction: 'LR',
          sortMethod: 'directed',
          levelSeparation: 200,
          nodeSpacing: 100
        }
      },
      physics: {
        enabled: false
      },
      nodes: {
        shape: 'circle',
        scaling: {
          min: 20,
          max: 40
        }
      },
      edges: {
        scaling: {
          min: 1,
          max: 5
        },
        smooth: {
          type: 'cubicBezier',
          roundness: 0.5
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200
      }
    };

    if (visNetworkRef.current) {
      visNetworkRef.current.setData({ nodes, edges });
    } else {
      visNetworkRef.current = new Network(
        networkContainerRef.current,
        { nodes, edges },
        options
      );

      visNetworkRef.current.on('selectNode', (params) => {
        console.log('Selected node:', params.nodes[0]);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Agent Brain Visualizer</span>
            <div className="flex items-center gap-4">
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="px-3 py-1 border rounded"
              >
                <option value="claude">Claude</option>
                <option value="gpt">GPT-4</option>
                <option value="deepseek">DeepSeek</option>
                <option value="mistral">Mistral</option>
                <option value="gemini">Gemini</option>
              </select>
              <Button
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                variant={isPlaying ? "destructive" : "default"}
              >
                {isPlaying ? "Pause" : "Play"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-sm">Speed:</span>
            <Slider
              value={[playbackSpeed]}
              onValueChange={([value]) => setPlaybackSpeed(value)}
              min={0.5}
              max={3}
              step={0.5}
              className="w-32"
            />
            <span className="text-sm">{playbackSpeed}x</span>
          </div>
        </CardContent>
      </Card>

      {/* 3D Neural Network */}
      <Card>
        <CardHeader>
          <CardTitle>Neural Network Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full">
            {networkData && (
              <Canvas>
                <NeuralNetworkScene
                  networkData={networkData}
                  activeNeurons={activeNeurons}
                  thoughts={thoughts}
                />
              </Canvas>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2D Network Graph */}
      <Card>
        <CardHeader>
          <CardTitle>Decision Flow Network</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={networkContainerRef}
            className="h-96 w-full border rounded-lg"
          />
        </CardContent>
      </Card>

      {/* Decision Path */}
      <Card>
        <CardHeader>
          <CardTitle>Current Decision Path</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            {decisionPath.map((step, index) => (
              <div key={index} className="flex items-center">
                <Badge
                  variant={step.activation > 0.7 ? "default" : "secondary"}
                  className="px-3 py-1"
                >
                  {step.neuron}
                  <span className="ml-2 text-xs">
                    ({(step.activation * 100).toFixed(0)}%)
                  </span>
                </Badge>
                {index < decisionPath.length - 1 && (
                  <span className="mx-2">→</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activation Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Layer Activation Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {networkData?.layers.map((layer, layerIndex) => (
              <div key={layerIndex}>
                <p className="text-sm font-medium mb-2 capitalize">
                  {layer.type} Layer
                </p>
                <div className="grid grid-cols-10 gap-1">
                  {layer.neurons.map((neuron) => (
                    <div
                      key={neuron.id}
                      className="h-8 rounded"
                      style={{
                        backgroundColor: `rgba(139, 92, 246, ${neuron.activation})`,
                        border: activeNeurons.includes(neuron.id) ? '2px solid #F59E0B' : 'none'
                      }}
                      title={`${neuron.id}: ${(neuron.activation * 100).toFixed(0)}%`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Thought Process */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Thought Process</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {thoughts.map((thought, index) => (
              <div
                key={index}
                className="p-3 bg-blue-50 rounded-lg animate-fade-in"
              >
                <p className="text-sm">{thought.text}</p>
              </div>
            ))}
            {thoughts.length === 0 && (
              <p className="text-sm text-gray-500">Processing...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}