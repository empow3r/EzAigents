'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export const FluidBarChart = ({ data, height = 200, color = '#00D4FF' }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext('2d');
    const { width } = canvas.getBoundingClientRect();
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    let animationProgress = 0;
    const targetValues = data.map(d => d.value);
    const currentValues = new Array(data.length).fill(0);
    const maxValue = Math.max(...targetValues);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Update current values with smooth animation
      currentValues.forEach((current, index) => {
        const target = targetValues[index];
        currentValues[index] += (target - current) * 0.05;
      });

      // Draw bars with fluid effect
      const barWidth = width / data.length * 0.8;
      const barSpacing = width / data.length * 0.2;

      currentValues.forEach((value, index) => {
        const barHeight = (value / maxValue) * (height - 40);
        const x = index * (barWidth + barSpacing) + barSpacing / 2;
        const y = height - barHeight - 20;

        // Create gradient
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color + '40');

        // Draw bar with rounded corners
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 8);
        ctx.fill();

        // Add glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw label
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(data[index].label, x + barWidth / 2, height - 5);
      });

      animationProgress += 0.02;
      if (animationProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [data, height, color]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height }}
    />
  );
};

export const RadialProgressChart = ({ 
  data, 
  size = 200, 
  strokeWidth = 20,
  colors = ['#00D4FF', '#10B981', '#8B5CF6', '#F59E0B']
}) => {
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress segments */}
        {data.map((item, index) => {
          const offset = data.slice(0, index).reduce((sum, d) => sum + d.percentage, 0);
          const segmentLength = (item.percentage / 100) * circumference;
          const segmentOffset = circumference - (offset / 100) * circumference;
          
          return (
            <motion.circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              stroke={colors[index % colors.length]}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${segmentLength} ${circumference}`}
              strokeDashoffset={segmentOffset}
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${segmentLength} ${circumference}` }}
              transition={{ duration: 1.5, delay: index * 0.2, ease: "easeOut" }}
              style={{
                filter: `drop-shadow(0 0 8px ${colors[index % colors.length]})`
              }}
            />
          );
        })}
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-2xl font-bold text-white">
          {data.reduce((sum, d) => sum + d.value, 0)}
        </div>
        <div className="text-sm text-gray-400">Total</div>
      </div>
      
      {/* Legend */}
      <div className="absolute -bottom-16 left-0 right-0">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export const WaveformVisualizer = ({ 
  data = [], 
  height = 150, 
  color = '#00D4FF',
  animated = true 
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width } = canvas.getBoundingClientRect();
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Generate waveform based on data
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      
      const points = 100;
      const amplitude = height * 0.4;
      const centerY = height / 2;
      
      for (let i = 0; i <= points; i++) {
        const x = (i / points) * width;
        let y = centerY;
        
        // Add multiple sine waves for complexity
        y += Math.sin((i / points) * Math.PI * 4 + phaseRef.current) * amplitude * 0.5;
        y += Math.sin((i / points) * Math.PI * 8 + phaseRef.current * 1.5) * amplitude * 0.3;
        y += Math.sin((i / points) * Math.PI * 16 + phaseRef.current * 2) * amplitude * 0.2;
        
        // Add data influence
        if (data.length > 0) {
          const dataIndex = Math.floor((i / points) * data.length);
          const dataValue = data[dataIndex] || 0;
          y += (dataValue - 50) * 2; // Assuming data is normalized 0-100
        }
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Add glow effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      if (animated) {
        phaseRef.current += 0.05;
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [data, height, color, animated]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height }}
    />
  );
};

export const HeatmapGrid = ({ 
  data, 
  rows = 8, 
  cols = 12,
  colorScale = ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE']
}) => {
  const getColorFromValue = (value) => {
    const normalized = Math.max(0, Math.min(1, value / 100));
    const index = Math.floor(normalized * (colorScale.length - 1));
    return colorScale[index];
  };

  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: rows * cols }, (_, index) => {
        const value = data[index] || Math.random() * 100;
        const color = getColorFromValue(value);
        
        return (
          <motion.div
            key={index}
            className="aspect-square rounded-sm"
            style={{ backgroundColor: color }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.01, duration: 0.3 }}
            whileHover={{ 
              scale: 1.2, 
              zIndex: 10,
              boxShadow: `0 0 20px ${color}`
            }}
            title={`Value: ${value.toFixed(1)}`}
          />
        );
      })}
    </div>
  );
};

export const NetworkGraph = ({ 
  nodes = [],
  connections = [],
  size = 300 
}) => {
  const svgRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  const nodePositions = nodes.map((_, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI;
    const radius = size * 0.35;
    return {
      x: size / 2 + Math.cos(angle) * radius,
      y: size / 2 + Math.sin(angle) * radius
    };
  });

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className="absolute inset-0"
      >
        {/* Connections */}
        {connections.map((connection, index) => {
          const fromPos = nodePositions[connection.from];
          const toPos = nodePositions[connection.to];
          
          return (
            <motion.line
              key={index}
              x1={fromPos.x}
              y1={fromPos.y}
              x2={toPos.x}
              y2={toPos.y}
              stroke="rgba(6, 182, 212, 0.3)"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            />
          );
        })}
        
        {/* Nodes */}
        {nodes.map((node, index) => {
          const pos = nodePositions[index];
          const isHovered = hoveredNode === index;
          
          return (
            <g key={index}>
              <motion.circle
                cx={pos.x}
                cy={pos.y}
                r={isHovered ? 12 : 8}
                fill={node.color || '#00D4FF'}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                onMouseEnter={() => setHoveredNode(index)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{
                  filter: isHovered ? `drop-shadow(0 0 15px ${node.color || '#00D4FF'})` : 'none',
                  cursor: 'pointer'
                }}
              />
              
              {/* Node label */}
              <text
                x={pos.x}
                y={pos.y - 20}
                textAnchor="middle"
                fill="white"
                fontSize="12"
                fontWeight="500"
                className={`transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
      
      {/* Pulsing center */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-400 rounded-full"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
};

export const MultiLayerVisualization = ({ layers, activeLayer, onLayerChange }) => {
  return (
    <div className="relative w-full h-96 bg-gray-900/50 rounded-2xl overflow-hidden">
      {/* Layer tabs */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
        {layers.map((layer, index) => (
          <button
            key={index}
            onClick={() => onLayerChange(index)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeLayer === index
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800/80 text-gray-400 hover:text-white'
            }`}
          >
            {layer.name}
          </button>
        ))}
      </div>

      {/* Layer content */}
      <AnimatePresence mode="wait">
        {layers.map((layer, index) => (
          index === activeLayer && (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 p-8"
            >
              {layer.component}
            </motion.div>
          )
        ))}
      </AnimatePresence>

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, #00D4FF 2px, transparent 2px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>
    </div>
  );
};