#!/usr/bin/env node

/**
 * Backup/Snapshot System for Ez Aigents
 * 
 * Provides code safety by creating snapshots before destructive operations
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const Redis = require('ioredis');

class BackupSystem {
  constructor(options = {}) {
    this.redis = new Redis(options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.backupDir = options.backupDir || path.join(process.cwd(), '.backups');
    this.maxBackups = options.maxBackups || 50;
  }

  /**
   * Create a snapshot of specified files
   * @param {Object} options - Snapshot options
   * @param {string[]} options.files - Files to backup
   * @param {string} options.reason - Reason for backup
   * @param {string} options.initiated_by - Agent ID initiating backup
   * @param {boolean} options.approval_required - Whether approval is needed
   * @returns {Promise<Object>} Snapshot metadata
   */
  async createSnapshot(options) {
    const {
      files,
      reason,
      initiated_by,
      approval_required = false
    } = options;

    const snapshotId = `snapshot_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const snapshotDir = path.join(this.backupDir, snapshotId);

    try {
      // Create backup directory
      await fs.mkdir(snapshotDir, { recursive: true });

      // Backup metadata
      const metadata = {
        id: snapshotId,
        created_at: new Date().toISOString(),
        initiated_by,
        reason,
        approval_required,
        files: [],
        status: 'in_progress'
      };

      // Copy each file
      for (const filePath of files) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          
          // Preserve directory structure
          const relativePath = path.relative(process.cwd(), filePath);
          const backupPath = path.join(snapshotDir, relativePath);
          
          // Create directory if needed
          await fs.mkdir(path.dirname(backupPath), { recursive: true });
          
          // Write backup file
          await fs.writeFile(backupPath, content);
          
          metadata.files.push({
            original_path: filePath,
            backup_path: backupPath,
            relative_path: relativePath,
            hash,
            size: content.length
          });
          
          console.log(`✅ Backed up: ${filePath}`);
        } catch (error) {
          console.error(`❌ Failed to backup ${filePath}:`, error.message);
          metadata.files.push({
            original_path: filePath,
            error: error.message
          });
        }
      }

      // Save metadata
      metadata.status = 'completed';
      const metadataPath = path.join(snapshotDir, 'snapshot.json');
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      // Store in Redis for quick access
      await this.redis.hset('backup:snapshots', snapshotId, JSON.stringify(metadata));
      await this.redis.zadd('backup:timeline', Date.now(), snapshotId);

      // Cleanup old backups if needed
      await this.cleanupOldBackups();

      console.log(`\n📸 Snapshot created: ${snapshotId}`);
      console.log(`   Files backed up: ${metadata.files.filter(f => !f.error).length}/${files.length}`);
      console.log(`   Location: ${snapshotDir}`);

      return metadata;

    } catch (error) {
      console.error('Failed to create snapshot:', error);
      throw error;
    }
  }

  /**
   * Restore files from a snapshot
   * @param {string} snapshotId - Snapshot ID to restore from
   * @param {string[]} files - Specific files to restore (optional)
   * @returns {Promise<Object>} Restore results
   */
  async restoreSnapshot(snapshotId, files = null) {
    const snapshotDir = path.join(this.backupDir, snapshotId);
    const metadataPath = path.join(snapshotDir, 'snapshot.json');

    try {
      // Load metadata
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      const results = {
        snapshot_id: snapshotId,
        restored: [],
        failed: [],
        timestamp: new Date().toISOString()
      };

      // Determine which files to restore
      const filesToRestore = files 
        ? metadata.files.filter(f => files.includes(f.original_path))
        : metadata.files;

      // Restore each file
      for (const file of filesToRestore) {
        if (file.error) {
          results.failed.push({
            path: file.original_path,
            reason: 'File was not backed up successfully'
          });
          continue;
        }

        try {
          const backupContent = await fs.readFile(file.backup_path, 'utf8');
          
          // Create directory if needed
          await fs.mkdir(path.dirname(file.original_path), { recursive: true });
          
          // Restore file
          await fs.writeFile(file.original_path, backupContent);
          
          results.restored.push({
            path: file.original_path,
            size: file.size
          });
          
          console.log(`✅ Restored: ${file.original_path}`);
        } catch (error) {
          results.failed.push({
            path: file.original_path,
            reason: error.message
          });
          console.error(`❌ Failed to restore ${file.original_path}:`, error.message);
        }
      }

      console.log(`\n🔄 Restore completed from snapshot: ${snapshotId}`);
      console.log(`   Files restored: ${results.restored.length}/${filesToRestore.length}`);

      return results;

    } catch (error) {
      console.error('Failed to restore snapshot:', error);
      throw error;
    }
  }

  /**
   * List available snapshots
   * @param {number} limit - Maximum number of snapshots to return
   * @returns {Promise<Array>} List of snapshots
   */
  async listSnapshots(limit = 10) {
    try {
      // Get recent snapshots from Redis
      const snapshotIds = await this.redis.zrevrange('backup:timeline', 0, limit - 1);
      const snapshots = [];

      for (const id of snapshotIds) {
        const data = await this.redis.hget('backup:snapshots', id);
        if (data) {
          snapshots.push(JSON.parse(data));
        }
      }

      return snapshots;

    } catch (error) {
      console.error('Failed to list snapshots:', error);
      return [];
    }
  }

  /**
   * Get snapshot details
   * @param {string} snapshotId - Snapshot ID
   * @returns {Promise<Object>} Snapshot metadata
   */
  async getSnapshot(snapshotId) {
    try {
      // Try Redis first
      const data = await this.redis.hget('backup:snapshots', snapshotId);
      if (data) {
        return JSON.parse(data);
      }

      // Fall back to filesystem
      const metadataPath = path.join(this.backupDir, snapshotId, 'snapshot.json');
      const content = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(content);

    } catch (error) {
      console.error('Failed to get snapshot:', error);
      return null;
    }
  }

  /**
   * Compare current files with snapshot
   * @param {string} snapshotId - Snapshot ID to compare against
   * @returns {Promise<Object>} Comparison results
   */
  async compareWithSnapshot(snapshotId) {
    const snapshot = await this.getSnapshot(snapshotId);
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    const comparison = {
      snapshot_id: snapshotId,
      timestamp: new Date().toISOString(),
      unchanged: [],
      modified: [],
      deleted: [],
      added: []
    };

    for (const file of snapshot.files) {
      if (file.error) continue;

      try {
        const currentContent = await fs.readFile(file.original_path, 'utf8');
        const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex');

        if (currentHash === file.hash) {
          comparison.unchanged.push(file.original_path);
        } else {
          comparison.modified.push({
            path: file.original_path,
            original_hash: file.hash,
            current_hash: currentHash
          });
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          comparison.deleted.push(file.original_path);
        }
      }
    }

    return comparison;
  }

  /**
   * Clean up old backups beyond the limit
   */
  async cleanupOldBackups() {
    try {
      const count = await this.redis.zcard('backup:timeline');
      if (count <= this.maxBackups) return;

      // Get oldest backups to remove
      const toRemove = await this.redis.zrange('backup:timeline', 0, count - this.maxBackups - 1);

      for (const snapshotId of toRemove) {
        const snapshotDir = path.join(this.backupDir, snapshotId);
        
        // Remove from filesystem
        await fs.rm(snapshotDir, { recursive: true, force: true });
        
        // Remove from Redis
        await this.redis.hdel('backup:snapshots', snapshotId);
        await this.redis.zrem('backup:timeline', snapshotId);
        
        console.log(`🗑️  Removed old backup: ${snapshotId}`);
      }

    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    await this.redis.quit();
  }
}

// Export as singleton and class
const backupSystem = new BackupSystem();

module.exports = BackupSystem;
module.exports.default = backupSystem;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  async function main() {
    switch (command) {
      case 'create':
        const files = args.slice(1);
        if (files.length === 0) {
          console.error('Usage: backup-system.js create <file1> <file2> ...');
          process.exit(1);
        }
        await backupSystem.createSnapshot({
          files,
          reason: 'Manual backup via CLI',
          initiated_by: 'cli_user'
        });
        break;

      case 'restore':
        const snapshotId = args[1];
        if (!snapshotId) {
          console.error('Usage: backup-system.js restore <snapshot_id> [file1] [file2] ...');
          process.exit(1);
        }
        const filesToRestore = args.slice(2).length > 0 ? args.slice(2) : null;
        await backupSystem.restoreSnapshot(snapshotId, filesToRestore);
        break;

      case 'list':
        const limit = parseInt(args[1]) || 10;
        const snapshots = await backupSystem.listSnapshots(limit);
        console.log('\n📸 Available Snapshots:');
        snapshots.forEach(s => {
          console.log(`\n${s.id}`);
          console.log(`  Created: ${s.created_at}`);
          console.log(`  Reason: ${s.reason}`);
          console.log(`  Files: ${s.files.length}`);
        });
        break;

      case 'compare':
        const compareId = args[1];
        if (!compareId) {
          console.error('Usage: backup-system.js compare <snapshot_id>');
          process.exit(1);
        }
        const comparison = await backupSystem.compareWithSnapshot(compareId);
        console.log('\n📊 Comparison Results:');
        console.log(`  Unchanged: ${comparison.unchanged.length}`);
        console.log(`  Modified: ${comparison.modified.length}`);
        console.log(`  Deleted: ${comparison.deleted.length}`);
        if (comparison.modified.length > 0) {
          console.log('\nModified files:');
          comparison.modified.forEach(f => console.log(`  - ${f.path}`));
        }
        break;

      default:
        console.log('Usage: backup-system.js <command> [args]');
        console.log('Commands:');
        console.log('  create <file1> <file2> ...  - Create a snapshot');
        console.log('  restore <snapshot_id> [files] - Restore from snapshot');
        console.log('  list [limit]                 - List snapshots');
        console.log('  compare <snapshot_id>        - Compare with snapshot');
    }

    await backupSystem.close();
  }

  main().catch(console.error);
}