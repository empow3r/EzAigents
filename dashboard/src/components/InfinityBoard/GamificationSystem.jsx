import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Trophy, Zap, Target, TrendingUp, Award, Crown, Sparkles } from 'lucide-react';
import { useInfinityBoardStore } from '../../stores/infinityBoardStore';

// Achievement definitions
const ACHIEVEMENTS = {
  firstLogin: {
    id: 'firstLogin',
    title: 'Welcome to Infinity',
    description: 'Completed your first login',
    icon: '🚀',
    xp: 100,
    rarity: 'common'
  },
  visionSet: {
    id: 'visionSet',
    title: 'Visionary',
    description: 'Set your North Star vision',
    icon: '⭐',
    xp: 200,
    rarity: 'common'
  },
  weekStreak: {
    id: 'weekStreak',
    title: 'Consistency Master',
    description: '7 days of daily check-ins',
    icon: '🔥',
    xp: 500,
    rarity: 'rare'
  },
  firstMillion: {
    id: 'firstMillion',
    title: 'Millionaire Mindset',
    description: 'Tracked $1M+ in assets',
    icon: '💎',
    xp: 1000,
    rarity: 'epic'
  },
  zenMaster: {
    id: 'zenMaster',
    title: 'Zen Master',
    description: '30 days of meditation',
    icon: '🧘‍♂️',
    xp: 750,
    rarity: 'rare'
  },
  empireBuilder: {
    id: 'empireBuilder',
    title: 'Empire Builder',
    description: 'Completed 10 business projects',
    icon: '🏛️',
    xp: 1500,
    rarity: 'legendary'
  }
};

// Level system
const LEVEL_SYSTEM = {
  getLevel: (xp) => Math.floor(xp / 1000) + 1,
  getXpForNextLevel: (currentXp) => Math.ceil((currentXp + 1) / 1000) * 1000,
  getLevelTitle: (level) => {
    if (level < 5) return 'Apprentice';
    if (level < 10) return 'Achiever';
    if (level < 20) return 'Visionary';
    if (level < 35) return 'Empire Builder';
    if (level < 50) return 'Legend';
    return 'Infinity Master';
  }
};

const AchievementToast = ({ achievement, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const rarityColors = {
    common: 'from-blue-400 to-blue-600',
    rare: 'from-purple-400 to-purple-600',
    epic: 'from-pink-400 to-pink-600',
    legendary: 'from-yellow-400 to-orange-500'
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed top-4 right-4 z-[100] max-w-sm"
    >
      <div className={`bg-gradient-to-r ${rarityColors[achievement.rarity]} p-1 rounded-xl`}>
        <div className="bg-black/90 backdrop-blur-xl rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{achievement.icon}</div>
            <div className="flex-1">
              <h3 className="text-white font-bold">Achievement Unlocked!</h3>
              <p className="text-white/80 text-sm">{achievement.title}</p>
              <p className="text-white/60 text-xs">{achievement.description}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-yellow-400 text-xs">+{achievement.xp} XP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const LevelUpToast = ({ newLevel, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
    >
      <div className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 p-1 rounded-2xl">
        <div className="bg-black/95 backdrop-blur-xl rounded-xl p-8 text-center">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center"
          >
            <Crown className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-2">LEVEL UP!</h2>
          <p className="text-xl text-yellow-400 mb-2">Level {newLevel}</p>
          <p className="text-white/80">{LEVEL_SYSTEM.getLevelTitle(newLevel)}</p>
          <div className="flex items-center justify-center space-x-1 mt-4">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              >
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ProgressBar = ({ currentXp, maxXp, level, theme }) => {
  const progress = (currentXp % 1000) / 1000 * 100;
  
  const themeColors = {
    luxe: 'from-yellow-400 to-orange-500',
    zen: 'from-green-400 to-teal-500',
    futurist: 'from-purple-400 to-pink-500'
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Crown className="w-5 h-5 text-yellow-400" />
          <span className="text-white font-semibold">Level {level}</span>
          <span className="text-white/60 text-sm">({LEVEL_SYSTEM.getLevelTitle(level)})</span>
        </div>
        <div className="flex items-center space-x-1">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-white/80 text-sm">{currentXp % 1000}/1000 XP</span>
        </div>
      </div>
      
      <div className="relative">
        <div className="w-full bg-white/20 rounded-full h-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`bg-gradient-to-r ${themeColors[theme]} h-full rounded-full relative`}
          >
            <motion.div
              animate={{ 
                boxShadow: [
                  '0 0 0px rgba(255,255,255,0)',
                  '0 0 20px rgba(255,255,255,0.5)',
                  '0 0 0px rgba(255,255,255,0)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full"
            />
          </motion.div>
        </div>
        
        {/* XP gain animation */}
        <AnimatePresence>
          {/* This would be triggered by XP gains */}
        </AnimatePresence>
      </div>
    </div>
  );
};

const AchievementGrid = ({ achievements, theme }) => {
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  
  const rarityColors = {
    common: 'border-blue-400/50 bg-blue-400/10',
    rare: 'border-purple-400/50 bg-purple-400/10',
    epic: 'border-pink-400/50 bg-pink-400/10',
    legendary: 'border-yellow-400/50 bg-yellow-400/10'
  };

  return (
    <div>
      <h3 className="text-white text-lg font-semibold mb-4 flex items-center space-x-2">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <span>Achievements</span>
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.values(ACHIEVEMENTS).map((achievement) => {
          const isUnlocked = achievements.includes(achievement.id);
          
          return (
            <motion.div
              key={achievement.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedAchievement(achievement)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isUnlocked 
                  ? rarityColors[achievement.rarity]
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="text-center">
                <div className={`text-3xl mb-2 ${!isUnlocked && 'grayscale opacity-50'}`}>
                  {achievement.icon}
                </div>
                <h4 className={`font-semibold text-sm mb-1 ${
                  isUnlocked ? 'text-white' : 'text-white/40'
                }`}>
                  {achievement.title}
                </h4>
                <p className={`text-xs ${
                  isUnlocked ? 'text-white/60' : 'text-white/30'
                }`}>
                  {achievement.description}
                </p>
                {isUnlocked && (
                  <div className="flex items-center justify-center space-x-1 mt-2">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-400 text-xs">+{achievement.xp}</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const GamificationDashboard = ({ className = "" }) => {
  const { user, theme } = useInfinityBoardStore();
  const [showAchievementToast, setShowAchievementToast] = useState(null);
  const [showLevelUpToast, setShowLevelUpToast] = useState(null);

  const currentLevel = LEVEL_SYSTEM.getLevel(user.experience);
  const nextLevelXp = LEVEL_SYSTEM.getXpForNextLevel(user.experience);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Bar */}
      <ProgressBar 
        currentXp={user.experience}
        maxXp={nextLevelXp}
        level={currentLevel}
        theme={theme}
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20 text-center">
          <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{user.achievements.length}</p>
          <p className="text-white/60 text-sm">Achievements</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20 text-center">
          <Zap className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{user.experience}</p>
          <p className="text-white/60 text-sm">Total XP</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20 text-center">
          <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{user.tokens}</p>
          <p className="text-white/60 text-sm">Tokens</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20 text-center">
          <Target className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">87%</p>
          <p className="text-white/60 text-sm">Completion</p>
        </div>
      </div>

      {/* Achievement Grid */}
      <AchievementGrid achievements={user.achievements} theme={theme} />

      {/* Toast Notifications */}
      <AnimatePresence>
        {showAchievementToast && (
          <AchievementToast
            achievement={showAchievementToast}
            onClose={() => setShowAchievementToast(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLevelUpToast && (
          <LevelUpToast
            newLevel={showLevelUpToast}
            onClose={() => setShowLevelUpToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Hook for triggering achievements
export const useAchievements = () => {
  const { user, addAchievement, addExperience } = useInfinityBoardStore();
  const [toastQueue, setToastQueue] = useState([]);

  const unlockAchievement = (achievementId) => {
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement || user.achievements.includes(achievementId)) return;

    const oldLevel = LEVEL_SYSTEM.getLevel(user.experience);
    addAchievement(achievement);
    addExperience(achievement.xp);
    const newLevel = LEVEL_SYSTEM.getLevel(user.experience + achievement.xp);

    // Queue notifications
    setToastQueue(prev => [...prev, { type: 'achievement', data: achievement }]);
    
    if (newLevel > oldLevel) {
      setToastQueue(prev => [...prev, { type: 'levelup', data: newLevel }]);
    }
  };

  const addXp = (amount, reason = '') => {
    const oldLevel = LEVEL_SYSTEM.getLevel(user.experience);
    addExperience(amount);
    const newLevel = LEVEL_SYSTEM.getLevel(user.experience + amount);

    if (newLevel > oldLevel) {
      setToastQueue(prev => [...prev, { type: 'levelup', data: newLevel }]);
    }
  };

  return {
    unlockAchievement,
    addXp,
    toastQueue,
    clearToastQueue: () => setToastQueue([])
  };
};

export { ACHIEVEMENTS, LEVEL_SYSTEM };
export default GamificationDashboard;