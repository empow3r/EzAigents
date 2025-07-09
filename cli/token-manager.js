// Token Manager - Handles API key rotation from environment variables
const fs = require('fs');
const path = require('path');

class TokenManager {
  constructor() {
    this.tokenPools = {};
    this.currentIndex = {};
    this.loadTokensFromEnv();
  }

  loadTokensFromEnv() {
    // Load tokens from environment variables
    // Support both single keys and comma-separated lists
    
    // Claude tokens
    if (process.env.CLAUDE_API_KEY) {
      this.tokenPools['claude-3-opus'] = this.parseTokens(process.env.CLAUDE_API_KEY);
    }
    
    // OpenAI tokens
    if (process.env.OPENAI_API_KEY) {
      this.tokenPools['gpt-4o'] = this.parseTokens(process.env.OPENAI_API_KEY);
      this.tokenPools['gpt-4'] = this.tokenPools['gpt-4o']; // Alias
    }
    
    // DeepSeek tokens (supports multiple)
    if (process.env.DEEPSEEK_API_KEYS) {
      this.tokenPools['deepseek-coder'] = this.parseTokens(process.env.DEEPSEEK_API_KEYS);
    }
    
    // Mistral tokens
    if (process.env.MISTRAL_API_KEY) {
      this.tokenPools['command-r-plus'] = this.parseTokens(process.env.MISTRAL_API_KEY);
      this.tokenPools['mistral-7b'] = this.tokenPools['command-r-plus']; // Alias
    }
    
    // Gemini tokens
    if (process.env.GEMINI_API_KEY) {
      this.tokenPools['gemini-pro'] = this.parseTokens(process.env.GEMINI_API_KEY);
    }
    
    // OpenRouter as fallback for all models
    if (process.env.OPENROUTER_API_KEY) {
      const openRouterKeys = this.parseTokens(process.env.OPENROUTER_API_KEY);
      // Use OpenRouter for models without specific keys
      Object.keys(this.tokenPools).forEach(model => {
        if (this.tokenPools[model].length === 0) {
          this.tokenPools[model] = openRouterKeys;
        }
      });
    }
    
    // Initialize rotation indexes
    Object.keys(this.tokenPools).forEach(model => {
      this.currentIndex[model] = 0;
    });
    
    // Log loaded token pools (without exposing keys)
    console.log('Token pools loaded:');
    Object.entries(this.tokenPools).forEach(([model, pool]) => {
      console.log(`  ${model}: ${pool.length} key(s)`);
    });
  }
  
  parseTokens(tokenString) {
    if (!tokenString) return [];
    // Support comma-separated lists
    return tokenString.split(',').map(t => t.trim()).filter(t => t);
  }
  
  getToken(model) {
    const pool = this.tokenPools[model];
    if (!pool || pool.length === 0) {
      // Try to fallback to OpenRouter
      if (this.tokenPools['openrouter']) {
        return this.rotateToken('openrouter');
      }
      throw new Error(`No API keys available for model: ${model}`);
    }
    
    return this.rotateToken(model);
  }
  
  rotateToken(model) {
    const pool = this.tokenPools[model];
    const index = this.currentIndex[model] || 0;
    const token = pool[index];
    
    // Rotate to next token
    this.currentIndex[model] = (index + 1) % pool.length;
    
    return token;
  }
  
  // Check if tokens are available for a model
  hasTokensForModel(model) {
    return this.tokenPools[model] && this.tokenPools[model].length > 0;
  }
  
  // Get all available models
  getAvailableModels() {
    return Object.keys(this.tokenPools).filter(model => this.tokenPools[model].length > 0);
  }
  
  // Add token at runtime (useful for testing)
  addToken(model, token) {
    if (!this.tokenPools[model]) {
      this.tokenPools[model] = [];
      this.currentIndex[model] = 0;
    }
    this.tokenPools[model].push(token);
  }
  
  // Load additional tokens from file (backwards compatibility)
  loadFromFile(filePath) {
    try {
      const fileTokens = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      Object.entries(fileTokens).forEach(([model, tokens]) => {
        if (Array.isArray(tokens) && tokens.length > 0) {
          // Only use file tokens if no env tokens exist
          if (!this.tokenPools[model] || this.tokenPools[model].length === 0) {
            this.tokenPools[model] = tokens.filter(t => !t.includes('placeholder') && !t.includes('xxxxx'));
            this.currentIndex[model] = 0;
          }
        }
      });
    } catch (error) {
      console.log('Note: Could not load tokens from file, using environment variables only');
    }
  }
}

module.exports = TokenManager;