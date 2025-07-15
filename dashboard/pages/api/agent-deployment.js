import Redis from 'ioredis';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  const { method, query } = req;
  
  try {
    switch (method) {
      case 'POST':
        if (query.action === 'deploy') {
          return await deployAgent(req, res);
        } else if (query.action === 'start') {
          return await startAgent(req, res);
        } else if (query.action === 'stop') {
          return await stopAgent(req, res);
        }
        break;
        
      case 'GET':
        if (query.action === 'status') {
          return await getDeploymentStatus(req, res);
        }
        break;
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in agent deployment API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function deployAgent(req, res) {
  const { templateId, instanceName, config } = req.body;
  
  if (!templateId || !instanceName) {
    return res.status(400).json({ error: 'Template ID and instance name are required' });
  }

  try {
    // Get agent template
    const templateData = await redis.hgetall(`agent-template:${templateId}`);
    if (!templateData.id) {
      return res.status(404).json({ error: 'Agent template not found' });
    }

    // Safe JSON parsing function
    function safeJsonParse(jsonString, defaultValue) {
      try {
        const parsed = JSON.parse(jsonString || JSON.stringify(defaultValue));
        // Basic validation - ensure result is expected type
        if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
          throw new Error('Expected array');
        }
        if (typeof defaultValue === 'object' && !defaultValue && (typeof parsed !== 'object' || Array.isArray(parsed))) {
          throw new Error('Expected object');
        }
        return parsed;
      } catch (e) {
        console.warn('JSON parse failed, using default:', e.message);
        return defaultValue;
      }
    }

    // Create agent instance configuration with safe parsing
    const agentConfig = {
      ...safeJsonParse(templateData.settings, {}),
      ...config,
      templateId,
      instanceName,
      agentType: templateData.type,
      model: templateData.model,
      capabilities: safeJsonParse(templateData.capabilities, []),
      api_config: safeJsonParse(templateData.api_config, {})
    };

    // Generate deployment script
    const deploymentScript = generateDeploymentScript(templateData, agentConfig);
    
    // Save deployment configuration
    const deploymentId = `deployment:${instanceName}:${Date.now()}`;
    await redis.hmset(deploymentId, {
      templateId,
      instanceName,
      agentType: templateData.type,
      config: JSON.stringify(agentConfig),
      script: deploymentScript,
      status: 'ready',
      created_at: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      deploymentId,
      script: deploymentScript,
      message: 'Agent deployment prepared successfully'
    });

  } catch (error) {
    console.error('Error deploying agent:', error);
    res.status(500).json({ error: 'Failed to deploy agent' });
  }
}

async function startAgent(req, res) {
  const { deploymentId } = req.body;
  
  if (!deploymentId) {
    return res.status(400).json({ error: 'Deployment ID is required' });
  }

  try {
    const deploymentData = await redis.hgetall(deploymentId);
    if (!deploymentData.instanceName) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    // Execute deployment script
    const agentProcess = spawn('node', ['-e', deploymentData.script], {
      stdio: 'pipe',
      env: {
        ...process.env,
        AGENT_INSTANCE_NAME: deploymentData.instanceName,
        AGENT_CONFIG: deploymentData.config
      }
    });

    // Store process information
    await redis.hmset(deploymentId, {
      status: 'running',
      pid: agentProcess.pid,
      started_at: new Date().toISOString()
    });

    // Monitor agent registration
    const checkRegistration = setInterval(async () => {
      const agentKeys = await redis.keys(`agent:${deploymentData.instanceName}*`);
      if (agentKeys.length > 0) {
        clearInterval(checkRegistration);
        await redis.hmset(deploymentId, {
          status: 'active',
          agent_id: agentKeys[0].replace('agent:', '')
        });
      }
    }, 1000);

    // Clear check after 30 seconds
    setTimeout(() => clearInterval(checkRegistration), 30000);

    res.status(200).json({
      success: true,
      pid: agentProcess.pid,
      message: 'Agent started successfully'
    });

  } catch (error) {
    console.error('Error starting agent:', error);
    res.status(500).json({ error: 'Failed to start agent' });
  }
}

async function stopAgent(req, res) {
  const { deploymentId, agentId } = req.body;
  
  try {
    if (deploymentId) {
      const deploymentData = await redis.hgetall(deploymentId);
      if (deploymentData.pid) {
        process.kill(deploymentData.pid, 'SIGTERM');
      }
      
      await redis.hmset(deploymentId, {
        status: 'stopped',
        stopped_at: new Date().toISOString()
      });
    }

    if (agentId) {
      // Send stop command to agent
      await redis.publish(`agent:control:${agentId}`, JSON.stringify({ action: 'stop' }));
    }

    res.status(200).json({
      success: true,
      message: 'Agent stop command sent'
    });

  } catch (error) {
    console.error('Error stopping agent:', error);
    res.status(500).json({ error: 'Failed to stop agent' });
  }
}

async function getDeploymentStatus(req, res) {
  try {
    const deploymentKeys = await redis.keys('deployment:*');
    const deployments = [];

    for (const key of deploymentKeys) {
      const deploymentData = await redis.hgetall(key);
      if (deploymentData.instanceName) {
        deployments.push({
          id: key,
          instanceName: deploymentData.instanceName,
          agentType: deploymentData.agentType,
          status: deploymentData.status,
          pid: deploymentData.pid,
          agentId: deploymentData.agent_id,
          created_at: deploymentData.created_at,
          started_at: deploymentData.started_at,
          stopped_at: deploymentData.stopped_at
        });
      }
    }

    res.status(200).json({
      success: true,
      deployments
    });

  } catch (error) {
    console.error('Error getting deployment status:', error);
    res.status(500).json({ error: 'Failed to get deployment status' });
  }
}

function generateDeploymentScript(templateData, config) {
  const agentType = templateData.type;
  
  // Base script for enhanced base agent
  let script = `
const EnhancedBaseAgent = require('../../../shared/enhanced-base-agent');

class DynamicAgent extends EnhancedBaseAgent {
  constructor() {
    super({
      agentType: '${agentType}',
      agentId: process.env.AGENT_INSTANCE_NAME,
      capabilities: ${JSON.stringify(JSON.parse(templateData.capabilities || '[]'))},
      model: '${templateData.model}',
      ...${JSON.stringify(config)}
    });
  }

  async executeTask(task) {
    try {
      // Agent-specific task execution logic
      console.log(\`Executing task: \${task.type}\`);
      
      // Add your custom logic here based on agent type
      const result = await this.processTask(task);
      
      return {
        success: true,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error executing task:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async processTask(task) {
    // Override this method for specific agent types
    switch (this.agentType) {
      case 'claude':
        return await this.processClaude(task);
      case 'gpt':
        return await this.processGPT(task);
      case 'gemini':
        return await this.processGemini(task);
      case 'webscraper':
        return await this.processWebScraper(task);
      default:
        return \`Processed task: \${task.type}\`;
    }
  }

  async processClaude(task) {
    // Claude-specific processing
    return 'Claude processed task';
  }

  async processGPT(task) {
    // GPT-specific processing
    return 'GPT processed task';
  }

  async processGemini(task) {
    // Gemini-specific processing
    return 'Gemini processed task';
  }

  async processWebScraper(task) {
    // WebScraper-specific processing
    return 'WebScraper processed task';
  }
}

// Start the agent
const agent = new DynamicAgent();
agent.start().catch(console.error);
`;

  return script;
}