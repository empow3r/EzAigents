'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Switch } from '@/src/components/ui/switch';
import { Slider } from '@/src/components/ui/slider';
import * as Icons from 'lucide-react';
import toast from 'react-hot-toast';

export default function TTSManager({ darkMode = true }) {
  const [ttsConfig, setTtsConfig] = useState({
    enabled: false,
    voiceModel: 'neural-voice',
    language: 'en-US',
    speed: 1.0,
    pitch: 1.0,
    voiceNotifications: false,
    voiceCommands: false
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [testText, setTestText] = useState('');
  const [healthStatus, setHealthStatus] = useState({ status: 'unknown' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTTSConfig();
    checkTTSHealth();
  }, []);

  const fetchTTSConfig = async () => {
    try {
      const response = await fetch('/api/tts/config');
      const data = await response.json();
      setTtsConfig(data);
    } catch (error) {
      console.error('Failed to fetch TTS config:', error);
    }
  };

  const checkTTSHealth = async () => {
    try {
      const response = await fetch('/api/tts/health');
      const data = await response.json();
      setHealthStatus(data);
    } catch (error) {
      setHealthStatus({ status: 'error', error: error.message });
    }
  };

  const updateTTSConfig = async (updates) => {
    try {
      const response = await fetch('/api/tts/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        setTtsConfig(prev => ({ ...prev, ...updates }));
        toast.success('TTS configuration updated');
      } else {
        throw new Error('Failed to update configuration');
      }
    } catch (error) {
      toast.error('Failed to update TTS configuration');
      console.error(error);
    }
  };

  const testTTS = async () => {
    if (!testText.trim()) return;
    
    setIsLoading(true);
    setIsPlaying(true);
    
    try {
      // Import TTS service dynamically
      const { default: ttsService } = await import('../services/ttsService');
      
      // Configure TTS with current settings
      ttsService.setConfig({
        enabled: ttsConfig.enabled,
        rate: ttsConfig.speed,
        pitch: ttsConfig.pitch,
        language: ttsConfig.language
      });
      
      // Speak the text
      await ttsService.speak(testText);
      toast.success('TTS playback completed');
      
    } catch (error) {
      if (error.message.includes('not supported')) {
        toast.error('TTS is not supported in your browser');
      } else {
        toast.error('Failed to synthesize speech');
      }
      console.error(error);
    } finally {
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'disabled': return 'text-yellow-400';
      case 'unhealthy':
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <Icons.CheckCircle className="w-5 h-5" />;
      case 'disabled': return <Icons.VolumeX className="w-5 h-5" />;
      case 'unhealthy':
      case 'error': return <Icons.XCircle className="w-5 h-5" />;
      default: return <Icons.Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className={`p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0"
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold mb-2 break-words">Text-to-Speech Manager</h2>
          <p className={`text-sm sm:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'} break-words`}>
            Configure and manage voice synthesis capabilities
          </p>
        </div>
        
        <div className={`flex items-center space-x-2 flex-shrink-0 ${getStatusColor(healthStatus.status)}`}>
          {getStatusIcon(healthStatus.status)}
          <span className="font-medium capitalize text-sm sm:text-base">{healthStatus.status}</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* TTS Configuration */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <CardHeader>
              <CardTitle className={`flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <Icons.Settings className="w-5 h-5" />
                <span>Configuration</span>
              </CardTitle>
              <CardDescription className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                Manage TTS settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <Label htmlFor="tts-enabled" className={`text-sm sm:text-base ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Enable TTS</Label>
                <Switch
                  id="tts-enabled"
                  checked={ttsConfig.enabled}
                  onCheckedChange={(checked) => updateTTSConfig({ enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-model" className={`text-sm sm:text-base ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Voice Model</Label>
                <Select
                  value={ttsConfig.voiceModel}
                  onValueChange={(value) => updateTTSConfig({ voiceModel: value })}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select voice model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neural-voice">Neural Voice</SelectItem>
                    <SelectItem value="standard-voice">Standard Voice</SelectItem>
                    <SelectItem value="robotic-voice">Robotic Voice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language" className={`text-sm sm:text-base ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Language</Label>
                <Select
                  value={ttsConfig.language}
                  onValueChange={(value) => updateTTSConfig({ language: value })}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="es-ES">Spanish</SelectItem>
                    <SelectItem value="fr-FR">French</SelectItem>
                    <SelectItem value="de-DE">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="speed" className={`text-sm sm:text-base ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Speed: {ttsConfig.speed.toFixed(1)}x</Label>
                <Slider
                  id="speed"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={[ttsConfig.speed]}
                  onValueChange={([value]) => updateTTSConfig({ speed: value })}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pitch" className={`text-sm sm:text-base ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Pitch: {ttsConfig.pitch.toFixed(1)}</Label>
                <Slider
                  id="pitch"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={[ttsConfig.pitch]}
                  onValueChange={([value]) => updateTTSConfig({ pitch: value })}
                  className="w-full"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <Label htmlFor="voice-notifications" className={`text-sm sm:text-base ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Voice Notifications</Label>
                <Switch
                  id="voice-notifications"
                  checked={ttsConfig.voiceNotifications}
                  onCheckedChange={(checked) => updateTTSConfig({ voiceNotifications: checked })}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <Label htmlFor="voice-commands" className={`text-sm sm:text-base ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Voice Commands</Label>
                <Switch
                  id="voice-commands"
                  checked={ttsConfig.voiceCommands}
                  onCheckedChange={(checked) => updateTTSConfig({ voiceCommands: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* TTS Test */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <CardHeader>
              <CardTitle className={`flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <Icons.Speaker className="w-5 h-5" />
                <span>Test TTS</span>
              </CardTitle>
              <CardDescription className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                Test the text-to-speech functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              <div className="space-y-2">
                <Label htmlFor="test-text" className={`text-sm sm:text-base ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Test Text</Label>
                <textarea
                  id="test-text"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Enter text to synthesize... Try typing something like 'Hello, this is a test of the text-to-speech system.'"
                  className={`flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm transition-colors resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  autoComplete="off"
                  rows={3}
                />
                
                {/* Example text buttons */}
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Quick examples:</span>
                  {[
                    'Hello, this is a test of the text-to-speech system.',
                    'The AI agents are working efficiently.',
                    'Welcome to the Ez Aigent dashboard.'
                  ].map((example, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setTestText(example)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        darkMode 
                          ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                    >
                      Example {index + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  onClick={testTTS}
                  disabled={!ttsConfig.enabled || isLoading || !testText.trim()}
                  className="flex-1 text-sm sm:text-base"
                >
                  {isLoading ? (
                    <Icons.Activity className="w-4 h-4 mr-2 animate-spin" />
                  ) : isPlaying ? (
                    <Icons.Pause className="w-4 h-4 mr-2" />
                  ) : (
                    <Icons.Play className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? 'Synthesizing...' : isPlaying ? 'Playing...' : 'Test TTS'}
                </Button>

                <Button
                  variant="outline"
                  onClick={checkTTSHealth}
                  className="flex-1 text-sm sm:text-base"
                >
                  <Icons.Activity className="w-4 h-4 mr-2" />
                  Check Health
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Voice Commands Help */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <Icons.Mic className="w-5 h-5" />
              <span>Voice Commands</span>
            </CardTitle>
            <CardDescription className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              Available voice commands when voice control is enabled
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[
                { command: 'status', description: 'Get system status' },
                { command: 'scale up', description: 'Scale up agents' },
                { command: 'scale down', description: 'Scale down agents' },
                { command: 'stop all', description: 'Stop all agents' },
                { command: 'restart', description: 'Restart system' },
                { command: 'queue stats', description: 'Get queue statistics' },
                { command: 'agent count', description: 'Get agent count' }
              ].map(({ command, description }) => (
                <div
                  key={command}
                  className={`p-3 rounded-lg border min-w-0 ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className={`font-medium text-sm mb-1 break-words ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>"{command}"</div>
                  <div className={`text-xs break-words ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {description}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}