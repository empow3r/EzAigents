'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Settings, 
  Mic, 
  Speaker,
  Activity,
  CheckCircle,
  XCircle
} from 'lucide-react';
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
  const [testText, setTestText] = useState('Hello, this is a test of the text-to-speech system.');
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
      const response = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          voice: ttsConfig.voiceModel,
          language: ttsConfig.language,
          speed: ttsConfig.speed,
          pitch: ttsConfig.pitch
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.play();
        toast.success('Playing TTS audio');
      } else {
        throw new Error('TTS synthesis failed');
      }
    } catch (error) {
      toast.error('Failed to synthesize speech');
      console.error(error);
      setIsPlaying(false);
    } finally {
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
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'disabled': return <VolumeX className="w-5 h-5" />;
      case 'unhealthy':
      case 'error': return <XCircle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className={`p-6 space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold mb-2">Text-to-Speech Manager</h2>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Configure and manage voice synthesis capabilities
          </p>
        </div>
        
        <div className={`flex items-center space-x-2 ${getStatusColor(healthStatus.status)}`}>
          {getStatusIcon(healthStatus.status)}
          <span className="font-medium capitalize">{healthStatus.status}</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TTS Configuration */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Configuration</span>
              </CardTitle>
              <CardDescription>
                Manage TTS settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="tts-enabled">Enable TTS</Label>
                <Switch
                  id="tts-enabled"
                  checked={ttsConfig.enabled}
                  onCheckedChange={(checked) => updateTTSConfig({ enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-model">Voice Model</Label>
                <Select
                  value={ttsConfig.voiceModel}
                  onValueChange={(value) => updateTTSConfig({ voiceModel: value })}
                >
                  <SelectTrigger>
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
                <Label htmlFor="language">Language</Label>
                <Select
                  value={ttsConfig.language}
                  onValueChange={(value) => updateTTSConfig({ language: value })}
                >
                  <SelectTrigger>
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
                <Label htmlFor="speed">Speed: {ttsConfig.speed.toFixed(1)}x</Label>
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
                <Label htmlFor="pitch">Pitch: {ttsConfig.pitch.toFixed(1)}</Label>
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

              <div className="flex items-center justify-between">
                <Label htmlFor="voice-notifications">Voice Notifications</Label>
                <Switch
                  id="voice-notifications"
                  checked={ttsConfig.voiceNotifications}
                  onCheckedChange={(checked) => updateTTSConfig({ voiceNotifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="voice-commands">Voice Commands</Label>
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
              <CardTitle className="flex items-center space-x-2">
                <Speaker className="w-5 h-5" />
                <span>Test TTS</span>
              </CardTitle>
              <CardDescription>
                Test the text-to-speech functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-text">Test Text</Label>
                <Input
                  id="test-text"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Enter text to synthesize..."
                  className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                />
              </div>

              <Button
                onClick={testTTS}
                disabled={!ttsConfig.enabled || isLoading || !testText.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4 mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isLoading ? 'Synthesizing...' : isPlaying ? 'Playing...' : 'Test TTS'}
              </Button>

              <Button
                variant="outline"
                onClick={checkTTSHealth}
                className="w-full"
              >
                <Activity className="w-4 h-4 mr-2" />
                Check Health
              </Button>
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
            <CardTitle className="flex items-center space-x-2">
              <Mic className="w-5 h-5" />
              <span>Voice Commands</span>
            </CardTitle>
            <CardDescription>
              Available voice commands when voice control is enabled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  className={`p-3 rounded-lg border ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm mb-1">"{command}"</div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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