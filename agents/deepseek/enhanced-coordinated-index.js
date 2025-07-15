const EnhancedBaseAgent = require('../../shared/enhanced-base-agent');
const config = require('./config');

/**
 * DeepSeek Agent with Universal Coordination
 * Specialized for testing, validation, and high-volume processing
 */
class DeepSeekAgent extends EnhancedBaseAgent {
  constructor(agentConfig = {}) {
    super({
      agentType: 'deepseek',
      agentId: agentConfig.agentId || process.env.AGENT_ID || `deepseek-${Date.now()}`,
      model: config.model,
      role: config.role,
      capabilities: config.capabilities,
      systemPrompt: `You are DeepSeek Coder, ${config.specialization}.

Your expertise includes:
- Comprehensive unit and integration testing
- Test-driven development (TDD)
- Performance and load testing
- Security testing and vulnerability assessment
- Code review and quality assurance
- Bug detection and fixing
- Test automation frameworks
- Continuous integration/deployment testing

You excel at processing high-volume tasks efficiently and collaborate with other Ez Aigent agents to ensure code quality.`,
      maxRetries: config.maxRetries || 5,
      retryDelay: 1000,
      memoryLimit: 150, // MB
      ...agentConfig
    });
    
    // DeepSeek-specific configuration
    this.apiKeys = this.loadAPIKeys();
    this.currentKeyIndex = 0;
    
    if (this.apiKeys.length === 0) {
      throw new Error('DEEPSEEK_API_KEYS environment variable is required (comma-separated for multiple keys)');
    }
    
    this.apiEndpoint = config.apiEndpoint;
    this.tokenLimit = config.tokenLimit;
    this.maxLoad = config.maxLoad;
    
    // Track test results and metrics
    this.testMetrics = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      coverage: {}
    };
  }

  loadAPIKeys() {
    const keysString = process.env.DEEPSEEK_API_KEYS || process.env.DEEPSEEK_API_KEY || '';
    return keysString.split(',').map(key => key.trim()).filter(key => key);
  }

  getNextAPIKey() {
    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  async initializeAgent() {
    this.log('Initializing DeepSeek agent with coordination system...');
    
    // Register DeepSeek-specific message handlers
    this.coordinator.registerMessageHandler('test:request', async (data, sender) => {
      this.log(`Received test request from ${sender}`);
      const result = await this.runTests(data);
      await this.coordinator.sendDirectMessage(sender, 'test:result', result);
    });
    
    this.coordinator.registerMessageHandler('validate:code', async (data, sender) => {
      this.log(`Received validation request from ${sender}`);
      const result = await this.validateCode(data);
      await this.coordinator.sendDirectMessage(sender, 'validation:result', result);
    });
    
    this.coordinator.registerMessageHandler('review:code', async (data, sender) => {
      this.log(`Received code review request from ${sender}`);
      const result = await this.reviewCode(data);
      await this.coordinator.sendDirectMessage(sender, 'review:result', result);
    });
    
    this.coordinator.registerMessageHandler('fix:bugs', async (data, sender) => {
      this.log(`Received bug fix request from ${sender}`);
      const result = await this.fixBugs(data);
      await this.coordinator.sendDirectMessage(sender, 'fix:result', result);
    });
    
    this.log('DeepSeek agent initialization completed');
  }

  async executeTask(task) {
    this.log(`Executing DeepSeek task: ${task.type || 'testing'}`);
    
    try {
      let result;
      
      switch (task.type) {
        case 'testing':
        case 'test_backend_code':
        case 'test':
          result = await this.runTests(task);
          break;
          
        case 'validation':
        case 'validate':
          result = await this.validateCode(task);
          break;
          
        case 'code_review':
        case 'review':
          result = await this.reviewCode(task);
          break;
          
        case 'bug_fixing':
        case 'fix_bugs':
          result = await this.fixBugs(task);
          break;
          
        case 'performance_test':
          result = await this.runPerformanceTests(task);
          break;
          
        case 'security_test':
          result = await this.runSecurityTests(task);
          break;
          
        case 'integration_test':
          result = await this.runIntegrationTests(task);
          break;
          
        default:
          result = await this.processGeneralTask(task);
      }
      
      // Update test metrics
      this.updateTestMetrics(result);
      
      // Save result to memory
      await this.saveToMemory({
        type: 'deepseek_task_completed',
        task: task,
        result: result,
        metrics: this.testMetrics,
        timestamp: new Date().toISOString()
      }, 'completed');
      
      return result;
      
    } catch (error) {
      this.log(`DeepSeek task execution failed: ${error.message}`, 'error');
      
      await this.saveToMemory({
        type: 'deepseek_task_error',
        task: task,
        error: error.message,
        timestamp: new Date().toISOString()
      }, 'error');
      
      throw error;
    }
  }

  async checkCollaborationNeeded(task) {
    const collaborationScenarios = [
      // Need GPT to generate code for testing
      task.requiresCodeGeneration === true,
      
      // Need Claude for architecture analysis before testing
      task.requiresArchitectureAnalysis === true,
      
      // Need Mistral for test documentation
      task.generateTestDocs === true,
      
      // Complex testing requiring multiple perspectives
      task.testType === 'comprehensive' || task.complexity === 'high'
    ];
    
    return collaborationScenarios.some(scenario => scenario);
  }

  getRequiredCapabilities(task) {
    const capabilities = [];
    
    if (task.requiresCodeGeneration) {
      capabilities.push('backend', 'api');
    }
    
    if (task.requiresArchitectureAnalysis) {
      capabilities.push('architecture', 'code_analysis');
    }
    
    if (task.generateTestDocs) {
      capabilities.push('documentation');
    }
    
    return capabilities;
  }

  createSubtask(task, collaborator) {
    const subtask = { ...task, delegatedBy: this.config.agentId };
    
    if (collaborator.capabilities.includes('backend')) {
      subtask.type = 'generate_test_fixtures';
      subtask.testRequirements = task.testRequirements;
      subtask.prompt = 'Generate test fixtures and mock data for testing';
    }
    
    if (collaborator.capabilities.includes('architecture')) {
      subtask.type = 'analyze_for_testing';
      subtask.code = task.code;
      subtask.prompt = 'Analyze code architecture to identify critical paths for testing';
    }
    
    if (collaborator.capabilities.includes('documentation')) {
      subtask.type = 'document_tests';
      subtask.tests = task.result?.tests;
      subtask.coverage = task.result?.coverage;
    }
    
    return subtask;
  }

  async runTests(task) {
    const {
      code,
      testType = 'unit_and_integration',
      framework = 'jest',
      coverage = true,
      feature
    } = task;

    this.log(`Running ${testType} tests for: ${feature || 'provided code'}`);

    const prompt = this.buildPrompt({
      type: 'run_tests',
      code,
      testType,
      framework,
      coverage,
      feature
    });

    const response = await this.callAPI(prompt);
    
    const result = {
      testType,
      tests: this.extractTests(response),
      testResults: this.extractTestResults(response),
      coverage: coverage ? this.extractCoverage(response) : null,
      issues: this.extractIssues(response),
      suggestions: this.extractSuggestions(response),
      framework,
      timestamp: new Date().toISOString()
    };

    // If critical issues found, collaborate with GPT for fixes
    if (result.issues && result.issues.critical && !task.skipCollaboration) {
      const gptAgent = await this.coordinator.findAgentForTask('backend');
      if (gptAgent) {
        await this.coordinator.sendDirectMessage(gptAgent.agentId, 'backend:implement', {
          type: 'fix_critical_issues',
          issues: result.issues.critical,
          originalCode: code,
          testResults: result.testResults
        });
        result.fixesRequested = true;
      }
    }

    return result;
  }

  async validateCode(task) {
    const {
      code,
      validationType = 'comprehensive',
      standards = ['eslint', 'best-practices'],
      autoFix = false
    } = task;

    this.log(`Validating code with: ${standards.join(', ')}`);

    const prompt = this.buildPrompt({
      type: 'validate_code',
      code,
      validationType,
      standards,
      autoFix
    });

    const response = await this.callAPI(prompt);
    
    return {
      validationType,
      standards,
      issues: this.extractValidationIssues(response),
      fixedCode: autoFix ? this.extractCode(response) : null,
      recommendations: this.extractRecommendations(response),
      score: this.extractQualityScore(response),
      timestamp: new Date().toISOString()
    };
  }

  async reviewCode(task) {
    const {
      code,
      previousCode,
      reviewType = 'comprehensive',
      focusAreas = ['security', 'performance', 'maintainability']
    } = task;

    this.log(`Reviewing code with focus on: ${focusAreas.join(', ')}`);

    const prompt = this.buildPrompt({
      type: 'code_review',
      code,
      previousCode,
      reviewType,
      focusAreas
    });

    const response = await this.callAPI(prompt);
    
    return {
      reviewType,
      findings: this.extractReviewFindings(response),
      improvements: this.extractImprovements(response),
      securityIssues: this.extractSecurityIssues(response),
      performanceIssues: this.extractPerformanceIssues(response),
      bestPractices: this.extractBestPractices(response),
      overallAssessment: this.extractAssessment(response),
      timestamp: new Date().toISOString()
    };
  }

  async fixBugs(task) {
    const {
      code,
      bugs,
      errorLogs,
      stackTraces,
      testFailures
    } = task;

    this.log(`Fixing ${bugs?.length || 'detected'} bugs`);

    const prompt = this.buildPrompt({
      type: 'bug_fixing',
      code,
      bugs,
      errorLogs,
      stackTraces,
      testFailures
    });

    const response = await this.callAPI(prompt);
    
    return {
      fixedCode: this.extractCode(response),
      bugAnalysis: this.extractBugAnalysis(response),
      fixesApplied: this.extractFixesApplied(response),
      preventionTips: this.extractPreventionTips(response),
      testsToAdd: this.extractSuggestedTests(response),
      timestamp: new Date().toISOString()
    };
  }

  async runPerformanceTests(task) {
    const {
      code,
      endpoints,
      loadProfile = 'standard',
      duration = 60,
      concurrentUsers = 100
    } = task;

    this.log(`Running performance tests: ${loadProfile} profile`);

    const prompt = this.buildPrompt({
      type: 'performance_test',
      code,
      endpoints,
      loadProfile,
      duration,
      concurrentUsers
    });

    const response = await this.callAPI(prompt);
    
    return {
      loadProfile,
      metrics: this.extractPerformanceMetrics(response),
      bottlenecks: this.extractBottlenecks(response),
      recommendations: this.extractPerformanceRecommendations(response),
      testScript: this.extractTestScript(response),
      timestamp: new Date().toISOString()
    };
  }

  async runSecurityTests(task) {
    const {
      code,
      endpoints,
      authMethods,
      securityChecks = ['injection', 'xss', 'csrf', 'auth']
    } = task;

    this.log(`Running security tests for: ${securityChecks.join(', ')}`);

    const prompt = this.buildPrompt({
      type: 'security_test',
      code,
      endpoints,
      authMethods,
      securityChecks
    });

    const response = await this.callAPI(prompt);
    
    return {
      securityChecks,
      vulnerabilities: this.extractVulnerabilities(response),
      recommendations: this.extractSecurityRecommendations(response),
      patches: this.extractSecurityPatches(response),
      securityScore: this.extractSecurityScore(response),
      timestamp: new Date().toISOString()
    };
  }

  async runIntegrationTests(task) {
    const {
      services,
      endpoints,
      scenarios,
      environment = 'test'
    } = task;

    this.log(`Running integration tests for ${services.length} services`);

    const prompt = this.buildPrompt({
      type: 'integration_test',
      services,
      endpoints,
      scenarios,
      environment
    });

    const response = await this.callAPI(prompt);
    
    return {
      services,
      testResults: this.extractIntegrationResults(response),
      failurePoints: this.extractFailurePoints(response),
      dependencies: this.extractDependencyIssues(response),
      recommendations: this.extractIntegrationRecommendations(response),
      timestamp: new Date().toISOString()
    };
  }

  async processGeneralTask(task) {
    const prompt = this.buildPrompt({
      type: 'general',
      task: task.prompt || task.description
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
      run_tests: `Write comprehensive ${data.testType} tests for the following code:
${data.feature ? `Feature: ${data.feature}` : ''}
Framework: ${data.framework}
${data.coverage ? 'Include coverage analysis' : ''}

Code to test:
\`\`\`
${data.code}
\`\`\`

Please provide:
1. Complete test suite
2. Test results and coverage
3. Identified issues
4. Improvement suggestions
5. Edge cases to consider`,

      validate_code: `Validate the following code against ${data.standards.join(', ')} standards:
Validation Type: ${data.validationType}
${data.autoFix ? 'Auto-fix issues where possible' : 'Report issues only'}

Code:
\`\`\`
${data.code}
\`\`\`

Please provide:
1. Validation issues by severity
2. ${data.autoFix ? 'Fixed code' : 'Fix recommendations'}
3. Code quality score
4. Best practice recommendations`,

      code_review: `Perform a ${data.reviewType} code review focusing on: ${data.focusAreas.join(', ')}

${data.previousCode ? `Previous version:
\`\`\`
${data.previousCode}
\`\`\`` : ''}

Current code:
\`\`\`
${data.code}
\`\`\`

Please provide:
1. Review findings by category
2. Security vulnerabilities
3. Performance issues
4. Maintainability concerns
5. Best practice violations
6. Overall assessment`,

      bug_fixing: `Fix the following bugs in the code:
${data.bugs ? `Reported bugs: ${JSON.stringify(data.bugs, null, 2)}` : ''}
${data.errorLogs ? `Error logs: ${data.errorLogs}` : ''}
${data.stackTraces ? `Stack traces: ${data.stackTraces}` : ''}
${data.testFailures ? `Test failures: ${JSON.stringify(data.testFailures, null, 2)}` : ''}

Code:
\`\`\`
${data.code}
\`\`\`

Please provide:
1. Fixed code
2. Root cause analysis
3. Fixes applied
4. Prevention recommendations
5. Tests to prevent regression`,

      performance_test: `Design and run performance tests:
Load Profile: ${data.loadProfile}
Duration: ${data.duration} seconds
Concurrent Users: ${data.concurrentUsers}

Code/Endpoints:
\`\`\`
${data.code || JSON.stringify(data.endpoints, null, 2)}
\`\`\`

Please provide:
1. Performance test script
2. Expected metrics (response time, throughput, etc.)
3. Bottleneck analysis
4. Optimization recommendations`,

      security_test: `Perform security testing for: ${data.securityChecks.join(', ')}
${data.authMethods ? `Authentication methods: ${data.authMethods}` : ''}

Code/Endpoints:
\`\`\`
${data.code || JSON.stringify(data.endpoints, null, 2)}
\`\`\`

Please provide:
1. Security vulnerabilities found
2. Severity assessment
3. Exploitation scenarios
4. Security patches
5. Security hardening recommendations`,

      integration_test: `Design integration tests for the following services:
Services: ${data.services.join(', ')}
Environment: ${data.environment}
${data.scenarios ? `Test scenarios: ${JSON.stringify(data.scenarios, null, 2)}` : ''}

Endpoints:
\`\`\`
${JSON.stringify(data.endpoints, null, 2)}
\`\`\`

Please provide:
1. Integration test suite
2. Service interaction validation
3. Failure point identification
4. Dependency analysis
5. Resilience recommendations`,

      general: `${data.task}

Focus on testing, validation, and quality assurance aspects.`
    };

    return prompts[type] || prompts.general;
  }

  async callAPI(prompt, retryCount = 0) {
    const apiKey = this.getNextAPIKey();

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: this.config.systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4000,
          temperature: 0.3 // Lower temperature for more consistent test generation
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
      this.log(`API call failed with key ${this.currentKeyIndex}: ${error.message}`, 'error');
      
      // Retry with next key if rate limited
      if ((error.message.includes('rate_limit') || error.message.includes('429')) && retryCount < this.apiKeys.length) {
        this.log(`Rate limit hit, trying next API key...`, 'warn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.callAPI(prompt, retryCount + 1);
      }
      
      throw error;
    }
  }

  updateTestMetrics(result) {
    if (result.testResults) {
      const { passed = 0, failed = 0, total = 0 } = result.testResults;
      this.testMetrics.totalTests += total;
      this.testMetrics.passedTests += passed;
      this.testMetrics.failedTests += failed;
    }
    
    if (result.coverage) {
      this.testMetrics.coverage = {
        ...this.testMetrics.coverage,
        ...result.coverage
      };
    }
  }

  // Extraction helper methods
  extractTests(response) {
    const codeBlocks = response.match(/```[\s\S]*?```/g) || [];
    const testCode = codeBlocks
      .map(block => block.replace(/```\w*\n?/g, ''))
      .filter(code => code.includes('test(') || code.includes('it(') || code.includes('describe('))
      .join('\n\n');
    return testCode || null;
  }

  extractTestResults(response) {
    const resultsMatch = response.match(/test results?:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    if (resultsMatch) {
      const resultsText = resultsMatch[1];
      const passed = parseInt(resultsText.match(/passed:?\s*(\d+)/i)?.[1] || 0);
      const failed = parseInt(resultsText.match(/failed:?\s*(\d+)/i)?.[1] || 0);
      const total = passed + failed;
      return { passed, failed, total };
    }
    return null;
  }

  extractCoverage(response) {
    const coverageMatch = response.match(/coverage:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    if (coverageMatch) {
      const coverageText = coverageMatch[1];
      return {
        statements: parseFloat(coverageText.match(/statements?:?\s*([\d.]+)%/i)?.[1] || 0),
        branches: parseFloat(coverageText.match(/branches?:?\s*([\d.]+)%/i)?.[1] || 0),
        functions: parseFloat(coverageText.match(/functions?:?\s*([\d.]+)%/i)?.[1] || 0),
        lines: parseFloat(coverageText.match(/lines?:?\s*([\d.]+)%/i)?.[1] || 0)
      };
    }
    return null;
  }

  extractIssues(response) {
    const issuesMatch = response.match(/issues?:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    if (issuesMatch) {
      const issuesText = issuesMatch[1];
      const critical = issuesText.match(/critical:?\s*\n([\s\S]*?)(?=\n\w+:|\n\n|$)/i)?.[1]?.trim();
      const warnings = issuesText.match(/warnings?:?\s*\n([\s\S]*?)(?=\n\w+:|\n\n|$)/i)?.[1]?.trim();
      return { critical, warnings };
    }
    return null;
  }

  extractSuggestions(response) {
    const suggestionsMatch = response.match(/suggestions?:?\s*\n([\s\S]*?)(?=\n\n|$)/i);
    return suggestionsMatch ? suggestionsMatch[1].trim() : null;
  }

  extractValidationIssues(response) {
    const issuesSection = response.match(/validation issues?:?\s*\n([\s\S]*?)(?=\n\n|\nfixed|$)/i);
    return issuesSection ? issuesSection[1].trim() : null;
  }

  extractQualityScore(response) {
    const scoreMatch = response.match(/quality score:?\s*([\d.]+)(?:\/100)?/i);
    return scoreMatch ? parseFloat(scoreMatch[1]) : null;
  }

  extractReviewFindings(response) {
    const findingsMatch = response.match(/findings?:?\s*\n([\s\S]*?)(?=\n\n|\nsecurity|$)/i);
    return findingsMatch ? findingsMatch[1].trim() : null;
  }

  extractSecurityIssues(response) {
    const securityMatch = response.match(/security (?:issues?|vulnerabilities?):?\s*\n([\s\S]*?)(?=\n\n|\nperformance|$)/i);
    return securityMatch ? securityMatch[1].trim() : null;
  }

  extractPerformanceIssues(response) {
    const perfMatch = response.match(/performance issues?:?\s*\n([\s\S]*?)(?=\n\n|\nbest|$)/i);
    return perfMatch ? perfMatch[1].trim() : null;
  }

  extractBestPractices(response) {
    const practicesMatch = response.match(/best practices?:?\s*\n([\s\S]*?)(?=\n\n|\nassessment|$)/i);
    return practicesMatch ? practicesMatch[1].trim() : null;
  }

  extractAssessment(response) {
    const assessmentMatch = response.match(/(?:overall )?assessment:?\s*\n([\s\S]*?)(?=\n\n|$)/i);
    return assessmentMatch ? assessmentMatch[1].trim() : null;
  }

  extractBugAnalysis(response) {
    const analysisMatch = response.match(/(?:bug |root cause )?analysis:?\s*\n([\s\S]*?)(?=\n\n|\nfixes|$)/i);
    return analysisMatch ? analysisMatch[1].trim() : null;
  }

  extractFixesApplied(response) {
    const fixesMatch = response.match(/fixes applied:?\s*\n([\s\S]*?)(?=\n\n|\nprevention|$)/i);
    return fixesMatch ? fixesMatch[1].trim() : null;
  }

  extractSuggestedTests(response) {
    const testsMatch = response.match(/(?:suggested |recommended )?tests?:?\s*\n([\s\S]*?)(?=\n\n|$)/i);
    return testsMatch ? testsMatch[1].trim() : null;
  }

  extractBottlenecks(response) {
    const bottlenecksMatch = response.match(/bottlenecks?:?\s*\n([\s\S]*?)(?=\n\n|\nrecommend|$)/i);
    return bottlenecksMatch ? bottlenecksMatch[1].trim() : null;
  }

  extractTestScript(response) {
    const scriptMatch = response.match(/test script:?\s*\n```[\s\S]*?```/i);
    return scriptMatch ? scriptMatch[0].replace(/test script:?\s*\n/i, '').replace(/```\w*\n?/g, '') : null;
  }

  extractVulnerabilities(response) {
    const vulnMatch = response.match(/vulnerabilities?:?\s*\n([\s\S]*?)(?=\n\n|\nrecommend|$)/i);
    return vulnMatch ? vulnMatch[1].trim() : null;
  }

  extractSecurityPatches(response) {
    const patchesMatch = response.match(/(?:security )?patches?:?\s*\n([\s\S]*?)(?=\n\n|\nscore|$)/i);
    return patchesMatch ? patchesMatch[1].trim() : null;
  }

  extractSecurityScore(response) {
    const scoreMatch = response.match(/security score:?\s*([\d.]+)(?:\/10)?/i);
    return scoreMatch ? parseFloat(scoreMatch[1]) : null;
  }

  extractIntegrationResults(response) {
    const resultsMatch = response.match(/(?:integration |test )?results?:?\s*\n([\s\S]*?)(?=\n\n|\nfailure|$)/i);
    return resultsMatch ? resultsMatch[1].trim() : null;
  }

  extractFailurePoints(response) {
    const failuresMatch = response.match(/failure points?:?\s*\n([\s\S]*?)(?=\n\n|\ndepend|$)/i);
    return failuresMatch ? failuresMatch[1].trim() : null;
  }

  extractDependencyIssues(response) {
    const depsMatch = response.match(/dependency (?:issues?|problems?):?\s*\n([\s\S]*?)(?=\n\n|\nrecommend|$)/i);
    return depsMatch ? depsMatch[1].trim() : null;
  }

  extractCode(response) {
    const codeBlocks = response.match(/```[\s\S]*?```/g) || [];
    return codeBlocks.map(block => block.replace(/```\w*\n?/g, '')).join('\n\n');
  }

  extractRecommendations(response) {
    const recsMatch = response.match(/recommendations?:?\s*\n([\s\S]*?)(?=\n\n|$)/i);
    return recsMatch ? recsMatch[1].trim() : null;
  }

  extractImprovements(response) {
    const improvementsMatch = response.match(/improvements?:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z])/i);
    return improvementsMatch ? improvementsMatch[1].trim() : null;
  }

  extractPerformanceMetrics(response) {
    const metricsMatch = response.match(/(?:performance )?metrics?:?\s*\n([\s\S]*?)(?=\n\n|\nbottle|$)/i);
    return metricsMatch ? metricsMatch[1].trim() : null;
  }

  extractPerformanceRecommendations(response) {
    const perfRecsMatch = response.match(/(?:performance |optimization )?recommendations?:?\s*\n([\s\S]*?)(?=\n\n|$)/i);
    return perfRecsMatch ? perfRecsMatch[1].trim() : null;
  }

  extractSecurityRecommendations(response) {
    const secRecsMatch = response.match(/(?:security )?recommendations?:?\s*\n([\s\S]*?)(?=\n\n|$)/i);
    return secRecsMatch ? secRecsMatch[1].trim() : null;
  }

  extractIntegrationRecommendations(response) {
    const intRecsMatch = response.match(/(?:integration )?recommendations?:?\s*\n([\s\S]*?)(?=\n\n|$)/i);
    return intRecsMatch ? intRecsMatch[1].trim() : null;
  }

  extractPreventionTips(response) {
    const preventionMatch = response.match(/prevention (?:tips?|recommendations?):?\s*\n([\s\S]*?)(?=\n\n|$)/i);
    return preventionMatch ? preventionMatch[1].trim() : null;
  }

  getQueueName() {
    return 'queue:deepseek-coder';
  }
}

// Start agent if run directly
if (require.main === module) {
  const agent = new DeepSeekAgent({
    agentId: process.env.AGENT_ID || `deepseek-coordinated-${Date.now()}`,
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
    console.error('Failed to start DeepSeek agent:', error);
    process.exit(1);
  });
}

module.exports = DeepSeekAgent;