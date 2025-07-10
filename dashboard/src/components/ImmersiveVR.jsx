'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, useTransform, useMotionValue } from 'framer-motion';
import { 
  Headphones as VrHeadset,
  Maximize,
  Minimize,
  RotateCw,
  Eye,
  Layers,
  Settings,
  Zap
} from 'lucide-react';

export const VRReadyMetricCard = ({ 
  title, 
  value, 
  trend, 
  color = '#00D4FF',
  depth = 10,
  glowIntensity = 0.5 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useTransform(mouseY, [-300, 300], [15, -15]);
  const rotateY = useTransform(mouseX, [-300, 300], [-15, 15]);
  const translateZ = useTransform(mouseX, [-300, 300], [0, depth]);

  const handleMouseMove = (event) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(event.clientX - centerX);
    mouseY.set(event.clientY - centerY);
  };

  return (
    <motion.div
      ref={cardRef}
      className="relative perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        mouseX.set(0);
        mouseY.set(0);
      }}
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      <motion.div
        className="relative bg-gray-800/30 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-6 overflow-hidden"
        style={{
          rotateX,
          rotateY,
          translateZ,
          transformStyle: 'preserve-3d',
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Holographic layers */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 border border-gray-500/20 rounded-2xl"
              style={{
                translateZ: i * 2,
                opacity: isHovered ? 0.3 - i * 0.05 : 0,
              }}
              animate={{
                translateZ: isHovered ? i * 5 : i * 2,
                opacity: isHovered ? 0.3 - i * 0.05 : 0,
              }}
              transition={{ delay: i * 0.05 }}
            />
          ))}
        </div>

        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(circle at center, ${color}${Math.round(glowIntensity * 255).toString(16)} 0%, transparent 70%)`,
            filter: `blur(${isHovered ? 20 : 10}px)`,
            opacity: isHovered ? 0.6 : 0.3,
          }}
          animate={{
            scale: isHovered ? 1.1 : 1,
          }}
        />

        {/* Content */}
        <motion.div
          className="relative z-10"
          style={{
            translateZ: isHovered ? 20 : 0,
          }}
        >
          <h3 className="text-gray-400 text-sm font-medium mb-2">{title}</h3>
          <div className="text-2xl font-bold text-white mb-1">{value}</div>
          {trend && (
            <div className={`text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </motion.div>

        {/* Floating particles */}
        {isHovered && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{
                  backgroundColor: color,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [-20, -100],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export const DepthLayeredDashboard = ({ children, layers = 3 }) => {
  const [currentLayer, setCurrentLayer] = useState(0);
  const containerRef = useRef(null);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full"
      style={{ 
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
    >
      {/* Layer controls */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => setCurrentLayer(Math.max(0, currentLayer - 1))}
          className="p-2 bg-gray-800/80 backdrop-blur-lg border border-gray-600/50 rounded-lg text-gray-300 hover:text-white transition-all"
          disabled={currentLayer === 0}
        >
          <Minimize className="w-4 h-4" />
        </button>
        <span className="px-3 py-2 bg-gray-800/80 backdrop-blur-lg border border-gray-600/50 rounded-lg text-sm text-gray-300">
          Layer {currentLayer + 1}/{layers}
        </span>
        <button
          onClick={() => setCurrentLayer(Math.min(layers - 1, currentLayer + 1))}
          className="p-2 bg-gray-800/80 backdrop-blur-lg border border-gray-600/50 rounded-lg text-gray-300 hover:text-white transition-all"
          disabled={currentLayer === layers - 1}
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* Layered content */}
      {[...Array(layers)].map((_, layerIndex) => (
        <motion.div
          key={layerIndex}
          className="absolute inset-0"
          style={{
            translateZ: layerIndex * -100,
            opacity: layerIndex <= currentLayer ? 1 : 0.3,
          }}
          animate={{
            translateZ: layerIndex <= currentLayer ? layerIndex * -20 : layerIndex * -100,
            opacity: layerIndex <= currentLayer ? 1 : 0.3,
            scale: layerIndex <= currentLayer ? 1 : 0.8,
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {layerIndex === 0 && children}
          {layerIndex === 1 && (
            <div className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <VRReadyMetricCard 
                  title="Revenue" 
                  value="$2.4M" 
                  trend={23.7} 
                  color="#10B981"
                />
                <VRReadyMetricCard 
                  title="Agents" 
                  value="47" 
                  trend={12} 
                  color="#3B82F6"
                />
                <VRReadyMetricCard 
                  title="Efficiency" 
                  value="94.2%" 
                  trend={5.3} 
                  color="#8B5CF6"
                />
                <VRReadyMetricCard 
                  title="Success Rate" 
                  value="97.8%" 
                  trend={1.2} 
                  color="#F59E0B"
                />
              </div>
            </div>
          )}
          {layerIndex === 2 && (
            <div className="p-8 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Deep Analytics Layer</p>
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export const AR_OverlayInterface = ({ isVisible, onToggle }) => {
  const [trackingActive, setTrackingActive] = useState(false);
  const [confidence, setConfidence] = useState(0);

  // Simulate AR tracking
  useEffect(() => {
    if (isVisible && trackingActive) {
      const interval = setInterval(() => {
        setConfidence(prev => Math.min(100, prev + Math.random() * 10));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isVisible, trackingActive]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 pointer-events-none z-40"
    >
      {/* AR Corner markers */}
      {[
        { top: '10%', left: '10%', rotate: 0 },
        { top: '10%', right: '10%', rotate: 90 },
        { bottom: '10%', right: '10%', rotate: 180 },
        { bottom: '10%', left: '10%', rotate: 270 }
      ].map((position, index) => (
        <motion.div
          key={index}
          className="absolute w-8 h-8 border-l-2 border-t-2 border-cyan-400"
          style={{
            ...position,
            transform: `rotate(${position.rotate}deg)`,
            filter: 'drop-shadow(0 0 10px #00D4FF)',
          }}
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: index * 0.2,
          }}
        />
      ))}

      {/* AR Status Panel */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        <motion.div
          className="bg-gray-900/90 backdrop-blur-lg border border-cyan-500/30 rounded-xl p-4"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-3 h-3 rounded-full ${trackingActive ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-white font-semibold">AR Tracking</span>
            <button
              onClick={() => setTrackingActive(!trackingActive)}
              className="ml-auto p-1 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Confidence</span>
              <span className="text-cyan-400">{confidence.toFixed(1)}%</span>
            </div>
            <div className="w-32 h-1 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-green-400"
                animate={{ width: `${confidence}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* AR Controls */}
      <div className="absolute bottom-4 right-4 pointer-events-auto">
        <div className="flex gap-2">
          <button
            onClick={onToggle}
            className="p-3 bg-gray-900/90 backdrop-blur-lg border border-gray-600/50 rounded-full text-gray-300 hover:text-white transition-all"
          >
            <VrHeadset className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTrackingActive(!trackingActive)}
            className={`p-3 backdrop-blur-lg border rounded-full transition-all ${
              trackingActive 
                ? 'bg-green-600/90 border-green-500/50 text-white' 
                : 'bg-gray-900/90 border-gray-600/50 text-gray-300 hover:text-white'
            }`}
          >
            <Zap className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Floating data points */}
      {trackingActive && (
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 2) * 20}%`,
              }}
              animate={{
                y: [-10, 10, -10],
                rotate: [0, 360],
              }}
              transition={{
                duration: 4 + i,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="bg-cyan-400/20 backdrop-blur-lg border border-cyan-400/30 rounded-lg p-2 text-xs text-cyan-400">
                <div>Agent #{i + 1}</div>
                <div className="font-bold">{(94 + Math.random() * 6).toFixed(1)}%</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export const ImmersiveControlPanel = ({ isActive, onToggle }) => {
  const [mode, setMode] = useState('standard'); // standard, immersive, vr
  
  return (
    <motion.div
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 ${
        isActive ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      animate={{
        y: isActive ? 0 : 100,
        opacity: isActive ? 1 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="bg-gray-900/95 backdrop-blur-lg border border-gray-600/50 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          {/* Mode Selector */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            {[
              { id: 'standard', label: '2D', icon: Settings },
              { id: 'immersive', label: '3D', icon: Layers },
              { id: 'vr', label: 'VR', icon: VrHeadset }
            ].map((modeOption) => (
              <button
                key={modeOption.id}
                onClick={() => setMode(modeOption.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === modeOption.id
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <modeOption.icon className="w-4 h-4" />
                {modeOption.label}
              </button>
            ))}
          </div>

          {/* Intensity Controls */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Intensity</span>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="70"
              className="w-20 accent-cyan-500"
            />
          </div>

          {/* Close Button */}
          <button
            onClick={onToggle}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Minimize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};