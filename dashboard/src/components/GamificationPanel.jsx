import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useGamification } from '../hooks/useGamification';

export default function GamificationPanel({ screenSize, isMobile, isTablet }) {
  const {
    user,
    achievements,
    badges,
    streaks,
    leaderboard,
    dailyQuests,
    weeklyQuests,
    seasonalEvents,
    addExperience,
    trackActivity,
    getExperienceForNextLevel,
    titles
  } = useGamification();

  const [activeTab, setActiveTab] = useState('overview');
  const [notifications, setNotifications] = useState([]);
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);

  // Listen for gamification events
  useEffect(() => {
    const handleLevelUp = (event) => {
      const { oldLevel, newLevel, title } = event.detail;
      setShowLevelUpAnimation(true);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'levelUp',
        title: 'Level Up!',
        message: `You reached level ${newLevel}: ${title}`,
        icon: '🎉',
        timestamp: new Date()
      }]);
      
      setTimeout(() => setShowLevelUpAnimation(false), 3000);
    };

    const handleAchievementUnlocked = (event) => {
      const achievement = event.detail;
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'achievement',
        title: 'Achievement Unlocked!',
        message: `${achievement.name}: ${achievement.description}`,
        icon: achievement.icon,
        timestamp: new Date()
      }]);
    };

    const handleBadgeLevelUp = (event) => {
      const { badgeId, level, name } = event.detail;
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'badge',
        title: 'Badge Upgraded!',
        message: `${name} reached level ${level}`,
        icon: '🏆',
        timestamp: new Date()
      }]);
    };

    const handleQuestCompleted = (event) => {
      const { quest, reward } = event.detail;
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'quest',
        title: 'Quest Completed!',
        message: `${quest} (+${reward} XP)`,
        icon: '✅',
        timestamp: new Date()
      }]);
    };

    window.addEventListener('levelUp', handleLevelUp);
    window.addEventListener('achievementUnlocked', handleAchievementUnlocked);
    window.addEventListener('badgeLevelUp', handleBadgeLevelUp);
    window.addEventListener('questCompleted', handleQuestCompleted);

    return () => {
      window.removeEventListener('levelUp', handleLevelUp);
      window.removeEventListener('achievementUnlocked', handleAchievementUnlocked);
      window.removeEventListener('badgeLevelUp', handleBadgeLevelUp);
      window.removeEventListener('questCompleted', handleQuestCompleted);
    };
  }, []);

  // Auto-remove notifications after 5 seconds
  useEffect(() => {
    notifications.forEach(notification => {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    });
  }, [notifications]);

  const experienceToNext = getExperienceForNextLevel(user.level);
  const experienceProgress = ((user.experience - (user.level > 0 ? getExperienceForNextLevel(user.level - 1) : 0)) / 
    (experienceToNext - (user.level > 0 ? getExperienceForNextLevel(user.level - 1) : 0))) * 100;

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 bg-gray-100';
      case 'uncommon': return 'text-green-600 bg-green-100';
      case 'rare': return 'text-blue-600 bg-blue-100';
      case 'epic': return 'text-purple-600 bg-purple-100';
      case 'legendary': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* User Profile */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-lg text-blue-600 font-medium">{user.title}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Icons.Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-600">Level {user.level}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{user.experience.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total XP</div>
          </div>
        </div>
        
        {/* Experience Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress to Level {user.level + 1}</span>
            <span>{Math.round(experienceProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <motion.div 
              className="bg-blue-500 h-3 rounded-full"
              style={{ width: `${experienceProgress}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${experienceProgress}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {(experienceToNext - user.experience).toLocaleString()} XP to next level
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{achievements.length}</div>
              <div className="text-sm text-gray-600">Achievements</div>
            </div>
            <Icons.Trophy className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{badges.length}</div>
              <div className="text-sm text-gray-600">Badges</div>
            </div>
            <Icons.Award className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{streaks.daily}</div>
              <div className="text-sm text-gray-600">Daily Streak</div>
            </div>
            <Icons.Flame className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Seasonal Events */}
      {seasonalEvents.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Icons.Sparkles className="w-5 h-5 text-purple-500" />
            Seasonal Events
          </h3>
          {seasonalEvents.map(event => (
            <div key={event.id} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{event.icon}</span>
                  <div>
                    <h4 className="font-semibold text-purple-900">{event.name}</h4>
                    <p className="text-sm text-purple-700">{event.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-purple-600">
                    Ends {event.endsAt.toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const QuestsTab = () => (
    <div className="space-y-6">
      {/* Daily Quests */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icons.Calendar className="w-5 h-5 text-blue-500" />
          Daily Quests
        </h3>
        <div className="space-y-3">
          {dailyQuests.map(quest => (
            <div key={quest.id} className="bg-white rounded-lg p-4 border shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{quest.name}</h4>
                    {quest.completed && <Icons.CheckCircle className="w-4 h-4 text-green-500" />}
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{quest.progress}/{quest.target}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${quest.completed ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min((quest.progress / quest.target) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm font-medium text-green-600">+{quest.reward} XP</div>
                  <div className="text-xs text-gray-500">
                    {quest.expiresAt.toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Quests */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icons.Target className="w-5 h-5 text-purple-500" />
          Weekly Quests
        </h3>
        <div className="space-y-3">
          {weeklyQuests.map(quest => (
            <div key={quest.id} className="bg-white rounded-lg p-4 border shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{quest.name}</h4>
                    {quest.completed && <Icons.CheckCircle className="w-4 h-4 text-green-500" />}
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{quest.progress}/{quest.target}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${quest.completed ? 'bg-green-500' : 'bg-purple-500'}`}
                        style={{ width: `${Math.min((quest.progress / quest.target) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm font-medium text-green-600">+{quest.reward} XP</div>
                  <div className="text-xs text-gray-500">
                    {quest.expiresAt.toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const AchievementsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {achievements.map(achievement => (
          <motion.div
            key={achievement.id}
            className={`p-4 rounded-lg border-2 ${getRarityColor(achievement.rarity)}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center space-x-3">
              <div className="text-3xl">{achievement.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold">{achievement.name}</h3>
                <p className="text-sm opacity-80">{achievement.description}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/50">
                    {achievement.rarity}
                  </span>
                  <span className="text-xs text-green-600">+{achievement.experience} XP</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Earned {achievement.earnedAt.toLocaleDateString()}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const BadgesTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {badges.map(badge => (
          <div key={badge.id} className="bg-white rounded-lg p-4 border shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{badge.icon}</div>
                <div>
                  <h3 className="font-semibold">{badge.name}</h3>
                  <p className="text-sm text-gray-600">{badge.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">
                  Level {badge.level}
                </div>
                <div className="text-xs text-gray-500">
                  {badge.progress}/{badge.nextThreshold}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${Math.min((badge.progress / badge.nextThreshold) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const LeaderboardTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Icons.Users className="w-5 h-5 text-yellow-500" />
            Global Leaderboard
          </h3>
        </div>
        <div className="divide-y">
          {leaderboard.map(player => (
            <div key={player.id} className={`p-4 flex items-center justify-between ${player.id === user.id ? 'bg-blue-50' : ''}`}>
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  player.rank === 1 ? 'bg-yellow-500' : 
                  player.rank === 2 ? 'bg-gray-400' : 
                  player.rank === 3 ? 'bg-orange-500' : 'bg-gray-500'
                }`}>
                  {player.rank}
                </div>
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold">
                  {player.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium">{player.name}</div>
                  <div className="text-sm text-gray-600">Level {player.level}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{player.experience.toLocaleString()}</div>
                <div className="text-sm text-gray-600">XP</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const LevelUpAnimation = () => (
    <AnimatePresence>
      {showLevelUpAnimation && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <motion.div
            className="bg-white rounded-lg p-8 text-center shadow-2xl"
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="text-6xl mb-4"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ 
                duration: 1,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              🎉
            </motion.div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Level Up!</h2>
            <p className="text-lg text-gray-600">
              You reached Level {user.level}: {user.title}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const NotificationPanel = () => (
    <AnimatePresence>
      {notifications.map(notification => (
        <motion.div
          key={notification.id}
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed top-4 right-4 bg-white rounded-lg shadow-lg border p-4 z-40 max-w-sm"
        >
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{notification.icon}</div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{notification.title}</h4>
              <p className="text-sm text-gray-600">{notification.message}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Icons.GamepadIcon className="w-8 h-8 text-green-500" />
            Gamification System
          </h2>
          <p className="text-gray-600">Track your progress and earn rewards</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon:Icons.BarChart3 },
            { id: 'quests', label: 'Quests', icon:Icons.Target },
            { id: 'achievements', label: 'Achievements', icon:Icons.Trophy },
            { id: 'badges', label: 'Badges', icon:Icons.Award },
            { id: 'leaderboard', label: 'Leaderboard', icon:Icons.Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'quests' && <QuestsTab />}
        {activeTab === 'achievements' && <AchievementsTab />}
        {activeTab === 'badges' && <BadgesTab />}
        {activeTab === 'leaderboard' && <LeaderboardTab />}
      </div>

      {/* Level Up Animation */}
      <LevelUpAnimation />

      {/* Notification Panel */}
      <NotificationPanel />
    </div>
  );
}