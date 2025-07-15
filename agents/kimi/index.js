// Standardized Kimi2 Agent Implementation
const BaseAgent = require('../base-agent');
const config = require('./config');

class KimiAgent extends BaseAgent {
  constructor() {
    super({
      ...config,
      agentId: process.env.AGENT_ID || `kimi-${Date.now()}`,
      redisUrl: process.env.REDIS_URL
    });
    
    this.apiKey = process.env.KIMI_API_KEY;
    if (!this.apiKey) {
      throw new Error('KIMI_API_KEY environment variable is required');
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
    return `You are Kimi2, ${config.specialization}.
    
Task: ${task.prompt}
File: ${task.file || 'N/A'}

Leverage your long-context capabilities to provide comprehensive analysis and reasoning. Handle large codebases and complex documentation with ease.`;
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
        max_tokens: 4000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  processResponse(response, task) {
    // Process the response and handle file operations if needed
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
const agent = new KimiAgent();
agent.start().catch(console.error);

module.exports = KimiAgent;