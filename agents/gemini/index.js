// /agents/gemini/index.js - Enhanced Gemini Agent with Universal Coordination
const EnhancedBaseAgent = require('../../shared/enhanced-base-agent');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class GeminiAgent extends EnhancedBaseAgent {
  constructor() {
    super({
      agentId: process.env.AGENT_ID || `gemini-${Date.now()}`,
      agentType: 'gemini',
      model: process.env.MODEL || 'gemini-pro',
      role: process.env.ROLE || 'Code analysis and optimization specialist',
      capabilities: ['analysis', 'optimization', 'performance', 'security'],
      systemPrompt: 'You are Gemini, a code analysis and optimization specialist. Focus on performance analysis, security reviews, and code optimization.',
      maxRetries: 3
    });
    
    this.apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    this.apiEndpoint = 'https://api.openrouter.ai/v1/chat/completions';
    
    if (!this.apiKey) {
      throw new Error('API_KEY or GEMINI_API_KEY environment variable is required');
    }
  }

  async initializeAgent() {
    this.log('Gemini agent initialized with OpenRouter API');
    this.log(`Model: ${this.config.model}`);
    this.log(`Capabilities: ${this.config.capabilities.join(', ')}`);
  }

  async executeTask(task) {
    const taskId = task.id || `gemini_task_${Date.now()}`;
    this.log(`Executing task ${taskId}: ${task.file || 'N/A'}`);
    
    try {
      const filePath = path.resolve(task.file || 'analysis.txt');
      
      // Read existing file or prepare for new file
      let code = '';
      let isNewFile = false;
      
      try {
        code = await this.safeReadFile(filePath);
        this.log(`Reading existing file: ${filePath}`);
      } catch (error) {
        isNewFile = true;
        code = '// New file to be created\n';
        this.log(`Creating new file: ${filePath}`);
      }
      
      // Build the prompt for Gemini analysis
      const analysisPrompt = this.buildAnalysisPrompt(task.prompt, code, task.file);
      
      // Call Gemini API through OpenRouter
      const response = await this.callGeminiAPI(analysisPrompt);
      
      // Ensure output directory exists
      const outputDir = path.resolve('src/output');
      await fs.mkdir(outputDir, { recursive: true });
      
      // Save analysis result
      const outputFileName = `gemini_analysis__${(task.file || 'analysis').replace(/\//g, '__')}.md`;
      const outputPath = path.join(outputDir, outputFileName);
      await this.safeWriteFile(outputPath, response);
      
      // Update original file if needed
      if (isNewFile || task.prompt.includes('create') || task.prompt.includes('implement') || task.prompt.includes('optimize')) {
        const actualFileDir = path.dirname(filePath);
        await fs.mkdir(actualFileDir, { recursive: true });
        await this.safeWriteFile(filePath, response);
        this.log(`✅ ${isNewFile ? 'Created' : 'Updated'} file: ${filePath}`);
      }
      
      return {
        success: true,
        taskId: taskId,
        outputPath: outputPath,
        originalFile: task.file,
        isNewFile: isNewFile,
        analysis: response.substring(0, 200) + '...', // Preview
        agentId: this.config.agentId,
        model: this.config.model
      };
      
    } catch (error) {
      this.log(`Task execution failed: ${error.message}`, 'error');
      throw error;
    }
  }

  buildAnalysisPrompt(userPrompt, code, fileName) {
    return `${this.config.systemPrompt}

Task: ${userPrompt}
File: ${fileName || 'N/A'}

Focus on:
- Code structure and organization
- Performance optimization opportunities
- Security vulnerabilities
- Best practices compliance
- Error handling improvements

Code to analyze:
\`\`\`
${code}
\`\`\`

Provide detailed analysis with specific recommendations:`;
  }

  async callGeminiAPI(prompt) {
    try {
      const response = await axios.post(this.apiEndpoint, {
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.2
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000,
        validateStatus: (status) => status < 500
      });
      
      if (!response.data.choices || !response.data.choices[0]) {
        throw new Error('Invalid API response - no choices returned');
      }
      
      return response.data.choices[0].message.content;
      
    } catch (error) {
      if (error.response) {
        throw new Error(`Gemini API error: ${error.response.status} - ${error.response.data?.error?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Gemini API request timeout or network error');
      } else {
        throw new Error(`Gemini API call failed: ${error.message}`);
      }
    }
  }

  getQueueName() {
    return `queue:${this.config.model}`;
  }

  async checkCollaborationNeeded(task) {
    // Gemini works well with other agents for comprehensive analysis
    if (task.prompt.includes('test') && !task.prompt.includes('performance')) {
      return true; // Collaborate with DeepSeek for testing
    }
    if (task.prompt.includes('document') || task.prompt.includes('explain')) {
      return true; // Collaborate with Mistral for documentation
    }
    if (task.prompt.includes('architecture') || task.prompt.includes('refactor')) {
      return true; // Collaborate with Claude for architecture
    }
    return false;
  }

  getRequiredCapabilities(task) {
    const capabilities = [];
    if (task.prompt.includes('test')) capabilities.push('testing');
    if (task.prompt.includes('document')) capabilities.push('documentation');
    if (task.prompt.includes('architecture')) capabilities.push('architecture');
    return capabilities;
  }
}

// Initialize and start the agent
(async () => {
  try {
    const agent = new GeminiAgent();
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      await agent.cleanup();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, shutting down gracefully...');
      await agent.cleanup();
      process.exit(0);
    });
    
    // Initialize and start the agent
    await agent.initialize();
    await agent.start();
    
  } catch (error) {
    console.error('Failed to start Gemini agent:', error.message);
    process.exit(1);
  }
})();
