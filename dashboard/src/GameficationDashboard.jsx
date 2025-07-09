'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Star, 
  Zap, 
  Target, 
  Award, 
  Flame,
  TrendingUp,
  Clock,
  Code,
  GitBranch,
  CheckCircle,
  Medal,
  Crown,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@radix-ui/react-progress';

export default function GameficationDashboard() {
  const [userStats, setUserStats] = useState({
    level: 7,
    xp: 2450,
    xpToNext: 500,
    totalTasks: 156,
    completedTasks: 143,
    streak: 12,
    totalCodeLines: 15420,
    bugsFixed: 89,
    featuresBuilt: 23,
    testsWritten: 67
  });

  const [achievements, setAchievements] = useState([
    {
      id: 'first-agent',
      name: 'Agent Whisperer',
      description: 'Successfully deploy your first AI agent',
      icon: '🤖',
      unlocked: true,
      rarity: 'common',
      xpReward: 100,
      unlockedAt: Date.now() - 86400000
    },
    {
      id: 'speed-demon',
      name: 'Speed Demon',
      description: 'Complete 10 tasks in under an hour',
      icon: '⚡',
      unlocked: true,
      rarity: 'rare',
      xpReward: 250,
      unlockedAt: Date.now() - 43200000
    },
    {
      id: 'architect',
      name: 'Code Architect',
      description: 'Build a complete application with AI agents',
      icon: '🏗️',
      unlocked: true,
      rarity: 'epic',
      xpReward: 500,
      unlockedAt: Date.now() - 21600000
    },
    {
      id: 'perfectionist',
      name: 'Perfectionist',
      description: 'Achieve 100% test coverage on a project',
      icon: '💎',
      unlocked: false,
      rarity: 'legendary',
      xpReward: 1000,
      progress: 85
    },
    {
      id: 'marathon',
      name: 'Code Marathon',
      description: 'Maintain a 30-day coding streak',
      icon: '🏃‍♂️',
      unlocked: false,
      rarity: 'epic',
      xpReward: 750,
      progress: 40
    }
  ]);

  const [leaderboard, setLeaderboard] = useState([
    { rank: 1, name: 'You', xp: 2450, avatar: '👤', change: 0 },
    { rank: 2, name: 'CodeMaster92', xp: 2380, avatar: '🧙‍♂️', change: 1 },
    { rank: 3, name: 'AIEnthusiast', xp: 2340, avatar: '🚀', change: -1 },
    { rank: 4, name: 'DevNinja', xp: 2300, avatar: '🥷', change: 2 },
    { rank: 5, name: 'TechWizard', xp: 2250, avatar: '🔮', change: 0 }
  ]);

  const [currentQuests, setCurrentQuests] = useState([
    {
      id: 'daily-commit',
      title: 'Daily Commit',
      description: 'Make at least one commit today',
      type: 'daily',
      progress: 1,
      target: 1,
      xpReward: 50,
      completed: true
    },
    {
      id: 'agent-optimization',
      title: 'Agent Optimization',
      description: 'Optimize 3 agent configurations',
      type: 'weekly',
      progress: 2,
      target: 3,
      xpReward: 200,
      completed: false
    },
    {
      id: 'collaboration',
      title: 'Team Player',
      description: 'Collaborate with 5 different agents',
      type: 'weekly',
      progress: 3,
      target: 5,
      xpReward: 150,
      completed: false
    }
  ]);

  const [recentActivity, setRecentActivity] = useState([
    { type: 'achievement', message: 'Unlocked "Code Architect" achievement!', timestamp: Date.now() - 3600000 },
    { type: 'level', message: 'Reached level 7!', timestamp: Date.now() - 7200000 },
    { type: 'quest', message: 'Completed daily quest "Code Review"', timestamp: Date.now() - 10800000 },
    { type: 'xp', message: 'Earned 100 XP from bug fixes', timestamp: Date.now() - 14400000 }
  ]);

  const getRarityColor = (rarity) => {
    const colors = {
      common: 'text-gray-500 bg-gray-100',
      rare: 'text-blue-500 bg-blue-100',
      epic: 'text-purple-500 bg-purple-100',
      legendary: 'text-yellow-500 bg-yellow-100'
    };
    return colors[rarity] || colors.common;
  };

  const formatTimeAgo = (timestamp) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const LevelProgressRing = ({ level, xp, xpToNext }) => {
    const progress = (xp / (xp + xpToNext)) * 100;
    const radius = 40;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative w-20 h-20">
        <svg className="transform -rotate-90 w-20 h-20">
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="text-blue-500 transition-all duration-500 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{level}</div>
            <div className="text-xs text-gray-300">LVL</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center">
          <Crown className="mr-3 text-yellow-400" size={40} />
          Agent Commander Dashboard
          <Sparkles className="ml-3 text-pink-400" size={40} />
        </h1>
        <p className="text-gray-300">Level up your AI development skills</p>
      </motion.div>

      {/* Player Stats */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-8"
      >
        <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <LevelProgressRing 
                  level={userStats.level}
                  xp={userStats.xp}
                  xpToNext={userStats.xpToNext}
                />
                
                <div>
                  <h2 className="text-2xl font-bold text-white">Commander Level {userStats.level}</h2>
                  <p className="text-gray-300">{userStats.xp} XP • {userStats.xpToNext} XP to next level</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center text-orange-400">
                      <Flame size={16} className="mr-1" />
                      <span className="text-sm font-semibold">{userStats.streak} day streak</span>
                    </div>
                    <div className="flex items-center text-green-400">
                      <CheckCircle size={16} className="mr-1" />
                      <span className="text-sm">{userStats.completedTasks}/{userStats.totalTasks} tasks</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-white/5 rounded-lg p-3">
                  <Code className="mx-auto text-blue-400 mb-1" size={20} />
                  <div className="text-white font-bold">{userStats.totalCodeLines.toLocaleString()}</div>
                  <div className="text-xs text-gray-300">Lines of Code</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <Target className="mx-auto text-red-400 mb-1" size={20} />
                  <div className="text-white font-bold">{userStats.bugsFixed}</div>
                  <div className="text-xs text-gray-300">Bugs Fixed</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <Zap className="mx-auto text-yellow-400 mb-1" size={20} />
                  <div className="text-white font-bold">{userStats.featuresBuilt}</div>
                  <div className="text-xs text-gray-300">Features Built</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <GitBranch className="mx-auto text-green-400 mb-1" size={20} />
                  <div className="text-white font-bold">{userStats.testsWritten}</div>
                  <div className="text-xs text-gray-300">Tests Written</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Achievements */}
        <div className="lg:col-span-2">
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Trophy className="mr-2 text-yellow-400" size={24} />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border ${
                      achievement.unlocked 
                        ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30' 
                        : 'bg-white/5 border-gray-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`text-2xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold ${achievement.unlocked ? 'text-white' : 'text-gray-400'}`}>
                            {achievement.name}
                          </h3>
                          <p className={`text-sm ${achievement.unlocked ? 'text-gray-300' : 'text-gray-500'}`}>
                            {achievement.description}
                          </p>
                          {achievement.unlocked && achievement.unlockedAt && (
                            <p className="text-xs text-yellow-400 mt-1">
                              Unlocked {formatTimeAgo(achievement.unlockedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${getRarityColor(achievement.rarity)}`}>
                        {achievement.rarity}
                      </div>
                    </div>
                    
                    {!achievement.unlocked && achievement.progress && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Progress</span>
                          <span>{achievement.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${achievement.progress}%` }}
                            transition={{ duration: 1, delay: index * 0.1 }}
                            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Quests */}
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 mt-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Target className="mr-2 text-blue-400" size={24} />
                Active Quests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentQuests.map((quest, index) => (
                  <motion.div
                    key={quest.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border ${
                      quest.completed 
                        ? 'bg-green-500/20 border-green-500/30' 
                        : 'bg-white/5 border-gray-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className={`font-semibold ${quest.completed ? 'text-green-400' : 'text-white'}`}>
                            {quest.title}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs ${
                            quest.type === 'daily' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {quest.type}
                          </span>
                          {quest.completed && <CheckCircle className="text-green-400" size={16} />}
                        </div>
                        <p className={`text-sm ${quest.completed ? 'text-green-300' : 'text-gray-300'} mt-1`}>
                          {quest.description}
                        </p>
                        
                        {!quest.completed && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Progress: {quest.progress}/{quest.target}</span>
                              <span>{quest.xpReward} XP</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(quest.progress / quest.target) * 100}%` }}
                                transition={{ duration: 1, delay: index * 0.1 }}
                                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Leaderboard */}
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Medal className="mr-2 text-yellow-400" size={24} />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((player, index) => (
                  <motion.div
                    key={player.rank}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      player.name === 'You' 
                        ? 'bg-blue-500/20 border border-blue-500/30' 
                        : 'bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        player.rank === 1 ? 'bg-yellow-500 text-black' :
                        player.rank === 2 ? 'bg-gray-400 text-black' :
                        player.rank === 3 ? 'bg-orange-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {player.rank}
                      </div>
                      <span className="text-lg">{player.avatar}</span>
                      <div>
                        <div className={`font-medium ${player.name === 'You' ? 'text-blue-400' : 'text-white'}`}>
                          {player.name}
                        </div>
                        <div className="text-xs text-gray-400">{player.xp} XP</div>
                      </div>
                    </div>
                    
                    {player.change !== 0 && (
                      <div className={`flex items-center text-xs ${
                        player.change > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        <TrendingUp size={12} className={player.change < 0 ? 'rotate-180' : ''} />
                        <span className="ml-1">{Math.abs(player.change)}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Clock className="mr-2 text-green-400" size={24} />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-2 rounded-lg bg-white/5"
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'achievement' ? 'bg-yellow-400' :
                      activity.type === 'level' ? 'bg-blue-400' :
                      activity.type === 'quest' ? 'bg-green-400' :
                      'bg-purple-400'
                    }`} />
                    <div className="flex-1">
                      <p className="text-white text-sm">{activity.message}</p>
                      <p className="text-gray-400 text-xs">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}