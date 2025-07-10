'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import soundService from '../services/soundService';
import {
  Brain,
  Zap,
  Activity,
  Target,
  TrendingUp,
  Waves,
  Sparkles,
  Heart,
  Eye,
  Gauge,
  Layers,
  Cpu
} from 'lucide-react';

/**
 * NEURAL-OPTIMIZED USER FEEDBACK SYSTEM
 * 
 * Advanced biometric simulation and adaptive neural pathway optimization
 * Inspired by neurofeedback systems and cognitive behavioral psychology
 */

// Neural State Tracker
const useNeuralStateTracking = () => {
  const [neuralState, setNeuralState] = useState({
    dopamineLevel: 0.5,
    focusIntensity: 0.3,
    flowState: false,
    cognitiveLoad: 0.4,
    attentionSpan: 100,
    energyLevel: 0.6,
    stressLevel: 0.2,
    engagementScore: 0.5,
    learningRate: 0.3,
    creativityIndex: 0.4
  });

  const [brainwaveActivity, setBrainwaveActivity] = useState({
    alpha: 0.5,    // 8-13 Hz - Relaxed awareness
    beta: 0.4,     // 13-30 Hz - Active concentration
    gamma: 0.3,    // 30-100 Hz - Peak performance
    theta: 0.6,    // 4-8 Hz - Creativity, meditation
    delta: 0.2     // 0.5-4 Hz - Deep sleep, healing
  });

  const [behaviorMetrics, setBehaviorMetrics] = useState({
    clickVelocity: 0,
    dwellTime: 0,
    scrollPatterns: [],
    interactionQuality: 0.5,
    taskSwitching: 0,
    decisionSpeed: 1000,
    errorRate: 0.1,
    persistenceLevel: 0.5
  });

  const updateNeuralState = useCallback((interactionData) => {
    const now = Date.now();
    
    setNeuralState(prev => {
      const newState = { ...prev };
      
      // Calculate dopamine based on reward patterns
      if (interactionData.type === 'success') {
        newState.dopamineLevel = Math.min(1.0, prev.dopamineLevel + 0.15);
        soundService.play('dopamineHit');
      } else if (interactionData.type === 'streak') {
        newState.dopamineLevel = Math.min(1.0, prev.dopamineLevel + 0.25);
        soundService.play('euphoria');
      }
      
      // Focus intensity based on interaction consistency
      const consistencyBonus = interactionData.consistent ? 0.1 : -0.05;
      newState.focusIntensity = Math.max(0, Math.min(1.0, prev.focusIntensity + consistencyBonus));
      
      // Flow state detection
      newState.flowState = newState.focusIntensity > 0.7 && newState.dopamineLevel > 0.6;
      
      // Cognitive load assessment
      if (interactionData.complexity === 'high') {
        newState.cognitiveLoad = Math.min(1.0, prev.cognitiveLoad + 0.1);
      } else {
        newState.cognitiveLoad = Math.max(0, prev.cognitiveLoad - 0.05);
      }
      
      // Energy level modulation
      if (newState.flowState) {
        newState.energyLevel = Math.min(1.0, prev.energyLevel + 0.05);
      } else if (newState.cognitiveLoad > 0.8) {
        newState.energyLevel = Math.max(0.1, prev.energyLevel - 0.1);
      }
      
      // Engagement scoring
      const engagement = (newState.focusIntensity * 0.4) + 
                        (newState.dopamineLevel * 0.3) + 
                        (newState.energyLevel * 0.3);
      newState.engagementScore = engagement;
      
      return newState;
    });

    // Update brainwave patterns based on state
    setBrainwaveActivity(prev => ({
      alpha: Math.max(0.1, Math.min(1.0, prev.alpha + (Math.random() - 0.5) * 0.1)),
      beta: Math.max(0.1, Math.min(1.0, neuralState.focusIntensity * 0.8 + Math.random() * 0.2)),
      gamma: Math.max(0.1, Math.min(1.0, neuralState.flowState ? 0.9 : prev.gamma * 0.95)),
      theta: Math.max(0.1, Math.min(1.0, neuralState.creativityIndex * 0.7 + Math.random() * 0.3)),
      delta: Math.max(0.1, Math.min(1.0, (1 - neuralState.energyLevel) * 0.5))
    }));

  }, [neuralState.creativityIndex, neuralState.flowState, neuralState.focusIntensity]);

  return {
    neuralState,
    brainwaveActivity,
    behaviorMetrics,
    updateNeuralState
  };
};

// Real-time Neural Visualization
const NeuralVisualization = ({ neuralState, brainwaveActivity, darkMode }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const drawBrainwave = (frequency, amplitude, color, yOffset, phase = 0) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      
      for (let x = 0; x < width / 2; x += 2) {
        const y = yOffset + Math.sin((x + phase) * frequency * 0.02) * amplitude * 20;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    let phase = 0;
    const animate = () => {
      ctx.clearRect(0, 0, width / 2, height / 2);
      
      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height / 2);
      gradient.addColorStop(0, darkMode ? 'rgba(17, 24, 39, 0.8)' : 'rgba(249, 250, 251, 0.8)');
      gradient.addColorStop(1, darkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(243, 244, 246, 0.8)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width / 2, height / 2);

      // Draw brainwave patterns
      drawBrainwave(0.5, brainwaveActivity.alpha, '#3B82F6', height / 8, phase); // Alpha - Blue
      drawBrainwave(1.0, brainwaveActivity.beta, '#10B981', height / 4, phase); // Beta - Green
      drawBrainwave(2.0, brainwaveActivity.gamma, '#F59E0B', 3 * height / 8, phase); // Gamma - Yellow
      drawBrainwave(0.3, brainwaveActivity.theta, '#8B5CF6', height / 2, phase); // Theta - Purple
      drawBrainwave(0.1, brainwaveActivity.delta, '#EF4444', 5 * height / 8, phase); // Delta - Red

      // Neural activity particles
      const particleCount = Math.floor(neuralState.engagementScore * 20);
      for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * width / 2;
        const y = Math.random() * height / 2;
        const opacity = neuralState.focusIntensity;
        
        ctx.beginPath();
        ctx.fillStyle = `rgba(59, 130, 246, ${opacity})`;
        ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      phase += 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [neuralState, brainwaveActivity, darkMode]);

  return (
    <div className="relative w-full h-32 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="absolute top-2 left-2 text-xs font-mono">
        <div className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          α: {(brainwaveActivity.alpha * 100).toFixed(0)}%
        </div>
        <div className={`${darkMode ? 'text-green-400' : 'text-green-600'}`}>
          β: {(brainwaveActivity.beta * 100).toFixed(0)}%
        </div>
        <div className={`${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
          γ: {(brainwaveActivity.gamma * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
};

// Adaptive Coaching System
const AdaptiveCoach = ({ neuralState, darkMode }) => {
  const [currentCoaching, setCurrentCoaching] = useState(null);
  const [coachingHistory, setCoachingHistory] = useState([]);

  useEffect(() => {
    const generateCoaching = () => {
      let coaching = null;

      if (neuralState.cognitiveLoad > 0.8) {
        coaching = {
          type: 'stress_relief',
          message: 'High cognitive load detected. Consider taking a short break.',
          action: 'Take 3 deep breaths and return refreshed',
          icon: Heart,
          color: 'red',
          soundEffect: 'alphaWaves'
        };
      } else if (neuralState.focusIntensity < 0.3 && neuralState.energyLevel > 0.5) {
        coaching = {
          type: 'focus_enhancement',
          message: 'Your focus could be improved. Try the Pomodoro technique.',
          action: 'Set a 25-minute focused work timer',
          icon: Target,
          color: 'blue',
          soundEffect: 'focusBoost'
        };
      } else if (neuralState.flowState) {
        coaching = {
          type: 'flow_reinforcement',
          message: 'Excellent! You\'re in a flow state. Keep the momentum!',
          action: 'Continue your current task for maximum productivity',
          icon: Waves,
          color: 'green',
          soundEffect: 'euphoria'
        };
      } else if (neuralState.dopamineLevel < 0.3) {
        coaching = {
          type: 'motivation_boost',
          message: 'Low motivation detected. Let\'s re-energize!',
          action: 'Complete a small, achievable task first',
          icon: Sparkles,
          color: 'yellow',
          soundEffect: 'energyWave'
        };
      }

      if (coaching && coaching.type !== currentCoaching?.type) {
        setCurrentCoaching(coaching);
        soundService.play(coaching.soundEffect);
        
        setCoachingHistory(prev => [...prev.slice(-4), {
          ...coaching,
          timestamp: Date.now()
        }]);
      }
    };

    const interval = setInterval(generateCoaching, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [neuralState, currentCoaching]);

  if (!currentCoaching) return null;

  const Icon = currentCoaching.icon;
  const colorClasses = {
    red: darkMode ? 'from-red-900/50 to-red-800/50 border-red-700' : 'from-red-50 to-red-100 border-red-200',
    blue: darkMode ? 'from-blue-900/50 to-blue-800/50 border-blue-700' : 'from-blue-50 to-blue-100 border-blue-200',
    green: darkMode ? 'from-green-900/50 to-green-800/50 border-green-700' : 'from-green-50 to-green-100 border-green-200',
    yellow: darkMode ? 'from-yellow-900/50 to-yellow-800/50 border-yellow-700' : 'from-yellow-50 to-yellow-100 border-yellow-200'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      className={`fixed bottom-20 right-6 max-w-sm p-4 rounded-xl border backdrop-blur-sm z-40 bg-gradient-to-br ${colorClasses[currentCoaching.color]}`}
    >
      <div className="flex items-start space-x-3">
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`p-2 rounded-lg ${
            darkMode ? 'bg-white/10' : 'bg-black/10'
          }`}
        >
          <Icon size={20} className={`text-${currentCoaching.color}-500`} />
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold text-sm mb-1 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            AI Coach
          </h4>
          <p className={`text-sm mb-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {currentCoaching.message}
          </p>
          <button
            onClick={() => {
              soundService.play('perfectClick');
              setCurrentCoaching(null);
            }}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              darkMode 
                ? 'bg-white/20 text-white hover:bg-white/30' 
                : 'bg-black/20 text-black hover:bg-black/30'
            }`}
          >
            {currentCoaching.action}
          </button>
        </div>
        
        <button
          onClick={() => setCurrentCoaching(null)}
          className={`text-xs opacity-60 hover:opacity-100 transition-opacity ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
};

// Neural Performance Dashboard
const NeuralDashboard = ({ neuralState, brainwaveActivity, darkMode }) => {
  const metrics = [
    { 
      label: 'Focus', 
      value: neuralState.focusIntensity, 
      icon: Target, 
      color: 'blue',
      description: 'Current attention intensity'
    },
    { 
      label: 'Flow', 
      value: neuralState.flowState ? 1 : neuralState.engagementScore, 
      icon: Waves, 
      color: 'green',
      description: 'Flow state indicator'
    },
    { 
      label: 'Energy', 
      value: neuralState.energyLevel, 
      icon: Zap, 
      color: 'yellow',
      description: 'Mental energy reserves'
    },
    { 
      label: 'Load', 
      value: neuralState.cognitiveLoad, 
      icon: Cpu, 
      color: 'red',
      description: 'Cognitive processing load'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const percentage = Math.round(metric.value * 100);
        
        return (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-3 rounded-lg border backdrop-blur-sm ${
              darkMode 
                ? 'bg-gray-800/50 border-gray-700' 
                : 'bg-white/50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon size={16} className={`text-${metric.color}-500`} />
              <span className={`text-lg font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {percentage}%
              </span>
            </div>
            
            <div className={`text-xs font-medium mb-1 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {metric.label}
            </div>
            
            <div className={`w-full h-1 rounded-full overflow-hidden ${
              darkMode ? 'bg-gray-700' : 'bg-gray-200'
            }`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`h-full bg-${metric.color}-500`}
              />
            </div>
            
            <div className={`text-xs mt-1 opacity-60 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {metric.description}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// Main Neural Feedback System Component
export default function NeuralFeedbackSystem({ darkMode, children }) {
  const { neuralState, brainwaveActivity, behaviorMetrics, updateNeuralState } = useNeuralStateTracking();
  const [isVisible, setIsVisible] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());

  // Track user interactions
  useEffect(() => {
    const trackInteraction = (event) => {
      const now = Date.now();
      const timeSinceLastInteraction = now - lastInteraction;
      
      updateNeuralState({
        type: event.type === 'click' ? 'click' : 'interaction',
        consistent: timeSinceLastInteraction < 2000,
        complexity: event.ctrlKey || event.metaKey ? 'high' : 'low',
        timestamp: now
      });
      
      setLastInteraction(now);
    };

    document.addEventListener('click', trackInteraction);
    document.addEventListener('keydown', trackInteraction);
    document.addEventListener('scroll', trackInteraction);

    return () => {
      document.removeEventListener('click', trackInteraction);
      document.removeEventListener('keydown', trackInteraction);
      document.removeEventListener('scroll', trackInteraction);
    };
  }, [lastInteraction, updateNeuralState]);

  // Auto-show/hide based on activity
  useEffect(() => {
    const activityTimer = setTimeout(() => {
      setIsVisible(true);
    }, 5000); // Show after 5 seconds of activity

    return () => clearTimeout(activityTimer);
  }, [lastInteraction]);

  // Success detection and rewards
  useEffect(() => {
    if (neuralState.flowState) {
      updateNeuralState({ type: 'streak', timestamp: Date.now() });
    }
  }, [neuralState.flowState, updateNeuralState]);

  return (
    <div className="relative">
      {/* Neural Dashboard Toggle */}
      <motion.button
        onClick={() => setIsVisible(!isVisible)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed top-20 right-6 p-3 rounded-full shadow-lg backdrop-blur-sm z-50 ${
          darkMode 
            ? 'bg-gray-800/80 text-white border border-gray-700' 
            : 'bg-white/80 text-gray-900 border border-gray-200'
        }`}
      >
        <Brain size={20} />
      </motion.button>

      {/* Neural Dashboard Panel */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className={`fixed top-32 right-6 w-80 p-4 rounded-xl shadow-xl backdrop-blur-sm z-40 ${
              darkMode 
                ? 'bg-gray-900/90 border border-gray-700' 
                : 'bg-white/90 border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Neural Feedback
              </h3>
              <button
                onClick={() => setIsVisible(false)}
                className={`text-sm opacity-60 hover:opacity-100 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <NeuralDashboard 
                neuralState={neuralState}
                brainwaveActivity={brainwaveActivity}
                darkMode={darkMode}
              />
              
              <NeuralVisualization
                neuralState={neuralState}
                brainwaveActivity={brainwaveActivity}
                darkMode={darkMode}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adaptive Coaching */}
      <AdaptiveCoach neuralState={neuralState} darkMode={darkMode} />

      {/* Main Content */}
      {children}
    </div>
  );
}