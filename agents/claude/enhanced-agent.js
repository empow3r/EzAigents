/**
 * Enhanced Claude Agent Implementation
 * Uses StandardizedBaseAgent with all advanced features
 */

const StandardizedBaseAgent = require('../../shared/standardized-base-agent');
const fetch = require('node-fetch');

class EnhancedClaudeAgent extends StandardizedBaseAgent {
  constructor(config = {}) {
    super({
      agentType: 'claude',
      model: 'claude-3-opus',
      role: 'Senior Software Architect & Code Analyst',
      capabilities: [
        'architecture',
        'refactoring',
        'code_analysis',
        'large_context',
        'documentation',
        'system_design',
        'best_practices',
        'security_analysis'
      ],
      maxLoad: 3, // Claude handles fewer but more complex tasks
      rateLimitPerMinute: 50,
      taskTimeout: 60000, // 1 minute for complex analysis
      memoryLimit: 1024, // 1GB for large context processing
      ...config
    });
    
    // Claude-specific configuration
    this.apiEndpoint = 'https://api.openrouter.ai/api/v1/chat/completions';
    this.maxTokens = 4000;
    this.temperature = 0.1; // More focused responses
    this.systemPrompt = this.buildSystemPrompt();
    
    // Performance optimization
    this.contextCache = new Map();
    this.maxCacheSize = 100;
  }

  buildSystemPrompt() {
    return `You are Claude, a senior software architect and code analyst specializing in:

**Core Expertise:**
- System architecture and design patterns
- Code refactoring and optimization
- Large codebase analysis and understanding
- Technical documentation and best practices
- Cross-language development patterns
- Security and performance considerations
- Enterprise software architecture

**Working Style:**
- Provide detailed, well-structured analysis
- Focus on maintainability and scalability
- Consider long-term architectural implications
- Emphasize best practices and industry standards
- Collaborate effectively with other AI agents

**Task Approach:**
- Break down complex problems systematically
- Provide actionable recommendations
- Include rationale for architectural decisions
- Consider trade-offs and alternatives
- Focus on code quality and maintainability

You work as part of the Ez Aigent ecosystem, collaborating with other specialized AI agents to deliver comprehensive software solutions.`;
  }

  async performConnectivityTest() {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'Test connectivity. Respond with "OK".' }],
          max_tokens: 10,
          temperature: 0
        }),
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`API test failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices && data.choices[0] && data.choices[0].message;
      
    } catch (error) {
      throw new Error(`Claude API connectivity test failed: ${error.message}`);
    }
  }

  async processTask(task) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`🧠 Processing Claude task: ${task.id}`, {
        type: task.type || 'general',
        promptLength: task.prompt.length
      });

      // Determine task type and use specialized processing
      const taskType = this.determineTaskType(task);
      let result;

      switch (taskType) {
        case 'architecture_analysis':
          result = await this.processArchitectureTask(task);
          break;
        case 'code_review':
          result = await this.processCodeReviewTask(task);
          break;
        case 'refactoring':
          result = await this.processRefactoringTask(task);
          break;
        case 'documentation':
          result = await this.processDocumentationTask(task);
          break;
        case 'security_analysis':
          result = await this.processSecurityAnalysisTask(task);
          break;
        default:
          result = await this.processGeneralTask(task);
      }

      // Update API call metrics
      this.metrics.apiCallsTotal++;
      this.metrics.apiCallsSuccessful++;

      const duration = Date.now() - startTime;
      this.logger.info(`✅ Claude task completed: ${task.id} (${duration}ms)`, {
        taskType,
        outputLength: result.response ? result.response.length : 0
      });

      return result;

    } catch (error) {
      this.metrics.apiCallsTotal++;
      this.logger.error(`❌ Claude task failed: ${task.id}:`, error);
      throw error;
    }
  }

  determineTaskType(task) {
    const prompt = task.prompt.toLowerCase();
    const file = task.file ? task.file.toLowerCase() : '';

    if (prompt.includes('architecture') || prompt.includes('design pattern') || prompt.includes('system design')) {
      return 'architecture_analysis';
    }
    
    if (prompt.includes('review') || prompt.includes('analyze') || prompt.includes('critique')) {
      return 'code_review';
    }
    
    if (prompt.includes('refactor') || prompt.includes('optimize') || prompt.includes('improve')) {
      return 'refactoring';
    }
    
    if (prompt.includes('document') || prompt.includes('explain') || prompt.includes('describe')) {
      return 'documentation';
    }
    
    if (prompt.includes('security') || prompt.includes('vulnerability') || prompt.includes('secure')) {
      return 'security_analysis';
    }

    return 'general';
  }

  async processArchitectureTask(task) {
    const enhancedPrompt = `${this.systemPrompt}

**ARCHITECTURE ANALYSIS TASK**

Task: ${task.prompt}
${task.file ? `File: ${task.file}` : ''}

Please provide a comprehensive architectural analysis including:
1. Current architecture assessment
2. Identified patterns and anti-patterns
3. Scalability considerations
4. Performance implications
5. Recommended improvements
6. Implementation roadmap

Focus on enterprise-grade architectural principles and long-term maintainability.`;

    return await this.callClaudeAPI(enhancedPrompt, task);
  }

  async processCodeReviewTask(task) {
    const enhancedPrompt = `${this.systemPrompt}

**CODE REVIEW TASK**

Task: ${task.prompt}
${task.file ? `File: ${task.file}` : ''}

Please provide a thorough code review covering:
1. Code quality and readability
2. Performance considerations
3. Security vulnerabilities
4. Best practices compliance
5. Potential bugs or issues
6. Specific improvement recommendations

Use a constructive tone and provide actionable feedback.`;

    return await this.callClaudeAPI(enhancedPrompt, task);
  }

  async processRefactoringTask(task) {
    const enhancedPrompt = `${this.systemPrompt}

**REFACTORING TASK**

Task: ${task.prompt}
${task.file ? `File: ${task.file}` : ''}

Please provide refactoring recommendations including:
1. Current code analysis
2. Identified improvement opportunities
3. Proposed refactoring steps
4. Before/after comparisons where applicable
5. Risk assessment
6. Testing strategy for changes

Focus on maintainability, performance, and code clarity.`;

    return await this.callClaudeAPI(enhancedPrompt, task);
  }

  async processDocumentationTask(task) {
    const enhancedPrompt = `${this.systemPrompt}

**DOCUMENTATION TASK**

Task: ${task.prompt}
${task.file ? `File: ${task.file}` : ''}

Please create comprehensive documentation including:
1. Clear explanations of functionality
2. Usage examples and code samples
3. Configuration options
4. Best practices and guidelines
5. Common pitfalls and troubleshooting
6. Related components and dependencies

Write for both technical and non-technical audiences as appropriate.`;

    return await this.callClaudeAPI(enhancedPrompt, task);
  }

  async processSecurityAnalysisTask(task) {
    const enhancedPrompt = `${this.systemPrompt}

**SECURITY ANALYSIS TASK**

Task: ${task.prompt}
${task.file ? `File: ${task.file}` : ''}

Please provide a security analysis including:
1. Vulnerability assessment
2. Attack vector identification
3. Risk severity ratings
4. Mitigation strategies
5. Secure coding recommendations
6. Compliance considerations

Focus on practical, actionable security improvements.`;

    return await this.callClaudeAPI(enhancedPrompt, task);
  }

  async processGeneralTask(task) {
    const enhancedPrompt = `${this.systemPrompt}

**GENERAL ANALYSIS TASK**

Task: ${task.prompt}
${task.file ? `File: ${task.file}` : ''}

Please provide a comprehensive analysis addressing the specific requirements while leveraging your expertise in software architecture and best practices.`;

    return await this.callClaudeAPI(enhancedPrompt, task);
  }

  async callClaudeAPI(prompt, task) {
    // Check cache first
    const cacheKey = this.generateCacheKey(prompt);
    if (this.contextCache.has(cacheKey)) {
      this.logger.info(`📋 Cache hit for task: ${task.id}`);
      return this.contextCache.get(cacheKey);
    }

    const requestBody = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    };

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ez-aigent.com',
        'X-Title': 'Ez Aigent - Claude Agent'
      },
      body: JSON.stringify(requestBody),
      timeout: this.taskTimeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Claude API');
    }

    const result = {
      success: true,
      response: data.choices[0].message.content,
      taskId: task.id,
      agentId: this.agentId,
      agentType: this.agentType,
      model: this.model,
      tokensUsed: data.usage?.total_tokens || 0,
      processingTime: Date.now() - (task.startTime || Date.now()),
      metadata: {
        finish_reason: data.choices[0].finish_reason,
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0
      }
    };

    // Cache the result
    this.addToCache(cacheKey, result);

    return result;
  }

  generateCacheKey(prompt) {
    // Create a hash of the prompt for caching
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16);
  }

  addToCache(key, value) {
    // Implement LRU cache behavior
    if (this.contextCache.size >= this.maxCacheSize) {
      const firstKey = this.contextCache.keys().next().value;
      this.contextCache.delete(firstKey);
    }
    
    this.contextCache.set(key, value);
    this.logger.debug(`📋 Added to cache: ${key}`);
  }

  async checkCollaborationNeeded(task) {
    const prompt = task.prompt.toLowerCase();
    
    // Determine if collaboration with other agents would be beneficial
    const collaborationScenarios = [
      {
        condition: prompt.includes('implement') || prompt.includes('code generation'),
        agents: ['gpt'],
        reason: 'Implementation after architectural design'
      },
      {
        condition: prompt.includes('test') || prompt.includes('testing'),
        agents: ['deepseek'],
        reason: 'Testing strategy and implementation'
      },
      {
        condition: prompt.includes('document') && prompt.includes('api'),
        agents: ['mistral'],
        reason: 'API documentation generation'
      },
      {
        condition: prompt.includes('research') || prompt.includes('latest'),
        agents: ['webscraper'],
        reason: 'Current information research'
      },
      {
        condition: prompt.includes('performance') || prompt.includes('optimize'),
        agents: ['gemini'],
        reason: 'Performance analysis and optimization'
      }
    ];

    for (const scenario of collaborationScenarios) {
      if (scenario.condition) {
        return {
          needed: true,
          agents: scenario.agents,
          reason: scenario.reason
        };
      }
    }

    return { needed: false };
  }

  async initiateCollaboration(task, collaboration) {
    this.logger.info(`🤝 Initiating collaboration for task ${task.id}: ${collaboration.reason}`);
    
    for (const agentType of collaboration.agents) {
      try {
        // Find available agent of the specified type
        const agent = await this.coordinator.selectOptimalAgent(agentType, task.complexity || 1);
        
        if (agent) {
          await this.coordinator.sendSecureMessage(
            agent.agentId,
            'collaboration_request',
            {
              taskId: task.id,
              collaborationType: collaboration.reason,
              taskData: task,
              requestingAgent: this.agentId
            },
            'high'
          );
          
          this.logger.info(`📤 Collaboration request sent to ${agent.agentId}`);
        }
      } catch (error) {
        this.logger.warn(`⚠️ Failed to initiate collaboration with ${agentType}:`, error.message);
      }
    }
  }

  // Handle direct messages (collaboration responses, etc.)
  async handleDirectMessage(message) {
    await super.handleDirectMessage(message);
    
    switch (message.type) {
      case 'collaboration_request':
        await this.handleCollaborationRequest(message);
        break;
      case 'collaboration_response':
        await this.handleCollaborationResponse(message);
        break;
      case 'code_analysis_request':
        await this.handleCodeAnalysisRequest(message);
        break;
    }
  }

  async handleCollaborationRequest(message) {
    const { taskData, collaborationType, requestingAgent } = message.data;
    
    this.logger.info(`🤝 Collaboration request from ${requestingAgent}: ${collaborationType}`);
    
    // Evaluate if we can help
    const canHelp = this.capabilities.some(cap => 
      collaborationType.toLowerCase().includes(cap)
    );
    
    if (canHelp && this.currentLoad < this.maxLoad) {
      // Accept collaboration
      await this.coordinator.sendSecureMessage(
        requestingAgent,
        'collaboration_response',
        {
          taskId: taskData.id,
          accepted: true,
          estimatedTime: this.estimateTaskTime(taskData),
          agentCapabilities: this.capabilities
        }
      );
      
      this.logger.info(`✅ Accepted collaboration for task ${taskData.id}`);
    } else {
      // Decline collaboration
      await this.coordinator.sendSecureMessage(
        requestingAgent,
        'collaboration_response',
        {
          taskId: taskData.id,
          accepted: false,
          reason: canHelp ? 'At capacity' : 'Outside expertise area'
        }
      );
      
      this.logger.info(`❌ Declined collaboration for task ${taskData.id}`);
    }
  }

  async handleCollaborationResponse(message) {
    const { taskId, accepted, estimatedTime } = message.data;
    
    if (accepted) {
      this.logger.info(`✅ Collaboration accepted for task ${taskId} (ETA: ${estimatedTime}ms)`);
    } else {
      this.logger.info(`❌ Collaboration declined for task ${taskId}: ${message.data.reason}`);
    }
  }

  async handleCodeAnalysisRequest(message) {
    const { code, analysisType, requestingAgent } = message.data;
    
    this.logger.info(`🔍 Code analysis request from ${requestingAgent}: ${analysisType}`);
    
    try {
      const analysisTask = {
        id: `analysis_${Date.now()}`,
        prompt: `Analyze this code for ${analysisType}:\n\n${code}`,
        type: 'code_analysis'
      };
      
      const result = await this.processCodeReviewTask(analysisTask);
      
      await this.coordinator.sendSecureMessage(
        requestingAgent,
        'code_analysis_result',
        {
          originalRequest: message.data,
          analysis: result,
          analyzedBy: this.agentId
        }
      );
      
    } catch (error) {
      this.logger.error(`❌ Code analysis failed:`, error);
      
      await this.coordinator.sendSecureMessage(
        requestingAgent,
        'code_analysis_error',
        {
          originalRequest: message.data,
          error: error.message,
          analyzedBy: this.agentId
        }
      );
    }
  }

  estimateTaskTime(task) {
    const baseTime = 10000; // 10 seconds base
    const promptLength = task.prompt ? task.prompt.length : 0;
    const complexityMultiplier = Math.min(promptLength / 1000, 5); // Max 5x multiplier
    
    return Math.round(baseTime * (1 + complexityMultiplier));
  }

  // Override memory cleanup for Claude-specific optimizations
  async performMemoryCleanup() {
    await super.performMemoryCleanup();
    
    // Clear context cache if memory is high
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    if (memoryUsageMB > this.memoryLimit * 0.7) {
      this.contextCache.clear();
      this.logger.info('🧹 Claude context cache cleared due to high memory usage');
    }
  }
}

module.exports = EnhancedClaudeAgent;