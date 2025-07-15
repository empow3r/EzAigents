#!/usr/bin/env node

/**
 * EzAigents Integration Validation Script
 * Tests all consolidated components and verifies system functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class IntegrationValidator {
  constructor() {
    this.results = {
      docker: { passed: 0, failed: 0, tests: [] },
      apis: { passed: 0, failed: 0, tests: [] },
      agents: { passed: 0, failed: 0, tests: [] },
      dashboard: { passed: 0, failed: 0, tests: [] }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',     // Cyan
      success: '\x1b[32m',  // Green
      error: '\x1b[31m',    // Red
      warning: '\x1b[33m'   // Yellow
    };
    console.log(`${colors[type]}[${timestamp}] ${message}\x1b[0m`);
  }

  async test(category, name, testFn) {
    try {
      this.log(`Testing ${name}...`, 'info');
      await testFn();
      this.results[category].passed++;
      this.results[category].tests.push({ name, status: 'PASS' });
      this.log(`✅ ${name} passed`, 'success');
    } catch (error) {
      this.results[category].failed++;
      this.results[category].tests.push({ name, status: 'FAIL', error: error.message });
      this.log(`❌ ${name} failed: ${error.message}`, 'error');
    }
  }

  fileExists(filePath) {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File does not exist: ${fullPath}`);
    }
    return true;
  }

  directoryExists(dirPath) {
    const fullPath = path.resolve(dirPath);
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
      throw new Error(`Directory does not exist: ${fullPath}`);
    }
    return true;
  }

  async validateDockerIntegration() {
    this.log('=== Docker Integration Validation ===', 'info');

    // Test 1: Main docker-compose.yml exists and is valid
    await this.test('docker', 'Main docker-compose.yml structure', () => {
      this.fileExists('docker-compose.yml');
      const content = fs.readFileSync('docker-compose.yml', 'utf8');
      
      // Check for required services
      const requiredServices = ['redis', 'dashboard', 'claude-agent', 'gpt-agent', 'kimi-agent'];
      for (const service of requiredServices) {
        if (!content.includes(`${service}:`)) {
          throw new Error(`Missing required service: ${service}`);
        }
      }

      // Check for profiles
      if (!content.includes('profiles:')) {
        throw new Error('Docker compose profiles not implemented');
      }
    });

    // Test 2: Unified Dockerfile.agent
    await this.test('docker', 'Unified agent Dockerfile', () => {
      this.fileExists('Dockerfile.agent');
      const content = fs.readFileSync('Dockerfile.agent', 'utf8');
      
      if (!content.includes('ARG AGENT_TYPE')) {
        throw new Error('Agent Dockerfile missing build arguments');
      }
      
      if (!content.includes('node:20')) {
        throw new Error('Agent Dockerfile not using standardized Node version');
      }
    });

    // Test 3: Redundant files removed
    await this.test('docker', 'Redundant Docker files removed', () => {
      const redundantFiles = [
        'docker-compose.simple.yml',
        'docker-compose.minimal.yml',
        'dashboard/docker-compose.yml',
        'agents/claude/Dockerfile',
        'agents/gpt/Dockerfile'
      ];

      for (const file of redundantFiles) {
        if (fs.existsSync(file)) {
          throw new Error(`Redundant file still exists: ${file}`);
        }
      }
    });

    // Test 4: Dashboard Dockerfile variants
    await this.test('docker', 'Dashboard Dockerfile consolidation', () => {
      this.fileExists('dashboard/Dockerfile');
      this.fileExists('dashboard/Dockerfile.dev');
      
      const redundantDashboardFiles = [
        'dashboard/Dockerfile.simple',
        'dashboard/Dockerfile.minimal',
        'dashboard/Dockerfile.fast'
      ];

      for (const file of redundantDashboardFiles) {
        if (fs.existsSync(file)) {
          throw new Error(`Redundant dashboard Dockerfile exists: ${file}`);
        }
      }
    });
  }

  async validateAPIIntegration() {
    this.log('=== API Integration Validation ===', 'info');

    // Test 1: Unified agents API
    await this.test('apis', 'Unified agents API structure', () => {
      this.fileExists('dashboard/pages/api/agents.js');
      const content = fs.readFileSync('dashboard/pages/api/agents.js', 'utf8');
      
      // Check for consolidated functionality
      if (!content.includes('getAgent') || !content.includes('getAgentStats') || !content.includes('controlAgent')) {
        throw new Error('Agents API missing consolidated functions');
      }
    });

    // Test 2: Redundant API files removed
    await this.test('apis', 'Redundant API endpoints removed', () => {
      const redundantAPIs = [
        'dashboard/pages/api/agent-stats.js',
        'dashboard/pages/api/agent-control.js',
        'dashboard/pages/api/redis-status.js',
        'dashboard/pages/api/openrouter-status.js'
      ];

      for (const file of redundantAPIs) {
        if (fs.existsSync(file)) {
          throw new Error(`Redundant API file still exists: ${file}`);
        }
      }
    });

    // Test 3: Queue API consolidation
    await this.test('apis', 'Queue API health integration', () => {
      this.fileExists('dashboard/pages/api/queue-stats.js');
      const content = fs.readFileSync('dashboard/pages/api/queue-stats.js', 'utf8');
      
      if (!content.includes('getQueueHealth')) {
        throw new Error('Queue API missing health functionality');
      }

      if (!content.includes('kimi-2')) {
        throw new Error('Queue API missing Kimi2 integration');
      }
    });

    // Test 4: Health API consolidation
    await this.test('apis', 'Health API service checks', () => {
      this.fileExists('dashboard/pages/api/health.js');
      const content = fs.readFileSync('dashboard/pages/api/health.js', 'utf8');
      
      if (!content.includes('checkRedisHealth') || !content.includes('checkAllServices')) {
        throw new Error('Health API missing comprehensive service checks');
      }
    });
  }

  async validateAgentIntegration() {
    this.log('=== Agent Integration Validation ===', 'info');

    // Test 1: Agent configurations exist
    await this.test('agents', 'Agent configuration files', () => {
      const agentTypes = ['claude', 'gpt', 'deepseek', 'mistral', 'gemini', 'kimi'];
      
      for (const agent of agentTypes) {
        this.fileExists(`agents/${agent}/config.js`);
        const config = require(`./agents/${agent}/config.js`);
        
        if (!config.model || !config.role || !config.capabilities) {
          throw new Error(`Invalid configuration for ${agent} agent`);
        }
      }
    });

    // Test 2: Base agent architecture
    await this.test('agents', 'Base agent inheritance', () => {
      this.fileExists('agents/base-agent.js');
      
      // Check if agents use base class
      const agentFile = fs.readFileSync('agents/claude/index.js', 'utf8');
      if (!agentFile.includes('BaseAgent') || !agentFile.includes('require(\'../base-agent\')')) {
        throw new Error('Claude agent not using BaseAgent class');
      }
    });

    // Test 3: Redundant agent files removed
    await this.test('agents', 'Redundant agent files removed', () => {
      const redundantFiles = [
        'agents/claude/wrapped-index.js',
        'agents/claude/enhanced-index.js',
        'agents/gpt/wrapped-index.js',
        'cli/AgentBase.js',
        'cli/enhanced-agent-runner.js'
      ];

      for (const file of redundantFiles) {
        if (fs.existsSync(file)) {
          throw new Error(`Redundant agent file still exists: ${file}`);
        }
      }
    });

    // Test 4: Kimi2 integration
    await this.test('agents', 'Kimi2 agent integration', () => {
      this.fileExists('agents/kimi/index.js');
      this.fileExists('agents/kimi/config.js');
      
      const config = require('./agents/kimi/config.js');
      if (config.model !== 'kimi-2' || config.tokenLimit !== 1000000) {
        throw new Error('Kimi2 agent configuration incorrect');
      }
    });
  }

  async validateDashboardIntegration() {
    this.log('=== Dashboard Integration Validation ===', 'info');

    // Test 1: UnifiedDashboard component
    await this.test('dashboard', 'UnifiedDashboard component', () => {
      this.fileExists('dashboard/src/components/UnifiedDashboard.jsx');
      const content = fs.readFileSync('dashboard/src/components/UnifiedDashboard.jsx', 'utf8');
      
      if (!content.includes('mode') || !content.includes('features') || !content.includes('executive')) {
        throw new Error('UnifiedDashboard missing required functionality');
      }
    });

    // Test 2: Feature components
    await this.test('dashboard', 'Feature components structure', () => {
      const requiredFeatures = [
        'dashboard/src/components/features/AgentMonitor.jsx',
        'dashboard/src/components/features/QueueStatistics.jsx',
        'dashboard/src/components/features/TaskSubmission.jsx',
        'dashboard/src/components/features/HealthStatus.jsx'
      ];

      for (const component of requiredFeatures) {
        this.fileExists(component);
      }
    });

    // Test 3: Main page integration
    await this.test('dashboard', 'Main page UnifiedDashboard usage', () => {
      this.fileExists('dashboard/app/page.js');
      const content = fs.readFileSync('dashboard/app/page.js', 'utf8');
      
      if (!content.includes('UnifiedDashboard') || !content.includes('dashboardMode')) {
        throw new Error('Main page not using UnifiedDashboard');
      }
    });

    // Test 4: Redundant dashboard files removed
    await this.test('dashboard', 'Redundant dashboard components removed', () => {
      const redundantComponents = [
        'dashboard/src/components/BasicDashboard.jsx',
        'dashboard/src/components/ExecutiveDashboard.jsx',
        'dashboard/src/components/TieredHomeDashboard.jsx',
        'dashboard/src/components/Agent3DGlobe.jsx',
        'dashboard/src/components/Simple3DGlobe.jsx',
        'dashboard/pages/simple.js'
      ];

      for (const component of redundantComponents) {
        if (fs.existsSync(component)) {
          throw new Error(`Redundant dashboard component still exists: ${component}`);
        }
      }
    });

    // Test 5: UI components consolidation
    await this.test('dashboard', 'UI components directory cleanup', () => {
      this.directoryExists('dashboard/src/components/ui');
      
      if (fs.existsSync('dashboard/components/ui')) {
        throw new Error('Duplicate UI components directory still exists');
      }
    });
  }

  generateReport() {
    this.log('=== INTEGRATION VALIDATION REPORT ===', 'info');
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const [category, results] of Object.entries(this.results)) {
      totalPassed += results.passed;
      totalFailed += results.failed;
      
      this.log(`\n${category.toUpperCase()}:`, 'info');
      this.log(`  ✅ Passed: ${results.passed}`, 'success');
      this.log(`  ❌ Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'info');
      
      for (const test of results.tests) {
        const status = test.status === 'PASS' ? '✅' : '❌';
        this.log(`    ${status} ${test.name}`, test.status === 'PASS' ? 'success' : 'error');
        if (test.error) {
          this.log(`      Error: ${test.error}`, 'error');
        }
      }
    }
    
    this.log(`\nOVERALL RESULTS:`, 'info');
    this.log(`✅ Total Passed: ${totalPassed}`, 'success');
    this.log(`❌ Total Failed: ${totalFailed}`, totalFailed > 0 ? 'error' : 'success');
    this.log(`📊 Success Rate: ${Math.round((totalPassed / (totalPassed + totalFailed)) * 100)}%`, 'info');
    
    if (totalFailed === 0) {
      this.log('\n🎉 ALL INTEGRATION TESTS PASSED! 🎉', 'success');
      this.log('The redundancy integration has been successfully completed.', 'success');
    } else {
      this.log(`\n⚠️  ${totalFailed} tests failed. Please review and fix the issues above.`, 'warning');
    }

    return totalFailed === 0;
  }

  async run() {
    this.log('Starting EzAigents Integration Validation...', 'info');
    
    try {
      await this.validateDockerIntegration();
      await this.validateAPIIntegration();
      await this.validateAgentIntegration();
      await this.validateDashboardIntegration();
      
      const success = this.generateReport();
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      this.log(`Critical validation error: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new IntegrationValidator();
  validator.run();
}

module.exports = IntegrationValidator;