'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import soundService from '../services/soundService';

export default function NeuralMonitor({ darkMode = true }) {
  const [neuralState, setNeuralState] = useState({
    dopamineLevel: 0.5,
    serotoninBoost: false,
    focusEnhancement: false,
    creativityMode: false,
    engagement: 0,
    flowState: false,
    sessionMetrics: {
      interactions: 0,
      streakCount: 0,
      sessionDuration: 0,
      energyLevel: 0.5
    }
  });

  // Update neural state every 2 seconds
  useEffect(() => {
    const updateNeuralState = () => {
      if (soundService.getNeuralState) {
        setNeuralState(soundService.getNeuralState());
      }
    };

    const interval = setInterval(updateNeuralState, 2000);
    updateNeuralState(); // Initial update

    return () => clearInterval(interval);
  }, []);

  const getStateColor = (value) => {
    if (value > 0.8) return 'text-green-400';
    if (value > 0.6) return 'text-yellow-400';
    if (value > 0.3) return 'text-blue-400';
    return 'text-gray-400';
  };

  const getStateGlow = (value) => {
    if (value > 0.8) return 'shadow-green-400/50';
    if (value > 0.6) return 'shadow-yellow-400/50';
    if (value > 0.3) return 'shadow-blue-400/50';
    return 'shadow-gray-400/50';
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const triggerManualBoost = (type) => {
    switch (type) {
      case 'focus':
        soundService.play('focusBoost');
        setTimeout(() => soundService.play('neuralSync'), 200);
        break;
      case 'creativity':
        soundService.play('creativityFlow');
        setTimeout(() => soundService.play('euphoria'), 300);
        break;
      case 'energy':
        soundService.play('energyWave');
        setTimeout(() => soundService.play('productivityPulse'), 250);
        break;
      case 'social':
        soundService.play('socialBoost');
        setTimeout(() => soundService.play('communityWin'), 200);
        break;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl border backdrop-blur-sm ${
        darkMode 
          ? 'bg-black/40 border-white/20 text-white' 
          : 'bg-white/40 border-black/20 text-gray-900'
      }`}
      style={{ minWidth: '280px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Icons.Brain className={`w-5 h-5 ${getStateColor(neuralState.engagement)}`} />
          <h3 className="text-sm font-semibold">Neural State</h3>
        </div>
        {neuralState.flowState && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30"
          >
            FLOW STATE
          </motion.div>
        )}
      </div>

      {/* Neural Metrics */}
      <div className="space-y-2 mb-4">
        {/* Dopamine Level */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Dopamine</span>
          <div className="flex items-center space-x-2">
            <div className={`w-16 h-1 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${neuralState.dopamineLevel * 100}%` }}
                className={`h-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 ${
                  neuralState.dopamineLevel > 0.8 ? 'shadow-lg shadow-purple-400/50' : ''
                }`}
              />
            </div>
            <span className={`text-xs ${getStateColor(neuralState.dopamineLevel)}`}>
              {Math.round(neuralState.dopamineLevel * 100)}%
            </span>
          </div>
        </div>

        {/* Engagement */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Engagement</span>
          <div className="flex items-center space-x-2">
            <div className={`w-16 h-1 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, neuralState.engagement * 10)}%` }}
                className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
              />
            </div>
            <span className={`text-xs ${getStateColor(neuralState.engagement)}`}>
              {Math.round(neuralState.engagement * 10)}%
            </span>
          </div>
        </div>

        {/* Energy Level */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Energy</span>
          <div className="flex items-center space-x-2">
            <div className={`w-16 h-1 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${neuralState.sessionMetrics.energyLevel * 100}%` }}
                className="h-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500"
              />
            </div>
            <span className={`text-xs ${getStateColor(neuralState.sessionMetrics.energyLevel)}`}>
              {Math.round(neuralState.sessionMetrics.energyLevel * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Active States */}
      <div className="flex flex-wrap gap-1 mb-3">
        {neuralState.focusEnhancement && (
          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
            <Icons.Target className="w-3 h-3 inline mr-1" />
            Focus
          </span>
        )}
        {neuralState.creativityMode && (
          <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
            <Icons.Zap className="w-3 h-3 inline mr-1" />
            Creative
          </span>
        )}
        {neuralState.serotoninBoost && (
          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
            <Icons.Heart className="w-3 h-3 inline mr-1" />
            Social
          </span>
        )}
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="text-center">
          <div className={`font-semibold ${getStateColor(neuralState.sessionMetrics.interactions / 100)}`}>
            {neuralState.sessionMetrics.interactions}
          </div>
          <div className="text-gray-400">Interactions</div>
        </div>
        <div className="text-center">
          <div className={`font-semibold ${getStateColor(neuralState.sessionMetrics.streakCount / 20)}`}>
            {neuralState.sessionMetrics.streakCount}
          </div>
          <div className="text-gray-400">Streak</div>
        </div>
      </div>

      {/* Session Duration */}
      <div className="text-center mb-3">
        <div className={`text-sm font-semibold ${getStateColor(neuralState.sessionMetrics.sessionDuration / 600000)}`}>
          {formatDuration(neuralState.sessionMetrics.sessionDuration)}
        </div>
        <div className="text-xs text-gray-400">Session Time</div>
      </div>

      {/* Manual Boost Buttons */}
      <div className="grid grid-cols-2 gap-1">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => triggerManualBoost('focus')}
          className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 hover:bg-blue-500/30 transition-all"
        >
          <Icons.Target className="w-3 h-3 inline mr-1" />
          Focus
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => triggerManualBoost('creativity')}
          className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30 hover:bg-purple-500/30 transition-all"
        >
          <Icons.Zap className="w-3 h-3 inline mr-1" />
          Create
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => triggerManualBoost('energy')}
          className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded border border-orange-500/30 hover:bg-orange-500/30 transition-all"
        >
          <Icons.TrendingUp className="w-3 h-3 inline mr-1" />
          Energy
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => triggerManualBoost('social')}
          className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30 hover:bg-green-500/30 transition-all"
        >
          <Icons.Heart className="w-3 h-3 inline mr-1" />
          Social
        </motion.button>
      </div>
    </motion.div>
  );
}