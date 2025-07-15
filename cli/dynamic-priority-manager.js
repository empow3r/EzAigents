const Redis = require('ioredis');
const EventEmitter = require('events');

class DynamicPriorityManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.redis = new Redis(config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.config = {
      maxAge: config.maxAge || 3600000, // 1 hour max age
      agingFactor: config.agingFactor || 0.1,
      updateInterval: config.updateInterval || 60000, // 1 minute
      priorityLevels: config.priorityLevels || {
        critical: { value: 100, color: '#ff0000', slaMinutes: 15 },
        high: { value: 80, color: '#ff8800', slaMinutes: 60 },
        normal: { value: 60, color: '#00aa00', slaMinutes: 240 },
        low: { value: 40, color: '#0088aa', slaMinutes: 720 },
        deferred: { value: 20, color: '#888888', slaMinutes: 1440 }
      },
      escalationRules: config.escalationRules || [
        { condition: 'age > 30', action: 'increase', amount: 10 },
        { condition: 'failures > 2', action: 'increase', amount: 20 },
        { condition: 'sla_breach', action: 'escalate', target: 'high' },
        { condition: 'dependencies_blocked', action: 'escalate', target: 'critical' }
      ],
      ...config
    };

    this.priorityHistory = new Map();
    this.taskMetrics = new Map();
    this.dependencyGraph = new Map();
    this.isRunning = false;
    
    this.initializePriorityRules();
  }

  initializePriorityRules() {
    this.priorityRules = {
      fileTypes: {
        'security/': 'critical',
        'auth/': 'critical',
        'core/': 'high',
        'api/': 'high',
        'components/': 'normal',
        'tests/': 'low',
        'docs/': 'low',
        'examples/': 'deferred'
      },
      keywords: {
        'security': 'critical',
        'vulnerability': 'critical',
        'auth': 'critical',
        'login': 'critical',
        'payment': 'critical',
        'critical': 'critical',
        'urgent': 'high',
        'bug': 'high',
        'error': 'high',
        'feature': 'normal',
        'enhancement': 'normal',
        'refactor': 'low',
        'documentation': 'low',
        'comment': 'deferred',
        'cleanup': 'deferred'
      },
      taskTypes: {
        'emergency_fix': 'critical',
        'security_patch': 'critical',
        'hotfix': 'high',
        'bug_fix': 'high',
        'feature_implementation': 'normal',
        'code_review': 'normal',
        'optimization': 'low',
        'documentation': 'low',
        'maintenance': 'deferred'
      },
      agents: {
        'claude': ['architecture', 'security', 'refactoring'],
        'gpt': ['implementation', 'api', 'backend'],
        'deepseek': ['testing', 'validation', 'optimization'],
        'mistral': ['documentation', 'analysis'],
        'gemini': ['analysis', 'patterns', 'performance']
      }
    };
  }

  async analyzeTaskPriority(task) {
    let basePriority = 'normal';
    let priorityScore = this.config.priorityLevels.normal.value;
    const factors = [];

    // Analyze file paths
    if (task.files && Array.isArray(task.files)) {
      for (const file of task.files) {
        const filePath = typeof file === 'string' ? file : file.path;
        for (const [pattern, priority] of Object.entries(this.priorityRules.fileTypes)) {
          if (filePath.includes(pattern)) {
            const score = this.config.priorityLevels[priority]?.value || priorityScore;
            if (score > priorityScore) {
              priorityScore = score;
              basePriority = priority;
              factors.push(`File pattern: ${pattern} → ${priority}`);
            }
          }
        }
      }
    }

    // Analyze content keywords
    const content = [
      task.title || '',
      task.description || '',
      task.content || '',
      JSON.stringify(task.metadata || {})
    ].join(' ').toLowerCase();

    for (const [keyword, priority] of Object.entries(this.priorityRules.keywords)) {
      if (content.includes(keyword)) {
        const score = this.config.priorityLevels[priority]?.value || priorityScore;
        if (score > priorityScore) {
          priorityScore = score;
          basePriority = priority;
          factors.push(`Keyword: ${keyword} → ${priority}`);
        }
      }
    }

    // Analyze task type
    if (task.type && this.priorityRules.taskTypes[task.type]) {
      const priority = this.priorityRules.taskTypes[task.type];
      const score = this.config.priorityLevels[priority]?.value || priorityScore;
      if (score > priorityScore) {
        priorityScore = score;
        basePriority = priority;
        factors.push(`Task type: ${task.type} → ${priority}`);
      }
    }

    // Check explicit priority
    if (task.priority && this.config.priorityLevels[task.priority]) {
      const explicitScore = this.config.priorityLevels[task.priority].value;
      if (explicitScore > priorityScore) {
        priorityScore = explicitScore;
        basePriority = task.priority;
        factors.push(`Explicit priority: ${task.priority}`);
      }
    }

    // Analyze dependencies
    const dependencyBonus = await this.analyzeDependencies(task);
    priorityScore += dependencyBonus;
    if (dependencyBonus > 0) {
      factors.push(`Dependency bonus: +${dependencyBonus}`);
    }

    // Business impact analysis
    const businessImpact = this.analyzeBusinessImpact(task);
    priorityScore += businessImpact;
    if (businessImpact > 0) {
      factors.push(`Business impact: +${businessImpact}`);
    }

    return {
      priority: this.scoreToPriority(priorityScore),
      score: priorityScore,
      basePriority,
      factors,
      analysis: {
        hasSecurityImpact: factors.some(f => f.includes('security')),
        hasUrgentKeywords: factors.some(f => f.includes('urgent') || f.includes('critical')),
        dependencyCount: await this.getDependencyCount(task),
        estimatedComplexity: this.estimateComplexity(task)
      }
    };
  }

  scoreToPriority(score) {
    const levels = Object.entries(this.config.priorityLevels)
      .sort((a, b) => b[1].value - a[1].value);
    
    for (const [priority, config] of levels) {
      if (score >= config.value) {
        return priority;
      }
    }
    
    return 'deferred';
  }

  async analyzeDependencies(task) {
    if (!task.dependencies || task.dependencies.length === 0) {
      return 0;
    }

    let bonus = 0;
    const blockedTasks = await this.getBlockedTasks(task.id);
    
    // More blocked tasks = higher priority
    bonus += blockedTasks.length * 5;
    
    // Check if dependencies are critical
    for (const depId of task.dependencies) {
      const depTask = await this.getTask(depId);
      if (depTask && depTask.priority === 'critical') {
        bonus += 15;
      }
    }

    return Math.min(bonus, 30); // Cap at 30 points
  }

  analyzeBusinessImpact(task) {
    let impact = 0;
    const content = JSON.stringify(task).toLowerCase();

    // High business impact indicators
    const highImpactKeywords = [
      'user', 'customer', 'production', 'revenue', 'sales',
      'performance', 'downtime', 'outage', 'crash'
    ];

    for (const keyword of highImpactKeywords) {
      if (content.includes(keyword)) {
        impact += 5;
      }
    }

    // Check for user-facing changes
    if (content.includes('ui') || content.includes('frontend') || content.includes('user interface')) {
      impact += 10;
    }

    // Check for API changes
    if (content.includes('api') || content.includes('endpoint') || content.includes('service')) {
      impact += 8;
    }

    return Math.min(impact, 25); // Cap at 25 points
  }

  estimateComplexity(task) {
    let complexity = 1;

    if (task.files) {
      complexity += task.files.length * 0.1;
    }

    if (task.content) {
      const lines = task.content.split('\n').length;
      complexity += lines / 100;
    }

    if (task.dependencies) {
      complexity += task.dependencies.length * 0.2;
    }

    return Math.min(complexity, 10);
  }

  async updateTaskPriority(taskId, newPriority, reason = 'manual') {
    try {
      const currentTask = await this.getTask(taskId);
      if (!currentTask) {
        throw new Error(`Task ${taskId} not found`);
      }

      const oldPriority = currentTask.priority;
      const priorityChange = {
        taskId,
        oldPriority,
        newPriority,
        reason,
        timestamp: Date.now(),
        agent: reason.includes('escalation') ? 'system' : 'manual'
      };

      // Store priority history
      const history = this.priorityHistory.get(taskId) || [];
      history.push(priorityChange);
      this.priorityHistory.set(taskId, history);

      // Update task in Redis
      currentTask.priority = newPriority;
      currentTask.lastPriorityUpdate = Date.now();
      currentTask.priorityHistory = history;

      await this.redis.hset('tasks:priorities', taskId, JSON.stringify(currentTask));

      // Move task to new priority queue if needed
      if (oldPriority !== newPriority) {
        await this.moveTaskToPriorityQueue(taskId, currentTask, oldPriority, newPriority);
      }

      console.log(`Priority Manager: Updated task ${taskId}: ${oldPriority} → ${newPriority} (${reason})`);
      this.emit('priorityChanged', priorityChange);

      return priorityChange;
    } catch (error) {
      console.error('Error updating task priority:', error);
      throw error;
    }
  }

  async moveTaskToPriorityQueue(taskId, task, oldPriority, newPriority) {
    const agentId = task.assignedAgent;
    if (!agentId) return;

    // Remove from old queue
    const oldQueueKey = `queue:${agentId}:p:${oldPriority}`;
    const taskData = await this.redis.zrange(oldQueueKey, 0, -1, 'WITHSCORES');
    
    for (let i = 0; i < taskData.length; i += 2) {
      const storedTask = JSON.parse(taskData[i]);
      if (storedTask.id === taskId) {
        await this.redis.zrem(oldQueueKey, taskData[i]);
        break;
      }
    }

    // Add to new queue with updated priority
    const newQueueKey = `queue:${agentId}:p:${newPriority}`;
    const priorityScore = this.config.priorityLevels[newPriority]?.value || 60;
    await this.redis.zadd(newQueueKey, Date.now() + priorityScore * 1000, JSON.stringify(task));
  }

  async processEscalationRules() {
    try {
      const allTasks = await this.getAllActiveTasks();
      const escalations = [];

      for (const task of allTasks) {
        const taskAge = Date.now() - (task.createdAt || Date.now());
        const taskMetrics = this.taskMetrics.get(task.id) || { failures: 0, attempts: 0 };
        
        for (const rule of this.config.escalationRules) {
          if (await this.evaluateEscalationCondition(task, taskAge, taskMetrics, rule)) {
            const escalation = await this.applyEscalationAction(task, rule);
            if (escalation) {
              escalations.push(escalation);
            }
          }
        }
      }

      if (escalations.length > 0) {
        console.log(`Priority Manager: Applied ${escalations.length} escalations`);
        this.emit('escalationsApplied', escalations);
      }

      return escalations;
    } catch (error) {
      console.error('Error processing escalation rules:', error);
      return [];
    }
  }

  async evaluateEscalationCondition(task, taskAge, metrics, rule) {
    const condition = rule.condition;
    const ageMinutes = taskAge / 60000;
    const slaMinutes = this.config.priorityLevels[task.priority]?.slaMinutes || 240;

    switch (condition) {
      case 'age > 30':
        return ageMinutes > 30;
      
      case 'failures > 2':
        return metrics.failures > 2;
      
      case 'sla_breach':
        return ageMinutes > slaMinutes;
      
      case 'dependencies_blocked':
        return await this.hasBlockedDependencies(task);
      
      default:
        // Parse custom conditions like 'age > 60' or 'failures > 3'
        return this.parseCondition(condition, { ageMinutes, ...metrics, task });
    }
  }

  parseCondition(condition, context) {
    try {
      // Simple condition parser for safety
      const match = condition.match(/(\w+)\s*([><=]+)\s*(\d+)/);
      if (!match) return false;

      const [, variable, operator, value] = match;
      const contextValue = context[variable];
      const targetValue = parseInt(value);

      switch (operator) {
        case '>': return contextValue > targetValue;
        case '<': return contextValue < targetValue;
        case '>=': return contextValue >= targetValue;
        case '<=': return contextValue <= targetValue;
        case '==': return contextValue == targetValue;
        default: return false;
      }
    } catch (error) {
      console.warn('Error parsing condition:', condition, error);
      return false;
    }
  }

  async applyEscalationAction(task, rule) {
    try {
      switch (rule.action) {
        case 'increase':
          const currentScore = this.config.priorityLevels[task.priority]?.value || 60;
          const newScore = Math.min(currentScore + rule.amount, 100);
          const newPriority = this.scoreToPriority(newScore);
          
          if (newPriority !== task.priority) {
            return await this.updateTaskPriority(
              task.id, 
              newPriority, 
              `escalation:${rule.condition}`
            );
          }
          break;

        case 'escalate':
          if (rule.target && rule.target !== task.priority) {
            return await this.updateTaskPriority(
              task.id, 
              rule.target, 
              `escalation:${rule.condition}`
            );
          }
          break;

        case 'notify':
          this.emit('escalationNotification', {
            task,
            rule,
            message: `Task ${task.id} triggered escalation: ${rule.condition}`
          });
          break;
      }
    } catch (error) {
      console.error('Error applying escalation action:', error);
    }

    return null;
  }

  async hasBlockedDependencies(task) {
    if (!task.dependencies || task.dependencies.length === 0) return false;

    for (const depId of task.dependencies) {
      const depTask = await this.getTask(depId);
      if (!depTask || depTask.status !== 'completed') {
        return true;
      }
    }

    return false;
  }

  async getBlockedTasks(taskId) {
    const blockedTasks = [];
    const allTasks = await this.getAllActiveTasks();

    for (const task of allTasks) {
      if (task.dependencies && task.dependencies.includes(taskId)) {
        blockedTasks.push(task);
      }
    }

    return blockedTasks;
  }

  async getDependencyCount(task) {
    if (!task.dependencies) return 0;
    return task.dependencies.length;
  }

  async getTask(taskId) {
    try {
      const taskData = await this.redis.hget('tasks:priorities', taskId);
      return taskData ? JSON.parse(taskData) : null;
    } catch (error) {
      console.error('Error getting task:', error);
      return null;
    }
  }

  async getAllActiveTasks() {
    try {
      const taskData = await this.redis.hgetall('tasks:priorities');
      return Object.values(taskData).map(data => JSON.parse(data));
    } catch (error) {
      console.error('Error getting all tasks:', error);
      return [];
    }
  }

  async updateTaskMetrics(taskId, metrics) {
    const currentMetrics = this.taskMetrics.get(taskId) || {
      failures: 0,
      attempts: 0,
      totalTime: 0,
      avgResponseTime: 0
    };

    const updatedMetrics = { ...currentMetrics, ...metrics };
    this.taskMetrics.set(taskId, updatedMetrics);

    // Store in Redis for persistence
    await this.redis.hset('tasks:metrics', taskId, JSON.stringify(updatedMetrics));
  }

  async recordTaskFailure(taskId, error) {
    const metrics = this.taskMetrics.get(taskId) || { failures: 0, attempts: 0 };
    metrics.failures++;
    metrics.lastError = {
      message: error.message,
      timestamp: Date.now(),
      type: error.name || 'Error'
    };

    await this.updateTaskMetrics(taskId, metrics);

    // Check if failure count triggers escalation
    if (metrics.failures > 2) {
      const task = await this.getTask(taskId);
      if (task) {
        await this.updateTaskPriority(
          taskId,
          'high',
          `failure_escalation:${metrics.failures}_failures`
        );
      }
    }
  }

  async addTaskDependency(taskId, dependsOn) {
    const task = await this.getTask(taskId);
    if (!task) return;

    if (!task.dependencies) task.dependencies = [];
    if (!task.dependencies.includes(dependsOn)) {
      task.dependencies.push(dependsOn);
      await this.redis.hset('tasks:priorities', taskId, JSON.stringify(task));

      // Update dependency graph
      if (!this.dependencyGraph.has(dependsOn)) {
        this.dependencyGraph.set(dependsOn, []);
      }
      this.dependencyGraph.get(dependsOn).push(taskId);

      console.log(`Priority Manager: Added dependency ${dependsOn} → ${taskId}`);
    }
  }

  async removeTaskDependency(taskId, dependsOn) {
    const task = await this.getTask(taskId);
    if (!task || !task.dependencies) return;

    task.dependencies = task.dependencies.filter(dep => dep !== dependsOn);
    await this.redis.hset('tasks:priorities', taskId, JSON.stringify(task));

    // Update dependency graph
    if (this.dependencyGraph.has(dependsOn)) {
      const dependents = this.dependencyGraph.get(dependsOn);
      this.dependencyGraph.set(dependsOn, dependents.filter(dep => dep !== taskId));
    }

    console.log(`Priority Manager: Removed dependency ${dependsOn} → ${taskId}`);
  }

  async getPriorityStats() {
    const allTasks = await this.getAllActiveTasks();
    const priorityCounts = {};
    const ageDistribution = {};
    const escalationStats = {};

    // Initialize counts
    for (const priority of Object.keys(this.config.priorityLevels)) {
      priorityCounts[priority] = 0;
      ageDistribution[priority] = [];
    }

    // Analyze tasks
    for (const task of allTasks) {
      const priority = task.priority || 'normal';
      priorityCounts[priority]++;
      
      const age = Date.now() - (task.createdAt || Date.now());
      ageDistribution[priority].push(age);

      // Count escalations
      if (task.priorityHistory) {
        for (const change of task.priorityHistory) {
          if (change.reason.includes('escalation')) {
            escalationStats[change.reason] = (escalationStats[change.reason] || 0) + 1;
          }
        }
      }
    }

    // Calculate average ages
    const avgAges = {};
    for (const [priority, ages] of Object.entries(ageDistribution)) {
      avgAges[priority] = ages.length > 0 
        ? ages.reduce((sum, age) => sum + age, 0) / ages.length 
        : 0;
    }

    return {
      totalTasks: allTasks.length,
      priorityCounts,
      avgAges,
      escalationStats,
      slaBreaches: await this.getSLABreaches(),
      recentEscalations: Array.from(this.priorityHistory.values())
        .flat()
        .filter(change => change.reason.includes('escalation'))
        .slice(-20)
    };
  }

  async getSLABreaches() {
    const allTasks = await this.getAllActiveTasks();
    const breaches = [];

    for (const task of allTasks) {
      const age = Date.now() - (task.createdAt || Date.now());
      const ageMinutes = age / 60000;
      const slaMinutes = this.config.priorityLevels[task.priority]?.slaMinutes || 240;

      if (ageMinutes > slaMinutes) {
        breaches.push({
          taskId: task.id,
          priority: task.priority,
          ageMinutes,
          slaMinutes,
          breachAmount: ageMinutes - slaMinutes
        });
      }
    }

    return breaches.sort((a, b) => b.breachAmount - a.breachAmount);
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Dynamic Priority Manager started');

    // Start priority update interval
    this.updateTimer = setInterval(() => {
      this.processEscalationRules().catch(console.error);
    }, this.config.updateInterval);

    // Load existing task metrics
    await this.loadTaskMetrics();
  }

  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    console.log('Dynamic Priority Manager stopped');
  }

  async loadTaskMetrics() {
    try {
      const metricsData = await this.redis.hgetall('tasks:metrics');
      for (const [taskId, data] of Object.entries(metricsData)) {
        this.taskMetrics.set(taskId, JSON.parse(data));
      }
      console.log(`Priority Manager: Loaded metrics for ${this.taskMetrics.size} tasks`);
    } catch (error) {
      console.error('Error loading task metrics:', error);
    }
  }
}

module.exports = DynamicPriorityManager;