#!/usr/bin/env node

/**
 * Master Agent Controller
 * 
 * Orchestrates all agent coordination systems to keep agents busy and working efficiently:
 * - Auto-scaling based on queue depth
 * - Workload balancing across agents
 * - Conflict prevention and coordination
 * - Health monitoring and recovery
 * - Performance optimization
 */

const Redis = require('ioredis');
const WorkloadBalancer = require('./workload-balancer');
const AgentAutoScaler = require('./agent-auto-scaler');
const fs = require('fs').promises;

class MasterAgentController {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.controllerId = `master_${Date.now()}`;
    
    // Initialize subsystems
    this.workloadBalancer = new WorkloadBalancer();
    this.autoScaler = new AgentAutoScaler();
    
    // Controller configuration
    this.config = {
      monitoringInterval: 10000, // 10 seconds
      healthCheckInterval: 30000, // 30 seconds
      reportingInterval: 300000, // 5 minutes
      maxIdleTime: 60000, // 1 minute
      targetUtilization: 0.8, // 80% utilization target
      emergencyScalingThreshold: 50 // Emergency scaling at 50 tasks
    };
    
    // System state
    this.systemState = {
      totalAgents: 0,
      activeAgents: 0,
      totalTasks: 0,
      processingTasks: 0,
      failedTasks: 0,
      averageWaitTime: 0,
      systemUtilization: 0,
      lastUpdated: new Date().toISOString()
    };
    
    // Performance metrics
    this.performanceMetrics = {
      tasksPerMinute: 0,
      averageTaskTime: 0,
      successRate: 0,
      scalingActions: 0,
      balancingActions: 0,
      startTime: new Date().toISOString()
    };
    
    console.log(`🎛️  Master Agent Controller initialized`);
  }

  /**
   * Start the master controller
   */
  async start() {
    try {
      console.log(`🚀 Starting Master Agent Controller...`);
      
      // Register controller
      await this.registerController();
      
      // Start subsystems
      await this.workloadBalancer.start();
      
      // Start monitoring and control loops
      this.startSystemMonitoring();
      this.startHealthMonitoring();
      this.startPerformanceReporting();
      this.startEmergencyResponse();
      
      // Initial system assessment
      await this.performInitialAssessment();
      
      console.log(`✅ Master Agent Controller started successfully`);
      
      // Show initial status
      await this.showSystemStatus();
      
    } catch (error) {
      console.error(`❌ Error starting Master Agent Controller: ${error.message}`);
      throw error;
    }
  }

  /**
   * Perform initial system assessment
   */
  async performInitialAssessment() {
    console.log(`🔍 Performing initial system assessment...`);
    
    // Get current system state
    await this.updateSystemState();
    
    // Check if we need immediate scaling
    const scalingNeeded = await this.assessScalingNeeds();
    
    if (scalingNeeded.immediate) {
      console.log(`🚨 Immediate scaling required: ${scalingNeeded.reason}`);
      await this.performEmergencyScaling(scalingNeeded);
    }
    
    // Check queue health
    const queueHealth = await this.assessQueueHealth();
    
    if (queueHealth.issues.length > 0) {
      console.log(`⚠️  Queue health issues detected:`, queueHealth.issues);
      await this.addressQueueIssues(queueHealth.issues);
    }
    
    console.log(`✅ Initial system assessment complete`);
  }

  /**
   * Start system monitoring
   */
  startSystemMonitoring() {
    setInterval(async () => {
      try {
        await this.performSystemMonitoring();
      } catch (error) {
        console.error(`❌ System monitoring error: ${error.message}`);
      }
    }, this.config.monitoringInterval);
  }

  /**
   * Perform comprehensive system monitoring
   */
  async performSystemMonitoring() {
    console.log(`📊 Performing system monitoring...`);
    
    // Update system state
    await this.updateSystemState();
    
    // Check for scaling opportunities
    await this.checkScalingOpportunities();
    
    // Monitor agent efficiency
    await this.monitorAgentEfficiency();
    
    // Check for stuck tasks
    await this.checkForStuckTasks();
    
    // Update performance metrics
    await this.updatePerformanceMetrics();
    
    // Log system status
    await this.logSystemStatus();
  }

  /**
   * Update system state
   */
  async updateSystemState() {
    // Get queue statistics
    const queueStats = await this.getQueueStatistics();
    
    // Get agent statistics
    const agentStats = await this.getAgentStatistics();
    
    // Calculate system metrics
    this.systemState = {
      totalAgents: agentStats.total,
      activeAgents: agentStats.active,
      totalTasks: queueStats.total,
      processingTasks: queueStats.processing,
      failedTasks: queueStats.failed,
      averageWaitTime: queueStats.averageWaitTime,
      systemUtilization: this.calculateSystemUtilization(queueStats, agentStats),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStatistics() {
    const queueNames = [
      'queue:claude-3-opus',
      'queue:gpt-4o',
      'queue:deepseek-coder',
      'queue:command-r-plus',
      'queue:gemini-pro'
    ];
    
    let totalTasks = 0;
    let processingTasks = 0;
    let queueDetails = {};
    
    for (const queueName of queueNames) {
      const pending = await this.redis.llen(queueName);
      const processing = await this.redis.llen(`processing:${queueName.replace('queue:', '')}`);
      
      totalTasks += pending;
      processingTasks += processing;
      
      queueDetails[queueName] = {
        pending: pending,
        processing: processing,
        total: pending + processing
      };
    }
    
    const failedTasks = await this.redis.llen('queue:failures');
    
    return {
      total: totalTasks,
      processing: processingTasks,
      failed: failedTasks,
      details: queueDetails,
      averageWaitTime: this.calculateAverageWaitTime(queueDetails)
    };
  }

  /**
   * Get agent statistics
   */
  async getAgentStatistics() {
    const agents = await this.redis.hgetall('agents');
    
    let totalAgents = 0;
    let activeAgents = 0;
    let agentDetails = {};
    
    for (const [agentId, agentData] of Object.entries(agents)) {
      try {
        const agent = JSON.parse(agentData);
        totalAgents++;
        
        if (this.isAgentActive(agent)) {
          activeAgents++;
        }
        
        agentDetails[agentId] = {
          type: agent.type,
          status: agent.status,
          last_heartbeat: agent.last_heartbeat,
          active: this.isAgentActive(agent)
        };
      } catch (error) {
        console.error(`Error parsing agent ${agentId}:`, error);
      }
    }
    
    return {
      total: totalAgents,
      active: activeAgents,
      details: agentDetails
    };
  }

  /**
   * Check for scaling opportunities
   */
  async checkScalingOpportunities() {
    const scalingNeeds = await this.assessScalingNeeds();
    
    if (scalingNeeds.immediate) {
      console.log(`🚨 Immediate scaling needed: ${scalingNeeds.reason}`);
      await this.performEmergencyScaling(scalingNeeds);
    } else if (scalingNeeds.recommended) {
      console.log(`💡 Scaling recommended: ${scalingNeeds.reason}`);
      await this.performOptimalScaling(scalingNeeds);
    }
  }

  /**
   * Assess scaling needs
   */
  async assessScalingNeeds() {
    const utilization = this.systemState.systemUtilization;
    const totalTasks = this.systemState.totalTasks;
    const activeAgents = this.systemState.activeAgents;
    
    // Emergency scaling conditions
    if (totalTasks > this.config.emergencyScalingThreshold) {
      return {
        immediate: true,
        reason: `Emergency: ${totalTasks} tasks exceed threshold of ${this.config.emergencyScalingThreshold}`,
        action: 'scale_up_emergency',
        targetAgents: Math.ceil(totalTasks / 10)
      };
    }
    
    if (activeAgents === 0 && totalTasks > 0) {
      return {
        immediate: true,
        reason: `Emergency: No active agents but ${totalTasks} tasks pending`,
        action: 'scale_up_emergency',
        targetAgents: Math.min(5, Math.ceil(totalTasks / 5))
      };
    }
    
    // Recommended scaling conditions
    if (utilization > 0.9) {
      return {
        recommended: true,
        reason: `High utilization: ${(utilization * 100).toFixed(1)}%`,
        action: 'scale_up',
        targetAgents: activeAgents + Math.ceil(activeAgents * 0.5)
      };
    }
    
    if (utilization < 0.3 && activeAgents > 1) {
      return {
        recommended: true,
        reason: `Low utilization: ${(utilization * 100).toFixed(1)}%`,
        action: 'scale_down',
        targetAgents: Math.max(1, activeAgents - 1)
      };
    }
    
    return { immediate: false, recommended: false };
  }

  /**
   * Perform emergency scaling
   */
  async performEmergencyScaling(scalingNeeds) {
    console.log(`🚨 Performing emergency scaling: ${scalingNeeds.action}`);
    
    try {
      // Trigger auto-scaler emergency mode
      await this.redis.publish('emergency_scaling', JSON.stringify({
        type: 'emergency',
        action: scalingNeeds.action,
        target_agents: scalingNeeds.targetAgents,
        reason: scalingNeeds.reason,
        timestamp: new Date().toISOString()
      }));
      
      // Direct scaling action
      if (scalingNeeds.action === 'scale_up_emergency') {
        await this.spawnEmergencyAgents(scalingNeeds.targetAgents);
      }
      
      this.performanceMetrics.scalingActions++;
      
    } catch (error) {
      console.error(`❌ Emergency scaling failed: ${error.message}`);
    }
  }

  /**
   * Spawn emergency agents
   */
  async spawnEmergencyAgents(targetAgents) {
    console.log(`🚨 Spawning ${targetAgents} emergency agents...`);
    
    // Determine which agent types to spawn based on queue distribution
    const queueStats = await this.getQueueStatistics();
    const agentPriorities = this.calculateAgentPriorities(queueStats);
    
    let agentsSpawned = 0;
    
    for (const [agentType, priority] of agentPriorities) {
      if (agentsSpawned >= targetAgents) break;
      
      const agentsToSpawn = Math.min(
        targetAgents - agentsSpawned,
        Math.ceil(targetAgents * priority)
      );
      
      for (let i = 0; i < agentsToSpawn; i++) {
        try {
          await this.spawnSingleAgent(agentType);
          agentsSpawned++;
          
          // Brief delay between spawns
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Error spawning ${agentType} agent:`, error);
        }
      }
    }
    
    console.log(`✅ Spawned ${agentsSpawned} emergency agents`);
  }

  /**
   * Calculate agent priorities based on queue distribution
   */
  calculateAgentPriorities(queueStats) {
    const totalTasks = queueStats.total;
    const priorities = [];
    
    const agentQueues = {
      gpt: 'queue:gpt-4o',
      deepseek: 'queue:deepseek-coder',
      claude: 'queue:claude-3-opus',
      gemini: 'queue:gemini-pro',
      mistral: 'queue:command-r-plus'
    };
    
    for (const [agentType, queueName] of Object.entries(agentQueues)) {
      const queueData = queueStats.details[queueName];
      const priority = totalTasks > 0 ? queueData.total / totalTasks : 0.2;
      
      priorities.push([agentType, priority]);
    }
    
    return priorities.sort((a, b) => b[1] - a[1]);
  }

  /**
   * Spawn single agent
   */
  async spawnSingleAgent(agentType) {
    const { spawn } = require('child_process');
    
    const agentScripts = {
      claude: 'agents/claude/wrapped-index.js',
      gpt: 'agents/gpt/wrapped-index.js',
      deepseek: 'agents/deepseek/wrapped-index.js',
      mistral: 'agents/mistral/wrapped-index.js',
      gemini: 'agents/gemini/wrapped-index.js'
    };
    
    // Fallback scripts if wrapped agents fail
    const fallbackScripts = {
      claude: 'examples/enhanced-claude-agent.js',
      gpt: 'agents/gpt/index.js',
      deepseek: 'agents/deepseek/index.js',
      mistral: 'agents/mistral/index.js',
      gemini: 'agents/gemini/index.js'
    };
    
    let script = agentScripts[agentType];
    if (!script) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }
    
    // Try wrapped agent first, fallback if needed
    const fs = require('fs');
    if (!fs.existsSync(script) && fallbackScripts[agentType]) {
      console.log(`⚠️  Wrapped agent not found, using fallback: ${fallbackScripts[agentType]}`);
      script = fallbackScripts[agentType];
    }
    
    const agentId = `${agentType}_emergency_${Date.now()}`;
    
    const agentProcess = spawn('node', [script], {
      env: {
        ...process.env,
        AGENT_ID: agentId,
        AGENT_TYPE: agentType
      },
      stdio: 'inherit',
      detached: true
    });
    
    agentProcess.unref();
    
    console.log(`✅ Spawned ${agentType} agent: ${agentId} (using ${script})`);
    
    return agentId;
  }

  /**
   * Monitor agent efficiency
   */
  async monitorAgentEfficiency() {
    const agents = await this.redis.hgetall('agents');
    
    for (const [agentId, agentData] of Object.entries(agents)) {
      try {
        const agent = JSON.parse(agentData);
        
        // Check if agent is idle
        if (this.isAgentIdle(agent)) {
          console.log(`😴 Agent ${agentId} is idle`);
          await this.handleIdleAgent(agentId, agent);
        }
        
        // Check agent performance
        const performance = await this.getAgentPerformance(agentId);
        if (performance && performance.success_rate < 0.5) {
          console.log(`⚠️  Agent ${agentId} has low success rate: ${performance.success_rate}`);
          await this.handleLowPerformanceAgent(agentId, performance);
        }
        
      } catch (error) {
        console.error(`Error monitoring agent ${agentId}:`, error);
      }
    }
  }

  /**
   * Handle idle agent
   */
  async handleIdleAgent(agentId, agent) {
    // Check if there's work in other queues
    const queueStats = await this.getQueueStatistics();
    
    for (const [queueName, queueData] of Object.entries(queueStats.details)) {
      if (queueData.pending > 0) {
        console.log(`📋 Suggesting cross-queue work for ${agentId}: ${queueName}`);
        
        // Notify workload balancer
        await this.redis.publish('idle_agent', JSON.stringify({
          agent_id: agentId,
          agent_type: agent.type,
          available_queue: queueName,
          timestamp: new Date().toISOString()
        }));
        
        break;
      }
    }
  }

  /**
   * Handle low performance agent
   */
  async handleLowPerformanceAgent(agentId, performance) {
    // Consider restarting the agent
    console.log(`🔄 Considering restart for low-performance agent: ${agentId}`);
    
    // Log performance issue
    await this.redis.lpush('performance_issues', JSON.stringify({
      agent_id: agentId,
      performance: performance,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Check for stuck tasks
   */
  async checkForStuckTasks() {
    const processingQueues = await this.redis.keys('processing:*');
    
    for (const queueName of processingQueues) {
      const tasks = await this.redis.lrange(queueName, 0, -1);
      
      for (const taskStr of tasks) {
        try {
          const task = JSON.parse(taskStr);
          
          if (this.isTaskStuck(task)) {
            console.log(`🚨 Found stuck task: ${task.file || task.description}`);
            await this.recoverStuckTask(queueName, taskStr, task);
          }
        } catch (error) {
          console.error(`Error checking stuck task:`, error);
        }
      }
    }
  }

  /**
   * Recover stuck task
   */
  async recoverStuckTask(processingQueue, taskStr, task) {
    // Move back to appropriate queue
    const originalQueue = processingQueue.replace('processing:', 'queue:');
    
    await this.redis.lrem(processingQueue, 1, taskStr);
    await this.redis.lpush(originalQueue, taskStr);
    
    console.log(`✅ Recovered stuck task to ${originalQueue}`);
  }

  /**
   * Start performance reporting
   */
  startPerformanceReporting() {
    setInterval(async () => {
      try {
        await this.generatePerformanceReport();
      } catch (error) {
        console.error(`❌ Performance reporting error: ${error.message}`);
      }
    }, this.config.reportingInterval);
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport() {
    console.log(`📊 Generating performance report...`);
    
    const report = {
      timestamp: new Date().toISOString(),
      system_state: this.systemState,
      performance_metrics: this.performanceMetrics,
      recommendations: await this.generateRecommendations()
    };
    
    // Save report
    await this.redis.lpush('performance_reports', JSON.stringify(report));
    
    // Keep only last 24 reports (2 hours)
    await this.redis.ltrim('performance_reports', 0, 23);
    
    console.log(`✅ Performance report generated`);
    console.log(`📈 System Utilization: ${(this.systemState.systemUtilization * 100).toFixed(1)}%`);
    console.log(`🤖 Active Agents: ${this.systemState.activeAgents}/${this.systemState.totalAgents}`);
    console.log(`📋 Total Tasks: ${this.systemState.totalTasks} (${this.systemState.processingTasks} processing)`);
  }

  /**
   * Generate recommendations
   */
  async generateRecommendations() {
    const recommendations = [];
    
    // Utilization recommendations
    if (this.systemState.systemUtilization > 0.9) {
      recommendations.push({
        type: 'scaling',
        priority: 'high',
        action: 'Scale up agents to handle high load',
        impact: 'Reduce task wait times'
      });
    }
    
    if (this.systemState.systemUtilization < 0.3) {
      recommendations.push({
        type: 'scaling',
        priority: 'low',
        action: 'Consider scaling down agents',
        impact: 'Optimize resource usage'
      });
    }
    
    // Queue recommendations
    if (this.systemState.failedTasks > 10) {
      recommendations.push({
        type: 'reliability',
        priority: 'medium',
        action: 'Investigate and retry failed tasks',
        impact: 'Improve success rate'
      });
    }
    
    return recommendations;
  }

  /**
   * Start emergency response
   */
  startEmergencyResponse() {
    setInterval(async () => {
      try {
        await this.checkForEmergencies();
      } catch (error) {
        console.error(`❌ Emergency response error: ${error.message}`);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check for emergency conditions
   */
  async checkForEmergencies() {
    // Check for system failures
    if (this.systemState.activeAgents === 0 && this.systemState.totalTasks > 0) {
      console.log(`🚨 EMERGENCY: No active agents with pending tasks`);
      await this.handleEmergencyNoAgents();
    }
    
    // Check for queue overflow
    if (this.systemState.totalTasks > this.config.emergencyScalingThreshold * 2) {
      console.log(`🚨 EMERGENCY: Queue overflow detected`);
      await this.handleEmergencyQueueOverflow();
    }
    
    // Check for high failure rate
    const failureRate = this.systemState.failedTasks / 
                       (this.systemState.totalTasks + this.systemState.failedTasks);
    
    if (failureRate > 0.5) {
      console.log(`🚨 EMERGENCY: High failure rate detected: ${(failureRate * 100).toFixed(1)}%`);
      await this.handleEmergencyHighFailureRate();
    }
  }

  /**
   * Handle emergency: no agents
   */
  async handleEmergencyNoAgents() {
    console.log(`🚨 Handling emergency: spawning immediate agents`);
    
    // Spawn one agent of each type immediately
    const agentTypes = ['gpt', 'deepseek', 'claude'];
    
    for (const agentType of agentTypes) {
      try {
        await this.spawnSingleAgent(agentType);
      } catch (error) {
        console.error(`❌ Emergency agent spawn failed for ${agentType}:`, error);
      }
    }
  }

  /**
   * Handle emergency: queue overflow
   */
  async handleEmergencyQueueOverflow() {
    console.log(`🚨 Handling emergency: queue overflow`);
    
    // Spawn maximum agents
    await this.spawnEmergencyAgents(10);
    
    // Trigger emergency load balancing
    await this.redis.publish('emergency_balancing', JSON.stringify({
      type: 'queue_overflow',
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Handle emergency: high failure rate
   */
  async handleEmergencyHighFailureRate() {
    console.log(`🚨 Handling emergency: high failure rate`);
    
    // Clear failed tasks and retry
    const failedTasks = await this.redis.lrange('queue:failures', 0, -1);
    
    for (const taskStr of failedTasks) {
      try {
        const task = JSON.parse(taskStr);
        
        // Reset task and try again
        delete task.error;
        delete task.failed_at;
        task.retry = true;
        
        // Send to appropriate queue
        const agentType = this.determineAgentType(task);
        const queue = this.getQueueFromAgentType(agentType);
        
        await this.redis.lpush(queue, JSON.stringify(task));
      } catch (error) {
        console.error(`Error retrying failed task:`, error);
      }
    }
    
    // Clear failure queue
    await this.redis.del('queue:failures');
  }

  /**
   * Utility methods
   */
  calculateSystemUtilization(queueStats, agentStats) {
    if (agentStats.active === 0) return 0;
    
    const totalCapacity = agentStats.active * this.config.targetUtilization;
    const currentLoad = queueStats.processing / totalCapacity;
    
    return Math.min(currentLoad, 1.0);
  }

  calculateAverageWaitTime(queueDetails) {
    // Simple estimation based on queue depth
    const totalPending = Object.values(queueDetails).reduce((sum, q) => sum + q.pending, 0);
    return totalPending * 30; // Assume 30 seconds per task
  }

  isAgentActive(agent) {
    if (!agent.last_heartbeat) return false;
    
    const lastHeartbeat = new Date(agent.last_heartbeat);
    const now = new Date();
    
    return (now - lastHeartbeat) < 120000; // 2 minutes
  }

  isAgentIdle(agent) {
    if (!this.isAgentActive(agent)) return false;
    
    // Additional idle checks can be added here
    return false;
  }

  isTaskStuck(task) {
    if (!task.timestamp) return false;
    
    const taskTime = new Date(task.timestamp);
    const now = new Date();
    
    return (now - taskTime) > 300000; // 5 minutes
  }

  async getAgentPerformance(agentId) {
    const stats = await this.redis.hgetall(`agent_stats:${agentId}`);
    
    if (!stats.tasks_completed) return null;
    
    const completed = parseInt(stats.tasks_completed) || 0;
    const failed = parseInt(stats.tasks_failed) || 0;
    
    return {
      tasks_completed: completed,
      tasks_failed: failed,
      success_rate: completed / (completed + failed + 1)
    };
  }

  determineAgentType(task) {
    const prompt = task.prompt || task.description || '';
    
    if (prompt.includes('test')) return 'deepseek';
    if (prompt.includes('document')) return 'mistral';
    if (prompt.includes('analyze')) return 'gemini';
    if (prompt.includes('architect')) return 'claude';
    
    return 'gpt'; // Default
  }

  getQueueFromAgentType(agentType) {
    const mapping = {
      claude: 'queue:claude-3-opus',
      gpt: 'queue:gpt-4o',
      deepseek: 'queue:deepseek-coder',
      mistral: 'queue:command-r-plus',
      gemini: 'queue:gemini-pro'
    };
    
    return mapping[agentType] || 'queue:gpt-4o';
  }

  async updatePerformanceMetrics() {
    // Calculate tasks per minute
    const recentTasks = await this.redis.lrange('task_completion_log', 0, 59);
    this.performanceMetrics.tasksPerMinute = recentTasks.length;
    
    // Calculate success rate
    const totalCompleted = this.systemState.totalTasks - this.systemState.failedTasks;
    const total = this.systemState.totalTasks + this.systemState.failedTasks;
    this.performanceMetrics.successRate = total > 0 ? totalCompleted / total : 1.0;
  }

  async logSystemStatus() {
    await this.redis.lpush('system_status_log', JSON.stringify({
      timestamp: new Date().toISOString(),
      system_state: this.systemState,
      performance_metrics: this.performanceMetrics
    }));
    
    // Keep only last 100 entries
    await this.redis.ltrim('system_status_log', 0, 99);
  }

  async registerController() {
    await this.redis.hset('master_controller', this.controllerId, JSON.stringify({
      controller_id: this.controllerId,
      started_at: new Date().toISOString(),
      config: this.config,
      status: 'active'
    }));
  }

  async showSystemStatus() {
    console.log(`\n🎛️  === Master Agent Controller Status ===`);
    console.log(`📊 System Utilization: ${(this.systemState.systemUtilization * 100).toFixed(1)}%`);
    console.log(`🤖 Active Agents: ${this.systemState.activeAgents}/${this.systemState.totalAgents}`);
    console.log(`📋 Total Tasks: ${this.systemState.totalTasks} (${this.systemState.processingTasks} processing)`);
    console.log(`❌ Failed Tasks: ${this.systemState.failedTasks}`);
    console.log(`⏱️  Average Wait Time: ${Math.round(this.systemState.averageWaitTime)}s`);
    console.log(`📈 Tasks/Min: ${this.performanceMetrics.tasksPerMinute}`);
    console.log(`✅ Success Rate: ${(this.performanceMetrics.successRate * 100).toFixed(1)}%`);
    console.log(`========================================\n`);
  }

  /**
   * Shutdown controller
   */
  async shutdown() {
    console.log(`🛑 Shutting down Master Agent Controller...`);
    
    // Shutdown subsystems
    await this.workloadBalancer.shutdown();
    
    // Unregister controller
    await this.redis.hdel('master_controller', this.controllerId);
    
    console.log(`✅ Master Agent Controller shutdown complete`);
  }
}

// Run the master controller if this file is executed directly
if (require.main === module) {
  const controller = new MasterAgentController();
  
  // Start the controller
  controller.start().catch(error => {
    console.error('Failed to start Master Agent Controller:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down Master Agent Controller...');
    await controller.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down Master Agent Controller...');
    await controller.shutdown();
    process.exit(0);
  });
}

module.exports = MasterAgentController;