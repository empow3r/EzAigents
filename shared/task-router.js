/**
 * Smart Task Router for Ez Aigents
 * Routes tasks to optimal models based on complexity and cost
 */

const fs = require('fs').promises;
const path = require('path');

class SmartTaskRouter {
  constructor() {
    // Task complexity patterns
    this.complexityPatterns = {
      complex: {
        keywords: ['architect', 'refactor', 'redesign', 'optimize', 'scalability', 
                  'security', 'performance', 'migration', 'integration', 'infrastructure'],
        filePatterns: [/test/, /spec/, /config/, /schema/, /migration/],
        minFileSize: 10000, // 10KB
        score: 0.8
      },
      moderate: {
        keywords: ['implement', 'add', 'create', 'update', 'modify', 'enhance',
                  'feature', 'endpoint', 'api', 'component'],
        filePatterns: [/controller/, /service/, /model/, /util/],
        minFileSize: 5000, // 5KB
        score: 0.5
      },
      simple: {
        keywords: ['fix', 'typo', 'comment', 'rename', 'format', 'style',
                  'documentation', 'readme', 'minor', 'small'],
        filePatterns: [/\.md$/, /\.txt$/, /\.json$/],
        minFileSize: 0,
        score: 0.2
      }
    };

    // Model capabilities and costs
    this.modelProfiles = {
      'claude-3-opus': {
        capabilities: ['architecture', 'complex-refactoring', 'security-analysis', 'large-context'],
        maxContext: 200000,
        costScore: 10, // Highest cost
        qualityScore: 10
      },
      'gpt-4': {
        capabilities: ['general-coding', 'logic', 'api-design', 'debugging'],
        maxContext: 128000,
        costScore: 8,
        qualityScore: 9
      },
      'gpt-4o': {
        capabilities: ['general-coding', 'fast-iteration', 'api-development'],
        maxContext: 128000,
        costScore: 4,
        qualityScore: 8
      },
      'claude-3-sonnet': {
        capabilities: ['balanced-tasks', 'code-review', 'documentation'],
        maxContext: 200000,
        costScore: 3,
        qualityScore: 8
      },
      'gemini-pro': {
        capabilities: ['analysis', 'documentation', 'code-explanation'],
        maxContext: 32000,
        costScore: 1,
        qualityScore: 7
      },
      'deepseek': {
        capabilities: ['testing', 'simple-coding', 'bug-fixes'],
        maxContext: 16000,
        costScore: 0.5,
        qualityScore: 6
      },
      'mistral-small': {
        capabilities: ['documentation', 'formatting', 'simple-tasks'],
        maxContext: 8000,
        costScore: 0.8,
        qualityScore: 5
      }
    };

    // Routing rules
    this.routingRules = {
      // Task type to model mapping
      architecture: ['claude-3-opus', 'gpt-4'],
      security: ['claude-3-opus', 'gpt-4'],
      refactoring: ['claude-3-opus', 'gpt-4', 'claude-3-sonnet'],
      implementation: ['gpt-4o', 'gpt-4', 'claude-3-sonnet'],
      testing: ['deepseek', 'mistral-small', 'gemini-pro'],
      documentation: ['gemini-pro', 'mistral-small', 'deepseek'],
      bugfix: ['gpt-4o', 'deepseek', 'gemini-pro'],
      formatting: ['mistral-small', 'deepseek']
    };
  }

  /**
   * Route task to optimal model based on complexity and requirements
   */
  async routeTask(task) {
    // Analyze task complexity
    const complexity = await this.analyzeComplexity(task);
    
    // Determine task type
    const taskType = this.determineTaskType(task.prompt);
    
    // Get optimal routing
    const routing = this.getOptimalRouting(complexity, taskType, task);
    
    // Add token budget based on complexity
    const budget = this.getTokenBudget(complexity.level);
    
    return {
      model: routing.model,
      queue: `queue:${routing.model}`,
      budget: budget,
      priority: routing.priority,
      fallbackModel: routing.fallback,
      complexity: complexity,
      reasoning: routing.reasoning
    };
  }

  /**
   * Analyze task complexity based on multiple factors
   */
  async analyzeComplexity(task) {
    const factors = {
      fileSize: 0,
      promptComplexity: 0,
      taskType: 0,
      codeComplexity: 0
    };

    // File size analysis
    if (task.file) {
      try {
        const stats = await fs.stat(task.file);
        factors.fileSize = Math.min(stats.size / 50000, 1); // Normalize to 0-1
      } catch (error) {
        factors.fileSize = 0.5; // Default for new files
      }
    }

    // Prompt complexity analysis
    const promptLower = task.prompt.toLowerCase();
    let complexityScore = 0;
    
    // Check for complexity indicators
    for (const [level, config] of Object.entries(this.complexityPatterns)) {
      const keywordMatches = config.keywords.filter(k => promptLower.includes(k)).length;
      if (keywordMatches > 0) {
        complexityScore = Math.max(complexityScore, config.score);
      }
    }
    factors.promptComplexity = complexityScore;

    // Task type complexity
    if (this.isArchitecturalTask(task.prompt)) {
      factors.taskType = 0.9;
    } else if (this.isImplementationTask(task.prompt)) {
      factors.taskType = 0.6;
    } else if (this.isSimpleTask(task.prompt)) {
      factors.taskType = 0.2;
    } else {
      factors.taskType = 0.5;
    }

    // Code complexity (if file exists)
    if (task.file && task.file.endsWith('.js') || task.file.endsWith('.ts')) {
      factors.codeComplexity = await this.analyzeCodeComplexity(task.file);
    }

    // Calculate overall complexity
    const weights = {
      fileSize: 0.2,
      promptComplexity: 0.4,
      taskType: 0.3,
      codeComplexity: 0.1
    };
    
    const weightedScore = Object.entries(factors).reduce((sum, [key, value]) => {
      return sum + (value * weights[key]);
    }, 0);

    return {
      score: weightedScore,
      level: this.getComplexityLevel(weightedScore),
      factors: factors,
      details: this.getComplexityDetails(factors)
    };
  }

  /**
   * Get complexity level from score
   */
  getComplexityLevel(score) {
    if (score >= 0.7) return 'complex';
    if (score >= 0.4) return 'moderate';
    return 'simple';
  }

  /**
   * Get detailed complexity analysis
   */
  getComplexityDetails(factors) {
    const details = [];
    
    if (factors.fileSize > 0.7) details.push('Large file size');
    if (factors.promptComplexity > 0.7) details.push('Complex requirements');
    if (factors.taskType > 0.7) details.push('Architectural task');
    if (factors.codeComplexity > 0.7) details.push('Complex code structure');
    
    return details;
  }

  /**
   * Analyze code complexity
   */
  async analyzeCodeComplexity(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Simple complexity metrics
      const metrics = {
        lines: lines.length,
        functions: (content.match(/function\s+\w+|=>\s*{|async\s+\w+/g) || []).length,
        classes: (content.match(/class\s+\w+/g) || []).length,
        imports: (content.match(/import\s+.+from|require\(/g) || []).length,
        conditions: (content.match(/if\s*\(|switch\s*\(|\?\s*:/g) || []).length,
        loops: (content.match(/for\s*\(|while\s*\(|\.map\(|\.forEach\(/g) || []).length
      };
      
      // Calculate complexity score
      const complexityScore = (
        (metrics.lines / 1000) * 0.2 +
        (metrics.functions / 50) * 0.2 +
        (metrics.classes / 10) * 0.2 +
        (metrics.conditions / 100) * 0.2 +
        (metrics.loops / 50) * 0.2
      );
      
      return Math.min(complexityScore, 1);
    } catch (error) {
      return 0.5; // Default for errors
    }
  }

  /**
   * Determine task type from prompt
   */
  determineTaskType(prompt) {
    const promptLower = prompt.toLowerCase();
    
    // Check for specific task types
    const taskTypes = [
      { type: 'architecture', keywords: ['architect', 'design', 'structure', 'refactor entire'] },
      { type: 'security', keywords: ['security', 'vulnerability', 'auth', 'encryption'] },
      { type: 'refactoring', keywords: ['refactor', 'optimize', 'improve', 'clean up'] },
      { type: 'implementation', keywords: ['implement', 'create', 'add', 'build'] },
      { type: 'testing', keywords: ['test', 'spec', 'unit test', 'integration test'] },
      { type: 'documentation', keywords: ['document', 'docs', 'readme', 'comment'] },
      { type: 'bugfix', keywords: ['fix', 'bug', 'error', 'issue', 'problem'] },
      { type: 'formatting', keywords: ['format', 'style', 'lint', 'prettier'] }
    ];
    
    for (const { type, keywords } of taskTypes) {
      if (keywords.some(k => promptLower.includes(k))) {
        return type;
      }
    }
    
    return 'general';
  }

  /**
   * Check if task is architectural
   */
  isArchitecturalTask(prompt) {
    const architecturalKeywords = [
      'architect', 'redesign', 'restructure', 'refactor entire',
      'system design', 'scalability', 'infrastructure'
    ];
    
    return architecturalKeywords.some(k => prompt.toLowerCase().includes(k));
  }

  /**
   * Check if task is implementation
   */
  isImplementationTask(prompt) {
    const implementationKeywords = [
      'implement', 'create', 'add feature', 'build',
      'develop', 'code', 'write'
    ];
    
    return implementationKeywords.some(k => prompt.toLowerCase().includes(k));
  }

  /**
   * Check if task is simple
   */
  isSimpleTask(prompt) {
    const simpleKeywords = [
      'typo', 'comment', 'rename', 'format',
      'minor', 'small', 'quick', 'simple'
    ];
    
    return simpleKeywords.some(k => prompt.toLowerCase().includes(k));
  }

  /**
   * Get optimal routing based on complexity and task type
   */
  getOptimalRouting(complexity, taskType, task) {
    // Get candidate models for task type
    const candidates = this.routingRules[taskType] || this.routingRules.general;
    
    // Filter by complexity
    let selectedModel;
    let fallbackModel;
    let priority;
    let reasoning = [];
    
    switch (complexity.level) {
      case 'complex':
        // Use high-end models for complex tasks
        selectedModel = candidates.find(m => 
          ['claude-3-opus', 'gpt-4'].includes(m)
        ) || 'claude-3-opus';
        fallbackModel = 'gpt-4';
        priority = 'high';
        reasoning.push('Complex task requiring advanced reasoning');
        break;
        
      case 'moderate':
        // Use mid-tier models for moderate tasks
        selectedModel = candidates.find(m => 
          ['gpt-4o', 'claude-3-sonnet', 'gpt-4'].includes(m)
        ) || 'gpt-4o';
        fallbackModel = 'claude-3-sonnet';
        priority = 'normal';
        reasoning.push('Moderate complexity, balanced cost/quality');
        break;
        
      case 'simple':
        // Use efficient models for simple tasks
        selectedModel = candidates.find(m => 
          ['deepseek', 'mistral-small', 'gemini-pro'].includes(m)
        ) || 'deepseek';
        fallbackModel = 'mistral-small';
        priority = 'low';
        reasoning.push('Simple task, optimizing for cost');
        break;
        
      default:
        selectedModel = 'gpt-4o';
        fallbackModel = 'gemini-pro';
        priority = 'normal';
        reasoning.push('Default routing');
    }
    
    // Add specific reasoning
    if (complexity.factors.fileSize > 0.8) {
      reasoning.push('Large file requires model with high context window');
      if (!['claude-3-opus', 'claude-3-sonnet', 'gpt-4'].includes(selectedModel)) {
        selectedModel = 'claude-3-sonnet'; // Good context window, lower cost
      }
    }
    
    if (taskType === 'security') {
      reasoning.push('Security task requires highest quality model');
      selectedModel = 'claude-3-opus';
      fallbackModel = 'gpt-4';
    }
    
    return {
      model: selectedModel,
      fallback: fallbackModel,
      priority: priority,
      reasoning: reasoning.join('; ')
    };
  }

  /**
   * Get token budget based on complexity
   */
  getTokenBudget(complexityLevel) {
    const budgets = {
      simple: { input: 500, output: 300 },
      moderate: { input: 1500, output: 1000 },
      complex: { input: 3000, output: 2000 }
    };
    
    return budgets[complexityLevel] || budgets.moderate;
  }

  /**
   * Get cost estimate for routing
   */
  getCostEstimate(model, tokenBudget) {
    const pricing = {
      'claude-3-opus': { input: 15, output: 75 },
      'gpt-4': { input: 30, output: 60 },
      'gpt-4o': { input: 5, output: 15 },
      'claude-3-sonnet': { input: 3, output: 15 },
      'gemini-pro': { input: 0.5, output: 1.5 },
      'deepseek': { input: 0.14, output: 0.28 },
      'mistral-small': { input: 0.25, output: 0.75 }
    };
    
    const modelPricing = pricing[model] || pricing['gpt-4o'];
    
    const inputCost = (tokenBudget.input / 1_000_000) * modelPricing.input;
    const outputCost = (tokenBudget.output / 1_000_000) * modelPricing.output;
    
    return {
      estimated: inputCost + outputCost,
      breakdown: {
        input: inputCost,
        output: outputCost
      }
    };
  }
}

module.exports = SmartTaskRouter;