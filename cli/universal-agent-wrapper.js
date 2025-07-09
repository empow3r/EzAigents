const EnhancedAgentRunner = require('./enhanced-agent-runner');
const fs = require('fs').promises;
const path = require('path');

/**
 * Universal Agent Wrapper
 * 
 * Wraps existing agents to enable auto-scaling and coordination features
 * without modifying the original agent code. This allows all agents
 * to participate in the coordination system.
 */
class UniversalAgentWrapper extends EnhancedAgentRunner {
  constructor(agentType, agentScript, agentCapabilities = []) {
    super(agentType, agentCapabilities);
    
    this.agentScript = agentScript;
    this.originalAgentModule = null;
    this.isWrapped = true;
    
    // Default capabilities based on agent type
    this.defaultCapabilities = {
      claude: ['architecture', 'refactoring', 'documentation', 'security', 'code_review'],
      gpt: ['backend-logic', 'api-design', 'implementation', 'frontend', 'debugging'],
      deepseek: ['testing', 'validation', 'optimization', 'devops', 'performance'],
      mistral: ['documentation', 'analysis', 'explanation', 'research'],
      gemini: ['analysis', 'optimization', 'performance', 'patterns', 'code_review']
    };
    
    this.agentCapabilities = agentCapabilities.length > 0 ? 
      agentCapabilities : 
      this.defaultCapabilities[agentType] || [];
    
    console.log(`🎁 Universal Agent Wrapper initialized for ${agentType} with capabilities: ${this.agentCapabilities.join(', ')}`);
  }

  /**
   * Load and wrap the original agent
   */
  async loadOriginalAgent() {
    try {
      // Check if agent script exists
      const scriptPath = path.resolve(this.agentScript);
      await fs.access(scriptPath);
      
      // Try to require the agent module
      this.originalAgentModule = require(scriptPath);
      
      console.log(`✅ Loaded original agent: ${this.agentScript}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to load original agent ${this.agentScript}: ${error.message}`);
      return false;
    }
  }

  /**
   * Execute task using the original agent with coordination
   */
  async executeTask(task) {
    console.log(`🎁 Wrapped ${this.agentType} executing task: ${task.file || task.description}`);
    
    try {
      // Load original agent if not already loaded
      if (!this.originalAgentModule) {
        const loaded = await this.loadOriginalAgent();
        if (!loaded) {
          return await this.fallbackExecution(task);
        }
      }
      
      // Prepare task for original agent
      const wrappedTask = await this.prepareTaskForOriginalAgent(task);
      
      // Execute using original agent
      const result = await this.executeWithOriginalAgent(wrappedTask);
      
      // Process result with coordination features
      const enhancedResult = await this.enhanceResult(result, task);
      
      return enhancedResult;
      
    } catch (error) {
      console.error(`❌ Wrapped ${this.agentType} task execution error: ${error.message}`);
      
      // Try fallback execution
      return await this.fallbackExecution(task, error);
    }
  }

  /**
   * Prepare task for original agent
   */
  async prepareTaskForOriginalAgent(task) {
    // Add coordination context to task
    const wrappedTask = {
      ...task,
      wrapper: {
        agent_id: this.agentId,
        agent_type: this.agentType,
        capabilities: this.agentCapabilities,
        coordination_enabled: true,
        timestamp: new Date().toISOString()
      }
    };
    
    // Add queue context if available
    try {
      const queueAnalysis = await this.queueContextManager.checkQueueForAdditionalTasks(task);
      wrappedTask.queue_context = {
        total_tasks: queueAnalysis.queue_analysis.total_tasks,
        related_tasks: queueAnalysis.queue_analysis.related_tasks.slice(0, 3),
        recommendations: queueAnalysis.queue_analysis.recommendations.slice(0, 2)
      };
    } catch (error) {
      console.error(`Error adding queue context: ${error.message}`);
    }
    
    return wrappedTask;
  }

  /**
   * Execute with original agent
   */
  async executeWithOriginalAgent(task) {
    // Different execution strategies based on agent module structure
    
    // Strategy 1: Direct function call
    if (typeof this.originalAgentModule === 'function') {
      return await this.originalAgentModule(task);
    }
    
    // Strategy 2: Module with execute method
    if (this.originalAgentModule && typeof this.originalAgentModule.execute === 'function') {
      return await this.originalAgentModule.execute(task);
    }
    
    // Strategy 3: Module with processTask method
    if (this.originalAgentModule && typeof this.originalAgentModule.processTask === 'function') {
      return await this.originalAgentModule.processTask(task);
    }
    
    // Strategy 4: Module with main method
    if (this.originalAgentModule && typeof this.originalAgentModule.main === 'function') {
      return await this.originalAgentModule.main(task);
    }
    
    // Strategy 5: Class-based agent
    if (this.originalAgentModule && this.originalAgentModule.default) {
      const AgentClass = this.originalAgentModule.default;
      const agentInstance = new AgentClass();
      
      if (typeof agentInstance.execute === 'function') {
        return await agentInstance.execute(task);
      }
      
      if (typeof agentInstance.processTask === 'function') {
        return await agentInstance.processTask(task);
      }
    }
    
    // Strategy 6: Spawn child process (fallback)
    return await this.executeAsChildProcess(task);
  }

  /**
   * Execute as child process
   */
  async executeAsChildProcess(task) {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const taskStr = JSON.stringify(task);
      
      const childProcess = spawn('node', [this.agentScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          AGENT_ID: this.agentId,
          AGENT_TYPE: this.agentType,
          WRAPPED_TASK: taskStr
        }
      });
      
      let stdout = '';
      let stderr = '';
      
      // Send task to child process
      childProcess.stdin.write(taskStr);
      childProcess.stdin.end();
      
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      childProcess.on('close', (code) => {
        if (code === 0) {
          try {
            // Try to parse JSON response
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            // Fallback to plain text
            resolve({
              success: true,
              result: stdout,
              agent: this.agentId,
              execution_method: 'child_process'
            });
          }
        } else {
          reject(new Error(`Child process exited with code ${code}: ${stderr}`));
        }
      });
      
      childProcess.on('error', (error) => {
        reject(error);
      });
      
      // Timeout after 5 minutes
      setTimeout(() => {
        childProcess.kill();
        reject(new Error('Task execution timeout'));
      }, 300000);
    });
  }

  /**
   * Enhance result with coordination features
   */
  async enhanceResult(result, originalTask) {
    // Ensure result has proper structure
    const enhancedResult = {
      success: result.success !== false,
      result: result.result || result.output || result.response || result,
      agent: this.agentId,
      agent_type: this.agentType,
      execution_method: 'wrapped',
      timestamp: new Date().toISOString(),
      original_task: originalTask
    };
    
    // Add any file changes
    if (result.file_changes) {
      enhancedResult.file_changes = result.file_changes;
    }
    
    // Add any commands executed
    if (result.commands) {
      enhancedResult.commands_executed = result.commands;
    }
    
    // Add coordination metadata
    enhancedResult.coordination_metadata = {
      wrapped: true,
      capabilities_used: this.agentCapabilities,
      task_complexity: this.assessTaskComplexity(originalTask),
      performance_score: this.calculatePerformanceScore(result)
    };
    
    return enhancedResult;
  }

  /**
   * Fallback execution when original agent fails
   */
  async fallbackExecution(task, error = null) {
    console.log(`🔄 Fallback execution for ${this.agentType} task`);
    
    // Simple fallback based on agent type
    const fallbackResult = await this.generateFallbackResult(task, error);
    
    return {
      success: false,
      result: fallbackResult,
      agent: this.agentId,
      agent_type: this.agentType,
      execution_method: 'fallback',
      error: error?.message || 'Original agent execution failed',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate fallback result based on agent type
   */
  async generateFallbackResult(task, error) {
    const prompt = task.prompt || task.description || '';
    const file = task.file || '';
    
    switch (this.agentType) {
      case 'claude':
        return {
          analysis: `Claude analysis would focus on architecture and refactoring for: ${file}`,
          recommendations: [
            'Consider code structure improvements',
            'Review for security best practices',
            'Ensure proper documentation'
          ],
          fallback_reason: 'Original Claude agent unavailable'
        };
        
      case 'gpt':
        return {
          implementation: `GPT implementation would handle backend logic for: ${prompt}`,
          code_suggestions: [
            'Implement proper error handling',
            'Add input validation',
            'Consider scalability'
          ],
          fallback_reason: 'Original GPT agent unavailable'
        };
        
      case 'deepseek':
        return {
          testing: `DeepSeek testing would validate: ${file}`,
          test_suggestions: [
            'Add unit tests',
            'Implement integration tests',
            'Check edge cases'
          ],
          fallback_reason: 'Original DeepSeek agent unavailable'
        };
        
      case 'mistral':
        return {
          documentation: `Mistral documentation would document: ${prompt}`,
          doc_suggestions: [
            'Add comprehensive comments',
            'Create user documentation',
            'Update API documentation'
          ],
          fallback_reason: 'Original Mistral agent unavailable'
        };
        
      case 'gemini':
        return {
          analysis: `Gemini analysis would optimize: ${file}`,
          optimization_suggestions: [
            'Identify performance bottlenecks',
            'Suggest code improvements',
            'Review patterns and practices'
          ],
          fallback_reason: 'Original Gemini agent unavailable'
        };
        
      default:
        return {
          message: `Fallback execution for ${this.agentType}`,
          task_summary: prompt,
          fallback_reason: 'Original agent unavailable'
        };
    }
  }

  /**
   * Assess task complexity
   */
  assessTaskComplexity(task) {
    const prompt = task.prompt || task.description || '';
    const file = task.file || '';
    
    let complexity = 'medium';
    
    if (prompt.includes('simple') || prompt.includes('quick') || prompt.length < 100) {
      complexity = 'low';
    } else if (prompt.includes('complex') || prompt.includes('advanced') || 
               prompt.includes('refactor') || prompt.length > 1000) {
      complexity = 'high';
    }
    
    // File-based complexity assessment
    if (file.includes('test') || file.includes('spec')) {
      complexity = 'low';
    } else if (file.includes('config') || file.includes('package.json')) {
      complexity = 'high';
    }
    
    return complexity;
  }

  /**
   * Calculate performance score
   */
  calculatePerformanceScore(result) {
    let score = 0.7; // Base score
    
    if (result.success !== false) {
      score += 0.2;
    }
    
    if (result.file_changes && result.file_changes.length > 0) {
      score += 0.1;
    }
    
    if (result.commands && result.commands.length > 0) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Start wrapped agent
   */
  async start() {
    console.log(`🎁 Starting wrapped ${this.agentType} agent...`);
    
    // Load original agent
    await this.loadOriginalAgent();
    
    // Start enhanced agent runner
    await super.start();
    
    console.log(`✅ Wrapped ${this.agentType} agent started successfully`);
  }

  /**
   * Shutdown wrapped agent
   */
  async shutdown() {
    console.log(`🛑 Shutting down wrapped ${this.agentType} agent...`);
    
    // Clean up original agent if needed
    if (this.originalAgentModule && typeof this.originalAgentModule.shutdown === 'function') {
      try {
        await this.originalAgentModule.shutdown();
      } catch (error) {
        console.error(`Error shutting down original agent: ${error.message}`);
      }
    }
    
    // Shutdown enhanced agent runner
    await super.shutdown();
    
    console.log(`✅ Wrapped ${this.agentType} agent shutdown complete`);
  }
}

module.exports = UniversalAgentWrapper;