// RSS/Feed Management API
import redis from '../../../src/lib/redis';

export default async function handler(req, res) {
  try {
    const client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    await client.connect();

    if (req.method === 'GET') {
      // Get all feeds
      const feeds = await client.hGetAll('webscraper:feeds') || {};
      const feedList = Object.values(feeds).map(feed => JSON.parse(feed));
      
      res.status(200).json({
        success: true,
        feeds: feedList
      });
      
    } else if (req.method === 'POST') {
      // Create new feed
      const { name, url, frequency, extractionRules, enabled = true } = req.body;
      
      if (!name || !url) {
        return res.status(400).json({
          success: false,
          error: 'Name and URL are required'
        });
      }
      
      const feedId = `feed_${Date.now()}`;
      const feed = {
        id: feedId,
        name,
        url,
        frequency,
        extractionRules: extractionRules ? JSON.parse(extractionRules) : {},
        enabled,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastRun: null,
        itemsCollected: 0
      };
      
      await client.hSet('webscraper:feeds', feedId, JSON.stringify(feed));
      
      res.status(201).json({
        success: true,
        feed
      });
      
    } else if (req.method === 'PUT') {
      // Update feed
      const { id, ...updates } = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Feed ID is required'
        });
      }
      
      const existingFeed = await client.hGet('webscraper:feeds', id);
      if (!existingFeed) {
        return res.status(404).json({
          success: false,
          error: 'Feed not found'
        });
      }
      
      const feed = { ...JSON.parse(existingFeed), ...updates };
      await client.hSet('webscraper:feeds', id, JSON.stringify(feed));
      
      res.status(200).json({
        success: true,
        feed
      });
      
    } else if (req.method === 'DELETE') {
      // Delete feed
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Feed ID is required'
        });
      }
      
      const result = await client.hDel('webscraper:feeds', id);
      
      if (result === 0) {
        return res.status(404).json({
          success: false,
          error: 'Feed not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Feed deleted successfully'
      });
      
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }
    
    await client.disconnect();
    
  } catch (error) {
    console.error('Feed API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}