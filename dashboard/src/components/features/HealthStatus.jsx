'use client';
import React from 'react';

const HealthStatus = ({ health = {}, mode = 'default' }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'operational': 
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
      case 'critical':
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'operational': 
        return '✅';
      case 'degraded':
      case 'warning':
        return '⚠️';
      case 'error':
      case 'critical':
      case 'unhealthy':
        return '❌';
      default:
        return '❓';
    }
  };

  const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (mode === 'compact') {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">System Health</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(health.status)}`}>
            {getStatusIcon(health.status)} {health.status || 'Unknown'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">System Health</h2>
        <div className={`px-4 py-2 rounded-lg text-sm font-medium border ${getStatusColor(health.status)}`}>
          {getStatusIcon(health.status)} {health.status || 'Unknown'}
        </div>
      </div>

      {/* Overall Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Uptime:</span>
            <div className="font-medium">{formatUptime(health.uptime)}</div>
          </div>
          <div>
            <span className="text-gray-600">Environment:</span>
            <div className="font-medium capitalize">{health.environment || 'Unknown'}</div>
          </div>
          <div>
            <span className="text-gray-600">Version:</span>
            <div className="font-medium">{health.version || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Service Status */}
      {health.services && (
        <div>
          <h3 className="text-lg font-medium mb-3">Services</h3>
          <div className="space-y-3">
            {Object.entries(health.services).map(([service, serviceData]) => {
              const status = typeof serviceData === 'string' ? serviceData : serviceData?.status;
              const details = typeof serviceData === 'object' ? serviceData : {};
              
              return (
                <div key={service} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(status).includes('green') ? 'bg-green-500' : 
                      getStatusColor(status).includes('yellow') ? 'bg-yellow-500' : 
                      getStatusColor(status).includes('red') ? 'bg-red-500' : 'bg-gray-500'}`}></div>
                    <div>
                      <div className="font-medium capitalize">{service}</div>
                      {details.error && (
                        <div className="text-sm text-red-600">{details.error}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className={`font-medium ${getStatusColor(status).split(' ')[0]}`}>
                      {status}
                    </div>
                    {details.pingTime && (
                      <div className="text-gray-500">{details.pingTime}</div>
                    )}
                    {details.memory && (
                      <div className="text-gray-500">{details.memory} MB</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Last updated: {health.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'Never'}
      </div>
    </div>
  );
};

export default HealthStatus;