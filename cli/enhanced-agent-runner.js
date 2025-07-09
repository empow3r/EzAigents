const Redis = require('ioredis');
const AgentCoordination = require('./agent-coordination');
const CommandServiceCoordinator = require('./command-service-coordinator');
const CollaborativeAssistanceSystem = require('./collaborative-assistance-system');
const QueueContextManager = require('./queue-context-manager');

/**
 * Enhanced Agent Runner
 * 
 * Integrates all coordination systems:
 * - File conflict prevention
 * - Command/service coordination
 * - Collaborative assistance
 * - Queue context management
 * 
 * Ensures agents check queue for context and additional tasks after completion.
 */
class EnhancedAgentRunner {
  constructor(agentType, agentCapabilities = []) {
    this.agentType = agentType;
    this.agentCapabilities = agentCapabilities;
    this.agentId = process.env.AGENT_ID || `${agentType}_${Date.now()}`;
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Initialize coordination systems
    this.agentCoordination = new AgentCoordination();
    this.commandCoordinator = new CommandServiceCoordinator();
    this.assistanceSystem = new CollaborativeAssistanceSystem();
    this.queueContextManager = new QueueContextManager();
    
    // Queue configuration
    this.queueName = this.getQueueName(agentType);
    this.processingQueue = `processing:${this.queueName.replace('queue:', '')}`;
    
    // Agent state
    this.isActive = false;
    this.currentTask = null;
    this.processingStats = {
      tasks_completed: 0,
      tasks_failed: 0,
      assistance_provided: 0,
      assistance_received: 0,
      start_time: new Date().toISOString()
    };
    
    console.log(`🚀 Enhanced Agent Runner initialized for ${agentType} (${this.agentId})`);
  }

  /**
   * Start the enhanced agent runner
   */
  async start() {
    try {
      console.log(`🔄 Starting enhanced agent runner for ${this.agentType}...`);
      
      // Initialize all coordination systems
      await this.agentCoordination.registerAgent(this.agentType, this.agentCapabilities);
      await this.assistanceSystem.initialize();
      await this.queueContextManager.initialize();
      
      // Start task processing loop
      this.isActive = true;
      this.startTaskProcessingLoop();
      
      // Start assistance monitoring
      this.startAssistanceMonitoring();
      
      // Start queue monitoring
      this.startQueueMonitoring();
      
      console.log(`✅ Enhanced agent runner started for ${this.agentType}`);
      
    } catch (error) {
      console.error(`❌ Error starting enhanced agent runner: ${error.message}`);
      throw error;
    }
  }

  /**
   * Main task processing loop with full coordination
   */
  async startTaskProcessingLoop() {
    while (this.isActive) {
      try {
        // Get next task from queue
        const taskStr = await this.redis.brpoplpush(
          this.queueName,
          this.processingQueue,
          30 // 30 second timeout
        );
        
        if (taskStr) {
          const task = JSON.parse(taskStr);
          await this.processTaskWithFullCoordination(task);
        }
        
      } catch (error) {
        console.error(`Error in task processing loop: ${error.message}`);
        await this.handleProcessingError(error);
      }
    }
  }

  /**
   * Process task with full coordination and context awareness
   */
  async processTaskWithFullCoordination(task) {
    console.log(`🔄 Processing task with full coordination: ${task.file || task.description}`);
    
    this.currentTask = task;
    let taskSuccess = false;
    
    try {
      // Step 1: Request file access through coordination system
      const fileAccess = await this.agentCoordination.requestFileAccess(
        task.file || 'system_task',
        task.prompt || task.description || 'Task execution',
        task.priority || 'normal'
      );
      
      if (!fileAccess.success) {
        console.log(`⚠️  File access denied: ${fileAccess.message}`);
        
        // Check if we can assist or need assistance
        await this.handleFileAccessDenied(task, fileAccess);
        return;
      }
      
      // Step 2: Request command execution permission if needed
      const commandPermission = await this.requestCommandPermissionIfNeeded(task);
      
      if (!commandPermission.success) {
        console.log(`⚠️  Command permission denied: ${commandPermission.message}`);
        
        // Release file access and handle command conflict
        await this.agentCoordination.releaseFileAccess(
          task.file || 'system_task',
          'Command permission denied'
        );
        
        await this.handleCommandPermissionDenied(task, commandPermission);
        return;
      }
      
      // Step 3: Execute the task
      const result = await this.executeTask(task);
      
      if (result.success) {
        taskSuccess = true;
        this.processingStats.tasks_completed++;
        
        // Step 4: Release coordination locks
        await this.releaseCoordinationLocks(task, result);
        
        // Step 5: CHECK QUEUE FOR ADDITIONAL TASKS WITH CONTEXT
        await this.checkQueueForAdditionalTasks(task, result);
        
        // Step 6: Offer assistance to other agents
        await this.offerAssistanceToOtherAgents(task, result);
        
        console.log(`✅ Task completed successfully: ${task.file || task.description}`);
        
      } else {
        throw new Error(result.error || 'Task execution failed');
      }
      
    } catch (error) {
      console.error(`❌ Task processing error: ${error.message}`);
      
      this.processingStats.tasks_failed++;
      taskSuccess = false;
      
      // Release all locks on error
      await this.releaseCoordinationLocks(task, { error: error.message });
      
      // Move to failure queue
      await this.moveToFailureQueue(task, error);
      
      // Request assistance for failed task
      await this.requestAssistanceForFailedTask(task, error);
      
    } finally {
      // Always remove from processing queue
      await this.redis.lrem(this.processingQueue, 1, JSON.stringify(task));
      this.currentTask = null;
    }
  }

  /**
   * Check queue for additional tasks with context (KEY FEATURE)
   */
  async checkQueueForAdditionalTasks(completedTask, result) {
    console.log(`🔍 Checking queue for additional tasks with context...`);
    
    try {
      // Get comprehensive queue analysis
      const queueAnalysis = await this.queueContextManager.checkQueueForAdditionalTasks(completedTask);
      
      console.log(`📊 Queue Analysis Results:`);
      console.log(`   Total tasks in all queues: ${queueAnalysis.queue_analysis.total_tasks}`);
      console.log(`   Related tasks found: ${queueAnalysis.queue_analysis.related_tasks.length}`);
      console.log(`   Contextual tasks found: ${queueAnalysis.queue_analysis.contextual_tasks.length}`);
      console.log(`   Recommendations: ${queueAnalysis.queue_analysis.recommendations.length}`);
      
      // Process high-priority recommendations
      const highPriorityRecommendations = queueAnalysis.queue_analysis.recommendations
        .filter(rec => rec.priority === 'high')
        .slice(0, 3); // Limit to top 3
      
      for (const recommendation of highPriorityRecommendations) {
        console.log(`🎯 High priority recommendation: ${recommendation.reason}`);
        
        // If it's in our queue, we can process it immediately
        if (recommendation.queue === this.queueName) {
          console.log(`   → Processing immediately (same queue)`);
          await this.processTaskWithFullCoordination(recommendation.task);
        } else {
          // Offer to help the appropriate agent
          console.log(`   → Offering assistance to ${recommendation.queue}`);
          await this.offerCrossQueueAssistance(recommendation);
        }
      }
      
      // Share context with other agents for medium priority tasks
      const mediumPriorityRecommendations = queueAnalysis.queue_analysis.recommendations
        .filter(rec => rec.priority === 'medium')
        .slice(0, 5); // Limit to top 5
      
      for (const recommendation of mediumPriorityRecommendations) {
        await this.shareContextWithRelevantAgent(recommendation, queueAnalysis.task_context);
      }
      
    } catch (error) {
      console.error(`Error checking queue for additional tasks: ${error.message}`);
    }
  }

  /**
   * Offer assistance to other agents based on completed work
   */
  async offerAssistanceToOtherAgents(completedTask, result) {
    console.log(`🤝 Offering assistance to other agents...`);
    
    try {
      // Monitor what other agents are doing
      const activities = await this.assistanceSystem.monitorAgentActivities();
      
      // Offer assistance based on our expertise and their needs
      for (const opportunity of activities.assistance_opportunities) {
        if (this.canProvideAssistance(opportunity.assistance_type)) {
          await this.assistanceSystem.offerAssistance(
            opportunity.agent,
            opportunity.assistance_type,
            {
              context: completedTask,
              result: result,
              expertise: this.agentCapabilities
            }
          );
          
          this.processingStats.assistance_provided++;
        }
      }
      
    } catch (error) {
      console.error(`Error offering assistance: ${error.message}`);
    }
  }

  /**
   * Handle file access denied by offering assistance
   */
  async handleFileAccessDenied(task, fileAccess) {
    console.log(`🤝 File access denied, checking for assistance opportunities...`);
    
    if (fileAccess.coordination_id) {
      // Coordination was requested, wait for response
      console.log(`⏳ Waiting for coordination response: ${fileAccess.coordination_id}`);
      
      // Set up timeout for coordination response
      setTimeout(async () => {
        await this.redis.lpush(this.queueName, JSON.stringify(task));
      }, 30000); // Retry after 30 seconds
      
    } else if (fileAccess.current_owner) {
      // Offer assistance to the current owner
      const assistanceType = this.determineAssistanceType(task);
      
      await this.assistanceSystem.offerAssistance(
        fileAccess.current_owner,
        assistanceType,
        {
          blocked_task: task,
          reason: 'File access conflict'
        }
      );
      
      // Requeue the task for later
      await this.redis.lpush(this.queueName, JSON.stringify(task));
    }
  }

  /**
   * Handle command permission denied
   */
  async handleCommandPermissionDenied(task, commandPermission) {
    console.log(`🤝 Command permission denied, looking for alternatives...`);
    
    if (commandPermission.suggestion) {
      // Try suggested alternative
      console.log(`💡 Trying suggested alternative: ${commandPermission.suggestion}`);
      
      // Modify task to use alternative approach
      const modifiedTask = {
        ...task,
        original_prompt: task.prompt,
        prompt: `${task.prompt} (Alternative approach: ${commandPermission.suggestion})`
      };
      
      await this.redis.lpush(this.queueName, JSON.stringify(modifiedTask));
    } else {
      // Requeue with delay
      setTimeout(async () => {
        await this.redis.lpush(this.queueName, JSON.stringify(task));
      }, 60000); // Wait 1 minute
    }
  }

  /**
   * Request assistance for failed task
   */
  async requestAssistanceForFailedTask(task, error) {
    console.log(`🆘 Requesting assistance for failed task...`);
    
    const assistanceType = this.determineAssistanceTypeForError(error);
    
    const result = await this.assistanceSystem.requestAssistance(assistanceType, {
      failed_task: task,
      error: error.message,
      agent_type: this.agentType,
      stack_trace: error.stack
    });
    
    if (result.success) {
      this.processingStats.assistance_received++;
      console.log(`✅ Assistance requested: ${result.request_id}`);
    }
  }

  /**
   * Offer cross-queue assistance
   */
  async offerCrossQueueAssistance(recommendation) {
    const targetAgentType = this.extractAgentTypeFromQueue(recommendation.queue);
    
    if (targetAgentType && targetAgentType !== this.agentType) {
      await this.assistanceSystem.offerAssistance(
        targetAgentType,
        recommendation.type,
        {
          recommended_task: recommendation.task,
          reason: recommendation.reason,
          priority: recommendation.priority
        }
      );
    }
  }

  /**
   * Share context with relevant agent
   */
  async shareContextWithRelevantAgent(recommendation, taskContext) {
    const targetAgentType = this.extractAgentTypeFromQueue(recommendation.queue);
    
    if (targetAgentType && targetAgentType !== this.agentType) {
      await this.assistanceSystem.shareKnowledge(
        recommendation.type,
        targetAgentType,
        {
          context: taskContext,
          recommendation: recommendation
        }
      );
    }
  }

  /**
   * Request command permission if task requires it
   */
  async requestCommandPermissionIfNeeded(task) {
    const prompt = task.prompt || task.description || '';
    
    // Check if task contains commands that need coordination
    const commands = this.extractCommands(prompt);
    
    if (commands.length > 0) {
      for (const command of commands) {
        const permission = await this.commandCoordinator.requestCommandExecution(
          command,
          { task: task }
        );
        
        if (!permission.success) {
          return permission;
        }
      }
    }
    
    return { success: true };
  }

  /**
   * Release coordination locks
   */
  async releaseCoordinationLocks(task, result) {
    // Release file access
    await this.agentCoordination.releaseFileAccess(
      task.file || 'system_task',
      result.success ? 'Task completed successfully' : `Task failed: ${result.error}`
    );
    
    // Release command locks
    const commands = this.extractCommands(task.prompt || task.description || '');
    for (const command of commands) {
      const commandHash = this.commandCoordinator.hashCommand(command);
      await this.commandCoordinator.releaseCommandExecution(commandHash, result);
    }
  }

  /**
   * Start assistance monitoring
   */
  async startAssistanceMonitoring() {
    setInterval(async () => {
      try {
        // Check for assistance offers
        const messages = await this.redis.lrange(`messages:${this.agentId}`, 0, -1);
        
        for (const message of messages) {
          const messageData = JSON.parse(message);
          
          if (messageData.type === 'assistance_offer') {
            await this.handleAssistanceOffer(messageData);
          } else if (messageData.type === 'knowledge_shared') {
            await this.handleKnowledgeShared(messageData);
          }
        }
        
        // Clear processed messages
        if (messages.length > 0) {
          await this.redis.del(`messages:${this.agentId}`);
        }
        
      } catch (error) {
        console.error('Error monitoring assistance:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Start queue monitoring
   */
  async startQueueMonitoring() {
    setInterval(async () => {
      try {
        const queueLength = await this.redis.llen(this.queueName);
        const processingLength = await this.redis.llen(this.processingQueue);
        
        console.log(`📊 Queue Status: ${queueLength} pending, ${processingLength} processing`);
        
        // Update agent statistics
        await this.updateAgentStatistics();
        
      } catch (error) {
        console.error('Error monitoring queue:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Execute the actual task (implement in subclasses)
   */
  async executeTask(task) {
    // This should be implemented by specific agent types
    console.log(`🔧 Executing task: ${task.file || task.description}`);
    
    // Simulate task execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      result: 'Task completed successfully',
      agent: this.agentId,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Helper methods
   */
  getQueueName(agentType) {
    const queueMap = {
      claude: 'queue:claude-3-opus',
      gpt: 'queue:gpt-4o',
      deepseek: 'queue:deepseek-coder',
      mistral: 'queue:command-r-plus',
      gemini: 'queue:gemini-pro'
    };
    
    return queueMap[agentType] || `queue:${agentType}`;
  }

  extractCommands(text) {
    const commands = [];
    const commandPatterns = [
      /npm\s+\w+[^\n]*/g,
      /docker\s+\w+[^\n]*/g,
      /git\s+\w+[^\n]*/g,
      /curl\s+[^\n]*/g,
      /wget\s+[^\n]*/g
    ];
    
    for (const pattern of commandPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        commands.push(...matches);
      }
    }
    
    return commands;
  }

  determineAssistanceType(task) {
    const prompt = task.prompt || task.description || '';
    
    if (prompt.includes('debug') || prompt.includes('error')) {
      return 'debugging';
    } else if (prompt.includes('test')) {
      return 'testing';
    } else if (prompt.includes('optimize')) {
      return 'optimization';
    } else if (prompt.includes('document')) {
      return 'documentation';
    } else {
      return 'code_review';
    }
  }

  determineAssistanceTypeForError(error) {
    const errorMsg = error.message.toLowerCase();
    
    if (errorMsg.includes('timeout') || errorMsg.includes('performance')) {
      return 'optimization';
    } else if (errorMsg.includes('test') || errorMsg.includes('assertion')) {
      return 'testing';
    } else if (errorMsg.includes('syntax') || errorMsg.includes('compile')) {
      return 'code_review';
    } else {
      return 'debugging';
    }
  }

  extractAgentTypeFromQueue(queueName) {
    const agentMap = {
      'queue:claude-3-opus': 'claude',
      'queue:gpt-4o': 'gpt',
      'queue:deepseek-coder': 'deepseek',
      'queue:command-r-plus': 'mistral',
      'queue:gemini-pro': 'gemini'
    };
    
    return agentMap[queueName];
  }

  canProvideAssistance(assistanceType) {
    return this.agentCapabilities.includes(assistanceType);
  }

  async handleAssistanceOffer(messageData) {
    console.log(`📥 Received assistance offer: ${messageData.assistance_type} from ${messageData.from}`);
    
    // Auto-accept if we need help and agent is qualified
    if (this.shouldAcceptAssistance(messageData)) {
      await this.assistanceSystem.acceptAssistance(
        messageData.assistance_id,
        'Auto-accepted: qualified assistance'
      );
    }
  }

  async handleKnowledgeShared(messageData) {
    console.log(`📚 Received knowledge: ${messageData.topic} from ${messageData.from}`);
    
    // Log knowledge for future reference
    await this.redis.lpush(`knowledge:${this.agentId}`, JSON.stringify(messageData));
  }

  shouldAcceptAssistance(messageData) {
    // Accept assistance if we're struggling with tasks
    return this.processingStats.tasks_failed > this.processingStats.tasks_completed;
  }

  async moveToFailureQueue(task, error) {
    const failureData = {
      ...task,
      error: error.message,
      failed_at: new Date().toISOString(),
      failed_by: this.agentId
    };
    
    await this.redis.lpush('queue:failures', JSON.stringify(failureData));
  }

  async handleProcessingError(error) {
    console.error(`Processing error: ${error.message}`);
    
    // Brief pause before continuing
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  async updateAgentStatistics() {
    await this.redis.hset(`agent_stats:${this.agentId}`, {
      tasks_completed: this.processingStats.tasks_completed,
      tasks_failed: this.processingStats.tasks_failed,
      assistance_provided: this.processingStats.assistance_provided,
      assistance_received: this.processingStats.assistance_received,
      last_updated: new Date().toISOString()
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log(`🛑 Shutting down enhanced agent runner for ${this.agentType}...`);
    
    this.isActive = false;
    
    // Complete current task if any
    if (this.currentTask) {
      console.log(`⏳ Completing current task...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    // Shutdown all coordination systems
    await this.agentCoordination.shutdown();
    await this.commandCoordinator.shutdown();
    await this.assistanceSystem.shutdown();
    
    console.log(`✅ Enhanced agent runner shutdown complete`);
  }
}

module.exports = EnhancedAgentRunner;