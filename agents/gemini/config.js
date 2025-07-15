module.exports = {
  model: 'gemini-pro',
  role: 'Code analysis and optimization specialist',
  capabilities: ['analysis', 'optimization', 'performance', 'security'],
  tokenLimit: 32000,
  apiEndpoint: 'https://api.openrouter.ai/api/v1/chat/completions',
  maxLoad: 6,
  priority: 'medium',
  specialization: 'Code analysis and performance optimization'
};