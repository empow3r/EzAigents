// Extraction Templates API
import redis from '../../../src/lib/redis';

export default async function handler(req, res) {
  try {
    const client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    await client.connect();

    if (req.method === 'GET') {
      // Get all templates
      const templates = await client.hGetAll('webscraper:templates') || {};
      const templateList = Object.values(templates).map(template => JSON.parse(template));
      
      res.status(200).json({
        success: true,
        templates: templateList
      });
      
    } else if (req.method === 'POST') {
      // Create new template
      const { name, description, extractionRules, scraperType = 'generic' } = req.body;
      
      if (!name || !extractionRules) {
        return res.status(400).json({
          success: false,
          error: 'Name and extraction rules are required'
        });
      }
      
      // Validate JSON
      try {
        JSON.parse(extractionRules);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON in extraction rules'
        });
      }
      
      const templateId = `template_${Date.now()}`;
      const template = {
        id: templateId,
        name,
        description,
        extractionRules,
        scraperType,
        createdAt: new Date().toISOString(),
        usageCount: 0
      };
      
      await client.hSet('webscraper:templates', templateId, JSON.stringify(template));
      
      res.status(201).json({
        success: true,
        template
      });
      
    } else if (req.method === 'PUT') {
      // Update template
      const { id, ...updates } = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Template ID is required'
        });
      }
      
      const existingTemplate = await client.hGet('webscraper:templates', id);
      if (!existingTemplate) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }
      
      const template = { ...JSON.parse(existingTemplate), ...updates };
      await client.hSet('webscraper:templates', id, JSON.stringify(template));
      
      res.status(200).json({
        success: true,
        template
      });
      
    } else if (req.method === 'DELETE') {
      // Delete template
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Template ID is required'
        });
      }
      
      const result = await client.hDel('webscraper:templates', id);
      
      if (result === 0) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Template deleted successfully'
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
    console.error('Template API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}