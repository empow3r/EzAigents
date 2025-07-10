import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, HardDrive, Network, Activity, Zap, Shield,
  ChevronRight, AlertCircle, CheckCircle, Info
} from 'lucide-react';
import soundService from '../services/safeSoundService';

// Holographic Button Component
const HolographicButton = ({ children, onClick, variant = 'primary', size = 'md', disabled = false }) => {
  const [isPressed, setIsPressed] = useState(false);
  
  const sizes = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const variants = {
    primary: 'from-cyan-500/20 to-blue-500/20 border-cyan-400',
    danger: 'from-red-500/20 to-pink-500/20 border-red-400',
    success: 'from-green-500/20 to-emerald-500/20 border-green-400',
    warning: 'from-yellow-500/20 to-orange-500/20 border-yellow-400'
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onClick={(e) => {
        if (!disabled) {
          soundService.play('perfectClick');
          onClick?.(e);
        }
      }}
      disabled={disabled}
      className={`
        relative overflow-hidden backdrop-blur-md
        bg-gradient-to-r ${variants[variant]}
        border rounded-lg font-medium
        transition-all duration-200
        ${sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Holographic shimmer */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{
          x: isPressed ? ['-100%', '200%'] : '-100%'
        }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Content */}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

// System Metric Display
const SystemMetric = ({ icon: Icon, label, value, maxValue = 100, color = 'cyan' }) => {
  const percentage = (value / maxValue) * 100;
  const isHigh = percentage > 80;
  
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 text-${color}-400`} />
          <span className="text-xs text-gray-400">{label}</span>
        </div>
        <span className={`text-sm font-bold ${isHigh ? 'text-red-400' : `text-${color}-400`}`}>
          {value}%
        </span>
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${isHigh ? 'bg-gradient-to-r from-red-500 to-red-400' : `bg-gradient-to-r from-${color}-500 to-${color}-400`}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

// Alert Notification
const AlertNotification = ({ type = 'info', message, onDismiss }) => {
  const typeConfig = {
    info: { icon: Info, color: 'blue', sound: 'notification' },
    success: { icon: CheckCircle, color: 'green', sound: 'success' },
    warning: { icon: AlertCircle, color: 'yellow', sound: 'warning' },
    error: { icon: AlertCircle, color: 'red', sound: 'error' }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    soundService.play(config.sound);
  }, [config.sound]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      className={`
        relative overflow-hidden
        bg-black/80 backdrop-blur-lg
        border border-${config.color}-400/50
        rounded-lg p-4 mb-2
        max-w-sm
      `}
    >
      {/* Glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-r from-${config.color}-500/20 to-transparent`} />
      
      <div className="relative z-10 flex items-start gap-3">
        <Icon className={`w-5 h-5 text-${config.color}-400 flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className="text-sm text-gray-200">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>
    </motion.div>
  );
};

// Command Palette
const CommandPalette = ({ isOpen, onClose, onAction }) => {
  const [search, setSearch] = useState('');
  
  const commands = [
    { id: 'deploy', label: 'Deploy Agents', icon: Zap, shortcut: '⌘D' },
    { id: 'analyze', label: 'Run Analysis', icon: Activity, shortcut: '⌘A' },
    { id: 'security', label: 'Security Scan', icon: Shield, shortcut: '⌘S' },
    { id: 'optimize', label: 'Optimize System', icon: Cpu, shortcut: '⌘O' },
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl z-50"
          >
            <div className="bg-black/90 backdrop-blur-xl border border-cyan-400/30 rounded-xl overflow-hidden">
              {/* Search Input */}
              <div className="p-4 border-b border-cyan-400/20">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type a command..."
                  className="w-full bg-transparent text-white placeholder-gray-400 outline-none text-lg"
                  autoFocus
                />
              </div>
              
              {/* Commands List */}
              <div className="max-h-96 overflow-y-auto">
                {filteredCommands.map((cmd, index) => {
                  const Icon = cmd.icon;
                  return (
                    <motion.button
                      key={cmd.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => {
                        onAction(cmd.id);
                        onClose();
                      }}
                      className="w-full p-4 flex items-center justify-between hover:bg-cyan-400/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-cyan-400" />
                        <span className="text-white">{cmd.label}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">{cmd.shortcut}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Main Futuristic UI Overlay
const FuturisticUIOverlay = ({ darkMode, systemStats, onAction }) => {
  const [alerts, setAlerts] = useState([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  
  // Add alert
  const addAlert = (type, message) => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, type, message }]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 5000);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Simulate alerts
  useEffect(() => {
    const interval = setInterval(() => {
      const types = ['info', 'success', 'warning'];
      const messages = [
        'Agent deployment successful',
        'System optimization complete',
        'New security update available',
        'High memory usage detected'
      ];
      
      if (Math.random() > 0.7) {
        addAlert(
          types[Math.floor(Math.random() * types.length)],
          messages[Math.floor(Math.random() * messages.length)]
        );
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Top Status Bar */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-40 pointer-events-none"
      >
        <div className="bg-black/50 backdrop-blur-lg border-b border-cyan-400/20">
          <div className="px-6 py-3">
            <div className="flex justify-between items-center">
              {/* System Metrics */}
              <div className="grid grid-cols-4 gap-8 pointer-events-auto">
                <SystemMetric icon={Cpu} label="CPU" value={systemStats.cpu} color="cyan" />
                <SystemMetric icon={HardDrive} label="Memory" value={systemStats.memory} color="purple" />
                <SystemMetric icon={Network} label="Network" value={systemStats.network} color="green" />
                <SystemMetric icon={Activity} label="Agents" value={systemStats.agents} maxValue={20} color="yellow" />
              </div>
              
              {/* Quick Actions */}
              <div className="flex gap-2 pointer-events-auto">
                <HolographicButton
                  onClick={() => setCommandPaletteOpen(true)}
                  size="sm"
                >
                  <span className="flex items-center gap-2">
                    ⌘K <ChevronRight className="w-3 h-3" />
                  </span>
                </HolographicButton>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Alert Notifications */}
      <div className="fixed top-24 right-6 z-50 pointer-events-none">
        <AnimatePresence>
          {alerts.map(alert => (
            <div key={alert.id} className="pointer-events-auto">
              <AlertNotification
                type={alert.type}
                message={alert.message}
                onDismiss={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onAction={(action) => {
          onAction(action);
          addAlert('success', `Command '${action}' executed`);
        }}
      />

      {/* Corner Decorations */}
      <div className="fixed top-0 left-0 w-32 h-32 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <path
            d="M0,20 L0,0 L20,0"
            stroke="cyan"
            strokeWidth="2"
            fill="none"
            opacity="0.5"
          />
          <path
            d="M0,10 L0,0 L10,0"
            stroke="cyan"
            strokeWidth="1"
            fill="none"
            opacity="0.3"
          />
        </svg>
      </div>
      
      <div className="fixed top-0 right-0 w-32 h-32 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <path
            d="M80,0 L100,0 L100,20"
            stroke="cyan"
            strokeWidth="2"
            fill="none"
            opacity="0.5"
          />
          <path
            d="M90,0 L100,0 L100,10"
            stroke="cyan"
            strokeWidth="1"
            fill="none"
            opacity="0.3"
          />
        </svg>
      </div>
    </>
  );
};

export default FuturisticUIOverlay;