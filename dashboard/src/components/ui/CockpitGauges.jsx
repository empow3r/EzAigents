'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';

// F1/Fighter Jet Style Radial Gauge
export const CockpitGauge = ({ 
  value, 
  max, 
  min = 0,
  label, 
  unit = '',
  color = '#00D4FF', 
  size = 160, 
  thickness = 12,
  showTicks = true,
  critical = false,
  warning = false,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const percentage = ((value - min) / (max - min)) * 100;
  const radius = (size / 2) - (thickness / 2) - 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference * 0.8; // 288 degrees (80% of circle)
  const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;
  
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Determine gauge color based on status
  const getGaugeColor = () => {
    if (critical) return '#FF4444';
    if (warning) return '#FFB800';
    return color;
  };
  
  const gaugeColor = getGaugeColor();
  
  // Generate tick marks
  const generateTicks = () => {
    const ticks = [];
    const tickCount = 9;
    const startAngle = -144; // Start angle in degrees (80% of 360 = 288, centered)
    const endAngle = 144;
    const angleStep = (endAngle - startAngle) / (tickCount - 1);
    
    for (let i = 0; i < tickCount; i++) {
      const angle = (startAngle + i * angleStep) * (Math.PI / 180);
      const tickRadius = radius + thickness / 2;
      const tickEndRadius = tickRadius + (i % 2 === 0 ? 8 : 4);
      
      const x1 = centerX + tickRadius * Math.cos(angle);
      const y1 = centerY + tickRadius * Math.sin(angle);
      const x2 = centerX + tickEndRadius * Math.cos(angle);
      const y2 = centerY + tickEndRadius * Math.sin(angle);
      
      ticks.push(
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={i % 2 === 0 ? 2 : 1}
        />
      );
      
      // Add value labels for major ticks
      if (i % 2 === 0) {
        const labelValue = min + ((max - min) / (tickCount - 1)) * i;
        const labelRadius = tickEndRadius + 12;
        const labelX = centerX + labelRadius * Math.cos(angle);
        const labelY = centerY + labelRadius * Math.sin(angle);
        
        ticks.push(
          <text
            key={`label-${i}`}
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-gray-400 font-mono"
          >
            {Math.round(labelValue)}
          </text>
        );
      }
    }
    
    return ticks;
  };

  return (
    <motion.div 
      className="relative flex items-center justify-center cursor-pointer"
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      style={{ width: size + 40, height: size + 40 }}
    >
      <svg width={size + 40} height={size + 40} className="overflow-visible">
        {/* Outer ring */}
        <circle
          cx={centerX + 20}
          cy={centerY + 20}
          r={radius + thickness + 2}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
          fill="none"
        />
        
        {/* Background arc */}
        <path
          d={`M ${centerX + 20 - radius * Math.cos(144 * Math.PI / 180)} ${centerY + 20 - radius * Math.sin(144 * Math.PI / 180)} A ${radius} ${radius} 0 1 1 ${centerX + 20 + radius * Math.cos(144 * Math.PI / 180)} ${centerY + 20 - radius * Math.sin(144 * Math.PI / 180)}`}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Progress arc */}
        <motion.path
          d={`M ${centerX + 20 - radius * Math.cos(144 * Math.PI / 180)} ${centerY + 20 - radius * Math.sin(144 * Math.PI / 180)} A ${radius} ${radius} 0 1 1 ${centerX + 20 + radius * Math.cos(144 * Math.PI / 180)} ${centerY + 20 - radius * Math.sin(144 * Math.PI / 180)}`}
          stroke={gaugeColor}
          strokeWidth={thickness}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: strokeDasharray }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 2, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 ${isHovered ? 12 : 6}px ${gaugeColor})`,
          }}
        />
        
        {/* Tick marks */}
        {showTicks && (
          <g transform={`translate(20, 20)`}>
            {generateTicks()}
          </g>
        )}
        
        {/* Center decoration */}
        <circle
          cx={centerX + 20}
          cy={centerY + 20}
          r="4"
          fill={gaugeColor}
          className="drop-shadow-lg"
        />
      </svg>
      
      {/* Center display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className={`text-3xl font-bold font-mono ${
            critical ? 'text-red-400' : warning ? 'text-yellow-400' : 'text-white'
          }`}>
            {typeof value === 'number' ? value.toFixed(1) : value}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wider font-sans">
            {unit && <span className="text-gray-500">{unit}</span>}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider font-sans mt-1">
            {label}
          </div>
        </motion.div>
      </div>
      
      {/* Status indicators */}
      {(critical || warning) && (
        <motion.div
          className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
            critical ? 'bg-red-500' : 'bg-yellow-500'
          }`}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
      )}
      
      {/* Hover overlay */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full border border-cyan-500/20"
        />
      )}
    </motion.div>
  );
};

// Multi-layer gauge for complex metrics
export const StratifiedGauge = ({ 
  layers,
  size = 200,
  label,
  onClick
}) => {
  const [selectedLayer, setSelectedLayer] = useState(null);
  
  return (
    <motion.div 
      className="relative flex items-center justify-center cursor-pointer"
      onClick={onClick}
      style={{ width: size + 60, height: size + 60 }}
    >
      {layers.map((layer, index) => {
        const radius = (size / 2) - (index * 20) - 15;
        const thickness = 8;
        const percentage = (layer.value / layer.max) * 100;
        const circumference = 2 * Math.PI * radius;
        const strokeDasharray = circumference * 0.75; // 270 degrees
        const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;
        
        return (
          <svg
            key={index}
            width={size + 60}
            height={size + 60}
            className="absolute overflow-visible"
          >
            {/* Background ring */}
            <circle
              cx={(size + 60) / 2}
              cy={(size + 60) / 2}
              r={radius}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={thickness}
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDasharray * 0.125} // Start at top
              transform={`rotate(-135 ${(size + 60) / 2} ${(size + 60) / 2})`}
            />
            
            {/* Progress ring */}
            <motion.circle
              cx={(size + 60) / 2}
              cy={(size + 60) / 2}
              r={radius}
              stroke={layer.color}
              strokeWidth={thickness}
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-135 ${(size + 60) / 2} ${(size + 60) / 2})`}
              initial={{ strokeDashoffset: strokeDasharray }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 2, delay: index * 0.2, ease: "easeOut" }}
              style={{
                filter: `drop-shadow(0 0 8px ${layer.color})`,
              }}
              onHoverStart={() => setSelectedLayer(index)}
              onHoverEnd={() => setSelectedLayer(null)}
            />
          </svg>
        );
      })}
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="text-2xl font-bold text-white mb-1">
            {selectedLayer !== null ? layers[selectedLayer].value : layers[0].value}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">
            {selectedLayer !== null ? layers[selectedLayer].label : label}
          </div>
        </motion.div>
      </div>
      
      {/* Layer legend */}
      <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2">
        {layers.map((layer, index) => (
          <div
            key={index}
            className="flex items-center gap-1 text-xs"
            style={{ color: selectedLayer === index ? layer.color : '#6B7280' }}
          >
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: layer.color }}
            />
            <span>{layer.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Mini gauge for compact displays
export const MiniGauge = ({ 
  value, 
  max, 
  label, 
  color = '#00D4FF', 
  size = 80 
}) => {
  const percentage = (value / max) * 100;
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference * 0.75;
  const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDasharray * 0.125}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="4"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: strokeDasharray }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-lg font-bold text-white">{value}</div>
        <div className="text-xs text-gray-400 uppercase">{label}</div>
      </div>
    </div>
  );
};