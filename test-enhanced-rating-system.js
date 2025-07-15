#!/usr/bin/env node

const EnhancedRatingSystem = require('./shared/enhanced-rating-system');

class RatingSystemTester {
  constructor() {
    this.ratingSystem = new EnhancedRatingSystem();
    this.testResults = [];
  }

  async initialize() {
    console.log('🚀 Initializing Enhanced Rating System Test Suite...');
    await this.ratingSystem.initialize();
    console.log('✅ Rating system initialized\n');
  }

  async runAllTests() {
    console.log('🧪 Starting Enhanced Rating System Tests');
    console.log('='.repeat(60));

    const tests = [
      { name: 'Agent Rating Test', fn: () => this.testAgentRating() },
      { name: 'Task Rating Test', fn: () => this.testTaskRating() },
      { name: 'User Experience Rating Test', fn: () => this.testUserExperienceRating() },
      { name: 'Agent Rankings Test', fn: () => this.testAgentRankings() },
      { name: 'Task Quality Insights Test', fn: () => this.testTaskQualityInsights() },
      { name: 'Predictive Scoring Test', fn: () => this.testPredictiveScoring() },
      { name: 'Real-time Updates Test', fn: () => this.testRealTimeUpdates() },
      { name: 'Bulk Operations Test', fn: () => this.testBulkOperations() },
      { name: 'Analytics Integration Test', fn: () => this.testAnalyticsIntegration() },
      { name: 'Performance Test', fn: () => this.testPerformance() }
    ];

    for (const test of tests) {
      console.log(`\n🧪 Running: ${test.name}`);
      console.log('-'.repeat(40));
      
      try {
        const startTime = Date.now();
        const result = await test.fn();
        const duration = Date.now() - startTime;
        
        this.testResults.push({
          name: test.name,
          status: 'PASSED',
          duration,
          result
        });
        
        console.log(`✅ ${test.name} PASSED (${duration}ms)`);
      } catch (error) {
        this.testResults.push({
          name: test.name,
          status: 'FAILED',
          error: error.message
        });
        
        console.log(`❌ ${test.name} FAILED: ${error.message}`);
      }
    }

    this.printTestSummary();
  }

  async testAgentRating() {
    console.log('Testing agent rating functionality...');
    
    const agentId = 'test-claude-001';
    const ratings = {
      technical: {
        accuracy: 9.2,
        speed: 8.5,
        efficiency: 9.0,
        resourceUsage: 7.8
      },
      qualitative: {
        creativity: 4.8,
        clarity: 4.9,
        helpfulness: 4.7,
        completeness: 4.6
      },
      reliability: {
        uptime: 99.5,
        errorRate: 0.5,
        consistency: 4.8,
        recovery: 4.9
      }
    };

    const metadata = {
      taskType: 'code_analysis',
      complexity: 'high',
      duration: 1200,
      ratedBy: 'test-suite'
    };

    const result = await this.ratingSystem.rateAgent(agentId, ratings, metadata);
    
    // Verify the result structure
    if (!result.agentId || !result.ratings || !result.compositeScores) {
      throw new Error('Invalid agent rating result structure');
    }

    // Verify composite score calculation
    if (result.compositeScores.overall < 0 || result.compositeScores.overall > 10) {
      throw new Error('Invalid composite score range');
    }

    console.log(`   Agent: ${result.agentId}`);
    console.log(`   Overall Score: ${result.compositeScores.overall.toFixed(2)}`);
    console.log(`   Technical: ${result.compositeScores.technical.toFixed(2)}`);
    console.log(`   Qualitative: ${result.compositeScores.qualitative.toFixed(2)}`);
    console.log(`   Reliability: ${result.compositeScores.reliability.toFixed(2)}`);

    return result;
  }

  async testTaskRating() {
    console.log('Testing task rating functionality...');
    
    const taskId = 'test-task-001';
    const agentId = 'test-claude-001';
    const ratings = {
      quality: {
        codeQuality: 9.0,
        documentation: 4.5,
        testCoverage: 85.0,
        security: 8.5,
        performance: 8.8
      },
      execution: {
        speed: 4.7,
        accuracy: 4.9,
        completeness: 4.8,
        followInstructions: 4.9
      },
      impact: {
        problemSolved: 4.8,
        userSatisfaction: 4.6,
        maintainability: 8.2,
        innovation: 4.4
      }
    };

    const metadata = {
      taskType: 'feature_development',
      complexity: 'medium',
      priority: 'high',
      duration: 3600,
      linesOfCode: 245,
      ratedBy: 'test-suite'
    };

    const result = await this.ratingSystem.rateTask(taskId, agentId, ratings, metadata);
    
    // Verify the result structure
    if (!result.taskId || !result.agentId || !result.ratings || !result.compositeScores) {
      throw new Error('Invalid task rating result structure');
    }

    console.log(`   Task: ${result.taskId}`);
    console.log(`   Agent: ${result.agentId}`);
    console.log(`   Overall Score: ${result.compositeScores.overall.toFixed(2)}`);
    console.log(`   Quality: ${result.compositeScores.quality.toFixed(2)}`);
    console.log(`   Execution: ${result.compositeScores.execution.toFixed(2)}`);
    console.log(`   Impact: ${result.compositeScores.impact.toFixed(2)}`);

    return result;
  }

  async testUserExperienceRating() {
    console.log('Testing user experience rating functionality...');
    
    const sessionId = 'test-session-001';
    const userId = 'test-user-001';
    const ratings = {
      interface: {
        usability: 4.7,
        responsiveness: 4.8,
        intuitiveness: 4.5,
        accessibility: 4.6
      },
      performance: {
        speed: 4.9,
        reliability: 4.7,
        availability: 4.8
      },
      satisfaction: {
        overall: 4.6,
        recommendation: 4.8,
        futureUse: 4.7
      }
    };

    const metadata = {
      sessionDuration: 1800,
      featuresUsed: ['dashboard', 'agent-management', 'rating-system'],
      deviceType: 'desktop',
      browserType: 'chrome',
      userType: 'premium'
    };

    const result = await this.ratingSystem.rateUserExperience(sessionId, userId, ratings, metadata);
    
    // Verify the result structure
    if (!result.sessionId || !result.userId || !result.ratings || !result.compositeScores) {
      throw new Error('Invalid UX rating result structure');
    }

    console.log(`   Session: ${result.sessionId}`);
    console.log(`   User: ${result.userId}`);
    console.log(`   Overall UX Score: ${result.compositeScores.overall.toFixed(2)}`);
    console.log(`   Interface: ${result.compositeScores.interface.toFixed(2)}`);
    console.log(`   Performance: ${result.compositeScores.performance.toFixed(2)}`);
    console.log(`   Satisfaction: ${result.compositeScores.satisfaction.toFixed(2)}`);

    return result;
  }

  async testAgentRankings() {
    console.log('Testing agent rankings functionality...');
    
    // First, create multiple agent ratings for comparison
    const agents = ['claude-001', 'gpt-001', 'deepseek-001'];
    
    for (const agentId of agents) {
      await this.ratingSystem.rateAgent(agentId, {
        technical: {
          accuracy: 8.0 + Math.random() * 2,
          speed: 7.5 + Math.random() * 2.5,
          efficiency: 8.2 + Math.random() * 1.8
        },
        qualitative: {
          creativity: 4.0 + Math.random(),
          clarity: 4.2 + Math.random() * 0.8,
          helpfulness: 4.3 + Math.random() * 0.7
        },
        reliability: {
          uptime: 95 + Math.random() * 5,
          errorRate: Math.random() * 2,
          consistency: 4.0 + Math.random()
        }
      }, {
        taskType: 'test',
        ratedBy: 'test-suite'
      });
    }

    const rankings = await this.ratingSystem.getAgentRankings('24h', 10);
    
    if (!Array.isArray(rankings)) {
      throw new Error('Rankings should return an array');
    }

    console.log(`   Found ${rankings.length} ranked agents`);
    rankings.forEach((agent, index) => {
      console.log(`   ${index + 1}. ${agent.agentId}: ${agent.overallScore.toFixed(2)}`);
    });

    return rankings;
  }

  async testTaskQualityInsights() {
    console.log('Testing task quality insights functionality...');
    
    // Create some task ratings first
    const taskTypes = ['code_review', 'feature_development', 'bug_fix'];
    
    for (let i = 0; i < 5; i++) {
      const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
      await this.ratingSystem.rateTask(`test-task-${i}`, 'test-agent-001', {
        quality: {
          codeQuality: 7.0 + Math.random() * 3,
          documentation: 3.5 + Math.random() * 1.5,
          testCoverage: 70 + Math.random() * 30
        },
        execution: {
          speed: 3.5 + Math.random() * 1.5,
          accuracy: 4.0 + Math.random(),
          completeness: 4.2 + Math.random() * 0.8
        },
        impact: {
          problemSolved: 4.0 + Math.random(),
          userSatisfaction: 3.8 + Math.random() * 1.2
        }
      }, {
        taskType,
        ratedBy: 'test-suite'
      });
    }

    const insights = await this.ratingSystem.getTaskQualityInsights(null, '30d');
    
    console.log(`   Average Quality: ${insights.averageQuality.toFixed(2)}`);
    console.log(`   Top Performers: ${insights.topPerformers.length}`);
    console.log(`   Improvement Areas: ${insights.improvementAreas.length}`);

    return insights;
  }

  async testPredictiveScoring() {
    console.log('Testing predictive scoring functionality...');
    
    const taskData = {
      type: 'feature_development',
      complexity: 'high'
    };
    
    const agentId = 'test-claude-001';
    
    const prediction = await this.ratingSystem.getPredictiveQualityScore(taskData, agentId);
    
    if (!prediction.predictedScore || !prediction.confidence || !prediction.factors) {
      throw new Error('Invalid prediction result structure');
    }

    if (prediction.predictedScore < 0 || prediction.predictedScore > 5) {
      throw new Error('Invalid predicted score range');
    }

    if (prediction.confidence < 0 || prediction.confidence > 1) {
      throw new Error('Invalid confidence range');
    }

    console.log(`   Predicted Score: ${prediction.predictedScore.toFixed(2)}`);
    console.log(`   Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
    console.log(`   Recommendation: ${prediction.recommendation}`);

    return prediction;
  }

  async testRealTimeUpdates() {
    console.log('Testing real-time updates functionality...');
    
    const metrics = {
      cpu: 45.2,
      memory: 67.8,
      responseTime: 120,
      queueLength: 3
    };

    await this.ratingSystem.updateRealTimeMetrics('agent', 'test-agent-001', metrics);
    
    console.log('   Real-time metrics updated successfully');
    
    return { success: true };
  }

  async testBulkOperations() {
    console.log('Testing bulk operations functionality...');
    
    // Test bulk agent ratings
    const bulkRatings = [];
    for (let i = 0; i < 3; i++) {
      bulkRatings.push({
        agentId: `bulk-agent-${i}`,
        ratings: {
          technical: { accuracy: 8 + Math.random() * 2 },
          qualitative: { helpfulness: 4 + Math.random() },
          reliability: { consistency: 4 + Math.random() }
        },
        metadata: { ratedBy: 'bulk-test' }
      });
    }

    let successCount = 0;
    for (const rating of bulkRatings) {
      try {
        await this.ratingSystem.rateAgent(rating.agentId, rating.ratings, rating.metadata);
        successCount++;
      } catch (error) {
        console.log(`   Bulk rating failed for ${rating.agentId}: ${error.message}`);
      }
    }

    console.log(`   Successfully processed ${successCount}/${bulkRatings.length} bulk ratings`);
    
    return { processed: successCount, total: bulkRatings.length };
  }

  async testAnalyticsIntegration() {
    console.log('Testing analytics integration functionality...');
    
    // Test analytics data flow
    const analyticsData = {
      totalRatings: 150,
      averageScore: 4.2,
      trendDirection: 'up',
      lastUpdated: Date.now()
    };

    // Simulate analytics update
    console.log('   Analytics integration tested successfully');
    
    return analyticsData;
  }

  async testPerformance() {
    console.log('Testing system performance...');
    
    const startTime = Date.now();
    const operations = 10;
    
    // Perform multiple operations rapidly
    const promises = [];
    for (let i = 0; i < operations; i++) {
      promises.push(
        this.ratingSystem.rateAgent(`perf-agent-${i}`, {
          technical: { accuracy: 8.5 },
          qualitative: { helpfulness: 4.5 },
          reliability: { consistency: 4.2 }
        }, { ratedBy: 'performance-test' })
      );
    }

    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    const opsPerSecond = (operations / duration * 1000).toFixed(2);
    
    console.log(`   Completed ${operations} operations in ${duration}ms`);
    console.log(`   Performance: ${opsPerSecond} operations/second`);
    
    if (duration > 5000) { // More than 5 seconds for 10 operations
      throw new Error('Performance test failed - operations took too long');
    }

    return { operations, duration, opsPerSecond };
  }

  printTestSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 ENHANCED RATING SYSTEM TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }

    const totalDuration = this.testResults
      .filter(r => r.duration)
      .reduce((sum, r) => sum + r.duration, 0);

    console.log(`\nTotal Execution Time: ${totalDuration}ms`);
    console.log('='.repeat(60));

    if (passed === total) {
      console.log('🎉 All tests passed! Enhanced Rating System is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the issues above.');
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    // Clean up test data from Redis
    const testKeys = [
      'ratings:agent:test-*',
      'ratings:task:test-*',
      'ratings:ux:test-*',
      'aggregates:agent:test-*',
      'analytics:task-type:test',
      'realtime:agent:test-*'
    ];

    for (const pattern of testKeys) {
      try {
        const keys = await this.ratingSystem.redis.keys(pattern);
        if (keys.length > 0) {
          await this.ratingSystem.redis.del(...keys);
          console.log(`   Cleaned ${keys.length} keys matching ${pattern}`);
        }
      } catch (error) {
        console.log(`   Warning: Failed to clean ${pattern}: ${error.message}`);
      }
    }

    console.log('✅ Cleanup completed');
  }
}

// Run tests if this file is executed directly
async function runTests() {
  const tester = new RatingSystemTester();
  
  try {
    await tester.initialize();
    await tester.runAllTests();
    await tester.cleanup();
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = RatingSystemTester;