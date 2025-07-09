#!/usr/bin/env node

/**
 * Demo Agent Chat - Simulate agent conversations for testing
 */

const Redis = require('ioredis');

class DemoAgentChat {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.agents = [
      { id: 'claude-arch-001', type: 'claude', name: 'Claude Architect' },
      { id: 'gpt-backend-001', type: 'gpt', name: 'GPT Backend' },
      { id: 'deepseek-test-001', type: 'deepseek', name: 'DeepSeek Tester' },
      { id: 'mistral-docs-001', type: 'mistral', name: 'Mistral Docs' }
    ];
    
    this.demoScenarios = [
      this.authRefactorScenario.bind(this),
      this.apiTestingScenario.bind(this),
      this.documentationScenario.bind(this),
      this.emergencyScenario.bind(this)
    ];
  }
  
  async start() {
    console.log('🎬 Starting Agent Communication Demo...\n');
    
    // Register demo agents
    await this.registerAgents();
    
    // Wait a bit
    await this.sleep(2000);
    
    // Run demo scenarios
    for (let i = 0; i < this.demoScenarios.length; i++) {
      console.log(`📋 Running Scenario ${i + 1}...\n`);
      await this.demoScenarios[i]();
      await this.sleep(3000);
    }
    
    console.log('✅ Demo completed! Check your monitor to see the communications.\n');
    process.exit(0);
  }
  
  async registerAgents() {
    for (const agent of this.agents) {
      await this.redis.hset(`agent:${agent.id}`, {
        id: agent.id,
        type: agent.type,
        status: 'active',
        capabilities: JSON.stringify([agent.type, 'demo']),
        current_task: 'demo_ready',
        last_heartbeat: new Date().toISOString()
      });
      
      // Announce agent online
      await this.redis.publish('agent-registry', JSON.stringify({
        type: 'agent_registered',
        agent: {
          id: agent.id,
          type: agent.type,
          capabilities: [agent.type, 'demo']
        },
        timestamp: new Date().toISOString()
      }));
      
      console.log(`✅ Registered ${agent.name} (${agent.id})`);
    }
  }
  
  async authRefactorScenario() {
    const claude = 'claude-arch-001';
    const gpt = 'gpt-backend-001';
    const deepseek = 'deepseek-test-001';
    
    // Claude starts working on auth refactor
    await this.sendMessage(claude, 'all', 'Starting auth module refactoring', 'broadcast');
    await this.sleep(1000);
    
    // Claude claims auth file
    await this.fileLock(claude, 'auth/login.js', 'claimed');
    await this.sleep(500);
    
    // GPT offers to help
    await this.sendMessage(gpt, claude, 'I can help with the backend logic once you\'re done with architecture', 'coordination_request');
    await this.sleep(800);
    
    // Claude responds
    await this.sendMessage(claude, gpt, 'Thanks! I\'ll need review of the new authentication flow', 'coordination_accept');
    await this.sleep(1000);
    
    // DeepSeek joins
    await this.sendMessage(deepseek, 'all', 'I can create tests for the new auth system', 'offer_help');
    await this.sleep(800);
    
    // Claude releases file
    await this.fileLock(claude, 'auth/login.js', 'released');
    await this.sleep(500);
    
    // GPT claims for backend work
    await this.fileLock(gpt, 'auth/login.js', 'claimed');
    await this.sleep(1000);
    
    // GPT finishes and requests testing
    await this.sendMessage(gpt, deepseek, 'Backend logic complete. Please create comprehensive tests', 'task_handoff');
    await this.fileLock(gpt, 'auth/login.js', 'released');
  }
  
  async apiTestingScenario() {
    const gpt = 'gpt-backend-001';
    const deepseek = 'deepseek-test-001';
    
    // GPT working on API
    await this.sendMessage(gpt, 'all', 'Implementing new user API endpoints', 'status_update');
    await this.sleep(1000);
    
    // File operations
    await this.fileLock(gpt, 'api/users.js', 'claimed');
    await this.sleep(800);
    
    // Task completion
    await this.taskUpdate('api-implementation', 'completed', gpt);
    await this.sleep(500);
    
    // Request testing
    await this.sendMessage(gpt, deepseek, 'New API ready for testing. Endpoints: GET/POST/PUT/DELETE /api/users', 'review_request');
    await this.sleep(1000);
    
    // DeepSeek accepts
    await this.sendMessage(deepseek, gpt, 'I\'ll create full API test suite with edge cases', 'review_accepted');
    await this.fileLock(gpt, 'api/users.js', 'released');
    await this.fileLock(deepseek, 'tests/api/users.test.js', 'claimed');
  }
  
  async documentationScenario() {
    const mistral = 'mistral-docs-001';
    const claude = 'claude-arch-001';
    
    // Mistral offers documentation
    await this.sendMessage(mistral, 'all', 'I can document all the recent API changes', 'offer_service');
    await this.sleep(1000);
    
    // Claude requests docs
    await this.sendMessage(claude, mistral, 'Please document the new authentication architecture', 'documentation_request');
    await this.sleep(800);
    
    // Mistral works on docs
    await this.fileLock(mistral, 'docs/authentication.md', 'claimed');
    await this.sendMessage(mistral, claude, 'Creating comprehensive auth documentation with examples', 'work_update');
    await this.sleep(1500);
    
    // Documentation complete
    await this.sendMessage(mistral, 'all', 'Authentication documentation completed with code examples and flow diagrams', 'task_completed');
    await this.fileLock(mistral, 'docs/authentication.md', 'released');
  }
  
  async emergencyScenario() {
    const claude = 'claude-arch-001';
    const gpt = 'gpt-backend-001';
    
    // Emergency situation
    await this.sendEmergency('System alert: Critical security vulnerability detected in auth module');
    await this.sleep(800);
    
    // Agents respond to emergency
    await this.sendMessage(claude, 'all', 'Investigating architecture for security issues', 'emergency_response');
    await this.sleep(600);
    
    await this.sendMessage(gpt, 'all', 'Checking backend authentication logic for vulnerabilities', 'emergency_response');
    await this.sleep(800);
    
    // Force lock for emergency fix
    await this.fileLock(claude, 'auth/security.js', 'force_locked', 'emergency security fix');
    await this.sleep(1000);
    
    // Emergency resolved
    await this.sendMessage(claude, 'all', 'Security patch applied. Vulnerability fixed in authentication layer', 'emergency_resolved');
    await this.fileLock(claude, 'auth/security.js', 'released');
  }
  
  async sendMessage(from, to, message, type = 'chat') {
    if (to === 'all') {
      // Broadcast message
      await this.redis.publish('agent-chat', JSON.stringify({
        type: 'broadcast',
        from,
        to: 'all',
        message,
        priority: 'normal',
        timestamp: new Date().toISOString()
      }));
    } else {
      // Direct message
      await this.redis.lpush(`messages:${to}`, JSON.stringify({
        type,
        from,
        message,
        priority: type.includes('emergency') ? 'high' : 'normal',
        timestamp: new Date().toISOString()
      }));
    }
  }
  
  async fileLock(agent, file, action, reason = '') {
    const actions = {
      'claimed': 'file_claimed',
      'released': 'file_released',
      'force_locked': 'file_force_locked'
    };
    
    await this.redis.publish('file-locks', JSON.stringify({
      type: actions[action],
      file,
      agent,
      reason,
      timestamp: new Date().toISOString()
    }));
    
    // Also set/remove actual lock
    if (action === 'claimed' || action === 'force_locked') {
      await this.redis.set(`lock:${file}`, agent, 'EX', 1800);
    } else if (action === 'released') {
      await this.redis.del(`lock:${file}`);
    }
  }
  
  async taskUpdate(taskId, status, agent) {
    await this.redis.publish('task-updates', JSON.stringify({
      type: 'task_status_changed',
      task_id: taskId,
      status,
      agent,
      timestamp: new Date().toISOString()
    }));
  }
  
  async sendEmergency(message) {
    await this.redis.publish('agent-emergency', JSON.stringify({
      type: 'emergency',
      message,
      timestamp: new Date().toISOString()
    }));
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run demo if called directly
if (require.main === module) {
  const demo = new DemoAgentChat();
  demo.start().catch(console.error);
}

module.exports = DemoAgentChat;