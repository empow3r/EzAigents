/**
 * Workflow Orchestrator for Ez Aigent Platform
 * Handles complex multi-step workflows with dependencies, conditional logic, and error recovery
 */

const { EventEmitter } = require('events');
const Redis = require('ioredis');

class WorkflowOrchestrator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.redis = new Redis(config.redisUrl || process.env.REDIS_URL);
    this.workflows = new Map();
    this.runningWorkflows = new Map();
    this.completedWorkflows = new Map();
    this.failedWorkflows = new Map();
  }

  /**
   * Register a new workflow template
   */
  registerWorkflow(name, definition) {
    const workflow = {
      name,
      version: definition.version || '1.0.0',
      description: definition.description || '',
      steps: definition.steps || [],
      errorHandling: definition.errorHandling || 'stop',
      retryPolicy: definition.retryPolicy || { maxRetries: 3, backoffMultiplier: 2 },
      timeout: definition.timeout || 300000, // 5 minutes default
      createdAt: new Date().toISOString()
    };

    this.workflows.set(name, workflow);
    console.log(`📋 Registered workflow: ${name} v${workflow.version}`);
    
    return workflow;
  }

  /**
   * Start executing a workflow
   */
  async executeWorkflow(workflowName, context = {}, options = {}) {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowName}`);
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const execution = {
      id: executionId,
      workflowName,
      version: workflow.version,
      status: 'running',
      context: { ...context },
      completedSteps: [],
      failedSteps: [],
      currentStep: null,
      startedAt: new Date().toISOString(),
      options
    };

    this.runningWorkflows.set(executionId, execution);
    
    console.log(`🚀 Starting workflow execution: ${workflowName} (${executionId})`);
    this.emit('workflowStarted', execution);

    try {
      await this.processWorkflowSteps(execution, workflow);
      await this.completeWorkflow(execution);
    } catch (error) {
      await this.failWorkflow(execution, error);
    }

    return executionId;
  }

  /**
   * Process all steps in a workflow
   */
  async processWorkflowSteps(execution, workflow) {
    const { steps } = workflow;
    const stepGraph = this.buildStepDependencyGraph(steps);
    
    // Process steps in dependency order
    const processed = new Set();
    const queue = steps.filter(step => !step.depends_on || step.depends_on.length === 0);

    while (queue.length > 0) {
      const currentStep = queue.shift();
      
      if (processed.has(currentStep.id)) continue;

      // Check if dependencies are met
      if (!this.areDependenciesMet(currentStep, execution.completedSteps)) {
        queue.push(currentStep); // Re-queue for later
        continue;
      }

      execution.currentStep = currentStep.id;
      await this.executeStep(execution, currentStep, workflow);
      processed.add(currentStep.id);

      // Add dependent steps to queue
      const dependentSteps = steps.filter(step => 
        step.depends_on && step.depends_on.includes(currentStep.id)
      );
      queue.push(...dependentSteps);
    }
  }

  /**
   * Execute a single workflow step
   */
  async executeStep(execution, step, workflow) {
    const { id, action, params, condition, retryPolicy } = step;
    
    console.log(`  📋 Executing step: ${id} (${action})`);
    this.emit('stepStarted', { execution, step });

    // Check step condition
    if (condition && !this.evaluateCondition(condition, execution.context)) {
      console.log(`  ⏭️ Skipping step ${id} - condition not met`);
      execution.completedSteps.push(id);
      return;
    }

    const stepRetryPolicy = retryPolicy || workflow.retryPolicy;
    let attempt = 0;
    let lastError = null;

    while (attempt <= stepRetryPolicy.maxRetries) {
      try {
        const result = await this.performStepAction(action, params, execution.context);
        
        // Update context with step result
        execution.context[`${id}_result`] = result;
        execution.completedSteps.push(id);
        
        console.log(`  ✅ Completed step: ${id}`);
        this.emit('stepCompleted', { execution, step, result });
        
        return result;
        
      } catch (error) {
        lastError = error;
        attempt++;
        
        console.error(`  ❌ Step ${id} failed (attempt ${attempt}):`, error.message);
        
        if (attempt <= stepRetryPolicy.maxRetries) {
          const delay = Math.pow(stepRetryPolicy.backoffMultiplier, attempt - 1) * 1000;
          console.log(`  🔄 Retrying step ${id} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    execution.failedSteps.push({ id, error: lastError.message });
    
    if (workflow.errorHandling === 'stop') {
      throw new Error(`Step ${id} failed after ${stepRetryPolicy.maxRetries} retries: ${lastError.message}`);
    } else if (workflow.errorHandling === 'continue') {
      console.warn(`  ⚠️ Continuing despite step ${id} failure`);
    }
  }

  /**
   * Perform the actual step action
   */
  async performStepAction(action, params, context) {
    switch (action) {
      case 'agent_spawn':
        return await this.spawnAgent(params, context);
      
      case 'code_analysis':
        return await this.performCodeAnalysis(params, context);
      
      case 'run_tests':
        return await this.runTests(params, context);
      
      case 'deploy_service':
        return await this.deployService(params, context);
      
      case 'send_notification':
        return await this.sendNotification(params, context);
      
      case 'wait_for_approval':
        return await this.waitForApproval(params, context);
      
      case 'collect_metrics':
        return await this.collectMetrics(params, context);
      
      case 'backup_data':
        return await this.backupData(params, context);
      
      case 'rollback_deployment':
        return await this.rollbackDeployment(params, context);
      
      case 'update_database':
        return await this.updateDatabase(params, context);
      
      case 'custom_script':
        return await this.executeCustomScript(params, context);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Check if step dependencies are met
   */
  areDependenciesMet(step, completedSteps) {
    if (!step.depends_on || step.depends_on.length === 0) {
      return true;
    }
    
    return step.depends_on.every(dep => completedSteps.includes(dep));
  }

  /**
   * Evaluate conditional logic
   */
  evaluateCondition(condition, context) {
    try {
      // Simple condition evaluation (can be enhanced with more complex logic)
      const { field, operator, value } = condition;
      const contextValue = this.getNestedValue(context, field);
      
      switch (operator) {
        case 'equals':
          return contextValue === value;
        case 'not_equals':
          return contextValue !== value;
        case 'greater_than':
          return contextValue > value;
        case 'less_than':
          return contextValue < value;
        case 'contains':
          return String(contextValue).includes(value);
        case 'exists':
          return contextValue !== undefined && contextValue !== null;
        default:
          return true;
      }
    } catch (error) {
      console.warn('Condition evaluation failed:', error);
      return false;
    }
  }

  /**
   * Get nested value from context object
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Build dependency graph for steps
   */
  buildStepDependencyGraph(steps) {
    const graph = new Map();
    
    steps.forEach(step => {
      graph.set(step.id, {
        step,
        dependencies: step.depends_on || [],
        dependents: []
      });
    });
    
    // Build dependents list
    graph.forEach((node, stepId) => {
      node.dependencies.forEach(depId => {
        const depNode = graph.get(depId);
        if (depNode) {
          depNode.dependents.push(stepId);
        }
      });
    });
    
    return graph;
  }

  /**
   * Complete workflow execution
   */
  async completeWorkflow(execution) {
    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();
    execution.duration = new Date(execution.completedAt) - new Date(execution.startedAt);
    
    this.runningWorkflows.delete(execution.id);
    this.completedWorkflows.set(execution.id, execution);
    
    // Store in Redis for persistence
    await this.redis.hset(`workflow:execution:${execution.id}`, {
      ...execution,
      context: JSON.stringify(execution.context)
    });
    
    console.log(`✅ Workflow completed: ${execution.workflowName} (${execution.id})`);
    this.emit('workflowCompleted', execution);
  }

  /**
   * Mark workflow as failed
   */
  async failWorkflow(execution, error) {
    execution.status = 'failed';
    execution.error = error.message;
    execution.failedAt = new Date().toISOString();
    execution.duration = new Date(execution.failedAt) - new Date(execution.startedAt);
    
    this.runningWorkflows.delete(execution.id);
    this.failedWorkflows.set(execution.id, execution);
    
    // Store in Redis for persistence
    await this.redis.hset(`workflow:execution:${execution.id}`, {
      ...execution,
      context: JSON.stringify(execution.context)
    });
    
    console.error(`❌ Workflow failed: ${execution.workflowName} (${execution.id})`, error);
    this.emit('workflowFailed', { execution, error });
  }

  /**
   * Get workflow execution status
   */
  getExecutionStatus(executionId) {
    return this.runningWorkflows.get(executionId) ||
           this.completedWorkflows.get(executionId) ||
           this.failedWorkflows.get(executionId);
  }

  /**
   * List all workflows
   */
  listWorkflows() {
    return Array.from(this.workflows.values());
  }

  /**
   * Get execution statistics
   */
  getExecutionStats() {
    return {
      running: this.runningWorkflows.size,
      completed: this.completedWorkflows.size,
      failed: this.failedWorkflows.size,
      totalRegistered: this.workflows.size
    };
  }

  // Action implementation methods (placeholder - implement based on your needs)
  async spawnAgent(params, context) {
    console.log('Spawning agent:', params);
    return { agentId: `agent_${Date.now()}`, status: 'spawned' };
  }

  async performCodeAnalysis(params, context) {
    console.log('Performing code analysis:', params);
    return { analysisId: `analysis_${Date.now()}`, issues: 0, coverage: 95 };
  }

  async runTests(params, context) {
    console.log('Running tests:', params);
    return { testSuite: params.suite, passed: 42, failed: 0, coverage: 95 };
  }

  async deployService(params, context) {
    console.log('Deploying service:', params);
    return { deploymentId: `deploy_${Date.now()}`, status: 'deployed', url: 'https://example.com' };
  }

  async sendNotification(params, context) {
    console.log('Sending notification:', params);
    return { notificationId: `notif_${Date.now()}`, status: 'sent' };
  }

  async waitForApproval(params, context) {
    console.log('Waiting for approval:', params);
    // In real implementation, this would wait for external approval
    return { approved: true, approver: 'system', approvedAt: new Date().toISOString() };
  }

  async collectMetrics(params, context) {
    console.log('Collecting metrics:', params);
    return { cpu: 45, memory: 60, disk: 30, timestamp: Date.now() };
  }

  async backupData(params, context) {
    console.log('Backing up data:', params);
    return { backupId: `backup_${Date.now()}`, size: '1.2GB', location: 's3://backups/' };
  }

  async rollbackDeployment(params, context) {
    console.log('Rolling back deployment:', params);
    return { rollbackId: `rollback_${Date.now()}`, status: 'rolled_back', version: 'previous' };
  }

  async updateDatabase(params, context) {
    console.log('Updating database:', params);
    return { migrationId: `migration_${Date.now()}`, rowsAffected: 1000, status: 'completed' };
  }

  async executeCustomScript(params, context) {
    console.log('Executing custom script:', params);
    return { scriptOutput: 'Script completed successfully', exitCode: 0 };
  }
}

module.exports = WorkflowOrchestrator;