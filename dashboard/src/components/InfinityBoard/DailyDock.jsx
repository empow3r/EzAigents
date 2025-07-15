import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInfinityBoardStore } from '../../stores/infinityBoardStore';
import * as Icons from 'lucide-react';

const DailyDock = () => {
  const { user, dailyGoals, aiInsights, theme } = useInfinityBoardStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, [currentTime]);

  const themeColors = {
    luxe: {
      bg: 'bg-black/80',
      accent: 'from-yellow-400 to-orange-500',
      text: 'text-yellow-400'
    },
    zen: {
      bg: 'bg-green-900/80',
      accent: 'from-green-400 to-teal-500',
      text: 'text-green-400'
    },
    futurist: {
      bg: 'bg-purple-900/80',
      accent: 'from-purple-400 to-pink-500',
      text: 'text-purple-400'
    }
  };

  const colors = themeColors[theme];

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={`${colors.bg} backdrop-blur-2xl border-t border-white/10 px-6 py-4`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Greeting Section */}
        <div className="flex items-center justify-between mb-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-4"
          >
            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${colors.accent} animate-pulse`} />
            <h2 className="text-white text-lg font-medium">
              {greeting}, {user.name || 'Visionary'}
            </h2>
            <p className="text-white/60 text-sm">
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-6"
          >
            <div className="flex items-center space-x-2">
              <Icons.Zap className={`w-5 h-5 ${colors.text}`} />
              <span className="text-white/80 text-sm">Level {user.level}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Icons.Sparkles className={`w-5 h-5 ${colors.text}`} />
              <span className="text-white/80 text-sm">{user.tokens} tokens</span>
            </div>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* North Star */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Icons.Target className={`w-4 h-4 ${colors.text}`} />
              <h3 className="text-white/80 text-sm font-medium">Your North Star</h3>
            </div>
            <p className="text-white text-lg font-semibold">
              {user.northStar || "Design Your Legendary Life"}
            </p>
          </motion.div>

          {/* Today's Focus */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Icons.Brain className={`w-4 h-4 ${colors.text}`} />
              <h3 className="text-white/80 text-sm font-medium">AI Insight</h3>
            </div>
            <p className="text-white text-sm">
              {aiInsights.dailyFocus || "Focus on high-leverage activities today. Your energy peaks at 10 AM."}
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Icons.TrendingUp className={`w-4 h-4 ${colors.text}`} />
              <h3 className="text-white/80 text-sm font-medium">Today's Progress</h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-white text-xl font-bold">
                  {dailyGoals.filter(g => g.completed).length}/{dailyGoals.length}
                </p>
                <p className="text-white/60 text-xs">Goals</p>
              </div>
              <div className="text-center">
                <p className="text-white text-xl font-bold">87%</p>
                <p className="text-white/60 text-xs">Energy</p>
              </div>
              <div className="text-center">
                <p className="text-white text-xl font-bold">+{user.experience % 1000}</p>
                <p className="text-white/60 text-xs">XP Today</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Action Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 flex items-center justify-center space-x-4"
        >
          <button className={`px-4 py-2 bg-gradient-to-r ${colors.accent} text-white rounded-lg text-sm font-medium hover:scale-105 transition-transform`}>
            Start Daily Quest
          </button>
          <button className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors">
            Review Goals
          </button>
          <button className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors">
            AI Assistant
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DailyDock;