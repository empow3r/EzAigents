// Mock Agent for Dashboard Testing
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class MockAgent {
  constructor(type = 'mock', capabilities = ['demo', 'testing']) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.agentId = `${type}-${Date.now()}`;
    this.agentType = type;
    this.capabilities = capabilities;
    this.status = 'active';
    this.currentTask = null;
    this.performance = {
      total_runs: Math.floor(Math.random() * 100),
      total_tokens: Math.floor(Math.random() * 10000),
      success_rate: 0.95 + Math.random() * 0.05
    };
    
    this.queueName = `queue:${type}`;
    this.init();
  }

  async init() {
    // Register agent
    await this.registerAgent();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Start processing queue
    this.startProcessing();
    
    console.log(`🤖 ${this.agentType} Mock Agent ${this.agentId} started`);
  }

  async registerAgent() {
    const agentData = {
      agentId: this.agentId,
      agentType: this.agentType,
      pid: process.pid,
      startTime: new Date().toISOString(),
      version: '1.0.0',
      capabilities: this.capabilities,
      status: this.status,
      lastHeartbeat: new Date().toISOString(),
      uptime: 0,
      performance: this.performance,
      model: this.agentType === 'claude' ? 'claude-3-opus' : 
             this.agentType === 'gpt' ? 'gpt-4o' :
             this.agentType === 'deepseek' ? 'deepseek-coder' :
             this.agentType === 'gemini' ? 'gemini-pro' :
             this.agentType
    };

    await this.redis.hset('agents:registry', this.agentId, JSON.stringify(agentData));
    console.log(`📝 Registered agent: ${this.agentId}`);
  }

  startHeartbeat() {
    setInterval(async () => {
      const agentDataStr = await this.redis.hget('agents:registry', this.agentId);
      if (agentDataStr) {
        const agentData = JSON.parse(agentDataStr);
        agentData.lastHeartbeat = new Date().toISOString();
        agentData.uptime = Date.now() - new Date(agentData.startTime).getTime();
        agentData.currentTask = this.currentTask;
        agentData.performance = this.performance;
        
        await this.redis.hset('agents:registry', this.agentId, JSON.stringify(agentData));
      }
    }, 30000); // Every 30 seconds
  }

  async startProcessing() {
    while (true) {
      try {
        // Check for tasks in queue
        const task = await this.redis.brpop(this.queueName, 5);
        
        if (task && task[1]) {
          await this.processTask(JSON.parse(task[1]));
        }
      } catch (error) {
        console.error(`❌ ${this.agentType} processing error:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  async processTask(task) {
    this.currentTask = task.id || 'processing';
    console.log(`🔄 ${this.agentType} processing task: ${task.id || 'unknown'}`);
    
    // Simulate processing time
    const processingTime = 2000 + Math.random() * 8000; // 2-10 seconds
    
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Update performance stats
    this.performance.total_runs++;
    this.performance.total_tokens += Math.floor(Math.random() * 1000) + 100;
    
    // Simulate success/failure
    const success = Math.random() > 0.1; // 90% success rate
    
    if (success) {
      console.log(`✅ ${this.agentType} completed task: ${task.id || 'unknown'}`);
      
      // Save result to outputs
      const result = `Mock ${this.agentType} result for: ${task.prompt || 'No prompt'}\n\nGenerated response with simulated AI processing.`;
      
      // Store in Redis for dashboard viewing
      await this.redis.hset('task:results', task.id || uuidv4(), JSON.stringify({
        taskId: task.id,
        agentId: this.agentId,
        agentType: this.agentType,
        result: result,
        completedAt: new Date().toISOString(),
        processingTime: processingTime
      }));
      
    } else {
      console.log(`❌ ${this.agentType} failed task: ${task.id || 'unknown'}`);
      // Requeue task
      await this.redis.lpush(this.queueName, JSON.stringify(task));
    }
    
    this.currentTask = null;
  }

  async shutdown() {
    // Remove from registry
    await this.redis.hdel('agents:registry', this.agentId);
    console.log(`🛑 ${this.agentType} Mock Agent ${this.agentId} shutdown`);
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down mock agent...');
  if (global.mockAgent) {
    await global.mockAgent.shutdown();
  }
});

// Start agent based on command line argument
const agentType = process.argv[2] || 'mock';
const capabilities = {
  'claude': ['architecture', 'complex-reasoning', 'large-context', 'refactoring'],
  'gpt': ['general-purpose', 'coding', 'analysis', 'fast-response'],
  'deepseek': ['coding', 'debugging', 'testing', 'refactoring', 'mathematical-reasoning'],
  'gemini': ['analysis', 'research', 'multimodal', 'speed'],
  'mistral': ['efficiency', 'multilingual', 'instruction-following'],
  'mock': ['demo', 'testing', 'simulation']
};

global.mockAgent = new MockAgent(agentType, capabilities[agentType] || ['demo']);