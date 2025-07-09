#!/usr/bin/env node

/**
 * Enhancement Rollback Manager
 * Provides rollback capabilities for enhancement implementations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class EnhancementRollback {
  constructor() {
    this.enhancementTasks = this.loadEnhancementTasks();
    this.backupDir = path.join(__dirname, '../.enhancement-backups');
    this.ensureBackupDirectory();
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

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(enhancementId) {
    const enhancement = this.enhancementTasks.enhancements[enhancementId];
    if (!enhancement) {
      console.error(`Enhancement ${enhancementId} not found`);
      return false;
    }

    console.log(`📦 Creating backup for enhancement: ${enhancement.title}`);
    
    const backupId = `${enhancementId}-${Date.now()}`;
    const backupPath = path.join(this.backupDir, backupId);
    fs.mkdirSync(backupPath, { recursive: true });

    const backupManifest = {
      enhancementId,
      title: enhancement.title,
      timestamp: new Date().toISOString(),
      files: [],
      gitCommit: null
    };

    // Get current git commit if in a git repo
    try {
      backupManifest.gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch (error) {
      console.log('Not in a git repository, skipping commit capture');
    }

    // Backup all files that would be created or modified
    for (const task of enhancement.tasks) {
      const filePath = path.join(__dirname, '..', task.file);
      const backupFilePath = path.join(backupPath, task.file);
      
      if (fs.existsSync(filePath)) {
        // Create directory structure
        const dir = path.dirname(backupFilePath);
        fs.mkdirSync(dir, { recursive: true });
        
        // Copy file to backup
        fs.copyFileSync(filePath, backupFilePath);
        backupManifest.files.push({
          path: task.file,
          existed: true,
          backed_up: true
        });
      } else {
        backupManifest.files.push({
          path: task.file,
          existed: false,
          backed_up: false
        });
      }
    }

    // Also backup modified files
    if (enhancement.files_to_modify) {
      for (const file of enhancement.files_to_modify) {
        const filePath = path.join(__dirname, '..', file);
        const backupFilePath = path.join(backupPath, file);
        
        if (fs.existsSync(filePath) && !backupManifest.files.find(f => f.path === file)) {
          const dir = path.dirname(backupFilePath);
          fs.mkdirSync(dir, { recursive: true });
          fs.copyFileSync(filePath, backupFilePath);
          backupManifest.files.push({
            path: file,
            existed: true,
            backed_up: true,
            was_modification: true
          });
        }
      }
    }

    // Save backup manifest
    fs.writeFileSync(
      path.join(backupPath, 'manifest.json'),
      JSON.stringify(backupManifest, null, 2)
    );

    // Store backup info in Redis
    await redis.hset(`enhancement:${enhancementId}:backups`, backupId, JSON.stringify({
      timestamp: backupManifest.timestamp,
      fileCount: backupManifest.files.length
    }));

    console.log(`✅ Backup created: ${backupId}`);
    console.log(`   Files backed up: ${backupManifest.files.filter(f => f.backed_up).length}`);
    
    return backupId;
  }

  async listBackups(enhancementId) {
    if (enhancementId) {
      // List backups for specific enhancement
      const backups = await redis.hgetall(`enhancement:${enhancementId}:backups`);
      
      console.log(`\nBackups for enhancement: ${enhancementId}`);
      console.log('='.repeat(60));
      
      if (Object.keys(backups).length === 0) {
        console.log('No backups found');
        return;
      }

      Object.entries(backups).forEach(([backupId, data]) => {
        const info = JSON.parse(data);
        console.log(`\nBackup ID: ${backupId}`);
        console.log(`Created: ${info.timestamp}`);
        console.log(`Files: ${info.fileCount}`);
      });
    } else {
      // List all backups
      console.log('\nAll Enhancement Backups');
      console.log('='.repeat(60));
      
      const backupDirs = fs.readdirSync(this.backupDir);
      
      for (const dir of backupDirs) {
        const manifestPath = path.join(this.backupDir, dir, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          console.log(`\nBackup: ${dir}`);
          console.log(`Enhancement: ${manifest.title}`);
          console.log(`Created: ${manifest.timestamp}`);
          console.log(`Files: ${manifest.files.length}`);
        }
      }
    }
  }

  async rollback(backupId, options = {}) {
    const backupPath = path.join(this.backupDir, backupId);
    const manifestPath = path.join(backupPath, 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      console.error(`Backup ${backupId} not found`);
      return false;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    console.log(`\n⚠️  Rolling back enhancement: ${manifest.title}`);
    console.log(`Backup created: ${manifest.timestamp}`);
    
    if (!options.force) {
      console.log('\nThis will:');
      console.log('- Remove files created by the enhancement');
      console.log('- Restore modified files to their previous state');
      console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    let restoredCount = 0;
    let removedCount = 0;
    const errors = [];

    for (const file of manifest.files) {
      const filePath = path.join(__dirname, '..', file.path);
      const backupFilePath = path.join(backupPath, file.path);
      
      try {
        if (file.existed && file.backed_up) {
          // Restore file from backup
          const dir = path.dirname(filePath);
          fs.mkdirSync(dir, { recursive: true });
          fs.copyFileSync(backupFilePath, filePath);
          restoredCount++;
          console.log(`✅ Restored: ${file.path}`);
        } else if (!file.existed && fs.existsSync(filePath)) {
          // Remove file that didn't exist before
          fs.unlinkSync(filePath);
          removedCount++;
          console.log(`🗑️  Removed: ${file.path}`);
        }
      } catch (error) {
        errors.push({ file: file.path, error: error.message });
        console.error(`❌ Failed to process ${file.path}: ${error.message}`);
      }
    }

    // Update Redis status
    await redis.hset(`enhancement:${manifest.enhancementId}`, {
      status: 'rolled_back',
      rolled_back_at: new Date().toISOString(),
      rollback_backup: backupId
    });

    console.log(`\n📊 Rollback Summary:`);
    console.log(`   Files restored: ${restoredCount}`);
    console.log(`   Files removed: ${removedCount}`);
    console.log(`   Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(e => console.log(`   - ${e.file}: ${e.error}`));
    }

    // Create rollback report
    const reportPath = path.join(__dirname, '..', `rollback-report-${Date.now()}.md`);
    const report = this.generateRollbackReport(manifest, restoredCount, removedCount, errors);
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 Rollback report saved: ${reportPath}`);

    return true;
  }

  generateRollbackReport(manifest, restoredCount, removedCount, errors) {
    return `# Enhancement Rollback Report

## Enhancement Details
- **ID**: ${manifest.enhancementId}
- **Title**: ${manifest.title}
- **Original Implementation**: ${manifest.timestamp}
- **Rollback Date**: ${new Date().toISOString()}
${manifest.gitCommit ? `- **Git Commit**: ${manifest.gitCommit}` : ''}

## Rollback Summary
- **Files Restored**: ${restoredCount}
- **Files Removed**: ${removedCount}
- **Errors**: ${errors.length}

## File Operations

### Restored Files
${manifest.files.filter(f => f.existed && f.backed_up).map(f => `- ${f.path}`).join('\n')}

### Removed Files
${manifest.files.filter(f => !f.existed).map(f => `- ${f.path}`).join('\n')}

${errors.length > 0 ? `
## Errors Encountered
${errors.map(e => `- **${e.file}**: ${e.error}`).join('\n')}
` : ''}

## Next Steps
1. Review the rollback changes
2. Run tests to ensure system stability
3. Clear Redis queues if needed: \`redis-cli FLUSHDB\`
4. Restart agents if they were affected
5. Consider creating a new backup before making changes
`;
  }

  async createCheckpoint(name, description) {
    console.log(`\n🏁 Creating checkpoint: ${name}`);
    
    const checkpoint = {
      name,
      description,
      timestamp: new Date().toISOString(),
      enhancements: {},
      gitCommit: null
    };

    // Get git commit
    try {
      checkpoint.gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch (error) {
      console.log('Not in a git repository');
    }

    // Backup all implemented enhancements
    for (const enhancementId of Object.keys(this.enhancementTasks.enhancements)) {
      const status = await redis.hgetall(`enhancement:${enhancementId}`);
      if (status.status === 'dispatched' || status.status === 'completed') {
        const backupId = await this.createBackup(enhancementId);
        checkpoint.enhancements[enhancementId] = {
          status: status.status,
          backupId
        };
      }
    }

    // Save checkpoint
    const checkpointPath = path.join(this.backupDir, 'checkpoints', `${name}-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));

    console.log(`✅ Checkpoint created: ${name}`);
    console.log(`   Enhancements backed up: ${Object.keys(checkpoint.enhancements).length}`);
    
    return checkpointPath;
  }
}

// CLI interface
async function main() {
  const rollback = new EnhancementRollback();
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];

  try {
    switch (command) {
      case 'backup':
        if (arg1) {
          await rollback.createBackup(arg1);
        } else {
          console.log('Usage: enhancement-rollback.js backup <enhancement-id>');
        }
        break;

      case 'list':
        await rollback.listBackups(arg1);
        break;

      case 'rollback':
        if (arg1) {
          const options = { force: arg2 === '--force' };
          await rollback.rollback(arg1, options);
        } else {
          console.log('Usage: enhancement-rollback.js rollback <backup-id> [--force]');
        }
        break;

      case 'checkpoint':
        if (arg1 && arg2) {
          await rollback.createCheckpoint(arg1, arg2);
        } else {
          console.log('Usage: enhancement-rollback.js checkpoint <name> <description>');
        }
        break;

      default:
        console.log('Enhancement Rollback Manager');
        console.log('\nCommands:');
        console.log('  backup <enhancement-id>        - Create backup before implementation');
        console.log('  list [enhancement-id]          - List available backups');
        console.log('  rollback <backup-id> [--force] - Rollback to a specific backup');
        console.log('  checkpoint <name> <desc>       - Create system checkpoint');
        console.log('\nExamples:');
        console.log('  node enhancement-rollback.js backup security-layer');
        console.log('  node enhancement-rollback.js list');
        console.log('  node enhancement-rollback.js rollback security-layer-1234567890');
        console.log('  node enhancement-rollback.js checkpoint "pre-production" "Before production deployment"');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    redis.disconnect();
  }
}

main();