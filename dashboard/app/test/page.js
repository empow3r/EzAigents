'use client';
import React from 'react';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">EzAigents Dashboard Test</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h2 className="text-xl font-semibold text-blue-900 mb-2">Agents</h2>
              <p className="text-3xl font-bold text-blue-600">5</p>
              <p className="text-sm text-blue-700">Active agents</p>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h2 className="text-xl font-semibold text-green-900 mb-2">Tasks</h2>
              <p className="text-3xl font-bold text-green-600">12</p>
              <p className="text-sm text-green-700">Completed today</p>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
              <h2 className="text-xl font-semibold text-purple-900 mb-2">Queue</h2>
              <p className="text-3xl font-bold text-purple-600">3</p>
              <p className="text-sm text-purple-700">Pending tasks</p>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Status</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Dashboard is running successfully</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Components are loading properly</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Ready for enhanced features</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}