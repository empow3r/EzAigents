module.exports = {
  models: {
    'deepseek-coder': {
      role: 'Testing and validation specialist',
      capabilities: ['testing', 'validation', 'bug-fixing', 'code-review'],
      tokenLimit: 32000,
      apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
      maxLoad: 8,
      priority: 'low',
      specialization: 'High-volume testing and validation tasks'
    },
    'deepseek-r1': {
      role: 'Advanced reasoning and analysis specialist',
      capabilities: ['complex-reasoning', 'mathematical-analysis', 'strategic-planning', 'architecture-design'],
      tokenLimit: 65536,
      apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
      maxLoad: 4,
      priority: 'high',
      specialization: 'Complex reasoning and advanced problem-solving tasks'
    }
  },
  // Default model selection based on prompt analysis
  defaultModel: 'deepseek-coder',
  // LLM selection criteria
  modelSelection: {
    keywords: {
      'deepseek-r1': [
        'analyze', 'reasoning', 'complex', 'strategy', 'architecture', 'design', 'plan',
        'mathematical', 'logic', 'algorithm', 'optimization', 'research', 'evaluation'
      ],
      'deepseek-coder': [
        'test', 'debug', 'fix', 'validate', 'review', 'refactor', 'implement', 'code'
      ]
    },
    complexity: {
      'deepseek-r1': ['high', 'advanced', 'complex', 'sophisticated'],
      'deepseek-coder': ['simple', 'basic', 'standard', 'routine']
    }
  }
};