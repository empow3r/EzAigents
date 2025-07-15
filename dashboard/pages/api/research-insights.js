import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Research insights and analytics API
export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await getResearchInsights(req, res);
      case 'POST':
        return await createInsight(req, res);
      case 'PUT':
        return await updateInsight(req, res);
      case 'DELETE':
        return await deleteInsight(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Research insights API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function getResearchInsights(req, res) {
  const { projectId, category, timeframe = '7d', limit = 50 } = req.query;

  try {
    if (projectId) {
      // Get insights for specific project
      const insights = await redis.lrange(`research:insights:${projectId}`, 0, parseInt(limit) - 1);
      const parsedInsights = insights.map(insight => JSON.parse(insight));

      // Get project context
      const projectData = await redis.hget('research:projects', projectId);
      const project = projectData ? JSON.parse(projectData) : null;

      return res.json({
        success: true,
        insights: parsedInsights,
        project,
        count: parsedInsights.length
      });
    }

    // Get global insights with filters
    const allProjectIds = await redis.hkeys('research:projects');
    let allInsights = [];

    for (const projId of allProjectIds) {
      const projectInsights = await redis.lrange(`research:insights:${projId}`, 0, -1);
      const parsed = projectInsights.map(insight => JSON.parse(insight));
      allInsights = allInsights.concat(parsed);
    }

    // Apply filters
    if (category && category !== 'all') {
      allInsights = allInsights.filter(insight => insight.category === category);
    }

    // Apply timeframe filter
    const timeframeMs = getTimeframeMs(timeframe);
    const cutoffTime = Date.now() - timeframeMs;
    allInsights = allInsights.filter(insight => 
      new Date(insight.createdAt).getTime() > cutoffTime
    );

    // Sort by confidence and recency
    allInsights.sort((a, b) => {
      const scoreA = (a.confidence * 0.7) + (new Date(a.createdAt).getTime() / Date.now() * 0.3);
      const scoreB = (b.confidence * 0.7) + (new Date(b.createdAt).getTime() / Date.now() * 0.3);
      return scoreB - scoreA;
    });

    // Limit results
    allInsights = allInsights.slice(0, parseInt(limit));

    // Generate analytics
    const analytics = generateInsightAnalytics(allInsights);

    return res.json({
      success: true,
      insights: allInsights,
      analytics,
      count: allInsights.length
    });
  } catch (error) {
    console.error('Error getting research insights:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get research insights',
      details: error.message
    });
  }
}

async function createInsight(req, res) {
  const { 
    projectId, 
    title, 
    description, 
    value, 
    trend, 
    confidence,
    source,
    category,
    tags,
    data,
    visualizationType 
  } = req.body;

  if (!projectId || !title || !description || confidence === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: projectId, title, description, confidence'
    });
  }

  try {
    const insightId = uuidv4();
    const now = new Date().toISOString();

    const insight = {
      id: insightId,
      projectId,
      title,
      description,
      value: value || null,
      trend: trend || 'neutral',
      confidence: Math.min(100, Math.max(0, confidence)),
      source: source || 'Manual Entry',
      category: category || 'general',
      tags: tags || [],
      data: data || {},
      visualizationType: visualizationType || 'text',
      createdAt: now,
      updatedAt: now,
      status: 'active',
      views: 0,
      likes: 0
    };

    // Store insight
    await redis.lpush(`research:insights:${projectId}`, JSON.stringify(insight));

    // Update project insight count
    const projectData = await redis.hget('research:projects', projectId);
    if (projectData) {
      const project = JSON.parse(projectData);
      project.insightCount = (project.insightCount || 0) + 1;
      project.lastUpdated = now;
      await redis.hset('research:projects', projectId, JSON.stringify(project));
    }

    // Track analytics
    await redis.hincrby('research:analytics', 'insights:created', 1);
    await redis.hincrby('research:analytics', `category:${category}:insights`, 1);

    // Trigger notifications for high-confidence insights
    if (confidence >= 90) {
      await triggerHighConfidenceAlert(insight);
    }

    return res.json({
      success: true,
      insight,
      message: 'Insight created successfully'
    });
  } catch (error) {
    console.error('Error creating insight:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create insight',
      details: error.message
    });
  }
}

async function updateInsight(req, res) {
  const { insightId, projectId } = req.query;
  const updates = req.body;

  if (!insightId || !projectId) {
    return res.status(400).json({
      success: false,
      error: 'Insight ID and Project ID are required'
    });
  }

  try {
    // Get all insights for the project
    const insights = await redis.lrange(`research:insights:${projectId}`, 0, -1);
    let insightIndex = -1;
    let existingInsight = null;

    // Find the insight to update
    for (let i = 0; i < insights.length; i++) {
      const parsed = JSON.parse(insights[i]);
      if (parsed.id === insightId) {
        insightIndex = i;
        existingInsight = parsed;
        break;
      }
    }

    if (insightIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Insight not found'
      });
    }

    // Update insight
    const updatedInsight = {
      ...existingInsight,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Replace in Redis list
    await redis.lset(`research:insights:${projectId}`, insightIndex, JSON.stringify(updatedInsight));

    return res.json({
      success: true,
      insight: updatedInsight,
      message: 'Insight updated successfully'
    });
  } catch (error) {
    console.error('Error updating insight:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update insight',
      details: error.message
    });
  }
}

async function deleteInsight(req, res) {
  const { insightId, projectId } = req.query;

  if (!insightId || !projectId) {
    return res.status(400).json({
      success: false,
      error: 'Insight ID and Project ID are required'
    });
  }

  try {
    // Get all insights for the project
    const insights = await redis.lrange(`research:insights:${projectId}`, 0, -1);
    const filteredInsights = insights.filter(insight => {
      const parsed = JSON.parse(insight);
      return parsed.id !== insightId;
    });

    if (filteredInsights.length === insights.length) {
      return res.status(404).json({
        success: false,
        error: 'Insight not found'
      });
    }

    // Clear and repopulate the list
    await redis.del(`research:insights:${projectId}`);
    if (filteredInsights.length > 0) {
      await redis.lpush(`research:insights:${projectId}`, ...filteredInsights);
    }

    // Update project insight count
    const projectData = await redis.hget('research:projects', projectId);
    if (projectData) {
      const project = JSON.parse(projectData);
      project.insightCount = Math.max(0, (project.insightCount || 1) - 1);
      project.lastUpdated = new Date().toISOString();
      await redis.hset('research:projects', projectId, JSON.stringify(project));
    }

    return res.json({
      success: true,
      message: 'Insight deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting insight:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete insight',
      details: error.message
    });
  }
}

// Helper functions
function getTimeframeMs(timeframe) {
  const timeframes = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000
  };
  return timeframes[timeframe] || timeframes['7d'];
}

function generateInsightAnalytics(insights) {
  const analytics = {
    totalInsights: insights.length,
    averageConfidence: 0,
    trendDistribution: { up: 0, down: 0, neutral: 0 },
    categoryDistribution: {},
    confidenceDistribution: { high: 0, medium: 0, low: 0 },
    recentActivity: [],
    topSources: {}
  };

  if (insights.length === 0) return analytics;

  let totalConfidence = 0;

  insights.forEach(insight => {
    // Confidence
    totalConfidence += insight.confidence;
    
    if (insight.confidence >= 80) analytics.confidenceDistribution.high++;
    else if (insight.confidence >= 60) analytics.confidenceDistribution.medium++;
    else analytics.confidenceDistribution.low++;

    // Trends
    analytics.trendDistribution[insight.trend] = (analytics.trendDistribution[insight.trend] || 0) + 1;

    // Categories
    analytics.categoryDistribution[insight.category] = (analytics.categoryDistribution[insight.category] || 0) + 1;

    // Sources
    analytics.topSources[insight.source] = (analytics.topSources[insight.source] || 0) + 1;

    // Recent activity (last 24 hours)
    const hoursSinceCreated = (Date.now() - new Date(insight.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreated <= 24) {
      analytics.recentActivity.push({
        time: insight.createdAt,
        title: insight.title,
        confidence: insight.confidence
      });
    }
  });

  analytics.averageConfidence = Math.round(totalConfidence / insights.length);
  
  // Sort recent activity by time
  analytics.recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));

  return analytics;
}

async function triggerHighConfidenceAlert(insight) {
  // Create notification for high-confidence insights
  const notification = {
    id: uuidv4(),
    type: 'high_confidence_insight',
    title: 'High-Confidence Insight Discovered',
    message: `New insight "${insight.title}" with ${insight.confidence}% confidence`,
    projectId: insight.projectId,
    insightId: insight.id,
    createdAt: new Date().toISOString(),
    read: false
  };

  await redis.lpush('research:notifications', JSON.stringify(notification));
  
  // Keep only last 100 notifications
  await redis.ltrim('research:notifications', 0, 99);
}