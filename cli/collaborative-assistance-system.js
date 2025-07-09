const Redis = require('ioredis');
const CommandServiceCoordinator = require('./command-service-coordinator');
const AgentCoordination = require('./agent-coordination');

/**
 * Collaborative Assistance System
 * 
 * Enables agents to help each other by sharing knowledge and providing assistance
 * without interfering with each other's work files, services, or versions.
 */
class CollaborativeAssistanceSystem {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.agentId = process.env.AGENT_ID || `agent_${Date.now()}`;
    this.commandCoordinator = new CommandServiceCoordinator();
    this.agentCoordination = new AgentCoordination();
    
    // Define assistance types
    this.assistanceTypes = {
      code_review: {
        description: 'Review code without modifying files',
        permissions: ['read_files', 'suggest_improvements', 'identify_issues']
      },
      debugging: {
        description: 'Help debug issues by analyzing logs and providing suggestions',
        permissions: ['read_logs', 'suggest_fixes', 'run_diagnostic_commands']
      },
      documentation: {
        description: 'Help with documentation and explanations',
        permissions: ['read_code', 'generate_docs', 'explain_functionality']
      },
      testing: {
        description: 'Assist with testing strategies and test creation',
        permissions: ['read_tests', 'suggest_test_cases', 'analyze_coverage']
      },
      optimization: {
        description: 'Suggest performance optimizations',
        permissions: ['analyze_performance', 'suggest_optimizations', 'benchmark_recommendations']
      },
      knowledge_sharing: {
        description: 'Share knowledge about specific technologies or patterns',
        permissions: ['share_knowledge', 'provide_examples', 'explain_concepts']
      }
    };
    
    // Agent capabilities and expertise
    this.agentExpertise = {
      claude: ['architecture', 'code_review', 'documentation', 'optimization', 'security'],
      gpt: ['backend_logic', 'api_design', 'debugging', 'testing', 'implementation'],
      deepseek: ['testing', 'validation', 'debugging', 'optimization', 'devops'],
      mistral: ['documentation', 'knowledge_sharing', 'analysis', 'explanation'],
      gemini: ['analysis', 'optimization', 'performance', 'code_review', 'patterns']
    };
    
    this.activeAssistanceProviders = new Map();
    this.assistanceQueue = new Map();
    
    this.setupEventHandlers();
  }

  /**
   * Initialize the assistance system
   */
  async initialize() {
    console.log(`🤝 Initializing Collaborative Assistance System for ${this.agentId}`);
    
    // Register as assistance provider
    await this.registerAsAssistanceProvider();
    
    // Start monitoring assistance requests
    await this.startAssistanceMonitoring();
    
    // Start assistance queue processor
    this.startAssistanceQueueProcessor();
    
    console.log(`✅ Collaborative Assistance System initialized`);
  }

  /**
   * Register this agent as an assistance provider
   */
  async registerAsAssistanceProvider() {
    const agentType = this.agentId.split('_')[0];
    const expertise = this.agentExpertise[agentType] || [];
    
    await this.redis.hset(`assistance_providers:${this.agentId}`, {
      agent_id: this.agentId,
      agent_type: agentType,
      expertise: JSON.stringify(expertise),
      status: 'available',
      registered_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    });
    
    // Set expiration for auto-cleanup
    await this.redis.expire(`assistance_providers:${this.agentId}`, 3600);
    
    // Announce availability
    await this.redis.publish('assistance_system', JSON.stringify({
      type: 'provider_registered',
      agent_id: this.agentId,
      agent_type: agentType,
      expertise: expertise,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Request assistance from other agents
   */
  async requestAssistance(assistanceType, details = {}) {
    const requestId = `assist_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate assistance type
    if (!this.assistanceTypes[assistanceType]) {
      return {
        success: false,
        message: `Unknown assistance type: ${assistanceType}`
      };
    }
    
    // Find suitable assistance providers
    const providers = await this.findAssistanceProviders(assistanceType);
    
    if (providers.length === 0) {
      return {
        success: false,
        message: `No available assistance providers for ${assistanceType}`
      };
    }
    
    // Store assistance request
    await this.redis.hset(`assistance_request:${requestId}`, {
      requesting_agent: this.agentId,
      assistance_type: assistanceType,
      details: JSON.stringify(details),
      status: 'pending',
      created_at: new Date().toISOString(),
      suitable_providers: JSON.stringify(providers.map(p => p.agent_id))
    });
    
    // Notify suitable providers
    for (const provider of providers) {
      await this.redis.lpush(`assistance_queue:${provider.agent_id}`, JSON.stringify({
        request_id: requestId,
        requesting_agent: this.agentId,
        assistance_type: assistanceType,
        details: details,
        timestamp: new Date().toISOString()
      }));
    }
    
    // Publish to assistance system
    await this.redis.publish('assistance_system', JSON.stringify({
      type: 'assistance_requested',
      request_id: requestId,
      requesting_agent: this.agentId,
      assistance_type: assistanceType,
      providers_notified: providers.length,
      timestamp: new Date().toISOString()
    }));
    
    return {
      success: true,
      request_id: requestId,
      providers_notified: providers.length,
      message: `Assistance requested for ${assistanceType}`
    };
  }

  /**
   * Find suitable assistance providers
   */
  async findAssistanceProviders(assistanceType) {
    const providers = [];
    const providerKeys = await this.redis.keys('assistance_providers:*');
    
    for (const key of providerKeys) {
      const provider = await this.redis.hgetall(key);
      if (provider.agent_id && provider.agent_id !== this.agentId) {
        const expertise = JSON.parse(provider.expertise || '[]');
        
        // Check if provider has relevant expertise
        if (expertise.includes(assistanceType) || 
            expertise.some(exp => assistanceType.includes(exp))) {
          providers.push({
            agent_id: provider.agent_id,
            agent_type: provider.agent_type,
            expertise: expertise,
            status: provider.status
          });
        }
      }
    }
    
    // Sort by expertise relevance
    return providers.sort((a, b) => {
      const aRelevance = a.expertise.filter(exp => 
        assistanceType.includes(exp) || exp.includes(assistanceType)
      ).length;
      const bRelevance = b.expertise.filter(exp => 
        assistanceType.includes(exp) || exp.includes(assistanceType)
      ).length;
      return bRelevance - aRelevance;
    });
  }

  /**
   * Provide assistance to another agent
   */
  async provideAssistance(requestId, assistanceData = {}) {
    const requestKey = `assistance_request:${requestId}`;
    const request = await this.redis.hgetall(requestKey);
    
    if (!request.requesting_agent) {
      return {
        success: false,
        message: 'Assistance request not found'
      };
    }
    
    // Create assistance session
    const sessionId = `assist_session_${Date.now()}`;
    await this.redis.hset(`assistance_session:${sessionId}`, {
      request_id: requestId,
      requesting_agent: request.requesting_agent,
      assisting_agent: this.agentId,
      assistance_type: request.assistance_type,
      started_at: new Date().toISOString(),
      status: 'active',
      assistance_data: JSON.stringify(assistanceData)
    });
    
    // Update request status
    await this.redis.hset(requestKey, {
      status: 'in_progress',
      assisting_agent: this.agentId,
      session_id: sessionId,
      started_at: new Date().toISOString()
    });
    
    // Notify requesting agent
    await this.redis.lpush(`messages:${request.requesting_agent}`, JSON.stringify({
      type: 'assistance_started',
      from: this.agentId,
      request_id: requestId,
      session_id: sessionId,
      assistance_type: request.assistance_type,
      timestamp: new Date().toISOString()
    }));
    
    // Publish to assistance system
    await this.redis.publish('assistance_system', JSON.stringify({
      type: 'assistance_started',
      request_id: requestId,
      session_id: sessionId,
      requesting_agent: request.requesting_agent,
      assisting_agent: this.agentId,
      assistance_type: request.assistance_type,
      timestamp: new Date().toISOString()
    }));
    
    return {
      success: true,
      session_id: sessionId,
      message: `Assistance session started for ${request.assistance_type}`
    };
  }

  /**
   * Provide non-intrusive code review
   */
  async provideCodeReview(filePath, reviewContext = {}) {
    // Only read the file, never modify
    const fileContent = await this.readFileForReview(filePath);
    
    if (!fileContent) {
      return {
        success: false,
        message: `Cannot read file: ${filePath}`
      };
    }
    
    // Analyze code without modifying anything
    const review = await this.analyzeCode(fileContent, reviewContext);
    
    // Log the review activity
    await this.logAssistanceActivity('code_review', {
      file: filePath,
      review_points: review.issues.length,
      suggestions: review.suggestions.length
    });
    
    return {
      success: true,
      type: 'code_review',
      file: filePath,
      review: review,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Provide debugging assistance
   */
  async provideDebuggingAssistance(logData, context = {}) {
    const analysis = await this.analyzeLogsForDebugging(logData);
    
    // Log the debugging activity
    await this.logAssistanceActivity('debugging', {
      log_entries_analyzed: logData.length,
      issues_identified: analysis.issues.length,
      suggestions_provided: analysis.suggestions.length
    });
    
    return {
      success: true,
      type: 'debugging',
      analysis: analysis,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Share knowledge without interfering
   */
  async shareKnowledge(topic, requestingAgent, context = {}) {
    const knowledge = await this.generateKnowledgeResponse(topic, context);
    
    // Send knowledge directly to requesting agent
    await this.redis.lpush(`messages:${requestingAgent}`, JSON.stringify({
      type: 'knowledge_shared',
      from: this.agentId,
      topic: topic,
      knowledge: knowledge,
      timestamp: new Date().toISOString()
    }));
    
    // Log the knowledge sharing
    await this.logAssistanceActivity('knowledge_sharing', {
      topic: topic,
      recipient: requestingAgent,
      knowledge_points: knowledge.points.length
    });
    
    return {
      success: true,
      type: 'knowledge_sharing',
      topic: topic,
      knowledge: knowledge,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Monitor what other agents are doing without interfering
   */
  async monitorAgentActivities() {
    const activities = await this.commandCoordinator.getAgentActivities();
    
    // Identify agents that might need assistance
    const assistanceOpportunities = [];
    
    for (const [commandHash, activity] of Object.entries(activities.exclusive_commands)) {
      if (activity.agent !== this.agentId) {
        // Check if command has been running for a long time
        const startTime = new Date(activity.started_at);
        const runningTime = Date.now() - startTime.getTime();
        
        if (runningTime > 300000) { // 5 minutes
          assistanceOpportunities.push({
            agent: activity.agent,
            command: activity.command,
            running_time: runningTime,
            assistance_type: this.suggestAssistanceType(activity.command)
          });
        }
      }
    }
    
    // Offer assistance to agents with long-running commands
    for (const opportunity of assistanceOpportunities) {
      await this.offerProactiveAssistance(opportunity);
    }
    
    return {
      activities: activities,
      assistance_opportunities: assistanceOpportunities
    };
  }

  /**
   * Offer proactive assistance
   */
  async offerProactiveAssistance(opportunity) {
    const assistanceType = opportunity.assistance_type;
    
    // Check if we have expertise in this area
    const agentType = this.agentId.split('_')[0];
    const expertise = this.agentExpertise[agentType] || [];
    
    if (expertise.includes(assistanceType)) {
      await this.redis.lpush(`messages:${opportunity.agent}`, JSON.stringify({
        type: 'proactive_assistance_offer',
        from: this.agentId,
        assistance_type: assistanceType,
        reason: `Your ${opportunity.command} has been running for ${Math.round(opportunity.running_time / 60000)} minutes`,
        timestamp: new Date().toISOString()
      }));
      
      console.log(`🤝 Offered proactive assistance to ${opportunity.agent} for ${assistanceType}`);
    }
  }

  /**
   * Suggest assistance type based on command
   */
  suggestAssistanceType(command) {
    if (command.includes('npm install') || command.includes('npm update')) {
      return 'debugging';
    } else if (command.includes('docker-compose') || command.includes('docker')) {
      return 'devops';
    } else if (command.includes('git') || command.includes('commit')) {
      return 'code_review';
    } else if (command.includes('test') || command.includes('jest')) {
      return 'testing';
    } else {
      return 'knowledge_sharing';
    }
  }

  /**
   * Start assistance queue processor
   */
  startAssistanceQueueProcessor() {
    setInterval(async () => {
      try {
        const queueKey = `assistance_queue:${this.agentId}`;
        const request = await this.redis.rpop(queueKey);
        
        if (request) {
          const requestData = JSON.parse(request);
          await this.processAssistanceRequest(requestData);
        }
      } catch (error) {
        console.error('Error processing assistance queue:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Process assistance request
   */
  async processAssistanceRequest(requestData) {
    console.log(`📝 Processing assistance request: ${requestData.assistance_type} from ${requestData.requesting_agent}`);
    
    // Decide whether to accept based on current workload
    const shouldAccept = await this.shouldAcceptAssistanceRequest(requestData);
    
    if (shouldAccept) {
      await this.provideAssistance(requestData.request_id, {
        auto_accepted: true,
        acceptance_reason: 'Available and qualified'
      });
    } else {
      console.log(`⚠️  Declining assistance request due to workload`);
    }
  }

  /**
   * Determine if should accept assistance request
   */
  async shouldAcceptAssistanceRequest(requestData) {
    // Check current workload
    const myCommands = await this.redis.keys(`command_lock:*`);
    const myCommandCount = myCommands.filter(async (key) => {
      const owner = await this.redis.get(key);
      return owner === this.agentId;
    }).length;
    
    // Accept if not too busy (less than 3 exclusive commands)
    return myCommandCount < 3;
  }

  /**
   * Log assistance activity
   */
  async logAssistanceActivity(assistanceType, details) {
    await this.redis.lpush('assistance_activity_log', JSON.stringify({
      agent: this.agentId,
      assistance_type: assistanceType,
      details: details,
      timestamp: new Date().toISOString()
    }));
    
    // Keep only last 1000 entries
    await this.redis.ltrim('assistance_activity_log', 0, 999);
  }

  /**
   * Helper methods for analysis
   */
  async readFileForReview(filePath) {
    try {
      const fs = require('fs').promises;
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  async analyzeCode(code, context) {
    // Simple code analysis - can be enhanced with more sophisticated analysis
    const issues = [];
    const suggestions = [];
    
    // Check for common issues
    if (code.includes('console.log') && context.environment === 'production') {
      issues.push('Console logs found in production code');
    }
    
    if (code.includes('TODO') || code.includes('FIXME')) {
      issues.push('TODO/FIXME comments found');
    }
    
    if (code.length > 10000) {
      suggestions.push('Consider breaking down large files into smaller modules');
    }
    
    return { issues, suggestions };
  }

  async analyzeLogsForDebugging(logData) {
    const issues = [];
    const suggestions = [];
    
    // Analyze log entries for common issues
    logData.forEach(entry => {
      if (entry.includes('ERROR') || entry.includes('error')) {
        issues.push(`Error found: ${entry}`);
      }
      if (entry.includes('timeout') || entry.includes('TIMEOUT')) {
        suggestions.push('Consider increasing timeout values');
      }
    });
    
    return { issues, suggestions };
  }

  async generateKnowledgeResponse(topic, context) {
    // Generate knowledge based on topic
    return {
      topic: topic,
      points: [
        `General information about ${topic}`,
        `Best practices for ${topic}`,
        `Common pitfalls to avoid with ${topic}`
      ],
      resources: [
        `Documentation for ${topic}`,
        `Community resources for ${topic}`
      ]
    };
  }

  /**
   * Start monitoring assistance requests
   */
  async startAssistanceMonitoring() {
    const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    await subscriber.subscribe('assistance_system');
    
    subscriber.on('message', async (channel, message) => {
      try {
        const data = JSON.parse(message);
        await this.handleAssistanceSystemEvent(data);
      } catch (error) {
        console.error('Error handling assistance system event:', error);
      }
    });
  }

  /**
   * Handle assistance system events
   */
  async handleAssistanceSystemEvent(data) {
    if (data.type === 'assistance_requested' && data.requesting_agent !== this.agentId) {
      console.log(`🔔 Assistance requested: ${data.assistance_type} by ${data.requesting_agent}`);
    } else if (data.type === 'assistance_started' && data.requesting_agent === this.agentId) {
      console.log(`✅ Assistance started by ${data.assisting_agent} for ${data.assistance_type}`);
    }
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    process.on('SIGINT', async () => {
      await this.shutdown();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await this.shutdown();
      process.exit(0);
    });
  }

  /**
   * Shutdown assistance system
   */
  async shutdown() {
    console.log(`🛑 Shutting down Collaborative Assistance System for ${this.agentId}`);
    
    // Unregister as assistance provider
    await this.redis.del(`assistance_providers:${this.agentId}`);
    
    // Complete any active assistance sessions
    const sessionKeys = await this.redis.keys(`assistance_session:*`);
    for (const key of sessionKeys) {
      const session = await this.redis.hgetall(key);
      if (session.assisting_agent === this.agentId) {
        await this.redis.hset(key, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_reason: 'Agent shutdown'
        });
      }
    }
    
    console.log(`✅ Collaborative Assistance System shutdown complete`);
  }
}

module.exports = CollaborativeAssistanceSystem;