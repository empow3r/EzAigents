import { useState, useEffect, useCallback, useRef } from 'react';

export function useVoiceCommands() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState(null);
  const [commands, setCommands] = useState([]);
  
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  // Voice command patterns
  const commandPatterns = {
    navigation: {
      'go to dashboard': () => window.location.href = '/dashboard',
      'show agents': () => window.location.href = '/agents',
      'view queue': () => window.location.href = '/queue',
      'open analytics': () => window.location.href = '/analytics',
      'show enhancements': () => window.location.href = '/enhancements'
    },
    control: {
      'start listening': () => startListening(),
      'stop listening': () => stopListening(),
      'refresh page': () => window.location.reload(),
      'go back': () => window.history.back(),
      'go forward': () => window.history.forward()
    },
    agent: {
      'deploy agent': () => deployAgent(),
      'stop all agents': () => stopAllAgents(),
      'restart agents': () => restartAgents(),
      'show agent status': () => showAgentStatus(),
      'clear queue': () => clearQueue()
    },
    task: {
      'enqueue task': () => enqueueTask(),
      'show completed tasks': () => showCompletedTasks(),
      'show failed tasks': () => showFailedTasks(),
      'retry failed tasks': () => retryFailedTasks()
    }
  };

  useEffect(() => {
    // Check if Speech Recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    // Additional checks for browser support
    const isSecureContext = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    const hasNavigator = typeof navigator !== 'undefined';
    const hasMediaDevices = hasNavigator && 'mediaDevices' in navigator;
    
    console.log('Voice recognition support check:', {
      SpeechRecognition: !!SpeechRecognition,
      isSecureContext,
      hasNavigator,
      hasMediaDevices,
      userAgent: navigator?.userAgent
    });
    
    if (SpeechRecognition && isSecureContext) {
      try {
        setIsSupported(true);
        recognitionRef.current = new SpeechRecognition();
        
        const recognition = recognitionRef.current;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        console.log('Voice recognition started');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            setConfidence(confidence);
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);

        // Process final transcript for commands
        if (finalTranscript) {
          processVoiceCommand(finalTranscript.toLowerCase().trim());
        }
      };

      recognition.onerror = (event) => {
        setError(event.error);
        setIsListening(false);
        console.error('Voice recognition error:', event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('Voice recognition ended');
      };
      } catch (error) {
        console.error('Failed to initialize speech recognition:', error);
        setIsSupported(false);
        setError('Failed to initialize voice recognition');
      }
    } else {
      setIsSupported(false);
      if (!SpeechRecognition) {
        setError('Speech Recognition API not available in this browser');
      } else if (!isSecureContext) {
        setError('Voice recognition requires HTTPS or localhost');
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const processVoiceCommand = useCallback((command) => {
    console.log('Processing voice command:', command);
    
    // Check all command patterns
    for (const [category, patterns] of Object.entries(commandPatterns)) {
      for (const [pattern, action] of Object.entries(patterns)) {
        if (command.includes(pattern)) {
          console.log(`Executing ${category} command: ${pattern}`);
          
          // Add to command history
          setCommands(prev => [...prev, {
            id: Date.now(),
            command: pattern,
            category,
            timestamp: new Date(),
            confidence,
            executed: true
          }]);
          
          // Execute command
          try {
            action();
            
            // Fire custom event for command execution
            window.dispatchEvent(new CustomEvent('voiceCommand', {
              detail: { command: pattern, category, confidence }
            }));
            
            return;
          } catch (error) {
            console.error('Command execution failed:', error);
            setError(`Failed to execute: ${pattern}`);
          }
        }
      }
    }
    
    // If no command matched, add to history as unrecognized
    setCommands(prev => [...prev, {
      id: Date.now(),
      command,
      category: 'unrecognized',
      timestamp: new Date(),
      confidence,
      executed: false
    }]);
  }, [confidence]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice recognition not supported');
      return;
    }
    
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        
        // Auto-stop after 30 seconds
        timeoutRef.current = setTimeout(() => {
          stopListening();
        }, 30000);
      } catch (error) {
        setError('Failed to start voice recognition');
        console.error('Start listening error:', error);
      }
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [isListening]);

  const clearCommands = useCallback(() => {
    setCommands([]);
  }, []);

  const addCustomCommand = useCallback((pattern, action, category = 'custom') => {
    if (!commandPatterns[category]) {
      commandPatterns[category] = {};
    }
    commandPatterns[category][pattern] = action;
  }, []);

  // Command actions
  const deployAgent = async () => {
    try {
      await fetch('/api/agents/deploy', { method: 'POST' });
      console.log('Agent deployment initiated');
    } catch (error) {
      console.error('Deploy agent failed:', error);
    }
  };

  const stopAllAgents = async () => {
    try {
      await fetch('/api/agents/stop', { method: 'POST' });
      console.log('All agents stopped');
    } catch (error) {
      console.error('Stop agents failed:', error);
    }
  };

  const restartAgents = async () => {
    try {
      await fetch('/api/agents/restart', { method: 'POST' });
      console.log('Agents restarted');
    } catch (error) {
      console.error('Restart agents failed:', error);
    }
  };

  const showAgentStatus = () => {
    window.dispatchEvent(new CustomEvent('showAgentStatus'));
  };

  const clearQueue = async () => {
    try {
      await fetch('/api/queue/clear', { method: 'POST' });
      console.log('Queue cleared');
    } catch (error) {
      console.error('Clear queue failed:', error);
    }
  };

  const enqueueTask = () => {
    window.dispatchEvent(new CustomEvent('showEnqueueDialog'));
  };

  const showCompletedTasks = () => {
    window.dispatchEvent(new CustomEvent('showCompletedTasks'));
  };

  const showFailedTasks = () => {
    window.dispatchEvent(new CustomEvent('showFailedTasks'));
  };

  const retryFailedTasks = async () => {
    try {
      await fetch('/api/tasks/retry-failed', { method: 'POST' });
      console.log('Failed tasks retried');
    } catch (error) {
      console.error('Retry failed tasks error:', error);
    }
  };

  return {
    isListening,
    transcript,
    isSupported,
    confidence,
    error,
    commands,
    startListening,
    stopListening,
    clearCommands,
    addCustomCommand,
    commandPatterns: Object.keys(commandPatterns).reduce((acc, category) => {
      acc[category] = Object.keys(commandPatterns[category]);
      return acc;
    }, {})
  };
}