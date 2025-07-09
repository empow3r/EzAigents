// Ultra-optimized Claude agent for 1000+ agent scalability
const AgentBase = require('../../cli/AgentBase');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class ClaudeAgent extends AgentBase {
  constructor() {
    const agentId = process.env.AGENT_ID || `claude-${Date.now()}`;
    const model = process.env.MODEL || 'claude-3-opus';
    const role = process.env.ROLE || 'refactor-core';
    const capabilities = ['refactor-core', 'architecture', 'code-review', 'documentation'];
    
    super(agentId, model, role, capabilities);
    
    this.apiKey = process.env.API_KEY;
    this.apiEndpoint = 'https://api.openrouter.ai/v1/chat/completions';
    
    // Request optimization
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Connection': 'keep-alive'
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 500 // Don't throw on client errors
    });
  }

  // High-performance task processing
  async processTask(file, prompt, taskId) {
    const startTime = performance.now();
    
    try {
      // Parallel file operations
      const [code, outputDir] = await Promise.all([
        this.loadFileContent(file),
        this.ensureOutputDirectory()
      ]);

      // Process with AI model
      const result = await this.processWithAI(code, prompt, file);
      
      // Parallel output operations
      await Promise.all([
        this.saveOutput(file, result),
        this.updateMetrics(taskId, performance.now() - startTime)
      ]);

      return result;
      
    } catch (error) {
      await this.handleError(error, { file, prompt, taskId });
      throw error;
    }
  }

  // Optimized file loading with caching
  async loadFileContent(file) {
    const filePath = path.resolve(file);
    
    try {
      // Check if file exists
      await fs.access(filePath);
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`📝 Creating new file: ${filePath}`);
        return '// New file to be created\n';
      }
      throw error;
    }
  }

  // AI processing with retry logic and connection pooling
  async processWithAI(code, prompt, file) {
    const requestData = {
      model: this.model,
      messages: [{
        role: 'user',
        content: `${prompt}\n\nFile: ${file}\nCode:\n${code}`
      }],
      max_tokens: 2048,
      temperature: 0.3,
      stream: false
    };

    try {
      const response = await this.axiosInstance.post(this.apiEndpoint, requestData);
      
      if (response.status !== 200) {
        throw new Error(`API error: ${response.status} - ${response.statusText}`);
      }

      if (!response.data.choices || !response.data.choices[0]) {
        throw new Error('Invalid API response format');
      }

      return response.data.choices[0].message.content;
      
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limit - exponential backoff
        const delay = Math.min(1000 * Math.pow(2, this.performance.errors), 30000);
        console.log(`⏳ Rate limited, waiting ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        throw error; // Let base class handle retry
      }
      throw error;
    }
  }

  // Ensure output directory exists (cached)
  async ensureOutputDirectory() {
    if (!this.outputDirCreated) {
      const outputDir = path.resolve('src/output');
      await fs.mkdir(outputDir, { recursive: true });
      this.outputDirCreated = true;
    }
    return true;
  }

  // Optimized output saving
  async saveOutput(file, result) {
    const outputPath = path.join('src/output', file.replace(/\//g, '__'));
    const outputDir = path.dirname(outputPath);
    
    // Ensure directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write output
    await fs.writeFile(outputPath, result);
    
    // Also write to actual file location if it's a creation/implementation task
    if (result.includes('// New file') || result.includes('implement') || result.includes('create')) {
      const actualPath = path.resolve(file);
      const actualDir = path.dirname(actualPath);
      
      await fs.mkdir(actualDir, { recursive: true });
      await fs.writeFile(actualPath, result);
      
      console.log(`✨ Created/Updated: ${actualPath}`);
    }
  }

  // Update metrics in Redis
  async updateMetrics(taskId, duration) {
    const metrics = {
      taskId,
      agentId: this.agentId,
      duration: duration.toFixed(2),
      timestamp: Date.now(),
      model: this.model
    };

    // Use pipeline for efficiency
    const pipeline = this.redis.pipeline();
    pipeline.lpush('metrics:tasks', JSON.stringify(metrics));
    pipeline.ltrim('metrics:tasks', 0, 999); // Keep last 1000 metrics
    await pipeline.exec();
  }

  // Get specialized Claude performance stats
  getPerformanceStats() {
    const baseStats = super.getPerformanceStats();
    return {
      ...baseStats,
      capabilities: this.capabilities,
      specialization: 'Architecture & Refactoring',
      modelEndpoint: this.apiEndpoint
    };
  }
}

// Start the optimized Claude agent
(async () => {
  const agent = new ClaudeAgent();
  
  try {
    await agent.initialize();
    console.log(`🤖 Optimized Claude Agent [${agent.role}] ready for 1000+ agent scaling`);
    
    // Start processing
    await agent.processQueue();
    
  } catch (error) {
    console.error('❌ Claude Agent startup failed:', error);
    process.exit(1);
  }
})();

// Export for testing
module.exports = ClaudeAgent;