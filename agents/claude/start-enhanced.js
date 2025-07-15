#!/usr/bin/env node

/**
 * Enhanced Claude Agent Startup Script
 * Initializes and starts the enhanced Claude agent with all advanced features
 */

const EnhancedClaudeAgent = require('./enhanced-agent');

async function startEnhancedClaudeAgent() {
  console.log('🚀 Starting Enhanced Claude Agent...');
  
  try {
    // Configuration from environment variables
    const config = {
      agentId: process.env.AGENT_ID || `claude-enhanced-${Date.now()}`,
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      encryptionKey: process.env.ENCRYPTION_KEY,
      logLevel: process.env.LOG_LEVEL || 'info',
      maxLoad: parseInt(process.env.MAX_LOAD) || 3,
      rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE) || 50,
      taskTimeout: parseInt(process.env.TASK_TIMEOUT) || 60000,
      memoryLimit: parseInt(process.env.MEMORY_LIMIT) || 1024
    };
    
    // Validate required environment variables
    if (!process.env.CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY environment variable is required');
    }
    
    // Create and initialize the agent
    const agent = new EnhancedClaudeAgent(config);
    
    // Set up graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down Enhanced Claude Agent gracefully...`);
      
      try {
        await agent.shutdown();
        console.log('✅ Enhanced Claude Agent shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    // Handle shutdown signals
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGQUIT', () => shutdown('SIGQUIT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
    
    // Initialize the agent
    await agent.initialize();
    
    console.log(`✅ Enhanced Claude Agent started successfully!`);
    console.log(`📋 Agent ID: ${agent.agentId}`);
    console.log(`🧠 Model: ${agent.model}`);
    console.log(`⚡ Capabilities: ${agent.capabilities.join(', ')}`);
    console.log(`🔧 Max Load: ${agent.maxLoad}`);
    console.log(`📊 Rate Limit: ${agent.rateLimitPerMinute}/min`);
    console.log(`💾 Memory Limit: ${agent.memoryLimit}MB`);
    console.log(`🔐 Encryption: ${agent.encryptionKey ? 'Enabled' : 'Disabled'}`);
    console.log('🏃 Agent is ready to process tasks...\n');
    
    // Log periodic status updates
    setInterval(async () => {
      const health = await agent.performHealthCheck();
      console.log(`📊 Status: ${health.status} | Load: ${health.queueHealth.currentLoad}/${health.queueHealth.maxLoad} | Memory: ${health.memoryUsage.used}MB (${health.memoryUsage.percentage}%) | Success Rate: ${health.performance.successRate}%`);
    }, 60000); // Every minute
    
  } catch (error) {
    console.error('❌ Failed to start Enhanced Claude Agent:', error);
    process.exit(1);
  }
}

// Start the agent if this script is run directly
if (require.main === module) {
  startEnhancedClaudeAgent();
}

module.exports = { startEnhancedClaudeAgent };