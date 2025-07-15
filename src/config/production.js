// Production configuration hotfix
module.exports = {
  // API Configuration
  api: {
    baseUrl: process.env.API_BASE_URL || 'https://api.ezaigent.com',
    timeout: 30000,
    retryAttempts: 3,
    rateLimitPerMinute: 1000
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    reconnectOnError: true
  },

  // Agent Configuration
  agents: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_AGENTS) || 50,
    heartbeatInterval: 30000,
    taskTimeout: 600000,
    memoryLimit: '2GB'
  },

  // Security Configuration
  security: {
    enableRateLimiting: true,
    enableCORS: true,
    corsOrigins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
    sessionTimeout: 86400000, // 24 hours
    jwtSecret: process.env.JWT_SECRET
  },

  // Monitoring Configuration
  monitoring: {
    enableMetrics: true,
    metricsPort: parseInt(process.env.METRICS_PORT) || 9090,
    logLevel: process.env.LOG_LEVEL || 'info',
    enableTracing: true
  },

  // Performance Optimizations
  performance: {
    enableCompression: true,
    enableCaching: true,
    cacheTimeout: 3600,
    enableConnectionPooling: true,
    maxPoolSize: 100
  }
};