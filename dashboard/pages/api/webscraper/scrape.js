import Redis from 'redis';

const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => console.error('Redis Client Error', err));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!redis.isOpen) {
      await redis.connect();
    }

    const {
      url,
      scraperType = 'generic',
      authRequired = false,
      credentials,
      extractionRules,
      captureScreenshot = false,
      analyzeWithClaude = false,
      analysisPrompt
    } = req.body;

    // Secure URL validation
    function validateUrl(url) {
      try {
        const parsed = new URL(url);
        
        // Block internal/private IPs and localhost
        const hostname = parsed.hostname.toLowerCase();
        if (hostname === 'localhost' || 
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
            hostname === '::1' ||
            hostname.startsWith('fc00:') ||
            hostname.startsWith('fe80:')) {
          throw new Error('Internal/private URLs not allowed');
        }
        
        // Only allow HTTP/HTTPS
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Only HTTP and HTTPS protocols allowed');
        }
        
        return parsed.href;
      } catch (e) {
        throw new Error(`Invalid URL: ${e.message}`);
      }
    }

    // Validate required fields
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    try {
      const validatedUrl = validateUrl(url);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    // Create scraping task
    const task = {
      id: `scrape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'scrape',
      url: validatedUrl,
      scraperType,
      authRequired,
      credentials: authRequired ? credentials : undefined,
      extractionRules,
      captureScreenshot,
      analyzeWithClaude,
      analysisPrompt,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Add to webscraper queue
    await redis.lPush('queue:webscraper', JSON.stringify(task));

    // Store task status
    await redis.setEx(
      `task:${task.id}`,
      3600, // 1 hour TTL
      JSON.stringify(task)
    );

    res.status(200).json({
      success: true,
      taskId: task.id,
      message: 'Scraping task queued successfully',
      task
    });

  } catch (error) {
    console.error('Scraping API error:', error);
    res.status(500).json({ 
      error: 'Failed to queue scraping task',
      details: error.message 
    });
  } finally {
    if (redis.isOpen) {
      await redis.disconnect();
    }
  }
}