import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ResearchHub from '../components/ResearchHub';
import * as LucideIcons from 'lucide-react';
const { ArrowLeft, Settings, Bell, HelpCircle } = LucideIcons;

const ResearchPage = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Simulate research notifications
    setNotifications([
      {
        id: 1,
        title: "AI Market Analysis Complete",
        message: "Your research project has generated 12 new insights",
        timestamp: "2 minutes ago",
        type: "success"
      },
      {
        id: 2,
        title: "Data Source Updated",
        message: "New competitive data available for analysis",
        timestamp: "15 minutes ago",
        type: "info"
      }
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onNavigate && onNavigate('overview')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            
            <div className="h-6 w-px bg-gray-300" />
            
            <nav className="flex items-center space-x-6">
              <button className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1">
                Research Hub
              </button>
              <button className="text-gray-600 hover:text-gray-900 transition-colors">
                Analytics
              </button>
              <button className="text-gray-600 hover:text-gray-900 transition-colors">
                Reports
              </button>
              <button className="text-gray-600 hover:text-gray-900 transition-colors">
                Automation
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <div className="relative">
              <button className="p-2 rounded-lg hover:bg-gray-100 relative">
                <Bell className="w-5 h-5 text-gray-600" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                )}
              </button>
            </div>

            {/* Help */}
            <button className="p-2 rounded-lg hover:bg-gray-100">
              <HelpCircle className="w-5 h-5 text-gray-600" />
            </button>

            {/* Settings */}
            <button className="p-2 rounded-lg hover:bg-gray-100">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Research Hub Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ResearchHub />
      </motion.div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 space-y-3">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center"
          title="Quick Research Assistant"
        >
          <span className="text-xl">🤖</span>
        </motion.button>
      </div>
    </div>
  );
};

export default ResearchPage;