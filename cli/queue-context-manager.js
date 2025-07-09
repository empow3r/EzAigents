const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

/**
 * Queue Context Manager
 * 
 * Manages queue visibility and context-aware task processing.
 * Each agent checks queue for context, previous steps, and objectives
 * when completing tasks to maintain continuity and collaboration.
 */
class QueueContextManager {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.agentId = process.env.AGENT_ID || `agent_${Date.now()}`;
    this.contextPath = './.queue-context';
    
    // Queue patterns for different agent types
    this.queuePatterns = {
      claude: 'queue:claude-3-opus',
      gpt: 'queue:gpt-4o', 
      deepseek: 'queue:deepseek-coder',
      mistral: 'queue:command-r-plus',
      gemini: 'queue:gemini-pro'
    };
    
    // Task context retention time (24 hours)
    this.contextRetentionTime = 86400;
    
    this.initialize();
  }

  /**
   * Initialize context manager
   */
  async initialize() {
    try {
      await fs.mkdir(this.contextPath, { recursive: true });
      console.log(`📋 Queue Context Manager initialized for ${this.agentId}`);
    } catch (error) {
      console.error('Error initializing context manager:', error);
    }
  }

  /**
   * Check queue for additional tasks when agent completes work
   */
  async checkQueueForAdditionalTasks(completedTask) {
    console.log(`🔍 Checking queue for additional tasks after completing: ${completedTask.file || completedTask.description}`);
    
    // Get all queues and their tasks
    const allTasks = await this.getAllQueueTasks();
    
    // Analyze tasks for context and relationships
    const relatedTasks = await this.findRelatedTasks(completedTask, allTasks);
    
    // Get task context and history
    const taskContext = await this.getTaskContext(completedTask);
    
    // Find tasks that could benefit from previous steps
    const contextualTasks = await this.findContextualTasks(completedTask, allTasks, taskContext);
    
    // Recommend next tasks based on objectives
    const recommendations = await this.generateTaskRecommendations(completedTask, relatedTasks, contextualTasks);
    
    // Log the analysis
    await this.logQueueAnalysis(completedTask, {
      total_tasks: allTasks.totalTasks,
      related_tasks: relatedTasks.length,
      contextual_tasks: contextualTasks.length,
      recommendations: recommendations.length
    });
    
    return {
      completed_task: completedTask,
      queue_analysis: {
        total_tasks: allTasks.totalTasks,
        related_tasks: relatedTasks,
        contextual_tasks: contextualTasks,
        recommendations: recommendations
      },
      task_context: taskContext
    };
  }

  /**
   * Get all tasks from all queues
   */
  async getAllQueueTasks() {
    const allTasks = {
      byQueue: {},
      byAgent: {},
      totalTasks: 0
    };
    
    // Get tasks from all agent queues
    for (const [agentType, queueName] of Object.entries(this.queuePatterns)) {
      const tasks = await this.redis.lrange(queueName, 0, -1);
      const parsedTasks = tasks.map(task => {
        try {
          return JSON.parse(task);
        } catch (error) {
          return { raw: task, error: 'parse_error' };
        }
      });
      
      allTasks.byQueue[queueName] = parsedTasks;
      allTasks.byAgent[agentType] = parsedTasks;
      allTasks.totalTasks += parsedTasks.length;
    }
    
    // Get processing tasks
    const processingQueues = await this.redis.keys('processing:*');
    for (const queueName of processingQueues) {
      const tasks = await this.redis.lrange(queueName, 0, -1);
      const parsedTasks = tasks.map(task => {
        try {
          return JSON.parse(task);
        } catch (error) {
          return { raw: task, error: 'parse_error' };
        }
      });
      
      allTasks.byQueue[queueName] = parsedTasks;
      allTasks.totalTasks += parsedTasks.length;
    }
    
    // Get failed tasks
    const failedTasks = await this.redis.lrange('queue:failures', 0, -1);
    allTasks.byQueue['queue:failures'] = failedTasks.map(task => {
      try {
        return JSON.parse(task);
      } catch (error) {
        return { raw: task, error: 'parse_error' };
      }
    });
    
    return allTasks;
  }

  /**
   * Find tasks related to the completed task
   */
  async findRelatedTasks(completedTask, allTasks) {
    const relatedTasks = [];
    
    // Extract key information from completed task
    const completedFile = completedTask.file || '';
    const completedPrompt = completedTask.prompt || completedTask.description || '';
    const completedKeywords = this.extractKeywords(completedPrompt);
    
    // Search through all tasks
    for (const [queueName, tasks] of Object.entries(allTasks.byQueue)) {
      for (const task of tasks) {
        if (task.error) continue;
        
        const taskFile = task.file || '';
        const taskPrompt = task.prompt || task.description || '';
        const taskKeywords = this.extractKeywords(taskPrompt);
        
        // Check for relationships
        const relationships = [];
        
        // Same file relationship
        if (taskFile && completedFile && taskFile === completedFile) {
          relationships.push({ type: 'same_file', strength: 0.9 });
        }
        
        // Same directory relationship
        if (taskFile && completedFile && 
            path.dirname(taskFile) === path.dirname(completedFile)) {
          relationships.push({ type: 'same_directory', strength: 0.7 });
        }
        
        // Keyword similarity
        const commonKeywords = taskKeywords.filter(k => completedKeywords.includes(k));
        if (commonKeywords.length > 0) {
          relationships.push({ 
            type: 'keyword_similarity', 
            strength: commonKeywords.length / Math.max(taskKeywords.length, completedKeywords.length),
            keywords: commonKeywords 
          });
        }
        
        // Dependency relationships
        if (this.checkDependencyRelationship(completedTask, task)) {
          relationships.push({ type: 'dependency', strength: 0.8 });
        }
        
        if (relationships.length > 0) {
          relatedTasks.push({
            task: task,
            queue: queueName,
            relationships: relationships,
            total_strength: relationships.reduce((sum, r) => sum + r.strength, 0)
          });
        }
      }
    }
    
    // Sort by relationship strength
    return relatedTasks.sort((a, b) => b.total_strength - a.total_strength);
  }

  /**
   * Find tasks that could benefit from context
   */
  async findContextualTasks(completedTask, allTasks, taskContext) {
    const contextualTasks = [];
    
    // Analyze completed task outcomes
    const completedOutcomes = await this.analyzeTaskOutcomes(completedTask, taskContext);
    
    // Check each task for context applicability
    for (const [queueName, tasks] of Object.entries(allTasks.byQueue)) {
      for (const task of tasks) {
        if (task.error) continue;
        
        const contextApplicability = await this.assessContextApplicability(
          task, completedOutcomes, taskContext
        );
        
        if (contextApplicability.score > 0.5) {
          contextualTasks.push({
            task: task,
            queue: queueName,
            context_applicability: contextApplicability,
            potential_improvements: contextApplicability.improvements
          });
        }
      }
    }
    
    return contextualTasks.sort((a, b) => 
      b.context_applicability.score - a.context_applicability.score
    );
  }

  /**
   * Generate task recommendations based on completion
   */
  async generateTaskRecommendations(completedTask, relatedTasks, contextualTasks) {
    const recommendations = [];
    
    // High-priority related tasks
    const highPriorityRelated = relatedTasks.filter(rt => rt.total_strength > 0.7);
    for (const related of highPriorityRelated) {
      recommendations.push({
        type: 'high_priority_related',
        task: related.task,
        queue: related.queue,
        reason: `Highly related to completed task (${related.relationships.map(r => r.type).join(', ')})`,
        priority: 'high',
        estimated_effort: this.estimateTaskEffort(related.task, completedTask)
      });
    }
    
    // Context-beneficial tasks
    const highContextTasks = contextualTasks.filter(ct => ct.context_applicability.score > 0.8);
    for (const contextual of highContextTasks) {
      recommendations.push({
        type: 'context_beneficial',
        task: contextual.task,
        queue: contextual.queue,
        reason: `Can benefit from context of completed task: ${contextual.potential_improvements.join(', ')}`,
        priority: 'medium',
        estimated_effort: this.estimateTaskEffort(contextual.task, completedTask)
      });
    }
    
    // Sequential workflow tasks
    const sequentialTasks = await this.findSequentialTasks(completedTask, relatedTasks);
    for (const sequential of sequentialTasks) {
      recommendations.push({
        type: 'sequential_workflow',
        task: sequential.task,
        queue: sequential.queue,
        reason: `Next logical step in workflow: ${sequential.workflow_reason}`,
        priority: 'medium',
        estimated_effort: this.estimateTaskEffort(sequential.task, completedTask)
      });
    }
    
    // Failed task retries with context
    const retryableFailed = await this.findRetryableFailedTasks(completedTask, taskContext);
    for (const retry of retryableFailed) {
      recommendations.push({
        type: 'contextual_retry',
        task: retry.task,
        queue: 'queue:failures',
        reason: `Failed task that might succeed with current context: ${retry.retry_reason}`,
        priority: 'low',
        estimated_effort: this.estimateTaskEffort(retry.task, completedTask)
      });
    }
    
    // Sort recommendations by priority and estimated effort
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
  }

  /**
   * Get task context including previous steps and objectives
   */
  async getTaskContext(task) {
    const contextId = this.generateContextId(task);
    const contextFile = path.join(this.contextPath, `${contextId}.json`);
    
    try {
      // Try to read existing context
      const contextData = await fs.readFile(contextFile, 'utf8');
      const context = JSON.parse(contextData);
      
      // Update with current completion
      context.last_updated = new Date().toISOString();
      context.completion_history = context.completion_history || [];
      context.completion_history.push({
        agent: this.agentId,
        completed_at: new Date().toISOString(),
        task: task
      });
      
      // Save updated context
      await fs.writeFile(contextFile, JSON.stringify(context, null, 2));
      
      return context;
    } catch (error) {
      // Create new context
      const newContext = {
        context_id: contextId,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        primary_objective: await this.inferPrimaryObjective(task),
        previous_steps: await this.getPreviousSteps(task),
        completion_history: [{
          agent: this.agentId,
          completed_at: new Date().toISOString(),
          task: task
        }],
        learned_patterns: [],
        success_factors: [],
        failure_patterns: []
      };
      
      await fs.writeFile(contextFile, JSON.stringify(newContext, null, 2));
      return newContext;
    }
  }

  /**
   * Extract keywords from task description
   */
  extractKeywords(text) {
    if (!text) return [];
    
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
    
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .filter((word, index, array) => array.indexOf(word) === index);
  }

  /**
   * Check if tasks have dependency relationship
   */
  checkDependencyRelationship(completedTask, task) {
    // Check if completed task creates something that the pending task needs
    const completedFile = completedTask.file || '';
    const taskPrompt = task.prompt || task.description || '';
    
    // Simple dependency patterns
    if (completedFile.includes('package.json') && taskPrompt.includes('install')) {
      return true;
    }
    
    if (completedFile.includes('docker') && taskPrompt.includes('container')) {
      return true;
    }
    
    if (completedFile.includes('test') && taskPrompt.includes('run tests')) {
      return true;
    }
    
    return false;
  }

  /**
   * Analyze task outcomes
   */
  async analyzeTaskOutcomes(completedTask, taskContext) {
    return {
      technical_knowledge: this.extractTechnicalKnowledge(completedTask),
      patterns_learned: this.extractPatterns(completedTask, taskContext),
      tools_used: this.extractToolsUsed(completedTask),
      success_factors: this.extractSuccessFactors(completedTask),
      potential_applications: this.identifyPotentialApplications(completedTask)
    };
  }

  /**
   * Assess context applicability to pending task
   */
  async assessContextApplicability(task, completedOutcomes, taskContext) {
    let score = 0;
    const improvements = [];
    
    // Check technical knowledge applicability
    const taskTech = this.extractTechnicalKnowledge(task);
    const techOverlap = taskTech.filter(tech => 
      completedOutcomes.technical_knowledge.includes(tech)
    );
    
    if (techOverlap.length > 0) {
      score += 0.3;
      improvements.push(`Apply ${techOverlap.join(', ')} knowledge`);
    }
    
    // Check pattern applicability
    const applicablePatterns = completedOutcomes.patterns_learned.filter(pattern =>
      this.isPatternApplicable(pattern, task)
    );
    
    if (applicablePatterns.length > 0) {
      score += 0.4;
      improvements.push(`Apply learned patterns: ${applicablePatterns.join(', ')}`);
    }
    
    // Check tool applicability
    const applicableTools = completedOutcomes.tools_used.filter(tool =>
      this.isToolApplicable(tool, task)
    );
    
    if (applicableTools.length > 0) {
      score += 0.3;
      improvements.push(`Use tools: ${applicableTools.join(', ')}`);
    }
    
    return {
      score: Math.min(score, 1.0),
      improvements: improvements,
      technical_overlap: techOverlap,
      applicable_patterns: applicablePatterns,
      applicable_tools: applicableTools
    };
  }

  /**
   * Find sequential workflow tasks
   */
  async findSequentialTasks(completedTask, relatedTasks) {
    const sequentialTasks = [];
    
    // Define common workflow patterns
    const workflowPatterns = {
      'setup -> install -> configure -> test': [
        'setup', 'install', 'configure', 'test'
      ],
      'create -> implement -> test -> deploy': [
        'create', 'implement', 'test', 'deploy'
      ],
      'analyze -> design -> code -> review': [
        'analyze', 'design', 'code', 'review'
      ]
    };
    
    const completedPrompt = completedTask.prompt || completedTask.description || '';
    
    // Find workflow matches
    for (const [workflowName, steps] of Object.entries(workflowPatterns)) {
      const currentStepIndex = steps.findIndex(step => 
        completedPrompt.toLowerCase().includes(step)
      );
      
      if (currentStepIndex >= 0 && currentStepIndex < steps.length - 1) {
        const nextStep = steps[currentStepIndex + 1];
        
        // Find related tasks that match the next step
        const nextStepTasks = relatedTasks.filter(rt => 
          (rt.task.prompt || rt.task.description || '').toLowerCase().includes(nextStep)
        );
        
        for (const nextStepTask of nextStepTasks) {
          sequentialTasks.push({
            task: nextStepTask.task,
            queue: nextStepTask.queue,
            workflow_name: workflowName,
            workflow_reason: `Next step after ${steps[currentStepIndex]} is ${nextStep}`,
            step_index: currentStepIndex + 1
          });
        }
      }
    }
    
    return sequentialTasks;
  }

  /**
   * Find retryable failed tasks
   */
  async findRetryableFailedTasks(completedTask, taskContext) {
    const retryableTasks = [];
    
    // Get failed tasks
    const failedTasks = await this.redis.lrange('queue:failures', 0, -1);
    
    for (const failedTaskStr of failedTasks) {
      try {
        const failedTask = JSON.parse(failedTaskStr);
        
        // Check if completed task provides context that might help
        const retryPotential = await this.assessRetryPotential(failedTask, completedTask, taskContext);
        
        if (retryPotential.score > 0.6) {
          retryableTasks.push({
            task: failedTask,
            retry_reason: retryPotential.reason,
            retry_score: retryPotential.score,
            suggested_changes: retryPotential.suggestions
          });
        }
      } catch (error) {
        // Skip malformed failed tasks
      }
    }
    
    return retryableTasks;
  }

  /**
   * Assess retry potential for failed task
   */
  async assessRetryPotential(failedTask, completedTask, taskContext) {
    let score = 0;
    const suggestions = [];
    let reason = '';
    
    // Check if completed task resolved similar issues
    const failedError = failedTask.error || '';
    const completedFile = completedTask.file || '';
    
    // Same file success might help
    if (failedTask.file === completedFile) {
      score += 0.4;
      suggestions.push('Apply same approach that worked for this file');
      reason = 'Same file was successfully processed';
    }
    
    // Similar error patterns
    if (failedError.includes('dependency') && completedTask.prompt?.includes('install')) {
      score += 0.3;
      suggestions.push('Dependencies might now be resolved');
      reason = 'Dependencies were recently installed';
    }
    
    // Infrastructure improvements
    if (failedError.includes('timeout') && completedTask.prompt?.includes('optimize')) {
      score += 0.3;
      suggestions.push('Performance optimizations might help');
      reason = 'Performance improvements were made';
    }
    
    return {
      score: Math.min(score, 1.0),
      reason: reason,
      suggestions: suggestions
    };
  }

  /**
   * Helper methods for analysis
   */
  extractTechnicalKnowledge(task) {
    const prompt = task.prompt || task.description || '';
    const file = task.file || '';
    
    const technologies = [];
    
    // Extract from file extensions
    if (file.includes('.js')) technologies.push('javascript');
    if (file.includes('.ts')) technologies.push('typescript');
    if (file.includes('.py')) technologies.push('python');
    if (file.includes('.jsx')) technologies.push('react');
    if (file.includes('.vue')) technologies.push('vue');
    if (file.includes('.php')) technologies.push('php');
    
    // Extract from prompt keywords
    const techKeywords = ['docker', 'kubernetes', 'redis', 'postgresql', 'mysql', 'mongodb', 'express', 'nextjs', 'vue', 'angular', 'react', 'nodejs', 'python', 'java', 'go', 'rust'];
    
    for (const keyword of techKeywords) {
      if (prompt.toLowerCase().includes(keyword)) {
        technologies.push(keyword);
      }
    }
    
    return [...new Set(technologies)];
  }

  extractPatterns(completedTask, taskContext) {
    const patterns = [];
    
    // Extract from success factors
    if (taskContext.success_factors) {
      patterns.push(...taskContext.success_factors);
    }
    
    // Extract from completion history
    if (taskContext.completion_history && taskContext.completion_history.length > 1) {
      patterns.push('incremental_progress');
    }
    
    return patterns;
  }

  extractToolsUsed(task) {
    const prompt = task.prompt || task.description || '';
    const tools = [];
    
    const toolPatterns = {
      'npm': /npm\s+\w+/g,
      'docker': /docker\s+\w+/g,
      'git': /git\s+\w+/g,
      'curl': /curl\s+/g,
      'wget': /wget\s+/g,
      'redis-cli': /redis-cli\s+/g
    };
    
    for (const [tool, pattern] of Object.entries(toolPatterns)) {
      if (pattern.test(prompt)) {
        tools.push(tool);
      }
    }
    
    return tools;
  }

  extractSuccessFactors(task) {
    // This would be enhanced with actual success analysis
    return ['systematic_approach', 'proper_error_handling', 'context_awareness'];
  }

  identifyPotentialApplications(task) {
    const applications = [];
    const prompt = task.prompt || task.description || '';
    
    if (prompt.includes('optimize')) {
      applications.push('performance_optimization');
    }
    
    if (prompt.includes('security')) {
      applications.push('security_enhancement');
    }
    
    if (prompt.includes('test')) {
      applications.push('testing_strategy');
    }
    
    return applications;
  }

  isPatternApplicable(pattern, task) {
    const prompt = task.prompt || task.description || '';
    
    // Simple pattern matching - can be enhanced
    if (pattern === 'incremental_progress' && prompt.includes('large')) {
      return true;
    }
    
    if (pattern === 'systematic_approach' && prompt.includes('complex')) {
      return true;
    }
    
    return false;
  }

  isToolApplicable(tool, task) {
    const prompt = task.prompt || task.description || '';
    
    // Check if tool is relevant to task
    if (tool === 'docker' && prompt.includes('container')) {
      return true;
    }
    
    if (tool === 'npm' && prompt.includes('package')) {
      return true;
    }
    
    return false;
  }

  estimateTaskEffort(task, completedTask) {
    // Simple effort estimation based on task characteristics
    const prompt = task.prompt || task.description || '';
    
    if (prompt.includes('large') || prompt.includes('complex')) {
      return 'high';
    } else if (prompt.includes('quick') || prompt.includes('simple')) {
      return 'low';
    } else {
      return 'medium';
    }
  }

  generateContextId(task) {
    const taskStr = JSON.stringify(task);
    return require('crypto').createHash('md5').update(taskStr).digest('hex').substring(0, 12);
  }

  async inferPrimaryObjective(task) {
    const prompt = task.prompt || task.description || '';
    
    // Simple objective inference
    if (prompt.includes('build') || prompt.includes('create')) {
      return 'build_feature';
    } else if (prompt.includes('fix') || prompt.includes('debug')) {
      return 'fix_issue';
    } else if (prompt.includes('optimize') || prompt.includes('improve')) {
      return 'optimize_performance';
    } else if (prompt.includes('test')) {
      return 'ensure_quality';
    } else {
      return 'general_development';
    }
  }

  async getPreviousSteps(task) {
    // This would analyze git history, task history, etc.
    return [];
  }

  async logQueueAnalysis(completedTask, analysis) {
    await this.redis.lpush('queue_analysis_log', JSON.stringify({
      agent: this.agentId,
      completed_task: completedTask,
      analysis: analysis,
      timestamp: new Date().toISOString()
    }));
    
    // Keep only last 1000 entries
    await this.redis.ltrim('queue_analysis_log', 0, 999);
  }
}

module.exports = QueueContextManager;