'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import soundService from '../src/services/soundService';

export default function SoundTest() {
  const [volume, setVolume] = useState(30);
  const [isEnabled, setIsEnabled] = useState(true);
  const [lastPlayed, setLastPlayed] = useState('');

  useEffect(() => {
    // Initialize sound service
    if (typeof window !== 'undefined') {
      document.addEventListener('click', () => {
        if (!soundService.initialized) {
          soundService.init();
        }
      }, { once: true });
    }
  }, []);

  const playSound = (soundName) => {
    if (soundService && soundService.play) {
      soundService.setVolume(volume / 100);
      soundService.play(soundName);
      setLastPlayed(soundName);
    }
  };

  const quirkySounds = [
    { name: 'sparkle', label: 'Sparkle ✨', description: 'High pitched magical sound' },
    { name: 'coinDrop', label: 'Coin Drop 🪙', description: 'Classic coin collection sound' },
    { name: 'miniSuccess', label: 'Mini Success 🎉', description: 'Small achievement sound' },
    { name: 'perfectClick', label: 'Perfect Click 👆', description: 'Satisfying pop sound' },
    { name: 'satisfyingPop', label: 'Satisfying Pop 💫', description: 'Gentle boop sound' },
    { name: 'quickWin', label: 'Quick Win 🏆', description: 'Ascending victory notes' },
    { name: 'notification', label: 'Notification 🔔', description: 'Gentle ding-dong' },
    { name: 'error', label: 'Error ⚠️', description: 'Low warning sound' },
    { name: 'warning', label: 'Warning ⚡', description: 'Wobble alert sound' },
    { name: 'buttonClick', label: 'Button Click 🖱️', description: 'Sharp UI click' },
    { name: 'buttonHover', label: 'Button Hover 👈', description: 'Soft hover tone' },
    { name: 'tabSwitch', label: 'Tab Switch 📑', description: 'Navigation sound' },
    { name: 'success', label: 'Success ✅', description: 'Major success chord' },
    { name: 'taskComplete', label: 'Task Complete ✔️', description: 'Achievement fanfare' }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🎵 Quirky Sound Test Dashboard</CardTitle>
          <CardDescription>
            Test the new short, playful sound effects for UI events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Volume: {volume}%
              </label>
              <Slider
                value={[volume]}
                onValueChange={(value) => setVolume(value[0])}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setIsEnabled(!isEnabled)}
                variant={isEnabled ? "default" : "outline"}
              >
                Sound {isEnabled ? "Enabled" : "Disabled"}
              </Button>
              
              {lastPlayed && (
                <span className="text-sm text-gray-600">
                  Last played: {lastPlayed}
                </span>
              )}
            </div>
            
            <Button
              onClick={() => {
                if (window.stopAllAudio) {
                  window.stopAllAudio();
                  setLastPlayed('EMERGENCY STOP');
                }
              }}
              variant="destructive"
              className="ml-4"
            >
              🛑 Emergency Stop All Audio
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quirkySounds.map((sound) => (
          <Card key={sound.name} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{sound.label}</CardTitle>
              <CardDescription className="text-sm">{sound.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => playSound(sound.name)}
                disabled={!isEnabled}
                className="w-full"
                size="sm"
              >
                Play Sound
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>🎯 Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>• <strong>Click any button</strong> to test the quirky sound effects</p>
            <p>• <strong>Adjust volume</strong> using the slider above</p>
            <p>• <strong>Emergency Stop</strong> immediately stops all audio if something hangs</p>
            <p>• All sounds are <strong>short (0.05-0.4 seconds)</strong> and designed to be playful</p>
            <p>• Sounds use <strong>proper cleanup</strong> to prevent audio hanging issues</p>
            <p>• Access at: <strong>http://localhost:3000/sound-test</strong></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}