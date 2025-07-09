#!/usr/bin/env node

/**
 * Enhancement Validator
 * Validates enhancement implementations and generates quality reports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EnhancementValidator {
  constructor() {
    this.enhancementTasks = this.loadEnhancementTasks();
    this.validationResults = new Map();
  }

  loadEnhancementTasks() {
    try {
      const data = fs.readFileSync(path.join(__dirname, '../shared/enhancement-tasks.json'), 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load enhancement tasks:', error);
      process.exit(1);
    }
  }

  async validateEnhancement(enhancementId) {
    const enhancement = this.enhancementTasks.enhancements[enhancementId];
    if (!enhancement) {
      console.error(`Enhancement ${enhancementId} not found`);
      return;
    }

    console.log(`\n🔍 Validating Enhancement: ${enhancement.title}`);
    console.log('='.repeat(60));

    const results = {
      enhancementId,
      title: enhancement.title,
      totalTasks: enhancement.tasks.length,
      completedTasks: 0,
      passedValidations: 0,
      failedValidations: 0,
      warnings: [],
      errors: [],
      fileChecks: [],
      codeQuality: {},
      testResults: {}
    };

    // Validate each task
    for (const task of enhancement.tasks) {
      const taskResult = await this.validateTask(task, enhancement);
      results.fileChecks.push(taskResult);
      
      if (taskResult.exists) {
        results.completedTasks++;
        if (taskResult.validationPassed) {
          results.passedValidations++;
        } else {
          results.failedValidations++;
        }
      }
    }

    // Run enhancement-specific validations
    await this.runEnhancementSpecificValidations(enhancementId, results);

    // Generate report
    this.generateValidationReport(results);
    
    return results;
  }

  async validateTask(task, enhancement) {
    const filePath = path.join(__dirname, '..', task.file);
    const result = {
      file: task.file,
      agent: task.agent,
      exists: fs.existsSync(filePath),
      validationPassed: false,
      issues: []
    };

    if (!result.exists) {
      result.issues.push('File does not exist');
      return result;
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      result.issues.push('File is empty');
      return result;
    }

    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');

    // Basic validation checks
    const validations = [
      {
        name: 'Has JSDoc comments',
        check: () => content.includes('/**') && content.includes('*/')
      },
      {
        name: 'Has error handling',
        check: () => content.includes('try') && content.includes('catch')
      },
      {
        name: 'Has proper exports',
        check: () => content.includes('module.exports') || content.includes('export')
      },
      {
        name: 'No console.log in production code',
        check: () => !content.includes('console.log') || task.file.includes('test')
      },
      {
        name: 'Has required dependencies imported',
        check: () => this.checkRequiredImports(content, task.file)
      }
    ];

    result.validationPassed = true;
    for (const validation of validations) {
      if (!validation.check()) {
        result.issues.push(`Failed: ${validation.name}`);
        result.validationPassed = false;
      }
    }

    // Check for specific patterns based on file type
    if (task.file.endsWith('.js')) {
      await this.validateJavaScriptFile(filePath, result);
    } else if (task.file.endsWith('.yaml') || task.file.endsWith('.yml')) {
      await this.validateYamlFile(filePath, result);
    }

    return result;
  }

  checkRequiredImports(content, filename) {
    const requiredImports = {
      'queue-manager.js': ['Redis', 'EventEmitter'],
      'telemetry.js': ['opentelemetry'],
      'logger.js': ['winston', 'pino'],
      'auth-service.js': ['jsonwebtoken', 'bcrypt'],
      'vault-client.js': ['node-vault', 'axios']
    };

    const basename = path.basename(filename);
    const required = requiredImports[basename];
    
    if (!required) return true;

    return required.some(imp => 
      content.includes(`require('${imp}')`) || 
      content.includes(`require("${imp}")`) ||
      content.includes(`from '${imp}'`) ||
      content.includes(`from "${imp}"`)
    );
  }

  async validateJavaScriptFile(filePath, result) {
    try {
      // Check syntax with Node.js
      execSync(`node --check ${filePath}`, { stdio: 'pipe' });
    } catch (error) {
      result.issues.push('JavaScript syntax error');
      result.validationPassed = false;
    }

    // Check for ESLint issues (if available)
    try {
      const eslintPath = path.join(__dirname, '../node_modules/.bin/eslint');
      if (fs.existsSync(eslintPath)) {
        execSync(`${eslintPath} ${filePath}`, { stdio: 'pipe' });
      }
    } catch (error) {
      // ESLint errors are warnings, not failures
      result.issues.push('ESLint warnings present');
    }
  }

  async validateYamlFile(filePath, result) {
    try {
      const yaml = require('js-yaml');
      const content = fs.readFileSync(filePath, 'utf-8');
      yaml.load(content);
    } catch (error) {
      result.issues.push('Invalid YAML syntax');
      result.validationPassed = false;
    }
  }

  async runEnhancementSpecificValidations(enhancementId, results) {
    switch (enhancementId) {
      case 'security-layer':
        await this.validateSecurityEnhancement(results);
        break;
      case 'observability-stack':
        await this.validateObservabilityEnhancement(results);
        break;
      case 'distributed-queue-system':
        await this.validateQueueEnhancement(results);
        break;
      // Add more specific validations as needed
    }
  }

  async validateSecurityEnhancement(results) {
    // Check for security best practices
    const securityChecks = [
      {
        name: 'No hardcoded secrets',
        check: () => {
          const files = results.fileChecks.filter(f => f.exists);
          return files.every(f => {
            const content = fs.readFileSync(path.join(__dirname, '..', f.file), 'utf-8');
            return !content.match(/api[_-]?key\s*=\s*["'][^"']+["']/i) &&
                   !content.match(/password\s*=\s*["'][^"']+["']/i);
          });
        }
      },
      {
        name: 'Encryption services implemented',
        check: () => results.fileChecks.some(f => f.file.includes('encryption-service.js') && f.exists)
      },
      {
        name: 'Authentication middleware present',
        check: () => results.fileChecks.some(f => f.file.includes('auth.js') && f.exists)
      }
    ];

    for (const check of securityChecks) {
      if (!check.check()) {
        results.warnings.push(`Security: ${check.name}`);
      }
    }
  }

  async validateObservabilityEnhancement(results) {
    // Check for observability components
    const observabilityChecks = [
      {
        name: 'Metrics collector implemented',
        check: () => results.fileChecks.some(f => f.file.includes('metrics-collector.js') && f.exists)
      },
      {
        name: 'Structured logging implemented',
        check: () => results.fileChecks.some(f => f.file.includes('logger.js') && f.exists)
      },
      {
        name: 'Tracing configured',
        check: () => results.fileChecks.some(f => f.file.includes('telemetry.js') && f.exists)
      }
    ];

    for (const check of observabilityChecks) {
      if (!check.check()) {
        results.warnings.push(`Observability: ${check.name}`);
      }
    }
  }

  async validateQueueEnhancement(results) {
    // Check for queue system components
    const queueChecks = [
      {
        name: 'Queue manager abstraction',
        check: () => results.fileChecks.some(f => f.file.includes('queue-manager.js') && f.exists)
      },
      {
        name: 'Multiple queue adapters',
        check: () => {
          const hasKafka = results.fileChecks.some(f => f.file.includes('kafka-adapter.js') && f.exists);
          const hasRabbit = results.fileChecks.some(f => f.file.includes('rabbitmq-adapter.js') && f.exists);
          return hasKafka || hasRabbit;
        }
      }
    ];

    for (const check of queueChecks) {
      if (!check.check()) {
        results.warnings.push(`Queue System: ${check.name}`);
      }
    }
  }

  generateValidationReport(results) {
    const reportPath = path.join(__dirname, '..', `validation-report-${results.enhancementId}-${Date.now()}.md`);
    
    const report = `# Enhancement Validation Report

## Enhancement: ${results.title}
**ID:** ${results.enhancementId}
**Date:** ${new Date().toISOString()}

## Summary
- **Total Tasks:** ${results.totalTasks}
- **Completed Tasks:** ${results.completedTasks}
- **Passed Validations:** ${results.passedValidations}
- **Failed Validations:** ${results.failedValidations}

## File Validation Results

${results.fileChecks.map(check => `
### ${check.file}
- **Agent:** ${check.agent}
- **Status:** ${check.exists ? '✅ Created' : '❌ Missing'}
- **Validation:** ${check.validationPassed ? '✅ Passed' : '❌ Failed'}
${check.issues.length > 0 ? `- **Issues:**\n${check.issues.map(i => `  - ${i}`).join('\n')}` : ''}
`).join('\n')}

## Warnings
${results.warnings.length > 0 ? results.warnings.map(w => `- ⚠️ ${w}`).join('\n') : 'No warnings'}

## Errors
${results.errors.length > 0 ? results.errors.map(e => `- ❌ ${e}`).join('\n') : 'No errors'}

## Recommendations
${this.generateRecommendations(results)}
`;

    fs.writeFileSync(reportPath, report);
    console.log(`\n✅ Validation report generated: ${reportPath}`);
    
    // Print summary to console
    console.log('\nValidation Summary:');
    console.log(`Total Tasks: ${results.totalTasks}`);
    console.log(`Completed: ${results.completedTasks} (${(results.completedTasks / results.totalTasks * 100).toFixed(1)}%)`);
    console.log(`Passed: ${results.passedValidations}`);
    console.log(`Failed: ${results.failedValidations}`);
    console.log(`Warnings: ${results.warnings.length}`);
  }

  generateRecommendations(results) {
    const recommendations = [];
    
    if (results.completedTasks < results.totalTasks) {
      recommendations.push('- Complete all remaining tasks before proceeding');
    }
    
    if (results.failedValidations > 0) {
      recommendations.push('- Fix validation issues in failed files');
      recommendations.push('- Ensure all files have proper error handling and documentation');
    }
    
    if (results.warnings.length > 0) {
      recommendations.push('- Address warnings to improve enhancement quality');
    }
    
    recommendations.push('- Run integration tests after fixing issues');
    recommendations.push('- Update CLAUDE.md with new features and commands');
    
    return recommendations.join('\n');
  }

  async validateAll() {
    console.log('🔍 Validating All Enhancements\n');
    
    const allResults = [];
    for (const enhancementId of Object.keys(this.enhancementTasks.enhancements)) {
      const results = await this.validateEnhancement(enhancementId);
      allResults.push(results);
      console.log('\n' + '='.repeat(60) + '\n');
    }
    
    // Generate summary report
    this.generateSummaryReport(allResults);
  }

  generateSummaryReport(allResults) {
    const summaryPath = path.join(__dirname, '..', `validation-summary-${Date.now()}.md`);
    
    const totalTasks = allResults.reduce((sum, r) => sum + r.totalTasks, 0);
    const totalCompleted = allResults.reduce((sum, r) => sum + r.completedTasks, 0);
    const totalPassed = allResults.reduce((sum, r) => sum + r.passedValidations, 0);
    
    const summary = `# Enhancement Validation Summary Report

**Date:** ${new Date().toISOString()}

## Overall Progress
- **Total Tasks:** ${totalTasks}
- **Completed:** ${totalCompleted} (${(totalCompleted / totalTasks * 100).toFixed(1)}%)
- **Passed Validation:** ${totalPassed}

## Enhancement Status

${allResults.map(r => `
### ${r.title}
- Progress: ${r.completedTasks}/${r.totalTasks} tasks (${(r.completedTasks / r.totalTasks * 100).toFixed(1)}%)
- Validation: ${r.passedValidations} passed, ${r.failedValidations} failed
- Warnings: ${r.warnings.length}
`).join('\n')}

## Next Steps
1. Address all validation failures
2. Complete missing tasks
3. Run integration tests
4. Deploy enhancements in order of priority
`;

    fs.writeFileSync(summaryPath, summary);
    console.log(`\n✅ Summary report generated: ${summaryPath}`);
  }
}

// CLI interface
async function main() {
  const validator = new EnhancementValidator();
  const command = process.argv[2];
  const enhancementId = process.argv[3];

  switch (command) {
    case 'validate':
      if (enhancementId === 'all') {
        await validator.validateAll();
      } else if (enhancementId) {
        await validator.validateEnhancement(enhancementId);
      } else {
        console.log('Usage: enhancement-validator.js validate <enhancement-id|all>');
      }
      break;
      
    default:
      console.log('Enhancement Validator');
      console.log('\nUsage:');
      console.log('  validate <enhancement-id|all>  - Validate enhancement implementation');
      console.log('\nExamples:');
      console.log('  node enhancement-validator.js validate security-layer');
      console.log('  node enhancement-validator.js validate all');
  }
}

main().catch(console.error);