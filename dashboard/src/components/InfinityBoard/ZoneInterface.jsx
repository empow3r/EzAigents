import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useInfinityBoardStore } from '../../stores/infinityBoardStore';

// Zone-specific content components
const ZoneContent = {
  mind: MindZone,
  business: BusinessZone,
  health: HealthZone,
  wealth: WealthZone,
  relationships: RelationshipsZone,
  lifestyle: LifestyleZone,
  productivity: ProductivityZone,
  selfcare: SelfcareZone,
  communication: CommunicationZone,
  delegation: DelegationZone
};

function MindZone({ zoneData, theme }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20"
        >
          <h3 className="text-xl font-semibold text-white mb-4">Daily Affirmation</h3>
          <p className="text-white/80 italic">
            "I am building something extraordinary. Every action I take moves me closer to my vision."
          </p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20"
        >
          <h3 className="text-xl font-semibold text-white mb-4">Vision Board</h3>
          <div className="grid grid-cols-2 gap-2">
            {['🏠', '🚀', '💰', '❤️'].map((emoji, i) => (
              <div key={i} className="aspect-square bg-white/5 rounded-lg flex items-center justify-center text-3xl">
                {emoji}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function BusinessZone({ zoneData, theme }) {
  const projects = [
    { name: 'Launch Product X', progress: 75, deadline: '2024-02-15' },
    { name: 'Scale Marketing Campaign', progress: 45, deadline: '2024-02-28' },
    { name: 'Hire Key Team Member', progress: 30, deadline: '2024-03-01' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {projects.map((project, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20"
          >
            <h4 className="text-lg font-semibold text-white mb-2">{project.name}</h4>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-white/60 mb-1">
                <span>Progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="bg-gradient-to-r from-blue-400 to-purple-500 h-full rounded-full"
                />
              </div>
            </div>
            <p className="text-sm text-white/60">Due: {project.deadline}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function HealthZone({ zoneData, theme }) {
  return (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4">Today's Workout</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <span className="text-white">Morning Run</span>
            <span className="text-green-400">✓ Complete</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <span className="text-white">Strength Training</span>
            <span className="text-yellow-400">Scheduled 3 PM</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WealthZone({ zoneData, theme }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
          <h4 className="text-sm text-white/60 mb-2">Total Assets</h4>
          <p className="text-2xl font-bold text-white">$1,234,567</p>
          <p className="text-sm text-green-400">+12.5% this month</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
          <h4 className="text-sm text-white/60 mb-2">Monthly Cashflow</h4>
          <p className="text-2xl font-bold text-white">$45,678</p>
          <p className="text-sm text-green-400">+8.3% vs last month</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
          <h4 className="text-sm text-white/60 mb-2">Investment ROI</h4>
          <p className="text-2xl font-bold text-white">23.4%</p>
          <p className="text-sm text-green-400">Above target</p>
        </div>
      </div>
    </div>
  );
}

function RelationshipsZone({ zoneData, theme }) {
  return (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4">Connection Reminders</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <span className="text-white">Call Mom</span>
            <button className="text-sm px-3 py-1 bg-white/20 rounded-lg text-white">Today</button>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <span className="text-white">Team dinner planning</span>
            <button className="text-sm px-3 py-1 bg-white/20 rounded-lg text-white">This week</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LifestyleZone({ zoneData, theme }) {
  return (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4">Dream Board</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['🏝️ Bali Trip', '🏎️ Dream Car', '🏡 Beach House', '✈️ Private Jet'].map((dream, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="aspect-square bg-white/5 rounded-lg flex items-center justify-center text-center p-4"
            >
              <span className="text-white">{dream}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductivityZone({ zoneData, theme }) {
  return (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4">Today's Schedule</h3>
        <div className="space-y-2">
          {[
            { time: '9:00 AM', task: 'Deep Work Block', type: 'focus' },
            { time: '11:00 AM', task: 'Team Standup', type: 'meeting' },
            { time: '2:00 PM', task: 'Strategic Planning', type: 'planning' },
            { time: '4:00 PM', task: 'Email & Admin', type: 'admin' }
          ].map((item, i) => (
            <div key={i} className="flex items-center space-x-4 p-3 bg-white/5 rounded-lg">
              <span className="text-white/60 text-sm w-20">{item.time}</span>
              <span className="text-white flex-1">{item.task}</span>
              <span className={`text-xs px-2 py-1 rounded ${
                item.type === 'focus' ? 'bg-purple-500/20 text-purple-300' :
                item.type === 'meeting' ? 'bg-blue-500/20 text-blue-300' :
                item.type === 'planning' ? 'bg-green-500/20 text-green-300' :
                'bg-gray-500/20 text-gray-300'
              }`}>
                {item.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SelfcareZone({ zoneData, theme }) {
  return (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4">Wellness Practices</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4">
            <div className="text-4xl mb-2">🧘‍♂️</div>
            <p className="text-white">Morning Meditation</p>
            <p className="text-white/60 text-sm">20 min completed</p>
          </div>
          <div className="text-center p-4">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-white">Gratitude Journal</p>
            <p className="text-white/60 text-sm">3 entries today</p>
          </div>
          <div className="text-center p-4">
            <div className="text-4xl mb-2">🌙</div>
            <p className="text-white">Sleep Score</p>
            <p className="text-white/60 text-sm">8.5/10</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunicationZone({ zoneData, theme }) {
  return (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4">Unified Inbox</h3>
        <div className="space-y-3">
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-medium">Email</span>
              <span className="text-white/60 text-sm">12 new</span>
            </div>
            <p className="text-white/60 text-sm">3 require immediate response</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-medium">Slack</span>
              <span className="text-white/60 text-sm">5 mentions</span>
            </div>
            <p className="text-white/60 text-sm">2 DMs waiting</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DelegationZone({ zoneData, theme }) {
  return (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4">AI Agent Army</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'Research Agent', status: 'Analyzing competitors', progress: 65 },
            { name: 'Content Agent', status: 'Writing blog post', progress: 40 },
            { name: 'Data Agent', status: 'Processing analytics', progress: 90 },
            { name: 'Social Agent', status: 'Scheduling posts', progress: 100 }
          ].map((agent, i) => (
            <div key={i} className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">{agent.name}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  agent.progress === 100 ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {agent.progress === 100 ? 'Complete' : 'Active'}
                </span>
              </div>
              <p className="text-white/60 text-sm mb-2">{agent.status}</p>
              <div className="w-full bg-white/20 rounded-full h-1">
                <div
                  className="bg-gradient-to-r from-blue-400 to-purple-500 h-full rounded-full"
                  style={{ width: `${agent.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main Zone Interface Component
const ZoneInterface = ({ zone, onClose }) => {
  const { zoneProgress, theme } = useInfinityBoardStore();
  const zoneData = zoneProgress[zone.id];
  const ZoneComponent = ZoneContent[zone.id] || (() => <div>Zone under construction</div>);

  return (
    <div className="pointer-events-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 50 }}
        className="fixed inset-x-4 top-20 bottom-20 md:inset-x-20 lg:inset-x-40 bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-4">
            <span className="text-4xl">{zone.icon}</span>
            <div>
              <h2 className="text-2xl font-bold text-white">{zone.name}</h2>
              <p className="text-white/60">Level {zoneData.level} • Zone Progress</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Icons.X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(100%-8rem)]">
          <ZoneComponent zoneData={zoneData} theme={theme} />
        </div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-center space-x-4">
            <button className="px-6 py-2 bg-white/10 backdrop-blur-xl text-white rounded-lg hover:bg-white/20 transition-colors">
              Add Task
            </button>
            <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:scale-105 transition-transform">
              AI Optimize
            </button>
            <button className="px-6 py-2 bg-white/10 backdrop-blur-xl text-white rounded-lg hover:bg-white/20 transition-colors">
              View Analytics
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ZoneInterface;