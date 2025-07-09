import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, target, type } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userId = `dashboard-user-${Date.now()}`;
    const messageData = {
      type: type || 'chat',
      from: userId,
      to: target || 'all',
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    if (target && target !== 'all') {
      // Send direct message to specific agent
      await redis.lpush(`messages:${target}`, JSON.stringify(messageData));
    } else {
      // Broadcast to all agents
      await redis.publish('agent-chat', JSON.stringify(messageData));
    }

    // Store message for dashboard history
    await redis.lpush('dashboard-messages', JSON.stringify(messageData));
    await redis.ltrim('dashboard-messages', 0, 99); // Keep last 100 messages

    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      data: messageData
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      details: error.message 
    });
  }
}