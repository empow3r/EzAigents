/**
 * Enhanced Token-Optimized Agent
 * Example implementation with all token optimization features
 */

const BaseAgent = require('./base-agent');
const TokenManager = require('../shared/token-manager');
const SmartTaskRouter = require('../shared/task-router');
const ContextOptimizer = require('../shared/context-optimizer');
const fs = require('fs').promises;
const path = require('path');

class TokenOptimizedAgent extends BaseAgent {
  constructor(config) {
    super(config);
    
    // Initialize optimization components
    this.tokenManager = new TokenManager(this.redis);
    this.router = new SmartTaskRouter();
    this.contextOptimizer = new ContextOptimizer(this.redis);
    
    // Session tracking
    this.sessionTokens = { input: 0, output: 0 };
    this.sessionCost = 0;
    this.completedTasks = new Set();
    this.startTime = Date.now();
    
    // Cache for similar prompts
    this.promptCache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Process task with token optimization
   */
  async processTask(task) {
    try {
      this.logger.info('Processing task with optimization', { taskId: task.id });
      
      // Route task to optimal model
      const routing = await this.router.routeTask(task);
      this.logger.info('Task routed', { 
        model: routing.model, 
        complexity: routing.complexity.level,
        reasoning: routing.reasoning 
      });
      
      // Check monthly budget
      await this.tokenManager.enforceMonthlyBudget(this.agentId);
      
      // Check cache for similar prompts
      const cacheKey = this.generatePromptCacheKey(task);
      const cached = this.promptCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
        this.cacheHits++;
        this.logger.info('Cache hit for similar prompt');
        return cached.result;
      }
      
      this.cacheMisses++;
      
      // Extract optimized context
      let context = '';
      if (task.file) {
        context = await this.contextOptimizer.extractRelevantContext(
          task.file, 
          task.prompt,
          Math.floor(routing.budget.input * 0.7) // Leave 30% for prompt structure
        );
      }
      
      // Build optimized prompt
      const prompt = this.buildOptimizedPrompt(task, context, routing.complexity.level);
      
      // Count and validate tokens
      const inputTokens = this.tokenManager.countTokens(
        prompt.system + prompt.user, 
        routing.model
      );
      
      // Handle token budget exceeded
      if (inputTokens > routing.budget.input) {
        this.logger.warn('Token budget exceeded, applying optimization', {
          required: inputTokens,
          budget: routing.budget.input
        });
        
        // Try fallback model first
        if (routing.fallbackModel && this.shouldUseFallback(routing)) {
          routing.model = routing.fallbackModel;
          this.logger.info('Switching to fallback model', { model: routing.model });
        } else {
          // Trim context to fit budget
          const targetTokens = Math.floor(routing.budget.input * 0.5);
          context = await this.trimContextToTokens(context, targetTokens, routing.model);
          prompt.user = `Task: ${task.prompt}\nContext:\n${context}`;
        }
      }
      
      // Make API call with optimizations
      const response = await this.callOptimizedAPI(
        prompt, 
        routing.model, 
        routing.budget.output
      );
      
      // Count output tokens
      const outputTokens = this.tokenManager.countTokens(response, routing.model);
      
      // Track usage and cost
      const cost = await this.tokenManager.trackUsage(
        this.agentId,
        task,
        inputTokens,
        outputTokens,
        routing.model
      );
      
      // Update session stats
      this.sessionTokens.input += inputTokens;
      this.sessionTokens.output += outputTokens;
      this.sessionCost += cost.total;
      this.completedTasks.add(task.id);
      
      // Cache successful result
      this.promptCache.set(cacheKey, {
        result: response,
        timestamp: Date.now(),
        cost: cost.total
      });
      
      // Clean cache if too large
      if (this.promptCache.size > 100) {
        this.cleanPromptCache();
      }
      
      // Log efficiency metrics
      this.logger.info('Task completed with optimization', {
        taskId: task.id,
        model: routing.model,
        inputTokens,
        outputTokens,
        cost: cost.total,
        savingsVsBaseline: this.calculateSavings(cost.total, routing.complexity.level)
      });
      
      return this.processResponse(response, task);
      
    } catch (error) {
      this.logger.error('Optimized task processing failed', { 
        taskId: task.id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Build optimized prompt based on task and complexity
   */
  buildOptimizedPrompt(task, context, complexityLevel) {
    // Use role snippets instead of verbose descriptions
    const roleSnippets = {
      architecture: 'Expert architect. Focus: patterns, scalability.',
      refactor: 'Refactoring expert. Focus: clean code, performance.',
      implementation: 'Implementation expert. Focus: working code, best practices.',
      bugfix: 'Debug expert. Focus: root cause, fix validation.',
      testing: 'Test expert. Focus: coverage, edge cases.',
      documentation: 'Tech writer. Focus: clarity, examples.'
    };
    
    const taskType = this.determineTaskType(task.prompt);
    const role = roleSnippets[taskType] || 'Expert developer.';
    
    // Use structured prompts to reduce tokens
    if (complexityLevel === 'simple') {
      return {
        system: role,
        user: `${task.prompt}\n\nFile: ${task.file || 'N/A'}\n${context ? `\nRelevant code:\n${context}` : ''}`
      };
    }
    
    // For complex tasks, add more context but still optimize
    return {
      system: `${role} Provide concise, high-quality solutions.`,
      user: `Task: ${task.prompt}\n\nFile: ${task.file || 'N/A'}\n\nContext:\n${context || 'No specific context'}\n\nRequirements: Focus on the specific task. Be concise but complete.`
    };
  }

  /**
   * Determine task type from prompt
   */
  determineTaskType(prompt) {
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes('architect') || promptLower.includes('design')) return 'architecture';
    if (promptLower.includes('refactor') || promptLower.includes('optimize')) return 'refactor';
    if (promptLower.includes('implement') || promptLower.includes('create')) return 'implementation';
    if (promptLower.includes('fix') || promptLower.includes('bug')) return 'bugfix';
    if (promptLower.includes('test') || promptLower.includes('spec')) return 'testing';
    if (promptLower.includes('document') || promptLower.includes('comment')) return 'documentation';
    
    return 'general';
  }

  /**
   * Make optimized API call
   */
  async callOptimizedAPI(prompt, model, maxTokens) {
    const config = this.getAPIConfig(model, prompt, maxTokens);
    
    // Add optimization headers
    config.headers = config.headers || {};
    config.headers['X-Agent-ID'] = this.agentId;
    config.headers['X-Optimization'] = 'token-optimized';
    
    const response = await fetch(this.getAPIEndpoint(model), config);
    
    if (!response.ok) {
      // Handle rate limits with exponential backoff
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '60');
        this.logger.warn(`Rate limited, waiting ${retryAfter}s`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.callOptimizedAPI(prompt, model, maxTokens);
      }
      
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return this.extractResponse(data, model);
  }

  /**
   * Get API configuration for model
   */
  getAPIConfig(model, prompt, maxTokens) {
    const configs = {
      'claude-3-opus': {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CLAUDE_API_KEY}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          messages: [{ role: 'user', content: prompt.user }],
          system: prompt.system,
          max_tokens: maxTokens,
          temperature: 0.3
        })
      },
      'gpt-4': {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user }
          ],
          max_tokens: maxTokens,
          temperature: 0.3
        })
      },
      'gpt-4o': {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user }
          ],
          max_tokens: maxTokens,
          temperature: 0.3
        })
      },
      'gemini-pro': {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${prompt.system}\n\n${prompt.user}` }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: maxTokens
          }
        })
      },
      'deepseek': {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-coder',
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user }
          ],
          max_tokens: maxTokens,
          temperature: 0.3
        })
      }
    };
    
    return configs[model] || configs['gpt-4o'];
  }

  /**
   * Get API endpoint for model
   */
  getAPIEndpoint(model) {
    const endpoints = {
      'claude-3-opus': 'https://api.anthropic.com/v1/messages',
      'gpt-4': 'https://api.openai.com/v1/chat/completions',
      'gpt-4o': 'https://api.openai.com/v1/chat/completions',
      'gemini-pro': `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      'deepseek': 'https://api.deepseek.com/v1/chat/completions',
      'mistral': 'https://api.mistral.ai/v1/chat/completions'
    };
    
    return endpoints[model];
  }

  /**
   * Extract response from API data
   */
  extractResponse(data, model) {
    if (model.includes('claude')) {
      return data.content?.[0]?.text || '';
    } else if (model.includes('gpt')) {
      return data.choices?.[0]?.message?.content || '';
    } else if (model.includes('gemini')) {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (model.includes('deepseek')) {
      return data.choices?.[0]?.message?.content || '';
    }
    
    return '';
  }

  /**
   * Trim context to fit token budget
   */
  async trimContextToTokens(context, maxTokens, model) {
    return await this.tokenManager.optimizePrompt(context, maxTokens, model);
  }

  /**
   * Generate cache key for prompt
   */
  generatePromptCacheKey(task) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5');
    hash.update(task.prompt);
    hash.update(task.file || '');
    return hash.digest('hex');
  }

  /**
   * Clean old entries from prompt cache
   */
  cleanPromptCache() {
    const now = Date.now();
    const oldestAllowed = now - 3600000; // 1 hour
    
    for (const [key, value] of this.promptCache.entries()) {
      if (value.timestamp < oldestAllowed) {
        this.promptCache.delete(key);
      }
    }
  }

  /**
   * Should use fallback model
   */
  shouldUseFallback(routing) {
    // Use fallback if we've exceeded 80% of daily budget
    return this.sessionCost > 40; // $50 daily budget * 0.8
  }

  /**
   * Calculate savings vs baseline
   */
  calculateSavings(actualCost, complexityLevel) {
    const baselineCosts = {
      simple: 0.05,
      moderate: 0.10,
      complex: 0.20
    };
    
    const baseline = baselineCosts[complexityLevel] || 0.10;
    const savings = baseline - actualCost;
    const savingsPercent = (savings / baseline) * 100;
    
    return {
      baseline,
      actual: actualCost,
      saved: savings,
      percent: savingsPercent
    };
  }

  /**
   * Generate session report
   */
  async generateSessionReport() {
    const duration = Date.now() - this.startTime;
    const avgInputTokens = this.completedTasks.size > 0 
      ? this.sessionTokens.input / this.completedTasks.size 
      : 0;
    const avgOutputTokens = this.completedTasks.size > 0 
      ? this.sessionTokens.output / this.completedTasks.size 
      : 0;
    const avgCostPerTask = this.completedTasks.size > 0 
      ? this.sessionCost / this.completedTasks.size 
      : 0;
    
    const report = {
      agentId: this.agentId,
      session: {
        duration: duration,
        tasksCompleted: this.completedTasks.size,
        tokens: this.sessionTokens,
        cost: this.sessionCost,
        efficiency: {
          avgInputTokens,
          avgOutputTokens,
          avgCostPerTask,
          tokensPerDollar: this.sessionCost > 0 
            ? (this.sessionTokens.input + this.sessionTokens.output) / this.sessionCost 
            : 0
        },
        cache: {
          hits: this.cacheHits,
          misses: this.cacheMisses,
          hitRate: this.cacheHits + this.cacheMisses > 0 
            ? (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100 
            : 0
        }
      },
      timestamp: new Date().toISOString()
    };
    
    // Save report
    const reportPath = path.join(this.memoryDir, 'efficiency-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Log summary
    this.logger.info('Session report generated', {
      tasksCompleted: report.session.tasksCompleted,
      totalCost: report.session.cost.toFixed(4),
      avgCostPerTask: report.session.efficiency.avgCostPerTask.toFixed(4),
      cacheHitRate: report.session.cache.hitRate.toFixed(1) + '%'
    });
    
    return report;
  }

  /**
   * Shutdown with report generation
   */
  async shutdown() {
    await this.generateSessionReport();
    await super.shutdown();
  }
}

module.exports = TokenOptimizedAgent;