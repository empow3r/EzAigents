import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpatialNavigationSystem from './SpatialNavigationSystem';
import FuturisticUIOverlay from './FuturisticUIOverlay';
import QuantumParticleField from './QuantumParticleField';
import HolographicAIAssistant from './HolographicAIAssistant';
import GestureControls from './GestureControls';
import DNADataVisualization from './DNADataVisualization';
import CyberpunkTerminal from './CyberpunkTerminal';
import MatrixRainEffect from './MatrixRainEffect';
import Agent3DGlobe from './Agent3DGlobe';
import EnhancedAgent3DGlobe from './EnhancedAgent3DGlobe';
import Simple3DGlobe from './Simple3DGlobe';
import { useScrollEffects } from '../hooks/useScrollEffects';
import { 
  Cpu, 
  Globe, 
  Layers,
  Network,
  Shield,
  Zap,
  Brain,
  Code,
  Database,
  Activity,
  Dna,
  Terminal,
  Mic,
  Hand,
  Grid3X3
} from 'lucide-react';

// Holographic Menu Item
const HolographicMenuItem = ({ icon: Icon, label, isActive, onClick, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ delay, duration: 0.5, type: "spring" }}
      whileHover={{ scale: 1.1, rotateY: 10 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative cursor-pointer group"
    >
      <div className={`
        p-6 rounded-2xl backdrop-blur-xl transition-all duration-300
        ${isActive 
          ? 'bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border-2 border-cyan-400' 
          : 'bg-white/5 border border-white/10 hover:border-cyan-400/50'
        }
      `}>
        <Icon className={`w-8 h-8 mb-2 ${isActive ? 'text-cyan-400' : 'text-white/70'}`} />
        <span className={`text-sm font-medium ${isActive ? 'text-cyan-400' : 'text-white/70'}`}>
          {label}
        </span>
        
        {/* Holographic effect */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <motion.div
            className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            initial={{ top: '100%' }}
            animate={{ top: '-100%' }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>
    </motion.div>
  );
};

// Futuristic Panel Component
const FuturisticPanel = ({ children, title, icon: Icon, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${className}`}
    >
      {/* Corner decorations */}
      <div className="absolute -top-2 -left-2 w-6 h-6 border-l-2 border-t-2 border-cyan-400" />
      <div className="absolute -top-2 -right-2 w-6 h-6 border-r-2 border-t-2 border-cyan-400" />
      <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-2 border-b-2 border-cyan-400" />
      <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-2 border-b-2 border-cyan-400" />
      
      <div className="backdrop-blur-xl bg-black/30 border border-cyan-400/30 rounded-lg p-6 h-full">
        {title && (
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-cyan-400/20">
            {Icon && <Icon className="w-5 h-5 text-cyan-400" />}
            <h3 className="text-lg font-semibold text-cyan-400">{title}</h3>
          </div>
        )}
        {children}
      </div>
    </motion.div>
  );
};

// 3D Stats Visualization
const Stats3DVisualization = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(stats).map(([key, value], idx) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.1 }}
          className="relative"
        >
          <div className="aspect-square rounded-lg bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-4 border border-cyan-400/30">
            <div className="h-full flex flex-col justify-between">
              <span className="text-xs text-cyan-300/70 uppercase">{key}</span>
              <div className="text-2xl font-bold text-cyan-400">{value}</div>
              <div className="h-1 bg-cyan-400/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 to-purple-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, parseInt(value))}%` }}
                  transition={{ delay: idx * 0.1 + 0.5, duration: 1 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Main Ultra Futuristic Dashboard
const UltraFuturisticDashboard = ({ darkMode = true }) => {
  const [activeView, setActiveView] = useState('globe');
  const [showSpatialNav, setShowSpatialNav] = useState(false);
  const [gesturesEnabled, setGesturesEnabled] = useState(true);
  const [matrixMode, setMatrixMode] = useState(false);
  const containerRef = useRef(null);
  
  const { scrollY, scrollDirection } = useScrollEffects();

  const menuItems = [
    { id: 'globe', label: '3D Globe', icon: Globe },
    { id: 'agents', label: 'AI Agents', icon: Brain },
    { id: 'assistant', label: 'AI Assistant', icon: Mic },
    { id: 'dna', label: 'DNA Visual', icon: Dna },
    { id: 'terminal', label: 'Terminal', icon: Terminal },
    { id: 'analytics', label: 'Analytics', icon: Activity },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'code', label: 'Code Lab', icon: Code }
  ];

  const systemStats = {
    'CPU Usage': '67%',
    'Memory': '4.2GB',
    'Agents': '12',
    'Tasks': '247',
    'Network': '1.2TB',
    'Uptime': '99.9%'
  };

  const handleAction = (action) => {
    console.log('Action triggered:', action);
    // Implement action handlers
  };

  const handleGesture = (gesture) => {
    console.log('Gesture detected:', gesture);
    
    // Handle gestures
    if (gesture.type === 'swipe') {
      const direction = gesture.data.direction;
      const currentIndex = menuItems.findIndex(item => item.id === activeView);
      
      if (direction === 'left' && currentIndex < menuItems.length - 1) {
        setActiveView(menuItems[currentIndex + 1].id);
      } else if (direction === 'right' && currentIndex > 0) {
        setActiveView(menuItems[currentIndex - 1].id);
      }
    } else if (gesture.type === 'pinch-in') {
      setShowSpatialNav(true);
    } else if (gesture.type === 'pinch-out') {
      setShowSpatialNav(false);
    }
  };

  // Get view component based on active view
  const getViewComponent = () => {
    switch (activeView) {
      case 'globe':
        return <Simple3DGlobe onAgentClick={(agent) => console.log('Agent selected:', agent)} />;
      case 'assistant':
        return <HolographicAIAssistant onCommand={handleAction} />;
      case 'dna':
        return <DNADataVisualization data={systemStats} darkMode={darkMode} />;
      case 'terminal':
        return <CyberpunkTerminal onCommand={handleAction} />;
      default:
        return (
          <div className="h-[600px] flex items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                {React.createElement(menuItems.find(m => m.id === activeView)?.icon || Globe, {
                  className: "w-16 h-16 text-cyan-400"
                })}
              </div>
              <p className="text-cyan-300/70">
                Advanced {activeView} interface loading...
              </p>
            </motion.div>
          </div>
        );
    }
  };

  return (
    <MatrixRainEffect darkMode={darkMode} intensity={matrixMode ? 'high' : 'low'} showInteractiveElements={matrixMode}>
      <div ref={containerRef} className="min-h-screen bg-black text-white overflow-hidden relative">
        {/* Quantum Particle Background */}
        {!matrixMode && <QuantumParticleField intensity="high" />}
        
        {/* Gesture Controls */}
        <GestureControls enabled={gesturesEnabled} onGesture={handleGesture} />
        
        {/* Futuristic UI Overlay */}
        <FuturisticUIOverlay
          darkMode={darkMode}
          systemStats={{
            cpu: 67,
            memory: 42,
            network: 89,
            agents: 12
          }}
          onAction={handleAction}
        />
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="p-6"
        >
          <div className="flex items-center justify-between">
            <motion.h1 
              className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
            >
              NEURAL COMMAND CENTER
            </motion.h1>
            
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSpatialNav(!showSpatialNav)}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/50 rounded-lg backdrop-blur-sm"
              >
                {showSpatialNav ? '2D View' : '3D Navigation'}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMatrixMode(!matrixMode)}
                className="px-6 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/50 rounded-lg backdrop-blur-sm"
              >
                <Grid3X3 className="w-5 h-5 inline mr-2" />
                Matrix Mode
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setGesturesEnabled(!gesturesEnabled)}
                className={`px-6 py-3 rounded-lg backdrop-blur-sm ${
                  gesturesEnabled 
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/50' 
                    : 'bg-gray-800/50 border border-gray-600/50'
                }`}
              >
                <Hand className="w-5 h-5 inline mr-2" />
                Gestures
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* Navigation Menu */}
        <div className="px-6 mb-8">
          <div className="grid grid-cols-6 gap-4">
            {menuItems.map((item, idx) => (
              <HolographicMenuItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                isActive={activeView === item.id}
                onClick={() => setActiveView(item.id)}
                delay={idx * 0.1}
              />
            ))}
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {showSpatialNav ? (
            <motion.div
              key="spatial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-[800px] px-6"
            >
              <FuturisticPanel title="3D Spatial Navigation" icon={Layers}>
                <SpatialNavigationSystem
                  darkMode={darkMode}
                  onNavigate={(nodeId) => {
                    setActiveView(nodeId);
                    setShowSpatialNav(false);
                  }}
                />
              </FuturisticPanel>
            </motion.div>
          ) : (
            <motion.div
              key={activeView}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="px-6 pb-20"
            >
              <div className="grid grid-cols-12 gap-6">
                {/* Main Content Panel */}
                <div className="col-span-8">
                  <FuturisticPanel title={menuItems.find(m => m.id === activeView)?.label} icon={menuItems.find(m => m.id === activeView)?.icon}>
                    {getViewComponent()}
                  </FuturisticPanel>
                </div>

                {/* Side Panels */}
                <div className="col-span-4 space-y-6">
                  <FuturisticPanel title="System Status" icon={Cpu}>
                    <Stats3DVisualization stats={systemStats} />
                  </FuturisticPanel>
                  
                  <FuturisticPanel title="Neural Activity" icon={Brain}>
                    <div className="space-y-3">
                      {['Alpha', 'Beta', 'Gamma', 'Delta'].map((wave, idx) => (
                        <div key={wave} className="flex items-center justify-between">
                          <span className="text-sm text-cyan-300/70">{wave} Wave</span>
                          <div className="flex-1 mx-4 h-2 bg-cyan-400/20 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-cyan-400 to-purple-400"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.random() * 100}%` }}
                              transition={{ 
                                duration: 2,
                                repeat: Infinity,
                                repeatType: 'reverse',
                                delay: idx * 0.2
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </FuturisticPanel>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </MatrixRainEffect>
  );
};

export default UltraFuturisticDashboard;