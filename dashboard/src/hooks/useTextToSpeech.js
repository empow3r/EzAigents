import { useState, useEffect, useCallback, useRef } from 'react';

export function useTextToSpeech() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState(null);
  
  const utteranceRef = useRef(null);
  const queueRef = useRef([]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true);
      
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        // Select default voice (prefer English)
        const defaultVoice = availableVoices.find(voice => 
          voice.lang.startsWith('en') && voice.default
        ) || availableVoices.find(voice => 
          voice.lang.startsWith('en')
        ) || availableVoices[0];
        
        setSelectedVoice(defaultVoice);
      };

      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
        }
      };
    }
  }, []);

  const speak = useCallback((text, options = {}) => {
    if (!isSupported) {
      setError('Speech synthesis not supported');
      return Promise.reject(new Error('Speech synthesis not supported'));
    }

    return new Promise((resolve, reject) => {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply settings
      utterance.voice = options.voice || selectedVoice;
      utterance.rate = options.rate || rate;
      utterance.pitch = options.pitch || pitch;
      utterance.volume = options.volume || volume;
      utterance.lang = options.lang || 'en-US';

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setError(null);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        resolve();
      };

      utterance.onerror = (event) => {
        setError(event.error);
        setIsSpeaking(false);
        setIsPaused(false);
        reject(new Error(event.error));
      };

      utterance.onpause = () => {
        setIsPaused(true);
      };

      utterance.onresume = () => {
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    });
  }, [isSupported, selectedVoice, rate, pitch, volume]);

  const pause = useCallback(() => {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  }, []);

  const stop = useCallback(() => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, []);

  const addToQueue = useCallback((text, options = {}) => {
    queueRef.current.push({ text, options });
  }, []);

  const processQueue = useCallback(async () => {
    while (queueRef.current.length > 0) {
      const { text, options } = queueRef.current.shift();
      try {
        await speak(text, options);
      } catch (error) {
        console.error('TTS Queue error:', error);
      }
    }
  }, [speak]);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    stop();
  }, [stop]);

  // Predefined voice responses for common events
  const voiceResponses = {
    agentStarted: (agentName) => `Agent ${agentName} has started successfully`,
    agentStopped: (agentName) => `Agent ${agentName} has been stopped`,
    agentError: (agentName, error) => `Agent ${agentName} encountered an error: ${error}`,
    taskCompleted: (taskName) => `Task ${taskName} has been completed`,
    taskFailed: (taskName) => `Task ${taskName} has failed`,
    queueEmpty: () => `All tasks have been completed. Queue is empty`,
    queueFull: () => `Warning: Task queue is full`,
    systemError: (error) => `System error: ${error}`,
    welcome: () => `Welcome to Ez Aigent Dashboard. Voice commands are ready`,
    commandExecuted: (command) => `Command executed: ${command}`,
    commandFailed: (command) => `Command failed: ${command}`,
    listening: () => `Voice recognition is now listening`,
    notListening: () => `Voice recognition has stopped`,
    batteryLow: () => `Warning: Battery level is low`,
    offline: () => `You are now offline. Some features may be unavailable`,
    online: () => `You are now online. All features are available`,
    syncCompleted: () => `Synchronization completed successfully`,
    syncFailed: () => `Synchronization failed. Please try again`
  };

  const speakResponse = useCallback((type, ...args) => {
    if (voiceResponses[type]) {
      const message = voiceResponses[type](...args);
      speak(message);
    }
  }, [speak]);

  const speakAgentStatus = useCallback(async (agents) => {
    const activeAgents = agents.filter(agent => agent.status === 'active');
    const inactiveAgents = agents.filter(agent => agent.status === 'inactive');
    
    let message = `Agent status report: ${activeAgents.length} agents active, ${inactiveAgents.length} agents inactive.`;
    
    if (activeAgents.length > 0) {
      message += ` Active agents: ${activeAgents.map(a => a.name).join(', ')}.`;
    }
    
    if (inactiveAgents.length > 0) {
      message += ` Inactive agents: ${inactiveAgents.map(a => a.name).join(', ')}.`;
    }
    
    await speak(message);
  }, [speak]);

  const speakQueueStatus = useCallback(async (queueStats) => {
    const totalPending = queueStats.queues?.reduce((sum, q) => sum + (q.pending?.length || 0), 0) || 0;
    const totalProcessing = queueStats.queues?.reduce((sum, q) => sum + (q.processing?.length || 0), 0) || 0;
    
    let message = `Queue status: ${totalPending} tasks pending, ${totalProcessing} tasks processing.`;
    
    if (totalPending === 0 && totalProcessing === 0) {
      message = 'All queues are empty. No tasks pending or processing.';
    }
    
    await speak(message);
  }, [speak]);

  const speakMetrics = useCallback(async (metrics) => {
    const message = `System metrics: ${metrics.totalTasks} total tasks, ${metrics.completedTasks} completed, ${metrics.failedTasks} failed. Average completion time: ${metrics.averageTime} seconds.`;
    await speak(message);
  }, [speak]);

  // Voice customization
  const setVoiceSettings = useCallback((settings) => {
    if (settings.voice) setSelectedVoice(settings.voice);
    if (settings.rate) setRate(settings.rate);
    if (settings.pitch) setPitch(settings.pitch);
    if (settings.volume) setVolume(settings.volume);
  }, []);

  const getVoiceByName = useCallback((name) => {
    return voices.find(voice => voice.name.toLowerCase().includes(name.toLowerCase()));
  }, [voices]);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    voices,
    selectedVoice,
    rate,
    pitch,
    volume,
    error,
    speak,
    pause,
    resume,
    stop,
    addToQueue,
    processQueue,
    clearQueue,
    speakResponse,
    speakAgentStatus,
    speakQueueStatus,
    speakMetrics,
    setVoiceSettings,
    getVoiceByName,
    setRate,
    setPitch,
    setVolume,
    setSelectedVoice
  };
}