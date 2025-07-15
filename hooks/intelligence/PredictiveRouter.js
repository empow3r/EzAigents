const BaseHook = require('../core/BaseHook');

class PredictiveRouter extends BaseHook {
  constructor(config = {}) {
    super(config);
    
    this.metadata = {
      name: 'predictive-task-router',
      version: '1.0.0',
      type: 'pre-task-assignment',
      description: 'AI-powered task routing based on agent performance and task characteristics',
      priority: 95,
      enabled: true,
      timeout: 5000
    };

    // Agent capability matrix
    this.agentCapabilities = {
      'claude-3-opus': {
        strengths: ['architecture', 'refactoring', 'complex-logic', 'documentation'],
        tokenLimit: 200000,
        costPerToken: 0.00015,
        avgResponseTime: 3000
      },
      'gpt-4o': {
        strengths: ['backend', 'api', 'integration', 'debugging'],
        tokenLimit: 128000,
        costPerToken: 0.00003,
        avgResponseTime: 2500
      },
      'deepseek-coder': {
        strengths: ['testing', 'validation', 'simple-tasks', 'code-review'],
        tokenLimit: 32000,
        costPerToken: 0.00001,
        avgResponseTime: 1500
      },
      'mistral': {
        strengths: ['documentation', 'comments', 'readme', 'examples'],
        tokenLimit: 32000,
        costPerToken: 0.00002,
        avgResponseTime: 2000
      },
      'gemini-pro': {
        strengths: ['analysis', 'optimization', 'patterns', 'security'],
        tokenLimit: 32000,
        costPerToken: 0.00001,
        avgResponseTime: 2200
      }
    };

    // Task complexity factors
    this.complexityFactors = {
      fileCount: 0.2,
      lineCount: 0.3,
      dependencies: 0.2,
      keywords: 0.3
    };

    // Performance history cache
    this.performanceCache = new Map();
    this.cacheExpiry = 300000; // 5 minutes
  }

  async execute(context) {
    const { task, system } = context;

    // Analyze task characteristics
    const taskAnalysis = await this.analyzeTask(task, context);
    
    // Get available agents and their current state
    const agentStates = await this.getAgentStates(context);
    
    // Get historical performance data
    const performanceData = await this.getPerformanceHistory(context);
    
    // Calculate agent scores
    const agentScores = await this.calculateAgentScores(
      taskAnalysis,
      agentStates,
      performanceData
    );

    // Select optimal agent
    const recommendation = this.selectOptimalAgent(agentScores, context);

    // Log routing decision
    await this.logRoutingDecision(context, {
      taskAnalysis,
      agentScores,
      recommendation
    });

    // Update context with routing recommendation
    context.setShared('routingRecommendation', recommendation);
    
    return {
      recommendation,
      analysis: taskAnalysis,
      scores: agentScores,
      contextModifications: {
        preferredAgent: recommendation.primary.agentId,
        fallbackAgents: recommendation.fallbacks.map(a => a.agentId),
        routingReason: recommendation.reason
      }
    };
  }

  async analyzeTask(task, context) {
    const analysis = {
      complexity: 0,
      estimatedTokens: 0,
      category: 'general',
      keywords: [],
      requirements: []
    };

    // Extract keywords from prompt
    if (task.prompt) {
      analysis.keywords = this.extractKeywords(task.prompt);
      analysis.estimatedTokens = this.estimateTokens(task.prompt);
    }

    // Categorize task
    analysis.category = this.categorizeTask(task, analysis.keywords);

    // Calculate complexity
    analysis.complexity = await this.calculateComplexity(task, context);

    // Identify requirements
    analysis.requirements = this.identifyRequirements(task, analysis.keywords);

    return analysis;
  }

  extractKeywords(text) {
    const keywords = [];
    const patterns = {
      architecture: /architect|design|structure|pattern|refactor/i,
      backend: /api|endpoint|server|database|backend/i,
      frontend: /ui|component|react|vue|frontend/i,
      testing: /test|spec|jest|mocha|validate/i,
      documentation: /document|readme|comment|explain/i,
      optimization: /optimize|performance|speed|efficient/i,
      security: /security|vulnerability|auth|encrypt/i
    };

    for (const [category, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        keywords.push(category);
      }
    }

    return keywords;
  }

  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  categorizeTask(task, keywords) {
    if (task.type) return task.type;

    // Use keywords to determine category
    if (keywords.includes('architecture')) return 'architecture';
    if (keywords.includes('testing')) return 'testing';
    if (keywords.includes('documentation')) return 'documentation';
    if (keywords.includes('backend') || keywords.includes('api')) return 'backend';
    if (keywords.includes('frontend')) return 'frontend';
    if (keywords.includes('security')) return 'security';
    if (keywords.includes('optimization')) return 'optimization';
    
    return 'general';
  }

  async calculateComplexity(task, context) {
    let complexity = 0;

    // Base complexity from task metadata
    if (task.complexity) {
      complexity = task.complexity;
    } else {
      // Calculate based on various factors
      if (task.files) {
        complexity += task.files.length * this.complexityFactors.fileCount;
      }

      if (task.estimatedLines) {
        complexity += (task.estimatedLines / 100) * this.complexityFactors.lineCount;
      }

      if (task.dependencies) {
        complexity += task.dependencies.length * this.complexityFactors.dependencies;
      }

      // Keywords complexity
      const complexKeywords = ['refactor', 'architect', 'optimize', 'security'];
      const keywordComplexity = task.prompt ? 
        complexKeywords.filter(k => task.prompt.toLowerCase().includes(k)).length : 0;
      complexity += keywordComplexity * this.complexityFactors.keywords;
    }

    return Math.min(10, Math.max(1, complexity)); // Scale 1-10
  }

  identifyRequirements(task, keywords) {
    const requirements = [];

    if (task.estimatedTokens > 100000) {
      requirements.push('high-token-limit');
    }

    if (keywords.includes('architecture') || keywords.includes('refactor')) {
      requirements.push('high-complexity-handling');
    }

    if (keywords.includes('testing')) {
      requirements.push('testing-expertise');
    }

    if (task.priority === 'high' || task.urgent) {
      requirements.push('fast-response');
    }

    if (keywords.includes('security')) {
      requirements.push('security-expertise');
    }

    return requirements;
  }

  async getAgentStates(context) {
    const agents = await context.redis.keys('agent:*:status');
    const states = {};

    for (const key of agents) {
      const agentId = key.split(':')[1];
      const status = await context.redis.hGetAll(key);
      
      states[agentId] = {
        id: agentId,
        model: status.model || this.inferModel(agentId),
        status: status.status || 'unknown',
        load: parseFloat(status.load || 0),
        queueDepth: parseInt(status.queueDepth || 0),
        lastActive: parseInt(status.lastActive || 0),
        capabilities: this.agentCapabilities[status.model] || {}
      };
    }

    return states;
  }

  inferModel(agentId) {
    // Infer model from agent ID
    if (agentId.includes('claude')) return 'claude-3-opus';
    if (agentId.includes('gpt')) return 'gpt-4o';
    if (agentId.includes('deepseek')) return 'deepseek-coder';
    if (agentId.includes('mistral')) return 'mistral';
    if (agentId.includes('gemini')) return 'gemini-pro';
    return 'unknown';
  }

  async getPerformanceHistory(context) {
    // Check cache first
    const cacheKey = 'performance-history';
    const cached = this.performanceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    // Fetch from Redis
    const performanceData = {};
    const agents = await context.redis.keys('metrics:agent:*');

    for (const key of agents) {
      const agentId = key.split(':')[2];
      const metrics = await context.redis.hGetAll(key);
      
      performanceData[agentId] = {
        totalTasks: parseInt(metrics.totalTasks || 0),
        successfulTasks: parseInt(metrics.successfulTasks || 0),
        totalDuration: parseFloat(metrics.totalDuration || 0),
        avgDuration: metrics.totalTasks > 0 ? 
          parseFloat(metrics.totalDuration) / parseInt(metrics.totalTasks) : 0,
        successRate: metrics.totalTasks > 0 ?
          parseInt(metrics.successfulTasks) / parseInt(metrics.totalTasks) : 0
      };
    }

    // Cache the results
    this.performanceCache.set(cacheKey, {
      timestamp: Date.now(),
      data: performanceData
    });

    return performanceData;
  }

  async calculateAgentScores(taskAnalysis, agentStates, performanceData) {
    const scores = [];

    for (const [agentId, state] of Object.entries(agentStates)) {
      if (state.status !== 'active' && state.status !== 'idle') {
        continue; // Skip unavailable agents
      }

      const score = {
        agentId,
        model: state.model,
        total: 0,
        breakdown: {
          capability: 0,
          performance: 0,
          availability: 0,
          cost: 0
        }
      };

      // Capability match score (0-40 points)
      score.breakdown.capability = this.calculateCapabilityScore(
        taskAnalysis,
        state.capabilities
      );

      // Historical performance score (0-30 points)
      score.breakdown.performance = this.calculatePerformanceScore(
        agentId,
        performanceData[agentId] || {},
        taskAnalysis.category
      );

      // Availability score (0-20 points)
      score.breakdown.availability = this.calculateAvailabilityScore(state);

      // Cost efficiency score (0-10 points)
      score.breakdown.cost = this.calculateCostScore(
        taskAnalysis,
        state.capabilities
      );

      // Calculate total score
      score.total = Object.values(score.breakdown).reduce((a, b) => a + b, 0);
      scores.push(score);
    }

    // Sort by total score descending
    scores.sort((a, b) => b.total - a.total);

    return scores;
  }

  calculateCapabilityScore(taskAnalysis, capabilities) {
    if (!capabilities.strengths) return 0;

    let score = 0;
    const maxScore = 40;

    // Check category match
    if (capabilities.strengths.includes(taskAnalysis.category)) {
      score += 20;
    }

    // Check keyword matches
    for (const keyword of taskAnalysis.keywords) {
      if (capabilities.strengths.includes(keyword)) {
        score += 5;
      }
    }

    // Check token limit
    if (taskAnalysis.estimatedTokens <= capabilities.tokenLimit) {
      score += 10;
    } else {
      score -= 10; // Penalty for insufficient token limit
    }

    return Math.min(maxScore, Math.max(0, score));
  }

  calculatePerformanceScore(agentId, performance, category) {
    const maxScore = 30;
    let score = 0;

    // Success rate (0-15 points)
    if (performance.successRate !== undefined) {
      score += performance.successRate * 15;
    }

    // Response time (0-15 points)
    if (performance.avgDuration) {
      // Lower duration is better
      const durationScore = Math.max(0, 15 - (performance.avgDuration / 1000));
      score += durationScore;
    }

    return Math.min(maxScore, Math.max(0, score));
  }

  calculateAvailabilityScore(state) {
    const maxScore = 20;
    let score = maxScore;

    // Deduct points based on load
    score -= state.load * 10;

    // Deduct points based on queue depth
    score -= Math.min(10, state.queueDepth * 2);

    // Bonus for recently active
    const timeSinceActive = Date.now() - state.lastActive;
    if (timeSinceActive < 60000) { // Active in last minute
      score += 5;
    }

    return Math.min(maxScore, Math.max(0, score));
  }

  calculateCostScore(taskAnalysis, capabilities) {
    if (!capabilities.costPerToken) return 5; // Default middle score

    const estimatedCost = taskAnalysis.estimatedTokens * capabilities.costPerToken;
    
    // Lower cost is better
    if (estimatedCost < 0.1) return 10;
    if (estimatedCost < 0.5) return 8;
    if (estimatedCost < 1.0) return 6;
    if (estimatedCost < 5.0) return 4;
    return 2;
  }

  selectOptimalAgent(scores, context) {
    if (scores.length === 0) {
      return {
        primary: null,
        fallbacks: [],
        reason: 'No available agents'
      };
    }

    const primary = scores[0];
    const fallbacks = scores.slice(1, 4); // Top 3 fallbacks

    // Generate reasoning
    const reason = this.generateRoutingReason(primary, context);

    return {
      primary: {
        agentId: primary.agentId,
        model: primary.model,
        score: primary.total,
        confidence: this.calculateConfidence(primary, scores)
      },
      fallbacks: fallbacks.map(f => ({
        agentId: f.agentId,
        model: f.model,
        score: f.total
      })),
      reason
    };
  }

  generateRoutingReason(agent, context) {
    const reasons = [];

    if (agent.breakdown.capability >= 30) {
      reasons.push('strong capability match');
    }

    if (agent.breakdown.performance >= 20) {
      reasons.push('excellent historical performance');
    }

    if (agent.breakdown.availability >= 15) {
      reasons.push('high availability');
    }

    if (agent.breakdown.cost >= 8) {
      reasons.push('cost efficient');
    }

    return reasons.length > 0 ? 
      `Selected ${agent.model} due to: ${reasons.join(', ')}` :
      `Selected ${agent.model} as best available option`;
  }

  calculateConfidence(primary, allScores) {
    if (allScores.length === 1) return 1.0;

    const secondBest = allScores[1];
    const scoreDiff = primary.total - secondBest.total;
    const maxPossibleScore = 100;

    // Confidence based on score difference
    return Math.min(1.0, scoreDiff / (maxPossibleScore * 0.2));
  }

  async logRoutingDecision(context, decision) {
    const logEntry = {
      timestamp: Date.now(),
      taskId: context.task.id,
      analysis: decision.taskAnalysis,
      recommendation: decision.recommendation,
      scores: decision.agentScores.slice(0, 5) // Top 5 only
    };

    // Store routing decision
    const key = `routing:decision:${context.task.id}`;
    await context.redis.setEx(key, 86400, JSON.stringify(logEntry)); // 24 hour TTL

    // Update routing statistics
    if (decision.recommendation.primary) {
      const statsKey = `routing:stats:${decision.recommendation.primary.model}`;
      await context.redis.hIncrBy(statsKey, 'routed', 1);
      await context.redis.hIncrByFloat(
        statsKey, 
        'totalConfidence', 
        decision.recommendation.primary.confidence
      );
    }
  }
}

module.exports = PredictiveRouter;