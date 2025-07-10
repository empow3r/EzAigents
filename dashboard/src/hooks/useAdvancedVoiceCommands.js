'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export const useAdvancedVoiceCommands = (commands = {}, options = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  
  const defaultOptions = {
    continuous: true,
    interimResults: true,
    language: 'en-US',
    maxAlternatives: 1,
    timeout: 5000,
    activationPhrase: 'hey aigent',
    ...options
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setIsSupported(true);
        recognitionRef.current = new SpeechRecognition();
        
        const recognition = recognitionRef.current;
        recognition.continuous = defaultOptions.continuous;
        recognition.interimResults = defaultOptions.interimResults;
        recognition.lang = defaultOptions.language;
        recognition.maxAlternatives = defaultOptions.maxAlternatives;
        
        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognition.onerror = (event) => {
          setError(event.error);
          setIsListening(false);
        };
        
        recognition.onresult = (event) => {
          const result = event.results[event.results.length - 1];
          const transcriptText = result[0].transcript.toLowerCase().trim();
          const confidenceScore = result[0].confidence;
          
          setTranscript(transcriptText);
          setConfidence(confidenceScore);
          
          // Check for activation phrase
          if (transcriptText.includes(defaultOptions.activationPhrase)) {
            // Parse command after activation phrase
            const commandText = transcriptText.split(defaultOptions.activationPhrase)[1]?.trim();
            if (commandText) {
              processCommand(commandText, confidenceScore);
            }
          }
          
          // Reset timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          
          timeoutRef.current = setTimeout(() => {
            setTranscript('');
            setConfidence(0);
          }, defaultOptions.timeout);
        };
      } else {
        setIsSupported(false);
        setError('Speech recognition not supported in this browser');
      }
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Process voice commands
  const processCommand = useCallback((commandText, confidenceScore) => {
    const bestMatch = findBestMatch(commandText, Object.keys(commands));
    
    if (bestMatch && confidenceScore > 0.7) {
      const handler = commands[bestMatch];
      if (typeof handler === 'function') {
        handler(commandText, confidenceScore);
      }
    }
  }, [commands]);

  // Find best matching command using fuzzy matching
  const findBestMatch = (input, commandList) => {
    let bestMatch = null;
    let bestScore = 0;
    
    commandList.forEach(command => {
      const score = calculateSimilarity(input, command);
      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestMatch = command;
      }
    });
    
    return bestMatch;
  };

  // Calculate string similarity
  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  };

  // Levenshtein distance calculation
  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // Start listening
  const startListening = useCallback(() => {
    if (recognitionRef.current && isSupported) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        setError(err.message);
      }
    }
  }, [isSupported]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    confidence,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening
  };
};

// Predefined executive commands
export const useExecutiveVoiceCommands = (onCommand) => {
  const executiveCommands = {
    'show revenue': () => onCommand('navigate', 'revenue'),
    'open agent dashboard': () => onCommand('navigate', 'agents'),
    'god mode': () => onCommand('toggle', 'godMode'),
    'emergency stop': () => onCommand('emergency', 'stop'),
    'scale up': () => onCommand('scale', 'up'),
    'scale down': () => onCommand('scale', 'down'),
    'optimize performance': () => onCommand('optimize', 'performance'),
    'show analytics': () => onCommand('navigate', 'analytics'),
    'deploy agents': () => onCommand('deploy', 'agents'),
    'security status': () => onCommand('check', 'security'),
    'system health': () => onCommand('check', 'health'),
    'maximize revenue': () => onCommand('optimize', 'revenue'),
    'minimize costs': () => onCommand('optimize', 'costs'),
    'export data': () => onCommand('export', 'data'),
    'refresh dashboard': () => onCommand('refresh', 'dashboard'),
    'full screen': () => onCommand('toggle', 'fullscreen'),
    'dark mode': () => onCommand('toggle', 'darkMode'),
    'light mode': () => onCommand('toggle', 'lightMode')
  };

  return useAdvancedVoiceCommands(executiveCommands, {
    activationPhrase: 'hey aigent',
    timeout: 3000
  });
};

// Audio feedback system
export const useVoiceFeedback = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const synthRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speak = useCallback((text, options = {}) => {
    if (!isEnabled || !synthRef.current) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 1.2;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 0.8;
    utterance.voice = options.voice || synthRef.current.getVoices().find(v => v.name.includes('Alex')) || null;

    synthRef.current.speak(utterance);
  }, [isEnabled]);

  const speakCommand = useCallback((command) => {
    const responses = {
      'navigate': 'Navigating to section',
      'toggle': 'Toggle activated',
      'emergency': 'Emergency protocol initiated',
      'scale': 'Scaling operation in progress',
      'optimize': 'Optimization started',
      'deploy': 'Deployment initiated',
      'check': 'System check complete',
      'export': 'Data export started',
      'refresh': 'Dashboard refreshed'
    };

    const response = responses[command] || 'Command executed';
    speak(response, { rate: 1.3, pitch: 1.1 });
  }, [speak]);

  return {
    speak,
    speakCommand,
    isEnabled,
    setIsEnabled
  };
};