/**
 * Example: Integrating Agent Coordination into Existing Agents
 * 
 * This file shows how to modify existing agents to use the coordination system
 * to prevent conflicts and enable collaborative work.
 */

const AgentCoordination = require('../cli/agent-coordination');
const Redis = require('ioredis');

// Example 1: Claude Agent with Coordination
class ClaudeAgentWithCoordination {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.coordination = new AgentCoordination();
    this.agentId = process.env.AGENT_ID || `claude_${Date.now()}`;
    this.model = 'claude-3-opus';
    this.isRegistered = false;
  }

  async start() {
    try {
      // Register with coordination system
      const result = await this.coordination.registerAgent('claude', [
        'architecture', 'refactoring', 'documentation', 'security'
      ]);
      
      if (result.success) {
        this.isRegistered = true;
        console.log(`✅ Claude agent registered: ${this.agentId}`);
        
        // Start listening for tasks
        this.listenForTasks();
      } else {
        console.error('❌ Failed to register Claude agent');
      }
    } catch (error) {
      console.error('Claude agent startup error:', error);
    }
  }

  async listenForTasks() {
    // Listen for tasks from Redis queue
    while (this.isRegistered) {
      try {
        const task = await this.redis.brpoplpush(
          `queue:${this.model}`,
          `processing:${this.model}`,
          30
        );

        if (task) {
          await this.processTaskSafely(JSON.parse(task));
        }
      } catch (error) {
        console.error('Task listening error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  async processTaskSafely(task) {
    console.log(`🔄 Claude processing: ${task.file}`);
    
    // Request file access through coordination system
    const access = await this.coordination.requestFileAccess(
      task.file,
      task.prompt,
      task.priority || 'normal'
    );

    if (access.success) {
      try {
        // Process the task with file access granted
        const result = await this.executeTask(task);
        
        // Release file access
        await this.coordination.releaseFileAccess(
          task.file,
          `Claude completed: ${task.prompt}`
        );
        
        // Remove from processing queue
        await this.redis.lrem(`processing:${this.model}`, 1, JSON.stringify(task));
        
        console.log(`✅ Claude completed: ${task.file}`);
        return result;
        
      } catch (error) {
        console.error(`❌ Claude task error: ${error.message}`);
        
        // Release file access on error
        await this.coordination.releaseFileAccess(
          task.file,
          `Claude error: ${error.message}`
        );
        
        // Move to failure queue
        await this.redis.lpush('queue:failures', JSON.stringify({
          ...task,
          error: error.message,
          agent: this.agentId,
          failed_at: new Date().toISOString()
        }));
        
        // Remove from processing
        await this.redis.lrem(`processing:${this.model}`, 1, JSON.stringify(task));
      }
    } else {
      console.log(`⚠️  Claude access denied for ${task.file}: ${access.message}`);
      
      // Handle conflict based on response
      if (access.coordination_id) {
        console.log(`🤝 Coordination requested: ${access.coordination_id}`);
      } else if (access.queue_position) {
        console.log(`📋 Work queued at position: ${access.queue_position}`);
      }
      
      // Return task to queue for retry
      await this.redis.lpush(`queue:${this.model}`, JSON.stringify(task));
      await this.redis.lrem(`processing:${this.model}`, 1, JSON.stringify(task));
    }
  }

  async executeTask(task) {
    // Simulate Claude AI processing
    // In real implementation, this would call Claude API
    console.log(`🧠 Claude analyzing: ${task.file}`);
    
    // Simulate work time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      file: task.file,
      changes: 'Architecture improvements applied',
      agent: this.agentId
    };
  }

  async shutdown() {
    this.isRegistered = false;
    await this.coordination.shutdown();
    console.log('👋 Claude agent shutdown');
  }
}

// Example 2: GPT Agent with Coordination  
class GPTAgentWithCoordination {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.coordination = new AgentCoordination();
    this.agentId = process.env.AGENT_ID || `gpt_${Date.now()}`;
    this.model = 'gpt-4o';
    this.isRegistered = false;
  }

  async start() {
    const result = await this.coordination.registerAgent('gpt', [
      'backend-logic', 'api-design', 'frontend', 'implementation'
    ]);
    
    if (result.success) {
      this.isRegistered = true;
      console.log(`✅ GPT agent registered: ${this.agentId}`);
      this.listenForTasks();
    }
  }

  async listenForTasks() {
    while (this.isRegistered) {
      try {
        const task = await this.redis.brpoplpush(
          `queue:${this.model}`,
          `processing:${this.model}`,
          30
        );

        if (task) {
          await this.processTaskSafely(JSON.parse(task));
        }
      } catch (error) {
        console.error('GPT task listening error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  async processTaskSafely(task) {
    console.log(`🔄 GPT processing: ${task.file}`);
    
    const access = await this.coordination.requestFileAccess(
      task.file,
      task.prompt,
      task.priority || 'normal'
    );

    if (access.success) {
      try {
        const result = await this.executeTask(task);
        
        await this.coordination.releaseFileAccess(
          task.file,
          `GPT completed: ${task.prompt}`
        );
        
        await this.redis.lrem(`processing:${this.model}`, 1, JSON.stringify(task));
        console.log(`✅ GPT completed: ${task.file}`);
        
      } catch (error) {
        await this.coordination.releaseFileAccess(
          task.file,
          `GPT error: ${error.message}`
        );
        
        await this.redis.lpush('queue:failures', JSON.stringify({
          ...task,
          error: error.message,
          agent: this.agentId,
          failed_at: new Date().toISOString()
        }));
        
        await this.redis.lrem(`processing:${this.model}`, 1, JSON.stringify(task));
      }
    } else {
      // Handle coordination response
      console.log(`⚠️  GPT access denied for ${task.file}: ${access.message}`);
      await this.redis.lpush(`queue:${this.model}`, JSON.stringify(task));
      await this.redis.lrem(`processing:${this.model}`, 1, JSON.stringify(task));
    }
  }

  async executeTask(task) {
    console.log(`🧠 GPT processing: ${task.file}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      success: true,
      file: task.file,
      changes: 'Backend logic implemented',
      agent: this.agentId
    };
  }

  async shutdown() {
    this.isRegistered = false;
    await this.coordination.shutdown();
    console.log('👋 GPT agent shutdown');
  }
}

// Example 3: Multi-Agent Coordination Demo
class MultiAgentDemo {
  constructor() {
    this.agents = [];
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async startDemo() {
    console.log('🚀 Starting multi-agent coordination demo...');
    
    // Start multiple agents
    const claudeAgent = new ClaudeAgentWithCoordination();
    const gptAgent = new GPTAgentWithCoordination();
    
    await claudeAgent.start();
    await gptAgent.start();
    
    this.agents = [claudeAgent, gptAgent];
    
    // Simulate concurrent tasks on same file
    await this.simulateConflictScenario();
    
    // Cleanup
    setTimeout(async () => {
      await this.shutdown();
    }, 30000);
  }

  async simulateConflictScenario() {
    console.log('🔥 Simulating conflict scenario...');
    
    const conflictingTasks = [
      {
        file: 'dashboard/src/components/TestComponent.jsx',
        prompt: 'Refactor component architecture',
        model: 'claude-3-opus',
        priority: 'high'
      },
      {
        file: 'dashboard/src/components/TestComponent.jsx',
        prompt: 'Add backend API integration',
        model: 'gpt-4o',
        priority: 'normal'
      }
    ];

    // Enqueue conflicting tasks simultaneously
    for (const task of conflictingTasks) {
      await this.redis.lpush(`queue:${task.model}`, JSON.stringify(task));
      console.log(`📋 Enqueued task for ${task.model}: ${task.file}`);
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down demo...');
    
    for (const agent of this.agents) {
      await agent.shutdown();
    }
    
    console.log('✅ Demo complete');
    process.exit(0);
  }
}

// Example 4: Dashboard Integration Pattern
class DashboardAgentIntegration {
  constructor() {
    this.coordination = new AgentCoordination();
    this.agentId = process.env.AGENT_ID || `dashboard_agent_${Date.now()}`;
  }

  async modifyDashboardSafely(filePath, changes) {
    console.log(`🔄 Requesting access to ${filePath}...`);
    
    // Request file access
    const access = await this.coordination.requestFileAccess(
      filePath,
      'Dashboard optimization updates',
      'high'
    );

    if (access.success) {
      try {
        console.log(`✅ Access granted to ${filePath}`);
        
        // Apply changes safely
        await this.applyDashboardChanges(filePath, changes);
        
        // Release access
        await this.coordination.releaseFileAccess(
          filePath,
          'Dashboard updates completed successfully'
        );
        
        return { success: true, message: 'Dashboard updated successfully' };
        
      } catch (error) {
        // Always release on error
        await this.coordination.releaseFileAccess(
          filePath,
          `Dashboard update failed: ${error.message}`
        );
        
        return { success: false, error: error.message };
      }
    } else {
      console.log(`⚠️  Access denied to ${filePath}: ${access.message}`);
      return access;
    }
  }

  async applyDashboardChanges(filePath, changes) {
    // Simulate dashboard file modification
    console.log(`🔧 Applying changes to ${filePath}...`);
    
    // Simulate work time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`✅ Changes applied to ${filePath}`);
  }
}

// Export for use in other modules
module.exports = {
  ClaudeAgentWithCoordination,
  GPTAgentWithCoordination,
  MultiAgentDemo,
  DashboardAgentIntegration
};

// Demo runner
if (require.main === module) {
  const demo = new MultiAgentDemo();
  demo.startDemo().catch(console.error);
}