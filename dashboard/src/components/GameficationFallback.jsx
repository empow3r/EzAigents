import React from 'react';
import * as Icons from 'lucide-react';

export default function GameficationFallback({ darkMode = true }) {
  return (
    <div className={`p-6 space-y-6 min-h-screen ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50'
    }`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Icons.Trophy className={`w-8 h-8 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Achievements
        </h1>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-xl border ${
          darkMode 
            ? 'bg-white/10 border-white/20 backdrop-blur-sm' 
            : 'bg-white/80 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Current Level
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Level 7
              </p>
            </div>
            <Icons.Star className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${
          darkMode 
            ? 'bg-white/10 border-white/20 backdrop-blur-sm' 
            : 'bg-white/80 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                XP Points
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                2,450
              </p>
            </div>
            <Icons.Award className={`w-8 h-8 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${
          darkMode 
            ? 'bg-white/10 border-white/20 backdrop-blur-sm' 
            : 'bg-white/80 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Tasks Completed
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                143/156
              </p>
            </div>
            <Icons.Trophy className={`w-8 h-8 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
          </div>
        </div>
      </div>

      {/* Recent Achievements */}
      <div className={`p-6 rounded-xl border ${
        darkMode 
          ? 'bg-white/10 border-white/20 backdrop-blur-sm' 
          : 'bg-white/80 border-gray-200'
      }`}>
        <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Recent Achievements
        </h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
            <span className="text-2xl">🤖</span>
            <div>
              <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Agent Whisperer
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Successfully deployed your first AI agent
              </p>
            </div>
            <span className={`ml-auto text-sm font-medium ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
              +100 XP
            </span>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20">
            <span className="text-2xl">⚡</span>
            <div>
              <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Speed Demon
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Complete 10 tasks in under an hour
              </p>
            </div>
            <span className={`ml-auto text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              +250 XP
            </span>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
            <span className="text-2xl">🔥</span>
            <div>
              <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                On Fire
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Maintain a 12-day coding streak
              </p>
            </div>
            <span className={`ml-auto text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
              +300 XP
            </span>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className={`p-4 rounded-lg border ${
        darkMode 
          ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' 
          : 'bg-blue-50 border-blue-200 text-blue-700'
      }`}>
        <p className="text-sm">
          🚀 The full gamification dashboard is loading... This is a simplified view with your key achievements and stats.
        </p>
      </div>
    </div>
  );
}