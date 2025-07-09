const Redis = require('ioredis');
const AgentAutoScaler = require('./agent-auto-scaler');

/**
 * Workload Balancer
 * 
 * Ensures optimal distribution of work across all available agents.
 * Keeps agents busy by:
 * - Intelligent task routing based on agent capabilities
 * - Cross-queue task redistribution
 * - Dynamic priority adjustment
 * - Predictive workload balancing
 */
class WorkloadBalancer {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.balancerId = `balancer_${Date.now()}`;
    this.autoScaler = new AgentAutoScaler();
    
    // Balancing configuration
    this.config = {
      balancingInterval: 15000, // 15 seconds
      taskRoutingInterval: 5000, // 5 seconds
      priorityAdjustmentInterval: 60000, // 1 minute
      maxTasksPerAgent: 10,
      idealTasksPerAgent: 5,
      crossQueueThreshold: 3,
      emergencyThreshold: 20
    };
    
    // Agent performance tracking
    this.agentPerformance = new Map();
    
    // Task routing intelligence
    this.taskRouting = {
      // Define which agents can handle which types of tasks
      compatibility: {
        claude: {
          primary: ['architecture', 'refactoring', 'documentation', 'security'],
          secondary: ['code_review', 'analysis', 'planning'],
          emergency: ['debugging', 'optimization']
        },
        gpt: {
          primary: ['backend-logic', 'api-design', 'implementation', 'frontend'],
          secondary: ['testing', 'debugging', 'integration'],
          emergency: ['documentation', 'refactoring']
        },
        deepseek: {
          primary: ['testing', 'validation', 'optimization', 'devops'],
          secondary: ['debugging', 'analysis', 'performance'],
          emergency: ['implementation', 'refactoring']
        },
        mistral: {
          primary: ['documentation', 'analysis', 'explanation'],
          secondary: ['code_review', 'planning', 'research'],
          emergency: ['testing', 'debugging']
        },
        gemini: {
          primary: ['analysis', 'optimization', 'performance', 'patterns'],
          secondary: ['code_review', 'architecture', 'debugging'],
          emergency: ['documentation', 'testing']
        }
      },
      // Task type detection patterns
      patterns: {
        architecture: /architect|design|structure|pattern|framework/i,
        refactoring: /refactor|clean|improve|restructure|optimize/i,
        documentation: /document|explain|readme|comment|guide/i,
        security: /security|auth|encrypt|validate|sanitize/i,
        testing: /test|spec|unit|integration|e2e/i,
        debugging: /debug|error|fix|issue|problem/i,
        performance: /performance|speed|optimize|benchmark/i,
        api: /api|endpoint|route|service|rest/i,
        frontend: /ui|component|react|vue|angular|html|css/i,
        backend: /server|database|model|controller|service/i,
        devops: /docker|deploy|ci|cd|pipeline|infrastructure/i
      }
    };
    
    this.balancingStats = {
      tasks_balanced: 0,
      cross_queue_moves: 0,
      priority_adjustments: 0,
      emergency_redistributions: 0,
      start_time: new Date().toISOString()
    };
    
    console.log(`⚖️  Workload Balancer initialized`);
  }

  /**
   * Start workload balancing
   */
  async start() {
    console.log(`🚀 Starting Workload Balancer...`);
    
    // Register balancer
    await this.registerBalancer();
    
    // Start balancing processes
    this.startTaskRouting();
    this.startWorkloadBalancing();
    this.startPriorityAdjustment();
    this.startPerformanceTracking();
    this.startEmergencyRebalancing();
    
    // Start auto-scaler
    await this.autoScaler.start();
    
    console.log(`✅ Workload Balancer started successfully`);
  }

  /**
   * Start intelligent task routing
   */
  startTaskRouting() {
    setInterval(async () => {
      try {
        await this.performTaskRouting();
      } catch (error) {
        console.error(`❌ Task routing error: ${error.message}`);
      }
    }, this.config.taskRoutingInterval);
  }

  /**
   * Perform intelligent task routing
   */
  async performTaskRouting() {
    console.log(`🧠 Performing intelligent task routing...`);
    
    // Get all pending tasks
    const allTasks = await this.getAllPendingTasks();
    
    // Route tasks to optimal agents
    const routingDecisions = await this.makeRoutingDecisions(allTasks);
    
    // Execute routing decisions
    await this.executeRoutingDecisions(routingDecisions);
    
    if (routingDecisions.length > 0) {
      console.log(`✅ Routed ${routingDecisions.length} tasks to optimal agents`);
    }
  }

  /**
   * Get all pending tasks from all queues
   */
  async getAllPendingTasks() {
    const allTasks = [];
    
    const queueNames = [
      'queue:claude-3-opus',
      'queue:gpt-4o',
      'queue:deepseek-coder',
      'queue:command-r-plus',
      'queue:gemini-pro'
    ];
    
    for (const queueName of queueNames) {
      const tasks = await this.redis.lrange(queueName, 0, -1);
      
      for (const taskStr of tasks) {
        try {
          const task = JSON.parse(taskStr);
          allTasks.push({
            task: task,
            currentQueue: queueName,
            currentAgent: this.getAgentTypeFromQueue(queueName)
          });
        } catch (error) {
          console.error(`Error parsing task from ${queueName}:`, error);
        }
      }
    }
    
    return allTasks;
  }

  /**
   * Make routing decisions based on task analysis
   */
  async makeRoutingDecisions(allTasks) {
    const decisions = [];
    
    // Get agent workloads
    const agentWorkloads = await this.getAgentWorkloads();
    
    for (const taskData of allTasks) {
      const task = taskData.task;
      const currentAgent = taskData.currentAgent;
      
      // Analyze task to determine optimal agent
      const taskAnalysis = await this.analyzeTask(task);
      const optimalAgent = await this.findOptimalAgent(taskAnalysis, agentWorkloads);
      
      // If current agent is not optimal, consider routing
      if (optimalAgent && optimalAgent !== currentAgent) {
        const routingScore = await this.calculateRoutingScore(
          task, currentAgent, optimalAgent, agentWorkloads
        );
        
        if (routingScore > 0.7) { // High confidence threshold
          decisions.push({
            task: task,
            fromQueue: taskData.currentQueue,
            toQueue: this.getQueueFromAgentType(optimalAgent),
            fromAgent: currentAgent,
            toAgent: optimalAgent,
            reason: `Better match: ${taskAnalysis.primaryType} task → ${optimalAgent}`,
            score: routingScore
          });
        }
      }
    }
    
    return decisions.sort((a, b) => b.score - a.score);
  }

  /**
   * Analyze task to determine type and requirements
   */
  async analyzeTask(task) {
    const prompt = task.prompt || task.description || '';
    const file = task.file || '';
    
    const analysis = {
      primaryType: null,
      secondaryTypes: [],
      complexity: 'medium',
      urgency: 'normal',
      fileType: null,
      keywords: []
    };
    
    // Extract keywords
    analysis.keywords = this.extractKeywords(prompt);
    
    // Determine file type
    if (file) {
      analysis.fileType = this.getFileType(file);
    }
    
    // Determine task type using patterns
    const typeScores = {};
    
    for (const [type, pattern] of Object.entries(this.taskRouting.patterns)) {
      const matches = prompt.match(pattern);
      if (matches) {
        typeScores[type] = matches.length;
      }
    }
    
    // Find primary type
    if (Object.keys(typeScores).length > 0) {
      analysis.primaryType = Object.keys(typeScores).reduce((a, b) => 
        typeScores[a] > typeScores[b] ? a : b
      );
      
      // Find secondary types
      analysis.secondaryTypes = Object.keys(typeScores)
        .filter(type => type !== analysis.primaryType)
        .sort((a, b) => typeScores[b] - typeScores[a])
        .slice(0, 2);
    }
    
    // Determine complexity
    if (prompt.includes('complex') || prompt.includes('advanced') || prompt.length > 1000) {
      analysis.complexity = 'high';
    } else if (prompt.includes('simple') || prompt.includes('quick') || prompt.length < 100) {
      analysis.complexity = 'low';
    }
    
    // Determine urgency
    if (prompt.includes('urgent') || prompt.includes('critical') || prompt.includes('asap')) {
      analysis.urgency = 'high';
    } else if (prompt.includes('later') || prompt.includes('eventually')) {
      analysis.urgency = 'low';
    }
    
    return analysis;
  }

  /**
   * Find optimal agent for task
   */
  async findOptimalAgent(taskAnalysis, agentWorkloads) {
    const agentScores = {};
    
    for (const [agentType, compatibility] of Object.entries(this.taskRouting.compatibility)) {
      let score = 0;
      
      // Primary capability match
      if (taskAnalysis.primaryType && compatibility.primary.includes(taskAnalysis.primaryType)) {
        score += 1.0;
      }
      
      // Secondary capability match
      if (taskAnalysis.primaryType && compatibility.secondary.includes(taskAnalysis.primaryType)) {
        score += 0.7;
      }
      
      // Emergency capability match
      if (taskAnalysis.primaryType && compatibility.emergency.includes(taskAnalysis.primaryType)) {
        score += 0.4;
      }
      
      // Secondary type matches
      for (const secondaryType of taskAnalysis.secondaryTypes) {
        if (compatibility.primary.includes(secondaryType)) {
          score += 0.3;
        } else if (compatibility.secondary.includes(secondaryType)) {
          score += 0.2;
        }
      }
      
      // Workload penalty
      const workload = agentWorkloads[agentType] || 0;
      const workloadPenalty = Math.min(workload / this.config.maxTasksPerAgent, 1.0);
      score *= (1 - workloadPenalty * 0.5);
      
      agentScores[agentType] = score;
    }
    
    // Find best agent
    const bestAgent = Object.keys(agentScores).reduce((a, b) => 
      agentScores[a] > agentScores[b] ? a : b
    );
    
    return agentScores[bestAgent] > 0.3 ? bestAgent : null;
  }

  /**
   * Calculate routing score
   */
  async calculateRoutingScore(task, fromAgent, toAgent, agentWorkloads) {
    const fromWorkload = agentWorkloads[fromAgent] || 0;
    const toWorkload = agentWorkloads[toAgent] || 0;
    
    let score = 0;
    
    // Workload improvement
    if (fromWorkload > toWorkload + 2) {
      score += 0.4;
    }
    
    // Capability match improvement
    const taskAnalysis = await this.analyzeTask(task);
    const fromCapability = this.getCapabilityScore(taskAnalysis, fromAgent);
    const toCapability = this.getCapabilityScore(taskAnalysis, toAgent);
    
    if (toCapability > fromCapability) {
      score += (toCapability - fromCapability) * 0.6;
    }
    
    // Urgency factor
    if (taskAnalysis.urgency === 'high' && toWorkload < fromWorkload) {
      score += 0.3;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Get capability score for agent and task
   */
  getCapabilityScore(taskAnalysis, agentType) {
    const compatibility = this.taskRouting.compatibility[agentType];
    if (!compatibility) return 0;
    
    let score = 0;
    
    if (taskAnalysis.primaryType) {
      if (compatibility.primary.includes(taskAnalysis.primaryType)) {
        score += 1.0;
      } else if (compatibility.secondary.includes(taskAnalysis.primaryType)) {
        score += 0.7;
      } else if (compatibility.emergency.includes(taskAnalysis.primaryType)) {
        score += 0.4;
      }
    }
    
    return score;
  }

  /**
   * Execute routing decisions
   */
  async executeRoutingDecisions(decisions) {
    for (const decision of decisions) {
      try {
        await this.moveTaskBetweenQueues(decision);
        this.balancingStats.tasks_balanced++;
        
        console.log(`📦 Routed task: ${decision.fromAgent} → ${decision.toAgent} (${decision.reason})`);
      } catch (error) {
        console.error(`❌ Error executing routing decision:`, error);
      }
    }
  }

  /**
   * Move task between queues
   */
  async moveTaskBetweenQueues(decision) {
    const taskStr = JSON.stringify(decision.task);
    
    // Remove from source queue
    await this.redis.lrem(decision.fromQueue, 1, taskStr);
    
    // Add to destination queue
    await this.redis.lpush(decision.toQueue, taskStr);
    
    // Log the move
    await this.redis.lpush('task_routing_log', JSON.stringify({
      task: decision.task,
      from: decision.fromAgent,
      to: decision.toAgent,
      reason: decision.reason,
      score: decision.score,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Start workload balancing
   */
  startWorkloadBalancing() {
    setInterval(async () => {
      try {
        await this.performWorkloadBalancing();
      } catch (error) {
        console.error(`❌ Workload balancing error: ${error.message}`);
      }
    }, this.config.balancingInterval);
  }

  /**
   * Perform workload balancing
   */
  async performWorkloadBalancing() {
    console.log(`⚖️  Performing workload balancing...`);
    
    // Get agent workloads
    const agentWorkloads = await this.getAgentWorkloads();
    
    // Identify imbalances
    const imbalances = await this.identifyImbalances(agentWorkloads);
    
    // Create balancing plan
    const balancingPlan = await this.createBalancingPlan(imbalances);
    
    // Execute balancing
    await this.executeBalancingPlan(balancingPlan);
  }

  /**
   * Get agent workloads
   */
  async getAgentWorkloads() {
    const workloads = {};
    
    const queueMappings = {
      claude: 'queue:claude-3-opus',
      gpt: 'queue:gpt-4o',
      deepseek: 'queue:deepseek-coder',
      mistral: 'queue:command-r-plus',
      gemini: 'queue:gemini-pro'
    };
    
    for (const [agentType, queueName] of Object.entries(queueMappings)) {
      const pendingTasks = await this.redis.llen(queueName);
      const processingTasks = await this.redis.llen(`processing:${queueName.replace('queue:', '')}`);
      
      workloads[agentType] = pendingTasks + processingTasks;
    }
    
    return workloads;
  }

  /**
   * Identify workload imbalances
   */
  async identifyImbalances(agentWorkloads) {
    const imbalances = {
      overloaded: [],
      underutilized: [],
      balanced: []
    };
    
    const totalTasks = Object.values(agentWorkloads).reduce((sum, load) => sum + load, 0);
    const averageLoad = totalTasks / Object.keys(agentWorkloads).length;
    
    for (const [agentType, workload] of Object.entries(agentWorkloads)) {
      const deviation = workload - averageLoad;
      
      if (deviation > this.config.crossQueueThreshold) {
        imbalances.overloaded.push({
          agent: agentType,
          workload: workload,
          deviation: deviation,
          severity: deviation > this.config.emergencyThreshold ? 'critical' : 'high'
        });
      } else if (deviation < -this.config.crossQueueThreshold) {
        imbalances.underutilized.push({
          agent: agentType,
          workload: workload,
          deviation: deviation,
          capacity: Math.abs(deviation)
        });
      } else {
        imbalances.balanced.push({
          agent: agentType,
          workload: workload,
          deviation: deviation
        });
      }
    }
    
    return imbalances;
  }

  /**
   * Create balancing plan
   */
  async createBalancingPlan(imbalances) {
    const plan = [];
    
    // Sort by severity and capacity
    imbalances.overloaded.sort((a, b) => b.deviation - a.deviation);
    imbalances.underutilized.sort((a, b) => b.capacity - a.capacity);
    
    // Create redistribution plan
    for (const overloaded of imbalances.overloaded) {
      const tasksToMove = Math.floor(overloaded.deviation / 2);
      
      // Find suitable underutilized agents
      for (const underutilized of imbalances.underutilized) {
        if (underutilized.capacity > 0) {
          const tasksToTransfer = Math.min(tasksToMove, underutilized.capacity);
          
          if (tasksToTransfer > 0) {
            plan.push({
              action: 'redistribute',
              fromAgent: overloaded.agent,
              toAgent: underutilized.agent,
              taskCount: tasksToTransfer,
              reason: `Balance workload: ${overloaded.agent}(${overloaded.workload}) → ${underutilized.agent}(${underutilized.workload})`
            });
            
            // Update capacities
            underutilized.capacity -= tasksToTransfer;
            overloaded.deviation -= tasksToTransfer;
            
            if (underutilized.capacity <= 0) break;
          }
        }
      }
    }
    
    return plan;
  }

  /**
   * Execute balancing plan
   */
  async executeBalancingPlan(plan) {
    for (const action of plan) {
      try {
        await this.executeBalancingAction(action);
        this.balancingStats.cross_queue_moves++;
        
        console.log(`⚖️  Executed balancing: ${action.reason}`);
      } catch (error) {
        console.error(`❌ Error executing balancing action:`, error);
      }
    }
  }

  /**
   * Execute balancing action
   */
  async executeBalancingAction(action) {
    const fromQueue = this.getQueueFromAgentType(action.fromAgent);
    const toQueue = this.getQueueFromAgentType(action.toAgent);
    
    // Get tasks from overloaded queue
    const tasks = await this.redis.lrange(fromQueue, 0, action.taskCount - 1);
    
    // Move tasks that are suitable for the target agent
    let movedCount = 0;
    
    for (const taskStr of tasks) {
      try {
        const task = JSON.parse(taskStr);
        
        // Check if task is suitable for target agent
        if (await this.isTaskSuitableForAgent(task, action.toAgent)) {
          // Remove from source queue
          await this.redis.lrem(fromQueue, 1, taskStr);
          
          // Add to destination queue
          await this.redis.lpush(toQueue, taskStr);
          
          movedCount++;
          
          if (movedCount >= action.taskCount) break;
        }
      } catch (error) {
        console.error(`Error moving task:`, error);
      }
    }
    
    console.log(`📦 Moved ${movedCount} tasks from ${action.fromAgent} to ${action.toAgent}`);
  }

  /**
   * Check if task is suitable for agent
   */
  async isTaskSuitableForAgent(task, agentType) {
    const taskAnalysis = await this.analyzeTask(task);
    const capabilityScore = this.getCapabilityScore(taskAnalysis, agentType);
    
    return capabilityScore > 0.4; // Minimum suitability threshold
  }

  /**
   * Start emergency rebalancing
   */
  startEmergencyRebalancing() {
    setInterval(async () => {
      try {
        await this.performEmergencyRebalancing();
      } catch (error) {
        console.error(`❌ Emergency rebalancing error: ${error.message}`);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform emergency rebalancing
   */
  async performEmergencyRebalancing() {
    const agentWorkloads = await this.getAgentWorkloads();
    
    // Check for emergency situations
    const emergencyAgents = Object.entries(agentWorkloads)
      .filter(([agent, workload]) => workload > this.config.emergencyThreshold);
    
    if (emergencyAgents.length > 0) {
      console.log(`🚨 Emergency rebalancing triggered for: ${emergencyAgents.map(([agent]) => agent).join(', ')}`);
      
      for (const [agentType, workload] of emergencyAgents) {
        await this.performEmergencyRedistribution(agentType, workload);
      }
      
      this.balancingStats.emergency_redistributions++;
    }
  }

  /**
   * Perform emergency redistribution
   */
  async performEmergencyRedistribution(agentType, workload) {
    const fromQueue = this.getQueueFromAgentType(agentType);
    
    // Get all tasks from emergency queue
    const tasks = await this.redis.lrange(fromQueue, 0, -1);
    
    // Redistribute tasks to any available agent
    for (const taskStr of tasks) {
      try {
        const task = JSON.parse(taskStr);
        
        // Find any agent that can handle this task
        const availableAgent = await this.findAvailableAgent(task);
        
        if (availableAgent && availableAgent !== agentType) {
          const toQueue = this.getQueueFromAgentType(availableAgent);
          
          // Move task
          await this.redis.lrem(fromQueue, 1, taskStr);
          await this.redis.lpush(toQueue, taskStr);
          
          console.log(`🚨 Emergency moved task from ${agentType} to ${availableAgent}`);
        }
      } catch (error) {
        console.error(`Error in emergency redistribution:`, error);
      }
    }
  }

  /**
   * Find available agent for emergency redistribution
   */
  async findAvailableAgent(task) {
    const agentWorkloads = await this.getAgentWorkloads();
    
    // Find agent with lowest workload that can handle the task
    let bestAgent = null;
    let lowestWorkload = Infinity;
    
    for (const [agentType, workload] of Object.entries(agentWorkloads)) {
      if (workload < lowestWorkload && await this.isTaskSuitableForAgent(task, agentType)) {
        bestAgent = agentType;
        lowestWorkload = workload;
      }
    }
    
    return bestAgent;
  }

  /**
   * Start priority adjustment
   */
  startPriorityAdjustment() {
    setInterval(async () => {
      try {
        await this.performPriorityAdjustment();
      } catch (error) {
        console.error(`❌ Priority adjustment error: ${error.message}`);
      }
    }, this.config.priorityAdjustmentInterval);
  }

  /**
   * Perform priority adjustment
   */
  async performPriorityAdjustment() {
    console.log(`🔄 Performing priority adjustment...`);
    
    // Get failed tasks
    const failedTasks = await this.redis.lrange('queue:failures', 0, -1);
    
    // Retry high-priority failed tasks
    for (const taskStr of failedTasks) {
      try {
        const failedTask = JSON.parse(taskStr);
        
        if (this.shouldRetryTask(failedTask)) {
          // Remove from failure queue
          await this.redis.lrem('queue:failures', 1, taskStr);
          
          // Add back to appropriate queue with higher priority
          const taskAnalysis = await this.analyzeTask(failedTask);
          const optimalAgent = await this.findOptimalAgent(taskAnalysis, await this.getAgentWorkloads());
          
          if (optimalAgent) {
            const queue = this.getQueueFromAgentType(optimalAgent);
            
            // Mark as retry
            failedTask.retry = true;
            failedTask.retry_count = (failedTask.retry_count || 0) + 1;
            failedTask.priority = 'high';
            
            await this.redis.lpush(queue, JSON.stringify(failedTask));
            
            console.log(`🔄 Retrying failed task in ${optimalAgent} queue`);
            this.balancingStats.priority_adjustments++;
          }
        }
      } catch (error) {
        console.error(`Error retrying failed task:`, error);
      }
    }
  }

  /**
   * Check if task should be retried
   */
  shouldRetryTask(failedTask) {
    const retryCount = failedTask.retry_count || 0;
    const maxRetries = 3;
    
    if (retryCount >= maxRetries) return false;
    
    // Check failure reason
    const error = failedTask.error || '';
    
    // Don't retry certain types of errors
    if (error.includes('syntax error') || error.includes('invalid')) {
      return false;
    }
    
    // Retry network errors, timeouts, etc.
    return true;
  }

  /**
   * Start performance tracking
   */
  startPerformanceTracking() {
    setInterval(async () => {
      try {
        await this.trackAgentPerformance();
      } catch (error) {
        console.error(`❌ Performance tracking error: ${error.message}`);
      }
    }, 60000); // Every minute
  }

  /**
   * Track agent performance
   */
  async trackAgentPerformance() {
    const agents = await this.redis.hgetall('agents');
    
    for (const [agentId, agentData] of Object.entries(agents)) {
      try {
        const agent = JSON.parse(agentData);
        
        // Get agent statistics
        const stats = await this.redis.hgetall(`agent_stats:${agentId}`);
        
        if (stats && stats.tasks_completed) {
          const performance = {
            agent_id: agentId,
            agent_type: agent.type,
            tasks_completed: parseInt(stats.tasks_completed) || 0,
            tasks_failed: parseInt(stats.tasks_failed) || 0,
            success_rate: stats.tasks_completed / (stats.tasks_completed + stats.tasks_failed),
            last_updated: new Date().toISOString()
          };
          
          this.agentPerformance.set(agentId, performance);
        }
      } catch (error) {
        console.error(`Error tracking performance for ${agentId}:`, error);
      }
    }
  }

  /**
   * Helper methods
   */
  getAgentTypeFromQueue(queueName) {
    const mapping = {
      'queue:claude-3-opus': 'claude',
      'queue:gpt-4o': 'gpt',
      'queue:deepseek-coder': 'deepseek',
      'queue:command-r-plus': 'mistral',
      'queue:gemini-pro': 'gemini'
    };
    
    return mapping[queueName];
  }

  getQueueFromAgentType(agentType) {
    const mapping = {
      claude: 'queue:claude-3-opus',
      gpt: 'queue:gpt-4o',
      deepseek: 'queue:deepseek-coder',
      mistral: 'queue:command-r-plus',
      gemini: 'queue:gemini-pro'
    };
    
    return mapping[agentType];
  }

  extractKeywords(text) {
    if (!text) return [];
    
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
  }

  getFileType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    
    const typeMap = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'react',
      tsx: 'react',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      php: 'php',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      vue: 'vue',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sql: 'sql',
      md: 'markdown',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml'
    };
    
    return typeMap[ext] || 'unknown';
  }

  async registerBalancer() {
    await this.redis.hset('balancer', this.balancerId, JSON.stringify({
      balancer_id: this.balancerId,
      started_at: new Date().toISOString(),
      config: this.config,
      status: 'active'
    }));
  }

  /**
   * Get balancing statistics
   */
  async getBalancingStats() {
    const agentWorkloads = await this.getAgentWorkloads();
    const totalTasks = Object.values(agentWorkloads).reduce((sum, load) => sum + load, 0);
    
    return {
      ...this.balancingStats,
      current_workloads: agentWorkloads,
      total_tasks: totalTasks,
      agent_performance: Object.fromEntries(this.agentPerformance),
      balancer_id: this.balancerId
    };
  }

  /**
   * Shutdown balancer
   */
  async shutdown() {
    console.log(`🛑 Shutting down Workload Balancer...`);
    
    // Shutdown auto-scaler
    await this.autoScaler.shutdown();
    
    // Unregister balancer
    await this.redis.hdel('balancer', this.balancerId);
    
    console.log(`✅ Workload Balancer shutdown complete`);
  }
}

module.exports = WorkloadBalancer;