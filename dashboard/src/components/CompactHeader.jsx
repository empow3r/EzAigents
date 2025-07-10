'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EzAigentFullLogo } from './EzAigentLogo';
import soundService from '../services/soundService';
import { 
  Menu, 
  X, 
  Sun, 
  Moon,
  Zap,
  BarChart3,
  Box,
  GitCompare,
  Trophy,
  Settings,
  Sparkles,
  GitBranch,
  MessageCircle,
  Volume2,
  Crown
} from 'lucide-react';

const CompactHeader = ({ 
  activeTab, 
  onTabChange, 
  darkMode, 
  onToggleTheme 
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { id: 'command', name: 'Command', shortName: 'Command', icon: Zap },
    { id: 'project', name: 'Status', shortName: 'Status', icon: GitBranch },
    { id: 'enhanced', name: 'Dashboard', shortName: 'Dashboard', icon: Sparkles },
    { id: 'chat', name: 'Chat', shortName: 'Chat', icon: MessageCircle },
    { id: 'tts', name: 'TTS', shortName: 'TTS', icon: Volume2 },
    { id: 'dashboard', name: 'Classic', shortName: 'Classic', icon: BarChart3 },
    { id: 'workspace', name: '3D', shortName: '3D', icon: Box },
    { id: 'diffs', name: 'Diffs', shortName: 'Diffs', icon: GitCompare },
    { id: 'gamification', name: 'Wins', shortName: 'Wins', icon: Trophy },
    { id: 'prompts', name: 'Prompts', shortName: 'Prompts', icon: Settings },
    { id: 'enhancements', name: 'Enhance', shortName: 'Enhance', icon: Settings }
  ];

  const activeTabInfo = tabs.find(tab => tab.id === activeTab);

  const handleTabSelect = (tabId) => {
    // Enhanced neural optimization for navigation
    soundService.play('perfectClick');
    setTimeout(() => soundService.play('focusBoost'), 80);
    setTimeout(() => soundService.play('miniSuccess'), 150);
    
    // Trigger flow state for rapid navigation
    if (soundService.getNeuralState && soundService.getNeuralState().flowState) {
      setTimeout(() => soundService.play('neuralSync'), 250);
    }
    
    onTabChange(tabId);
    setMenuOpen(false);
  };

  const handleMenuToggle = () => {
    if (menuOpen) {
      soundService.play('menuClose');
    } else {
      soundService.play('engagement');
      setTimeout(() => soundService.play('socialBoost'), 100);
      setTimeout(() => soundService.play('sparkle'), 200);
    }
    setMenuOpen(!menuOpen);
  };

  const handleThemeToggle = () => {
    soundService.play('satisfyingPop');
    setTimeout(() => soundService.play('personalizedReward'), 150);
    setTimeout(() => soundService.play('euphoria'), 300);
    onToggleTheme();
  };

  return (
    <>
      {/* Compact Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`sticky top-0 z-50 backdrop-blur-sm border-b transition-all duration-300 ${
          darkMode 
            ? 'bg-black/20 border-white/10' 
            : 'bg-white/20 border-black/10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          {/* Top Row - Logo and Theme Toggle */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              {/* Menu Button - Mobile only */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => soundService.play('buttonHover')}
                onClick={handleMenuToggle}
                className={`md:hidden p-2 rounded-lg transition-all ${
                  darkMode 
                    ? 'bg-white/10 text-white hover:bg-white/20' 
                    : 'bg-black/10 text-gray-900 hover:bg-black/20'
                }`}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </motion.button>

              {/* Logo */}
              <EzAigentFullLogo 
                size="md" 
                darkMode={darkMode} 
                animated={true}
                showText={true}
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Executive Mode Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => soundService.play('buttonHover')}
                onClick={() => window.location.href = '/executive'}
                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg flex items-center gap-2"
                style={{
                  boxShadow: '0 0 20px rgba(251, 191, 36, 0.4)'
                }}
                aria-label="Switch to Executive Command Center"
              >
                <Crown size={18} />
                EXECUTIVE
              </motion.button>

              {/* Theme Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => soundService.play('buttonHover')}
                onClick={handleThemeToggle}
                className={`p-2 rounded-lg transition-all ${
                  darkMode 
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                    : 'bg-blue-500/20 text-blue-600 hover:bg-blue-500/30'
                }`}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </motion.button>
            </div>
          </div>

          {/* Navigation Bar - Desktop */}
          <div className="hidden md:block pb-3">
            <div className={`flex items-center justify-center space-x-1 p-2 rounded-lg ${
              darkMode 
                ? 'bg-white/5 border border-white/10' 
                : 'bg-black/5 border border-black/10'
            }`}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onMouseEnter={() => soundService.play('microReward')}
                    onClick={() => handleTabSelect(tab.id)}
                    className={`relative flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? darkMode
                          ? 'bg-blue-500/20 text-blue-300 shadow-lg border border-blue-500/30'
                          : 'bg-blue-500/10 text-blue-600 shadow-lg border border-blue-500/30'
                        : darkMode
                          ? 'text-gray-300 hover:text-white hover:bg-white/10'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-black/10'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="hidden lg:inline">{tab.name}</span>
                    <span className="lg:hidden">{tab.shortName}</span>
                    
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                          darkMode ? 'bg-blue-400' : 'bg-blue-500'
                        }`}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Slide-out Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed left-0 top-0 h-full w-80 z-50 ${
                darkMode 
                  ? 'bg-gray-900/95 border-white/10' 
                  : 'bg-white/95 border-black/10'
              } backdrop-blur-xl border-r`}
            >
              {/* Menu Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <EzAigentFullLogo 
                    size="lg" 
                    darkMode={darkMode} 
                    animated={true}
                    showText={true}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onMouseEnter={() => soundService.play('microReward')}
                    onClick={() => {
                      soundService.play('buttonClick');
                      setMenuOpen(false);
                    }}
                    className={`p-2 rounded-lg ${
                      darkMode 
                        ? 'text-gray-400 hover:text-white hover:bg-white/10' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-black/10'
                    }`}
                  >
                    <X size={20} />
                  </motion.button>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-4 space-y-2">
                {tabs.map((tab, index) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <motion.button
                      key={tab.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onMouseEnter={() => soundService.play('microReward')}
                      onClick={() => handleTabSelect(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all ${
                        isActive
                          ? darkMode
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                          : darkMode
                            ? 'text-gray-300 hover:text-white hover:bg-white/10'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-black/10'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{tab.name}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className={`ml-auto w-2 h-2 rounded-full ${
                            darkMode ? 'bg-blue-400' : 'bg-blue-500'
                          }`}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Menu Footer */}
              <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${
                darkMode ? 'border-white/10' : 'border-black/10'
              }`}>
                <div className={`text-center text-xs ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Ez Aigent Dashboard v2.0
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default CompactHeader;