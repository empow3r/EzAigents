#!/usr/bin/env node

/**
 * API Key Setup Script
 * 
 * Interactive setup for API keys with validation
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { promisify } = require('util');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = promisify(rl.question.bind(rl));

class APIKeySetup {
  constructor() {
    this.envPath = path.join(__dirname, '../.env');
    this.tokenPoolPath = path.join(__dirname, '../shared/tokenpool.json');
    this.providers = {
      'claude-3-opus': {
        name: 'Claude (Anthropic)',
        envKeys: ['CLAUDE_API_KEY', 'CLAUDE_API_KEY2', 'CLAUDE_API_KEY3'],
        format: 'sk-ant-api03-',
        url: 'https://console.anthropic.com/settings/keys'
      },
      'gpt-4o': {
        name: 'OpenAI GPT-4',
        envKeys: ['OPENAI_API_KEY', 'OPENAI_API_KEY2', 'OPENAI_API_KEY3'],
        format: 'sk-proj-',
        url: 'https://platform.openai.com/api-keys'
      },
      'deepseek-coder': {
        name: 'DeepSeek',
        envKeys: ['DEEPSEEK_API_KEYS'],
        format: 'sk-',
        url: 'https://platform.deepseek.com/api_keys',
        multiple: true
      },
      'command-r-plus': {
        name: 'Mistral',
        envKeys: ['MISTRAL_API_KEY', 'MISTRAL_API_KEY2'],
        format: '',
        url: 'https://console.mistral.ai/api-keys'
      },
      'gemini-pro': {
        name: 'Google Gemini',
        envKeys: ['GEMINI_API_KEY', 'GEMINI_API_KEY2'],
        format: 'AIza',
        url: 'https://makersuite.google.com/app/apikey'
      }
    };
  }

  /**
   * Load existing environment variables
   */
  async loadEnv() {
    try {
      const content = await fs.readFile(this.envPath, 'utf-8');
      const env = {};
      
      content.split('\n').forEach(line => {
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
      
      return env;
    } catch (error) {
      return {};
    }
  }

  /**
   * Save environment variables
   */
  async saveEnv(env) {
    const lines = [];
    
    // Copy from .env.example with updated values
    try {
      const exampleContent = await fs.readFile(path.join(__dirname, '../.env.example'), 'utf-8');
      const exampleLines = exampleContent.split('\n');
      
      for (const line of exampleLines) {
        if (line.startsWith('#') || line.trim() === '') {
          lines.push(line);
        } else {
          const [key] = line.split('=');
          if (key && env[key.trim()]) {
            lines.push(`${key.trim()}=${env[key.trim()]}`);
          } else {
            lines.push(line);
          }
        }
      }
    } catch (error) {
      // Fallback: create basic .env
      for (const [key, value] of Object.entries(env)) {
        lines.push(`${key}=${value}`);
      }
    }
    
    await fs.writeFile(this.envPath, lines.join('\n'));
  }

  /**
   * Validate API key format
   */
  validateKey(key, format) {
    if (!key || key === 'skip') return false;
    if (format && !key.startsWith(format)) {
      console.log(`⚠️  Warning: Key doesn't match expected format (${format}...)`);
    }
    return true;
  }

  /**
   * Interactive setup
   */
  async runSetup() {
    console.log(`
🔐 Ez Aigent API Key Setup
========================

This will help you configure API keys for all supported providers.
Enter 'skip' to skip a provider.
`);

    const env = await this.loadEnv();
    const tokenPool = {};
    let hasChanges = false;

    for (const [model, provider] of Object.entries(this.providers)) {
      console.log(`\n${provider.name}`);
      console.log(`Get keys from: ${provider.url}`);
      console.log('─'.repeat(50));
      
      tokenPool[model] = [];
      
      if (provider.multiple) {
        // Handle comma-separated keys
        const existing = env[provider.envKeys[0]] || '';
        const existingKeys = existing.split(',').filter(k => k.trim());
        
        console.log(`Current: ${existingKeys.length} keys configured`);
        const input = await question(`Enter keys (comma-separated) or 'skip' [${existingKeys.length} existing]: `);
        
        if (input && input !== 'skip') {
          const keys = input.split(',').map(k => k.trim()).filter(k => this.validateKey(k, provider.format));
          env[provider.envKeys[0]] = keys.join(',');
          tokenPool[model] = keys;
          hasChanges = true;
        } else if (existingKeys.length > 0) {
          tokenPool[model] = existingKeys;
        }
      } else {
        // Handle individual keys
        for (const envKey of provider.envKeys) {
          const existing = env[envKey] || '';
          const masked = existing ? existing.substring(0, 10) + '...' : 'not set';
          
          const input = await question(`${envKey} [${masked}]: `);
          
          if (input && input !== 'skip') {
            if (this.validateKey(input, provider.format)) {
              env[envKey] = input;
              tokenPool[model].push(input);
              hasChanges = true;
            }
          } else if (existing && existing !== 'xxxxx' && !existing.includes('xxxxx')) {
            tokenPool[model].push(existing);
          }
        }
      }
      
      // Remove empty slots
      tokenPool[model] = tokenPool[model].filter(k => k && k !== 'xxxxx' && !k.includes('xxxxx'));
      
      if (tokenPool[model].length === 0) {
        delete tokenPool[model];
        console.log(`⚠️  No valid keys for ${provider.name}`);
      } else {
        console.log(`✅ Configured ${tokenPool[model].length} key(s) for ${provider.name}`);
      }
    }

    // Additional settings
    console.log('\n🔧 Additional Settings\n' + '─'.repeat(50));
    
    const redisUrl = await question(`Redis URL [${env.REDIS_URL || 'redis://localhost:6379'}]: `);
    if (redisUrl) env.REDIS_URL = redisUrl;

    // Save configuration
    if (hasChanges) {
      await this.saveEnv(env);
      await fs.writeFile(this.tokenPoolPath, JSON.stringify(tokenPool, null, 2));
      
      console.log('\n✅ Configuration saved!');
      console.log(`   - Environment: ${this.envPath}`);
      console.log(`   - Token pool: ${this.tokenPoolPath}`);
    } else {
      console.log('\n✅ No changes made.');
    }

    // Test keys
    const testKeys = await question('\nTest API keys now? (y/n) [y]: ');
    if (!testKeys || testKeys.toLowerCase() === 'y') {
      await this.testKeys(tokenPool);
    }

    rl.close();
  }

  /**
   * Test API keys
   */
  async testKeys(tokenPool) {
    console.log('\n🧪 Testing API keys...\n');
    
    const APIKeyManager = require('./api-key-manager');
    const manager = new APIKeyManager();
    
    for (const [model, keys] of Object.entries(tokenPool)) {
      console.log(`Testing ${model}:`);
      for (const key of keys) {
        const result = await manager.testKey(model, key);
        const masked = key.substring(0, 10) + '...';
        if (result.valid) {
          console.log(`  ✅ ${masked} - OK`);
        } else {
          console.log(`  ❌ ${masked} - ${result.error}`);
        }
      }
    }
    
    await manager.cleanup();
  }

  /**
   * Import keys from environment
   */
  async importFromEnv() {
    console.log('📥 Importing keys from environment...\n');
    
    const env = await this.loadEnv();
    const tokenPool = {};
    
    for (const [model, provider] of Object.entries(this.providers)) {
      tokenPool[model] = [];
      
      if (provider.multiple) {
        const keys = (env[provider.envKeys[0]] || '').split(',').filter(k => k.trim());
        tokenPool[model] = keys;
      } else {
        for (const envKey of provider.envKeys) {
          const key = env[envKey];
          if (key && key !== 'xxxxx' && !key.includes('xxxxx')) {
            tokenPool[model].push(key);
          }
        }
      }
      
      tokenPool[model] = tokenPool[model].filter(k => k);
      
      if (tokenPool[model].length > 0) {
        console.log(`✅ Imported ${tokenPool[model].length} key(s) for ${provider.name}`);
      }
    }
    
    await fs.writeFile(this.tokenPoolPath, JSON.stringify(tokenPool, null, 2));
    console.log(`\n✅ Token pool updated: ${this.tokenPoolPath}`);
  }
}

// CLI interface
if (require.main === module) {
  const setup = new APIKeySetup();
  const command = process.argv[2];
  
  switch (command) {
    case 'import':
      setup.importFromEnv().catch(console.error).finally(() => process.exit(0));
      break;
      
    case 'test':
      (async () => {
        const tokenPool = JSON.parse(await fs.readFile(setup.tokenPoolPath, 'utf-8'));
        await setup.testKeys(tokenPool);
        process.exit(0);
      })().catch(console.error);
      break;
      
    default:
      setup.runSetup().catch(console.error);
  }
}