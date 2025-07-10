import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useInfinityBoardStore = create(
  persist(
    (set, get) => ({
      // User data
      user: {
        name: '',
        northStar: '',
        hasCompletedOnboarding: false,
        level: 1,
        experience: 0,
        tokens: 0,
        achievements: []
      },

      // Theme
      theme: 'futurist', // luxe, zen, futurist

      // Daily goals
      dailyGoals: [],
      
      // Zone progress
      zoneProgress: {
        mind: { level: 1, tasks: [], insights: [] },
        business: { level: 1, projects: [], metrics: {} },
        health: { level: 1, workouts: [], biometrics: {} },
        wealth: { level: 1, assets: [], cashflow: {} },
        relationships: { level: 1, connections: [], reminders: [] },
        lifestyle: { level: 1, dreams: [], goals: [] },
        productivity: { level: 1, tasks: [], schedules: [] },
        selfcare: { level: 1, practices: [], reflections: [] },
        communication: { level: 1, messages: [], templates: [] },
        delegation: { level: 1, agents: [], tasks: [] }
      },

      // AI Insights
      aiInsights: {
        dailyFocus: '',
        recommendations: [],
        warnings: []
      },

      // Actions
      setUser: (userData) => set({ user: { ...get().user, ...userData } }),
      setTheme: (theme) => set({ theme }),
      
      updateZoneProgress: (zoneId, data) => set((state) => ({
        zoneProgress: {
          ...state.zoneProgress,
          [zoneId]: { ...state.zoneProgress[zoneId], ...data }
        }
      })),

      addExperience: (amount) => set((state) => {
        const newExp = state.user.experience + amount;
        const newLevel = Math.floor(newExp / 1000) + 1;
        return {
          user: {
            ...state.user,
            experience: newExp,
            level: newLevel,
            tokens: state.user.tokens + Math.floor(amount / 10)
          }
        };
      }),

      completeOnboarding: (userData) => set({
        user: {
          ...get().user,
          ...userData,
          hasCompletedOnboarding: true
        }
      }),

      addAchievement: (achievement) => set((state) => ({
        user: {
          ...state.user,
          achievements: [...state.user.achievements, achievement]
        }
      })),

      setDailyGoals: (goals) => set({ dailyGoals: goals }),
      
      updateAIInsights: (insights) => set({ aiInsights: { ...get().aiInsights, ...insights } })
    }),
    {
      name: 'infinity-board-storage'
    }
  )
);