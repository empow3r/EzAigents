module.exports = {
  model: 'deepseek-coder',
  role: 'Testing and validation specialist',
  capabilities: ['testing', 'validation', 'bug-fixing', 'code-review'],
  tokenLimit: 32000,
  apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
  maxLoad: 8,
  priority: 'low',
  specialization: 'High-volume testing and validation tasks'
};