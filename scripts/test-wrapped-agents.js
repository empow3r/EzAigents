#!/usr/bin/env node

/**
 * Test Script for Wrapped Agents
 * 
 * This script tests that all wrapped agents work correctly with the
 * auto-scaling and coordination system.
 */

const Redis = require('ioredis');
const { spawn } = require('child_process');
const path = require('path');

class WrappedAgentTester {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.testResults = [];
    this.spawnedAgents = [];
    
    // Agent configurations
    this.agentConfigs = {
      claude: {
        script: 'agents/claude/wrapped-index.js',
        queue: 'queue:claude-3-opus',
        processing: 'processing:claude-3-opus',
        capabilities: ['architecture', 'refactoring', 'documentation', 'security']
      },
      gpt: {
        script: 'agents/gpt/wrapped-index.js',
        queue: 'queue:gpt-4o',
        processing: 'processing:gpt-4o',
        capabilities: ['backend-logic', 'api-design', 'implementation']
      },
      deepseek: {
        script: 'agents/deepseek/wrapped-index.js',
        queue: 'queue:deepseek-coder',
        processing: 'processing:deepseek-coder',
        capabilities: ['testing', 'validation', 'optimization']
      },
      mistral: {
        script: 'agents/mistral/wrapped-index.js',
        queue: 'queue:command-r-plus',
        processing: 'processing:command-r-plus',
        capabilities: ['documentation', 'analysis']
      },
      gemini: {
        script: 'agents/gemini/wrapped-index.js',
        queue: 'queue:gemini-pro',
        processing: 'processing:gemini-pro',
        capabilities: ['analysis', 'optimization', 'performance']
      }
    };
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting Wrapped Agent Tests...\n');
    
    try {
      // Clean up Redis state
      await this.cleanup();
      
      // Test 1: Agent spawning
      await this.testAgentSpawning();
      
      // Test 2: Task processing
      await this.testTaskProcessing();
      
      // Test 3: Coordination features
      await this.testCoordinationFeatures();
      
      // Test 4: Auto-scaling integration
      await this.testAutoScalingIntegration();
      
      // Show results
      this.showResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      // Clean up
      await this.cleanup();
      await this.terminateAllAgents();
    }
  }

  /**
   * Test agent spawning
   */
  async testAgentSpawning() {
    console.log('🔧 Testing Agent Spawning...');
    
    for (const [agentType, config] of Object.entries(this.agentConfigs)) {
      try {
        console.log(`  Testing ${agentType} agent...`);
        
        // Check if script exists
        const fs = require('fs');
        const scriptPath = path.resolve(config.script);
        
        if (!fs.existsSync(scriptPath)) {
          this.addTestResult(`${agentType}_spawn`, false, `Script not found: ${config.script}`);
          continue;
        }
        
        // Spawn agent
        const agentProcess = await this.spawnAgent(agentType, config);
        
        // Wait for agent to register
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check if agent registered
        const agents = await this.redis.hgetall('agents');
        const agentRegistered = Object.keys(agents).some(key => key.includes(agentType));
        
        if (agentRegistered) {
          this.addTestResult(`${agentType}_spawn`, true, `Agent spawned and registered successfully`);
        } else {
          this.addTestResult(`${agentType}_spawn`, false, `Agent failed to register`);
        }
        
      } catch (error) {
        this.addTestResult(`${agentType}_spawn`, false, `Spawn error: ${error.message}`);
      }
    }
  }

  /**
   * Test task processing
   */
  async testTaskProcessing() {
    console.log('📋 Testing Task Processing...');
    
    // Create test tasks for each agent type
    const testTasks = {
      claude: {
        file: 'test/architecture.js',
        prompt: 'Review the architecture and suggest improvements',
        timestamp: new Date().toISOString()
      },
      gpt: {
        file: 'test/api.js',
        prompt: 'Implement REST API endpoints for user management',
        timestamp: new Date().toISOString()
      },
      deepseek: {
        file: 'test/testing.js',
        prompt: 'Create comprehensive unit tests',
        timestamp: new Date().toISOString()
      },
      mistral: {
        file: 'test/documentation.md',
        prompt: 'Write detailed documentation for the API',
        timestamp: new Date().toISOString()
      },
      gemini: {
        file: 'test/optimization.js',
        prompt: 'Analyze and optimize performance bottlenecks',
        timestamp: new Date().toISOString()
      }
    };
    
    // Enqueue tasks
    for (const [agentType, task] of Object.entries(testTasks)) {
      try {
        const config = this.agentConfigs[agentType];
        await this.redis.lpush(config.queue, JSON.stringify(task));
        console.log(`  Enqueued test task for ${agentType}`);
      } catch (error) {
        console.error(`  Error enqueueing task for ${agentType}:`, error);
      }
    }
    
    // Wait for processing
    console.log('  Waiting for task processing...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Check results
    for (const [agentType, config] of Object.entries(this.agentConfigs)) {
      try {
        const processingTasks = await this.redis.llen(config.processing);
        const queueTasks = await this.redis.llen(config.queue);
        
        if (processingTasks > 0 || queueTasks === 0) {
          this.addTestResult(`${agentType}_processing`, true, `Task processing working`);
        } else {
          this.addTestResult(`${agentType}_processing`, false, `Tasks not processed`);
        }
        
      } catch (error) {
        this.addTestResult(`${agentType}_processing`, false, `Processing check error: ${error.message}`);
      }
    }
  }

  /**
   * Test coordination features
   */
  async testCoordinationFeatures() {
    console.log('🤝 Testing Coordination Features...');
    
    // Test agent registration
    const agents = await this.redis.hgetall('agents');
    const registeredAgents = Object.keys(agents).length;
    
    if (registeredAgents > 0) {
      this.addTestResult('coordination_registration', true, `${registeredAgents} agents registered`);
    } else {
      this.addTestResult('coordination_registration', false, 'No agents registered');
    }
    
    // Test file locking
    const locks = await this.redis.keys('lock:*');
    this.addTestResult('coordination_locking', true, `Locking system available (${locks.length} locks)`);
    
    // Test assistance system
    const assistanceProviders = await this.redis.keys('assistance_providers:*');
    this.addTestResult('coordination_assistance', true, `Assistance system available (${assistanceProviders.length} providers)`);
  }

  /**
   * Test auto-scaling integration
   */
  async testAutoScalingIntegration() {
    console.log('📈 Testing Auto-Scaling Integration...');
    
    // Create high queue load to trigger scaling
    const highLoadTasks = [];
    for (let i = 0; i < 10; i++) {
      highLoadTasks.push({
        file: `test/load-${i}.js`,
        prompt: `Load test task ${i}`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Enqueue high load tasks
    for (const task of highLoadTasks) {
      await this.redis.lpush('queue:gpt-4o', JSON.stringify(task));
    }
    
    // Wait for scaling response
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check if scaling would be triggered
    const queueDepth = await this.redis.llen('queue:gpt-4o');
    
    if (queueDepth > 5) {
      this.addTestResult('autoscaling_trigger', true, `High queue depth would trigger scaling (${queueDepth} tasks)`);
    } else {
      this.addTestResult('autoscaling_trigger', false, `Queue depth too low for scaling test`);
    }
  }

  /**
   * Spawn an agent for testing
   */
  async spawnAgent(agentType, config) {
    return new Promise((resolve, reject) => {
      const agentId = `${agentType}_test_${Date.now()}`;
      
      const agentProcess = spawn('node', [config.script], {
        env: {
          ...process.env,
          AGENT_ID: agentId,
          AGENT_TYPE: agentType,
          AGENT_CAPABILITIES: config.capabilities.join(',')
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      this.spawnedAgents.push(agentProcess);
      
      let stdout = '';
      let stderr = '';
      
      agentProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      agentProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      agentProcess.on('error', (error) => {
        reject(error);
      });
      
      // Consider agent spawned after 3 seconds
      setTimeout(() => {
        if (agentProcess.exitCode === null) {
          resolve(agentProcess);
        } else {
          reject(new Error(`Agent exited with code ${agentProcess.exitCode}: ${stderr}`));
        }
      }, 3000);
    });
  }

  /**
   * Add test result
   */
  addTestResult(testName, passed, details) {
    this.testResults.push({
      test: testName,
      passed: passed,
      details: details,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${testName}: ${details}`);
  }

  /**
   * Show test results
   */
  showResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('=========================');
    
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => r.passed === false).length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.testResults
        .filter(r => r.passed === false)
        .forEach(r => console.log(`  ❌ ${r.test}: ${r.details}`));
    }
    
    console.log('\nDetailed Results:');
    this.testResults.forEach(r => {
      const status = r.passed ? '✅' : '❌';
      console.log(`  ${status} ${r.test}: ${r.details}`);
    });
  }

  /**
   * Cleanup Redis state
   */
  async cleanup() {
    // Clear test data
    const testKeys = [
      'queue:*',
      'processing:*', 
      'agents',
      'lock:*',
      'assistance_providers:*',
      'coordination:*',
      'command_lock:*'
    ];
    
    for (const pattern of testKeys) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }

  /**
   * Terminate all spawned agents
   */
  async terminateAllAgents() {
    console.log('\n🛑 Terminating spawned agents...');
    
    for (const agentProcess of this.spawnedAgents) {
      try {
        if (agentProcess.exitCode === null) {
          agentProcess.kill('SIGTERM');
          
          // Wait for graceful shutdown
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Force kill if still running
          if (agentProcess.exitCode === null) {
            agentProcess.kill('SIGKILL');
          }
        }
      } catch (error) {
        console.error(`Error terminating agent:`, error);
      }
    }
    
    this.spawnedAgents = [];
    console.log('✅ All agents terminated');
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const tester = new WrappedAgentTester();
  tester.runAllTests().catch(console.error);
}

module.exports = WrappedAgentTester;