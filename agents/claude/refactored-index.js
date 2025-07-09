// Refactored Claude Agent using AgentBase
// Reduces code from ~300 lines to ~100 lines

const AgentBase = require('../../cli/AgentBase');
const axios = require('axios');

class ClaudeAgent extends AgentBase {
  constructor() {
    super(
      'claude-agent',
      'claude-3-opus',
      'refactor-core',
      ['architecture', 'refactoring', 'code-review', 'documentation']
    );
    
    // Claude-specific configuration
    this.apiKey = process.env.CLAUDE_API_KEY;
    this.apiUrl = 'https://api.openrouter.ai/api/v1/chat/completions';
    this.maxTokens = 150000;
    this.temperature = 0.7;
  }

  // Implement the abstract processTask method
  async processTask(file, prompt, taskId, fileContent) {
    console.log(`🤖 Claude processing ${file} with prompt: ${prompt.substring(0, 100)}...`);

    // Build the API request
    const messages = [
      {
        role: 'system',
        content: `You are Claude, an expert AI assistant specializing in ${this.capabilities.join(', ')}. 
                  Analyze the code and follow the instructions precisely.`
      },
      {
        role: 'user',
        content: `File: ${file}\n\nContent:\n${fileContent}\n\nTask: ${prompt}`
      }
    ];

    try {
      // Use the base class API call method with retry logic
      const response = await this.makeApiCall({
        method: 'POST',
        url: this.apiUrl,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Model': 'anthropic/claude-3-opus'
        },
        data: {
          model: 'anthropic/claude-3-opus',
          messages,
          max_tokens: 4000,
          temperature: this.temperature,
          stream: false
        }
      });

      // Extract the result
      const result = response.data.choices[0].message.content;
      
      // Save to memory for learning
      await this.saveToMemory(`
## Task: ${taskId}
File: ${file}
Prompt: ${prompt}
Result Length: ${result.length} characters
Model: Claude 3 Opus
      `, 'learning');

      return result;

    } catch (error) {
      console.error(`❌ Claude failed to process task: ${error.message}`);
      throw error;
    }
  }

  // Override if needed - example of customization
  async initialize() {
    await super.initialize();
    
    // Claude-specific initialization
    console.log(`🧠 Claude Agent initialized with ${this.maxTokens} token context window`);
    
    // Announce capabilities to other agents
    await this.redis.publish('agent:announcement', JSON.stringify({
      agentId: this.agentId,
      type: 'claude',
      role: this.role,
      capabilities: this.capabilities,
      status: 'ready'
    }));
  }
}

// Create and run the agent
async function main() {
  const agent = new ClaudeAgent();
  
  try {
    await agent.initialize();
    console.log('🚀 Claude Agent started successfully');
    
    // Start processing queue
    await agent.processQueue();
    
  } catch (error) {
    console.error('Failed to start Claude agent:', error);
    process.exit(1);
  }
}

// Start if run directly
if (require.main === module) {
  main();
}

module.exports = ClaudeAgent;