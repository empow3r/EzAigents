const Redis = require('ioredis');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * Agent Auto-Scaler
 * 
 * Automatically scales agents up/down based on queue depth and workload.
 * Keeps all agents busy by:
 * - Monitoring queue depths across all agent types
 * - Spawning additional agents when queues are full
 * - Distributing tasks across available agents
 * - Balancing workload based on agent capabilities
 */
class AgentAutoScaler {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.scalerId = `scaler_${Date.now()}`;
    
    // Scaling configuration
    this.config = {
      minAgents: parseInt(process.env.MIN_AGENTS) || 1,
      maxAgents: parseInt(process.env.MAX_AGENTS) || 10,
      scaleUpThreshold: parseInt(process.env.SCALE_UP_THRESHOLD) || 5,
      scaleDownThreshold: parseInt(process.env.SCALE_DOWN_THRESHOLD) || 2,
      scalingInterval: parseInt(process.env.SCALING_INTERVAL) || 30000, // 30 seconds
      cooldownPeriod: parseInt(process.env.COOLDOWN_PERIOD) || 300000, // 5 minutes
      taskProcessingTimeout: parseInt(process.env.TASK_PROCESSING_TIMEOUT) || 300000, // 5 minutes
    };
    
    // Agent type configuration - using wrapped agents for coordination
    this.agentTypes = {
      claude: {
        queue: 'queue:claude-3-opus',
        processing: 'processing:claude-3-opus',
        script: 'agents/claude/wrapped-index.js',
        fallback_script: 'examples/enhanced-claude-agent.js',
        capabilities: ['architecture', 'refactoring', 'documentation', 'security'],
        maxInstances: 3,
        priority: 1
      },
      gpt: {
        queue: 'queue:gpt-4o',
        processing: 'processing:gpt-4o',
        script: 'agents/gpt/wrapped-index.js',
        fallback_script: 'agents/gpt/index.js',
        capabilities: ['backend-logic', 'api-design', 'implementation'],
        maxInstances: 4,
        priority: 2
      },
      deepseek: {
        queue: 'queue:deepseek-coder',
        processing: 'processing:deepseek-coder',
        script: 'agents/deepseek/wrapped-index.js',
        fallback_script: 'agents/deepseek/index.js',
        capabilities: ['testing', 'validation', 'optimization'],
        maxInstances: 5,
        priority: 3
      },
      mistral: {
        queue: 'queue:command-r-plus',
        processing: 'processing:command-r-plus',
        script: 'agents/mistral/wrapped-index.js',
        fallback_script: 'agents/mistral/index.js',
        capabilities: ['documentation', 'analysis'],
        maxInstances: 2,
        priority: 4
      },
      gemini: {
        queue: 'queue:gemini-pro',
        processing: 'processing:gemini-pro',
        script: 'agents/gemini/wrapped-index.js',
        fallback_script: 'agents/gemini/index.js',
        capabilities: ['analysis', 'optimization', 'performance'],
        maxInstances: 3,
        priority: 5
      }
    };
    
    // Active agents tracking
    this.activeAgents = new Map();
    this.lastScaleAction = 0;
    this.isScaling = false;
    this.scalingStats = {
      scale_ups: 0,
      scale_downs: 0,
      agents_spawned: 0,
      agents_terminated: 0,
      start_time: new Date().toISOString()
    };
    
    console.log(`🔄 Agent Auto-Scaler initialized with config:`, this.config);
  }

  /**
   * Start the auto-scaler
   */
  async start() {
    console.log(`🚀 Starting Agent Auto-Scaler...`);
    
    // Register scaler
    await this.registerScaler();
    
    // Start monitoring and scaling
    this.startScalingLoop();
    this.startHealthMonitoring();
    this.startWorkloadDistribution();
    this.startStuckTaskRecovery();
    
    // Start minimum agents
    await this.ensureMinimumAgents();
    
    console.log(`✅ Agent Auto-Scaler started successfully`);
  }

  /**
   * Main scaling loop
   */
  startScalingLoop() {
    setInterval(async () => {
      if (this.isScaling) {
        console.log(`⏳ Scaling already in progress, skipping...`);
        return;
      }
      
      try {
        await this.performScalingAnalysis();
      } catch (error) {
        console.error(`❌ Scaling analysis error: ${error.message}`);
      }
    }, this.config.scalingInterval);
  }

  /**
   * Perform comprehensive scaling analysis
   */
  async performScalingAnalysis() {
    console.log(`📊 Performing scaling analysis...`);
    
    // Get current system state
    const systemState = await this.getSystemState();
    
    // Analyze workload
    const workloadAnalysis = await this.analyzeWorkload(systemState);
    
    // Make scaling decisions
    const scalingDecisions = await this.makeScalingDecisions(workloadAnalysis);
    
    // Execute scaling actions
    await this.executeScalingActions(scalingDecisions);
    
    // Log scaling activity
    await this.logScalingActivity(workloadAnalysis, scalingDecisions);
  }

  /**
   * Get comprehensive system state
   */
  async getSystemState() {
    const state = {
      queues: {},
      agents: {},
      processing: {},
      failures: 0,
      totalTasks: 0,
      totalActiveAgents: 0
    };
    
    // Get queue depths
    for (const [agentType, config] of Object.entries(this.agentTypes)) {
      const queueDepth = await this.redis.llen(config.queue);
      const processingDepth = await this.redis.llen(config.processing);
      
      state.queues[agentType] = {
        pending: queueDepth,
        processing: processingDepth,
        total: queueDepth + processingDepth
      };
      
      state.totalTasks += queueDepth + processingDepth;
    }
    
    // Get failure count
    state.failures = await this.redis.llen('queue:failures');
    
    // Get active agents
    const activeAgents = await this.redis.hgetall('agents');
    for (const [agentId, agentData] of Object.entries(activeAgents)) {
      try {
        const agent = JSON.parse(agentData);
        const agentType = agent.type;
        
        if (!state.agents[agentType]) {
          state.agents[agentType] = [];
        }
        
        state.agents[agentType].push({
          id: agentId,
          status: agent.status,
          last_heartbeat: agent.last_heartbeat,
          capabilities: agent.capabilities
        });
        
        state.totalActiveAgents++;
      } catch (error) {
        console.error(`Error parsing agent data for ${agentId}:`, error);
      }
    }
    
    return state;
  }

  /**
   * Analyze workload and determine scaling needs
   */
  async analyzeWorkload(systemState) {
    const analysis = {
      overloaded: [],
      underutilized: [],
      healthy: [],
      critical: [],
      recommendations: []
    };
    
    for (const [agentType, config] of Object.entries(this.agentTypes)) {
      const queueState = systemState.queues[agentType];
      const activeAgents = systemState.agents[agentType] || [];
      const healthyAgents = activeAgents.filter(a => this.isAgentHealthy(a));
      
      const workloadData = {
        agent_type: agentType,
        queue_depth: queueState.pending,
        processing_depth: queueState.processing,
        total_tasks: queueState.total,
        active_agents: activeAgents.length,
        healthy_agents: healthyAgents.length,
        max_instances: config.maxInstances,
        priority: config.priority,
        tasks_per_agent: healthyAgents.length > 0 ? queueState.total / healthyAgents.length : queueState.total
      };
      
      // Determine workload status
      if (workloadData.queue_depth > this.config.scaleUpThreshold && 
          workloadData.healthy_agents < config.maxInstances) {
        analysis.overloaded.push(workloadData);
      } else if (workloadData.queue_depth < this.config.scaleDownThreshold && 
                 workloadData.healthy_agents > this.config.minAgents) {
        analysis.underutilized.push(workloadData);
      } else {
        analysis.healthy.push(workloadData);
      }
      
      // Check for critical situations
      if (workloadData.queue_depth > (this.config.scaleUpThreshold * 2) ||
          workloadData.healthy_agents === 0) {
        analysis.critical.push(workloadData);
      }
    }
    
    // Generate recommendations
    analysis.recommendations = this.generateScalingRecommendations(analysis);
    
    return analysis;
  }

  /**
   * Generate scaling recommendations
   */
  generateScalingRecommendations(analysis) {
    const recommendations = [];
    
    // Critical situations - immediate action
    for (const critical of analysis.critical) {
      recommendations.push({
        action: 'scale_up',
        agent_type: critical.agent_type,
        target_instances: Math.min(critical.max_instances, critical.healthy_agents + 2),
        reason: 'Critical workload - immediate scaling needed',
        priority: 'critical',
        urgency: 'immediate'
      });
    }
    
    // Overloaded agents - scale up
    for (const overloaded of analysis.overloaded) {
      const additionalAgents = Math.ceil(overloaded.queue_depth / this.config.scaleUpThreshold);
      const targetInstances = Math.min(
        overloaded.max_instances,
        overloaded.healthy_agents + additionalAgents
      );
      
      recommendations.push({
        action: 'scale_up',
        agent_type: overloaded.agent_type,
        target_instances: targetInstances,
        reason: `Queue depth ${overloaded.queue_depth} exceeds threshold`,
        priority: 'high',
        urgency: 'normal'
      });
    }
    
    // Underutilized agents - scale down (with caution)
    for (const underutilized of analysis.underutilized) {
      if (underutilized.healthy_agents > this.config.minAgents) {
        recommendations.push({
          action: 'scale_down',
          agent_type: underutilized.agent_type,
          target_instances: Math.max(this.config.minAgents, underutilized.healthy_agents - 1),
          reason: `Low queue depth ${underutilized.queue_depth}, can reduce agents`,
          priority: 'low',
          urgency: 'delayed'
        });
      }
    }
    
    // Cross-agent load balancing
    const totalTasks = analysis.overloaded.reduce((sum, a) => sum + a.total_tasks, 0) +
                      analysis.healthy.reduce((sum, a) => sum + a.total_tasks, 0);
    
    if (totalTasks > 0) {
      recommendations.push({
        action: 'load_balance',
        reason: 'Distribute tasks across available agents',
        priority: 'medium',
        urgency: 'normal'
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
  }

  /**
   * Make scaling decisions based on analysis
   */
  async makeScalingDecisions(workloadAnalysis) {
    const decisions = [];
    
    // Check cooldown period
    const now = Date.now();
    const timeSinceLastScale = now - this.lastScaleAction;
    
    if (timeSinceLastScale < this.config.cooldownPeriod) {
      console.log(`❄️  Scaling cooldown active (${Math.round((this.config.cooldownPeriod - timeSinceLastScale) / 1000)}s remaining)`);
      return decisions;
    }
    
    // Process recommendations
    for (const recommendation of workloadAnalysis.recommendations) {
      if (recommendation.urgency === 'immediate' || 
          (recommendation.urgency === 'normal' && recommendation.priority !== 'low')) {
        
        decisions.push({
          action: recommendation.action,
          agent_type: recommendation.agent_type,
          target_instances: recommendation.target_instances,
          reason: recommendation.reason,
          priority: recommendation.priority
        });
      }
    }
    
    return decisions;
  }

  /**
   * Execute scaling actions
   */
  async executeScalingActions(decisions) {
    if (decisions.length === 0) {
      return;
    }
    
    console.log(`⚡ Executing ${decisions.length} scaling actions...`);
    this.isScaling = true;
    
    try {
      for (const decision of decisions) {
        await this.executeScalingAction(decision);
      }
      
      this.lastScaleAction = Date.now();
      
    } catch (error) {
      console.error(`❌ Error executing scaling actions: ${error.message}`);
    } finally {
      this.isScaling = false;
    }
  }

  /**
   * Execute individual scaling action
   */
  async executeScalingAction(decision) {
    console.log(`🔄 Executing: ${decision.action} for ${decision.agent_type} (${decision.reason})`);
    
    switch (decision.action) {
      case 'scale_up':
        await this.scaleUpAgent(decision.agent_type, decision.target_instances);
        break;
        
      case 'scale_down':
        await this.scaleDownAgent(decision.agent_type, decision.target_instances);
        break;
        
      case 'load_balance':
        await this.performLoadBalancing();
        break;
        
      default:
        console.log(`⚠️  Unknown scaling action: ${decision.action}`);
    }
  }

  /**
   * Scale up agents
   */
  async scaleUpAgent(agentType, targetInstances) {
    const config = this.agentTypes[agentType];
    const currentAgents = await this.getActiveAgentsByType(agentType);
    const currentCount = currentAgents.length;
    
    if (currentCount >= targetInstances) {
      console.log(`✅ ${agentType} already has ${currentCount} agents (target: ${targetInstances})`);
      return;
    }
    
    const agentsToSpawn = targetInstances - currentCount;
    console.log(`📈 Scaling up ${agentType}: ${currentCount} → ${targetInstances} (+${agentsToSpawn})`);
    
    for (let i = 0; i < agentsToSpawn; i++) {
      try {
        const agentId = await this.spawnAgent(agentType);
        console.log(`✅ Spawned ${agentType} agent: ${agentId}`);
        this.scalingStats.agents_spawned++;
        
        // Brief delay between spawns
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Error spawning ${agentType} agent: ${error.message}`);
      }
    }
    
    this.scalingStats.scale_ups++;
  }

  /**
   * Scale down agents
   */
  async scaleDownAgent(agentType, targetInstances) {
    const currentAgents = await this.getActiveAgentsByType(agentType);
    const currentCount = currentAgents.length;
    
    if (currentCount <= targetInstances) {
      console.log(`✅ ${agentType} already has ${currentCount} agents (target: ${targetInstances})`);
      return;
    }
    
    const agentsToRemove = currentCount - targetInstances;
    console.log(`📉 Scaling down ${agentType}: ${currentCount} → ${targetInstances} (-${agentsToRemove})`);
    
    // Select agents to terminate (prefer older, less active ones)
    const agentsToTerminate = this.selectAgentsForTermination(currentAgents, agentsToRemove);
    
    for (const agent of agentsToTerminate) {
      try {
        await this.terminateAgent(agent.id);
        console.log(`✅ Terminated ${agentType} agent: ${agent.id}`);
        this.scalingStats.agents_terminated++;
      } catch (error) {
        console.error(`❌ Error terminating ${agentType} agent: ${error.message}`);
      }
    }
    
    this.scalingStats.scale_downs++;
  }

  /**
   * Spawn new agent
   */
  async spawnAgent(agentType) {
    const config = this.agentTypes[agentType];
    const agentId = `${agentType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set environment variables for the agent
    const env = {
      ...process.env,
      AGENT_ID: agentId,
      AGENT_TYPE: agentType,
      AGENT_CAPABILITIES: config.capabilities.join(',')
    };
    
    // Try wrapped agent first, fallback to original if needed
    let scriptToUse = config.script;
    
    try {
      // Check if wrapped agent script exists
      const fs = require('fs');
      if (!fs.existsSync(config.script) && config.fallback_script) {
        console.log(`⚠️  Wrapped agent not found, using fallback: ${config.fallback_script}`);
        scriptToUse = config.fallback_script;
      }
    } catch (error) {
      console.error(`Error checking agent script: ${error.message}`);
      if (config.fallback_script) {
        scriptToUse = config.fallback_script;
      }
    }
    
    // Spawn the agent process
    const agentProcess = spawn('node', [scriptToUse], {
      env: env,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true
    });
    
    // Store agent reference
    this.activeAgents.set(agentId, {
      process: agentProcess,
      type: agentType,
      script: scriptToUse,
      spawned_at: new Date().toISOString(),
      pid: agentProcess.pid
    });
    
    // Handle process events
    agentProcess.on('exit', (code, signal) => {
      console.log(`🔄 Agent ${agentId} exited with code ${code}, signal ${signal}`);
      this.activeAgents.delete(agentId);
    });
    
    agentProcess.on('error', (error) => {
      console.error(`❌ Agent ${agentId} error:`, error);
      this.activeAgents.delete(agentId);
      
      // Try fallback agent if wrapped agent failed
      if (scriptToUse === config.script && config.fallback_script) {
        console.log(`🔄 Retrying with fallback agent: ${config.fallback_script}`);
        setTimeout(() => {
          this.spawnAgentWithFallback(agentType, config.fallback_script);
        }, 5000);
      }
    });
    
    // Log agent output
    agentProcess.stdout.on('data', (data) => {
      console.log(`[${agentId}] ${data.toString().trim()}`);
    });
    
    agentProcess.stderr.on('data', (data) => {
      console.error(`[${agentId}] ${data.toString().trim()}`);
    });
    
    return agentId;
  }

  /**
   * Spawn agent with fallback script
   */
  async spawnAgentWithFallback(agentType, fallbackScript) {
    const config = this.agentTypes[agentType];
    const agentId = `${agentType}_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const env = {
      ...process.env,
      AGENT_ID: agentId,
      AGENT_TYPE: agentType,
      AGENT_CAPABILITIES: config.capabilities.join(',')
    };
    
    const agentProcess = spawn('node', [fallbackScript], {
      env: env,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true
    });
    
    this.activeAgents.set(agentId, {
      process: agentProcess,
      type: agentType,
      script: fallbackScript,
      spawned_at: new Date().toISOString(),
      pid: agentProcess.pid,
      fallback: true
    });
    
    agentProcess.on('exit', (code, signal) => {
      console.log(`🔄 Fallback agent ${agentId} exited with code ${code}, signal ${signal}`);
      this.activeAgents.delete(agentId);
    });
    
    agentProcess.on('error', (error) => {
      console.error(`❌ Fallback agent ${agentId} error:`, error);
      this.activeAgents.delete(agentId);
    });
    
    console.log(`✅ Fallback agent spawned: ${agentId}`);
    return agentId;
  }

  /**
   * Terminate agent
   */
  async terminateAgent(agentId) {
    const agent = this.activeAgents.get(agentId);
    
    if (!agent) {
      console.log(`⚠️  Agent ${agentId} not found in active agents`);
      return;
    }
    
    try {
      // Send graceful shutdown signal
      agent.process.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          // Force kill if graceful shutdown fails
          agent.process.kill('SIGKILL');
          reject(new Error('Agent did not shutdown gracefully'));
        }, 10000);
        
        agent.process.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
    } catch (error) {
      console.error(`❌ Error terminating agent ${agentId}:`, error.message);
      
      // Force kill as last resort
      try {
        agent.process.kill('SIGKILL');
      } catch (killError) {
        console.error(`❌ Error force killing agent ${agentId}:`, killError.message);
      }
    }
    
    this.activeAgents.delete(agentId);
  }

  /**
   * Perform load balancing
   */
  async performLoadBalancing() {
    console.log(`⚖️  Performing load balancing...`);
    
    // Get all tasks from all queues
    const allTasks = [];
    
    for (const [agentType, config] of Object.entries(this.agentTypes)) {
      const tasks = await this.redis.lrange(config.queue, 0, -1);
      for (const task of tasks) {
        try {
          allTasks.push({
            task: JSON.parse(task),
            originalQueue: config.queue,
            agentType: agentType
          });
        } catch (error) {
          console.error(`Error parsing task from ${config.queue}:`, error);
        }
      }
    }
    
    // Redistribute tasks based on agent availability and capabilities
    const redistributedTasks = await this.redistributeTasks(allTasks);
    
    // Apply redistribution
    for (const redistribution of redistributedTasks) {
      await this.moveTaskToQueue(redistribution.task, redistribution.fromQueue, redistribution.toQueue);
    }
    
    console.log(`✅ Load balancing completed: ${redistributedTasks.length} tasks redistributed`);
  }

  /**
   * Redistribute tasks across queues
   */
  async redistributeTasks(allTasks) {
    const redistributions = [];
    
    // Simple redistribution logic - move tasks from overloaded to underutilized queues
    for (const taskData of allTasks) {
      const currentAgents = await this.getActiveAgentsByType(taskData.agentType);
      const currentQueueDepth = await this.redis.llen(taskData.originalQueue);
      
      if (currentQueueDepth > this.config.scaleUpThreshold && currentAgents.length < 2) {
        // Find alternative agent that can handle this task
        const alternativeAgent = await this.findAlternativeAgent(taskData.task);
        
        if (alternativeAgent) {
          redistributions.push({
            task: taskData.task,
            fromQueue: taskData.originalQueue,
            toQueue: this.agentTypes[alternativeAgent].queue,
            reason: `Redistribute from overloaded ${taskData.agentType} to available ${alternativeAgent}`
          });
        }
      }
    }
    
    return redistributions;
  }

  /**
   * Find alternative agent for task
   */
  async findAlternativeAgent(task) {
    const taskPrompt = task.prompt || task.description || '';
    
    // Simple capability matching
    if (taskPrompt.includes('test') || taskPrompt.includes('validation')) {
      return 'deepseek';
    } else if (taskPrompt.includes('document') || taskPrompt.includes('explain')) {
      return 'mistral';
    } else if (taskPrompt.includes('optimize') || taskPrompt.includes('performance')) {
      return 'gemini';
    } else if (taskPrompt.includes('api') || taskPrompt.includes('backend')) {
      return 'gpt';
    }
    
    return null;
  }

  /**
   * Move task between queues
   */
  async moveTaskToQueue(task, fromQueue, toQueue) {
    try {
      // Remove from original queue
      await this.redis.lrem(fromQueue, 1, JSON.stringify(task));
      
      // Add to new queue
      await this.redis.lpush(toQueue, JSON.stringify(task));
      
      console.log(`📦 Moved task from ${fromQueue} to ${toQueue}`);
    } catch (error) {
      console.error(`❌ Error moving task: ${error.message}`);
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error(`❌ Health monitoring error: ${error.message}`);
      }
    }, 60000); // Check every minute
  }

  /**
   * Perform health check on all agents
   */
  async performHealthCheck() {
    const activeAgents = await this.redis.hgetall('agents');
    const unhealthyAgents = [];
    
    for (const [agentId, agentData] of Object.entries(activeAgents)) {
      try {
        const agent = JSON.parse(agentData);
        
        if (!this.isAgentHealthy(agent)) {
          unhealthyAgents.push({ id: agentId, ...agent });
        }
      } catch (error) {
        unhealthyAgents.push({ id: agentId, error: 'Invalid agent data' });
      }
    }
    
    // Handle unhealthy agents
    for (const agent of unhealthyAgents) {
      await this.handleUnhealthyAgent(agent);
    }
  }

  /**
   * Check if agent is healthy
   */
  isAgentHealthy(agent) {
    if (!agent.last_heartbeat) return false;
    
    const lastHeartbeat = new Date(agent.last_heartbeat);
    const now = new Date();
    const timeSinceHeartbeat = now - lastHeartbeat;
    
    // Consider agent unhealthy if no heartbeat for 2 minutes
    return timeSinceHeartbeat < 120000;
  }

  /**
   * Handle unhealthy agent
   */
  async handleUnhealthyAgent(agent) {
    console.log(`🏥 Handling unhealthy agent: ${agent.id}`);
    
    // Remove from Redis
    await this.redis.hdel('agents', agent.id);
    
    // Terminate if we're managing it
    if (this.activeAgents.has(agent.id)) {
      await this.terminateAgent(agent.id);
    }
    
    // Consider replacement if needed
    if (agent.type && this.agentTypes[agent.type]) {
      const currentAgents = await this.getActiveAgentsByType(agent.type);
      if (currentAgents.length < this.config.minAgents) {
        console.log(`🔄 Replacing unhealthy ${agent.type} agent`);
        await this.spawnAgent(agent.type);
      }
    }
  }

  /**
   * Start stuck task recovery
   */
  startStuckTaskRecovery() {
    setInterval(async () => {
      try {
        await this.recoverStuckTasks();
      } catch (error) {
        console.error(`❌ Stuck task recovery error: ${error.message}`);
      }
    }, 300000); // Check every 5 minutes
  }

  /**
   * Recover stuck tasks
   */
  async recoverStuckTasks() {
    console.log(`🔄 Checking for stuck tasks...`);
    
    for (const [agentType, config] of Object.entries(this.agentTypes)) {
      const processingTasks = await this.redis.lrange(config.processing, 0, -1);
      
      for (const taskStr of processingTasks) {
        try {
          const task = JSON.parse(taskStr);
          
          // Check if task has been processing too long
          if (this.isTaskStuck(task)) {
            console.log(`🚨 Found stuck task: ${task.file || task.description}`);
            
            // Move back to queue
            await this.redis.lrem(config.processing, 1, taskStr);
            await this.redis.lpush(config.queue, taskStr);
            
            console.log(`✅ Recovered stuck task to queue`);
          }
        } catch (error) {
          console.error(`Error processing stuck task:`, error);
        }
      }
    }
  }

  /**
   * Check if task is stuck
   */
  isTaskStuck(task) {
    if (!task.timestamp) return false;
    
    const taskTime = new Date(task.timestamp);
    const now = new Date();
    const processingTime = now - taskTime;
    
    return processingTime > this.config.taskProcessingTimeout;
  }

  /**
   * Ensure minimum agents are running
   */
  async ensureMinimumAgents() {
    console.log(`🔄 Ensuring minimum agents are running...`);
    
    for (const [agentType, config] of Object.entries(this.agentTypes)) {
      const currentAgents = await this.getActiveAgentsByType(agentType);
      const currentCount = currentAgents.length;
      
      if (currentCount < this.config.minAgents) {
        const agentsToSpawn = this.config.minAgents - currentCount;
        console.log(`📈 Starting ${agentsToSpawn} ${agentType} agents to reach minimum`);
        
        for (let i = 0; i < agentsToSpawn; i++) {
          try {
            const agentId = await this.spawnAgent(agentType);
            console.log(`✅ Started minimum ${agentType} agent: ${agentId}`);
            
            // Brief delay between spawns
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (error) {
            console.error(`❌ Error starting minimum ${agentType} agent:`, error);
          }
        }
      }
    }
  }

  /**
   * Start workload distribution
   */
  startWorkloadDistribution() {
    setInterval(async () => {
      try {
        await this.distributeWorkload();
      } catch (error) {
        console.error(`❌ Workload distribution error: ${error.message}`);
      }
    }, 45000); // Every 45 seconds
  }

  /**
   * Distribute workload across agents
   */
  async distributeWorkload() {
    const systemState = await this.getSystemState();
    
    // Find idle agents
    const idleAgents = [];
    for (const [agentType, agents] of Object.entries(systemState.agents)) {
      for (const agent of agents) {
        if (this.isAgentIdle(agent)) {
          idleAgents.push({ type: agentType, agent: agent });
        }
      }
    }
    
    // Find available work
    const availableWork = [];
    for (const [agentType, queueState] of Object.entries(systemState.queues)) {
      if (queueState.pending > 0) {
        availableWork.push({ type: agentType, tasks: queueState.pending });
      }
    }
    
    // Distribute work to idle agents
    for (const idleAgent of idleAgents) {
      const suitableWork = availableWork.find(work => 
        work.type === idleAgent.type || this.canAgentHandleWork(idleAgent.type, work.type)
      );
      
      if (suitableWork) {
        console.log(`📬 Idle ${idleAgent.type} agent can handle ${suitableWork.type} work`);
        // Work will be naturally picked up by the agent
      }
    }
  }

  /**
   * Check if agent is idle
   */
  isAgentIdle(agent) {
    if (!agent.last_heartbeat) return false;
    
    const lastHeartbeat = new Date(agent.last_heartbeat);
    const now = new Date();
    const timeSinceHeartbeat = now - lastHeartbeat;
    
    // Consider agent idle if heartbeat is recent (active) but not processing
    return timeSinceHeartbeat < 60000; // Within last minute
  }

  /**
   * Check if agent can handle different type of work
   */
  canAgentHandleWork(agentType, workType) {
    const agentCapabilities = this.agentTypes[agentType]?.capabilities || [];
    const workCapabilities = this.agentTypes[workType]?.capabilities || [];
    
    // Check for overlapping capabilities
    return agentCapabilities.some(cap => workCapabilities.includes(cap));
  }

  /**
   * Helper methods
   */
  async getActiveAgentsByType(agentType) {
    const activeAgents = await this.redis.hgetall('agents');
    const agentsOfType = [];
    
    for (const [agentId, agentData] of Object.entries(activeAgents)) {
      try {
        const agent = JSON.parse(agentData);
        if (agent.type === agentType) {
          agentsOfType.push({ id: agentId, ...agent });
        }
      } catch (error) {
        console.error(`Error parsing agent data for ${agentId}:`, error);
      }
    }
    
    return agentsOfType;
  }

  selectAgentsForTermination(agents, count) {
    // Select oldest agents first
    return agents
      .sort((a, b) => new Date(a.registered_at) - new Date(b.registered_at))
      .slice(0, count);
  }

  async registerScaler() {
    await this.redis.hset('scaler', this.scalerId, JSON.stringify({
      scaler_id: this.scalerId,
      started_at: new Date().toISOString(),
      config: this.config,
      status: 'active'
    }));
  }

  async logScalingActivity(workloadAnalysis, decisions) {
    await this.redis.lpush('scaling_activity_log', JSON.stringify({
      scaler_id: this.scalerId,
      workload_analysis: workloadAnalysis,
      decisions: decisions,
      stats: this.scalingStats,
      timestamp: new Date().toISOString()
    }));
    
    // Keep only last 100 entries
    await this.redis.ltrim('scaling_activity_log', 0, 99);
  }

  /**
   * Get scaling statistics
   */
  async getScalingStats() {
    const systemState = await this.getSystemState();
    
    return {
      ...this.scalingStats,
      current_system_state: systemState,
      active_agents_managed: this.activeAgents.size,
      last_scale_action: this.lastScaleAction,
      is_scaling: this.isScaling
    };
  }

  /**
   * Shutdown scaler
   */
  async shutdown() {
    console.log(`🛑 Shutting down Agent Auto-Scaler...`);
    
    // Terminate all managed agents
    for (const [agentId, agent] of this.activeAgents) {
      await this.terminateAgent(agentId);
    }
    
    // Unregister scaler
    await this.redis.hdel('scaler', this.scalerId);
    
    console.log(`✅ Agent Auto-Scaler shutdown complete`);
  }
}

module.exports = AgentAutoScaler;