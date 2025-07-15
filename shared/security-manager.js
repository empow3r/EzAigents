/**
 * Advanced Security Manager for Ez Aigent System
 * - API key encryption and management
 * - Input validation and sanitization
 * - Rate limiting and DDoS protection
 * - Security audit logging
 * - Access control and authentication
 */

const crypto = require('crypto');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class SecurityManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.agentId = config.agentId;
    this.masterKey = config.masterKey || process.env.MASTER_KEY;
    this.securityLevel = config.securityLevel || 'high'; // low, medium, high, maximum
    this.auditLogPath = config.auditLogPath || '.agent-memory/security';
    
    // Security configurations
    this.encryption = {
      algorithm: 'aes-256-gcm',
      keySize: 32,
      ivSize: 16,
      tagSize: 16
    };
    
    // Rate limiting
    this.rateLimits = new Map();
    this.rateLimitConfig = config.rateLimits || this.getDefaultRateLimits();
    
    // Access control
    this.allowedOrigins = config.allowedOrigins || ['localhost', '127.0.0.1'];
    this.trustedAgents = new Set(config.trustedAgents || []);
    
    // Security rules
    this.securityRules = this.getSecurityRules();
    
    // Audit log
    this.auditLog = [];
    this.maxAuditEntries = 10000;
    
    // Threat detection
    this.threatPatterns = this.getThreatPatterns();
    this.suspiciousActivity = new Map();
    
    this.isInitialized = false;
  }

  getDefaultRateLimits() {
    return {
      api_calls: { window: 60000, max: 100 }, // 100 calls per minute
      task_submissions: { window: 60000, max: 50 }, // 50 tasks per minute
      message_sends: { window: 60000, max: 200 }, // 200 messages per minute
      auth_attempts: { window: 300000, max: 5 } // 5 auth attempts per 5 minutes
    };
  }

  getSecurityRules() {
    const rules = {
      input_validation: {
        max_prompt_length: 100000, // 100KB
        max_file_size: 10 * 1024 * 1024, // 10MB
        allowed_file_types: ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.h', '.json', '.yaml', '.yml', '.md', '.txt'],
        blocked_patterns: [
          /(?:password|secret|key|token)\s*[=:]\s*['"][^'"]+['"]/gi,
          /(?:eval|exec|system|shell_exec|passthru)\s*\(/gi,
          /<script[^>]*>.*?<\/script>/gsi,
          /javascript\s*:/gi
        ]
      },
      content_filtering: {
        blocked_keywords: [
          'rm -rf', 'format c:', 'delete system32', 'drop table', 'truncate table',
          'union select', 'script>', 'eval(', 'exec(', 'system(', 'shell_exec('
        ],
        suspicious_patterns: [
          /\b(?:sql\s+injection|xss|csrf|buffer\s+overflow)\b/gi,
          /\b(?:hack|exploit|vulnerability|backdoor|malware)\b/gi,
          /(?:\.\.|\/etc\/|\/bin\/|cmd\.exe|powershell\.exe)/gi
        ]
      }
    };

    // Adjust based on security level
    if (this.securityLevel === 'maximum') {
      rules.input_validation.max_prompt_length = 50000;
      rules.input_validation.max_file_size = 5 * 1024 * 1024;
    } else if (this.securityLevel === 'low') {
      rules.input_validation.max_prompt_length = 200000;
      rules.input_validation.max_file_size = 20 * 1024 * 1024;
    }

    return rules;
  }

  getThreatPatterns() {
    return {
      brute_force: {
        pattern: /rapid.{0,20}request|multiple.{0,20}attempt|brute.{0,20}force/gi,
        threshold: 10, // 10 detections in 5 minutes
        window: 300000
      },
      injection_attempt: {
        pattern: /(?:union\s+select|drop\s+table|exec\s*\(|eval\s*\()/gi,
        threshold: 3,
        window: 60000
      },
      suspicious_file_access: {
        pattern: /(?:\/etc\/passwd|\/etc\/shadow|\.ssh\/|\.aws\/)/gi,
        threshold: 1,
        window: 60000
      },
      excessive_errors: {
        pattern: /error|exception|fail/gi,
        threshold: 50, // 50 errors in 5 minutes
        window: 300000
      }
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🔐 Initializing Security Manager...');
      
      // Validate master key
      await this.validateMasterKey();
      
      // Ensure security directories exist
      await this.ensureSecurityDirectories();
      
      // Load security configuration
      await this.loadSecurityConfiguration();
      
      // Start threat monitoring
      this.startThreatMonitoring();
      
      this.isInitialized = true;
      console.log(`✅ Security Manager initialized (Level: ${this.securityLevel})`);
      
    } catch (error) {
      console.error('❌ Failed to initialize Security Manager:', error);
      throw error;
    }
  }

  async validateMasterKey() {
    if (!this.masterKey) {
      throw new Error('Master key is required for security operations');
    }
    
    if (this.masterKey.length < 32) {
      throw new Error('Master key must be at least 32 characters long');
    }
    
    // Test encryption/decryption
    const testData = 'security-test';
    const encrypted = await this.encryptData(testData);
    const decrypted = await this.decryptData(encrypted);
    
    if (decrypted !== testData) {
      throw new Error('Master key validation failed');
    }
  }

  async ensureSecurityDirectories() {
    const directories = [
      this.auditLogPath,
      path.join(this.auditLogPath, 'threats'),
      path.join(this.auditLogPath, 'access'),
      path.join(this.auditLogPath, 'keys')
    ];
    
    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  async loadSecurityConfiguration() {
    try {
      const configPath = path.join(this.auditLogPath, 'security-config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Merge with default configuration
      this.trustedAgents = new Set([...this.trustedAgents, ...config.trustedAgents || []]);
      this.allowedOrigins = [...this.allowedOrigins, ...config.allowedOrigins || []];
      
      console.log('🔐 Security configuration loaded');
      
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('⚠️ Failed to load security configuration:', error.message);
      }
    }
  }

  startThreatMonitoring() {
    // Clean up old threat data every 5 minutes
    setInterval(() => {
      this.cleanupThreatData();
    }, 300000);
    
    // Audit log rotation every hour
    setInterval(() => {
      this.rotateAuditLog();
    }, 3600000);
    
    console.log('🛡️ Threat monitoring started');
  }

  // Encryption/Decryption methods

  async encryptData(data) {
    const iv = crypto.randomBytes(this.encryption.ivSize);
    const key = crypto.scryptSync(this.masterKey, 'ez-aigent-salt', this.encryption.keySize);
    
    const cipher = crypto.createCipherGCM(this.encryption.algorithm, key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: this.encryption.algorithm
    };
  }

  async decryptData(encryptedData) {
    if (!encryptedData.encrypted) {
      return encryptedData; // Not encrypted
    }
    
    const key = crypto.scryptSync(this.masterKey, 'ez-aigent-salt', this.encryption.keySize);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipherGCM(this.encryption.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  // API Key Management

  async storeApiKey(service, apiKey) {
    const encryptedKey = await this.encryptData(apiKey);
    const keyData = {
      service,
      encryptedKey,
      createdAt: new Date().toISOString(),
      agentId: this.agentId
    };
    
    const keyPath = path.join(this.auditLogPath, 'keys', `${service}-${this.agentId}.json`);
    await fs.writeFile(keyPath, JSON.stringify(keyData, null, 2));
    
    this.logSecurityEvent('api_key_stored', {
      service,
      agentId: this.agentId
    });
    
    console.log(`🔑 API key for ${service} stored securely`);
  }

  async retrieveApiKey(service) {
    try {
      const keyPath = path.join(this.auditLogPath, 'keys', `${service}-${this.agentId}.json`);
      const keyData = JSON.parse(await fs.readFile(keyPath, 'utf8'));
      
      const apiKey = await this.decryptData(keyData.encryptedKey);
      
      this.logSecurityEvent('api_key_accessed', {
        service,
        agentId: this.agentId
      });
      
      return apiKey;
      
    } catch (error) {
      this.logSecurityEvent('api_key_access_failed', {
        service,
        agentId: this.agentId,
        error: error.message
      });
      
      throw new Error(`Failed to retrieve API key for ${service}: ${error.message}`);
    }
  }

  // Input Validation and Sanitization

  async validateInput(input, context = 'general') {
    const validationResult = {
      isValid: true,
      sanitizedInput: input,
      warnings: [],
      blocked: false,
      reason: null
    };
    
    try {
      // Check input size
      if (typeof input === 'string' && input.length > this.securityRules.input_validation.max_prompt_length) {
        validationResult.isValid = false;
        validationResult.blocked = true;
        validationResult.reason = `Input exceeds maximum length (${this.securityRules.input_validation.max_prompt_length})`;
        return validationResult;
      }
      
      // Check for blocked patterns
      for (const pattern of this.securityRules.input_validation.blocked_patterns) {
        if (pattern.test(input)) {
          validationResult.isValid = false;
          validationResult.blocked = true;
          validationResult.reason = 'Input contains blocked patterns';
          
          this.logSecurityEvent('input_blocked', {
            context,
            pattern: pattern.toString(),
            inputLength: input.length
          });
          
          return validationResult;
        }
      }
      
      // Check for suspicious content
      for (const keyword of this.securityRules.content_filtering.blocked_keywords) {
        if (input.toLowerCase().includes(keyword.toLowerCase())) {
          validationResult.warnings.push(`Suspicious keyword detected: ${keyword}`);
        }
      }
      
      // Sanitize input
      validationResult.sanitizedInput = this.sanitizeInput(input);
      
      // Log validation
      this.logSecurityEvent('input_validated', {
        context,
        inputLength: input.length,
        warnings: validationResult.warnings.length,
        sanitized: validationResult.sanitizedInput !== input
      });
      
      return validationResult;
      
    } catch (error) {
      this.logSecurityEvent('validation_error', {
        context,
        error: error.message
      });
      
      validationResult.isValid = false;
      validationResult.blocked = true;
      validationResult.reason = 'Validation error occurred';
      
      return validationResult;
    }
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove potential script tags
    let sanitized = input.replace(/<script[^>]*>.*?<\/script>/gsi, '');
    
    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript\s*:/gi, '');
    
    // Escape HTML entities
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
    
    return sanitized;
  }

  // Rate Limiting

  async checkRateLimit(identifier, action = 'general') {
    const config = this.rateLimitConfig[action] || this.rateLimitConfig.api_calls;
    const key = `${identifier}:${action}`;
    const now = Date.now();
    
    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, []);
    }
    
    const attempts = this.rateLimits.get(key);
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(timestamp => now - timestamp < config.window);
    this.rateLimits.set(key, validAttempts);
    
    // Check if limit exceeded
    if (validAttempts.length >= config.max) {
      this.logSecurityEvent('rate_limit_exceeded', {
        identifier,
        action,
        attempts: validAttempts.length,
        limit: config.max,
        window: config.window
      });
      
      // Detect potential brute force
      this.detectThreat('brute_force', identifier, `Rate limit exceeded: ${action}`);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.min(...validAttempts) + config.window
      };
    }
    
    // Record this attempt
    validAttempts.push(now);
    this.rateLimits.set(key, validAttempts);
    
    return {
      allowed: true,
      remaining: config.max - validAttempts.length,
      resetTime: now + config.window
    };
  }

  // Threat Detection

  detectThreat(threatType, identifier, context) {
    const pattern = this.threatPatterns[threatType];
    if (!pattern) return;
    
    const key = `${threatType}:${identifier}`;
    const now = Date.now();
    
    if (!this.suspiciousActivity.has(key)) {
      this.suspiciousActivity.set(key, []);
    }
    
    const activities = this.suspiciousActivity.get(key);
    
    // Remove old activities
    const recentActivities = activities.filter(activity => now - activity.timestamp < pattern.window);
    recentActivities.push({ timestamp: now, context });
    
    this.suspiciousActivity.set(key, recentActivities);
    
    // Check threshold
    if (recentActivities.length >= pattern.threshold) {
      this.handleThreatDetected(threatType, identifier, recentActivities);
    }
  }

  handleThreatDetected(threatType, identifier, activities) {
    const threat = {
      type: threatType,
      identifier,
      activities,
      detectedAt: new Date().toISOString(),
      severity: this.getThreatSeverity(threatType)
    };
    
    this.logSecurityEvent('threat_detected', threat);
    
    console.log(`🚨 THREAT DETECTED: ${threatType} from ${identifier}`);
    
    // Emit threat event
    this.emit('threat_detected', threat);
    
    // Auto-mitigation for high severity threats
    if (threat.severity === 'high' || threat.severity === 'critical') {
      this.mitigateThreat(threat);
    }
  }

  getThreatSeverity(threatType) {
    const severityMap = {
      brute_force: 'high',
      injection_attempt: 'critical',
      suspicious_file_access: 'high',
      excessive_errors: 'medium'
    };
    
    return severityMap[threatType] || 'low';
  }

  async mitigateThreat(threat) {
    console.log(`🛡️ Mitigating threat: ${threat.type} from ${threat.identifier}`);
    
    // Add to blocked identifiers (temporary)
    const blockDuration = this.getBlockDuration(threat.severity);
    await this.blockIdentifier(threat.identifier, blockDuration, threat.type);
    
    // Save threat details
    await this.saveThreatDetails(threat);
    
    this.logSecurityEvent('threat_mitigated', {
      type: threat.type,
      identifier: threat.identifier,
      blockDuration
    });
  }

  getBlockDuration(severity) {
    const durations = {
      low: 5 * 60 * 1000,      // 5 minutes
      medium: 15 * 60 * 1000,  // 15 minutes
      high: 60 * 60 * 1000,    // 1 hour
      critical: 24 * 60 * 60 * 1000 // 24 hours
    };
    
    return durations[severity] || durations.medium;
  }

  async blockIdentifier(identifier, duration, reason) {
    // In a real implementation, this would integrate with firewall/proxy rules
    console.log(`🚫 Blocking ${identifier} for ${Math.round(duration / 60000)} minutes (${reason})`);
    
    // For now, store in memory and Redis
    setTimeout(() => {
      console.log(`✅ Unblocking ${identifier}`);
    }, duration);
  }

  async saveThreatDetails(threat) {
    try {
      const threatPath = path.join(this.auditLogPath, 'threats', `${threat.type}-${Date.now()}.json`);
      await fs.writeFile(threatPath, JSON.stringify(threat, null, 2));
    } catch (error) {
      console.error('❌ Failed to save threat details:', error);
    }
  }

  // Access Control

  isAgentTrusted(agentId) {
    return this.trustedAgents.has(agentId);
  }

  isOriginAllowed(origin) {
    return this.allowedOrigins.includes(origin) || this.allowedOrigins.includes('*');
  }

  async authorizeOperation(agentId, operation, context = {}) {
    const authResult = {
      authorized: false,
      reason: 'Unknown',
      permissions: []
    };
    
    try {
      // Check if agent is trusted
      if (!this.isAgentTrusted(agentId)) {
        authResult.reason = 'Agent not in trusted list';
        this.logSecurityEvent('authorization_denied', {
          agentId,
          operation,
          reason: authResult.reason
        });
        return authResult;
      }
      
      // Check rate limits
      const rateCheck = await this.checkRateLimit(agentId, operation);
      if (!rateCheck.allowed) {
        authResult.reason = 'Rate limit exceeded';
        this.logSecurityEvent('authorization_denied', {
          agentId,
          operation,
          reason: authResult.reason
        });
        return authResult;
      }
      
      // Operation-specific checks
      if (operation === 'task_execute' && context.taskType === 'system_command') {
        if (this.securityLevel === 'maximum') {
          authResult.reason = 'System commands blocked at maximum security level';
          return authResult;
        }
      }
      
      authResult.authorized = true;
      authResult.reason = 'Authorized';
      authResult.permissions = this.getAgentPermissions(agentId);
      
      this.logSecurityEvent('authorization_granted', {
        agentId,
        operation,
        permissions: authResult.permissions
      });
      
      return authResult;
      
    } catch (error) {
      authResult.reason = `Authorization error: ${error.message}`;
      this.logSecurityEvent('authorization_error', {
        agentId,
        operation,
        error: error.message
      });
      
      return authResult;
    }
  }

  getAgentPermissions(agentId) {
    // Basic permissions for trusted agents
    const basePermissions = [
      'task_execute',
      'message_send',
      'message_receive',
      'metrics_read'
    ];
    
    // Additional permissions based on security level
    if (this.securityLevel === 'low') {
      basePermissions.push('system_info', 'file_read');
    }
    
    return basePermissions;
  }

  // Audit Logging

  logSecurityEvent(eventType, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      agentId: this.agentId,
      eventType,
      details,
      severity: this.getEventSeverity(eventType)
    };
    
    this.auditLog.push(logEntry);
    
    // Console logging for important events
    if (logEntry.severity === 'high' || logEntry.severity === 'critical') {
      console.log(`🔐 SECURITY EVENT: ${eventType}`, details);
    }
    
    // Emit event
    this.emit('security_event', logEntry);
    
    // Trim audit log if too large
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-Math.floor(this.maxAuditEntries * 0.8));
    }
  }

  getEventSeverity(eventType) {
    const severityMap = {
      threat_detected: 'critical',
      authorization_denied: 'high',
      input_blocked: 'high',
      rate_limit_exceeded: 'medium',
      api_key_accessed: 'low',
      input_validated: 'low'
    };
    
    return severityMap[eventType] || 'low';
  }

  async rotateAuditLog() {
    try {
      const logPath = path.join(this.auditLogPath, `audit-${Date.now()}.json`);
      await fs.writeFile(logPath, JSON.stringify(this.auditLog, null, 2));
      
      // Clear in-memory log
      this.auditLog = [];
      
      console.log(`🔐 Audit log rotated: ${path.basename(logPath)}`);
      
    } catch (error) {
      console.error('❌ Failed to rotate audit log:', error);
    }
  }

  // Utility methods

  cleanupThreatData() {
    const now = Date.now();
    
    for (const [key, activities] of this.suspiciousActivity.entries()) {
      const [threatType] = key.split(':');
      const pattern = this.threatPatterns[threatType];
      
      if (pattern) {
        const recentActivities = activities.filter(
          activity => now - activity.timestamp < pattern.window * 2
        );
        
        if (recentActivities.length === 0) {
          this.suspiciousActivity.delete(key);
        } else {
          this.suspiciousActivity.set(key, recentActivities);
        }
      }
    }
    
    // Clean up rate limits
    for (const [key, attempts] of this.rateLimits.entries()) {
      const [, action] = key.split(':');
      const config = this.rateLimitConfig[action] || this.rateLimitConfig.api_calls;
      
      const validAttempts = attempts.filter(timestamp => now - timestamp < config.window * 2);
      
      if (validAttempts.length === 0) {
        this.rateLimits.delete(key);
      } else {
        this.rateLimits.set(key, validAttempts);
      }
    }
  }

  getSecurityStatus() {
    return {
      securityLevel: this.securityLevel,
      auditLogEntries: this.auditLog.length,
      threatDetections: this.suspiciousActivity.size,
      rateLimitedIdentifiers: this.rateLimits.size,
      trustedAgents: this.trustedAgents.size,
      isInitialized: this.isInitialized
    };
  }

  async shutdown() {
    console.log('🛑 Shutting down Security Manager...');
    
    // Save final audit log
    await this.rotateAuditLog();
    
    // Clear sensitive data from memory
    this.rateLimits.clear();
    this.suspiciousActivity.clear();
    this.auditLog = [];
    
    console.log('✅ Security Manager shutdown complete');
  }
}

module.exports = SecurityManager;