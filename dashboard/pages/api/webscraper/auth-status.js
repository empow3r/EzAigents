import Redis from 'redis';
import fs from 'fs/promises';
import path from 'path';

const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => console.error('Redis Client Error', err));

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!redis.isOpen) {
      await redis.connect();
    }

    const { domain } = req.query;

    // Check agent status
    const agentStatus = await redis.get('agent:webscraper:status');
    const isAgentRunning = agentStatus ? JSON.parse(agentStatus).status === 'active' : false;

    if (!domain) {
      // Return overall auth status
      const sessionsDir = path.join(process.cwd(), '.agent-memory', 'webscraper', 'sessions');
      
      try {
        const files = await fs.readdir(sessionsDir);
        const sessions = [];
        
        for (const file of files) {
          if (file.endsWith('.session')) {
            const domainName = file.replace('.session', '').replace(/_/g, '.');
            const filePath = path.join(sessionsDir, file);
            const stats = await fs.stat(filePath);
            
            sessions.push({
              domain: domainName,
              lastModified: stats.mtime,
              ageInDays: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24))
            });
          }
        }
        
        return res.status(200).json({
          agentRunning: isAgentRunning,
          savedSessions: sessions,
          totalSessions: sessions.length
        });
        
      } catch (error) {
        // No sessions directory yet
        return res.status(200).json({
          agentRunning: isAgentRunning,
          savedSessions: [],
          totalSessions: 0
        });
      }
    } else {
      // Check specific domain auth status
      const sessionFile = path.join(
        process.cwd(), 
        '.agent-memory', 
        'webscraper', 
        'sessions',
        `${domain.replace(/\./g, '_')}.session`
      );
      
      try {
        const stats = await fs.stat(sessionFile);
        const ageInDays = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24));
        
        return res.status(200).json({
          authenticated: true,
          domain,
          lastModified: stats.mtime,
          ageInDays,
          expired: ageInDays > 7
        });
      } catch (error) {
        return res.status(200).json({
          authenticated: false,
          domain,
          error: 'No saved session found'
        });
      }
    }

  } catch (error) {
    console.error('Auth status API error:', error);
    res.status(500).json({ 
      error: 'Failed to check auth status',
      details: error.message 
    });
  } finally {
    if (redis.isOpen) {
      await redis.disconnect();
    }
  }
}