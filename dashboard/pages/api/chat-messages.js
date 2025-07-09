import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get recent messages from different channels
    const messages = [];
    
    // Get recent failures
    const failures = await redis.lrange('queue:failures', 0, 10);
    failures.forEach(failure => {
      const data = JSON.parse(failure);
      messages.push({
        type: 'task_failed',
        from: 'system',
        to: 'all',
        message: `Task failed: ${data.file} - ${data.error}`,
        file: data.file,
        timestamp: data.timestamp
      });
    });
    
    // Get agent registry events (recent)
    const agentEvents = await redis.lrange('agent-events', 0, 20);
    agentEvents.forEach(event => {
      try {
        const data = JSON.parse(event);
        messages.push({
          type: data.type,
          from: data.agent || 'system',
          to: 'all',
          message: `Agent ${data.type.replace('_', ' ')}: ${data.agent}`,
          timestamp: data.timestamp
        });
      } catch (e) {
        // Ignore parse errors
      }
    });

    // Simulate some chat messages from Redis channels
    // In a real implementation, you'd subscribe to Redis channels
    const sampleMessages = [
      {
        type: 'chat',
        from: 'claude-arch-001',
        to: 'gpt-backend-001',
        message: 'Can you review the authentication changes I just made?',
        timestamp: new Date(Date.now() - 5000).toISOString()
      },
      {
        type: 'file_claimed',
        from: 'claude-arch-001',
        to: 'system',
        message: 'File lock acquired',
        file: 'auth/login.js',
        timestamp: new Date(Date.now() - 4000).toISOString()
      },
      {
        type: 'broadcast',
        from: 'gpt-backend-001',
        to: 'all',
        message: 'I\'m available for code reviews and API development',
        timestamp: new Date(Date.now() - 3000).toISOString()
      },
      {
        type: 'coordination_request',
        from: 'deepseek-test-001',
        to: 'claude-arch-001',
        message: 'Need coordination for test file creation',
        file: 'tests/auth.test.js',
        timestamp: new Date(Date.now() - 2000).toISOString()
      },
      {
        type: 'task_completed',
        from: 'mistral-docs-001',
        to: 'system',
        message: 'Documentation updated for authentication module',
        file: 'docs/auth.md',
        timestamp: new Date(Date.now() - 1000).toISOString()
      }
    ];

    // Combine and sort messages
    const allMessages = [...messages, ...sampleMessages]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-50); // Keep last 50 messages

    res.status(200).json({
      success: true,
      messages: allMessages
    });

  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chat messages',
      details: error.message 
    });
  }
}