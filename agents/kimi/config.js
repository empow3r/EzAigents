module.exports = {
  model: 'kimi-2',
  role: 'Long-context reasoning and analysis specialist',
  capabilities: ['long-context', 'reasoning', 'analysis', 'summarization'],
  tokenLimit: 1000000, // Kimi2's strength is very long context
  apiEndpoint: 'https://api.moonshot.cn/v1/chat/completions',
  maxLoad: 4,
  priority: 'medium',
  specialization: 'Long-context analysis and complex reasoning tasks'
};