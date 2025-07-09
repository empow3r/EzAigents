import { useState, useEffect, useCallback, useRef } from 'react';
import useSound from 'use-sound';

export function useAudioFeedback() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [soundTheme, setSoundTheme] = useState('default');
  const [isSupported, setIsSupported] = useState(false);
  
  const audioContextRef = useRef(null);
  const soundCacheRef = useRef({});

  useEffect(() => {
    // Check if Web Audio API is supported
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      setIsSupported(true);
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
    }
  }, []);

  // Sound definitions for different themes
  const soundThemes = {
    default: {
      success: { frequency: 800, duration: 200, type: 'square' },
      error: { frequency: 300, duration: 400, type: 'sawtooth' },
      warning: { frequency: 600, duration: 300, type: 'triangle' },
      info: { frequency: 1000, duration: 150, type: 'sine' },
      click: { frequency: 1200, duration: 100, type: 'square' },
      notification: { frequency: 880, duration: 250, type: 'sine' },
      agentStart: { frequency: 1320, duration: 300, type: 'sine' },
      agentStop: { frequency: 660, duration: 300, type: 'sine' },
      taskComplete: { frequency: 1760, duration: 400, type: 'sine' },
      taskFailed: { frequency: 440, duration: 500, type: 'sawtooth' },
      queueEmpty: { frequency: 1000, duration: 200, type: 'triangle' },
      voiceStart: { frequency: 1500, duration: 150, type: 'sine' },
      voiceStop: { frequency: 1000, duration: 150, type: 'sine' },
      typing: { frequency: 1800, duration: 50, type: 'square' },
      processing: { frequency: 900, duration: 100, type: 'triangle' }
    },
    minimal: {
      success: { frequency: 800, duration: 100, type: 'sine' },
      error: { frequency: 400, duration: 150, type: 'sine' },
      warning: { frequency: 600, duration: 125, type: 'sine' },
      info: { frequency: 1000, duration: 75, type: 'sine' },
      click: { frequency: 1200, duration: 50, type: 'sine' },
      notification: { frequency: 880, duration: 100, type: 'sine' },
      agentStart: { frequency: 1320, duration: 150, type: 'sine' },
      agentStop: { frequency: 660, duration: 150, type: 'sine' },
      taskComplete: { frequency: 1760, duration: 200, type: 'sine' },
      taskFailed: { frequency: 440, duration: 200, type: 'sine' },
      queueEmpty: { frequency: 1000, duration: 100, type: 'sine' },
      voiceStart: { frequency: 1500, duration: 75, type: 'sine' },
      voiceStop: { frequency: 1000, duration: 75, type: 'sine' },
      typing: { frequency: 1800, duration: 25, type: 'sine' },
      processing: { frequency: 900, duration: 50, type: 'sine' }
    },
    retro: {
      success: { frequency: 523, duration: 300, type: 'square' },
      error: { frequency: 220, duration: 600, type: 'sawtooth' },
      warning: { frequency: 440, duration: 400, type: 'triangle' },
      info: { frequency: 659, duration: 200, type: 'square' },
      click: { frequency: 1047, duration: 150, type: 'square' },
      notification: { frequency: 698, duration: 350, type: 'square' },
      agentStart: { frequency: 1319, duration: 400, type: 'square' },
      agentStop: { frequency: 392, duration: 400, type: 'square' },
      taskComplete: { frequency: 1567, duration: 500, type: 'square' },
      taskFailed: { frequency: 233, duration: 700, type: 'sawtooth' },
      queueEmpty: { frequency: 880, duration: 300, type: 'triangle' },
      voiceStart: { frequency: 1175, duration: 200, type: 'square' },
      voiceStop: { frequency: 784, duration: 200, type: 'square' },
      typing: { frequency: 1397, duration: 75, type: 'square' },
      processing: { frequency: 587, duration: 150, type: 'triangle' }
    }
  };

  const generateTone = useCallback((frequency, duration, type = 'sine', volumeOverride = null) => {
    if (!isSupported || !isEnabled || !audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;

    const actualVolume = volumeOverride !== null ? volumeOverride : volume;
    gainNode.gain.setValueAtTime(actualVolume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration / 1000);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);

    return oscillator;
  }, [isSupported, isEnabled, volume]);

  const playSound = useCallback((soundType, options = {}) => {
    const soundConfig = soundThemes[soundTheme][soundType];
    if (!soundConfig) {
      console.warn(`Sound type '${soundType}' not found in theme '${soundTheme}'`);
      return;
    }

    const config = { ...soundConfig, ...options };
    generateTone(config.frequency, config.duration, config.type, config.volume);
  }, [soundTheme, generateTone]);

  const playSequence = useCallback((sequence, delay = 100) => {
    sequence.forEach((soundType, index) => {
      setTimeout(() => playSound(soundType), index * delay);
    });
  }, [playSound]);

  const playChord = useCallback((frequencies, duration = 500, type = 'sine') => {
    if (!isSupported || !isEnabled || !audioContextRef.current) return;

    frequencies.forEach(frequency => {
      generateTone(frequency, duration, type);
    });
  }, [generateTone, isSupported, isEnabled]);

  const playMelody = useCallback((notes, noteDuration = 200, noteGap = 50) => {
    notes.forEach((note, index) => {
      setTimeout(() => {
        if (typeof note === 'object') {
          generateTone(note.frequency, note.duration || noteDuration, note.type || 'sine');
        } else {
          generateTone(note, noteDuration, 'sine');
        }
      }, index * (noteDuration + noteGap));
    });
  }, [generateTone]);

  // Predefined melodies
  const melodies = {
    startup: [
      { frequency: 523, duration: 200 }, // C
      { frequency: 659, duration: 200 }, // E
      { frequency: 784, duration: 200 }, // G
      { frequency: 1047, duration: 400 } // C (octave)
    ],
    shutdown: [
      { frequency: 1047, duration: 200 }, // C (octave)
      { frequency: 784, duration: 200 },  // G
      { frequency: 659, duration: 200 },  // E
      { frequency: 523, duration: 400 }   // C
    ],
    success: [
      { frequency: 659, duration: 150 }, // E
      { frequency: 784, duration: 150 }, // G
      { frequency: 1047, duration: 300 } // C
    ],
    failure: [
      { frequency: 523, duration: 200 }, // C
      { frequency: 494, duration: 200 }, // B
      { frequency: 466, duration: 200 }, // A#
      { frequency: 440, duration: 400 }  // A
    ],
    notification: [
      { frequency: 880, duration: 100 }, // A
      { frequency: 1047, duration: 100 }, // C
      { frequency: 1319, duration: 200 }  // E
    ],
    processing: [
      { frequency: 523, duration: 100 }, // C
      { frequency: 587, duration: 100 }, // D
      { frequency: 659, duration: 100 }, // E
      { frequency: 698, duration: 100 }  // F
    ]
  };

  const playMelodyByName = useCallback((melodyName) => {
    const melody = melodies[melodyName];
    if (melody) {
      playMelody(melody);
    }
  }, [playMelody]);

  // Audio feedback for specific events
  const feedbackActions = {
    onAgentStart: (agentName) => {
      playSound('agentStart');
      return `Agent ${agentName} started`;
    },
    onAgentStop: (agentName) => {
      playSound('agentStop');
      return `Agent ${agentName} stopped`;
    },
    onTaskComplete: (taskName) => {
      playSound('taskComplete');
      return `Task ${taskName} completed`;
    },
    onTaskFailed: (taskName) => {
      playSound('taskFailed');
      return `Task ${taskName} failed`;
    },
    onQueueEmpty: () => {
      playSound('queueEmpty');
      return 'Queue is empty';
    },
    onNotification: (message) => {
      playSound('notification');
      return message;
    },
    onError: (error) => {
      playSound('error');
      return `Error: ${error}`;
    },
    onWarning: (warning) => {
      playSound('warning');
      return `Warning: ${warning}`;
    },
    onInfo: (info) => {
      playSound('info');
      return info;
    },
    onSuccess: (message) => {
      playSound('success');
      return message;
    },
    onVoiceStart: () => {
      playSound('voiceStart');
      return 'Voice recognition started';
    },
    onVoiceStop: () => {
      playSound('voiceStop');
      return 'Voice recognition stopped';
    },
    onTyping: () => {
      playSound('typing');
    },
    onProcessing: () => {
      playSound('processing');
    }
  };

  const playFeedback = useCallback((action, ...args) => {
    if (feedbackActions[action]) {
      return feedbackActions[action](...args);
    }
  }, []);

  // Custom sound effects
  const playCustomSound = useCallback((config) => {
    if (config.type === 'tone') {
      generateTone(config.frequency, config.duration, config.waveType, config.volume);
    } else if (config.type === 'sequence') {
      playSequence(config.sounds, config.delay);
    } else if (config.type === 'chord') {
      playChord(config.frequencies, config.duration, config.waveType);
    } else if (config.type === 'melody') {
      playMelody(config.notes, config.noteDuration, config.noteGap);
    }
  }, [generateTone, playSequence, playChord, playMelody]);

  // Volume control with fade
  const fadeVolume = useCallback((targetVolume, duration = 1000) => {
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = (targetVolume - volume) / steps;
    
    let currentStep = 0;
    const fadeInterval = setInterval(() => {
      currentStep++;
      const newVolume = volume + (volumeStep * currentStep);
      setVolume(newVolume);
      
      if (currentStep >= steps) {
        clearInterval(fadeInterval);
        setVolume(targetVolume);
      }
    }, stepDuration);
  }, [volume]);

  // Load sound preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('audioPreferences');
    if (savedPreferences) {
      const prefs = JSON.parse(savedPreferences);
      setIsEnabled(prefs.enabled ?? true);
      setVolume(prefs.volume ?? 0.5);
      setSoundTheme(prefs.theme ?? 'default');
    }
  }, []);

  // Save sound preferences to localStorage
  const savePreferences = useCallback(() => {
    localStorage.setItem('audioPreferences', JSON.stringify({
      enabled: isEnabled,
      volume,
      theme: soundTheme
    }));
  }, [isEnabled, volume, soundTheme]);

  useEffect(() => {
    savePreferences();
  }, [isEnabled, volume, soundTheme, savePreferences]);

  return {
    isEnabled,
    volume,
    soundTheme,
    isSupported,
    setIsEnabled,
    setVolume,
    setSoundTheme,
    playSound,
    playSequence,
    playChord,
    playMelody,
    playMelodyByName,
    playFeedback,
    playCustomSound,
    fadeVolume,
    soundThemes: Object.keys(soundThemes),
    availableSounds: Object.keys(soundThemes[soundTheme] || {}),
    melodies: Object.keys(melodies)
  };
}