import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Fetch recent chat messages
    try {
      const limit = parseInt(req.query.limit) || 50;
      
      // Get recent messages from Redis
      const messages = await redis.lrange('agent:chat:messages', 0, limit - 1);
      
      const parsedMessages = messages.map(msg => {
        try {
          return JSON.parse(msg);
        } catch (e) {
          return {
            id: Date.now() + Math.random(),
            text: msg,
            sender: 'system',
            timestamp: new Date().toISOString(),
            agent: 'system'
          };
        }
      }).reverse(); // Reverse to show latest first
      
      res.status(200).json({
        success: true,
        messages: parsedMessages
      });
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch messages'
      });
    }
  } else if (req.method === 'POST') {
    // Send message to agents
    try {
      const { message, agent, type } = req.body;
      
      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }
      
      // Process different message types
      let response = 'Message received';
      
      if (type === 'command') {
        response = await processCommand(message, agent);
      } else {
        response = await sendMessageToAgent(message, agent);
      }
      
      // Store message in chat history
      const chatMessage = {
        id: Date.now(),
        text: message,
        sender: 'user',
        timestamp: new Date().toISOString(),
        agent: agent,
        type: type
      };
      
      await redis.lpush('agent:chat:messages', JSON.stringify(chatMessage));
      await redis.ltrim('agent:chat:messages', 0, 999); // Keep last 1000 messages
      
      // Store system response
      const systemResponse = {
        id: Date.now() + 1,
        text: response,
        sender: 'system',
        timestamp: new Date().toISOString(),
        agent: agent
      };
      
      await redis.lpush('agent:chat:messages', JSON.stringify(systemResponse));
      
      res.status(200).json({
        success: true,
        response: response,
        message: 'Message sent successfully'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send message'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

async function processCommand(command, agent) {
  const cmd = command.toLowerCase().trim();
  
  try {
    switch (cmd) {
      case '/status':
        return await getAgentStatus(agent);
      
      case '/queue':
        return await getQueueStats(agent);
      
      case '/start':
        return await startAgents(agent);
      
      case '/pause':
        return await pauseAgents(agent);
      
      case '/clear':
        return await clearQueues(agent);
      
      default:
        if (cmd.startsWith('/')) {
          return `Unknown command: ${cmd}. Available commands: /status, /queue, /start, /pause, /clear`;
        }
        return await sendMessageToAgent(command, agent);
    }
  } catch (error) {
    console.error('Error processing command:', error);
    return 'Error processing command. Please try again.';
  }
}

async function getAgentStatus(agent) {
  const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
  const status = [];
  
  for (const model of models) {
    if (agent === 'all' || agent === model) {
      const heartbeat = await redis.get(`agent:heartbeat:${model}`);
      const timeSince = heartbeat ? Date.now() - parseInt(heartbeat) : null;
      
      status.push({
        model: model,
        status: timeSince < 60000 ? 'active' : 
               timeSince < 300000 ? 'idle' : 'offline',
        lastSeen: timeSince ? Math.floor(timeSince / 1000) + 's ago' : 'never'
      });
    }
  }
  
  return `Agent Status:\n${status.map(s => `${s.model}: ${s.status} (${s.lastSeen})`).join('\n')}`;
}

async function getQueueStats(agent) {
  const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
  const stats = [];
  
  for (const model of models) {
    if (agent === 'all' || agent === model) {
      const pending = await redis.llen(`queue:${model}`);
      const processing = await redis.llen(`processing:${model}`);
      const failed = await redis.llen(`queue:${model}:failed`);
      
      stats.push({
        model: model,
        pending: pending,
        processing: processing,
        failed: failed
      });
    }
  }
  
  return `Queue Statistics:\n${stats.map(s => `${s.model}: ${s.pending} pending, ${s.processing} processing, ${s.failed} failed`).join('\n')}`;
}

async function startAgents(agent) {
  // Send start signal to agents
  const models = agent === 'all' ? 
    ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'] :
    [agent];
  
  for (const model of models) {
    await redis.publish(`agent:${model}:control`, JSON.stringify({
      action: 'start',
      timestamp: new Date().toISOString()
    }));
  }
  
  return `Start signal sent to ${agent === 'all' ? 'all agents' : agent}`;
}

async function pauseAgents(agent) {
  // Send pause signal to agents
  const models = agent === 'all' ? 
    ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'] :
    [agent];
  
  for (const model of models) {
    await redis.publish(`agent:${model}:control`, JSON.stringify({
      action: 'pause',
      timestamp: new Date().toISOString()
    }));
  }
  
  return `Pause signal sent to ${agent === 'all' ? 'all agents' : agent}`;
}

async function clearQueues(agent) {
  const models = agent === 'all' ? 
    ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'] :
    [agent];
  
  let clearedCount = 0;
  
  for (const model of models) {
    const pending = await redis.llen(`queue:${model}`);
    const processing = await redis.llen(`processing:${model}`);
    
    if (pending > 0) {
      await redis.del(`queue:${model}`);
      clearedCount += pending;
    }
    
    if (processing > 0) {
      await redis.del(`processing:${model}`);
      clearedCount += processing;
    }
  }
  
  return `Cleared ${clearedCount} tasks from ${agent === 'all' ? 'all queues' : agent + ' queue'}`;
}

async function sendMessageToAgent(message, agent) {
  // Send message to specific agent or broadcast
  const models = agent === 'all' ? 
    ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'] :
    [agent];
  
  for (const model of models) {
    await redis.publish(`agent:${model}:message`, JSON.stringify({
      message: message,
      timestamp: new Date().toISOString(),
      sender: 'user'
    }));
  }
  
  return `Message sent to ${agent === 'all' ? 'all agents' : agent}: "${message}"`;
}