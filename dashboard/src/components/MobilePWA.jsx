import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, 
  Download, 
  Wifi, 
  WifiOff, 
  Bell, 
  RefreshCw as Sync, 
  Navigation,
  Vibrate,
  Battery,
  Signal
} from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { useGestures } from '../hooks/useGestures';

export default function MobilePWA({ screenSize, isMobile, isTablet }) {
  const {
    isInstalled,
    isOnline,
    syncStatus,
    canInstall,
    installApp,
    registerServiceWorker,
    requestNotificationPermission,
    subscribeToNotifications,
    storeTaskForSync,
    syncPendingTasks
  } = usePWA();

  const { gestureState, handlers, enableShakeDetection, disableShakeDetection } = useGestures();

  const [installPromptShown, setInstallPromptShown] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true);

  useEffect(() => {
    // Register service worker on mount
    registerServiceWorker();

    // Get battery status
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        setBatteryLevel(Math.round(battery.level * 100));
        
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }

    // Enable shake detection
    enableShakeDetection();

    return () => {
      disableShakeDetection();
    };
  }, []);

  // Handle gesture events
  useEffect(() => {
    const handleGesture = (e) => {
      const { type, direction, force } = e.detail;
      
      if (type === 'swipe' && direction === 'down') {
        // Pull to refresh
        window.location.reload();
      } else if (type === 'shake' && force > 20) {
        // Shake to sync
        syncPendingTasks();
        if (isVibrationEnabled && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      }
    };

    window.addEventListener('gesture', handleGesture);
    return () => window.removeEventListener('gesture', handleGesture);
  }, [isVibrationEnabled, syncPendingTasks]);

  const handleInstallApp = async () => {
    const success = await installApp();
    if (success) {
      setInstallPromptShown(true);
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationPermission('granted');
      await subscribeToNotifications();
    }
  };

  const PWAInstallPrompt = () => (
    <AnimatePresence>
      {canInstall && !installPromptShown && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg shadow-lg z-50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Smartphone className="w-6 h-6" />
              <div>
                <p className="font-semibold">Install EzAugent</p>
                <p className="text-sm opacity-90">Get the full mobile experience</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setInstallPromptShown(true)}
                className="px-3 py-1 text-sm bg-white/20 rounded"
              >
                Later
              </button>
              <button
                onClick={handleInstallApp}
                className="px-3 py-1 text-sm bg-white text-blue-600 rounded font-medium"
              >
                Install
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );



  const MobileControls = () => (
    <div className={`bg-white dark:bg-gray-800 rounded-lg ${isMobile ? 'p-3' : 'p-4'} shadow-lg`}>
      <h3 className={`font-semibold mb-4 flex items-center ${isMobile ? 'text-sm' : ''}`}>
        <Smartphone className={`${isMobile ? 'w-4 h-4 mr-1' : 'w-5 h-5 mr-2'}`} />
        {isMobile ? 'Controls' : 'Mobile Controls'}
      </h3>
      
      <div className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className={isMobile ? 'text-sm' : ''}>Connection</span>
          <div className="flex items-center space-x-2 text-sm">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-green-500">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-red-500">Offline</span>
              </>
            )}
          </div>
        </div>

        {/* Sync Status */}
        <div className="flex items-center justify-between">
          <span>Sync</span>
          <div className="flex items-center space-x-2 text-sm">
            <Sync className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span className={`${
              syncStatus === 'completed' ? 'text-green-500' : 
              syncStatus === 'failed' ? 'text-red-500' : 
              'text-gray-500'
            }`}>
              {syncStatus === 'syncing' ? 'Syncing...' : 
               syncStatus === 'completed' ? 'Synced' : 
               syncStatus === 'failed' ? 'Sync Failed' : 'Idle'}
            </span>
          </div>
        </div>

        {/* Battery Status */}
        <div className="flex items-center justify-between">
          <span>Battery</span>
          <div className="flex items-center space-x-2">
            <Battery className="w-4 h-4" />
            <span className="text-sm">{batteryLevel}%</span>
          </div>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex items-center space-x-2">
            <Bell className={`w-4 h-4 ${notificationPermission === 'granted' ? 'text-green-500' : 'text-gray-400'}`} />
            {notificationPermission === 'granted' ? (
              <span className="text-green-500 text-sm">Enabled</span>
            ) : (
              <button
                onClick={handleEnableNotifications}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded"
              >
                Enable
              </button>
            )}
          </div>
        </div>

        {/* Vibration */}
        <div className="flex items-center justify-between">
          <span>Vibration</span>
          <button
            onClick={() => setIsVibrationEnabled(!isVibrationEnabled)}
            className="flex items-center space-x-2"
          >
            <Vibrate className={`w-4 h-4 ${isVibrationEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
            <span className={`text-sm ${isVibrationEnabled ? 'text-blue-500' : 'text-gray-400'}`}>
              {isVibrationEnabled ? 'On' : 'Off'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  const GestureIndicator = () => (
    <AnimatePresence>
      {gestureState.isGesturing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed top-4 left-4 right-4 bg-black/80 text-white p-2 rounded-lg z-50"
        >
          <div className="flex items-center justify-center space-x-2">
            <Navigation className="w-4 h-4" />
            <span className="text-sm">
              {gestureState.gestureType === 'swipe' && `Swipe ${gestureState.direction}`}
              {gestureState.gestureType === 'pinch' && `Pinch ${gestureState.scale > 1 ? 'out' : 'in'}`}
              {gestureState.gestureType === 'longpress' && 'Long press'}
              {gestureState.gestureType === 'shake' && 'Shake detected'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const QuickActions = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
      <h3 className="font-semibold mb-4">Quick Actions</h3>
      
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center justify-center space-x-2 p-3 bg-blue-100 dark:bg-blue-900 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
        >
          <Sync className="w-4 h-4" />
          <span className="text-sm">Refresh</span>
        </button>
        
        <button
          onClick={syncPendingTasks}
          className="flex items-center justify-center space-x-2 p-3 bg-green-100 dark:bg-green-900 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
        >
          <Signal className="w-4 h-4" />
          <span className="text-sm">Sync</span>
        </button>
        
        <button
          onClick={() => {
            if (isVibrationEnabled && 'vibrate' in navigator) {
              navigator.vibrate([200]);
            }
          }}
          className="flex items-center justify-center space-x-2 p-3 bg-purple-100 dark:bg-purple-900 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
        >
          <Vibrate className="w-4 h-4" />
          <span className="text-sm">Test Vibration</span>
        </button>
        
        <button
          onClick={() => {
            if (notificationPermission === 'granted') {
              new Notification('EzAugent', {
                body: 'Test notification from dashboard',
                icon: '/icon-192x192.png'
              });
            }
          }}
          className="flex items-center justify-center space-x-2 p-3 bg-orange-100 dark:bg-orange-900 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="text-sm">Test Notify</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" {...handlers}>
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      
      {/* Gesture Indicator */}
      <GestureIndicator />
      
      {/* Mobile Controls */}
      <MobileControls />
      
      {/* Quick Actions */}
      <QuickActions />
      
      {/* Installation Status */}
      {isInstalled && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
            <Download className="w-5 h-5" />
            <span className="font-medium">App Installed</span>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            EzAugent is now installed as a PWA and can be used offline
          </p>
        </motion.div>
      )}
      
      {/* Gesture Help */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Gesture Controls</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p>• Swipe down: Pull to refresh</p>
          <p>• Shake device: Sync pending tasks</p>
          <p>• Long press: Context menu</p>
          <p>• Pinch: Zoom in/out</p>
        </div>
      </div>
    </div>
  );
}