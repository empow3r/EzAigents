'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function RawDataView() {
  const [agentData, setAgentData] = useState(null);
  const [queueData, setQueueData] = useState(null);
  const [redisStatus, setRedisStatus] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Load all data
  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [agents, queues, redis, health] = await Promise.all([
        fetch('/api/agent-stats').then(r => r.json()).catch(() => null),
        fetch('/api/queue-stats').then(r => r.json()).catch(() => null),
        fetch('/api/redis-status').then(r => r.json()).catch(() => null),
        fetch('/api/health').then(r => r.json()).catch(() => null)
      ]);

      setAgentData(agents);
      setQueueData(queues);
      setRedisStatus(redis);
      setHealthData(health);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    
    if (autoRefresh) {
      const interval = setInterval(loadAllData, 3000); // Refresh every 3 seconds
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh]);

  const copyToClipboard = (data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const DataSection = ({ title, data, icon: Icon }) => (
    <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <Icon className="w-5 h-5 mr-2 text-cyan-400" />
          {title}
        </h3>
        <button
          onClick={() => copyToClipboard(data)}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          title="Copy JSON"
        >
          {copied ? <Icons.Check className="w-4 h-4 text-green-400" /> : <Icons.Copy className="w-4 h-4" />}
        </button>
      </div>
      <pre className="bg-gray-900/50 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
        <code className="text-xs text-gray-300">
          {JSON.stringify(data, null, 2)}
        </code>
      </pre>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Raw System Data
            </h1>
            <p className="text-gray-400 mt-2">Real-time agent, Redis, and system data</p>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-300">Auto-refresh (3s)</span>
            </label>
            
            <button
              onClick={loadAllData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Icons.RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {loading && !agentData ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading system data...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 rounded-xl p-4 text-center"
              >
                <div className="text-2xl font-bold text-green-400">
                  {agentData?.agents?.length || 0}
                </div>
                <div className="text-sm text-gray-400">Total Agents</div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 rounded-xl p-4 text-center"
              >
                <div className="text-2xl font-bold text-blue-400">
                  {Object.keys(queueData || {}).length}
                </div>
                <div className="text-sm text-gray-400">Active Queues</div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 rounded-xl p-4 text-center"
              >
                <div className="text-2xl font-bold text-purple-400">
                  {redisStatus?.connected ? 'Connected' : 'Disconnected'}
                </div>
                <div className="text-sm text-gray-400">Redis Status</div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 rounded-xl p-4 text-center"
              >
                <div className="text-2xl font-bold text-yellow-400">
                  {healthData?.status || 'Unknown'}
                </div>
                <div className="text-sm text-gray-400">System Health</div>
              </motion.div>
            </div>

            {/* Raw Data Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataSection 
                title="Agent Stats" 
                data={agentData} 
                icon={Server}
              />
              
              <DataSection 
                title="Queue Stats" 
                data={queueData} 
                icon={Database}
              />
              
              <DataSection 
                title="Redis Status" 
                data={redisStatus} 
                icon={Activity}
              />
              
              <DataSection 
                title="System Health" 
                data={healthData} 
                icon={Terminal}
              />
            </div>

            {/* Combined Data View */}
            <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <Icons.Database className="w-5 h-5 mr-2 text-cyan-400" />
                  Complete System Data
                </h3>
                <button
                  onClick={() => copyToClipboard({
                    timestamp: new Date().toISOString(),
                    agents: agentData,
                    queues: queueData,
                    redis: redisStatus,
                    health: healthData
                  })}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  title="Copy All Data"
                >
                  {copied ? <Icons.Check className="w-4 h-4 text-green-400" /> : <Icons.Copy className="w-4 h-4" />}
                </button>
              </div>
              <pre className="bg-gray-900/50 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                <code className="text-xs text-gray-300">
                  {JSON.stringify({
                    timestamp: new Date().toISOString(),
                    agents: agentData,
                    queues: queueData,
                    redis: redisStatus,
                    health: healthData
                  }, null, 2)}
                </code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}