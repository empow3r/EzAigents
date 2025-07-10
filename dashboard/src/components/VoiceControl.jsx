import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings, 
  MessageSquare,
  Headphones,
  AudioWaveform as Waveform,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  Speaker,
  Command
} from 'lucide-react';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useAudioFeedback } from '../hooks/useAudioFeedback';

export default function VoiceControl({ screenSize, isMobile, isTablet }) {
  // Browser compatibility detection
  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    let isSupported = false;
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browserName = 'Chrome';
      isSupported = true;
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserName = 'Safari';
      isSupported = true;
    } else if (userAgent.includes('Edg')) {
      browserName = 'Edge';
      isSupported = true;
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      isSupported = false;
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      browserName = 'Opera';
      isSupported = false;
    }
    
    return { browserName, isSupported };
  };

  const browserInfo = getBrowserInfo();
  const {
    isListening,
    transcript,
    isSupported: voiceSupported,
    confidence,
    error: voiceError,
    commands,
    startListening,
    stopListening,
    clearCommands,
    commandPatterns
  } = useVoiceCommands();

  const {
    isSpeaking,
    isPaused,
    voices,
    selectedVoice,
    rate,
    pitch,
    volume: ttsVolume,
    speak,
    pause,
    resume,
    stop,
    speakResponse,
    setRate,
    setPitch,
    setVolume: setTTSVolume,
    setSelectedVoice,
    isSupported: ttsSupported
  } = useTextToSpeech();

  const {
    isEnabled: audioEnabled,
    volume: audioVolume,
    soundTheme,
    playSound,
    playFeedback,
    playMelodyByName,
    setIsEnabled: setAudioEnabled,
    setVolume: setAudioVolume,
    setSoundTheme,
    soundThemes,
    availableSounds,
    melodies,
    isSupported: audioSupported
  } = useAudioFeedback();

  const [showSettings, setShowSettings] = useState(false);
  const [testText, setTestText] = useState('Hello, this is a test of the text to speech system.');
  const [showCommands, setShowCommands] = useState(false);
  const [activeTab, setActiveTab] = useState('voice');

  // Voice visualization
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Listen for voice command events
    const handleVoiceCommand = (event) => {
      const { command, category } = event.detail;
      playFeedback('onSuccess', `Command executed: ${command}`);
      speakResponse('commandExecuted', command);
    };

    window.addEventListener('voiceCommand', handleVoiceCommand);
    return () => window.removeEventListener('voiceCommand', handleVoiceCommand);
  }, [playFeedback, speakResponse]);

  useEffect(() => {
    // Audio level visualization for voice input
    let animationFrame;
    if (isListening) {
      setIsAnalyzing(true);
      const updateLevel = () => {
        setAudioLevel(Math.random() * 100);
        animationFrame = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } else {
      setIsAnalyzing(false);
      setAudioLevel(0);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isListening]);

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      playFeedback('onVoiceStop');
    } else {
      startListening();
      playFeedback('onVoiceStart');
    }
  };

  const handleTTSToggle = () => {
    if (isSpeaking) {
      if (isPaused) {
        resume();
        playSound('success');
      } else {
        pause();
        playSound('info');
      }
    } else {
      stop();
      playSound('warning');
    }
  };

  const handleTestTTS = async () => {
    try {
      await speak(testText);
      playSound('success');
    } catch (error) {
      playSound('error');
      console.error('TTS test failed:', error);
    }
  };

  const handleTestSound = (soundType) => {
    playSound(soundType);
  };

  const handleTestMelody = (melodyName) => {
    playMelodyByName(melodyName);
  };

  const VoiceSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Voice Commands
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleVoiceToggle}
            disabled={!voiceSupported}
            className={`p-2 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            } ${!voiceSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowCommands(!showCommands)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <Command className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!voiceSupported && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800">Voice Commands Not Available</h4>
              <div className="mt-2 text-sm text-yellow-700">
                <p className="mb-2">
                  Voice recognition is not supported in {browserInfo.browserName}.
                </p>
                <div className="mb-2">
                  <p className="font-medium">Browser Status:</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-white px-2 py-1 rounded">
                      {browserInfo.browserName}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      browserInfo.isSupported 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {browserInfo.isSupported ? 'Supported' : 'Not Supported'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      window.isSecureContext 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {window.isSecureContext ? 'HTTPS' : 'HTTP'}
                    </span>
                  </div>
                </div>
                <p className="mb-2"><strong>Recommended solutions:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {!browserInfo.isSupported && (
                    <li className="font-medium">Switch to Chrome, Edge, or Safari for voice support</li>
                  )}
                  {!window.isSecureContext && (
                    <li className="font-medium">Use HTTPS (voice recognition requires secure connection)</li>
                  )}
                  <li>Check microphone permissions in browser settings</li>
                  <li>Refresh the page after granting permissions</li>
                  <li>Ensure microphone is not being used by other applications</li>
                </ul>
                <p className="mt-2 text-xs">
                  <strong>Alternative:</strong> Use keyboard shortcuts or manual controls instead
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {voiceError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">Voice Error: {voiceError}</p>
        </div>
      )}

      {isListening && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Listening...</span>
          </div>
          
          {/* Audio Level Visualization */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Audio Level</span>
              <span>{Math.round(audioLevel)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${audioLevel}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>

          {transcript && (
            <div className="bg-white rounded p-2 border">
              <p className="text-sm">{transcript}</p>
              {confidence > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Confidence: {Math.round(confidence * 100)}%
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Command History */}
      {commands.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Recent Commands</h4>
            <button
              onClick={clearCommands}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {commands.slice(-5).map((cmd) => (
              <div key={cmd.id} className="flex items-center justify-between text-xs">
                <span className={cmd.executed ? 'text-green-700' : 'text-red-700'}>
                  {cmd.command}
                </span>
                <div className="flex items-center gap-1">
                  {cmd.executed ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <X className="w-3 h-3 text-red-600" />
                  )}
                  <span className="text-gray-500">
                    {cmd.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Commands */}
      <AnimatePresence>
        {showCommands && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {voiceSupported && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3">Available Voice Commands</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(commandPatterns).map(([category, patterns]) => (
                    <div key={category} className="space-y-2">
                      <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        {category}
                      </h5>
                      <div className="space-y-1">
                        {patterns.map((pattern) => (
                          <div key={pattern} className="text-xs text-gray-600 bg-white rounded px-2 py-1">
                            "{pattern}"
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Keyboard Shortcuts Alternative */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                </svg>
                Keyboard Shortcuts Alternative
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Navigation</h5>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center bg-white rounded px-2 py-1">
                      <span>Dashboard</span>
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-gray-700">Ctrl+1</kbd>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded px-2 py-1">
                      <span>Agents</span>
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-gray-700">Ctrl+2</kbd>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded px-2 py-1">
                      <span>Queue</span>
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-gray-700">Ctrl+3</kbd>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Actions</h5>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center bg-white rounded px-2 py-1">
                      <span>Refresh</span>
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-gray-700">F5</kbd>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded px-2 py-1">
                      <span>Search</span>
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-gray-700">Ctrl+K</kbd>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded px-2 py-1">
                      <span>Help</span>
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-gray-700">?</kbd>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-3">
                Note: Some shortcuts may not work in all browsers. Try voice commands for full functionality.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const TTSSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Speaker className="w-5 h-5" />
          Text to Speech
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTTSToggle}
            disabled={!ttsSupported}
            className={`p-2 rounded-lg transition-colors ${
              isSpeaking 
                ? isPaused 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
          >
            {isSpeaking ? (isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />) : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => stop()}
            disabled={!isSpeaking}
            className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-300 disabled:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!ttsSupported && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">Text to speech is not supported in this browser.</p>
        </div>
      )}

      {/* TTS Test */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2">Test TTS</h4>
        <div className="space-y-2">
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="w-full p-2 border rounded-lg text-sm resize-none"
            rows={3}
            placeholder="Enter text to test..."
          />
          <button
            onClick={handleTestTTS}
            disabled={!ttsSupported}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-300"
          >
            Test Speech
          </button>
        </div>
      </div>

      {/* Voice Settings */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3">Voice Settings</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Voice</label>
            <select
              value={selectedVoice?.name || ''}
              onChange={(e) => {
                const voice = voices.find(v => v.name === e.target.value);
                setSelectedVoice(voice);
              }}
              className="w-full p-2 border rounded text-sm"
            >
              {voices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Rate: {rate}
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Pitch: {pitch}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Volume: {Math.round(ttsVolume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={ttsVolume}
              onChange={(e) => setTTSVolume(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const AudioSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Headphones className="w-5 h-5" />
          Audio Feedback
        </h3>
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`p-2 rounded-lg transition-colors ${
            audioEnabled 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
          }`}
        >
          {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {!audioSupported && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">Audio feedback is not supported in this browser.</p>
        </div>
      )}

      {/* Audio Settings */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3">Audio Settings</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Theme
            </label>
            <select
              value={soundTheme}
              onChange={(e) => setSoundTheme(e.target.value)}
              className="w-full p-2 border rounded text-sm"
            >
              {soundThemes.map((theme) => (
                <option key={theme} value={theme}>
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Volume: {Math.round(audioVolume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={audioVolume}
              onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Sound Test */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2">Test Sounds</h4>
        <div className="grid grid-cols-2 gap-2">
          {availableSounds.slice(0, 6).map((sound) => (
            <button
              key={sound}
              onClick={() => handleTestSound(sound)}
              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
            >
              {sound}
            </button>
          ))}
        </div>
      </div>

      {/* Melody Test */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2">Test Melodies</h4>
        <div className="grid grid-cols-2 gap-2">
          {melodies.map((melody) => (
            <button
              key={melody}
              onClick={() => handleTestMelody(melody)}
              className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
            >
              {melody}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Waveform className="w-8 h-8 text-purple-500" />
            Voice & Sound System
          </h2>
          <p className="text-gray-600">Voice commands, text-to-speech, and audio feedback</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${voiceSupported ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            <Mic className={`w-5 h-5 ${voiceSupported ? 'text-green-600' : 'text-red-600'}`} />
            <span className="text-sm font-medium">Voice Commands</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {voiceSupported ? 'Available' : 'Not Supported'}
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${ttsSupported ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            <Speaker className={`w-5 h-5 ${ttsSupported ? 'text-green-600' : 'text-red-600'}`} />
            <span className="text-sm font-medium">Text to Speech</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {ttsSupported ? 'Available' : 'Not Supported'}
          </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${audioSupported ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            <Headphones className={`w-5 h-5 ${audioSupported ? 'text-green-600' : 'text-red-600'}`} />
            <span className="text-sm font-medium">Audio Feedback</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {audioSupported ? 'Available' : 'Not Supported'}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['voice', 'tts', 'audio'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'voice' && 'Voice Commands'}
              {tab === 'tts' && 'Text to Speech'}
              {tab === 'audio' && 'Audio Feedback'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'voice' && <VoiceSection />}
        {activeTab === 'tts' && <TTSSection />}
        {activeTab === 'audio' && <AudioSection />}
      </div>
    </div>
  );
}