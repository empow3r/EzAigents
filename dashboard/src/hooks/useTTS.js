import { useCallback, useState } from 'react';

// Simple TTS hook for agent notifications
export const useAgentTTS = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  
  const announceNotification = useCallback((message) => {
    if (isEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.5;
      window.speechSynthesis.speak(utterance);
    }
  }, [isEnabled]);
  
  const announceAgentStatus = useCallback((agentName, status) => {
    announceNotification(`Agent ${agentName} is now ${status}`);
  }, [announceNotification]);
  
  const announceQueueUpdate = useCallback((queueName, count) => {
    announceNotification(`${queueName} queue has ${count} items`);
  }, [announceNotification]);
  
  return {
    announceNotification,
    announceAgentStatus,
    announceQueueUpdate,
    isEnabled,
    setIsEnabled
  };
};