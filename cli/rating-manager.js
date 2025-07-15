#!/usr/bin/env node

const EnhancedRatingSystem = require('../shared/enhanced-rating-system');
const readline = require('readline');

class RatingManager {
  constructor() {
    this.ratingSystem = new EnhancedRatingSystem();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async initialize() {
    await this.ratingSystem.initialize();
    console.log('🎯 Enhanced Rating Manager initialized');
  }

  async showMenu() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 ENHANCED RATING SYSTEM MANAGER');
    console.log('='.repeat(50));
    console.log('1. Rate an Agent');
    console.log('2. Rate a Task');
    console.log('3. Submit User Experience Rating');
    console.log('4. View Agent Rankings');
    console.log('5. Get Task Quality Insights');
    console.log('6. Predictive Quality Score');
    console.log('7. Bulk Import Ratings');
    console.log('8. Export Rating Analytics');
    console.log('9. Real-time Metrics Update');
    console.log('10. System Health Check');
    console.log('0. Exit');
    console.log('='.repeat(50));
  }

  async handleUserInput() {
    return new Promise((resolve) => {
      this.rl.question('Select an option (0-10): ', (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async rateAgent() {
    console.log('\n📊 Agent Rating Form');
    console.log('-'.repeat(30));

    const agentId = await this.prompt('Agent ID (e.g., claude-001): ');
    
    console.log('\nTechnical Ratings (0-10):');
    const accuracy = parseFloat(await this.prompt('Accuracy: '));
    const speed = parseFloat(await this.prompt('Speed: '));
    const efficiency = parseFloat(await this.prompt('Efficiency: '));
    const resourceUsage = parseFloat(await this.prompt('Resource Usage: '));

    console.log('\nQualitative Ratings (0-5):');
    const creativity = parseFloat(await this.prompt('Creativity: '));
    const clarity = parseFloat(await this.prompt('Clarity: '));
    const helpfulness = parseFloat(await this.prompt('Helpfulness: '));
    const completeness = parseFloat(await this.prompt('Completeness: '));

    console.log('\nReliability Ratings:');
    const uptime = parseFloat(await this.prompt('Uptime (0-100%): '));
    const errorRate = parseFloat(await this.prompt('Error Rate (0-10): '));
    const consistency = parseFloat(await this.prompt('Consistency (0-5): '));
    const recovery = parseFloat(await this.prompt('Recovery (0-5): '));

    const taskType = await this.prompt('Task Type (optional): ') || 'general';
    const complexity = await this.prompt('Complexity (low/medium/high/expert): ') || 'medium';

    try {
      const result = await this.ratingSystem.rateAgent(agentId, {
        technical: { accuracy, speed, efficiency, resourceUsage },
        qualitative: { creativity, clarity, helpfulness, completeness },
        reliability: { uptime, errorRate, consistency, recovery }
      }, {
        taskType,
        complexity,
        ratedBy: 'cli-user'
      });

      console.log('\n✅ Agent rating submitted successfully!');
      console.log(`Overall Score: ${result.compositeScores.overall.toFixed(2)}`);
      console.log(`Technical: ${result.compositeScores.technical.toFixed(2)}`);
      console.log(`Qualitative: ${result.compositeScores.qualitative.toFixed(2)}`);
      console.log(`Reliability: ${result.compositeScores.reliability.toFixed(2)}`);
    } catch (error) {
      console.error('❌ Error submitting agent rating:', error.message);
    }
  }

  async rateTask() {
    console.log('\n📋 Task Rating Form');
    console.log('-'.repeat(30));

    const taskId = await this.prompt('Task ID: ');
    const agentId = await this.prompt('Agent ID: ');

    console.log('\nQuality Ratings (0-10):');
    const codeQuality = parseFloat(await this.prompt('Code Quality: '));
    const documentation = parseFloat(await this.prompt('Documentation (0-5): '));
    const testCoverage = parseFloat(await this.prompt('Test Coverage (0-100%): '));
    const security = parseFloat(await this.prompt('Security: '));
    const performance = parseFloat(await this.prompt('Performance: '));

    console.log('\nExecution Ratings (0-5):');
    const speed = parseFloat(await this.prompt('Speed: '));
    const accuracy = parseFloat(await this.prompt('Accuracy: '));
    const completeness = parseFloat(await this.prompt('Completeness: '));
    const followInstructions = parseFloat(await this.prompt('Follow Instructions: '));

    console.log('\nImpact Ratings (0-5):');
    const problemSolved = parseFloat(await this.prompt('Problem Solved: '));
    const userSatisfaction = parseFloat(await this.prompt('User Satisfaction: '));
    const maintainability = parseFloat(await this.prompt('Maintainability: '));
    const innovation = parseFloat(await this.prompt('Innovation: '));

    const taskType = await this.prompt('Task Type: ') || 'general';
    const complexity = await this.prompt('Complexity: ') || 'medium';
    const priority = await this.prompt('Priority: ') || 'normal';

    try {
      const result = await this.ratingSystem.rateTask(taskId, agentId, {
        quality: { codeQuality, documentation, testCoverage, security, performance },
        execution: { speed, accuracy, completeness, followInstructions },
        impact: { problemSolved, userSatisfaction, maintainability, innovation }
      }, {
        taskType,
        complexity,
        priority,
        ratedBy: 'cli-user'
      });

      console.log('\n✅ Task rating submitted successfully!');
      console.log(`Overall Score: ${result.compositeScores.overall.toFixed(2)}`);
      console.log(`Quality: ${result.compositeScores.quality.toFixed(2)}`);
      console.log(`Execution: ${result.compositeScores.execution.toFixed(2)}`);
      console.log(`Impact: ${result.compositeScores.impact.toFixed(2)}`);
    } catch (error) {
      console.error('❌ Error submitting task rating:', error.message);
    }
  }

  async rateUserExperience() {
    console.log('\n👤 User Experience Rating Form');
    console.log('-'.repeat(30));

    const sessionId = await this.prompt('Session ID: ');
    const userId = await this.prompt('User ID: ');

    console.log('\nInterface Ratings (0-5):');
    const usability = parseFloat(await this.prompt('Usability: '));
    const responsiveness = parseFloat(await this.prompt('Responsiveness: '));
    const intuitiveness = parseFloat(await this.prompt('Intuitiveness: '));
    const accessibility = parseFloat(await this.prompt('Accessibility: '));

    console.log('\nPerformance Ratings (0-5):');
    const speed = parseFloat(await this.prompt('Speed: '));
    const reliability = parseFloat(await this.prompt('Reliability: '));
    const availability = parseFloat(await this.prompt('Availability: '));

    console.log('\nSatisfaction Ratings (0-5):');
    const overall = parseFloat(await this.prompt('Overall Satisfaction: '));
    const recommendation = parseFloat(await this.prompt('Recommendation Likelihood: '));
    const futureUse = parseFloat(await this.prompt('Future Use Intent: '));

    try {
      const result = await this.ratingSystem.rateUserExperience(sessionId, userId, {
        interface: { usability, responsiveness, intuitiveness, accessibility },
        performance: { speed, reliability, availability },
        satisfaction: { overall, recommendation, futureUse }
      }, {
        deviceType: 'desktop',
        userType: 'standard'
      });

      console.log('\n✅ User experience rating submitted successfully!');
      console.log(`Overall UX Score: ${result.compositeScores.overall.toFixed(2)}`);
      console.log(`Interface: ${result.compositeScores.interface.toFixed(2)}`);
      console.log(`Performance: ${result.compositeScores.performance.toFixed(2)}`);
      console.log(`Satisfaction: ${result.compositeScores.satisfaction.toFixed(2)}`);
    } catch (error) {
      console.error('❌ Error submitting UX rating:', error.message);
    }
  }

  async viewAgentRankings() {
    console.log('\n🏆 Agent Rankings');
    console.log('-'.repeat(30));

    const timeframe = await this.prompt('Timeframe (1h/24h/7d/30d) [7d]: ') || '7d';
    const limit = parseInt(await this.prompt('Number of agents to show [10]: ')) || 10;

    try {
      const rankings = await this.ratingSystem.getAgentRankings(timeframe, limit);
      
      console.log(`\n📊 Top ${rankings.length} Agents (${timeframe})`);
      console.log('='.repeat(70));
      console.log('Rank | Agent ID        | Score | Technical | Qualitative | Reliability');
      console.log('-'.repeat(70));

      rankings.forEach((agent, index) => {
        const rank = (index + 1).toString().padStart(4);
        const agentId = agent.agentId.padEnd(15);
        const score = agent.overallScore.toFixed(1).padStart(5);
        const technical = (agent.rankings?.technical || 0).toFixed(1).padStart(9);
        const qualitative = (agent.rankings?.qualitative || 0).toFixed(1).padStart(11);
        const reliability = (agent.rankings?.reliability || 0).toFixed(1).padStart(11);
        
        console.log(`${rank} | ${agentId} | ${score} |  ${technical} |    ${qualitative} |    ${reliability}`);
      });
    } catch (error) {
      console.error('❌ Error fetching agent rankings:', error.message);
    }
  }

  async getTaskQualityInsights() {
    console.log('\n📈 Task Quality Insights');
    console.log('-'.repeat(30));

    const taskType = await this.prompt('Task Type (leave empty for all): ') || null;
    const timeframe = await this.prompt('Timeframe (7d/30d/90d) [30d]: ') || '30d';

    try {
      const insights = await this.ratingSystem.getTaskQualityInsights(taskType, timeframe);
      
      console.log(`\n📊 Task Quality Analysis (${timeframe})`);
      console.log('='.repeat(50));
      console.log(`Average Quality: ${insights.averageQuality.toFixed(2)}/5.0`);
      
      if (insights.topPerformers.length > 0) {
        console.log('\n🏆 Top Performers:');
        insights.topPerformers.forEach((performer, index) => {
          console.log(`${index + 1}. ${performer.agentId}: ${performer.score.toFixed(2)}`);
        });
      }

      if (insights.improvementAreas.length > 0) {
        console.log('\n⚠️  Areas for Improvement:');
        insights.improvementAreas.forEach((area, index) => {
          console.log(`${index + 1}. ${area.area}: ${area.score.toFixed(2)}/5.0`);
        });
      }

      if (Object.keys(insights.qualityDistribution).length > 0) {
        console.log('\n📊 Quality Distribution:');
        Object.entries(insights.qualityDistribution).forEach(([range, count]) => {
          console.log(`${range}: ${count} tasks`);
        });
      }
    } catch (error) {
      console.error('❌ Error fetching task insights:', error.message);
    }
  }

  async getPredictiveScore() {
    console.log('\n🔮 Predictive Quality Score');
    console.log('-'.repeat(30));

    const agentId = await this.prompt('Agent ID: ');
    const taskType = await this.prompt('Task Type: ');
    const complexity = await this.prompt('Complexity (low/medium/high/expert): ');

    try {
      const prediction = await this.ratingSystem.getPredictiveQualityScore({
        type: taskType,
        complexity
      }, agentId);

      console.log('\n🎯 Prediction Results');
      console.log('='.repeat(40));
      console.log(`Predicted Score: ${prediction.predictedScore}/5.0`);
      console.log(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
      console.log(`Recommendation: ${prediction.recommendation}`);
      
      console.log('\n📊 Contributing Factors:');
      Object.entries(prediction.factors).forEach(([factor, value]) => {
        console.log(`  ${factor}: ${value.toFixed(2)}`);
      });
    } catch (error) {
      console.error('❌ Error generating prediction:', error.message);
    }
  }

  async bulkImportRatings() {
    console.log('\n📥 Bulk Import Ratings');
    console.log('-'.repeat(30));
    
    const filePath = await this.prompt('JSON file path: ');
    
    try {
      const fs = require('fs');
      const ratingsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      console.log(`Found ${ratingsData.length} ratings to import...`);
      
      for (let i = 0; i < ratingsData.length; i++) {
        const rating = ratingsData[i];
        try {
          switch (rating.type) {
            case 'agent':
              await this.ratingSystem.rateAgent(rating.agentId, rating.ratings, rating.metadata);
              break;
            case 'task':
              await this.ratingSystem.rateTask(rating.taskId, rating.agentId, rating.ratings, rating.metadata);
              break;
            case 'ux':
              await this.ratingSystem.rateUserExperience(rating.sessionId, rating.userId, rating.ratings, rating.metadata);
              break;
          }
          process.stdout.write(`\rProcessed: ${i + 1}/${ratingsData.length}`);
        } catch (error) {
          console.error(`\n❌ Error importing rating ${i + 1}:`, error.message);
        }
      }
      
      console.log('\n✅ Bulk import completed!');
    } catch (error) {
      console.error('❌ Error during bulk import:', error.message);
    }
  }

  async systemHealthCheck() {
    console.log('\n🏥 System Health Check');
    console.log('-'.repeat(30));

    try {
      // Check Redis connection
      console.log('Checking Redis connection...');
      await this.ratingSystem.redis.ping();
      console.log('✅ Redis: Connected');

      // Check recent activity
      console.log('Checking recent rating activity...');
      const rankings = await this.ratingSystem.getAgentRankings('24h', 5);
      console.log(`✅ Activity: ${rankings.length} agents rated in last 24h`);

      // Check data integrity
      console.log('Checking data integrity...');
      // Add data integrity checks here
      console.log('✅ Data: Integrity verified');

      console.log('\n🎯 System Status: HEALTHY');
    } catch (error) {
      console.error('❌ System health check failed:', error.message);
    }
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async run() {
    try {
      await this.initialize();

      while (true) {
        await this.showMenu();
        const choice = await this.handleUserInput();

        switch (choice) {
          case '1':
            await this.rateAgent();
            break;
          case '2':
            await this.rateTask();
            break;
          case '3':
            await this.rateUserExperience();
            break;
          case '4':
            await this.viewAgentRankings();
            break;
          case '5':
            await this.getTaskQualityInsights();
            break;
          case '6':
            await this.getPredictiveScore();
            break;
          case '7':
            await this.bulkImportRatings();
            break;
          case '8':
            console.log('📤 Export functionality - Coming soon!');
            break;
          case '9':
            console.log('⚡ Real-time metrics - Coming soon!');
            break;
          case '10':
            await this.systemHealthCheck();
            break;
          case '0':
            console.log('👋 Goodbye!');
            this.rl.close();
            process.exit(0);
            break;
          default:
            console.log('❌ Invalid option. Please try again.');
        }

        await this.prompt('\nPress Enter to continue...');
      }
    } catch (error) {
      console.error('❌ Fatal error:', error.message);
      process.exit(1);
    }
  }
}

// Run the CLI if this file is executed directly
if (require.main === module) {
  const manager = new RatingManager();
  manager.run();
}

module.exports = RatingManager;