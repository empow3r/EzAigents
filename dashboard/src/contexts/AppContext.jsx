'use client';
import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import apiCache from '@/services/unifiedApiCache';

// Initial state
const initialState = {
  agents: [],
  queues: {},
  tasks: [],
  metrics: {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    activeAgents: 0
  },
  ui: {
    activeTab: 'command',
    sidebarOpen: true,
    notifications: []
  },
  loading: {
    agents: false,
    queues: false,
    tasks: false
  },
  errors: {}
};

// Action types
const ActionTypes = {
  // Agent actions
  SET_AGENTS: 'SET_AGENTS',
  UPDATE_AGENT: 'UPDATE_AGENT',
  
  // Queue actions
  SET_QUEUES: 'SET_QUEUES',
  UPDATE_QUEUE: 'UPDATE_QUEUE',
  
  // Task actions
  SET_TASKS: 'SET_TASKS',
  ADD_TASK: 'ADD_TASK',
  UPDATE_TASK: 'UPDATE_TASK',
  REMOVE_TASK: 'REMOVE_TASK',
  
  // Metrics actions
  UPDATE_METRICS: 'UPDATE_METRICS',
  
  // UI actions
  SET_ACTIVE_TAB: 'SET_ACTIVE_TAB',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  
  // Loading actions
  SET_LOADING: 'SET_LOADING',
  
  // Error actions
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    // Agent reducers
    case ActionTypes.SET_AGENTS:
      return {
        ...state,
        agents: action.payload,
        metrics: {
          ...state.metrics,
          activeAgents: action.payload.filter(a => a.status === 'active').length
        }
      };
      
    case ActionTypes.UPDATE_AGENT:
      return {
        ...state,
        agents: state.agents.map(agent =>
          agent.id === action.payload.id ? { ...agent, ...action.payload } : agent
        )
      };
    
    // Queue reducers
    case ActionTypes.SET_QUEUES:
      return {
        ...state,
        queues: action.payload
      };
      
    case ActionTypes.UPDATE_QUEUE:
      return {
        ...state,
        queues: {
          ...state.queues,
          [action.payload.name]: action.payload.data
        }
      };
    
    // Task reducers
    case ActionTypes.SET_TASKS:
      return {
        ...state,
        tasks: action.payload,
        metrics: {
          ...state.metrics,
          totalTasks: action.payload.length,
          completedTasks: action.payload.filter(t => t.status === 'completed').length,
          failedTasks: action.payload.filter(t => t.status === 'failed').length
        }
      };
      
    case ActionTypes.ADD_TASK:
      return {
        ...state,
        tasks: [...state.tasks, action.payload],
        metrics: {
          ...state.metrics,
          totalTasks: state.metrics.totalTasks + 1
        }
      };
      
    case ActionTypes.UPDATE_TASK:
      const updatedTasks = state.tasks.map(task =>
        task.id === action.payload.id ? { ...task, ...action.payload } : task
      );
      return {
        ...state,
        tasks: updatedTasks,
        metrics: {
          ...state.metrics,
          completedTasks: updatedTasks.filter(t => t.status === 'completed').length,
          failedTasks: updatedTasks.filter(t => t.status === 'failed').length
        }
      };
      
    case ActionTypes.REMOVE_TASK:
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
        metrics: {
          ...state.metrics,
          totalTasks: state.metrics.totalTasks - 1
        }
      };
    
    // Metrics reducers
    case ActionTypes.UPDATE_METRICS:
      return {
        ...state,
        metrics: {
          ...state.metrics,
          ...action.payload
        }
      };
    
    // UI reducers
    case ActionTypes.SET_ACTIVE_TAB:
      return {
        ...state,
        ui: {
          ...state.ui,
          activeTab: action.payload
        }
      };
      
    case ActionTypes.TOGGLE_SIDEBAR:
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebarOpen: !state.ui.sidebarOpen
        }
      };
      
    case ActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [...state.ui.notifications, action.payload]
        }
      };
      
    case ActionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(n => n.id !== action.payload)
        }
      };
    
    // Loading reducers
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value
        }
      };
    
    // Error reducers
    case ActionTypes.SET_ERROR:
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.error
        }
      };
      
    case ActionTypes.CLEAR_ERROR:
      const { [action.payload]: _, ...restErrors } = state.errors;
      return {
        ...state,
        errors: restErrors
      };
    
    default:
      return state;
  }
};

// Create context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Memoized actions
  const actions = useMemo(() => ({
    // Agent actions
    setAgents: (agents) => dispatch({ type: ActionTypes.SET_AGENTS, payload: agents }),
    updateAgent: (agent) => dispatch({ type: ActionTypes.UPDATE_AGENT, payload: agent }),
    
    // Queue actions
    setQueues: (queues) => dispatch({ type: ActionTypes.SET_QUEUES, payload: queues }),
    updateQueue: (name, data) => dispatch({ 
      type: ActionTypes.UPDATE_QUEUE, 
      payload: { name, data } 
    }),
    
    // Task actions
    setTasks: (tasks) => dispatch({ type: ActionTypes.SET_TASKS, payload: tasks }),
    addTask: (task) => dispatch({ type: ActionTypes.ADD_TASK, payload: task }),
    updateTask: (task) => dispatch({ type: ActionTypes.UPDATE_TASK, payload: task }),
    removeTask: (taskId) => dispatch({ type: ActionTypes.REMOVE_TASK, payload: taskId }),
    
    // Metrics actions
    updateMetrics: (metrics) => dispatch({ type: ActionTypes.UPDATE_METRICS, payload: metrics }),
    
    // UI actions
    setActiveTab: (tab) => dispatch({ type: ActionTypes.SET_ACTIVE_TAB, payload: tab }),
    toggleSidebar: () => dispatch({ type: ActionTypes.TOGGLE_SIDEBAR }),
    addNotification: (notification) => {
      const id = Date.now();
      dispatch({ 
        type: ActionTypes.ADD_NOTIFICATION, 
        payload: { ...notification, id } 
      });
      
      // Auto-remove after duration
      if (notification.duration !== 0) {
        setTimeout(() => {
          dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id });
        }, notification.duration || 5000);
      }
      
      return id;
    },
    removeNotification: (id) => dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id }),
    
    // Loading actions
    setLoading: (key, value) => dispatch({ 
      type: ActionTypes.SET_LOADING, 
      payload: { key, value } 
    }),
    
    // Error actions
    setError: (key, error) => dispatch({ 
      type: ActionTypes.SET_ERROR, 
      payload: { key, error } 
    }),
    clearError: (key) => dispatch({ type: ActionTypes.CLEAR_ERROR, payload: key })
  }), []);

  // API methods with caching
  const api = useMemo(() => ({
    fetchAgents: async () => {
      actions.setLoading('agents', true);
      try {
        const { data } = await apiCache.fetch('/api/agents');
        actions.setAgents(data);
        return data;
      } catch (error) {
        actions.setError('agents', error.message);
        throw error;
      } finally {
        actions.setLoading('agents', false);
      }
    },
    
    fetchQueues: async () => {
      actions.setLoading('queues', true);
      try {
        const { data } = await apiCache.fetch('/api/queue-stats');
        actions.setQueues(data);
        return data;
      } catch (error) {
        actions.setError('queues', error.message);
        throw error;
      } finally {
        actions.setLoading('queues', false);
      }
    },
    
    fetchTasks: async () => {
      actions.setLoading('tasks', true);
      try {
        const { data } = await apiCache.fetch('/api/tasks');
        actions.setTasks(data);
        return data;
      } catch (error) {
        actions.setError('tasks', error.message);
        throw error;
      } finally {
        actions.setLoading('tasks', false);
      }
    }
  }), [actions]);

  // Memoized selectors
  const selectors = useMemo(() => ({
    getAgentById: (id) => state.agents.find(agent => agent.id === id),
    getActiveAgents: () => state.agents.filter(agent => agent.status === 'active'),
    getQueueByName: (name) => state.queues[name],
    getTasksByStatus: (status) => state.tasks.filter(task => task.status === status),
    getNotifications: () => state.ui.notifications,
    isLoading: (key) => state.loading[key] || false,
    getError: (key) => state.errors[key]
  }), [state]);

  const value = useMemo(() => ({
    state,
    actions,
    api,
    selectors
  }), [state, actions, api, selectors]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

// Convenience hooks for specific parts of state
export const useAgents = () => {
  const { state, actions, api } = useApp();
  return {
    agents: state.agents,
    loading: state.loading.agents,
    error: state.errors.agents,
    fetchAgents: api.fetchAgents,
    updateAgent: actions.updateAgent
  };
};

export const useTasks = () => {
  const { state, actions, api } = useApp();
  return {
    tasks: state.tasks,
    loading: state.loading.tasks,
    error: state.errors.tasks,
    fetchTasks: api.fetchTasks,
    addTask: actions.addTask,
    updateTask: actions.updateTask,
    removeTask: actions.removeTask
  };
};

export const useUI = () => {
  const { state, actions } = useApp();
  return {
    activeTab: state.ui.activeTab,
    sidebarOpen: state.ui.sidebarOpen,
    notifications: state.ui.notifications,
    setActiveTab: actions.setActiveTab,
    toggleSidebar: actions.toggleSidebar,
    addNotification: actions.addNotification,
    removeNotification: actions.removeNotification
  };
};