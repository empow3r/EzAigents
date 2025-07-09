'use client';
import React, { useState, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import AgentDashboard from './AgentDashboard';
import EnhancedAgentDashboard from './EnhancedAgentDashboard';
import Agent3DWorkspace from './Agent3DWorkspace';
import CodeDiffViewer from './CodeDiffViewer';
import GameficationDashboard from './GameficationDashboard';
import ProjectDashboard from './ProjectDashboard';
import PromptManager from './PromptManager';
import EnhancementDashboard from './components/EnhancementDashboard';
import EnhancementCommandCenter from './components/EnhancementCommandCenter';
import ResponsiveLayout from './components/ResponsiveLayout';
import ChatDashboard from './components/ChatDashboard';
import TTSManager from './components/TTSManager';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Zap, 
  Box, 
  GitCompare, 
  Trophy, 
  Settings,
  Moon,
  Sun,
  Sparkles,
  GitBranch,
  MessageCircle,
  Volume2
} from 'lucide-react';

export default function MainDashboard() {
  const [activeTab, setActiveTab] = useState('enhancements');
  const [darkMode, setDarkMode] = useState(true);

  const tabs = [
    { id: 'command', name: 'Command Center', icon: Zap, component: EnhancementCommandCenter },
    { id: 'project', name: 'Project Status', icon: GitBranch, component: ProjectDashboard },
    { id: 'enhanced', name: 'Enhanced Dashboard', icon: Sparkles, component: EnhancedAgentDashboard },
    { id: 'chat', name: 'Agent Chat', icon: MessageCircle, component: ChatDashboard },
    { id: 'tts', name: 'Text-to-Speech', icon: Volume2, component: TTSManager },
    { id: 'dashboard', name: 'Classic Dashboard', icon: BarChart3, component: AgentDashboard },
    { id: 'workspace', name: '3D Workspace', icon: Box, component: Agent3DWorkspace },
    { id: 'diffs', name: 'Code Diffs', icon: GitCompare, component: CodeDiffViewer },
    { id: 'gamification', name: 'Achievements', icon: Trophy, component: GameficationDashboard },
    { id: 'prompts', name: 'Prompt Manager', icon: Settings, component: PromptManager },
    { id: 'enhancements', name: 'Enhancements', icon: Settings, component: EnhancementDashboard }
  ];

  const activeComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <ResponsiveLayout 
      currentPage={activeTab} 
      onPageChange={setActiveTab}
    >
      <div className={`min-h-screen transition-all duration-300 ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}>
      {/* Futuristic Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`backdrop-blur-sm border-b transition-all duration-300 ${
          darkMode 
            ? 'bg-black/20 border-white/10' 
            : 'bg-white/20 border-black/10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <motion.div 
              className="flex items-center space-x-4"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative">
                <motion.img
                  src={darkMode ? "/logo.svg" : "/logo-light.svg"}
                  alt="Ez Aigent Logo"
                  className="h-10 w-auto"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                />
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -inset-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-sm"
                />
              </div>
              <div>
                <h1 className={`text-2xl font-bold transition-colors ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Command Center
                </h1>
                <p className={`text-sm transition-colors ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Next-generation AI agent orchestration
                </p>
              </div>
            </motion.div>
            
            <div className="flex items-center space-x-2">
              {/* Theme Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-all ${
                  darkMode 
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                    : 'bg-blue-500/20 text-blue-600 hover:bg-blue-500/30'
                }`}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </motion.button>

              {/* Tab Navigation */}
              <div className={`flex rounded-lg p-1 transition-all ${
                darkMode 
                  ? 'bg-white/10 backdrop-blur-sm' 
                  : 'bg-black/10 backdrop-blur-sm'
              }`}>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
                        activeTab === tab.id
                          ? darkMode
                            ? 'bg-white/20 text-white shadow-lg'
                            : 'bg-black/20 text-gray-900 shadow-lg'
                          : darkMode
                            ? 'text-gray-300 hover:text-white hover:bg-white/10'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-black/10'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="hidden sm:inline">{tab.name}</span>
                      
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className={`absolute inset-0 rounded-md ${
                            darkMode 
                              ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20' 
                              : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10'
                          }`}
                          style={{ zIndex: -1 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.header>
      
      {/* Main Content */}
      <main className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {activeComponent && React.createElement(activeComponent)}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: darkMode ? '#1F2937' : '#FFFFFF',
            color: darkMode ? '#FFFFFF' : '#1F2937',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)'
          }
        }}
      />

      {/* Background Animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            background: darkMode 
              ? [
                  'radial-gradient(circle at 20% 20%, rgba(120, 119, 198, 0.1) 0%, transparent 50%)',
                  'radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.1) 0%, transparent 50%)',
                  'radial-gradient(circle at 40% 60%, rgba(120, 219, 255, 0.1) 0%, transparent 50%)'
                ]
              : [
                  'radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)',
                  'radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)',
                  'radial-gradient(circle at 40% 60%, rgba(34, 197, 94, 0.05) 0%, transparent 50%)'
                ]
          }}
          transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute inset-0"
        />
      </div>
      </div>
    </ResponsiveLayout>
  );
}