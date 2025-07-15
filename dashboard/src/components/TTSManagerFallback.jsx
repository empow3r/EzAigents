'use client';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import * as Icons from 'lucide-react';

export default function TTSManagerFallback({ darkMode = true }) {
  return (
    <div className={`p-6 space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Text-to-Speech Manager</h2>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            TTS component is loading or unavailable
          </p>
        </div>
      </div>

      <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Icons.VolumeX className="w-5 h-5" />
            <span>TTS Unavailable</span>
          </CardTitle>
          <CardDescription>
            The Text-to-Speech component failed to load. Please refresh the page or check your connection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            If this issue persists, please check:
          </p>
          <ul className={`mt-2 text-sm space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <li>• Your internet connection is stable</li>
            <li>• JavaScript is enabled in your browser</li>
            <li>• Try clearing your browser cache</li>
            <li>• Check the console for any error messages</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}