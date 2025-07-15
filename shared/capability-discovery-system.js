const EventEmitter = require('events');
const crypto = require('crypto');

/**
 * Capability Discovery and Matching System
 * Automatically discovers agent capabilities and matches them to tasks
 * Supports dynamic capability registration and intelligent routing
 */
class CapabilityDiscoverySystem extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      discoveryInterval: config.discoveryInterval || 30000, // 30 seconds
      capabilityTimeout: config.capabilityTimeout || 300000, // 5 minutes
      matchingThreshold: config.matchingThreshold || 0.7,
      learningEnabled: config.learningEnabled !== false,
      ...config
    };

    this.capabilities = new Map();
    this.agentCapabilities = new Map();
    this.capabilityProviders = new Map();
    this.taskHistory = new Map();
    this.capabilityScores = new Map();
    this.discoveryHandlers = new Map();
    
    this.initializeSystem();
  }

  initializeSystem() {
    // Initialize standard capabilities
    this.initializeStandardCapabilities();
    
    // Start discovery process
    this.startDiscoveryProcess();
    
    // Initialize learning system
    if (this.config.learningEnabled) {
      this.initializeLearningSystem();
    }
  }

  /**
   * Initialize standard capability definitions
   */
  initializeStandardCapabilities() {
    const standardCapabilities = {
      // Language capabilities
      'language.generation': {
        name: 'Text Generation',
        description: 'Generate human-like text content',
        category: 'language',
        parameters: ['style', 'tone', 'length', 'format'],
        requiredSkills: ['nlp', 'creativity']
      },
      'language.translation': {
        name: 'Language Translation',
        description: 'Translate text between languages',
        category: 'language',
        parameters: ['source_language', 'target_language'],
        requiredSkills: ['multilingual', 'nlp']
      },
      'language.summarization': {
        name: 'Text Summarization',
        description: 'Create concise summaries of text',
        category: 'language',
        parameters: ['length', 'style', 'focus'],
        requiredSkills: ['comprehension', 'synthesis']
      },

      // Code capabilities
      'code.generation': {
        name: 'Code Generation',
        description: 'Generate code in various languages',
        category: 'coding',
        parameters: ['language', 'framework', 'style'],
        requiredSkills: ['programming', 'syntax']
      },
      'code.review': {
        name: 'Code Review',
        description: 'Review and analyze code quality',
        category: 'coding',
        parameters: ['language', 'standards', 'focus'],
        requiredSkills: ['programming', 'best_practices', 'security']
      },
      'code.refactoring': {
        name: 'Code Refactoring',
        description: 'Improve code structure and quality',
        category: 'coding',
        parameters: ['language', 'goals', 'constraints'],
        requiredSkills: ['programming', 'design_patterns', 'optimization']
      },
      'code.debugging': {
        name: 'Code Debugging',
        description: 'Identify and fix code issues',
        category: 'coding',
        parameters: ['language', 'error_type', 'context'],
        requiredSkills: ['programming', 'problem_solving', 'testing']
      },

      // Analysis capabilities
      'analysis.data': {
        name: 'Data Analysis',
        description: 'Analyze and interpret data',
        category: 'analysis',
        parameters: ['data_type', 'metrics', 'visualization'],
        requiredSkills: ['statistics', 'data_science', 'visualization']
      },
      'analysis.sentiment': {
        name: 'Sentiment Analysis',
        description: 'Analyze emotional tone and sentiment',
        category: 'analysis',
        parameters: ['granularity', 'aspects'],
        requiredSkills: ['nlp', 'psychology', 'classification']
      },
      'analysis.security': {
        name: 'Security Analysis',
        description: 'Analyze security vulnerabilities',
        category: 'analysis',
        parameters: ['scope', 'standards', 'severity'],
        requiredSkills: ['security', 'vulnerability_assessment', 'risk_analysis']
      },

      // Creative capabilities
      'creative.writing': {
        name: 'Creative Writing',
        description: 'Create original written content',
        category: 'creative',
        parameters: ['genre', 'style', 'length'],
        requiredSkills: ['creativity', 'storytelling', 'language']
      },
      'creative.ideation': {
        name: 'Idea Generation',
        description: 'Generate creative ideas and solutions',
        category: 'creative',
        parameters: ['domain', 'constraints', 'quantity'],
        requiredSkills: ['creativity', 'brainstorming', 'innovation']
      },

      // Research capabilities
      'research.web': {
        name: 'Web Research',
        description: 'Research information from web sources',
        category: 'research',
        parameters: ['topic', 'depth', 'sources'],
        requiredSkills: ['research', 'web_scraping', 'synthesis']
      },
      'research.academic': {
        name: 'Academic Research',
        description: 'Conduct academic-level research',
        category: 'research',
        parameters: ['field', 'methodology', 'citations'],
        requiredSkills: ['research', 'academic_writing', 'critical_thinking']
      },

      // Specialized capabilities
      'specialized.legal': {
        name: 'Legal Analysis',
        description: 'Analyze legal documents and issues',
        category: 'specialized',
        parameters: ['jurisdiction', 'area', 'document_type'],
        requiredSkills: ['legal', 'research', 'analysis']
      },
      'specialized.medical': {
        name: 'Medical Information',
        description: 'Provide medical information and analysis',
        category: 'specialized',
        parameters: ['specialty', 'context', 'evidence_level'],
        requiredSkills: ['medical', 'research', 'ethics']
      },
      'specialized.financial': {
        name: 'Financial Analysis',
        description: 'Analyze financial data and trends',
        category: 'specialized',
        parameters: ['market', 'instruments', 'timeframe'],
        requiredSkills: ['finance', 'analysis', 'mathematics']
      },

      // Technical capabilities
      'technical.api': {
        name: 'API Integration',
        description: 'Integrate with external APIs',
        category: 'technical',
        parameters: ['protocol', 'authentication', 'format'],
        requiredSkills: ['programming', 'networking', 'integration']
      },
      'technical.database': {
        name: 'Database Operations',
        description: 'Work with databases',
        category: 'technical',
        parameters: ['type', 'operations', 'optimization'],
        requiredSkills: ['sql', 'database_design', 'optimization']
      },
      'technical.devops': {
        name: 'DevOps Operations',
        description: 'Handle DevOps and infrastructure tasks',
        category: 'technical',
        parameters: ['platform', 'tools', 'automation'],
        requiredSkills: ['devops', 'scripting', 'cloud']
      }
    };

    // Register all standard capabilities
    for (const [id, capability] of Object.entries(standardCapabilities)) {
      this.registerCapability(id, capability);
    }
  }

  /**
   * Register a capability
   */
  registerCapability(capabilityId, definition) {
    const capability = {
      id: capabilityId,
      ...definition,
      registeredAt: Date.now(),
      version: definition.version || '1.0',
      providers: new Set(),
      usage: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0
      }
    };

    this.capabilities.set(capabilityId, capability);
    
    console.log(`Capability System: Registered capability ${capabilityId}`);
    this.emit('capabilityRegistered', { capabilityId, capability });
  }

  /**
   * Register agent capabilities
   */
  async registerAgentCapabilities(agentId, agentConfig) {
    const agentCapabilitySet = {
      agentId,
      agentType: agentConfig.type,
      provider: agentConfig.provider,
      registeredAt: Date.now(),
      capabilities: new Map(),
      metadata: agentConfig.metadata || {}
    };

    // Process declared capabilities
    for (const capabilityId of agentConfig.capabilities || []) {
      const capability = this.capabilities.get(capabilityId);
      if (capability) {
        const agentCapability = {
          capabilityId,
          proficiency: agentConfig.proficiencies?.[capabilityId] || 0.8,
          constraints: agentConfig.constraints?.[capabilityId] || {},
          performance: {
            successRate: 1.0,
            avgResponseTime: 0,
            taskCount: 0
          }
        };
        
        agentCapabilitySet.capabilities.set(capabilityId, agentCapability);
        capability.providers.add(agentId);
      }
    }

    // Discover additional capabilities if enabled
    if (agentConfig.autoDiscover !== false) {
      const discoveredCapabilities = await this.discoverAgentCapabilities(agentId, agentConfig);
      for (const [capId, cap] of discoveredCapabilities) {
        if (!agentCapabilitySet.capabilities.has(capId)) {
          agentCapabilitySet.capabilities.set(capId, cap);
          this.capabilities.get(capId)?.providers.add(agentId);
        }
      }
    }

    this.agentCapabilities.set(agentId, agentCapabilitySet);
    
    console.log(`Capability System: Registered ${agentCapabilitySet.capabilities.size} capabilities for agent ${agentId}`);
    this.emit('agentCapabilitiesRegistered', { agentId, capabilities: Array.from(agentCapabilitySet.capabilities.keys()) });
    
    return agentCapabilitySet;
  }

  /**
   * Discover agent capabilities through testing
   */
  async discoverAgentCapabilities(agentId, agentConfig) {
    const discovered = new Map();
    
    // Test against standard capability probes
    for (const [capId, capability] of this.capabilities) {
      if (agentConfig.capabilities?.includes(capId)) continue; // Skip declared ones
      
      const probe = this.createCapabilityProbe(capId, capability);
      const result = await this.testCapability(agentId, probe);
      
      if (result.capable && result.confidence > this.config.matchingThreshold) {
        discovered.set(capId, {
          capabilityId: capId,
          proficiency: result.confidence,
          constraints: result.constraints || {},
          discovered: true,
          performance: {
            successRate: 1.0,
            avgResponseTime: result.responseTime,
            taskCount: 0
          }
        });
      }
    }
    
    return discovered;
  }

  /**
   * Create capability probe for testing
   */
  createCapabilityProbe(capabilityId, capability) {
    const probes = {
      'code.generation': {
        test: 'Write a simple hello world function',
        expectedPatterns: ['function', 'def', 'const', 'return'],
        timeout: 5000
      },
      'language.translation': {
        test: 'Translate "Hello" to Spanish',
        expectedPatterns: ['hola', 'spanish', 'español'],
        timeout: 3000
      },
      'analysis.sentiment': {
        test: 'What is the sentiment of: "I love this product!"',
        expectedPatterns: ['positive', 'happy', 'favorable'],
        timeout: 3000
      }
    };
    
    return probes[capabilityId] || {
      test: `Can you ${capability.description}?`,
      expectedPatterns: [],
      timeout: 5000
    };
  }

  /**
   * Test agent capability
   */
  async testCapability(agentId, probe) {
    // This would integrate with actual agent testing
    // For now, simulate testing
    return {
      capable: Math.random() > 0.3,
      confidence: Math.random() * 0.5 + 0.5,
      responseTime: Math.random() * probe.timeout,
      constraints: {}
    };
  }

  /**
   * Match task to capable agents
   */
  async matchTaskToAgents(task) {
    const requiredCapabilities = this.extractRequiredCapabilities(task);
    const candidateAgents = new Map();
    
    // Find agents with required capabilities
    for (const [agentId, agentCaps] of this.agentCapabilities) {
      const matchScore = this.calculateMatchScore(requiredCapabilities, agentCaps);
      
      if (matchScore.overall >= this.config.matchingThreshold) {
        candidateAgents.set(agentId, {
          agentId,
          matchScore,
          capabilities: agentCaps,
          ranking: this.calculateAgentRanking(agentId, task, matchScore)
        });
      }
    }
    
    // Sort by ranking
    const rankedAgents = Array.from(candidateAgents.values())
      .sort((a, b) => b.ranking - a.ranking);
    
    return {
      requiredCapabilities,
      candidateAgents: rankedAgents,
      bestMatch: rankedAgents[0] || null,
      alternatives: rankedAgents.slice(1, 5)
    };
  }

  /**
   * Extract required capabilities from task
   */
  extractRequiredCapabilities(task) {
    const required = new Set();
    const preferred = new Set();
    
    // Explicit requirements
    if (task.requiredCapabilities) {
      task.requiredCapabilities.forEach(cap => required.add(cap));
    }
    
    // Infer from task type
    const typeMapping = {
      'refactoring': ['code.refactoring', 'code.review'],
      'implementation': ['code.generation', 'code.debugging'],
      'analysis': ['analysis.data', 'code.review'],
      'documentation': ['language.generation', 'code.review'],
      'testing': ['code.generation', 'code.debugging'],
      'research': ['research.web', 'language.summarization'],
      'security': ['analysis.security', 'code.review']
    };
    
    if (task.type && typeMapping[task.type]) {
      typeMapping[task.type].forEach(cap => preferred.add(cap));
    }
    
    // Infer from content
    const content = (task.description || '') + ' ' + (task.content || '');
    const contentPatterns = {
      'code.generation': /write|create|implement|generate.*code/i,
      'code.review': /review|analyze|check.*code/i,
      'code.debugging': /debug|fix|error|bug/i,
      'language.translation': /translate|translation/i,
      'analysis.security': /security|vulnerability|exploit/i,
      'research.web': /research|find|search|look up/i
    };
    
    for (const [cap, pattern] of Object.entries(contentPatterns)) {
      if (pattern.test(content)) {
        preferred.add(cap);
      }
    }
    
    return {
      required: Array.from(required),
      preferred: Array.from(preferred),
      all: Array.from(new Set([...required, ...preferred]))
    };
  }

  /**
   * Calculate match score
   */
  calculateMatchScore(requiredCapabilities, agentCapabilities) {
    let requiredScore = 0;
    let preferredScore = 0;
    let requiredCount = 0;
    let preferredCount = 0;
    
    // Check required capabilities
    for (const cap of requiredCapabilities.required) {
      requiredCount++;
      const agentCap = agentCapabilities.capabilities.get(cap);
      if (agentCap) {
        requiredScore += agentCap.proficiency;
      }
    }
    
    // Check preferred capabilities
    for (const cap of requiredCapabilities.preferred) {
      preferredCount++;
      const agentCap = agentCapabilities.capabilities.get(cap);
      if (agentCap) {
        preferredScore += agentCap.proficiency;
      }
    }
    
    // Calculate overall score
    const requiredMatch = requiredCount > 0 ? requiredScore / requiredCount : 1;
    const preferredMatch = preferredCount > 0 ? preferredScore / preferredCount : 0;
    
    // Required capabilities are mandatory
    if (requiredCount > 0 && requiredMatch < 1) {
      return {
        overall: 0,
        required: requiredMatch,
        preferred: preferredMatch
      };
    }
    
    return {
      overall: requiredMatch * 0.7 + preferredMatch * 0.3,
      required: requiredMatch,
      preferred: preferredMatch
    };
  }

  /**
   * Calculate agent ranking for task
   */
  calculateAgentRanking(agentId, task, matchScore) {
    const agentCaps = this.agentCapabilities.get(agentId);
    if (!agentCaps) return 0;
    
    let ranking = matchScore.overall * 100;
    
    // Factor in performance history
    const taskKey = this.getTaskKey(task);
    const history = this.taskHistory.get(`${agentId}:${taskKey}`) || {};
    
    if (history.successRate !== undefined) {
      ranking *= history.successRate;
    }
    
    // Factor in current load (if available)
    if (agentCaps.metadata.currentLoad !== undefined) {
      const loadFactor = 1 - (agentCaps.metadata.currentLoad / 100);
      ranking *= loadFactor;
    }
    
    // Factor in response time
    let avgResponseTime = 0;
    let capCount = 0;
    
    for (const cap of agentCaps.capabilities.values()) {
      if (cap.performance.avgResponseTime > 0) {
        avgResponseTime += cap.performance.avgResponseTime;
        capCount++;
      }
    }
    
    if (capCount > 0) {
      const responseTimeFactor = Math.max(0.5, 1 - (avgResponseTime / capCount / 10000));
      ranking *= responseTimeFactor;
    }
    
    return ranking;
  }

  /**
   * Update capability performance
   */
  async updateCapabilityPerformance(agentId, capabilityId, result) {
    const agentCaps = this.agentCapabilities.get(agentId);
    if (!agentCaps) return;
    
    const capability = agentCaps.capabilities.get(capabilityId);
    if (!capability) return;
    
    // Update performance metrics
    const perf = capability.performance;
    perf.taskCount++;
    
    if (result.success) {
      perf.successRate = (perf.successRate * (perf.taskCount - 1) + 1) / perf.taskCount;
    } else {
      perf.successRate = (perf.successRate * (perf.taskCount - 1)) / perf.taskCount;
    }
    
    if (result.responseTime) {
      perf.avgResponseTime = (perf.avgResponseTime * (perf.taskCount - 1) + result.responseTime) / perf.taskCount;
    }
    
    // Update capability usage stats
    const cap = this.capabilities.get(capabilityId);
    if (cap) {
      cap.usage.totalRequests++;
      if (result.success) {
        cap.usage.successfulRequests++;
      } else {
        cap.usage.failedRequests++;
      }
    }
    
    // Store task history for learning
    if (this.config.learningEnabled) {
      this.updateTaskHistory(agentId, result.task, result);
    }
    
    this.emit('capabilityPerformanceUpdated', {
      agentId,
      capabilityId,
      performance: capability.performance
    });
  }

  /**
   * Update task history for learning
   */
  updateTaskHistory(agentId, task, result) {
    const taskKey = this.getTaskKey(task);
    const historyKey = `${agentId}:${taskKey}`;
    
    let history = this.taskHistory.get(historyKey) || {
      agentId,
      taskKey,
      attempts: 0,
      successes: 0,
      totalResponseTime: 0,
      patterns: {}
    };
    
    history.attempts++;
    if (result.success) {
      history.successes++;
    }
    
    if (result.responseTime) {
      history.totalResponseTime += result.responseTime;
    }
    
    history.successRate = history.successes / history.attempts;
    history.avgResponseTime = history.totalResponseTime / history.attempts;
    
    this.taskHistory.set(historyKey, history);
  }

  /**
   * Get task key for history tracking
   */
  getTaskKey(task) {
    // Create a normalized key for similar tasks
    const components = [
      task.type || 'general',
      task.category || 'default'
    ];
    
    // Add key capability requirements
    if (task.requiredCapabilities) {
      components.push(...task.requiredCapabilities.sort());
    }
    
    return components.join(':');
  }

  /**
   * Discover new capabilities from agent responses
   */
  async discoverNewCapability(agentId, taskResult) {
    if (!this.config.learningEnabled) return;
    
    // Analyze task and result for new capability patterns
    const patterns = this.analyzeCapabilityPatterns(taskResult);
    
    for (const pattern of patterns) {
      if (!this.capabilities.has(pattern.id)) {
        // Register new discovered capability
        this.registerCapability(pattern.id, {
          name: pattern.name,
          description: pattern.description,
          category: 'discovered',
          parameters: pattern.parameters,
          requiredSkills: pattern.skills,
          discoveredFrom: agentId,
          confidence: pattern.confidence
        });
        
        // Add to agent's capabilities
        const agentCaps = this.agentCapabilities.get(agentId);
        if (agentCaps) {
          agentCaps.capabilities.set(pattern.id, {
            capabilityId: pattern.id,
            proficiency: pattern.confidence,
            discovered: true,
            performance: {
              successRate: 1.0,
              avgResponseTime: taskResult.responseTime || 0,
              taskCount: 1
            }
          });
        }
      }
    }
  }

  /**
   * Analyze patterns for new capabilities
   */
  analyzeCapabilityPatterns(taskResult) {
    const patterns = [];
    
    // This would use more sophisticated analysis in production
    // For now, simple pattern matching
    
    if (taskResult.task && taskResult.result) {
      const taskContent = JSON.stringify(taskResult.task);
      const resultContent = JSON.stringify(taskResult.result);
      
      // Look for specialized patterns
      const specializedPatterns = {
        'blockchain': /blockchain|smart contract|web3|ethereum/i,
        'ml_training': /train|model|dataset|epochs|accuracy/i,
        'infrastructure': /terraform|kubernetes|docker|deployment/i,
        'data_pipeline': /etl|pipeline|transform|extract|load/i
      };
      
      for (const [type, pattern] of Object.entries(specializedPatterns)) {
        if (pattern.test(taskContent) && pattern.test(resultContent)) {
          patterns.push({
            id: `specialized.${type}`,
            name: `${type.replace('_', ' ')} Operations`,
            description: `Handle ${type.replace('_', ' ')} related tasks`,
            category: 'discovered',
            parameters: [],
            skills: [type],
            confidence: 0.7
          });
        }
      }
    }
    
    return patterns;
  }

  /**
   * Get capability recommendations
   */
  async getCapabilityRecommendations(task) {
    const recommendations = [];
    
    // Get current match
    const match = await this.matchTaskToAgents(task);
    
    // If no good matches, recommend capabilities to develop
    if (!match.bestMatch || match.bestMatch.matchScore.overall < 0.8) {
      const missingCapabilities = [];
      
      for (const cap of match.requiredCapabilities.all) {
        const capability = this.capabilities.get(cap);
        if (capability && capability.providers.size === 0) {
          missingCapabilities.push(capability);
        }
      }
      
      recommendations.push({
        type: 'develop_capabilities',
        message: 'Consider developing these capabilities',
        capabilities: missingCapabilities,
        priority: 'high'
      });
    }
    
    // Recommend load balancing if one agent is overused
    const capabilityUsage = new Map();
    for (const cap of match.requiredCapabilities.all) {
      const capability = this.capabilities.get(cap);
      if (capability) {
        for (const provider of capability.providers) {
          capabilityUsage.set(provider, (capabilityUsage.get(provider) || 0) + 1);
        }
      }
    }
    
    const maxUsage = Math.max(...capabilityUsage.values());
    if (maxUsage > capabilityUsage.size * 0.7) {
      recommendations.push({
        type: 'load_balance',
        message: 'Consider distributing capabilities across more agents',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  /**
   * Start discovery process
   */
  startDiscoveryProcess() {
    this.discoveryInterval = setInterval(() => {
      this.runDiscovery().catch(console.error);
    }, this.config.discoveryInterval);
  }

  /**
   * Run capability discovery
   */
  async runDiscovery() {
    // Re-test agent capabilities periodically
    for (const [agentId, agentCaps] of this.agentCapabilities) {
      // Skip if recently tested
      if (Date.now() - agentCaps.registeredAt < this.config.capabilityTimeout) {
        continue;
      }
      
      // Re-discover capabilities
      const discovered = await this.discoverAgentCapabilities(agentId, {
        type: agentCaps.agentType,
        provider: agentCaps.provider
      });
      
      // Merge with existing
      for (const [capId, cap] of discovered) {
        if (!agentCaps.capabilities.has(capId)) {
          agentCaps.capabilities.set(capId, cap);
          console.log(`Capability System: Discovered new capability ${capId} for agent ${agentId}`);
        }
      }
    }
  }

  /**
   * Initialize learning system
   */
  initializeLearningSystem() {
    // Set up pattern learning
    this.on('taskCompleted', async (event) => {
      await this.discoverNewCapability(event.agentId, event.result);
    });
    
    // Set up performance learning
    this.on('capabilityPerformanceUpdated', (event) => {
      this.updateCapabilityScores(event.agentId, event.capabilityId, event.performance);
    });
  }

  /**
   * Update capability scores based on performance
   */
  updateCapabilityScores(agentId, capabilityId, performance) {
    const key = `${agentId}:${capabilityId}`;
    let score = this.capabilityScores.get(key) || {
      agentId,
      capabilityId,
      score: 0.5,
      confidence: 0
    };
    
    // Update score based on performance
    const performanceScore = performance.successRate * (1 - performance.avgResponseTime / 10000);
    score.score = score.score * 0.9 + performanceScore * 0.1; // Exponential moving average
    score.confidence = Math.min(1, score.confidence + 0.01); // Increase confidence
    
    this.capabilityScores.set(key, score);
  }

  /**
   * Export capability map
   */
  exportCapabilityMap() {
    const capabilityMap = {
      capabilities: {},
      agents: {},
      mappings: []
    };
    
    // Export capabilities
    for (const [id, cap] of this.capabilities) {
      capabilityMap.capabilities[id] = {
        id,
        name: cap.name,
        description: cap.description,
        category: cap.category,
        providers: Array.from(cap.providers)
      };
    }
    
    // Export agent capabilities
    for (const [agentId, agentCaps] of this.agentCapabilities) {
      capabilityMap.agents[agentId] = {
        type: agentCaps.agentType,
        provider: agentCaps.provider,
        capabilities: Array.from(agentCaps.capabilities.keys())
      };
    }
    
    // Export mappings with scores
    for (const [key, score] of this.capabilityScores) {
      capabilityMap.mappings.push(score);
    }
    
    return capabilityMap;
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    const stats = {
      totalCapabilities: this.capabilities.size,
      totalAgents: this.agentCapabilities.size,
      capabilityCategories: {},
      agentProviders: {},
      topCapabilities: [],
      underutilizedCapabilities: []
    };
    
    // Count by category
    for (const cap of this.capabilities.values()) {
      stats.capabilityCategories[cap.category] = (stats.capabilityCategories[cap.category] || 0) + 1;
    }
    
    // Count by provider
    for (const agentCaps of this.agentCapabilities.values()) {
      stats.agentProviders[agentCaps.provider] = (stats.agentProviders[agentCaps.provider] || 0) + 1;
    }
    
    // Find top used capabilities
    const capUsage = Array.from(this.capabilities.values())
      .map(cap => ({
        id: cap.id,
        name: cap.name,
        usage: cap.usage.totalRequests,
        providers: cap.providers.size
      }))
      .sort((a, b) => b.usage - a.usage);
    
    stats.topCapabilities = capUsage.slice(0, 10);
    stats.underutilizedCapabilities = capUsage.filter(c => c.usage === 0).slice(0, 10);
    
    return stats;
  }

  /**
   * Shutdown
   */
  async shutdown() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    
    console.log('Capability Discovery System: Shutdown complete');
  }
}

module.exports = CapabilityDiscoverySystem;