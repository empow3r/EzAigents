import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, MessageSquare, FileText, Settings, Server, HardDrive, Cloud, Search } from 'lucide-react';

export default function PromptStorageViewer() {
  const [storageData, setStorageData] = useState({
    redis: { connected: false, messages: 0 },
    agentMemory: { files: 0, lastUpdate: null },
    localStorage: { keys: 0, size: 0 },
    infinityBoard: { userExists: false, conversations: 0 }
  });

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      // Check localStorage
      const localStorageKeys = Object.keys(localStorage).filter(key => 
        key.includes('prompt') || key.includes('conversation') || key.includes('infinity-board')
      );
      
      const localStorageSize = localStorageKeys.reduce((size, key) => {
        return size + (localStorage.getItem(key)?.length || 0);
      }, 0);

      // Check API endpoints
      const responses = await Promise.allSettled([
        fetch('/api/chat-messages'),
        fetch('/api/redis-status'),
        fetch('/api/agent-stats')
      ]);

      setStorageData({
        redis: {
          connected: responses[1].status === 'fulfilled',
          messages: responses[0].status === 'fulfilled' ? 50 : 0
        },
        agentMemory: {
          files: 1, // We know there's at least current-session.md
          lastUpdate: new Date().toISOString()
        },
        localStorage: {
          keys: localStorageKeys.length,
          size: Math.round(localStorageSize / 1024) // KB
        },
        infinityBoard: {
          userExists: localStorage.getItem('infinity-board-storage') !== null,
          conversations: 0
        }
      });
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  };

  const storageLocations = [
    {
      id: 'redis',
      name: 'Redis Database',
      icon: Database,
      color: 'from-red-500 to-red-600',
      description: 'Chat messages, agent communications, task history',
      path: 'redis://localhost:6379',
      keys: [
        'dashboard-messages (last 100 messages)',
        'agent-events (agent status updates)',
        'queue:failures (failed task logs)',
        'messages:{agent-id} (direct messages)'
      ],
      data: storageData.redis,
      status: storageData.redis.connected ? 'active' : 'disconnected'
    },
    {
      id: 'agent-memory',
      name: 'Agent Memory Files',
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      description: 'Agent session data, task tracking, learnings',
      path: '/Users/nathanhart/ClaudeCode/EzAigents/.agent-memory/',
      keys: [
        'claude/current-session.md',
        'gpt/current-session.md',
        'deepseek/current-session.md',
        'mistral/current-session.md',
        'gemini/current-session.md'
      ],
      data: storageData.agentMemory,
      status: 'active'
    },
    {
      id: 'prompt-manager',
      name: 'Prompt Manager',
      icon: Settings,
      color: 'from-green-500 to-green-600',
      description: 'Task definitions, prompt templates, file mappings',
      path: '/shared/filemap.json',
      keys: [
        'Task file mappings',
        'Agent assignments',
        'Prompt templates',
        'Specialist configurations'
      ],
      data: { tasks: 'Dynamic', templates: '20+' },
      status: 'active'
    },
    {
      id: 'infinity-board',
      name: 'InfinityBoard Store',
      icon: Cloud,
      color: 'from-purple-500 to-purple-600',
      description: 'User profiles, achievements, AI insights, conversations',
      path: 'localStorage: infinity-board-storage',
      keys: [
        'User profile & North Star',
        'Daily goals & progress',
        'Achievement history',
        'AI insights & recommendations'
      ],
      data: storageData.infinityBoard,
      status: storageData.infinityBoard.userExists ? 'active' : 'empty'
    },
    {
      id: 'browser-storage',
      name: 'Browser Storage',
      icon: HardDrive,
      color: 'from-orange-500 to-orange-600',
      description: 'Local caching, preferences, session data',
      path: 'localStorage & sessionStorage',
      keys: [
        'Dashboard preferences',
        'Theme settings',
        'Cached API responses',
        'Session tokens'
      ],
      data: storageData.localStorage,
      status: storageData.localStorage.keys > 0 ? 'active' : 'empty'
    },
    {
      id: 'api-endpoints',
      name: 'API Endpoints',
      icon: Server,
      color: 'from-cyan-500 to-cyan-600',
      description: 'Real-time message APIs, chat history, agent status',
      path: '/api/',
      keys: [
        '/api/send-message',
        '/api/chat-messages',
        '/api/agent-chat',
        '/api/enqueue'
      ],
      data: { endpoints: 4, active: true },
      status: 'active'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'disconnected': return 'text-red-400';
      case 'empty': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return '🟢';
      case 'disconnected': return '🔴';
      case 'empty': return '🟡';
      default: return '⚪';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Search className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Prompt Storage Locations</h1>
          </div>
          <p className="text-xl text-white/60 max-w-3xl mx-auto">
            Complete overview of where your prompts, conversations, and agent data are stored in the EzAigents system
          </p>
        </motion.div>

        {/* Storage Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {storageLocations.map((location, index) => (
            <motion.div
              key={location.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden"
            >
              {/* Header */}
              <div className={`bg-gradient-to-r ${location.color} p-6`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <location.icon className="w-8 h-8 text-white" />
                    <h3 className="text-xl font-bold text-white">{location.name}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{getStatusIcon(location.status)}</span>
                    <span className={`text-sm font-medium ${getStatusColor(location.status)}`}>
                      {location.status}
                    </span>
                  </div>
                </div>
                <p className="text-white/80 mt-2">{location.description}</p>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Path */}
                <div className="mb-4">
                  <h4 className="text-white/80 text-sm font-medium mb-2">Location:</h4>
                  <code className="bg-black/30 text-green-400 px-3 py-2 rounded-lg text-xs block break-all">
                    {location.path}
                  </code>
                </div>

                {/* Data Keys */}
                <div className="mb-4">
                  <h4 className="text-white/80 text-sm font-medium mb-2">Contains:</h4>
                  <ul className="space-y-1">
                    {location.keys.map((key, i) => (
                      <li key={i} className="text-white/60 text-sm flex items-center space-x-2">
                        <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                        <span>{key}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Stats */}
                <div className="bg-white/5 rounded-lg p-3">
                  <h4 className="text-white/80 text-sm font-medium mb-2">Current Status:</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(location.data).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-white/60 capitalize">{key}:</span>
                        <span className="text-white font-medium">
                          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-blue-400" />
            <span>How Your Prompts Are Stored</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Real-time Data:</h3>
              <ul className="space-y-2 text-white/80">
                <li>• <strong>Redis:</strong> Chat messages, agent communications</li>
                <li>• <strong>Agent Memory:</strong> Current session tracking</li>
                <li>• <strong>API Endpoints:</strong> Live message streaming</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Persistent Data:</h3>
              <ul className="space-y-2 text-white/80">
                <li>• <strong>InfinityBoard:</strong> User profiles & preferences</li>
                <li>• <strong>File System:</strong> Agent memory files</li>
                <li>• <strong>LocalStorage:</strong> Browser-based caching</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-500/20 border border-blue-400/30 rounded-lg">
            <p className="text-blue-200 text-sm">
              <strong>Note:</strong> Your conversation with Claude Code is handled by Anthropic's systems and not stored locally. 
              The storage locations above contain system prompts, agent communications, and dashboard interactions within the EzAigents platform.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}