#!/usr/bin/env node

/**
 * API Key Rotator
 * 
 * Intelligent token rotation with fallback mechanisms
 */

const Redis = require('ioredis');
const EventEmitter = require('events');

class APIKeyRotator extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.rotationStrategies = {
      'round-robin': this.roundRobinStrategy.bind(this),
      'least-used': this.leastUsedStrategy.bind(this),
      'weighted': this.weightedStrategy.bind(this),
      'health-based': this.healthBasedStrategy.bind(this)
    };
    this.fallbackChains = new Map();
  }

  /**
   * Configure fallback chains for each model
   */
  configureFallbacks() {
    // Define model fallback chains
    this.fallbackChains.set('claude-3-opus', [
      'claude-3-sonnet',
      'gpt-4o',
      'gemini-pro'
    ]);
    
    this.fallbackChains.set('gpt-4o', [
      'gpt-4-turbo',
      'claude-3-opus',
      'gemini-pro'
    ]);
    
    this.fallbackChains.set('deepseek-coder', [
      'codellama-70b',
      'gpt-4o',
      'claude-3-opus'
    ]);
    
    this.fallbackChains.set('command-r-plus', [
      'mistral-large',
      'claude-3-opus',
      'gpt-4o'
    ]);
    
    this.fallbackChains.set('gemini-pro', [
      'gemini-1.5-pro',
      'claude-3-opus',
      'gpt-4o'
    ]);
  }

  /**
   * Round-robin rotation strategy
   */
  async roundRobinStrategy(model, keys) {
    const indexKey = `rotation:${model}:index`;
    const currentIndex = parseInt(await this.redis.get(indexKey) || '0');
    const nextIndex = (currentIndex + 1) % keys.length;
    
    await this.redis.set(indexKey, nextIndex, 'EX', 3600);
    
    return keys[currentIndex];
  }

  /**
   * Least-used rotation strategy
   */
  async leastUsedStrategy(model, keys) {
    const usageCounts = await Promise.all(
      keys.map(async (key, index) => {
        const count = await this.redis.get(`usage:${model}:${index}`) || 0;
        return { key, index, count: parseInt(count) };
      })
    );
    
    // Sort by usage count (ascending)
    usageCounts.sort((a, b) => a.count - b.count);
    
    // Increment usage for selected key
    await this.redis.incr(`usage:${model}:${usageCounts[0].index}`);
    await this.redis.expire(`usage:${model}:${usageCounts[0].index}`, 3600);
    
    return usageCounts[0].key;
  }

  /**
   * Weighted rotation strategy based on performance
   */
  async weightedStrategy(model, keys) {
    const weights = await Promise.all(
      keys.map(async (key, index) => {
        // Get performance metrics
        const successRate = parseFloat(await this.redis.get(`perf:${model}:${index}:success`) || '1');
        const avgLatency = parseFloat(await this.redis.get(`perf:${model}:${index}:latency`) || '1000');
        
        // Calculate weight (higher is better)
        const weight = successRate * (1000 / avgLatency);
        
        return { key, index, weight };
      })
    );
    
    // Weighted random selection
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of weights) {
      random -= item.weight;
      if (random <= 0) {
        return item.key;
      }
    }
    
    return weights[0].key;
  }

  /**
   * Health-based rotation strategy
   */
  async healthBasedStrategy(model, keys) {
    const healthyKeys = [];
    
    for (const [index, key] of keys.entries()) {
      const healthKey = `health:${model}:${index}`;
      const health = await this.redis.get(healthKey);
      
      if (!health || health === 'healthy') {
        healthyKeys.push(key);
      }
    }
    
    if (healthyKeys.length === 0) {
      console.warn(`⚠️  No healthy keys for ${model}, using fallback`);
      return keys[0];
    }
    
    // Use round-robin among healthy keys
    return this.roundRobinStrategy(model, healthyKeys);
  }

  /**
   * Get next key with specified strategy
   */
  async getNextKey(model, keys, strategy = 'health-based') {
    const strategyFunc = this.rotationStrategies[strategy];
    
    if (!strategyFunc) {
      throw new Error(`Unknown rotation strategy: ${strategy}`);
    }
    
    try {
      return await strategyFunc(model, keys);
    } catch (error) {
      console.error(`❌ Rotation strategy ${strategy} failed:`, error);
      return keys[0]; // Fallback to first key
    }
  }

  /**
   * Handle key failure with fallback
   */
  async handleKeyFailure(model, failedKey, error) {
    console.error(`❌ API key failed for ${model}:`, error.message);
    
    // Mark key as unhealthy
    const keys = await this.getModelKeys(model);
    const keyIndex = keys.indexOf(failedKey);
    
    if (keyIndex !== -1) {
      await this.redis.setex(`health:${model}:${keyIndex}`, 300, 'unhealthy');
      
      // Update performance metrics
      await this.redis.incr(`perf:${model}:${keyIndex}:failures`);
      
      // Emit failure event
      this.emit('key-failure', {
        model,
        key: failedKey.substring(0, 10) + '...',
        error: error.message
      });
    }
    
    // Try fallback models
    const fallbacks = this.fallbackChains.get(model) || [];
    
    for (const fallbackModel of fallbacks) {
      try {
        const fallbackKeys = await this.getModelKeys(fallbackModel);
        if (fallbackKeys.length > 0) {
          console.log(`🔄 Falling back to ${fallbackModel}`);
          return {
            model: fallbackModel,
            key: await this.getNextKey(fallbackModel, fallbackKeys)
          };
        }
      } catch (fallbackError) {
        console.error(`❌ Fallback ${fallbackModel} also failed:`, fallbackError.message);
      }
    }
    
    throw new Error(`All API keys and fallbacks exhausted for ${model}`);
  }

  /**
   * Get model keys from token pool
   */
  async getModelKeys(model) {
    const tokenPoolPath = process.env.TOKENPOOL_PATH || '../shared/tokenpool.json';
    const fs = require('fs').promises;
    
    try {
      const content = await fs.readFile(tokenPoolPath, 'utf-8');
      const tokenPool = JSON.parse(content);
      return tokenPool[model] || [];
    } catch (error) {
      console.error(`❌ Failed to load token pool:`, error);
      return [];
    }
  }

  /**
   * Update performance metrics
   */
  async updateMetrics(model, keyIndex, success, latency) {
    const successKey = `perf:${model}:${keyIndex}:success`;
    const latencyKey = `perf:${model}:${keyIndex}:latency`;
    const countKey = `perf:${model}:${keyIndex}:count`;
    
    // Get current metrics
    const currentCount = parseInt(await this.redis.get(countKey) || '0');
    const currentSuccess = parseFloat(await this.redis.get(successKey) || '1');
    const currentLatency = parseFloat(await this.redis.get(latencyKey) || '1000');
    
    // Calculate moving average
    const newCount = currentCount + 1;
    const newSuccess = (currentSuccess * currentCount + (success ? 1 : 0)) / newCount;
    const newLatency = (currentLatency * currentCount + latency) / newCount;
    
    // Update metrics
    await this.redis.set(successKey, newSuccess, 'EX', 86400); // 24 hours
    await this.redis.set(latencyKey, newLatency, 'EX', 86400);
    await this.redis.set(countKey, newCount, 'EX', 86400);
    
    // Mark as healthy if success rate recovers
    if (newSuccess > 0.8 && newCount > 10) {
      await this.redis.del(`health:${model}:${keyIndex}`);
    }
  }

  /**
   * Monitor rotation performance
   */
  async getRotationStats() {
    const stats = {};
    const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    
    for (const model of models) {
      const keys = await this.getModelKeys(model);
      stats[model] = {
        totalKeys: keys.length,
        keys: []
      };
      
      for (let i = 0; i < keys.length; i++) {
        const successRate = parseFloat(await this.redis.get(`perf:${model}:${i}:success`) || '1');
        const avgLatency = parseFloat(await this.redis.get(`perf:${model}:${i}:latency`) || '0');
        const usageCount = parseInt(await this.redis.get(`usage:${model}:${i}`) || '0');
        const health = await this.redis.get(`health:${model}:${i}`) || 'healthy';
        
        stats[model].keys.push({
          index: i,
          health,
          successRate: (successRate * 100).toFixed(1) + '%',
          avgLatency: avgLatency.toFixed(0) + 'ms',
          usageCount
        });
      }
    }
    
    return stats;
  }

  /**
   * Cleanup
   */
  async cleanup() {
    await this.redis.quit();
  }
}

// Export for use in other modules
module.exports = APIKeyRotator;

// CLI interface
if (require.main === module) {
  const rotator = new APIKeyRotator();
  rotator.configureFallbacks();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'stats':
      // Show rotation statistics
      (async () => {
        const stats = await rotator.getRotationStats();
        console.log('\n📊 API Key Rotation Statistics:\n');
        console.log(JSON.stringify(stats, null, 2));
        await rotator.cleanup();
      })();
      break;
      
    case 'test':
      // Test rotation strategies
      (async () => {
        const model = process.argv[3] || 'gpt-4o';
        const strategy = process.argv[4] || 'health-based';
        
        console.log(`\n🔄 Testing ${strategy} rotation for ${model}...\n`);
        
        const keys = await rotator.getModelKeys(model);
        if (keys.length === 0) {
          console.error(`No keys found for ${model}`);
          process.exit(1);
        }
        
        // Test 10 rotations
        for (let i = 0; i < 10; i++) {
          const key = await rotator.getNextKey(model, keys, strategy);
          console.log(`Rotation ${i + 1}: ${key.substring(0, 10)}...`);
        }
        
        await rotator.cleanup();
      })();
      break;
      
    case 'monitor':
      // Monitor rotation events
      console.log('📡 Monitoring API key rotation events...\n');
      
      rotator.on('key-failure', (event) => {
        console.log(`❌ Key failure: ${event.model} - ${event.error}`);
      });
      
      // Keep running
      process.on('SIGINT', async () => {
        console.log('\n🛑 Stopping monitor...');
        await rotator.cleanup();
        process.exit(0);
      });
      break;
      
    default:
      console.log(`
API Key Rotator

Usage:
  node api-key-rotator.js stats     - Show rotation statistics
  node api-key-rotator.js test      - Test rotation strategies
  node api-key-rotator.js monitor   - Monitor rotation events

Strategies:
  - round-robin: Simple sequential rotation
  - least-used: Prefer keys with lowest usage
  - weighted: Based on performance metrics
  - health-based: Skip unhealthy keys
`);
      process.exit(0);
  }
}