import { useState, useEffect, useCallback } from 'react';

export function useGamification() {
  const [user, setUser] = useState({
    id: 'user-1',
    name: 'Developer',
    level: 1,
    experience: 0,
    title: 'Novice Orchestrator',
    avatar: '/avatar-default.png'
  });

  const [achievements, setAchievements] = useState([]);
  const [badges, setBadges] = useState([]);
  const [streaks, setStreaks] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [dailyQuests, setDailyQuests] = useState([]);
  const [weeklyQuests, setWeeklyQuests] = useState([]);
  const [seasonalEvents, setSeasonalEvents] = useState([]);

  // Experience and level system
  const experienceThresholds = [
    0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000
  ];

  const titles = [
    'Novice Orchestrator',
    'Apprentice Conductor',
    'Agent Supervisor',
    'Task Master',
    'System Architect',
    'Multi-Agent Specialist',
    'Orchestration Expert',
    'AI Whisperer',
    'Automation Sage',
    'Grand Master of Agents',
    'Legendary Orchestrator'
  ];

  const calculateLevel = useCallback((experience) => {
    for (let i = experienceThresholds.length - 1; i >= 0; i--) {
      if (experience >= experienceThresholds[i]) {
        return i;
      }
    }
    return 0;
  }, []);

  const getExperienceForNextLevel = useCallback((level) => {
    return experienceThresholds[level + 1] || experienceThresholds[experienceThresholds.length - 1];
  }, []);

  const addExperience = useCallback((amount, source = 'general') => {
    setUser(prevUser => {
      const newExperience = prevUser.experience + amount;
      const newLevel = calculateLevel(newExperience);
      const leveledUp = newLevel > prevUser.level;
      
      if (leveledUp) {
        // Trigger level up event
        window.dispatchEvent(new CustomEvent('levelUp', {
          detail: { 
            oldLevel: prevUser.level, 
            newLevel, 
            title: titles[newLevel] || titles[titles.length - 1] 
          }
        }));
      }

      // Track experience gain
      trackActivity('experience_gained', { amount, source, leveledUp });

      return {
        ...prevUser,
        experience: newExperience,
        level: newLevel,
        title: titles[newLevel] || titles[titles.length - 1]
      };
    });
  }, [calculateLevel]);

  // Achievement system
  const achievementDefinitions = {
    'first-agent': {
      id: 'first-agent',
      name: 'First Contact',
      description: 'Deploy your first agent',
      icon: '🤖',
      rarity: 'common',
      experience: 50,
      condition: (stats) => stats.agentsDeployed >= 1
    },
    'task-master': {
      id: 'task-master',
      name: 'Task Master',
      description: 'Complete 100 tasks',
      icon: '📋',
      rarity: 'rare',
      experience: 200,
      condition: (stats) => stats.tasksCompleted >= 100
    },
    'speed-demon': {
      id: 'speed-demon',
      name: 'Speed Demon',
      description: 'Complete 10 tasks in under 1 minute',
      icon: '⚡',
      rarity: 'epic',
      experience: 300,
      condition: (stats) => stats.fastTasks >= 10
    },
    'orchestrator': {
      id: 'orchestrator',
      name: 'Master Orchestrator',
      description: 'Manage 10 agents simultaneously',
      icon: '🎭',
      rarity: 'legendary',
      experience: 500,
      condition: (stats) => stats.maxSimultaneousAgents >= 10
    },
    'troubleshooter': {
      id: 'troubleshooter',
      name: 'Troubleshooter',
      description: 'Fix 50 failed tasks',
      icon: '🔧',
      rarity: 'rare',
      experience: 250,
      condition: (stats) => stats.failedTasksFixed >= 50
    },
    'night-owl': {
      id: 'night-owl',
      name: 'Night Owl',
      description: 'Complete tasks after midnight',
      icon: '🦉',
      rarity: 'uncommon',
      experience: 100,
      condition: (stats) => stats.nightTasks >= 20
    },
    'weekend-warrior': {
      id: 'weekend-warrior',
      name: 'Weekend Warrior',
      description: 'Work on weekends for 4 consecutive weeks',
      icon: '⚔️',
      rarity: 'rare',
      experience: 200,
      condition: (stats) => stats.weekendStreaks >= 4
    },
    'efficiency-expert': {
      id: 'efficiency-expert',
      name: 'Efficiency Expert',
      description: 'Achieve 95% task success rate',
      icon: '📊',
      rarity: 'epic',
      experience: 400,
      condition: (stats) => stats.successRate >= 0.95 && stats.tasksCompleted >= 50
    }
  };

  const checkAchievements = useCallback((stats) => {
    const newAchievements = [];
    
    Object.values(achievementDefinitions).forEach(achievement => {
      const alreadyEarned = achievements.find(a => a.id === achievement.id);
      if (!alreadyEarned && achievement.condition(stats)) {
        newAchievements.push({
          ...achievement,
          earnedAt: new Date(),
          progress: 100
        });
        addExperience(achievement.experience, 'achievement');
      }
    });

    if (newAchievements.length > 0) {
      setAchievements(prev => [...prev, ...newAchievements]);
      
      // Trigger achievement unlock event
      newAchievements.forEach(achievement => {
        window.dispatchEvent(new CustomEvent('achievementUnlocked', {
          detail: achievement
        }));
      });
    }
  }, [achievements, addExperience]);

  // Badge system
  const badgeDefinitions = {
    'early-bird': {
      id: 'early-bird',
      name: 'Early Bird',
      description: 'Complete tasks before 8 AM',
      icon: '🌅',
      levels: [5, 20, 50, 100],
      rewards: [25, 50, 100, 200]
    },
    'perfectionist': {
      id: 'perfectionist',
      name: 'Perfectionist',
      description: 'Complete tasks with no errors',
      icon: '💎',
      levels: [10, 50, 100, 250],
      rewards: [50, 100, 200, 400]
    },
    'collaborator': {
      id: 'collaborator',
      name: 'Collaborator',
      description: 'Use collaboration features',
      icon: '🤝',
      levels: [5, 25, 100, 500],
      rewards: [30, 75, 150, 300]
    },
    'voice-commander': {
      id: 'voice-commander',
      name: 'Voice Commander',
      description: 'Use voice commands',
      icon: '🎤',
      levels: [10, 50, 200, 1000],
      rewards: [40, 80, 160, 320]
    }
  };

  const updateBadgeProgress = useCallback((badgeId, increment = 1) => {
    setBadges(prevBadges => {
      const existingBadge = prevBadges.find(b => b.id === badgeId);
      const badgeDefinition = badgeDefinitions[badgeId];
      
      if (!badgeDefinition) return prevBadges;

      const currentProgress = existingBadge ? existingBadge.progress : 0;
      const newProgress = currentProgress + increment;
      const currentLevel = existingBadge ? existingBadge.level : 0;
      
      // Check if we've reached a new level
      let newLevel = currentLevel;
      for (let i = currentLevel; i < badgeDefinition.levels.length; i++) {
        if (newProgress >= badgeDefinition.levels[i]) {
          newLevel = i + 1;
          addExperience(badgeDefinition.rewards[i], 'badge');
          
          // Trigger badge level up event
          window.dispatchEvent(new CustomEvent('badgeLevelUp', {
            detail: { 
              badgeId, 
              level: newLevel, 
              name: badgeDefinition.name 
            }
          }));
        }
      }

      const updatedBadge = {
        id: badgeId,
        name: badgeDefinition.name,
        description: badgeDefinition.description,
        icon: badgeDefinition.icon,
        progress: newProgress,
        level: newLevel,
        maxLevel: badgeDefinition.levels.length,
        nextThreshold: badgeDefinition.levels[newLevel] || badgeDefinition.levels[badgeDefinition.levels.length - 1]
      };

      if (existingBadge) {
        return prevBadges.map(b => b.id === badgeId ? updatedBadge : b);
      } else {
        return [...prevBadges, updatedBadge];
      }
    });
  }, [addExperience]);

  // Quest system
  const generateDailyQuests = useCallback(() => {
    const questTemplates = [
      { id: 'complete-tasks', name: 'Complete {count} tasks', target: 5, reward: 50, type: 'tasks' },
      { id: 'deploy-agents', name: 'Deploy {count} agents', target: 2, reward: 30, type: 'agents' },
      { id: 'use-voice', name: 'Use voice commands {count} times', target: 10, reward: 40, type: 'voice' },
      { id: 'fix-errors', name: 'Fix {count} failed tasks', target: 3, reward: 60, type: 'fixes' },
      { id: 'collaborate', name: 'Use collaboration features', target: 1, reward: 25, type: 'collaboration' }
    ];

    const selectedQuests = questTemplates
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(template => ({
        ...template,
        id: `${template.id}-${Date.now()}`,
        name: template.name.replace('{count}', template.target),
        progress: 0,
        completed: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }));

    setDailyQuests(selectedQuests);
  }, []);

  const generateWeeklyQuests = useCallback(() => {
    const weeklyTemplates = [
      { id: 'weekly-tasks', name: 'Complete {count} tasks this week', target: 50, reward: 200, type: 'tasks' },
      { id: 'maintain-streak', name: 'Maintain daily streak for 7 days', target: 7, reward: 300, type: 'streak' },
      { id: 'explore-features', name: 'Use all dashboard features', target: 8, reward: 250, type: 'features' },
      { id: 'optimize-system', name: 'Achieve 90% success rate', target: 0.9, reward: 400, type: 'optimization' }
    ];

    const selectedQuest = weeklyTemplates[Math.floor(Math.random() * weeklyTemplates.length)];
    
    setWeeklyQuests([{
      ...selectedQuest,
      id: `${selectedQuest.id}-${Date.now()}`,
      name: selectedQuest.name.replace('{count}', selectedQuest.target),
      progress: 0,
      completed: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }]);
  }, []);

  const updateQuestProgress = useCallback((questType, increment = 1) => {
    setDailyQuests(prevQuests => 
      prevQuests.map(quest => {
        if (quest.type === questType && !quest.completed) {
          const newProgress = quest.progress + increment;
          const completed = newProgress >= quest.target;
          
          if (completed) {
            addExperience(quest.reward, 'quest');
            window.dispatchEvent(new CustomEvent('questCompleted', {
              detail: { quest: quest.name, reward: quest.reward }
            }));
          }
          
          return { ...quest, progress: newProgress, completed };
        }
        return quest;
      })
    );

    setWeeklyQuests(prevQuests => 
      prevQuests.map(quest => {
        if (quest.type === questType && !quest.completed) {
          const newProgress = quest.progress + increment;
          const completed = newProgress >= quest.target;
          
          if (completed) {
            addExperience(quest.reward, 'quest');
            window.dispatchEvent(new CustomEvent('questCompleted', {
              detail: { quest: quest.name, reward: quest.reward }
            }));
          }
          
          return { ...quest, progress: newProgress, completed };
        }
        return quest;
      })
    );
  }, [addExperience]);

  // Activity tracking
  const trackActivity = useCallback((activity, data = {}) => {
    const activityLog = {
      activity,
      timestamp: new Date(),
      data,
      experience: data.experience || 0
    };

    // Store in localStorage for persistence
    const activities = JSON.parse(localStorage.getItem('gamificationActivities') || '[]');
    activities.push(activityLog);
    
    // Keep only last 1000 activities
    if (activities.length > 1000) {
      activities.splice(0, activities.length - 1000);
    }
    
    localStorage.setItem('gamificationActivities', JSON.stringify(activities));

    // Update quest progress based on activity
    switch (activity) {
      case 'task_completed':
        updateQuestProgress('tasks');
        updateBadgeProgress('perfectionist');
        break;
      case 'agent_deployed':
        updateQuestProgress('agents');
        break;
      case 'voice_command_used':
        updateQuestProgress('voice');
        updateBadgeProgress('voice-commander');
        break;
      case 'task_fixed':
        updateQuestProgress('fixes');
        break;
      case 'collaboration_used':
        updateQuestProgress('collaboration');
        updateBadgeProgress('collaborator');
        break;
      case 'early_morning_task':
        updateBadgeProgress('early-bird');
        break;
    }
  }, [updateQuestProgress, updateBadgeProgress]);

  // Seasonal events
  const checkSeasonalEvents = useCallback(() => {
    const now = new Date();
    const events = [];

    // Holiday events
    if (now.getMonth() === 11 && now.getDate() >= 20) { // December 20-31
      events.push({
        id: 'winter-celebration',
        name: 'Winter Celebration',
        description: 'Double experience for all activities!',
        icon: '🎄',
        multiplier: 2,
        endsAt: new Date(now.getFullYear() + 1, 0, 1)
      });
    }

    // New Year event
    if (now.getMonth() === 0 && now.getDate() <= 7) { // January 1-7
      events.push({
        id: 'new-year-resolution',
        name: 'New Year Resolution',
        description: 'Special achievements available!',
        icon: '🎆',
        bonusAchievements: true,
        endsAt: new Date(now.getFullYear(), 0, 7)
      });
    }

    // Summer productivity boost
    if (now.getMonth() >= 5 && now.getMonth() <= 7) { // June-August
      events.push({
        id: 'summer-productivity',
        name: 'Summer Productivity Challenge',
        description: 'Complete daily streaks for bonus rewards!',
        icon: '☀️',
        streakBonus: true,
        endsAt: new Date(now.getFullYear(), 8, 1)
      });
    }

    setSeasonalEvents(events);
  }, []);

  // Leaderboard
  const updateLeaderboard = useCallback(() => {
    // In a real app, this would fetch from a server
    const mockLeaderboard = [
      { id: 'user-1', name: 'Developer', level: user.level, experience: user.experience, rank: 1 },
      { id: 'user-2', name: 'AgentMaster', level: 8, experience: 15000, rank: 2 },
      { id: 'user-3', name: 'TaskRunner', level: 7, experience: 12000, rank: 3 },
      { id: 'user-4', name: 'AutomationPro', level: 6, experience: 8000, rank: 4 },
      { id: 'user-5', name: 'CodeWhisperer', level: 5, experience: 4500, rank: 5 }
    ].sort((a, b) => b.experience - a.experience)
     .map((user, index) => ({ ...user, rank: index + 1 }));

    setLeaderboard(mockLeaderboard);
  }, [user.level, user.experience]);

  // Initialize gamification system
  useEffect(() => {
    // Load saved data
    const savedData = localStorage.getItem('gamificationData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setUser(data.user || user);
      setAchievements(data.achievements || []);
      setBadges(data.badges || []);
      setStreaks(data.streaks || streaks);
    }

    // Generate initial quests
    generateDailyQuests();
    generateWeeklyQuests();
    checkSeasonalEvents();
    updateLeaderboard();
  }, []);

  // Save data periodically
  useEffect(() => {
    const saveData = () => {
      const data = {
        user,
        achievements,
        badges,
        streaks,
        lastSaved: new Date()
      };
      localStorage.setItem('gamificationData', JSON.stringify(data));
    };

    const interval = setInterval(saveData, 30000); // Save every 30 seconds
    return () => clearInterval(interval);
  }, [user, achievements, badges, streaks]);

  // Daily quest reset
  useEffect(() => {
    const resetDailyQuests = () => {
      const lastReset = localStorage.getItem('lastDailyReset');
      const today = new Date().toDateString();
      
      if (lastReset !== today) {
        generateDailyQuests();
        localStorage.setItem('lastDailyReset', today);
        
        // Update daily streak
        setStreaks(prev => ({ ...prev, daily: prev.daily + 1 }));
      }
    };

    resetDailyQuests();
    const interval = setInterval(resetDailyQuests, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [generateDailyQuests]);

  return {
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
    checkAchievements,
    updateBadgeProgress,
    updateQuestProgress,
    getExperienceForNextLevel,
    calculateLevel,
    experienceThresholds,
    titles,
    achievementDefinitions,
    badgeDefinitions
  };
}