#!/usr/bin/env node

/**
 * Enhancement Security Scanner
 * Performs automated security analysis and vulnerability detection
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class EnhancementSecurityScanner {
  constructor() {
    this.securityRules = {
      // Code patterns that indicate security issues
      vulnerabilityPatterns: [
        {
          pattern: /eval\s*\(/gi,
          severity: 'critical',
          description: 'Use of eval() function - potential code injection',
          cwe: 'CWE-95'
        },
        {
          pattern: /document\.write\s*\(/gi,
          severity: 'high',
          description: 'Use of document.write() - potential XSS vulnerability',
          cwe: 'CWE-79'
        },
        {
          pattern: /innerHTML\s*=/gi,
          severity: 'medium',
          description: 'Direct innerHTML assignment - potential XSS risk',
          cwe: 'CWE-79'
        },
        {
          pattern: /password\s*=\s*['"]\w+['"]/gi,
          severity: 'critical',
          description: 'Hardcoded password detected',
          cwe: 'CWE-798'
        },
        {
          pattern: /api[_-]?key\s*=\s*['"]\w+['"]/gi,
          severity: 'critical',
          description: 'Hardcoded API key detected',
          cwe: 'CWE-798'
        },
        {
          pattern: /secret\s*=\s*['"]\w+['"]/gi,
          severity: 'high',
          description: 'Hardcoded secret detected',
          cwe: 'CWE-798'
        },
        {
          pattern: /process\.env\.\w+\s*\|\|\s*['"]\w+['"]/gi,
          severity: 'medium',
          description: 'Fallback to hardcoded value for environment variable',
          cwe: 'CWE-798'
        },
        {
          pattern: /sql\s*=\s*['""].*\+.*['"]/gi,
          severity: 'high',
          description: 'Potential SQL injection vulnerability',
          cwe: 'CWE-89'
        },
        {
          pattern: /exec\s*\(\s*[^)]*\+/gi,
          severity: 'critical',
          description: 'Command injection vulnerability',
          cwe: 'CWE-78'
        },
        {
          pattern: /Math\.random\(\)/gi,
          severity: 'low',
          description: 'Use of Math.random() for potentially security-critical randomness',
          cwe: 'CWE-330'
        }
      ],
      
      // Dependency vulnerabilities (simplified check)
      knownVulnerablePackages: [
        { name: 'lodash', versions: ['<4.17.12'], severity: 'high' },
        { name: 'moment', versions: ['<2.29.0'], severity: 'medium' },
        { name: 'axios', versions: ['<0.21.1'], severity: 'medium' },
        { name: 'express', versions: ['<4.17.1'], severity: 'medium' }
      ],
      
      // File permission checks
      dangerousPermissions: [
        { pattern: /chmod\s+777/gi, description: 'Overly permissive file permissions' },
        { pattern: /umask\s+000/gi, description: 'Dangerous umask setting' }
      ],
      
      // Configuration security checks
      configurationIssues: [
        {
          pattern: /debug\s*[:=]\s*true/gi,
          severity: 'medium',
          description: 'Debug mode enabled in configuration'
        },
        {
          pattern: /ssl\s*[:=]\s*false/gi,
          severity: 'high',
          description: 'SSL/TLS disabled in configuration'
        },
        {
          pattern: /verify\s*[:=]\s*false/gi,
          severity: 'medium',
          description: 'Certificate verification disabled'
        }
      ]
    };
    
    this.scanResults = {};
    this.securityMetrics = {
      totalFiles: 0,
      vulnerableFiles: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0
    };
  }

  async scanEnhancementFiles() {
    console.log('🔍 Starting security scan of enhancement files...');
    
    const enhancementDirs = [
      'cli',
      'agents',
      'dashboard/src',
      'shared',
      'scripts'
    ];
    
    this.scanResults = {};
    this.securityMetrics = {
      totalFiles: 0,
      vulnerableFiles: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0
    };
    
    for (const dir of enhancementDirs) {
      if (fs.existsSync(dir)) {
        await this.scanDirectory(dir);
      }
    }
    
    await this.scanPackageFiles();
    await this.generateSecurityReport();
    
    console.log(`✅ Security scan complete. Scanned ${this.securityMetrics.totalFiles} files.`);
    return this.scanResults;
  }

  async scanDirectory(dirPath) {
    const files = this.getFilesRecursively(dirPath);
    
    for (const file of files) {
      if (this.shouldScanFile(file)) {
        await this.scanFile(file);
      }
    }
  }

  getFilesRecursively(dirPath) {
    const files = [];
    
    const scanDir = (currentPath) => {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !this.shouldSkipDirectory(item)) {
          scanDir(fullPath);
        } else if (stat.isFile()) {
          files.push(fullPath);
        }
      }
    };
    
    scanDir(dirPath);
    return files;
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage'];
    return skipDirs.includes(dirName);
  }

  shouldScanFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const scanExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.env', '.yaml', '.yml', '.sh'];
    return scanExtensions.includes(ext);
  }

  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      this.securityMetrics.totalFiles++;
      
      const issues = [];
      
      // Check for vulnerability patterns
      for (const rule of this.securityRules.vulnerabilityPatterns) {
        const matches = content.match(rule.pattern);
        if (matches) {
          for (const match of matches) {
            issues.push({
              type: 'vulnerability',
              severity: rule.severity,
              description: rule.description,
              cwe: rule.cwe,
              match: match.trim(),
              line: this.getLineNumber(content, match)
            });
            
            this.securityMetrics[`${rule.severity}Issues`]++;
          }
        }
      }
      
      // Check for configuration issues
      for (const rule of this.securityRules.configurationIssues) {
        const matches = content.match(rule.pattern);
        if (matches) {
          for (const match of matches) {
            issues.push({
              type: 'configuration',
              severity: rule.severity,
              description: rule.description,
              match: match.trim(),
              line: this.getLineNumber(content, match)
            });
            
            this.securityMetrics[`${rule.severity}Issues`]++;
          }
        }
      }
      
      // Check for dangerous permissions
      for (const rule of this.securityRules.dangerousPermissions) {
        const matches = content.match(rule.pattern);
        if (matches) {
          for (const match of matches) {
            issues.push({
              type: 'permissions',
              severity: 'medium',
              description: rule.description,
              match: match.trim(),
              line: this.getLineNumber(content, match)
            });
            
            this.securityMetrics.mediumIssues++;
          }
        }
      }
      
      // Check for secrets in environment files
      if (filePath.includes('.env') || filePath.includes('config')) {
        const secretIssues = this.scanForSecrets(content);
        issues.push(...secretIssues);
      }
      
      if (issues.length > 0) {
        this.scanResults[filePath] = {
          issues,
          riskScore: this.calculateRiskScore(issues),
          lastScanned: new Date().toISOString()
        };
        this.securityMetrics.vulnerableFiles++;
      }
      
    } catch (error) {
      console.error(`Error scanning file ${filePath}:`, error.message);
    }
  }

  scanForSecrets(content) {
    const issues = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for exposed secrets
      if (line.includes('=') && !line.trim().startsWith('#')) {
        const [key, value] = line.split('=');
        
        if (value && value.length > 10 && !value.includes('YOUR_') && !value.includes('REPLACE_')) {
          // Check if it looks like a real secret
          const suspiciousPatterns = [
            /^[A-Za-z0-9+/=]{20,}$/,  // Base64-like
            /^[A-Fa-f0-9]{32,}$/,     // Hex strings
            /sk-[a-zA-Z0-9]{20,}/,    // API keys
            /^[A-Z0-9]{20,}$/         // Long uppercase strings
          ];
          
          if (suspiciousPatterns.some(pattern => pattern.test(value.trim()))) {
            issues.push({
              type: 'secret_exposure',
              severity: 'critical',
              description: `Potential secret exposed: ${key}`,
              match: key,
              line: i + 1
            });
            
            this.securityMetrics.criticalIssues++;
          }
        }
      }
    }
    
    return issues;
  }

  async scanPackageFiles() {
    const packageFiles = ['package.json', 'package-lock.json'];
    
    for (const file of packageFiles) {
      if (fs.existsSync(file)) {
        await this.scanPackageDependencies(file);
      }
    }
    
    // Scan in subdirectories
    const subDirs = ['cli', 'dashboard', 'agents'];
    for (const dir of subDirs) {
      for (const file of packageFiles) {
        const fullPath = path.join(dir, file);
        if (fs.existsSync(fullPath)) {
          await this.scanPackageDependencies(fullPath);
        }
      }
    }
  }

  async scanPackageDependencies(packagePath) {
    try {
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      const dependencies = { ...packageData.dependencies, ...packageData.devDependencies };
      
      const issues = [];
      
      for (const [pkg, version] of Object.entries(dependencies)) {
        const vulnerability = this.checkKnownVulnerability(pkg, version);
        if (vulnerability) {
          issues.push({
            type: 'dependency_vulnerability',
            severity: vulnerability.severity,
            description: `Vulnerable dependency: ${pkg}@${version}`,
            package: pkg,
            currentVersion: version,
            recommendation: vulnerability.recommendation
          });
          
          this.securityMetrics[`${vulnerability.severity}Issues`]++;
        }
      }
      
      if (issues.length > 0) {
        this.scanResults[packagePath] = {
          issues,
          riskScore: this.calculateRiskScore(issues),
          lastScanned: new Date().toISOString()
        };
        this.securityMetrics.vulnerableFiles++;
      }
      
    } catch (error) {
      console.error(`Error scanning package file ${packagePath}:`, error.message);
    }
  }

  checkKnownVulnerability(packageName, version) {
    const vuln = this.securityRules.knownVulnerablePackages.find(pkg => pkg.name === packageName);
    if (vuln) {
      // Simplified version check - in production, use a proper semver library
      for (const vulnVersion of vuln.versions) {
        if (vulnVersion.includes('<') && version.match(/^\d+\.\d+\.\d+$/)) {
          const [, targetVersion] = vulnVersion.split('<');
          if (this.compareVersions(version, targetVersion) < 0) {
            return {
              severity: vuln.severity,
              recommendation: `Update to version ${targetVersion} or later`
            };
          }
        }
      }
    }
    return null;
  }

  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }
    return 0;
  }

  getLineNumber(content, match) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(match)) {
        return i + 1;
      }
    }
    return 0;
  }

  calculateRiskScore(issues) {
    const weights = { critical: 10, high: 7, medium: 4, low: 1 };
    return issues.reduce((score, issue) => score + (weights[issue.severity] || 0), 0);
  }

  async generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.securityMetrics,
      vulnerabilities: this.scanResults,
      recommendations: this.generateRecommendations(),
      compliance: this.checkComplianceStatus()
    };
    
    // Save report
    const reportPath = `security-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Store in Redis for dashboard
    await redis.set('security:latest_report', JSON.stringify(report));
    await redis.lpush('security:report_history', JSON.stringify({
      timestamp: report.timestamp,
      summary: report.summary,
      critical_count: report.summary.criticalIssues,
      high_count: report.summary.highIssues
    }));
    await redis.ltrim('security:report_history', 0, 99); // Keep last 100 reports
    
    console.log(`📊 Security report saved: ${reportPath}`);
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.securityMetrics.criticalIssues > 0) {
      recommendations.push({
        priority: 'critical',
        action: 'Immediate Action Required',
        description: `${this.securityMetrics.criticalIssues} critical security issues found. Address immediately.`,
        category: 'vulnerability'
      });
    }
    
    if (this.securityMetrics.highIssues > 5) {
      recommendations.push({
        priority: 'high',
        action: 'Security Review',
        description: `${this.securityMetrics.highIssues} high-severity issues detected. Schedule security review.`,
        category: 'process'
      });
    }
    
    const totalIssues = this.securityMetrics.criticalIssues + this.securityMetrics.highIssues + this.securityMetrics.mediumIssues;
    if (totalIssues > 20) {
      recommendations.push({
        priority: 'medium',
        action: 'Security Training',
        description: 'High number of security issues suggest need for developer security training.',
        category: 'training'
      });
    }
    
    recommendations.push({
      priority: 'low',
      action: 'Regular Scanning',
      description: 'Schedule automated security scans to run daily.',
      category: 'automation'
    });
    
    return recommendations;
  }

  checkComplianceStatus() {
    const criticalThreshold = 0;
    const highThreshold = 5;
    
    return {
      overall_status: this.securityMetrics.criticalIssues <= criticalThreshold && 
                     this.securityMetrics.highIssues <= highThreshold ? 'compliant' : 'non_compliant',
      critical_issues_threshold: criticalThreshold,
      high_issues_threshold: highThreshold,
      current_critical: this.securityMetrics.criticalIssues,
      current_high: this.securityMetrics.highIssues,
      last_scan: new Date().toISOString()
    };
  }

  async displayReport(report) {
    console.log('\n🔒 SECURITY SCAN REPORT');
    console.log('='.repeat(60));
    
    console.log('\n📊 SUMMARY');
    console.log(`Total Files Scanned: ${report.summary.totalFiles}`);
    console.log(`Vulnerable Files: ${report.summary.vulnerableFiles}`);
    console.log(`Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`High Issues: ${report.summary.highIssues}`);
    console.log(`Medium Issues: ${report.summary.mediumIssues}`);
    console.log(`Low Issues: ${report.summary.lowIssues}`);
    
    console.log('\n🚨 TOP VULNERABILITIES');
    const sortedFiles = Object.entries(report.vulnerabilities)
      .sort(([,a], [,b]) => b.riskScore - a.riskScore)
      .slice(0, 5);
    
    for (const [file, data] of sortedFiles) {
      console.log(`\n📁 ${file} (Risk Score: ${data.riskScore})`);
      for (const issue of data.issues.slice(0, 3)) {
        console.log(`  ⚠️  [${issue.severity.toUpperCase()}] ${issue.description}`);
      }
    }
    
    console.log('\n💡 RECOMMENDATIONS');
    for (const rec of report.recommendations) {
      console.log(`  [${rec.priority.toUpperCase()}] ${rec.action}: ${rec.description}`);
    }
    
    console.log('\n✅ COMPLIANCE STATUS');
    console.log(`Overall Status: ${report.compliance.overall_status.toUpperCase()}`);
    console.log(`Critical Issues: ${report.compliance.current_critical}/${report.compliance.critical_issues_threshold}`);
    console.log(`High Issues: ${report.compliance.current_high}/${report.compliance.high_issues_threshold}`);
    
    console.log('\n' + '='.repeat(60));
  }
}

// CLI interface
async function main() {
  const scanner = new EnhancementSecurityScanner();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'scan':
        const results = await scanner.scanEnhancementFiles();
        break;
        
      case 'report':
        const latestReport = await redis.get('security:latest_report');
        if (latestReport) {
          const report = JSON.parse(latestReport);
          await scanner.displayReport(report);
        } else {
          console.log('No security report found. Run scan first.');
        }
        break;
        
      default:
        console.log('Enhancement Security Scanner');
        console.log('\nCommands:');
        console.log('  scan    - Perform security scan');
        console.log('  report  - Display latest security report');
        console.log('\nExamples:');
        console.log('  node enhancement-security-scanner.js scan');
        console.log('  node enhancement-security-scanner.js report');
    }
  } catch (error) {
    console.error('Security scanner error:', error);
  } finally {
    redis.disconnect();
  }
}

main();