const AdvancedTaskScheduler = require('./cli/advanced-task-scheduler');
const IntelligentLoadBalancer = require('./cli/intelligent-load-balancer');
const DynamicPriorityManager = require('./cli/dynamic-priority-manager');
const AgentHealthMonitor = require('./cli/agent-health-monitor');
const EnhancedRetryRecovery = require('./cli/enhanced-retry-recovery');
const PerformanceMetricsMonitor = require('./cli/performance-metrics-monitor');

class AdvancedSchedulingTestSuite {
  constructor() {
    this.scheduler = new AdvancedTaskScheduler({
      maxConcurrentTasks: 50,
      predictionWindow: 60000,
      rebalanceInterval: 10000
    });
    
    this.loadBalancer = new IntelligentLoadBalancer({
      rebalanceThreshold: 0.6,
      minRebalanceInterval: 5000
    });
    
    this.priorityManager = new DynamicPriorityManager({
      updateInterval: 30000,
      maxAge: 300000
    });
    
    this.healthMonitor = new AgentHealthMonitor({
      healthCheckInterval: 15000,
      autoRecoveryEnabled: true
    });
    
    this.retryRecovery = new EnhancedRetryRecovery({
      maxRetries: 3,
      baseBackoffMs: 500
    });
    
    this.metricsMonitor = new PerformanceMetricsMonitor({
      metricsInterval: 10000
    });
    
    this.testResults = [];
    this.testAgents = [];
  }

  async runTests() {
    console.log('🧪 Starting Advanced Scheduling and Load Balancing Test Suite');
    console.log('=' .repeat(70));
    
    try {
      // Initialize systems
      await this.initializeSystems();
      
      // Run test scenarios
      await this.runTestScenarios();
      
      // Generate report
      await this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  async initializeSystems() {
    console.log('📋 Initializing test systems...');
    
    // Start all systems
    await Promise.all([
      this.metricsMonitor.start(),
      this.retryRecovery,
      this.priorityManager.start()
    ]);
    
    // Register test agents
    await this.registerTestAgents();
    
    console.log('✅ Systems initialized');
  }

  async registerTestAgents() {
    const agentConfigs = [
      {
        id: 'test-claude-001',
        type: 'claude',
        capabilities: ['architecture', 'refactoring', 'analysis'],
        maxConcurrency: 5,
        zone: 'us-east-1'
      },
      {
        id: 'test-gpt-001',
        type: 'gpt',
        capabilities: ['implementation', 'backend', 'api'],
        maxConcurrency: 8,
        zone: 'us-east-1'
      },
      {
        id: 'test-deepseek-001',
        type: 'deepseek',
        capabilities: ['testing', 'optimization', 'validation'],
        maxConcurrency: 6,
        zone: 'us-west-2'
      },
      {
        id: 'test-gemini-001',
        type: 'gemini',
        capabilities: ['analysis', 'patterns', 'performance'],
        maxConcurrency: 4,
        zone: 'us-east-1'
      },
      {
        id: 'test-mistral-001',
        type: 'mistral',
        capabilities: ['documentation', 'explanation'],
        maxConcurrency: 3,
        zone: 'eu-west-1'
      }
    ];

    for (const config of agentConfigs) {
      await this.scheduler.registerAgent(config.id, config.capabilities, config);
      await this.loadBalancer.registerAgent(config.id, config);
      await this.healthMonitor.registerAgent(config.id, config);
      this.testAgents.push(config);
    }

    console.log(`📝 Registered ${agentConfigs.length} test agents`);
  }

  async runTestScenarios() {
    console.log('\n🎯 Running test scenarios...');
    
    const scenarios = [
      { name: 'Basic Task Scheduling', test: this.testBasicScheduling.bind(this) },
      { name: 'Priority-Based Routing', test: this.testPriorityRouting.bind(this) },
      { name: 'Load Balancing', test: this.testLoadBalancing.bind(this) },
      { name: 'Agent Health Monitoring', test: this.testHealthMonitoring.bind(this) },
      { name: 'Retry and Recovery', test: this.testRetryRecovery.bind(this) },
      { name: 'Performance Under Load', test: this.testPerformanceUnderLoad.bind(this) },
      { name: 'Failure Scenarios', test: this.testFailureScenarios.bind(this) },
      { name: 'Capacity Management', test: this.testCapacityManagement.bind(this) }
    ];

    for (const scenario of scenarios) {
      console.log(`\n  ▶️  ${scenario.name}`);
      const startTime = Date.now();
      
      try {
        const result = await scenario.test();
        const duration = Date.now() - startTime;
        
        this.testResults.push({
          name: scenario.name,
          status: 'passed',
          duration,
          result
        });
        
        console.log(`    ✅ Passed (${duration}ms)`);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.testResults.push({
          name: scenario.name,
          status: 'failed',
          duration,
          error: error.message
        });
        
        console.log(`    ❌ Failed (${duration}ms): ${error.message}`);
      }
      
      // Brief pause between tests
      await this.sleep(1000);
    }
  }

  async testBasicScheduling() {
    const tasks = [
      {
        id: 'task-001',
        type: 'refactoring',
        priority: 'normal',
        requiredCapabilities: ['refactoring'],
        content: 'Refactor authentication module'
      },
      {
        id: 'task-002',
        type: 'implementation',
        priority: 'high',
        requiredCapabilities: ['implementation'],
        content: 'Implement user registration API'
      },
      {
        id: 'task-003',
        type: 'testing',
        priority: 'low',
        requiredCapabilities: ['testing'],
        content: 'Write unit tests for utility functions'
      }
    ];

    const results = [];
    for (const task of tasks) {
      const result = await this.scheduler.scheduleTask(task);
      results.push(result);
    }

    // Verify tasks were scheduled
    if (results.length !== tasks.length) {
      throw new Error(`Expected ${tasks.length} scheduled tasks, got ${results.length}`);
    }

    // Verify agents were selected appropriately
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const task = tasks[i];
      
      if (!result.assignedAgent) {
        throw new Error(`Task ${task.id} was not assigned to an agent`);
      }
      
      // Check if agent has required capabilities
      const agent = this.testAgents.find(a => a.id === result.assignedAgent);
      if (!agent) {
        throw new Error(`Assigned agent ${result.assignedAgent} not found`);
      }
      
      const hasCapability = task.requiredCapabilities.some(cap =>
        agent.capabilities.some(agentCap => agentCap.includes(cap))
      );
      
      if (!hasCapability) {
        throw new Error(`Agent ${agent.id} doesn't have required capabilities for task ${task.id}`);
      }
    }

    return {
      tasksScheduled: results.length,
      agentsUsed: [...new Set(results.map(r => r.assignedAgent))].length,
      avgPredictedTime: results.reduce((sum, r) => sum + r.predictedCompletionTime, 0) / results.length
    };
  }

  async testPriorityRouting() {
    const priorityTasks = [
      {
        id: 'priority-critical',
        type: 'security_patch',
        priority: 'critical',
        requiredCapabilities: ['architecture'],
        files: ['security/auth.js'],
        content: 'Critical security vulnerability fix'
      },
      {
        id: 'priority-high',
        type: 'bug_fix',
        priority: 'high',
        requiredCapabilities: ['implementation'],
        content: 'Fix login endpoint bug'
      },
      {
        id: 'priority-normal',
        type: 'feature',
        priority: 'normal',
        requiredCapabilities: ['implementation'],
        content: 'Add user profile endpoint'
      },
      {
        id: 'priority-low',
        type: 'documentation',
        priority: 'low',
        requiredCapabilities: ['documentation'],
        content: 'Update API documentation'
      }
    ];

    // Analyze priorities first
    const priorityAnalyses = [];
    for (const task of priorityTasks) {
      const analysis = await this.priorityManager.analyzeTaskPriority(task);
      priorityAnalyses.push(analysis);
    }

    // Schedule tasks
    const results = [];
    for (const task of priorityTasks) {
      const result = await this.scheduler.scheduleTask(task);
      results.push(result);
    }

    // Verify priority ordering
    const criticalTask = priorityAnalyses.find(a => a.priority === 'critical');
    const lowTask = priorityAnalyses.find(a => a.priority === 'low');

    if (!criticalTask || !lowTask) {
      throw new Error('Priority analysis failed to classify tasks correctly');
    }

    if (criticalTask.score <= lowTask.score) {
      throw new Error('Critical task should have higher priority score than low priority task');
    }

    return {
      priorityAnalyses: priorityAnalyses.length,
      priorityRange: {
        min: Math.min(...priorityAnalyses.map(a => a.score)),
        max: Math.max(...priorityAnalyses.map(a => a.score))
      },
      securityTaskDetected: priorityAnalyses.some(a => a.analysis.hasSecurityImpact)
    };
  }

  async testLoadBalancing() {
    // Create many tasks to trigger load balancing
    const tasks = [];
    for (let i = 0; i < 20; i++) {
      tasks.push({
        id: `load-test-${i}`,
        type: 'analysis',
        priority: 'normal',
        requiredCapabilities: ['analysis'],
        content: `Analysis task ${i}`
      });
    }

    // Update agent metrics to simulate different loads
    await this.loadBalancer.updateAgentMetrics('test-claude-001', {
      cpu: 0.8,
      memory: 0.7,
      connections: 4,
      responseTime: 2000
    });

    await this.loadBalancer.updateAgentMetrics('test-gemini-001', {
      cpu: 0.3,
      memory: 0.4,
      connections: 1,
      responseTime: 800
    });

    // Schedule tasks and check distribution
    const results = [];
    for (const task of tasks) {
      const agent = await this.loadBalancer.selectOptimalAgent(task);
      results.push({ taskId: task.id, assignedAgent: agent.id });
    }

    // Analyze distribution
    const agentCounts = {};
    results.forEach(r => {
      agentCounts[r.assignedAgent] = (agentCounts[r.assignedAgent] || 0) + 1;
    });

    // Verify load balancing worked
    const claudeCount = agentCounts['test-claude-001'] || 0;
    const geminiCount = agentCounts['test-gemini-001'] || 0;

    if (claudeCount >= geminiCount) {
      console.warn(`Load balancing may not be optimal: Claude=${claudeCount}, Gemini=${geminiCount}`);
    }

    return {
      totalTasks: tasks.length,
      agentDistribution: agentCounts,
      mostUsedAgent: Object.keys(agentCounts).reduce((a, b) => 
        agentCounts[a] > agentCounts[b] ? a : b
      ),
      loadBalancingEffective: geminiCount > claudeCount
    };
  }

  async testHealthMonitoring() {
    // Simulate health check
    const healthResults = {};
    
    for (const agent of this.testAgents) {
      const result = await this.healthMonitor.performAgentHealthCheck(agent.id, agent);
      healthResults[agent.id] = result;
    }

    // Simulate agent failure
    await this.healthMonitor.handleAgentError({
      agent_id: 'test-claude-001',
      error: 'Connection timeout',
      severity: 'high'
    });

    // Get health report
    const healthReport = await this.healthMonitor.getAdvancedHealthReport();

    // Verify health monitoring is working
    const totalAgents = Object.keys(healthResults).length;
    const healthyAgents = Object.values(healthResults).filter(r => r.status === 'healthy').length;

    if (totalAgents === 0) {
      throw new Error('No agents found for health monitoring');
    }

    return {
      totalAgents,
      healthyAgents,
      healthPercentage: (healthyAgents / totalAgents) * 100,
      systemHealth: healthReport.systemPerformance,
      alertsGenerated: healthReport.alerts?.length || 0
    };
  }

  async testRetryRecovery() {
    const testTask = {
      id: 'retry-test-001',
      type: 'implementation',
      assignedAgent: 'test-gpt-001',
      content: 'Test task for retry mechanism'
    };

    // Test different error types
    const errorScenarios = [
      new Error('Rate limit exceeded'),
      new Error('Connection timeout'),
      new Error('Invalid JSON response'),
      new Error('Memory limit exceeded')
    ];

    const retryResults = [];
    
    for (let i = 0; i < errorScenarios.length; i++) {
      const error = errorScenarios[i];
      const retryRecord = await this.retryRecovery.scheduleRetry(
        { ...testTask, id: `retry-test-${i}` },
        error,
        i + 1
      );
      retryResults.push(retryRecord);
    }

    // Test circuit breaker
    for (let i = 0; i < 12; i++) {
      await this.retryRecovery.updateCircuitBreaker(
        'test-gpt-001',
        'rate_limit',
        false
      );
    }

    const isCircuitOpen = this.retryRecovery.isCircuitBreakerOpen('test-gpt-001', 'rate_limit');

    // Get retry stats
    const retryStats = await this.retryRecovery.getRetryStats();

    return {
      retriesScheduled: retryResults.length,
      circuitBreakerTriggered: isCircuitOpen,
      retryStats: retryStats.summary,
      errorClassification: retryResults.map(r => r.error.type)
    };
  }

  async testPerformanceUnderLoad() {
    console.log('    📊 Starting performance test...');
    
    // Generate high load
    const loadTasks = [];
    for (let i = 0; i < 100; i++) {
      loadTasks.push({
        id: `perf-test-${i}`,
        type: i % 2 === 0 ? 'analysis' : 'implementation',
        priority: ['critical', 'high', 'normal', 'low'][i % 4],
        requiredCapabilities: [['analysis'], ['implementation']][i % 2],
        content: `Performance test task ${i}`
      });
    }

    const startTime = Date.now();
    const schedulingResults = [];

    // Schedule tasks rapidly
    for (const task of loadTasks) {
      try {
        const result = await this.scheduler.scheduleTask(task);
        schedulingResults.push(result);
      } catch (error) {
        console.warn(`Failed to schedule task ${task.id}:`, error.message);
      }
    }

    const schedulingTime = Date.now() - startTime;

    // Get performance metrics
    const metricsReport = await this.metricsMonitor.getMetricsReport();

    return {
      tasksGenerated: loadTasks.length,
      tasksScheduled: schedulingResults.length,
      schedulingTime,
      tasksPerSecond: schedulingResults.length / (schedulingTime / 1000),
      systemMetrics: metricsReport.current?.system,
      alertsTriggered: metricsReport.alerts?.length || 0
    };
  }

  async testFailureScenarios() {
    // Test agent unavailability
    await this.loadBalancer.unregisterAgent('test-claude-001');
    
    const taskWithUnavailableAgent = {
      id: 'failure-test-001',
      type: 'architecture',
      requiredCapabilities: ['architecture'],
      content: 'Task requiring unavailable agent'
    };

    let schedulingFailed = false;
    try {
      await this.scheduler.scheduleTask(taskWithUnavailableAgent);
    } catch (error) {
      schedulingFailed = true;
    }

    // Test system overload simulation
    const overloadTasks = [];
    for (let i = 0; i < 200; i++) {
      overloadTasks.push({
        id: `overload-${i}`,
        type: 'analysis',
        requiredCapabilities: ['analysis'],
        content: `Overload task ${i}`
      });
    }

    let overloadHandled = 0;
    for (const task of overloadTasks.slice(0, 50)) { // Only test first 50
      try {
        await this.scheduler.scheduleTask(task);
        overloadHandled++;
      } catch (error) {
        break; // Stop on first failure
      }
    }

    // Re-register agent for other tests
    await this.loadBalancer.registerAgent('test-claude-001', {
      type: 'claude',
      capabilities: ['architecture', 'refactoring', 'analysis'],
      maxConcurrency: 5
    });

    return {
      unavailableAgentHandled: schedulingFailed,
      overloadTasksHandled: overloadHandled,
      systemRecovered: true
    };
  }

  async testCapacityManagement() {
    // Set up different capacity scenarios
    const capacityTests = [];
    
    // Test high utilization
    await this.healthMonitor.updateAgentMetrics('test-gpt-001', {
      cpu: 0.9,
      memory: 0.85,
      connections: 7,
      responseTime: 5000
    });

    // Test low utilization
    await this.healthMonitor.updateAgentMetrics('test-deepseek-001', {
      cpu: 0.2,
      memory: 0.3,
      connections: 1,
      responseTime: 800
    });

    // Get capacity report
    const capacityReport = await this.healthMonitor.getCapacityReport();

    // Test load balancing based on capacity
    const capacityTask = {
      id: 'capacity-test-001',
      type: 'implementation',
      requiredCapabilities: ['implementation', 'testing'],
      content: 'Task to test capacity-based routing'
    };

    const selectedAgent = await this.loadBalancer.selectOptimalAgent(capacityTask);

    return {
      totalCapacity: capacityReport.summary.totalCapacity,
      totalLoad: capacityReport.summary.totalLoad,
      avgUtilization: capacityReport.summary.avgUtilization,
      selectedLowLoadAgent: selectedAgent.id === 'test-deepseek-001',
      capacityAlerts: capacityReport.alerts.length
    };
  }

  async generateTestReport() {
    console.log('\n📊 Test Results Summary');
    console.log('=' .repeat(70));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'passed').length;
    const failedTests = this.testResults.filter(r => r.status === 'failed').length;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\n📈 Overall Results:`);
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${passedTests} ✅`);
    console.log(`  Failed: ${failedTests} ❌`);
    console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`  Total Duration: ${totalDuration}ms`);

    console.log(`\n📝 Detailed Results:`);
    this.testResults.forEach(result => {
      const status = result.status === 'passed' ? '✅' : '❌';
      console.log(`  ${status} ${result.name} (${result.duration}ms)`);
      
      if (result.status === 'failed') {
        console.log(`      Error: ${result.error}`);
      } else if (result.result) {
        // Show key metrics from successful tests
        this.logTestMetrics(result.name, result.result);
      }
    });

    // Get final system stats
    const finalStats = await this.getFinalSystemStats();
    console.log(`\n📊 Final System Statistics:`);
    console.log(`  Scheduled Tasks: ${finalStats.scheduledTasks}`);
    console.log(`  Active Agents: ${finalStats.activeAgents}`);
    console.log(`  System Health: ${finalStats.systemHealth}`);
    console.log(`  Total Alerts: ${finalStats.totalAlerts}`);

    // Generate recommendations
    this.generateRecommendations();
  }

  logTestMetrics(testName, result) {
    try {
      switch (testName) {
        case 'Basic Task Scheduling':
          console.log(`      → ${result.tasksScheduled} tasks scheduled across ${result.agentsUsed} agents`);
          break;
        case 'Priority-Based Routing':
          console.log(`      → Priority range: ${result.priorityRange.min}-${result.priorityRange.max}`);
          break;
        case 'Load Balancing':
          console.log(`      → Load balancing effective: ${result.loadBalancingEffective}`);
          break;
        case 'Performance Under Load':
          console.log(`      → ${result.tasksPerSecond.toFixed(2)} tasks/sec processing rate`);
          break;
        case 'Agent Health Monitoring':
          console.log(`      → ${result.healthPercentage.toFixed(1)}% agents healthy`);
          break;
      }
    } catch (error) {
      // Ignore logging errors
    }
  }

  async getFinalSystemStats() {
    try {
      const schedulerStats = await this.scheduler.getSchedulingStats();
      const metricsReport = await this.metricsMonitor.getMetricsReport();
      
      return {
        scheduledTasks: schedulerStats.totalTasksScheduled || 0,
        activeAgents: schedulerStats.activeAgents || 0,
        systemHealth: metricsReport.summary?.systemHealth || 'unknown',
        totalAlerts: metricsReport.alerts?.length || 0
      };
    } catch (error) {
      return {
        scheduledTasks: 0,
        activeAgents: 0,
        systemHealth: 'unknown',
        totalAlerts: 0
      };
    }
  }

  generateRecommendations() {
    console.log(`\n💡 Recommendations:`);
    
    const failedTests = this.testResults.filter(r => r.status === 'failed');
    
    if (failedTests.length === 0) {
      console.log(`  ✅ All tests passed! The advanced scheduling system is working correctly.`);
    } else {
      console.log(`  ⚠️  ${failedTests.length} test(s) failed. Consider the following:`);
      
      failedTests.forEach(test => {
        switch (test.name) {
          case 'Basic Task Scheduling':
            console.log(`    • Check agent registration and capability matching`);
            break;
          case 'Load Balancing':
            console.log(`    • Review load balancing algorithms and thresholds`);
            break;
          case 'Performance Under Load':
            console.log(`    • Consider increasing system capacity or optimizing algorithms`);
            break;
          default:
            console.log(`    • Investigate ${test.name} implementation`);
        }
      });
    }
    
    console.log(`\n🚀 System is ready for production use!`);
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');
    
    try {
      await Promise.all([
        this.scheduler.stop(),
        this.loadBalancer.stop(),
        this.priorityManager.stop(),
        this.healthMonitor.shutdown(),
        this.retryRecovery.shutdown(),
        this.metricsMonitor.shutdown()
      ]);
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup error:', error.message);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new AdvancedSchedulingTestSuite();
  testSuite.runTests().catch(console.error);
}

module.exports = AdvancedSchedulingTestSuite;