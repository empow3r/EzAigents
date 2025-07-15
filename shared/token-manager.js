/**
 * Token Manager for Ez Aigents
 * Handles token counting, budgeting, and cost tracking
 */

const tiktoken = require('@dqbd/tiktoken');
const Redis = require('redis');

class TokenManager {
  constructor(redisClient) {
    this.redis = redisClient;
    
    // Initialize encoders for different models
    this.encoders = {
      'gpt-4': tiktoken.encoding_for_model('gpt-4'),
      'gpt-4o': tiktoken.encoding_for_model('gpt-4'),
      'gpt-3.5-turbo': tiktoken.encoding_for_model('gpt-3.5-turbo'),
      'claude': tiktoken.encoding_for_model('gpt-4'), // Use GPT-4 as approximation
      'gemini': tiktoken.encoding_for_model('gpt-3.5-turbo'),
      'deepseek': tiktoken.encoding_for_model('gpt-3.5-turbo'),
      'mistral': tiktoken.encoding_for_model('gpt-3.5-turbo')
    };
    
    // Token budgets per task complexity
    this.budgets = {
      'simple': { input: 500, output: 300 },
      'moderate': { input: 1000, output: 800 },
      'complex': { input: 2000, output: 1500 },
      'analysis': { input: 4000, output: 2000 }
    };
    
    // Pricing per million tokens (input/output)
    this.pricing = {
      'claude-3-opus': { input: 15, output: 75 },
      'claude-3-sonnet': { input: 3, output: 15 },
      'gpt-4': { input: 30, output: 60 },
      'gpt-4o': { input: 5, output: 15 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
      'gemini-pro': { input: 0.5, output: 1.5 },
      'gemini-flash': { input: 0.075, output: 0.3 },
      'deepseek': { input: 0.14, output: 0.28 },
      'mistral-small': { input: 0.25, output: 0.75 },
      'mistral-large': { input: 8, output: 24 }
    };
  }

  /**
   * Count tokens in text for a specific model
   */
  countTokens(text, model) {
    try {
      const modelFamily = this.getModelFamily(model);
      const encoder = this.encoders[modelFamily] || this.encoders['gpt-3.5-turbo'];
      return encoder.encode(text).length;
    } catch (error) {
      // Fallback to character-based estimation
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Get model family for encoder selection
   */
  getModelFamily(model) {
    if (model.includes('gpt-4')) return 'gpt-4';
    if (model.includes('gpt-3.5')) return 'gpt-3.5-turbo';
    if (model.includes('claude')) return 'claude';
    if (model.includes('gemini')) return 'gemini';
    if (model.includes('deepseek')) return 'deepseek';
    if (model.includes('mistral')) return 'mistral';
    return 'gpt-3.5-turbo';
  }

  /**
   * Estimate cost for tokens
   */
  estimateCost(tokens, model, type = 'input') {
    const pricing = this.pricing[model];
    if (!pricing) {
      console.warn(`No pricing found for model: ${model}`);
      return 0;
    }
    
    return (tokens / 1_000_000) * pricing[type];
  }

  /**
   * Get token budget for task complexity
   */
  getBudgetForTask(taskComplexity) {
    return this.budgets[taskComplexity] || this.budgets.moderate;
  }

  /**
   * Track token usage and costs
   */
  async trackUsage(agentId, task, inputTokens, outputTokens, model) {
    const cost = {
      input: this.estimateCost(inputTokens, model, 'input'),
      output: this.estimateCost(outputTokens, model, 'output'),
      total: 0
    };
    cost.total = cost.input + cost.output;

    // Store in Redis for analytics
    const date = new Date().toISOString().split('T')[0];
    
    // Daily tracking
    await this.redis.hincrby(`tokens:${agentId}:${date}`, 'input', inputTokens);
    await this.redis.hincrby(`tokens:${agentId}:${date}`, 'output', outputTokens);
    await this.redis.hincrbyfloat(`cost:${agentId}:${date}`, 'total', cost.total);
    
    // Monthly tracking
    const month = date.substring(0, 7);
    await this.redis.hincrby(`tokens:${agentId}:${month}`, 'input', inputTokens);
    await this.redis.hincrby(`tokens:${agentId}:${month}`, 'output', outputTokens);
    await this.redis.hincrbyfloat(`cost:${agentId}:${month}`, 'total', cost.total);
    
    // Task-specific tracking
    await this.redis.hset(`task:${task.id}:tokens`, {
      input: inputTokens,
      output: outputTokens,
      model: model,
      cost: cost.total,
      timestamp: Date.now()
    });
    
    return cost;
  }

  /**
   * Check if agent is within monthly budget
   */
  async checkMonthlyBudget(agentId, maxBudget = 1000) {
    const month = new Date().toISOString().substring(0, 7);
    const spent = await this.redis.hget(`cost:${agentId}:${month}`, 'total') || '0';
    const spentAmount = parseFloat(spent);
    
    return {
      spent: spentAmount,
      budget: maxBudget,
      remaining: maxBudget - spentAmount,
      withinBudget: spentAmount < maxBudget
    };
  }

  /**
   * Enforce monthly budget limits
   */
  async enforceMonthlyBudget(agentId, maxBudget = 1000) {
    const budgetStatus = await this.checkMonthlyBudget(agentId, maxBudget);
    
    if (!budgetStatus.withinBudget) {
      throw new Error(
        `Monthly budget exceeded: $${budgetStatus.spent.toFixed(2)}/$${maxBudget}. ` +
        `Consider using cheaper models or optimizing prompts.`
      );
    }
    
    // Warn if close to limit
    if (budgetStatus.remaining < maxBudget * 0.1) {
      console.warn(
        `⚠️ Agent ${agentId} approaching budget limit: ` +
        `$${budgetStatus.remaining.toFixed(2)} remaining`
      );
    }
    
    return budgetStatus;
  }

  /**
   * Get usage analytics for an agent
   */
  async getUsageAnalytics(agentId, period = 'daily') {
    const dateKey = period === 'daily' 
      ? new Date().toISOString().split('T')[0]
      : new Date().toISOString().substring(0, 7);
    
    const tokens = await this.redis.hgetall(`tokens:${agentId}:${dateKey}`);
    const cost = await this.redis.hget(`cost:${agentId}:${dateKey}`, 'total');
    
    return {
      period: dateKey,
      tokens: {
        input: parseInt(tokens?.input || 0),
        output: parseInt(tokens?.output || 0),
        total: parseInt(tokens?.input || 0) + parseInt(tokens?.output || 0)
      },
      cost: parseFloat(cost || 0),
      efficiency: tokens?.input ? 
        ((parseInt(tokens.input) + parseInt(tokens.output)) / parseFloat(cost || 1)).toFixed(2) 
        : 0
    };
  }

  /**
   * Get system-wide token usage summary
   */
  async getSystemSummary() {
    const agents = await this.redis.smembers('agents:active');
    const date = new Date().toISOString().split('T')[0];
    const summary = {
      date: date,
      totalCost: 0,
      totalTokens: { input: 0, output: 0 },
      byAgent: {},
      byModel: {}
    };
    
    for (const agentId of agents) {
      const analytics = await this.getUsageAnalytics(agentId, 'daily');
      summary.byAgent[agentId] = analytics;
      summary.totalCost += analytics.cost;
      summary.totalTokens.input += analytics.tokens.input;
      summary.totalTokens.output += analytics.tokens.output;
    }
    
    return summary;
  }

  /**
   * Optimize prompt to fit within token budget
   */
  async optimizePrompt(prompt, maxTokens, model) {
    const currentTokens = this.countTokens(prompt, model);
    
    if (currentTokens <= maxTokens) {
      return prompt;
    }
    
    // Calculate reduction ratio
    const ratio = maxTokens / currentTokens;
    
    // Trim prompt proportionally
    const targetLength = Math.floor(prompt.length * ratio * 0.9); // 90% to ensure under limit
    
    if (prompt.length <= targetLength) {
      return prompt;
    }
    
    // Smart trimming - try to preserve structure
    const trimmed = prompt.substring(0, targetLength);
    const lastSentence = trimmed.lastIndexOf('.');
    const lastNewline = trimmed.lastIndexOf('\n');
    
    const cutPoint = Math.max(lastSentence, lastNewline);
    
    return cutPoint > targetLength * 0.8 
      ? trimmed.substring(0, cutPoint + 1) + '\n\n[Content trimmed to fit token budget]'
      : trimmed + '...\n\n[Content trimmed to fit token budget]';
  }
}

module.exports = TokenManager;