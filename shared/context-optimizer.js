/**
 * Context Optimizer for Ez Aigents
 * Extracts and caches relevant context to reduce token usage
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class ContextOptimizer {
  constructor(redisClient) {
    this.redis = redisClient;
    this.cache = new Map();
    this.maxCacheSize = 100 * 1024 * 1024; // 100MB
    this.currentCacheSize = 0;
    
    // Context extraction patterns
    this.patterns = {
      functions: /(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/g,
      classes: /class\s+(\w+)(?:\s+extends\s+\w+)?/g,
      imports: /(?:import|require)\s*\(['"](.*?)['"]\)|import\s+.*?\s+from\s+['"](.*?)['"]/g,
      exports: /(?:module\.)?exports\.(\w+)|export\s+(?:default\s+)?(\w+)/g,
      comments: /\/\*[\s\S]*?\*\/|\/\/.*/g
    };
  }

  /**
   * Extract relevant context from file based on prompt
   */
  async extractRelevantContext(filePath, prompt, maxTokens = 500) {
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(filePath, prompt);
      
      // Check cache first
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf8');
      
      // Extract relevant parts
      const relevant = await this.smartExtraction(content, prompt, maxTokens);
      
      // Cache result
      await this.addToCache(cacheKey, relevant);
      
      return relevant;
    } catch (error) {
      // Return empty context on error
      console.error(`Error extracting context from ${filePath}:`, error);
      return '';
    }
  }

  /**
   * Smart extraction of relevant code sections
   */
  async smartExtraction(content, prompt, maxTokens) {
    // Extract keywords from prompt
    const keywords = this.extractKeywords(prompt);
    
    // Find relevant code blocks
    const blocks = this.findRelevantBlocks(content, keywords);
    
    // If no specific blocks found, use intelligent fallback
    if (blocks.length === 0) {
      return this.intelligentFallback(content, prompt, maxTokens);
    }
    
    // Prioritize and trim to token limit
    const optimized = this.optimizeForTokens(blocks, maxTokens);
    
    return optimized;
  }

  /**
   * Extract keywords from prompt
   */
  extractKeywords(prompt) {
    const keywords = new Set();
    
    // Extract code identifiers (function names, variables, etc.)
    const codePattern = /`([^`]+)`/g;
    let match;
    while ((match = codePattern.exec(prompt)) !== null) {
      keywords.add(match[1]);
    }
    
    // Extract quoted strings
    const quotedPattern = /["']([^"']+)["']/g;
    while ((match = quotedPattern.exec(prompt)) !== null) {
      keywords.add(match[1]);
    }
    
    // Extract camelCase and PascalCase identifiers
    const identifierPattern = /\b[a-z]+(?:[A-Z][a-z]+)*\b|\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g;
    while ((match = identifierPattern.exec(prompt)) !== null) {
      if (match[0].length > 3) { // Skip short words
        keywords.add(match[0]);
      }
    }
    
    // Add common programming keywords based on prompt
    const taskKeywords = {
      'function': ['function', 'const', 'async', 'return'],
      'class': ['class', 'constructor', 'extends', 'new'],
      'test': ['test', 'describe', 'it', 'expect', 'assert'],
      'api': ['router', 'app', 'get', 'post', 'req', 'res'],
      'component': ['render', 'props', 'state', 'useState', 'useEffect']
    };
    
    for (const [key, values] of Object.entries(taskKeywords)) {
      if (prompt.toLowerCase().includes(key)) {
        values.forEach(v => keywords.add(v));
      }
    }
    
    return Array.from(keywords);
  }

  /**
   * Find relevant code blocks based on keywords
   */
  findRelevantBlocks(content, keywords) {
    const lines = content.split('\n');
    const blocks = [];
    const processedRanges = new Set();
    
    // Find blocks containing keywords
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      
      // Calculate relevance score for this line
      let relevanceScore = 0;
      const matchedKeywords = [];
      
      for (const keyword of keywords) {
        if (lineLower.includes(keyword.toLowerCase())) {
          relevanceScore += 2;
          matchedKeywords.push(keyword);
        }
      }
      
      // Check for function/class definitions
      if (this.patterns.functions.test(line) || this.patterns.classes.test(line)) {
        relevanceScore += 3;
      }
      
      if (relevanceScore > 0) {
        // Determine block boundaries
        const blockBounds = this.getBlockBoundaries(lines, i);
        const rangeKey = `${blockBounds.start}-${blockBounds.end}`;
        
        // Skip if already processed
        if (processedRanges.has(rangeKey)) continue;
        processedRanges.add(rangeKey);
        
        blocks.push({
          lines: lines.slice(blockBounds.start, blockBounds.end + 1),
          relevance: relevanceScore,
          start: blockBounds.start,
          end: blockBounds.end,
          matchedKeywords: matchedKeywords
        });
      }
    }
    
    return blocks;
  }

  /**
   * Get logical block boundaries (function, class, etc.)
   */
  getBlockBoundaries(lines, startIndex) {
    let start = startIndex;
    let end = startIndex;
    
    // Look for function/class start
    while (start > 0) {
      const line = lines[start - 1];
      if (this.isFunctionOrClassStart(line)) {
        start--;
        break;
      }
      if (line.trim() === '' && start < startIndex - 5) break;
      start--;
    }
    
    // Find end of block
    let braceCount = 0;
    let inBlock = false;
    
    for (let i = start; i < lines.length; i++) {
      const line = lines[i];
      
      // Count braces
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          inBlock = true;
        } else if (char === '}') {
          braceCount--;
        }
      }
      
      // Block ends when braces balance
      if (inBlock && braceCount === 0) {
        end = i;
        break;
      }
      
      // Limit block size
      if (i - start > 50) {
        end = start + 50;
        break;
      }
    }
    
    // Ensure we capture at least some context
    if (end - start < 5) {
      start = Math.max(0, startIndex - 5);
      end = Math.min(lines.length - 1, startIndex + 5);
    }
    
    return { start, end };
  }

  /**
   * Check if line starts a function or class
   */
  isFunctionOrClassStart(line) {
    const trimmed = line.trim();
    return (
      trimmed.match(/^(?:async\s+)?function\s+\w+/) ||
      trimmed.match(/^(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(/) ||
      trimmed.match(/^class\s+\w+/) ||
      trimmed.match(/^\w+\s*:\s*(?:async\s+)?function/) ||
      trimmed.match(/^\w+\s*\(.*?\)\s*{/)
    );
  }

  /**
   * Intelligent fallback when no specific blocks found
   */
  intelligentFallback(content, prompt, maxTokens) {
    const lines = content.split('\n');
    
    // Identify key sections
    const sections = {
      imports: [],
      exports: [],
      mainLogic: [],
      functions: [],
      classes: []
    };
    
    let currentSection = 'imports';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Categorize lines
      if (this.patterns.imports.test(line)) {
        sections.imports.push(line);
      } else if (this.patterns.exports.test(line)) {
        sections.exports.push(line);
      } else if (this.patterns.functions.test(line)) {
        // Capture function with some context
        const funcBlock = this.getBlockBoundaries(lines, i);
        sections.functions.push(...lines.slice(funcBlock.start, Math.min(funcBlock.end + 1, funcBlock.start + 10)));
        i = funcBlock.end; // Skip processed lines
      } else if (this.patterns.classes.test(line)) {
        // Capture class definition
        const classBlock = this.getBlockBoundaries(lines, i);
        sections.classes.push(...lines.slice(classBlock.start, Math.min(classBlock.end + 1, classBlock.start + 20)));
        i = classBlock.end;
      }
    }
    
    // Build summarized context
    const contextParts = [];
    
    // Add imports (limited)
    if (sections.imports.length > 0) {
      contextParts.push('// Imports');
      contextParts.push(...sections.imports.slice(0, 5));
      if (sections.imports.length > 5) {
        contextParts.push(`// ... ${sections.imports.length - 5} more imports`);
      }
      contextParts.push('');
    }
    
    // Add main structures
    if (sections.classes.length > 0) {
      contextParts.push('// Classes');
      contextParts.push(...sections.classes);
      contextParts.push('');
    }
    
    if (sections.functions.length > 0) {
      contextParts.push('// Key Functions');
      contextParts.push(...sections.functions);
      contextParts.push('');
    }
    
    // Add exports
    if (sections.exports.length > 0) {
      contextParts.push('// Exports');
      contextParts.push(...sections.exports.slice(0, 5));
    }
    
    return this.trimToTokenLimit(contextParts.join('\n'), maxTokens);
  }

  /**
   * Optimize blocks for token limit
   */
  optimizeForTokens(blocks, maxTokens) {
    // Sort by relevance
    blocks.sort((a, b) => b.relevance - a.relevance);
    
    const result = [];
    let currentTokens = 0;
    const addedBlocks = new Set();
    
    for (const block of blocks) {
      const blockKey = `${block.start}-${block.end}`;
      if (addedBlocks.has(blockKey)) continue;
      
      const blockText = block.lines.join('\n');
      const estimatedTokens = this.estimateTokens(blockText);
      
      if (currentTokens + estimatedTokens <= maxTokens) {
        result.push({
          text: blockText,
          keywords: block.matchedKeywords
        });
        currentTokens += estimatedTokens;
        addedBlocks.add(blockKey);
      } else if (currentTokens < maxTokens * 0.8) {
        // Try to fit partial block
        const remainingTokens = maxTokens - currentTokens;
        const trimmed = this.trimToTokenLimit(blockText, remainingTokens);
        result.push({
          text: trimmed,
          keywords: block.matchedKeywords
        });
        break;
      }
    }
    
    // Format result with context markers
    if (result.length === 0) {
      return '// No specific relevant context found';
    }
    
    const formattedParts = result.map((item, index) => {
      const keywords = item.keywords.length > 0 
        ? `// Relevant to: ${item.keywords.join(', ')}\n` 
        : '';
      return keywords + item.text;
    });
    
    return formattedParts.join('\n\n// --- Next relevant section ---\n\n');
  }

  /**
   * Generate cache key
   */
  generateCacheKey(filePath, prompt) {
    const hash = crypto.createHash('md5');
    hash.update(filePath);
    hash.update(prompt);
    return `context:${hash.digest('hex')}`;
  }

  /**
   * Get from cache
   */
  async getFromCache(key) {
    try {
      // Try Redis first
      const cached = await this.redis.get(key);
      if (cached) return cached;
      
      // Try memory cache
      return this.cache.get(key);
    } catch (error) {
      return null;
    }
  }

  /**
   * Add to cache with size management
   */
  async addToCache(key, value) {
    try {
      // Add to Redis with 1 hour expiry
      await this.redis.setex(key, 3600, value);
      
      // Add to memory cache
      const size = Buffer.byteLength(value);
      
      // Evict old entries if needed
      if (this.currentCacheSize + size > this.maxCacheSize) {
        this.evictOldEntries(size);
      }
      
      this.cache.set(key, value);
      this.currentCacheSize += size;
    } catch (error) {
      console.error('Cache error:', error);
    }
  }

  /**
   * Evict old cache entries
   */
  evictOldEntries(neededSize) {
    const entries = Array.from(this.cache.entries());
    let freedSize = 0;
    
    // Remove entries until we have enough space
    for (const [key, value] of entries) {
      if (freedSize >= neededSize) break;
      
      const size = Buffer.byteLength(value);
      this.cache.delete(key);
      this.currentCacheSize -= size;
      freedSize += size;
    }
  }

  /**
   * Estimate tokens (rough approximation)
   */
  estimateTokens(text) {
    // More accurate estimation based on common patterns
    const words = text.split(/\s+/).length;
    const punctuation = (text.match(/[.,;:!?(){}\[\]]/g) || []).length;
    const codeChars = (text.match(/[=+\-*/<>%&|^~]/g) || []).length;
    
    // Approximate formula: words + extra for punctuation and code syntax
    return Math.ceil(words * 1.3 + punctuation * 0.5 + codeChars * 0.3);
  }

  /**
   * Trim text to token limit
   */
  trimToTokenLimit(text, maxTokens) {
    const estimatedCharsPerToken = 3.5;
    const maxChars = Math.floor(maxTokens * estimatedCharsPerToken);
    
    if (text.length <= maxChars) {
      return text;
    }
    
    // Try to trim at a logical boundary
    const trimmed = text.substring(0, maxChars);
    
    // Find last complete line
    const lastNewline = trimmed.lastIndexOf('\n');
    if (lastNewline > maxChars * 0.8) {
      return trimmed.substring(0, lastNewline) + '\n// ... (content trimmed for token limit)';
    }
    
    // Find last complete statement
    const lastSemicolon = trimmed.lastIndexOf(';');
    const lastBrace = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf('{'));
    const cutPoint = Math.max(lastSemicolon, lastBrace, lastNewline);
    
    if (cutPoint > maxChars * 0.7) {
      return trimmed.substring(0, cutPoint + 1) + '\n// ... (content trimmed for token limit)';
    }
    
    return trimmed + '...\n// ... (content trimmed for token limit)';
  }

  /**
   * Clear cache
   */
  async clearCache() {
    this.cache.clear();
    this.currentCacheSize = 0;
    
    try {
      // Clear Redis cache entries
      const keys = await this.redis.keys('context:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Error clearing Redis cache:', error);
    }
  }
}

module.exports = ContextOptimizer;