'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const STATUS_COLORS = {
  active: '#10B981',
  idle: '#6B7280', 
  unresponsive: '#EF4444',
  crashed: '#DC2626',
  recovering: '#F59E0B'
};

export default function AgentDashboard() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [healthData, setHealthData] = useState({});
  const [lockData, setLockData] = useState([]);
  const [coordinationEvents, setCoordinationEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch basic agent stats
        const response = await fetch('/api/agent-stats');
        const stats = await response.json();
        setStats(stats);
        
        // Fetch health data
        const healthResponse = await fetch('/api/agent-health');
        const health = await healthResponse.json();
        setHealthData(health);
        
        // Fetch file locks
        const locksResponse = await fetch('/api/file-locks');
        const locks = await locksResponse.json();
        setLockData(locks);
        
        // Fetch coordination events
        const coordResponse = await fetch('/api/coordination-events');
        const coordination = await coordResponse.json();
        setCoordinationEvents(coordination);
        
        // Enhanced agent data with health status
        const agentData = Object.entries(stats)
          .filter(([key]) => !['activeAgents', 'totalAgents'].includes(key))
          .map(([type, s]) => {
            const agentHealth = health.agents?.find(a => a.id?.includes(type)) || {};
            return {
              name: type.toUpperCase(),
              tokens: s.avgTokens || 0,
              runs: s.runs || 0,
              summary: s.lastSummary || 'No activity',
              status: agentHealth.status || 'unknown',
              lastHeartbeat: agentHealth.last_heartbeat,
              errorCount: agentHealth.error_count || 0,
              recoveryAttempts: agentHealth.recovery_attempts || 0
            };
          });
        
        setData(agentData);
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Fallback data
        setData([
          { name: 'CLAUDE', tokens: 0, runs: 0, summary: 'Connection error', status: 'unknown' },
          { name: 'GPT', tokens: 0, runs: 0, summary: 'Connection error', status: 'unknown' },
          { name: 'DEEPSEEK', tokens: 0, runs: 0, summary: 'Connection error', status: 'unknown' },
          { name: 'MISTRAL', tokens: 0, runs: 0, summary: 'Connection error', status: 'unknown' },
          { name: 'GEMINI', tokens: 0, runs: 0, summary: 'Connection error', status: 'unknown' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Refresh every 15 seconds for real-time monitoring
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.filter(a => a.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">File Locks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {lockData.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              healthData.system_health?.health_percentage >= 80 ? 'text-green-600' :
              healthData.system_health?.health_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {Math.round(healthData.system_health?.health_percentage || 0)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {data.reduce((sum, agent) => sum + agent.runs, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Alerts */}
      {data.some(a => a.status === 'unresponsive' || a.status === 'crashed') && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">🚨 Health Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.filter(a => a.status === 'unresponsive' || a.status === 'crashed').map(agent => (
                <div key={agent.name} className="flex items-center justify-between p-2 bg-red-100 rounded">
                  <span className="font-medium text-red-800">{agent.name}</span>
                  <span className="text-sm text-red-600">
                    {agent.status} • {agent.recoveryAttempts} recovery attempts
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Coordination Events */}
      {coordinationEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🤝 Recent Coordination Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {coordinationEvents.slice(0, 5).map((event, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded text-sm">
                  <span>{event.message}</span>
                  <span className="text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active File Locks */}
      {lockData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🔒 Active File Locks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {lockData.map((lock, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                  <div>
                    <div className="font-medium text-sm">{lock.file}</div>
                    <div className="text-xs text-gray-600">Locked by {lock.owner}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{Math.max(0, lock.ttl)}s</div>
                    <div className="text-xs text-gray-500">remaining</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Token Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Token Usage by Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tokens" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Agent Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Runs Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="runs"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Agent Details */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Health Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.map((agent, index) => (
                <div key={agent.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: STATUS_COLORS[agent.status] || STATUS_COLORS.idle }}
                    ></div>
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-sm text-gray-500">
                        {agent.runs} runs • {agent.tokens} avg tokens
                      </div>
                      {agent.errorCount > 0 && (
                        <div className="text-xs text-red-600">
                          {agent.errorCount} errors • {agent.recoveryAttempts} recoveries
                        </div>
                      )}
                      {agent.lastHeartbeat && (
                        <div className="text-xs text-gray-400">
                          Last seen: {new Date(agent.lastHeartbeat).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    agent.status === 'active' ? 'bg-green-100 text-green-800' :
                    agent.status === 'idle' ? 'bg-gray-100 text-gray-800' :
                    agent.status === 'unresponsive' ? 'bg-red-100 text-red-800' :
                    agent.status === 'crashed' ? 'bg-red-200 text-red-900' :
                    agent.status === 'recovering' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {agent.status || 'unknown'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Agent Activity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((agent) => (
          <Card key={agent.name} className={`hover:shadow-lg transition-shadow border-l-4 ${
            agent.status === 'active' ? 'border-l-green-500' :
            agent.status === 'unresponsive' ? 'border-l-red-500' :
            agent.status === 'crashed' ? 'border-l-red-700' :
            agent.status === 'recovering' ? 'border-l-yellow-500' :
            'border-l-gray-300'
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <span>{agent.name}</span>
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: STATUS_COLORS[agent.status] || STATUS_COLORS.idle }}
                  ></div>
                </span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  agent.status === 'active' ? 'bg-green-100 text-green-800' :
                  agent.status === 'idle' ? 'bg-gray-100 text-gray-800' :
                  agent.status === 'unresponsive' ? 'bg-red-100 text-red-800' :
                  agent.status === 'crashed' ? 'bg-red-200 text-red-900' :
                  agent.status === 'recovering' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {agent.status || 'unknown'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Runs:</span>
                  <span className="font-medium">{agent.runs}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg. Tokens:</span>
                  <span className="font-medium">{agent.tokens}</span>
                </div>
                {agent.errorCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Errors:</span>
                    <span className="font-medium text-red-600">{agent.errorCount}</span>
                  </div>
                )}
                {agent.recoveryAttempts > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Recovery Attempts:</span>
                    <span className="font-medium text-yellow-600">{agent.recoveryAttempts}</span>
                  </div>
                )}
                {agent.lastHeartbeat && (
                  <div className="flex justify-between text-sm">
                    <span>Last Heartbeat:</span>
                    <span className="font-medium text-xs">
                      {new Date(agent.lastHeartbeat).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                <div className="mt-3">
                  <div className="text-xs text-gray-600 mb-1">Last Activity:</div>
                  <div className="text-xs text-gray-800 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                    {agent.summary}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
