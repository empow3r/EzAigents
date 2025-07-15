module.exports = {
  model: 'mistral-large',
  role: 'Documentation and content specialist',
  capabilities: ['documentation', 'content', 'tutorials', 'examples'],
  tokenLimit: 32000,
  apiEndpoint: 'https://api.openrouter.ai/api/v1/chat/completions',
  maxLoad: 6,
  priority: 'low',
  specialization: 'Documentation and content generation'
};