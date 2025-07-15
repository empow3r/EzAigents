module.exports = {
  model: 'claude-3-opus',
  role: 'Architecture and complex refactoring specialist',
  capabilities: ['architecture', 'refactoring', 'code-analysis', 'complex-logic'],
  tokenLimit: 200000,
  apiEndpoint: 'https://api.openrouter.ai/api/v1/chat/completions',
  maxLoad: 3,
  priority: 'high',
  specialization: 'Large-scale architecture and complex problem solving'
};