import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { timeRange = '24h', agent = 'all' } = req.query;
    
    // Get enhanced metrics
    const enhancedData = await getEnhancedMetrics(timeRange, agent);
    
    res.status(200).json(enhancedData);
  } catch (error) {
    console.error('Error fetching enhanced metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch enhanced metrics',
      timestamp: new Date().toISOString()
    });
  }
}

async function getEnhancedMetrics(timeRange, agent) {
  try {
    // Get performance data
    const performanceData = await getPerformanceTimeSeries(timeRange, agent);
    
    // Get cost analytics
    const costAnalytics = await getCostAnalytics(timeRange, agent);
    
    // Get predictive insights
    const predictions = await generatePredictions(performanceData);
    
    // Get AI insights
    const aiInsights = await generateAIInsights(performanceData, costAnalytics);
    
    // Detect anomalies
    const anomalies = await detectAnomalies(performanceData);
    
    // Calculate advanced KPIs
    const kpis = calculateAdvancedKPIs(performanceData, costAnalytics);
    
    return {
      timestamp: new Date().toISOString(),
      timeRange,
      agent,
      performance: performanceData,
      cost: costAnalytics,
      predictions,
      insights: aiInsights,
      anomalies,
      kpis,
      health: await calculateSystemHealth(),
      trends: calculateTrends(performanceData)
    };
  } catch (error) {
    console.error('Error in getEnhancedMetrics:', error);
    throw error;
  }
}

async function getPerformanceTimeSeries(timeRange, agent) {
  const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
  const now = Date.now();
  
  try {
    // Get historical data from Redis
    const historicalData = await redis.lrange('analytics:performance', 0, -1);
    
    // Generate time series data
    const timeSeries = [];
    for (let i = 0; i < hours; i++) {
      const timestamp = now - (hours - 1 - i) * 60 * 60 * 1000;
      const time = new Date(timestamp);
      
      // Simulate realistic patterns
      const hour = time.getHours();
      const isPeak = [9, 10, 11, 14, 15, 16].includes(hour);
      const isWeekend = [0, 6].includes(time.getDay());
      
      const baseLoad = isPeak && !isWeekend ? 40 : isWeekend ? 10 : 20;
      const variation = Math.random() * 20 - 10;
      
      timeSeries.push({
        timestamp,
        time: timeRange === '24h' ? `${hour.toString().padStart(2, '0')}:00` : time.toLocaleDateString(),
        tasksCompleted: Math.max(0, Math.floor(baseLoad + variation)),
        avgResponseTime: Math.floor(Math.random() * (isPeak ? 2000 : 1000)) + 300,
        successRate: Math.min(100, Math.max(80, 95 + Math.random() * 10 - 5)),
        activeAgents: Math.floor(Math.random() * 3) + (isPeak ? 4 : 2),
        queueDepth: Math.floor(Math.random() * (isPeak ? 40 : 15)) + 2,
        tokenUsage: Math.floor(Math.random() * 30000) + 5000,
        errorRate: Math.max(0, Math.random() * (isPeak ? 3 : 1)),
        throughput: Math.floor((baseLoad + variation) / ((Math.random() * 2000 + 500) / 1000)),
        cpuUsage: Math.min(100, Math.max(20, 45 + Math.random() * 30 - 15)),
        memoryUsage: Math.min(100, Math.max(30, 65 + Math.random() * 20 - 10))
      });
    }
    
    return timeSeries;
  } catch (error) {
    console.error('Error getting performance time series:', error);
    return [];
  }
}

async function getCostAnalytics(timeRange, agent) {
  const agentTypes = agent === 'all' 
    ? ['claude', 'gpt', 'deepseek', 'mistral', 'gemini', 'webscraper']
    : [agent];
    
  const costData = agentTypes.map(type => {
    const tokensUsed = Math.floor(Math.random() * 80000) + 20000;
    const costPerToken = {
      claude: 0.015,
      gpt: 0.01,
      deepseek: 0.002,
      mistral: 0.007,
      gemini: 0.005,
      webscraper: 0.003
    };
    
    const cost = (tokensUsed * costPerToken[type] / 1000);
    const efficiency = Math.floor(Math.random() * 25) + 75;
    const tasksCompleted = Math.floor(tokensUsed / (1000 - efficiency * 8));
    
    return {
      agent: type,
      tokensUsed,
      cost: parseFloat(cost.toFixed(2)),
      efficiency,
      tasksCompleted,
      avgTokensPerTask: Math.floor(tokensUsed / Math.max(1, tasksCompleted)),
      costPerTask: parseFloat((cost / Math.max(1, tasksCompleted)).toFixed(4)),
      roi: parseFloat(((efficiency / 100) * 10).toFixed(2)),
      utilizationRate: Math.floor(Math.random() * 30) + 70,
      errorRate: Math.random() * 3,
      avgResponseTime: Math.floor(Math.random() * 1500) + 200
    };
  });
  
  return {
    agents: costData,
    totalCost: costData.reduce((sum, agent) => sum + agent.cost, 0),
    totalTokens: costData.reduce((sum, agent) => sum + agent.tokensUsed, 0),
    avgEfficiency: costData.reduce((sum, agent) => sum + agent.efficiency, 0) / costData.length,
    costTrend: generateCostTrend(),
    optimizationOpportunities: identifyCostOptimizations(costData)
  };
}

function generateCostTrend() {
  const trend = [];
  const now = Date.now();
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = now - i * 60 * 60 * 1000;
    const hour = new Date(timestamp).getHours();
    const isPeak = [9, 10, 11, 14, 15, 16].includes(hour);
    
    trend.push({
      timestamp,
      hour: hour.toString().padStart(2, '0') + ':00',
      cost: parseFloat((Math.random() * (isPeak ? 15 : 8) + 2).toFixed(2)),
      tokens: Math.floor(Math.random() * (isPeak ? 40000 : 20000) + 5000),
      tasks: Math.floor(Math.random() * (isPeak ? 50 : 25) + 10)
    });
  }
  
  return trend;
}

function identifyCostOptimizations(costData) {
  const opportunities = [];
  
  // Find inefficient agents
  const inefficientAgents = costData.filter(agent => agent.efficiency < 80);
  inefficientAgents.forEach(agent => {
    opportunities.push({
      type: 'efficiency',
      agent: agent.agent,
      impact: 'medium',
      description: `${agent.agent} has ${agent.efficiency}% efficiency. Optimization could save $${(agent.cost * 0.2).toFixed(2)}/hour`,
      recommendation: 'Review prompt engineering and task allocation',
      potentialSavings: agent.cost * 0.2
    });
  });
  
  // Find high-cost agents
  const highCostAgents = costData.filter(agent => agent.costPerTask > 0.05);
  highCostAgents.forEach(agent => {
    opportunities.push({
      type: 'cost_per_task',
      agent: agent.agent,
      impact: 'high',
      description: `${agent.agent} costs $${agent.costPerTask.toFixed(4)} per task. Consider alternative models.`,
      recommendation: 'Evaluate using lower-cost models for simple tasks',
      potentialSavings: agent.cost * 0.3
    });
  });
  
  return opportunities;
}

async function generatePredictions(performanceData) {
  if (performanceData.length < 12) return [];
  
  const recent = performanceData.slice(-12);
  const taskTrend = calculateLinearTrend(recent.map(d => d.tasksCompleted));
  const responseTrend = calculateLinearTrend(recent.map(d => d.avgResponseTime));
  
  const predictions = [];
  const lastPoint = recent[recent.length - 1];
  
  for (let i = 1; i <= 12; i++) {
    const futureTimestamp = lastPoint.timestamp + i * 60 * 60 * 1000;
    const confidence = Math.max(0.3, 0.95 - (i * 0.05));
    
    predictions.push({
      timestamp: futureTimestamp,
      time: new Date(futureTimestamp).getHours().toString().padStart(2, '0') + ':00',
      predictedTasks: Math.max(0, lastPoint.tasksCompleted + (taskTrend * i)),
      predictedResponseTime: Math.max(200, lastPoint.avgResponseTime + (responseTrend * i)),
      confidence,
      scenario: i <= 4 ? 'short_term' : i <= 8 ? 'medium_term' : 'long_term'
    });
  }
  
  return predictions;
}

function calculateLinearTrend(values) {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
  
  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
}

async function generateAIInsights(performanceData, costAnalytics) {
  const insights = [];
  
  if (performanceData.length === 0) return insights;
  
  const recent = performanceData.slice(-6);
  const avgSuccess = recent.reduce((sum, d) => sum + d.successRate, 0) / recent.length;
  const avgResponse = recent.reduce((sum, d) => sum + d.avgResponseTime, 0) / recent.length;
  const avgThroughput = recent.reduce((sum, d) => sum + (d.throughput || 0), 0) / recent.length;
  
  // Performance insights
  if (avgSuccess < 95) {
    insights.push({
      id: 'success_rate_low',
      type: avgSuccess < 90 ? 'alert' : 'warning',
      category: 'Performance',
      title: 'Success Rate Below Target',
      description: `Current success rate is ${avgSuccess.toFixed(1)}%. Target is 95%+.`,
      impact: avgSuccess < 90 ? 'high' : 'medium',
      recommendation: 'Analyze failed task patterns and optimize agent prompts',
      confidence: 0.85,
      actionable: true
    });
  }
  
  if (avgResponse > 1500) {
    insights.push({
      id: 'response_time_high',
      type: 'warning',
      category: 'Performance',
      title: 'Response Time Optimization Needed',
      description: `Average response time is ${avgResponse.toFixed(0)}ms. Consider optimization.`,
      impact: 'medium',
      recommendation: 'Review queue processing and consider load balancing',
      confidence: 0.78,
      actionable: true
    });
  }
  
  // Cost insights
  const totalCost = costAnalytics.totalCost;
  const avgEfficiency = costAnalytics.avgEfficiency;
  
  if (avgEfficiency < 80) {
    insights.push({
      id: 'efficiency_low',
      type: 'info',
      category: 'Cost Optimization',
      title: 'Agent Efficiency Below Optimal',
      description: `Average efficiency is ${avgEfficiency.toFixed(1)}%. Potential savings: $${(totalCost * 0.2).toFixed(2)}/hour.`,
      impact: 'medium',
      recommendation: 'Implement efficiency monitoring and prompt optimization',
      confidence: 0.82,
      actionable: true
    });
  }
  
  // Capacity insights
  const queueTrend = calculateLinearTrend(recent.map(d => d.queueDepth));
  if (queueTrend > 2) {
    insights.push({
      id: 'queue_growth',
      type: 'info',
      category: 'Capacity Planning',
      title: 'Queue Growth Detected',
      description: 'Queue depth is trending upward. Consider scaling resources.',
      impact: 'medium',
      recommendation: 'Monitor load patterns and prepare auto-scaling policies',
      confidence: 0.75,
      actionable: true
    });
  }
  
  return insights;
}

async function detectAnomalies(performanceData) {
  const anomalies = [];
  
  if (performanceData.length < 12) return anomalies;
  
  const recent = performanceData.slice(-12);
  const baseline = performanceData.slice(-24, -12);
  
  // Response time anomalies
  const avgResponseTime = baseline.reduce((sum, d) => sum + d.avgResponseTime, 0) / baseline.length;
  const stdDevResponse = Math.sqrt(
    baseline.reduce((sum, d) => sum + Math.pow(d.avgResponseTime - avgResponseTime, 2), 0) / baseline.length
  );
  
  recent.forEach((point, index) => {
    if (point.avgResponseTime > avgResponseTime + 2 * stdDevResponse) {
      anomalies.push({
        id: `response_spike_${index}`,
        type: 'response_time_spike',
        severity: 'high',
        timestamp: point.timestamp,
        description: `Response time spike: ${point.avgResponseTime}ms (${((point.avgResponseTime / avgResponseTime - 1) * 100).toFixed(1)}% above normal)`,
        metric: 'avgResponseTime',
        value: point.avgResponseTime,
        baseline: avgResponseTime,
        confidence: 0.9
      });
    }
  });
  
  // Success rate anomalies
  const avgSuccessRate = baseline.reduce((sum, d) => sum + d.successRate, 0) / baseline.length;
  recent.forEach((point, index) => {
    if (point.successRate < avgSuccessRate * 0.9) {
      anomalies.push({
        id: `success_drop_${index}`,
        type: 'success_rate_drop',
        severity: point.successRate < avgSuccessRate * 0.8 ? 'high' : 'medium',
        timestamp: point.timestamp,
        description: `Success rate drop: ${point.successRate.toFixed(1)}% (${((1 - point.successRate / avgSuccessRate) * 100).toFixed(1)}% below normal)`,
        metric: 'successRate',
        value: point.successRate,
        baseline: avgSuccessRate,
        confidence: 0.85
      });
    }
  });
  
  return anomalies;
}

function calculateAdvancedKPIs(performanceData, costAnalytics) {
  if (performanceData.length === 0) return {};
  
  const recent = performanceData.slice(-6);
  
  return {
    throughput: {
      current: recent.reduce((sum, d) => sum + (d.throughput || 0), 0) / recent.length,
      trend: calculateLinearTrend(recent.map(d => d.throughput || 0)),
      target: 50,
      status: 'good'
    },
    efficiency: {
      current: costAnalytics.avgEfficiency,
      trend: Math.random() * 4 - 2, // Mock trend
      target: 85,
      status: costAnalytics.avgEfficiency >= 85 ? 'excellent' : costAnalytics.avgEfficiency >= 75 ? 'good' : 'needs_improvement'
    },
    reliability: {
      current: recent.reduce((sum, d) => sum + d.successRate, 0) / recent.length,
      trend: calculateLinearTrend(recent.map(d => d.successRate)),
      target: 95,
      status: 'good'
    },
    scalability: {
      current: recent.reduce((sum, d) => sum + d.activeAgents, 0) / recent.length,
      maxCapacity: 20,
      utilizationRate: 0.65,
      status: 'optimal'
    }
  };
}

async function calculateSystemHealth() {
  try {
    // Get basic health data
    const redisHealth = await checkRedisHealth();
    const agentHealth = await checkAgentHealth();
    const queueHealth = await checkQueueHealth();
    
    // Calculate weighted health score
    const health = Math.round(
      (redisHealth.score * 0.2) + 
      (agentHealth.score * 0.5) + 
      (queueHealth.score * 0.3)
    );
    
    return {
      overall: health,
      components: {
        redis: redisHealth,
        agents: agentHealth,
        queues: queueHealth
      },
      status: health >= 90 ? 'excellent' : health >= 75 ? 'good' : health >= 60 ? 'fair' : 'poor',
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    return {
      overall: 0,
      status: 'error',
      error: error.message
    };
  }
}

async function checkRedisHealth() {
  try {
    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;
    
    let score = 100;
    if (latency > 100) score -= 20;
    else if (latency > 50) score -= 10;
    
    return {
      score: Math.max(0, score),
      latency,
      status: score >= 80 ? 'healthy' : 'degraded'
    };
  } catch (error) {
    return { score: 0, status: 'error', error: error.message };
  }
}

async function checkAgentHealth() {
  try {
    const agentTypes = ['claude', 'gpt', 'deepseek', 'mistral', 'gemini', 'webscraper'];
    let healthyAgents = 0;
    
    for (const type of agentTypes) {
      const lastSeen = await redis.get(`agent:heartbeat:${type}`);
      if (lastSeen && Date.now() - parseInt(lastSeen) < 120000) {
        healthyAgents++;
      }
    }
    
    const score = (healthyAgents / agentTypes.length) * 100;
    
    return {
      score,
      healthyAgents,
      totalAgents: agentTypes.length,
      status: score >= 80 ? 'healthy' : 'degraded'
    };
  } catch (error) {
    return { score: 0, status: 'error', error: error.message };
  }
}

async function checkQueueHealth() {
  try {
    const queues = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    let totalPending = 0;
    
    for (const queue of queues) {
      const pending = await redis.llen(`queue:${queue}`);
      totalPending += pending;
    }
    
    let score = 100;
    if (totalPending > 100) score = 60;
    else if (totalPending > 50) score = 80;
    
    return {
      score,
      totalPending,
      status: score >= 80 ? 'healthy' : 'degraded'
    };
  } catch (error) {
    return { score: 0, status: 'error', error: error.message };
  }
}

function calculateTrends(performanceData) {
  if (performanceData.length < 12) return {};
  
  const recent = performanceData.slice(-12);
  
  return {
    tasks: {
      current: recent[recent.length - 1].tasksCompleted,
      trend: calculateLinearTrend(recent.map(d => d.tasksCompleted)),
      change: recent.length > 1 ? recent[recent.length - 1].tasksCompleted - recent[recent.length - 2].tasksCompleted : 0
    },
    responseTime: {
      current: recent[recent.length - 1].avgResponseTime,
      trend: calculateLinearTrend(recent.map(d => d.avgResponseTime)),
      change: recent.length > 1 ? recent[recent.length - 1].avgResponseTime - recent[recent.length - 2].avgResponseTime : 0
    },
    successRate: {
      current: recent[recent.length - 1].successRate,
      trend: calculateLinearTrend(recent.map(d => d.successRate)),
      change: recent.length > 1 ? recent[recent.length - 1].successRate - recent[recent.length - 2].successRate : 0
    }
  };
}