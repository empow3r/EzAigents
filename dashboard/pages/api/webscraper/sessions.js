import Redis from 'redis';
import fs from 'fs/promises';
import path from 'path';

const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => console.error('Redis Client Error', err));

export default async function handler(req, res) {
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }

    if (req.method === 'GET') {
      // List all sessions
      const sessionsDir = path.join(process.cwd(), '.agent-memory', 'webscraper', 'sessions');
      
      try {
        const files = await fs.readdir(sessionsDir);
        const sessions = [];
        
        for (const file of files) {
          if (file.endsWith('.session')) {
            const domain = file.replace('.session', '').replace(/_/g, '.');
            const filePath = path.join(sessionsDir, file);
            const stats = await fs.stat(filePath);
            
            sessions.push({
              domain,
              fileName: file,
              lastModified: stats.mtime,
              size: stats.size,
              ageInDays: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)),
              expired: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)) > 7
            });
          }
        }
        
        // Sort by last modified (newest first)
        sessions.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        
        return res.status(200).json({
          sessions,
          totalSessions: sessions.length
        });
        
      } catch (error) {
        return res.status(200).json({
          sessions: [],
          totalSessions: 0
        });
      }
      
    } else if (req.method === 'DELETE') {
      // Delete specific session
      const { domain } = req.query;
      
      if (!domain) {
        return res.status(400).json({ error: 'Domain is required' });
      }
      
      const sessionFile = path.join(
        process.cwd(),
        '.agent-memory',
        'webscraper',
        'sessions',
        `${domain.replace(/\./g, '_')}.session`
      );
      
      try {
        await fs.unlink(sessionFile);
        
        // Also clear any related cookies
        const cookieFile = path.join(
          process.cwd(),
          '.agent-memory',
          'webscraper',
          'cookies',
          `${domain.replace(/\./g, '_')}.json`
        );
        
        try {
          await fs.unlink(cookieFile);
        } catch (e) {
          // Cookie file might not exist, that's okay
        }
        
        return res.status(200).json({
          success: true,
          message: `Session for ${domain} deleted successfully`
        });
        
      } catch (error) {
        return res.status(404).json({
          error: 'Session not found',
          domain
        });
      }
      
    } else if (req.method === 'POST') {
      // Create/update session
      const { domain, sessionData } = req.body;
      
      if (!domain || !sessionData) {
        return res.status(400).json({ error: 'Domain and session data are required' });
      }
      
      // Queue a task to create session
      const task = {
        id: `create-session-${Date.now()}`,
        type: 'create_session',
        domain,
        sessionData,
        timestamp: new Date().toISOString()
      };
      
      await redis.lPush('queue:webscraper', JSON.stringify(task));
      
      return res.status(200).json({
        success: true,
        message: 'Session creation task queued',
        taskId: task.id
      });
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Sessions API error:', error);
    res.status(500).json({ 
      error: 'Failed to manage sessions',
      details: error.message 
    });
  } finally {
    if (redis.isOpen) {
      await redis.disconnect();
    }
  }
}