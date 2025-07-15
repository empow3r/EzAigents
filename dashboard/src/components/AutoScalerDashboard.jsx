'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Progress } from '@/src/components/ui/progress';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import * as Icons from 'lucide-react';

export default function AutoScalerDashboard() {
  const [scalerStatus, setScalerStatus] = useState(null);
  const [config, setConfig] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [scalingHistory, setScalingHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScalerStatus();
    const interval = setInterval(fetchScalerStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchScalerStatus = async () => {
    try {
      const response = await fetch('/api/autoscaler-status');
      const data = await response.json();
      
      if (data.success) {
        setScalerStatus(data.status);
        setConfig(data.status.config || {});
        setScalingHistory(data.status.history || []);
        setIsRunning(data.isRunning);
      }
    } catch (error) {
      console.error('Error fetching scaler status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartStop = async () => {
    try {
      const action = isRunning ? 'stop' : 'start';
      const response = await fetch('/api/autoscaler-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        setIsRunning(!isRunning);
        fetchScalerStatus();
      }
    } catch (error) {
      console.error('Error controlling scaler:', error);
    }
  };

  const updateConfig = async (newConfig) => {
    try {
      const response = await fetch('/api/autoscaler-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      
      if (response.ok) {
        setConfig(newConfig);
        fetchScalerStatus();
      }
    } catch (error) {
      console.error('Error updating config:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-600';
      case 'stopped': return 'text-gray-600';
      case 'error': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Icons.Activity className="w-8 h-8 text-blue-500" />
            Auto-Scaler Control
          </h1>
          <p className="text-gray-600">Dynamic agent scaling based on queue depth and performance</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isRunning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-green-500' : 'bg-gray-500'
            }`}></div>
            {isRunning ? 'Running' : 'Stopped'}
          </div>
          
          <Button
            onClick={handleStartStop}
            variant={isRunning ? 'outline' : 'default'}
          >
            {isRunning ? (
              <>
                <Icons.Pause className="w-4 h-4 mr-2" />
                Stop Scaler
              </>
            ) : (
              <>
                <Icons.Play className="w-4 h-4 mr-2" />
                Start Scaler
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {scalerStatus?.performance?.totalAgents || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Load</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {scalerStatus?.performance?.totalLoad || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {scalingHistory.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {scalerStatus?.performance?.totalAgents > 0 ? 
                Math.round((scalerStatus.performance.totalLoad / scalerStatus.performance.totalAgents) * 100) / 100 : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.Settings className="w-5 h-5" />
            Scaling Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Min Agents</label>
              <Input
                type="number"
                value={config.minAgents || 1}
                onChange={(e) => setConfig({...config, minAgents: parseInt(e.target.value)})}
                onBlur={() => updateConfig(config)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Agents</label>
              <Input
                type="number"
                value={config.maxAgents || 10}
                onChange={(e) => setConfig({...config, maxAgents: parseInt(e.target.value)})}
                onBlur={() => updateConfig(config)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Scale Up Threshold</label>
              <Input
                type="number"
                value={config.scaleUpThreshold || 20}
                onChange={(e) => setConfig({...config, scaleUpThreshold: parseInt(e.target.value)})}
                onBlur={() => updateConfig(config)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Scale Down Threshold</label>
              <Input
                type="number"
                value={config.scaleDownThreshold || 5}
                onChange={(e) => setConfig({...config, scaleDownThreshold: parseInt(e.target.value)})}
                onBlur={() => updateConfig(config)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.Users className="w-5 h-5" />
            Model Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scalerStatus?.models && Object.entries(scalerStatus.models).map(([model, data]) => (
              <div key={model} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="text-lg font-semibold">{model}</div>
                  <div className="flex items-center gap-2">
                    <Icons.Users className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">{data.agents} agents</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <div className="font-medium">Queue: {data.metrics?.queueDepth || 0}</div>
                    <div className="text-gray-600">Processing: {data.metrics?.processingCount || 0}</div>
                  </div>
                  
                  <div className="w-24">
                    <Progress 
                      value={Math.min(100, (data.metrics?.queueDepth || 0) / config.scaleUpThreshold * 100)} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    data.metrics?.queueDepth > config.scaleUpThreshold ? 'bg-red-100 text-red-800' :
                    data.metrics?.queueDepth > config.scaleDownThreshold ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {data.metrics?.queueDepth > config.scaleUpThreshold ? 'High Load' :
                     data.metrics?.queueDepth > config.scaleDownThreshold ? 'Normal' : 'Low Load'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scaling History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.BarChart3 className="w-5 h-5" />
            Recent Scaling Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {scalingHistory.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No scaling actions yet
                </div>
              ) : (
                scalingHistory.map((action, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {action.action === 'scale_up' ? (
                        <Icons.TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <Icons.TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                      
                      <div>
                        <div className="font-medium">
                          {action.model}: {action.from} → {action.to} agents
                        </div>
                        <div className="text-sm text-gray-600">
                          {action.reason}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatTimestamp(action.timestamp)}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        action.action === 'scale_up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {action.action.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}