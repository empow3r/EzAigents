const EnhancedBaseAgent = require('../../shared/enhanced-base-agent');
const config = require('./config');

/**
 * GPT Agent with Universal Coordination
 * Specialized for backend development and API integration
 */
class GPTAgent extends EnhancedBaseAgent {
  constructor(agentConfig = {}) {
    super({
      agentType: 'gpt',
      agentId: agentConfig.agentId || process.env.AGENT_ID || `gpt-${Date.now()}`,
      model: config.model,
      role: config.role,
      capabilities: config.capabilities,
      systemPrompt: `You are GPT-4o, ${config.specialization}.

Your expertise includes:
- Backend architecture and API design
- Database schema design and optimization
- Microservices and distributed systems
- RESTful and GraphQL API development
- Authentication and authorization systems
- Performance optimization and caching
- Integration with external services
- Server deployment and DevOps

You collaborate with other Ez Aigent agents to build complete solutions.`,
      maxRetries: config.maxRetries || 3,
      retryDelay: 2000,
      memoryLimit: 200, // MB
      ...agentConfig
    });
    
    // GPT-specific configuration
    this.apiKey = process.env.OPENAI_API_KEY || process.env.GPT_API_KEY;
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY or GPT_API_KEY environment variable is required');
    }
    
    this.apiEndpoint = config.apiEndpoint;
    this.tokenLimit = config.tokenLimit;
    this.maxLoad = config.maxLoad;
    
    // Track active API requests
    this.activeRequests = new Set();
  }

  async initializeAgent() {
    this.log('Initializing GPT agent with coordination system...');
    
    // Register GPT-specific message handlers
    this.coordinator.registerMessageHandler('backend:implement', async (data, sender) => {
      this.log(`Received backend implementation request from ${sender}`);
      const result = await this.implementBackendFeature(data);
      await this.coordinator.sendDirectMessage(sender, 'backend:result', result);
    });
    
    this.coordinator.registerMessageHandler('api:design', async (data, sender) => {
      this.log(`Received API design request from ${sender}`);
      const result = await this.designAPI(data);
      await this.coordinator.sendDirectMessage(sender, 'api:specification', result);
    });
    
    this.coordinator.registerMessageHandler('database:schema', async (data, sender) => {
      this.log(`Received database schema request from ${sender}`);
      const result = await this.designDatabaseSchema(data);
      await this.coordinator.sendDirectMessage(sender, 'database:design', result);
    });
    
    this.coordinator.registerMessageHandler('integration:implement', async (data, sender) => {
      this.log(`Received integration request from ${sender}`);
      const result = await this.implementIntegration(data);
      await this.coordinator.sendDirectMessage(sender, 'integration:result', result);
    });
    
    this.log('GPT agent initialization completed');
  }

  async executeTask(task) {
    this.log(`Executing GPT task: ${task.type || 'backend'}`);
    
    try {
      let result;
      
      switch (task.type) {
        case 'backend':
        case 'backend_implementation':
          result = await this.implementBackendFeature(task);
          break;
          
        case 'api':
        case 'api_design':
          result = await this.designAPI(task);
          break;
          
        case 'database':
        case 'database_schema':
          result = await this.designDatabaseSchema(task);
          break;
          
        case 'integration':
          result = await this.implementIntegration(task);
          break;
          
        case 'optimization':
          result = await this.optimizeBackend(task);
          break;
          
        case 'debugging':
          result = await this.debugBackendIssue(task);
          break;
          
        default:
          result = await this.processGeneralTask(task);
      }
      
      // Save result to memory
      await this.saveToMemory({
        type: 'gpt_task_completed',
        task: task,
        result: result,
        timestamp: new Date().toISOString()
      }, 'completed');
      
      return result;
      
    } catch (error) {
      this.log(`GPT task execution failed: ${error.message}`, 'error');
      
      await this.saveToMemory({
        type: 'gpt_task_error',
        task: task,
        error: error.message,
        timestamp: new Date().toISOString()
      }, 'error');
      
      throw error;
    }
  }

  async checkCollaborationNeeded(task) {
    const collaborationScenarios = [
      // Need Claude for architecture review
      task.requiresArchitectureReview === true,
      
      // Need DeepSeek for testing generated code
      task.requiresTesting !== false && (task.type === 'backend' || task.type === 'api'),
      
      // Need Mistral for documentation
      task.generateDocs === true,
      
      // Need WebScraper for API integration research
      task.type === 'integration' && task.requiresResearch,
      
      // Complex feature requiring multiple expertise
      task.complexity === 'high' || task.requiresFullStack
    ];
    
    return collaborationScenarios.some(scenario => scenario);
  }

  getRequiredCapabilities(task) {
    const capabilities = [];
    
    if (task.requiresArchitectureReview) {
      capabilities.push('architecture', 'code_analysis');
    }
    
    if (task.requiresTesting !== false) {
      capabilities.push('testing', 'validation');
    }
    
    if (task.generateDocs) {
      capabilities.push('documentation');
    }
    
    if (task.type === 'integration' && task.requiresResearch) {
      capabilities.push('web_scraping', 'research');
    }
    
    return capabilities;
  }

  createSubtask(task, collaborator) {
    const subtask = { ...task, delegatedBy: this.config.agentId };
    
    if (collaborator.capabilities.includes('architecture')) {
      subtask.type = 'review_backend_architecture';
      subtask.code = task.result?.implementation;
      subtask.prompt = 'Review this backend implementation for architecture best practices';
    }
    
    if (collaborator.capabilities.includes('testing')) {
      subtask.type = 'test_backend_code';
      subtask.code = task.result?.implementation;
      subtask.testType = 'unit_and_integration';
    }
    
    if (collaborator.capabilities.includes('documentation')) {
      subtask.type = 'document_api';
      subtask.apiSpec = task.result?.apiSpecification;
      subtask.format = 'openapi';
    }
    
    if (collaborator.capabilities.includes('web_scraping')) {
      subtask.type = 'research_integration';
      subtask.service = task.integrationTarget;
      subtask.researchTopics = [`${task.integrationTarget} API documentation`, `${task.integrationTarget} best practices`];
    }
    
    return subtask;
  }

  async implementBackendFeature(task) {
    const {
      feature,
      requirements,
      language = 'javascript',
      framework = 'express',
      database = 'postgresql',
      includeTests = true
    } = task;

    this.log(`Implementing backend feature: ${feature}`);

    const prompt = this.buildPrompt({
      type: 'backend_implementation',
      feature,
      requirements,
      language,
      framework,
      database,
      context: await this.getRelevantContext(task)
    });

    const response = await this.callAPI(prompt);
    
    const result = {
      feature,
      implementation: this.extractCode(response),
      explanation: this.extractExplanation(response),
      dependencies: this.extractDependencies(response),
      databaseChanges: this.extractDatabaseChanges(response),
      apiEndpoints: this.extractAPIEndpoints(response),
      timestamp: new Date().toISOString()
    };

    // Request testing if needed
    if (includeTests && !task.skipCollaboration) {
      const deepseekAgent = await this.coordinator.findAgentForTask('testing');
      if (deepseekAgent) {
        await this.coordinator.sendDirectMessage(deepseekAgent.agentId, 'task:delegate', {
          type: 'test_backend_code',
          code: result.implementation,
          feature: feature,
          framework: framework,
          testType: 'unit_and_integration'
        });
        result.testingRequested = true;
      }
    }

    return result;
  }

  async designAPI(task) {
    const {
      apiName,
      purpose,
      endpoints,
      authentication = 'jwt',
      format = 'rest',
      includeOpenAPI = true
    } = task;

    this.log(`Designing API: ${apiName}`);

    const prompt = this.buildPrompt({
      type: 'api_design',
      apiName,
      purpose,
      endpoints,
      authentication,
      format,
      includeOpenAPI
    });

    const response = await this.callAPI(prompt);
    
    return {
      apiName,
      specification: this.extractAPISpecification(response),
      endpoints: this.extractEndpointDetails(response),
      authentication: this.extractAuthDetails(response),
      openAPISpec: includeOpenAPI ? this.extractOpenAPISpec(response) : null,
      implementation: this.extractCode(response),
      timestamp: new Date().toISOString()
    };
  }

  async designDatabaseSchema(task) {
    const {
      entities,
      relationships,
      database = 'postgresql',
      includeIndexes = true,
      includeMigrations = true
    } = task;

    this.log(`Designing database schema for: ${entities.join(', ')}`);

    const prompt = this.buildPrompt({
      type: 'database_design',
      entities,
      relationships,
      database,
      includeIndexes,
      includeMigrations
    });

    const response = await this.callAPI(prompt);
    
    return {
      schema: this.extractSchema(response),
      migrations: includeMigrations ? this.extractMigrations(response) : null,
      indexes: includeIndexes ? this.extractIndexes(response) : null,
      erd: this.extractERD(response),
      optimizationTips: this.extractOptimizationTips(response),
      timestamp: new Date().toISOString()
    };
  }

  async implementIntegration(task) {
    const {
      service,
      integrationType,
      operations,
      authMethod,
      errorHandling = true,
      rateLimiting = true
    } = task;

    this.log(`Implementing integration with: ${service}`);

    // First, check if we need research on the service
    if (task.requiresResearch !== false) {
      const webscraperAgent = await this.coordinator.findAgentForTask('web_scraping');
      if (webscraperAgent) {
        await this.coordinator.sendDirectMessage(webscraperAgent.agentId, 'research:scrape', {
          researchTopics: [`${service} API documentation`, `${service} integration best practices`],
          maxPages: 5
        });
      }
    }

    const prompt = this.buildPrompt({
      type: 'integration_implementation',
      service,
      integrationType,
      operations,
      authMethod,
      errorHandling,
      rateLimiting
    });

    const response = await this.callAPI(prompt);
    
    return {
      service,
      implementation: this.extractCode(response),
      configuration: this.extractConfiguration(response),
      errorHandlers: errorHandling ? this.extractErrorHandlers(response) : null,
      rateLimitConfig: rateLimiting ? this.extractRateLimitConfig(response) : null,
      tests: this.extractIntegrationTests(response),
      documentation: this.extractIntegrationDocs(response),
      timestamp: new Date().toISOString()
    };
  }

  async optimizeBackend(task) {
    const {
      code,
      metrics,
      optimizationGoals = ['performance', 'scalability'],
      constraints
    } = task;

    this.log(`Optimizing backend code for: ${optimizationGoals.join(', ')}`);

    const prompt = this.buildPrompt({
      type: 'backend_optimization',
      code,
      metrics,
      optimizationGoals,
      constraints
    });

    const response = await this.callAPI(prompt);
    
    return {
      optimizedCode: this.extractCode(response),
      improvements: this.extractImprovements(response),
      performanceGains: this.extractPerformanceMetrics(response),
      recommendations: this.extractRecommendations(response),
      timestamp: new Date().toISOString()
    };
  }

  async debugBackendIssue(task) {
    const {
      code,
      error,
      stackTrace,
      context,
      logs
    } = task;

    this.log(`Debugging backend issue: ${error}`);

    const prompt = this.buildPrompt({
      type: 'backend_debugging',
      code,
      error,
      stackTrace,
      context,
      logs
    });

    const response = await this.callAPI(prompt);
    
    return {
      diagnosis: this.extractDiagnosis(response),
      rootCause: this.extractRootCause(response),
      solution: this.extractSolution(response),
      fixedCode: this.extractCode(response),
      preventionTips: this.extractPreventionTips(response),
      timestamp: new Date().toISOString()
    };
  }

  async processGeneralTask(task) {
    const prompt = this.buildPrompt({
      type: 'general',
      task: task.prompt || task.description,
      context: await this.getRelevantContext(task)
    });

    const response = await this.callAPI(prompt);
    
    return {
      response,
      code: this.extractCode(response),
      timestamp: new Date().toISOString()
    };
  }

  buildPrompt(params) {
    const { type, ...data } = params;
    
    const prompts = {
      backend_implementation: `Implement a backend feature with the following requirements:
Feature: ${data.feature}
Requirements: ${JSON.stringify(data.requirements, null, 2)}
Language: ${data.language}
Framework: ${data.framework}
Database: ${data.database}

Please provide:
1. Complete implementation code
2. Database schema changes if needed
3. API endpoints created
4. Required dependencies
5. Brief explanation of the implementation

Focus on clean, maintainable, and scalable code following best practices.`,

      api_design: `Design a ${data.format.toUpperCase()} API with the following specifications:
API Name: ${data.apiName}
Purpose: ${data.purpose}
Endpoints: ${JSON.stringify(data.endpoints, null, 2)}
Authentication: ${data.authentication}

Please provide:
1. Complete API specification
2. Endpoint details with request/response schemas
3. Authentication implementation
4. ${data.includeOpenAPI ? 'OpenAPI 3.0 specification' : 'API documentation'}
5. Example implementation code

Ensure the API follows RESTful principles and industry best practices.`,

      database_design: `Design a database schema for the following entities:
Entities: ${data.entities.join(', ')}
Relationships: ${JSON.stringify(data.relationships, null, 2)}
Database: ${data.database}

Please provide:
1. Complete database schema
2. ${data.includeMigrations ? 'Migration scripts' : 'DDL statements'}
3. ${data.includeIndexes ? 'Optimal indexes for performance' : 'Basic indexes'}
4. Entity relationship diagram (as text/ASCII)
5. Optimization recommendations

Consider normalization, performance, and scalability.`,

      integration_implementation: `Implement integration with ${data.service}:
Integration Type: ${data.integrationType}
Operations: ${JSON.stringify(data.operations, null, 2)}
Authentication: ${data.authMethod}

Please provide:
1. Complete integration code
2. Configuration setup
3. ${data.errorHandling ? 'Comprehensive error handling' : 'Basic error handling'}
4. ${data.rateLimiting ? 'Rate limiting implementation' : 'Basic request handling'}
5. Integration tests
6. Usage documentation

Ensure robust error handling and proper abstraction.`,

      backend_optimization: `Optimize the following backend code:
Current Code:
\`\`\`
${data.code}
\`\`\`

Metrics: ${JSON.stringify(data.metrics, null, 2)}
Optimization Goals: ${data.optimizationGoals.join(', ')}
Constraints: ${JSON.stringify(data.constraints, null, 2)}

Please provide:
1. Optimized code
2. Specific improvements made
3. Expected performance gains
4. Additional recommendations`,

      backend_debugging: `Debug the following backend issue:
Error: ${data.error}
Stack Trace:
${data.stackTrace}

Code:
\`\`\`
${data.code}
\`\`\`

Context: ${data.context}
Logs: ${data.logs}

Please provide:
1. Diagnosis of the issue
2. Root cause analysis
3. Complete solution
4. Fixed code
5. Prevention tips`,

      general: `${data.task}

${data.context ? `Context: ${data.context}` : ''}

Please provide a comprehensive solution focusing on backend development and API design best practices.`
    };

    return prompts[type] || prompts.general;
  }

  async callAPI(prompt) {
    const requestId = Date.now().toString();
    this.activeRequests.add(requestId);

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ez-aigent.com',
          'X-Title': 'Ez Aigent GPT Agent'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: this.config.systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API call failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid API response structure');
      }

      return data.choices[0].message.content;
      
    } catch (error) {
      this.log(`API call failed: ${error.message}`, 'error');
      
      // Check if it's a rate limit error
      if (error.message.includes('rate_limit') || error.message.includes('429')) {
        this.log('Rate limit hit, waiting before retry...', 'warn');
        await new Promise(resolve => setTimeout(resolve, 5000));
        throw new Error('rate_limit_exceeded');
      }
      
      throw error;
      
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  async getRelevantContext(task) {
    // Get relevant context from memory
    const recentTasks = await this.getMemoryFromFile('completed', 5);
    const relatedErrors = await this.getMemoryFromFile('error', 3);
    
    return `Recent tasks: ${recentTasks}\nRelated errors: ${relatedErrors}`;
  }

  // Extraction helper methods
  extractCode(response) {
    const codeBlocks = response.match(/```[\s\S]*?```/g) || [];
    return codeBlocks.map(block => block.replace(/```\w*\n?/g, '')).join('\n\n');
  }

  extractExplanation(response) {
    const lines = response.split('\n');
    const explanationLines = lines.filter(line => 
      !line.startsWith('```') && 
      line.trim().length > 0 &&
      !line.match(/^\d+\./)
    );
    return explanationLines.join('\n');
  }

  extractDependencies(response) {
    const depMatch = response.match(/dependencies?:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    if (depMatch) {
      return depMatch[1].split('\n')
        .map(line => line.trim())
        .filter(line => line.match(/^[-*]\s*\w+/))
        .map(line => line.replace(/^[-*]\s*/, ''));
    }
    return [];
  }

  extractDatabaseChanges(response) {
    const dbSection = response.match(/database\s+changes?:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    return dbSection ? dbSection[1].trim() : null;
  }

  extractAPIEndpoints(response) {
    const endpoints = [];
    const endpointMatches = response.matchAll(/(?:GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-:{}]+)/g);
    for (const match of endpointMatches) {
      endpoints.push({
        method: match[0].split(' ')[0],
        path: match[1]
      });
    }
    return endpoints;
  }

  extractAPISpecification(response) {
    const specSection = response.match(/api\s+specification:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    return specSection ? specSection[1].trim() : response;
  }

  extractEndpointDetails(response) {
    // Extract detailed endpoint information
    const endpointSections = response.match(/endpoint:?\s*\n([\s\S]*?)(?=endpoint:|$)/gi) || [];
    return endpointSections.map(section => section.trim());
  }

  extractAuthDetails(response) {
    const authSection = response.match(/authentication:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    return authSection ? authSection[1].trim() : null;
  }

  extractOpenAPISpec(response) {
    const openAPIMatch = response.match(/openapi:?\s*["']?3\.\d+["']?\s*\n([\s\S]*?)(?=\n\n[A-Z]|$)/i);
    return openAPIMatch ? openAPIMatch[1].trim() : null;
  }

  extractSchema(response) {
    const schemaMatch = response.match(/schema:?\s*\n([\s\S]*?)(?=\n\n|\nmigration)/i);
    return schemaMatch ? schemaMatch[1].trim() : this.extractCode(response);
  }

  extractMigrations(response) {
    const migrationMatch = response.match(/migration:?\s*\n([\s\S]*?)(?=\n\n|\nindex)/i);
    return migrationMatch ? migrationMatch[1].trim() : null;
  }

  extractIndexes(response) {
    const indexMatch = response.match(/index(?:es)?:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    return indexMatch ? indexMatch[1].trim() : null;
  }

  extractERD(response) {
    const erdMatch = response.match(/(?:erd|diagram):?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    return erdMatch ? erdMatch[1].trim() : null;
  }

  extractOptimizationTips(response) {
    const tipsMatch = response.match(/(?:optimization|tips?|recommend\w*):?\s*\n([\s\S]*?)(?=\n\n|$)/i);
    return tipsMatch ? tipsMatch[1].trim() : null;
  }

  extractConfiguration(response) {
    const configMatch = response.match(/configuration:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    return configMatch ? configMatch[1].trim() : null;
  }

  extractErrorHandlers(response) {
    const errorMatch = response.match(/error\s+handl\w*:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    return errorMatch ? errorMatch[1].trim() : null;
  }

  extractRateLimitConfig(response) {
    const rateLimitMatch = response.match(/rate\s+limit\w*:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    return rateLimitMatch ? rateLimitMatch[1].trim() : null;
  }

  extractIntegrationTests(response) {
    const testMatch = response.match(/(?:test|testing):?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    return testMatch ? testMatch[1].trim() : null;
  }

  extractIntegrationDocs(response) {
    const docsMatch = response.match(/(?:documentation|usage):?\s*\n([\s\S]*?)(?=\n\n|$)/i);
    return docsMatch ? docsMatch[1].trim() : null;
  }

  extractImprovements(response) {
    const improvementsMatch = response.match(/improvements?:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    return improvementsMatch ? improvementsMatch[1].trim() : null;
  }

  extractPerformanceMetrics(response) {
    const metricsMatch = response.match(/(?:performance|metrics?):?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    return metricsMatch ? metricsMatch[1].trim() : null;
  }

  extractRecommendations(response) {
    const recsMatch = response.match(/recommendations?:?\s*\n([\s\S]*?)(?=\n\n|$)/i);
    return recsMatch ? recsMatch[1].trim() : null;
  }

  extractDiagnosis(response) {
    const diagnosisMatch = response.match(/diagnosis:?\s*\n([\s\S]*?)(?=\n\n|\nroot)/i);
    return diagnosisMatch ? diagnosisMatch[1].trim() : null;
  }

  extractRootCause(response) {
    const rootCauseMatch = response.match(/root\s+cause:?\s*\n([\s\S]*?)(?=\n\n|\nsolution)/i);
    return rootCauseMatch ? rootCauseMatch[1].trim() : null;
  }

  extractSolution(response) {
    const solutionMatch = response.match(/solution:?\s*\n([\s\S]*?)(?=\n\n|\nfixed)/i);
    return solutionMatch ? solutionMatch[1].trim() : null;
  }

  extractPreventionTips(response) {
    const preventionMatch = response.match(/prevention:?\s*\n([\s\S]*?)(?=\n\n|$)/i);
    return preventionMatch ? preventionMatch[1].trim() : null;
  }

  getQueueName() {
    return 'queue:gpt-4o';
  }
}

// Start agent if run directly
if (require.main === module) {
  const agent = new GPTAgent({
    agentId: process.env.AGENT_ID || `gpt-coordinated-${Date.now()}`,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await agent.cleanup();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await agent.cleanup();
    process.exit(0);
  });
  
  agent.initialize().then(() => {
    agent.start();
  }).catch(error => {
    console.error('Failed to start GPT agent:', error);
    process.exit(1);
  });
}

module.exports = GPTAgent;