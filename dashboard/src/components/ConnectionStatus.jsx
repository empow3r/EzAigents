'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  Server, 
  Database, 
  Volume2, 
  MessageSquare,
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Globe,
  Bot
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ConnectionStatus = ({ darkMode }) => {
  const [connections, setConnections] = useState({
    redis: { status: 'checking', latency: null, error: null },
    tts: { status: 'checking', latency: null, error: null },
    openrouter: { status: 'checking', latency: null, error: null },
    websocket: { status: 'checking', latency: null, error: null },
    agents: { 
      claude: { status: 'checking', count: 0 },
      gpt: { status: 'checking', count: 0 },
      deepseek: { status: 'checking', count: 0 },
      mistral: { status: 'checking', count: 0 },
      gemini: { status: 'checking', count: 0 }
    }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const checkConnections = async () => {
    setIsRefreshing(true);
    
    try {
      // Check Redis connection
      const redisStart = Date.now();
      try {
        const redisRes = await fetch('/api/redis-status');
        const redisData = await redisRes.json();
        setConnections(prev => ({
          ...prev,
          redis: {
            status: redisData.connected ? 'connected' : 'disconnected',
            latency: Date.now() - redisStart,
            error: redisData.error || null,
            info: redisData.info || {}
          }
        }));
      } catch (error) {
        setConnections(prev => ({
          ...prev,
          redis: { status: 'error', latency: null, error: error.message }
        }));
      }

      // Check TTS Server connection
      const ttsStart = Date.now();
      try {
        const ttsRes = await fetch('/api/tts-status', { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        const ttsData = await ttsRes.json();
        setConnections(prev => ({
          ...prev,
          tts: {
            status: ttsData.connected ? 'connected' : 'disconnected',
            latency: Date.now() - ttsStart,
            error: ttsData.error || null,
            server: ttsData.server || null
          }
        }));
      } catch (error) {
        setConnections(prev => ({
          ...prev,
          tts: { status: 'error', latency: null, error: error.message }
        }));
      }

      // Check OpenRouter API
      const openrouterStart = Date.now();
      try {
        const orRes = await fetch('/api/openrouter-status');
        const orData = await orRes.json();
        setConnections(prev => ({
          ...prev,
          openrouter: {
            status: orData.connected ? 'connected' : 'disconnected',
            latency: Date.now() - openrouterStart,
            error: orData.error || null,
            models: orData.models || []
          }
        }));
      } catch (error) {
        setConnections(prev => ({
          ...prev,
          openrouter: { status: 'error', latency: null, error: error.message }
        }));
      }

      // Check WebSocket connection
      setConnections(prev => ({
        ...prev,
        websocket: {
          status: window.io && window.io.connected ? 'connected' : 'disconnected',
          latency: null,
          error: null
        }
      }));

      // Check agent statuses
      try {
        const agentRes = await fetch('/api/agents');
        const agentData = await agentRes.json();
        if (agentData.success && agentData.agents) {
          const agentStatuses = {};
          ['claude', 'gpt', 'deepseek', 'mistral', 'gemini'].forEach(model => {
            const modelAgents = agentData.agents.filter(a => 
              a.id.toLowerCase().includes(model) || a.model?.toLowerCase().includes(model)
            );
            agentStatuses[model] = {
              status: modelAgents.length > 0 ? 'connected' : 'disconnected',
              count: modelAgents.length,
              agents: modelAgents
            };
          });
          setConnections(prev => ({
            ...prev,
            agents: agentStatuses
          }));
        }
      } catch (error) {
        console.error('Error checking agents:', error);
      }

    } catch (error) {
      console.error('Error checking connections:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkConnections();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(checkConnections, 30000); // Check every 30 seconds
    }
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500 animate-pulse" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'text-green-500';
      case 'disconnected':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const services = [
    {
      name: 'Redis Queue',
      icon: Database,
      key: 'redis',
      description: 'Central message broker',
      details: connections.redis.info?.used_memory_human || 'N/A'
    },
    {
      name: 'TTS Server',
      icon: Volume2,
      key: 'tts',
      description: 'Text-to-speech service',
      details: connections.tts.server || 'http://ai_llm:11435'
    },
    {
      name: 'OpenRouter API',
      icon: Globe,
      key: 'openrouter',
      description: 'LLM gateway service',
      details: connections.openrouter.models?.length ? `${connections.openrouter.models.length} models` : 'N/A'
    },
    {
      name: 'WebSocket',
      icon: MessageSquare,
      key: 'websocket',
      description: 'Real-time updates',
      details: 'Socket.IO'
    }
  ];

  return (
    <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wifi className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
            Connection Status
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              Auto Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={checkConnections}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Services */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => {
            const connection = connections[service.key];
            const Icon = service.icon;
            
            return (
              <motion.div
                key={service.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      darkMode ? 'bg-gray-600' : 'bg-white'
                    }`}>
                      <Icon className={`w-5 h-5 ${getStatusColor(connection.status)}`} />
                    </div>
                    <div>
                      <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {service.name}
                      </h3>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {service.description}
                      </p>
                      {connection.latency && (
                        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          Latency: {connection.latency}ms
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusIcon(connection.status)}
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {service.details}
                    </p>
                  </div>
                </div>
                {connection.error && (
                  <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-500">
                    {connection.error}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Agent Status */}
        <div>
          <h3 className={`font-medium mb-3 flex items-center gap-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <Bot className="w-4 h-4" />
            Active Agents
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(connections.agents).map(([model, agent]) => (
              <div
                key={model}
                className={`p-3 rounded-lg text-center ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}
              >
                <div className="capitalize font-medium text-sm mb-1">
                  {model}
                </div>
                <div className={`text-2xl font-bold ${getStatusColor(agent.status)}`}>
                  {agent.count}
                </div>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {agent.status === 'connected' ? 'active' : 'offline'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Connection Summary */}
        <div className={`p-3 rounded-lg ${
          darkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                  Connected: {Object.values(connections).filter(c => c.status === 'connected').length}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                  Disconnected: {Object.values(connections).filter(c => c.status === 'disconnected').length}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                  Errors: {Object.values(connections).filter(c => c.status === 'error').length}
                </span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectionStatus;