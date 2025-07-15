const EnhancedBaseAgent = require('../../shared/enhanced-base-agent');
const config = require('./config');

class ClaudeAgent extends EnhancedBaseAgent {
  constructor() {
    super({
      ...config,
      agentId: process.env.AGENT_ID || `claude-${Date.now()}`,
      redisUrl: process.env.REDIS_URL
    });
    
    this.apiKey = process.env.CLAUDE_API_KEY;
    if (!this.apiKey) {
      throw new Error('CLAUDE_API_KEY environment variable is required');
    }
  }

  async processTask(task) {
    try {
      const prompt = this.buildPrompt(task);
      const response = await this.callAPI(prompt);
      return this.processResponse(response, task);
    } catch (error) {
      this.logger.error('Task processing failed', { 
        taskId: task.id, 
        error: error.message 
      });
      throw error;
    }
  }

  buildPrompt(task) {
    return `You are Claude, ${config.specialization}.
    
Task: ${task.prompt}
File: ${task.file || 'N/A'}

Focus on architecture, complex refactoring, and high-level code analysis. Provide detailed, well-structured solutions.`;
  }

  async callAPI(prompt) {
    const response = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  processResponse(response, task) {
    return {
      success: true,
      response,
      taskId: task.id,
      agentId: this.agentId,
      model: this.model
    };
  }
}

// Initialize and start the agent
async function main() {
  const agent = new ClaudeAgent();
  
  try {
    await agent.initialize();
    console.log(`🤖 Claude Agent started successfully with ID: ${agent.agentId}`);
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('Shutting down agent...');
      await agent.shutdown();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start Claude agent:', error);
    process.exit(1);
  }
}

main().catch(console.error);