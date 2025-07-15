/**
 * Mock Agent for Testing
 * Simulates agent behavior for testing the bulletproof queue system
 */

const BaseAgent = require('../agents/base-agent');

class MockAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      model: 'mock-model',
      role: 'test-agent',
      capabilities: ['test', 'simulation'],
      maxLoad: config.maxLoad || 3,
      ...config
    });
    
    this.failureRate = parseFloat(process.env.FAILURE_RATE || '0.1');
    this.processingTimeMin = 1000;
    this.processingTimeMax = 5000;
  }
  
  async processTask(task) {
    const startTime = Date.now();
    
    // Simulate processing time
    const processingTime = this.processingTimeMin + 
      Math.random() * (this.processingTimeMax - this.processingTimeMin);
    
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Force failure for specific test cases
    if (task.prompt === 'FORCE_FAILURE') {
      throw new Error('Forced test failure');
    }
    
    if (task.prompt === 'FORCE_TIMEOUT') {
      // Simulate timeout by waiting longer than task timeout
      await new Promise(resolve => setTimeout(resolve, 40000));
    }
    
    if (task.prompt === 'FORCE_PARSE_ERROR') {
      throw new Error('JSON parse error: Unexpected token');
    }
    
    // Random failures based on failure rate
    if (Math.random() < this.failureRate) {
      const errorTypes = [
        'rate_limit_exceeded',
        'connection_timeout',
        'memory_limit_exceeded',
        'temporary_failure'
      ];
      
      const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      throw new Error(errorType);
    }
    
    // Successful completion
    return {
      success: true,
      taskId: task.id,
      result: `Mock task completed: ${task.file}`,
      processingTime: Date.now() - startTime,
      agentId: this.agentId
    };
  }
  
  // Override to add test-specific behavior
  async handleControlMessage(message) {
    await super.handleControlMessage(message);
    
    // Additional test commands
    switch (message.command) {
      case 'simulate_crash':
        this.logger.info('Simulating agent crash');
        process.exit(1);
        break;
        
      case 'simulate_hang':
        this.logger.info('Simulating agent hang');
        while (true) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        break;
        
      case 'increase_failure_rate':
        this.failureRate = Math.min(1, this.failureRate + 0.1);
        this.logger.info(`Increased failure rate to ${this.failureRate}`);
        break;
    }
  }
}

// Start mock agent if run directly
if (require.main === module) {
  const agent = new MockAgent({
    agentId: process.env.AGENT_ID || `mock_agent_${Date.now()}`
  });
  
  agent.initialize().catch(error => {
    console.error('Failed to initialize mock agent:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    await agent.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await agent.shutdown();
    process.exit(0);
  });
}

module.exports = MockAgent;