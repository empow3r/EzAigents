'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import soundService from '../services/soundService';
import * as Icons from 'lucide-react';

/**
 * ADAPTIVE AI-DRIVEN PERSONALIZATION ENGINE
 * 
 * Advanced machine learning simulation for hyper-personalized UX
 * Adapts interface, content, and interactions based on user behavior patterns
 */

// Personalization Profile Manager
const usePersonalizationProfile = () => {
  const [profile, setProfile] = useState({
    userId: 'user_' + Math.random().toString(36).substr(2, 9),
    preferences: {
      visualStyle: 'modern', // modern, minimal, vibrant, dark
      interactionStyle: 'responsive', // responsive, subtle, dramatic
      informationDensity: 'balanced', // dense, balanced, spacious
      animationSpeed: 'normal', // slow, normal, fast
      colorScheme: 'auto', // auto, warm, cool, monochrome
      soundProfile: 'engaging', // minimal, balanced, engaging, immersive
      workingStyle: 'focused' // casual, focused, intensive, collaborative
    },
    behavioral: {
      sessionPatterns: [],
      taskPreferences: new Map(),
      timeOfDayActivity: new Map(),
      attentionSpan: 45000, // milliseconds
      multitaskingTendency: 0.3, // 0-1
      errorTolerance: 0.7, // 0-1
      explorationVsCoverage: 0.6, // 0-1 (0=explorative, 1=systematic)
      socialVsIndividual: 0.4 // 0-1 (0=individual, 1=social)
    },
    performance: {
      productivityPeaks: [],
      optimalBreakIntervals: 25000, // milliseconds
      cognitiveLoadThreshold: 0.8,
      flowStateTriggers: [],
      stressIndicators: [],
      motivationPatterns: []
    },
    adaptations: {
      uiLayout: 'standard',
      contentPriority: [],
      notificationTiming: [],
      assistanceLevel: 'moderate',
      automationPreference: 0.5
    }
  });

  const [learningHistory, setLearningHistory] = useState([]);
  const [currentContext, setCurrentContext] = useState({
    environment: 'work',
    timeOfDay: 'afternoon',
    sessionLength: 0,
    currentTask: null,
    cognitiveState: 'focused'
  });

  const updateProfile = useCallback((behaviorData) => {
    setProfile(prev => {
      const updated = { ...prev };
      
      // Learn from behavior patterns
      if (behaviorData.type === 'interaction') {
        const hour = new Date().getHours();
        const activity = prev.behavioral.timeOfDayActivity.get(hour) || 0;
        updated.behavioral.timeOfDayActivity.set(hour, activity + 1);
        
        // Adjust attention span based on session length
        if (behaviorData.sessionDuration > prev.behavioral.attentionSpan * 1.2) {
          updated.behavioral.attentionSpan = Math.min(60000, prev.behavioral.attentionSpan * 1.05);
        } else if (behaviorData.sessionDuration < prev.behavioral.attentionSpan * 0.8) {
          updated.behavioral.attentionSpan = Math.max(15000, prev.behavioral.attentionSpan * 0.98);
        }
      }

      // Adapt preferences based on usage patterns
      if (behaviorData.type === 'preference_signal') {
        switch (behaviorData.signal) {
          case 'fast_interactions':
            if (updated.preferences.animationSpeed === 'slow') {
              updated.preferences.animationSpeed = 'normal';
            } else if (updated.preferences.animationSpeed === 'normal') {
              updated.preferences.animationSpeed = 'fast';
            }
            break;
          case 'sound_engagement':
            if (updated.preferences.soundProfile === 'minimal') {
              updated.preferences.soundProfile = 'balanced';
            } else if (updated.preferences.soundProfile === 'balanced') {
              updated.preferences.soundProfile = 'engaging';
            }
            break;
          case 'visual_complexity':
            updated.preferences.informationDensity = behaviorData.preference;
            break;
        }
      }

      // Performance optimization learning
      if (behaviorData.type === 'performance') {
        if (behaviorData.metric === 'productivity_peak') {
          updated.performance.productivityPeaks.push({
            hour: new Date().getHours(),
            score: behaviorData.score,
            context: currentContext
          });
          
          // Keep only recent peaks
          if (updated.performance.productivityPeaks.length > 20) {
            updated.performance.productivityPeaks.shift();
          }
        }
      }

      return updated;
    });

    // Track learning event
    setLearningHistory(prev => [...prev.slice(-50), {
      timestamp: Date.now(),
      type: behaviorData.type,
      adaptation: behaviorData.adaptation || 'behavioral_learning',
      impact: behaviorData.impact || 'minor'
    }]);

  }, [currentContext]);

  return {
    profile,
    learningHistory,
    currentContext,
    setCurrentContext,
    updateProfile
  };
};

// Smart Content Prioritization
const useContentPersonalization = (profile) => {
  const [personalizedContent, setPersonalizedContent] = useState({
    dashboardLayout: 'standard',
    widgetPriority: [],
    contentTypes: [],
    informationFilters: [],
    suggestedActions: []
  });

  useEffect(() => {
    const generatePersonalizedContent = () => {
      const prefs = profile.preferences;
      const behavioral = profile.behavioral;
      const performance = profile.performance;

      // Dashboard layout adaptation
      let layout = 'standard';
      if (prefs.informationDensity === 'dense') {
        layout = 'compact';
      } else if (prefs.informationDensity === 'spacious') {
        layout = 'spacious';
      } else if (behavioral.multitaskingTendency > 0.7) {
        layout = 'multi_panel';
      }

      // Widget priority based on usage patterns
      const widgetPriority = [];
      
      // Time-based prioritization
      const hour = new Date().getHours();
      const activityAtThisHour = behavioral.timeOfDayActivity.get(hour) || 0;
      
      if (hour >= 9 && hour <= 11) {
        widgetPriority.push('productivity_tools', 'task_manager', 'focus_timer');
      } else if (hour >= 14 && hour <= 16) {
        widgetPriority.push('creative_tools', 'collaboration', 'brainstorming');
      } else if (hour >= 18 && hour <= 20) {
        widgetPriority.push('review_tools', 'analytics', 'planning');
      }

      // Productivity peak optimization
      const currentHour = new Date().getHours();
      const isProductivityPeak = performance.productivityPeaks.some(
        peak => Math.abs(peak.hour - currentHour) <= 1
      );

      if (isProductivityPeak) {
        widgetPriority.unshift('deep_work_mode', 'distraction_blocker');
      }

      // Suggested actions based on patterns
      const suggestedActions = [];
      
      if (behavioral.explorationVsCoverage < 0.3) {
        suggestedActions.push({
          type: 'exploration',
          title: 'Discover New Features',
          description: 'You tend to be explorative. Try the new neural visualization!',
          action: 'show_feature_tour',
          priority: 'medium'
        });
      }

      if (performance.optimalBreakIntervals < Date.now() % 3600000) {
        suggestedActions.push({
          type: 'wellness',
          title: 'Time for a Break',
          description: 'Based on your patterns, a short break would boost productivity',
          action: 'suggest_break',
          priority: 'high'
        });
      }

      setPersonalizedContent({
        dashboardLayout: layout,
        widgetPriority,
        contentTypes: prefs.workingStyle === 'collaborative' ? 
          ['team_updates', 'shared_progress', 'collaboration_tools'] :
          ['individual_metrics', 'personal_goals', 'focus_tools'],
        informationFilters: prefs.informationDensity === 'dense' ? 
          ['show_all', 'technical_details'] : 
          ['essential_only', 'simplified_view'],
        suggestedActions
      });
    };

    generatePersonalizedContent();
  }, [profile]);

  return personalizedContent;
};

// Adaptive UI Theme Engine
const useAdaptiveTheme = (profile, darkMode) => {
  const [adaptiveTheme, setAdaptiveTheme] = useState({
    colors: {},
    spacing: {},
    animations: {},
    typography: {},
    effects: {}
  });

  useEffect(() => {
    const generateAdaptiveTheme = () => {
      const prefs = profile.preferences;
      const behavioral = profile.behavioral;

      // Color scheme adaptation
      let colorScheme = {};
      switch (prefs.colorScheme) {
        case 'warm':
          colorScheme = {
            primary: darkMode ? '#FF6B6B' : '#E55A4E',
            secondary: darkMode ? '#FFB74D' : '#FF9800',
            accent: darkMode ? '#FFF176' : '#FFC107'
          };
          break;
        case 'cool':
          colorScheme = {
            primary: darkMode ? '#4FC3F7' : '#2196F3',
            secondary: darkMode ? '#81C784' : '#4CAF50',
            accent: darkMode ? '#BA68C8' : '#9C27B0'
          };
          break;
        case 'monochrome':
          colorScheme = {
            primary: darkMode ? '#90A4AE' : '#546E7A',
            secondary: darkMode ? '#B0BEC5' : '#78909C',
            accent: darkMode ? '#ECEFF1' : '#263238'
          };
          break;
        default: // auto
          const hour = new Date().getHours();
          if (hour >= 6 && hour <= 18) {
            colorScheme = {
              primary: darkMode ? '#4FC3F7' : '#2196F3',
              secondary: darkMode ? '#81C784' : '#4CAF50',
              accent: darkMode ? '#FFB74D' : '#FF9800'
            };
          } else {
            colorScheme = {
              primary: darkMode ? '#CE93D8' : '#9C27B0',
              secondary: darkMode ? '#F48FB1' : '#E91E63',
              accent: darkMode ? '#FFAB91' : '#FF5722'
            };
          }
      }

      // Animation speed adaptation
      let animationDuration = {
        fast: '0.15s',
        normal: '0.3s',
        slow: '0.6s'
      };

      if (prefs.animationSpeed === 'fast' || behavioral.multitaskingTendency > 0.7) {
        animationDuration = {
          fast: '0.1s',
          normal: '0.2s',
          slow: '0.4s'
        };
      } else if (prefs.animationSpeed === 'slow' || behavioral.errorTolerance < 0.3) {
        animationDuration = {
          fast: '0.2s',
          normal: '0.4s',
          slow: '0.8s'
        };
      }

      // Spacing adaptation based on information density
      let spacing = {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem'
      };

      if (prefs.informationDensity === 'dense') {
        spacing = {
          xs: '0.125rem',
          sm: '0.25rem',
          md: '0.5rem',
          lg: '0.75rem',
          xl: '1rem'
        };
      } else if (prefs.informationDensity === 'spacious') {
        spacing = {
          xs: '0.5rem',
          sm: '1rem',
          md: '1.5rem',
          lg: '2rem',
          xl: '3rem'
        };
      }

      // Typography adaptation
      const typography = {
        scale: prefs.informationDensity === 'dense' ? 0.9 : 
               prefs.informationDensity === 'spacious' ? 1.1 : 1.0,
        weight: prefs.visualStyle === 'minimal' ? 'light' : 'normal'
      };

      setAdaptiveTheme({
        colors: colorScheme,
        spacing,
        animations: {
          duration: animationDuration,
          easing: prefs.interactionStyle === 'dramatic' ? 
            'cubic-bezier(0.68, -0.55, 0.265, 1.55)' : 
            'cubic-bezier(0.4, 0.0, 0.2, 1)'
        },
        typography,
        effects: {
          blur: prefs.visualStyle === 'modern' ? 'backdrop-blur-sm' : '',
          shadows: prefs.visualStyle === 'vibrant' ? 'shadow-lg' : 'shadow-sm',
          borders: prefs.visualStyle === 'minimal' ? '1px' : '2px'
        }
      });
    };

    generateAdaptiveTheme();
  }, [profile, darkMode]);

  return adaptiveTheme;
};

// Personalization Dashboard
const PersonalizationDashboard = ({ profile, learningHistory, theme, darkMode }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon:Icons.Eye },
    { id: 'preferences', label: 'Preferences', icon:Icons.Settings },
    { id: 'learning', label: 'Learning', icon:Icons.Brain },
    { id: 'performance', label: 'Performance', icon:Icons.TrendingUp }
  ];

  const PreferenceSlider = ({ label, value, onChange, min = 0, max = 1, step = 0.1 }) => (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}
        </span>
        <span className={`text-sm font-mono ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
          darkMode ? 'bg-gray-700' : 'bg-gray-200'
        }`}
      />
    </div>
  );

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsVisible(!isVisible)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed top-32 left-6 p-3 rounded-full shadow-lg backdrop-blur-sm z-50 ${
          darkMode 
            ? 'bg-gray-800/80 text-white border border-gray-700' 
            : 'bg-white/80 text-gray-900 border border-gray-200'
        }`}
      >
        <Icons.Sparkles size={20} />
      </motion.button>

      {/* Dashboard Panel */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className={`fixed top-44 left-6 w-80 max-h-96 rounded-xl shadow-xl backdrop-blur-sm z-40 overflow-hidden ${
              darkMode 
                ? 'bg-gray-900/90 border border-gray-700' 
                : 'bg-white/90 border border-gray-200'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                AI Personalization
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

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-xs transition-colors ${
                      activeTab === tab.id
                        ? darkMode 
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-50 text-blue-600'
                        : darkMode
                          ? 'text-gray-400 hover:text-white'
                          : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="p-4 max-h-64 overflow-y-auto">
              {activeTab === 'overview' && (
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Icons.Target size={16} className="text-blue-500" />
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Personalization Score
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-blue-500">
                      {Math.round((profile.behavioral.attentionSpan / 60000) * 100)}%
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Based on {learningHistory.length} adaptations
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className={`block ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Attention Span
                      </span>
                      <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {Math.round(profile.behavioral.attentionSpan / 1000 / 60)}min
                      </span>
                    </div>
                    <div>
                      <span className={`block ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Working Style
                      </span>
                      <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {profile.preferences.workingStyle}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'learning' && (
                <div className="space-y-2">
                  <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Recent Adaptations
                  </h4>
                  {learningHistory.slice(-5).reverse().map((event, index) => (
                    <div key={index} className={`p-2 rounded text-xs ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-center">
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {event.adaptation.replace('_', ' ')}
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Impact: {event.impact}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Main Adaptive Personalization Engine
export default function AdaptivePersonalizationEngine({ darkMode, children }) {
  const { profile, learningHistory, currentContext, setCurrentContext, updateProfile } = usePersonalizationProfile();
  const personalizedContent = useContentPersonalization(profile);
  const adaptiveTheme = useAdaptiveTheme(profile, darkMode);

  // Track interactions for learning
  useEffect(() => {
    const trackInteractions = () => {
      updateProfile({
        type: 'interaction',
        sessionDuration: Date.now() - (currentContext.sessionStart || Date.now()),
        timestamp: Date.now()
      });
    };

    const interval = setInterval(trackInteractions, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [updateProfile, currentContext]);

  // Update context based on time and activity
  useEffect(() => {
    const updateContextPeriodically = () => {
      const hour = new Date().getHours();
      let timeOfDay = 'morning';
      if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
      else if (hour >= 21 || hour < 6) timeOfDay = 'night';

      setCurrentContext(prev => ({
        ...prev,
        timeOfDay,
        sessionLength: Date.now() - (prev.sessionStart || Date.now())
      }));
    };

    const interval = setInterval(updateContextPeriodically, 60000); // Every minute
    updateContextPeriodically(); // Initial call

    return () => clearInterval(interval);
  }, [setCurrentContext]);

  // Apply adaptive theme to CSS variables
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      Object.entries(adaptiveTheme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--adaptive-${key}`, value);
      });
      Object.entries(adaptiveTheme.spacing).forEach(([key, value]) => {
        root.style.setProperty(`--adaptive-spacing-${key}`, value);
      });
    }
  }, [adaptiveTheme]);

  return (
    <div 
      className="relative"
      style={{
        '--adaptive-animation-duration': adaptiveTheme.animations?.duration?.normal || '0.3s',
        '--adaptive-animation-easing': adaptiveTheme.animations?.easing || 'cubic-bezier(0.4, 0.0, 0.2, 1)'
      }}
    >
      {/* Personalization Dashboard */}
      <PersonalizationDashboard
        profile={profile}
        learningHistory={learningHistory}
        theme={adaptiveTheme}
        darkMode={darkMode}
      />

      {/* Adaptive Content Suggestions */}
      <AnimatePresence>
        {personalizedContent.suggestedActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed top-20 right-6 max-w-sm p-4 rounded-xl shadow-xl backdrop-blur-sm z-30 ${
              darkMode ? 'bg-purple-900/80 text-white' : 'bg-purple-50/80 text-purple-900'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <Icons.Sparkles size={16} />
              <span className="text-sm font-medium">Personalized Suggestion</span>
            </div>
            {personalizedContent.suggestedActions.slice(0, 1).map((action, index) => (
              <div key={index}>
                <h4 className="font-medium text-sm mb-1">{action.title}</h4>
                <p className="text-xs mb-3 opacity-80">{action.description}</p>
                <button
                  onClick={() => {
                    soundService.play('perfectClick');
                    updateProfile({
                      type: 'preference_signal',
                      signal: 'suggestion_accepted',
                      action: action.action
                    });
                  }}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    darkMode 
                      ? 'bg-white/20 hover:bg-white/30' 
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  Try it <Icons.ChevronRight size={12} className="inline ml-1" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content with Adaptive Styling */}
      <div
        className="adaptive-content"
        style={{
          fontSize: `${adaptiveTheme.typography?.scale || 1}em`,
          transition: `all ${adaptiveTheme.animations?.duration?.normal || '0.3s'} ${adaptiveTheme.animations?.easing || 'ease'}`
        }}
      >
        {children}
      </div>
    </div>
  );
}