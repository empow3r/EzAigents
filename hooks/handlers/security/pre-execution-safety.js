const BaseHook = require('../../core/BaseHook');

class PreExecutionSafetyHook extends BaseHook {
  constructor(config = {}) {
    super(config);
    
    this.metadata = {
      name: 'pre-execution-safety',
      version: '1.0.0',
      type: 'pre-task',
      description: 'Blocks dangerous operations and enforces security policies',
      priority: 100, // High priority to run first
      enabled: true,
      timeout: 5000
    };

    // Dangerous patterns to block
    this.dangerousPatterns = [
      // File system operations
      /rm\s+-rf\s+\//,
      /rm\s+-rf\s+\*/,
      /chmod\s+777/,
      /chown\s+-R/,
      
      // Sensitive files
      /\.env/,
      /tokenpool\.json/,
      /\.ssh/,
      /\.aws/,
      /private\.key/,
      /id_rsa/,
      
      // API keys and secrets
      /api[-_]?key/i,
      /secret[-_]?key/i,
      /password/i,
      /bearer\s+[a-zA-Z0-9-._~+\/]+=*/i,
      
      // Network operations
      /curl.*--data.*password/i,
      /wget.*credentials/i,
      
      // Database operations
      /drop\s+database/i,
      /truncate\s+table/i,
      /delete\s+from.*where\s+1\s*=\s*1/i
    ];

    // Whitelist patterns (override blocks)
    this.whitelistPatterns = config.whitelistPatterns || [
      /^src\//,
      /^tests?\//,
      /^docs?\//
    ];

    // Resource limits
    this.resourceLimits = {
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxFilesPerTask: config.maxFilesPerTask || 50,
      maxApiCallsPerMinute: config.maxApiCallsPerMinute || 100,
      ...config.resourceLimits
    };

    // Track resource usage
    this.resourceUsage = new Map();
  }

  async validate(context) {
    // Ensure we have task information
    if (!context.task) {
      return { valid: false, reason: 'No task context provided' };
    }

    return { valid: true };
  }

  async execute(context) {
    const { task, agent } = context;
    const checks = [];

    // Check task prompt for dangerous patterns
    if (task.prompt) {
      const promptCheck = this.checkDangerousPatterns(task.prompt, 'prompt');
      if (!promptCheck.safe) {
        checks.push(promptCheck);
      }
    }

    // Check file paths if task involves file operations
    if (task.files) {
      for (const file of task.files) {
        const fileCheck = this.checkFileSafety(file);
        if (!fileCheck.safe) {
          checks.push(fileCheck);
        }
      }
    }

    // Check command if task involves system commands
    if (task.command) {
      const commandCheck = this.checkDangerousPatterns(task.command, 'command');
      if (!commandCheck.safe) {
        checks.push(commandCheck);
      }
    }

    // Check resource limits
    const resourceCheck = await this.checkResourceLimits(agent.id, task);
    if (!resourceCheck.safe) {
      checks.push(resourceCheck);
    }

    // If any checks failed, block execution
    if (checks.length > 0) {
      context.warn('Task blocked by safety hook', {
        agent: agent.id,
        task: task.id,
        violations: checks
      });

      // Log to Redis for monitoring
      await this.logSecurityEvent(context, checks);

      return {
        action: 'block',
        reason: 'Security policy violation',
        violations: checks,
        stopChain: true // Stop further hook execution
      };
    }

    // Task is safe to proceed
    context.debug('Task passed safety checks', {
      agent: agent.id,
      task: task.id
    });

    return {
      action: 'allow',
      checks: {
        patterns: 'passed',
        files: 'passed',
        resources: 'passed'
      }
    };
  }

  checkDangerousPatterns(text, type) {
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(text)) {
        // Check if whitelisted
        const isWhitelisted = this.whitelistPatterns.some(wp => wp.test(text));
        if (!isWhitelisted) {
          return {
            safe: false,
            type: 'dangerous_pattern',
            category: type,
            pattern: pattern.toString(),
            matched: text.match(pattern)[0]
          };
        }
      }
    }
    return { safe: true };
  }

  checkFileSafety(filePath) {
    // Check for sensitive file paths
    const sensitivePaths = [
      /^\/etc/,
      /^\/root/,
      /^\/home\/[^\/]+\/\.(ssh|aws|config)/,
      /\.\.(\/|\\)/  // Directory traversal
    ];

    for (const pattern of sensitivePaths) {
      if (pattern.test(filePath)) {
        return {
          safe: false,
          type: 'sensitive_file',
          path: filePath,
          pattern: pattern.toString()
        };
      }
    }

    return { safe: true };
  }

  async checkResourceLimits(agentId, task) {
    const now = Date.now();
    const minuteAgo = now - 60000;

    // Initialize usage tracking for agent
    if (!this.resourceUsage.has(agentId)) {
      this.resourceUsage.set(agentId, {
        apiCalls: [],
        filesCreated: 0,
        totalFileSize: 0
      });
    }

    const usage = this.resourceUsage.get(agentId);

    // Clean old API call records
    usage.apiCalls = usage.apiCalls.filter(time => time > minuteAgo);

    // Check API rate limit
    if (task.type === 'api_call') {
      if (usage.apiCalls.length >= this.resourceLimits.maxApiCallsPerMinute) {
        return {
          safe: false,
          type: 'rate_limit',
          resource: 'api_calls',
          current: usage.apiCalls.length,
          limit: this.resourceLimits.maxApiCallsPerMinute
        };
      }
      usage.apiCalls.push(now);
    }

    // Check file limits
    if (task.type === 'file_write') {
      if (usage.filesCreated >= this.resourceLimits.maxFilesPerTask) {
        return {
          safe: false,
          type: 'resource_limit',
          resource: 'files_created',
          current: usage.filesCreated,
          limit: this.resourceLimits.maxFilesPerTask
        };
      }

      if (task.fileSize && task.fileSize > this.resourceLimits.maxFileSize) {
        return {
          safe: false,
          type: 'resource_limit',
          resource: 'file_size',
          size: task.fileSize,
          limit: this.resourceLimits.maxFileSize
        };
      }
    }

    return { safe: true };
  }

  async logSecurityEvent(context, violations) {
    const event = {
      timestamp: new Date().toISOString(),
      agent: context.agent,
      task: context.task,
      violations,
      action: 'blocked'
    };

    // Store in Redis
    const key = `security:violations:${Date.now()}`;
    await context.redis.setEx(key, 86400, JSON.stringify(event)); // 24 hour TTL

    // Add to sorted set for time-based queries
    await context.redis.zAdd('security:violations:timeline', {
      score: Date.now(),
      value: key
    });

    // Publish event for real-time monitoring
    await context.redis.publish('security:alerts', JSON.stringify(event));
  }

  // Configuration methods
  addDangerousPattern(pattern) {
    this.dangerousPatterns.push(pattern);
  }

  removeDangerousPattern(pattern) {
    const index = this.dangerousPatterns.findIndex(p => p.toString() === pattern.toString());
    if (index > -1) {
      this.dangerousPatterns.splice(index, 1);
    }
  }

  addWhitelistPattern(pattern) {
    this.whitelistPatterns.push(pattern);
  }

  updateResourceLimit(resource, limit) {
    this.resourceLimits[resource] = limit;
  }

  // Get current configuration
  getConfiguration() {
    return {
      dangerousPatterns: this.dangerousPatterns.map(p => p.toString()),
      whitelistPatterns: this.whitelistPatterns.map(p => p.toString()),
      resourceLimits: this.resourceLimits
    };
  }
}

module.exports = PreExecutionSafetyHook;