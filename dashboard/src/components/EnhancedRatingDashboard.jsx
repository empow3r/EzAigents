import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const EnhancedRatingDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [agentRankings, setAgentRankings] = useState([]);
  const [taskInsights, setTaskInsights] = useState({});
  const [realTimeMetrics, setRealTimeMetrics] = useState({});
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load overview data
      const overviewResponse = await fetch('/api/enhanced-ratings?type=dashboard-overview');
      const overviewData = await overviewResponse.json();
      
      if (overviewData.success) {
        setDashboardData(overviewData.data);
        setAgentRankings(overviewData.data.agentRankings);
      }

      // Load task insights
      const insightsResponse = await fetch(`/api/enhanced-ratings?type=task-insights&timeframe=${selectedTimeframe}`);
      const insightsData = await insightsResponse.json();
      
      if (insightsData.success) {
        setTaskInsights(insightsData.data);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAgentSelect = async (agentId) => {
    setSelectedAgent(agentId);
    try {
      const response = await fetch(`/api/enhanced-ratings?type=agent-details&id=${agentId}&timeframe=${selectedTimeframe}`);
      const data = await response.json();
      // Handle agent details
    } catch (error) {
      console.error('Failed to load agent details:', error);
    }
  };

  const submitRating = async (ratingData) => {
    try {
      const response = await fetch('/api/enhanced-ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ratingData)
      });
      
      if (response.ok) {
        loadDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to submit rating:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading Enhanced Rating Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Enhanced Rating System</h1>
        <div className="flex gap-4">
          <select 
            value={selectedTimeframe} 
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData?.summary?.totalAgents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(dashboardData?.summary?.averageQuality || 0).toFixed(1)}
            </div>
            <div className="text-sm text-gray-500">/ 5.0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {dashboardData?.summary?.topPerformer || 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Excellent</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Rankings */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agentRankings.map((agent, index) => (
              <div 
                key={agent.agentId} 
                className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                onClick={() => handleAgentSelect(agent.agentId)}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold">{agent.agentId}</div>
                    <div className="text-sm text-gray-500">
                      {agent.totalRatings} ratings
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-lg font-bold">{agent.overallScore.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">Overall</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{agent.rankings?.technical?.toFixed(1) || 'N/A'}</div>
                    <div className="text-xs text-gray-500">Technical</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{agent.rankings?.reliability?.toFixed(1) || 'N/A'}</div>
                    <div className="text-xs text-gray-500">Reliability</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task Quality Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Task Quality Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(taskInsights.qualityDistribution || {}).map(([range, count]) => (
                <div key={range} className="flex justify-between items-center">
                  <span>{range}</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(count / Math.max(...Object.values(taskInsights.qualityDistribution || {}))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Improvement Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(taskInsights.improvementAreas || []).map((area, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                  <span className="text-sm">{area.area}</span>
                  <span className="text-xs text-gray-600">{area.score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Rating Form */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Rating Submission</CardTitle>
        </CardHeader>
        <CardContent>
          <QuickRatingForm onSubmit={submitRating} />
        </CardContent>
      </Card>

      {/* Real-time Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(dashboardData?.recentActivity || []).map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-2 border-b">
                <div>
                  <span className="font-medium">{activity.type}</span>
                  <span className="text-sm text-gray-500 ml-2">{activity.description}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Quick Rating Form Component
const QuickRatingForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    type: 'agent',
    agentId: '',
    ratings: {
      technical: { accuracy: 5, speed: 5, efficiency: 5 },
      qualitative: { creativity: 5, clarity: 5, helpfulness: 5 },
      reliability: { uptime: 100, errorRate: 1, consistency: 5 }
    },
    metadata: {
      taskType: 'general',
      ratedBy: 'user'
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      type: formData.type,
      data: formData
    });
    
    // Reset form
    setFormData({
      ...formData,
      agentId: '',
      ratings: {
        technical: { accuracy: 5, speed: 5, efficiency: 5 },
        qualitative: { creativity: 5, clarity: 5, helpfulness: 5 },
        reliability: { uptime: 100, errorRate: 1, consistency: 5 }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Rating Type</label>
          <select 
            value={formData.type} 
            onChange={(e) => setFormData({...formData, type: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="agent">Agent Rating</option>
            <option value="task">Task Rating</option>
            <option value="ux">User Experience</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Agent ID</label>
          <input
            type="text"
            value={formData.agentId}
            onChange={(e) => setFormData({...formData, agentId: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="claude-001, gpt-001, etc."
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Technical (1-10)</label>
          <input
            type="number"
            min="1"
            max="10"
            value={formData.ratings.technical.accuracy}
            onChange={(e) => setFormData({
              ...formData,
              ratings: {
                ...formData.ratings,
                technical: {
                  ...formData.ratings.technical,
                  accuracy: parseFloat(e.target.value)
                }
              }
            })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Quality (1-5)</label>
          <input
            type="number"
            min="1"
            max="5"
            step="0.1"
            value={formData.ratings.qualitative.helpfulness}
            onChange={(e) => setFormData({
              ...formData,
              ratings: {
                ...formData.ratings,
                qualitative: {
                  ...formData.ratings.qualitative,
                  helpfulness: parseFloat(e.target.value)
                }
              }
            })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Reliability (1-5)</label>
          <input
            type="number"
            min="1"
            max="5"
            step="0.1"
            value={formData.ratings.reliability.consistency}
            onChange={(e) => setFormData({
              ...formData,
              ratings: {
                ...formData.ratings,
                reliability: {
                  ...formData.ratings.reliability,
                  consistency: parseFloat(e.target.value)
                }
              }
            })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
      >
        Submit Rating
      </button>
    </form>
  );
};

export default EnhancedRatingDashboard;