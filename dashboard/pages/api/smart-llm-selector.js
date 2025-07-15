// Smart LLM Selection System
// Analyzes prompt context and determines the best LLM for the task

class SmartLLMSelector {
  constructor() {
    this.modelCapabilities = {
      'claude-3-opus': {
        strengths: ['complex-reasoning', 'architecture', 'large-context', 'creative-writing'],
        weaknesses: ['speed', 'cost'],
        tokenLimit: 200000,
        costPerToken: 0.000075, // Example pricing
        averageResponseTime: 45000, // ms
        qualityScore: 95
      },
      'gpt-4o': {
        strengths: ['general-purpose', 'coding', 'analysis', 'fast-response'],
        weaknesses: ['complex-reasoning'],
        tokenLimit: 128000,
        costPerToken: 0.00003,
        averageResponseTime: 30000,
        qualityScore: 90
      },
      'deepseek-r1': {
        strengths: ['mathematical-reasoning', 'logic', 'problem-solving', 'step-by-step'],
        weaknesses: ['creative-tasks'],
        tokenLimit: 65536,
        costPerToken: 0.000014,
        averageResponseTime: 35000,
        qualityScore: 92
      },
      'deepseek-coder': {
        strengths: ['coding', 'debugging', 'testing', 'refactoring'],
        weaknesses: ['complex-reasoning', 'architecture'],
        tokenLimit: 32000,
        costPerToken: 0.000014,
        averageResponseTime: 25000,
        qualityScore: 85
      },
      'gemini-pro': {
        strengths: ['analysis', 'research', 'multimodal', 'speed'],
        weaknesses: ['complex-coding'],
        tokenLimit: 32768,
        costPerToken: 0.0000025,
        averageResponseTime: 20000,
        qualityScore: 80
      },
      'mistral-large': {
        strengths: ['efficiency', 'multilingual', 'instruction-following'],
        weaknesses: ['complex-reasoning'],
        tokenLimit: 32000,
        costPerToken: 0.000008,
        averageResponseTime: 22000,
        qualityScore: 82
      }
    };

    this.taskTypeKeywords = {
      'mathematical-reasoning': [
        'mathematical', 'algorithm', 'optimization', 'step-by-step', 'proof', 
        'logic', 'reasoning', 'calculation', 'theorem', 'formula', 'equation'
      ],
      'complex-reasoning': [
        'analyze', 'reasoning', 'logic', 'strategy', 'research', 'evaluation', 
        'compare', 'assess', 'investigate', 'complex', 'advanced'
      ],
      'architecture': [
        'architecture', 'design', 'structure', 'framework', 'system', 'pattern',
        'blueprint', 'plan', 'organize', 'layout', 'hierarchy'
      ],
      'coding': [
        'code', 'implement', 'function', 'class', 'method', 'variable', 'debug',
        'fix', 'programming', 'development', 'build', 'create'
      ],
      'testing': [
        'test', 'validate', 'verify', 'check', 'quality', 'bug', 'error',
        'debugging', 'review', 'audit', 'coverage'
      ],
      'refactoring': [
        'refactor', 'optimize', 'improve', 'clean', 'restructure', 'simplify',
        'enhance', 'modernize', 'update'
      ],
      'analysis': [
        'analyze', 'examine', 'study', 'research', 'investigate', 'review',
        'explore', 'understand', 'interpret'
      ],
      'creative': [
        'creative', 'generate', 'brainstorm', 'innovative', 'artistic', 'design',
        'concept', 'idea', 'original'
      ]
    };

    this.complexityIndicators = {
      high: [
        'complex', 'advanced', 'sophisticated', 'intricate', 'comprehensive',
        'large-scale', 'enterprise', 'production', 'critical', 'mission-critical'
      ],
      medium: [
        'moderate', 'standard', 'typical', 'normal', 'regular', 'common'
      ],
      low: [
        'simple', 'basic', 'easy', 'straightforward', 'minimal', 'quick', 'small'
      ]
    };
  }

  analyzePrompt(prompt, contextLength = 0) {
    const analysis = {
      taskTypes: this.identifyTaskTypes(prompt),
      complexity: this.assessComplexity(prompt),
      urgency: this.assessUrgency(prompt),
      contextLength,
      keywords: this.extractKeywords(prompt)
    };

    return analysis;
  }

  identifyTaskTypes(prompt) {
    const taskTypes = [];
    const promptLower = prompt.toLowerCase();

    for (const [taskType, keywords] of Object.entries(this.taskTypeKeywords)) {
      const matches = keywords.filter(keyword => promptLower.includes(keyword));
      if (matches.length > 0) {
        taskTypes.push({
          type: taskType,
          confidence: matches.length / keywords.length,
          matchedKeywords: matches
        });
      }
    }

    return taskTypes.sort((a, b) => b.confidence - a.confidence);
  }

  assessComplexity(prompt) {
    const promptLower = prompt.toLowerCase();
    let complexity = 'medium'; // default
    let score = 0;

    // Check for complexity indicators
    for (const [level, indicators] of Object.entries(this.complexityIndicators)) {
      const matches = indicators.filter(indicator => promptLower.includes(indicator));
      if (matches.length > 0) {
        if (level === 'high') score += matches.length * 3;
        else if (level === 'medium') score += matches.length * 2;
        else score += matches.length * 1;
      }
    }

    // Consider prompt length as complexity factor
    if (prompt.length > 1000) score += 2;
    else if (prompt.length > 500) score += 1;

    // Consider technical terms
    const technicalTerms = ['api', 'database', 'algorithm', 'framework', 'architecture', 'optimization', 'performance'];
    const techMatches = technicalTerms.filter(term => promptLower.includes(term));
    score += techMatches.length;

    if (score >= 8) complexity = 'high';
    else if (score >= 4) complexity = 'medium';
    else complexity = 'low';

    return { level: complexity, score, factors: this.getComplexityFactors(prompt) };
  }

  getComplexityFactors(prompt) {
    const factors = [];
    const promptLower = prompt.toLowerCase();

    if (prompt.length > 1000) factors.push('long-prompt');
    if (promptLower.includes('architecture') || promptLower.includes('design')) factors.push('architectural');
    if (promptLower.includes('multiple') || promptLower.includes('several')) factors.push('multi-part');
    if (promptLower.includes('complex') || promptLower.includes('advanced')) factors.push('explicitly-complex');

    return factors;
  }

  assessUrgency(prompt) {
    const urgencyKeywords = {
      high: ['urgent', 'asap', 'immediately', 'critical', 'emergency', 'hotfix'],
      medium: ['soon', 'priority', 'important'],
      low: ['eventually', 'when possible', 'low priority']
    };

    const promptLower = prompt.toLowerCase();
    
    for (const [level, keywords] of Object.entries(urgencyKeywords)) {
      if (keywords.some(keyword => promptLower.includes(keyword))) {
        return level;
      }
    }

    return 'medium'; // default
  }

  extractKeywords(prompt) {
    // Simple keyword extraction
    const words = prompt.toLowerCase().match(/\b\w+\b/g) || [];
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did'];
    return words.filter(word => word.length > 3 && !commonWords.includes(word));
  }

  selectBestLLM(prompt, contextLength = 0, preferences = {}) {
    const analysis = this.analyzePrompt(prompt, contextLength);
    const candidates = [];

    // Score each model based on analysis
    for (const [modelName, capabilities] of Object.entries(this.modelCapabilities)) {
      const score = this.calculateModelScore(modelName, capabilities, analysis, preferences);
      candidates.push({
        model: modelName,
        score,
        reasoning: this.generateReasoning(modelName, capabilities, analysis),
        capabilities
      });
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    return {
      recommended: candidates[0],
      alternatives: candidates.slice(1, 3),
      analysis,
      selection_reasoning: this.generateSelectionReasoning(candidates[0], analysis)
    };
  }

  calculateModelScore(modelName, capabilities, analysis, preferences) {
    let score = capabilities.qualityScore; // Base quality score

    // Task type alignment with special handling for DeepSeek R1
    for (const taskType of analysis.taskTypes) {
      if (capabilities.strengths.includes(taskType.type)) {
        score += 20 * taskType.confidence;
      }
      if (capabilities.weaknesses.includes(taskType.type)) {
        score -= 10 * taskType.confidence;
      }
      
      // Special boost for DeepSeek R1 on mathematical reasoning
      if (modelName === 'deepseek-r1' && taskType.type === 'mathematical-reasoning') {
        score += 30 * taskType.confidence; // Extra boost for mathematical tasks
      }
      
      // Special boost for analytical tasks with Gemini
      if (modelName === 'gemini-pro' && taskType.type === 'analysis' && analysis.complexity.level === 'low') {
        score += 25;
      }
    }

    // Complexity alignment
    if (analysis.complexity.level === 'high') {
      if (['claude-3-opus', 'deepseek-r1'].includes(modelName)) {
        score += 15;
      } else {
        score -= 10;
      }
    } else if (analysis.complexity.level === 'low') {
      if (['gemini-pro', 'deepseek-coder'].includes(modelName)) {
        score += 10;
      }
    }

    // Context length requirements
    if (analysis.contextLength > capabilities.tokenLimit * 0.8) {
      score -= 50; // Heavy penalty for near token limit
    } else if (analysis.contextLength > capabilities.tokenLimit * 0.6) {
      score -= 20;
    }

    // Urgency considerations
    if (analysis.urgency === 'high') {
      // Prefer faster models
      if (capabilities.averageResponseTime < 25000) {
        score += 10;
      } else if (capabilities.averageResponseTime > 40000) {
        score -= 15;
      }
    }

    // Cost considerations (if specified in preferences)
    if (preferences.prioritizeCost) {
      if (capabilities.costPerToken < 0.00001) {
        score += 15;
      } else if (capabilities.costPerToken > 0.00005) {
        score -= 10;
      }
    }

    // Speed considerations (if specified in preferences)
    if (preferences.prioritizeSpeed) {
      if (capabilities.averageResponseTime < 25000) {
        score += 15;
      } else if (capabilities.averageResponseTime > 35000) {
        score -= 10;
      }
    }

    return Math.max(0, score); // Ensure non-negative score
  }

  generateReasoning(modelName, capabilities, analysis) {
    const reasons = [];

    // Primary task alignment
    const primaryTask = analysis.taskTypes[0];
    if (primaryTask && capabilities.strengths.includes(primaryTask.type)) {
      reasons.push(`Excellent for ${primaryTask.type} tasks`);
    }

    // Complexity match
    if (analysis.complexity.level === 'high' && ['claude-3-opus', 'deepseek-r1'].includes(modelName)) {
      reasons.push('Handles complex reasoning well');
    } else if (analysis.complexity.level === 'low' && ['gemini-pro', 'deepseek-coder'].includes(modelName)) {
      reasons.push('Efficient for straightforward tasks');
    }

    // Context length
    if (analysis.contextLength < capabilities.tokenLimit * 0.5) {
      reasons.push('Sufficient context capacity');
    }

    return reasons;
  }

  generateSelectionReasoning(bestChoice, analysis) {
    const taskType = analysis.taskTypes[0]?.type || 'general';
    const complexity = analysis.complexity.level;
    
    return `Selected ${bestChoice.model} (score: ${bestChoice.score.toFixed(1)}) for ${taskType} task with ${complexity} complexity. Primary strengths: ${bestChoice.capabilities.strengths.join(', ')}.`;
  }

  // Quick selection for common scenarios
  quickSelect(taskType, complexity = 'medium') {
    const quickMappings = {
      'complex-reasoning': { high: 'deepseek-r1', medium: 'claude-3-opus', low: 'gpt-4o' },
      'architecture': { high: 'claude-3-opus', medium: 'deepseek-r1', low: 'gpt-4o' },
      'coding': { high: 'claude-3-opus', medium: 'gpt-4o', low: 'deepseek-coder' },
      'testing': { high: 'deepseek-coder', medium: 'deepseek-coder', low: 'deepseek-coder' },
      'analysis': { high: 'deepseek-r1', medium: 'gemini-pro', low: 'gemini-pro' },
      'creative': { high: 'claude-3-opus', medium: 'claude-3-opus', low: 'gpt-4o' }
    };

    return quickMappings[taskType]?.[complexity] || 'gpt-4o';
  }
}

module.exports = SmartLLMSelector;