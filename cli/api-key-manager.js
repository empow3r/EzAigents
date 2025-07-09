#!/usr/bin/env node

/**
 * API Key Manager
 * 
 * Comprehensive API key management system with rotation, fallback, and health monitoring
 */

const Redis = require('ioredis');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class APIKeyManager {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.tokenPoolPath = process.env.TOKENPOOL_PATH || path.join(__dirname, '../shared/tokenpool.json');
    this.providers = this.initializeProviders();
    this.keyUsage = new Map();
    this.keyHealth = new Map();
    this.rotationInterval = 60000; // 1 minute
    this.healthCheckInterval = 300000; // 5 minutes
  }

  /**
   * Initialize API provider configurations
   */
  initializeProviders() {
    return {
      'claude-3-opus': {
        name: 'Claude',
        endpoint: 'https://api.anthropic.com/v1/messages',
        headers: (key) => ({
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }),
        testPayload: {
          model: 'claude-3-opus-20240229',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        },
        rateLimits: {
          rpm: 5,
          tpm: 20000,
          rpd: 50
        }
      },
      'gpt-4o': {
        name: 'OpenAI GPT-4',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        headers: (key) => ({
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }),
        testPayload: {
          model: 'gpt-4o',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        },
        rateLimits: {
          rpm: 60,
          tpm: 90000,
          rpd: 10000
        }
      },
      'deepseek-coder': {
        name: 'DeepSeek',
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        headers: (key) => ({
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }),
        testPayload: {
          model: 'deepseek-coder',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        },
        rateLimits: {
          rpm: 60,
          tpm: 60000,
          rpd: 5000
        }
      },
      'command-r-plus': {
        name: 'Mistral',
        endpoint: 'https://api.mistral.ai/v1/chat/completions',
        headers: (key) => ({
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }),
        testPayload: {
          model: 'mistral-large-latest',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        },
        rateLimits: {
          rpm: 60,
          tpm: 1000000,
          rpd: 10000
        }
      },
      'gemini-pro': {
        name: 'Google Gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        headers: (key) => ({
          'Content-Type': 'application/json'
        }),
        testPayload: {
          contents: [{
            parts: [{
              text: 'Hi'
            }]
          }]
        },
        queryParams: (key) => ({
          key: key
        }),
        rateLimits: {
          rpm: 60,
          rpd: 1500
        }
      }
    };
  }

  /**
   * Load API keys from environment and token pool
   */
  async loadKeys() {
    const keys = {};
    
    // Load from environment variables
    if (process.env.CLAUDE_API_KEY) {
      keys['claude-3-opus'] = [process.env.CLAUDE_API_KEY];
      if (process.env.CLAUDE_API_KEY2) keys['claude-3-opus'].push(process.env.CLAUDE_API_KEY2);
      if (process.env.CLAUDE_API_KEY3) keys['claude-3-opus'].push(process.env.CLAUDE_API_KEY3);
    }
    
    if (process.env.OPENAI_API_KEY) {
      keys['gpt-4o'] = [process.env.OPENAI_API_KEY];
      if (process.env.OPENAI_API_KEY2) keys['gpt-4o'].push(process.env.OPENAI_API_KEY2);
      if (process.env.OPENAI_API_KEY3) keys['gpt-4o'].push(process.env.OPENAI_API_KEY3);
    }
    
    if (process.env.DEEPSEEK_API_KEYS) {
      keys['deepseek-coder'] = process.env.DEEPSEEK_API_KEYS.split(',').map(k => k.trim());
    }
    
    if (process.env.MISTRAL_API_KEY) {
      keys['command-r-plus'] = [process.env.MISTRAL_API_KEY];
      if (process.env.MISTRAL_API_KEY2) keys['command-r-plus'].push(process.env.MISTRAL_API_KEY2);
    }
    
    if (process.env.GEMINI_API_KEY) {
      keys['gemini-pro'] = [process.env.GEMINI_API_KEY];
      if (process.env.GEMINI_API_KEY2) keys['gemini-pro'].push(process.env.GEMINI_API_KEY2);
    }
    
    // Merge with token pool if exists
    try {
      const tokenPoolContent = await fs.readFile(this.tokenPoolPath, 'utf-8');
      const tokenPool = JSON.parse(tokenPoolContent);
      
      // Update token pool with actual keys from environment
      for (const [model, envKeys] of Object.entries(keys)) {
        tokenPool[model] = envKeys;
      }
      
      // Save updated token pool
      await fs.writeFile(this.tokenPoolPath, JSON.stringify(tokenPool, null, 2));
      
      return tokenPool;
    } catch (error) {
      console.log('📝 Creating new token pool from environment variables');
      await fs.writeFile(this.tokenPoolPath, JSON.stringify(keys, null, 2));
      return keys;
    }
  }

  /**
   * Test an API key
   */
  async testKey(model, key) {
    const provider = this.providers[model];
    if (!provider) return { valid: false, error: 'Unknown provider' };
    
    try {
      const config = {
        method: 'POST',
        url: provider.endpoint,
        headers: provider.headers(key),
        data: provider.testPayload,
        timeout: 10000
      };
      
      if (provider.queryParams) {
        config.params = provider.queryParams(key);
      }
      
      const response = await axios(config);
      
      return {
        valid: true,
        response: response.status,
        remaining: response.headers['x-ratelimit-remaining'],
        reset: response.headers['x-ratelimit-reset']
      };
    } catch (error) {
      return {
        valid: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status
      };
    }
  }

  /**
   * Get the next available API key for a model
   */
  async getNextKey(model) {
    const keys = await this.loadKeys();
    const modelKeys = keys[model];
    
    if (!modelKeys || modelKeys.length === 0) {
      throw new Error(`No API keys available for ${model}`);
    }
    
    // Get current rotation index from Redis
    const indexKey = `api:rotation:${model}`;
    let currentIndex = parseInt(await this.redis.get(indexKey) || '0');
    
    // Find next healthy key
    let attempts = 0;
    while (attempts < modelKeys.length) {
      const key = modelKeys[currentIndex];
      const healthKey = `${model}:${this.hashKey(key)}`;
      
      // Check if key is healthy
      const health = this.keyHealth.get(healthKey);
      if (!health || health.valid) {
        // Update rotation index
        const nextIndex = (currentIndex + 1) % modelKeys.length;
        await this.redis.set(indexKey, nextIndex, 'EX', 3600);
        
        return key;
      }
      
      // Try next key
      currentIndex = (currentIndex + 1) % modelKeys.length;
      attempts++;
    }
    
    // All keys unhealthy, return first one anyway
    console.warn(`⚠️  All keys for ${model} are unhealthy, using first key`);
    return modelKeys[0];
  }

  /**
   * Hash a key for storage (security)
   */
  hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 8);
  }

  /**
   * Monitor API key health
   */
  async monitorHealth() {
    console.log('🏥 Starting API key health monitoring...');
    
    const checkHealth = async () => {
      const keys = await this.loadKeys();
      
      for (const [model, modelKeys] of Object.entries(keys)) {
        for (const key of modelKeys) {
          const healthKey = `${model}:${this.hashKey(key)}`;
          const result = await this.testKey(model, key);
          
          this.keyHealth.set(healthKey, {
            ...result,
            lastCheck: new Date(),
            model
          });
          
          // Store in Redis
          await this.redis.set(
            `api:health:${healthKey}`,
            JSON.stringify(result),
            'EX',
            600
          );
          
          if (result.valid) {
            console.log(`✅ ${model} key ${this.hashKey(key)} is healthy`);
          } else {
            console.error(`❌ ${model} key ${this.hashKey(key)} failed: ${result.error}`);
          }
        }
      }
    };
    
    // Initial check
    await checkHealth();
    
    // Periodic checks
    setInterval(checkHealth, this.healthCheckInterval);
  }

  /**
   * Track key usage for rate limiting
   */
  async trackUsage(model, key) {
    const usageKey = `api:usage:${model}:${this.hashKey(key)}`;
    const now = Date.now();
    
    // Add to sorted set with timestamp as score
    await this.redis.zadd(usageKey, now, now);
    
    // Remove old entries (older than 1 minute)
    await this.redis.zremrangebyscore(usageKey, '-inf', now - 60000);
    
    // Set expiry
    await this.redis.expire(usageKey, 120);
    
    // Get current usage count
    const count = await this.redis.zcard(usageKey);
    
    return count;
  }

  /**
   * Check if we're rate limited
   */
  async isRateLimited(model, key) {
    const provider = this.providers[model];
    if (!provider) return false;
    
    const usage = await this.trackUsage(model, key);
    const limits = provider.rateLimits;
    
    // Check requests per minute
    if (limits.rpm && usage >= limits.rpm) {
      console.warn(`⚠️  Rate limit reached for ${model}: ${usage}/${limits.rpm} rpm`);
      return true;
    }
    
    return false;
  }

  /**
   * Get API key with rate limit checking
   */
  async getKey(model) {
    const keys = await this.loadKeys();
    const modelKeys = keys[model];
    
    if (!modelKeys || modelKeys.length === 0) {
      throw new Error(`No API keys available for ${model}`);
    }
    
    // Try each key until we find one that's not rate limited
    for (let i = 0; i < modelKeys.length; i++) {
      const key = await this.getNextKey(model);
      
      if (!await this.isRateLimited(model, key)) {
        return key;
      }
    }
    
    // All keys rate limited, return the least used one
    console.warn(`⚠️  All keys for ${model} are rate limited`);
    return modelKeys[0];
  }

  /**
   * Generate API status report
   */
  async generateReport() {
    const keys = await this.loadKeys();
    const report = {
      timestamp: new Date(),
      providers: {}
    };
    
    for (const [model, modelKeys] of Object.entries(keys)) {
      report.providers[model] = {
        name: this.providers[model]?.name || model,
        keyCount: modelKeys.length,
        keys: []
      };
      
      for (const key of modelKeys) {
        const healthKey = `${model}:${this.hashKey(key)}`;
        const health = this.keyHealth.get(healthKey) || { valid: 'unknown' };
        const usage = await this.redis.zcard(`api:usage:${healthKey}`);
        
        report.providers[model].keys.push({
          hash: this.hashKey(key),
          health: health.valid,
          lastCheck: health.lastCheck,
          usage: usage,
          error: health.error
        });
      }
    }
    
    return report;
  }

  /**
   * Start the API key manager
   */
  async start() {
    console.log('🚀 Starting API Key Manager...');
    
    // Load and validate keys
    const keys = await this.loadKeys();
    console.log('📋 Loaded API keys:', Object.entries(keys).map(([m, k]) => `${m}: ${k.length} keys`).join(', '));
    
    // Start health monitoring
    await this.monitorHealth();
    
    // API endpoints
    const express = require('express');
    const app = express();
    
    app.get('/api/keys/status', async (req, res) => {
      const report = await this.generateReport();
      res.json(report);
    });
    
    app.get('/api/keys/:model', async (req, res) => {
      try {
        const key = await this.getKey(req.params.model);
        res.json({ 
          key: key.substring(0, 10) + '...',
          model: req.params.model 
        });
      } catch (error) {
        res.status(404).json({ error: error.message });
      }
    });
    
    const port = process.env.API_KEY_MANAGER_PORT || 3001;
    app.listen(port, () => {
      console.log(`📡 API Key Manager running on port ${port}`);
    });
  }

  /**
   * Cleanup
   */
  async cleanup() {
    await this.redis.quit();
  }
}

// CLI interface
if (require.main === module) {
  const manager = new APIKeyManager();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'test':
      // Test all keys
      (async () => {
        const keys = await manager.loadKeys();
        for (const [model, modelKeys] of Object.entries(keys)) {
          console.log(`\n🔍 Testing ${model} keys...`);
          for (const key of modelKeys) {
            const result = await manager.testKey(model, key);
            console.log(`  ${manager.hashKey(key)}: ${result.valid ? '✅' : '❌'} ${result.error || ''}`);
          }
        }
        process.exit(0);
      })();
      break;
      
    case 'report':
      // Generate status report
      (async () => {
        const report = await manager.generateReport();
        console.log(JSON.stringify(report, null, 2));
        process.exit(0);
      })();
      break;
      
    case 'start':
    default:
      // Start the manager
      manager.start().catch(console.error);
      
      process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down API Key Manager...');
        await manager.cleanup();
        process.exit(0);
      });
  }
}

module.exports = APIKeyManager;