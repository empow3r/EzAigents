const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

class FileLockManager {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.lockTimeout = 1800; // 30 minutes
    this.conflictResolution = {
      'queue_and_merge': this.queueAndMerge.bind(this),
      'notify_and_coordinate': this.notifyAndCoordinate.bind(this),
      'require_approval': this.requireApproval.bind(this)
    };
  }
  
  async claimFile(filePath, agentId, timeout = this.lockTimeout) {
    const lockKey = `lock:${filePath}`;
    const metaKey = `lock:meta:${filePath}`;
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      console.log(`⚠️  File ${filePath} does not exist, creating lock anyway`);
    }
    
    // Try to acquire lock
    const result = await this.redis.set(lockKey, agentId, 'EX', timeout, 'NX');
    
    if (result === 'OK') {
      // Store lock metadata
      await this.redis.hset(metaKey, {
        agent: agentId,
        claimed_at: new Date().toISOString(),
        file_path: filePath,
        timeout: timeout
      });
      
      // Notify other agents
      await this.redis.publish('file-locks', JSON.stringify({
        type: 'file_claimed',
        file: filePath,
        agent: agentId,
        timestamp: new Date().toISOString()
      }));
      
      return { success: true, message: `File claimed: ${filePath}` };
    } else {
      const currentOwner = await this.redis.get(lockKey);
      const ttl = await this.redis.ttl(lockKey);
      
      return {
        success: false,
        message: `File locked by ${currentOwner} (expires in ${ttl}s)`,
        owner: currentOwner,
        ttl: ttl
      };
    }
  }
  
  async releaseFile(filePath, agentId) {
    const lockKey = `lock:${filePath}`;
    const metaKey = `lock:meta:${filePath}`;
    
    const currentOwner = await this.redis.get(lockKey);
    
    if (currentOwner === agentId) {
      // Calculate hold time
      const meta = await this.redis.hgetall(metaKey);
      const claimedAt = new Date(meta.claimed_at);
      const holdTime = Math.floor((Date.now() - claimedAt.getTime()) / 1000);
      
      // Release lock
      await this.redis.del(lockKey);
      await this.redis.del(metaKey);
      
      // Notify other agents
      await this.redis.publish('file-locks', JSON.stringify({
        type: 'file_released',
        file: filePath,
        agent: agentId,
        hold_time: holdTime,
        timestamp: new Date().toISOString()
      }));
      
      return { success: true, message: `File released: ${filePath} (held for ${holdTime}s)` };
    } else {
      return {
        success: false,
        message: `Cannot release file ${filePath} - owned by ${currentOwner}`,
        owner: currentOwner
      };
    }
  }
  
  async extendLock(filePath, agentId, additionalTime = 1800) {
    const lockKey = `lock:${filePath}`;
    const currentOwner = await this.redis.get(lockKey);
    
    if (currentOwner === agentId) {
      const currentTtl = await this.redis.ttl(lockKey);
      const newTtl = currentTtl + additionalTime;
      
      await this.redis.expire(lockKey, newTtl);
      
      return { success: true, message: `Lock extended for ${filePath} (new TTL: ${newTtl}s)` };
    } else {
      return {
        success: false,
        message: `Cannot extend lock for ${filePath} - owned by ${currentOwner}`,
        owner: currentOwner
      };
    }
  }
  
  async checkLockStatus(filePath) {
    const lockKey = `lock:${filePath}`;
    const metaKey = `lock:meta:${filePath}`;
    
    const currentOwner = await this.redis.get(lockKey);
    
    if (!currentOwner) {
      return {
        locked: false,
        owner: null,
        ttl: 0,
        message: `File ${filePath} is not locked`
      };
    }
    
    const ttl = await this.redis.ttl(lockKey);
    const metadata = await this.redis.hgetall(metaKey);
    
    return {
      locked: true,
      owner: currentOwner,
      ttl: ttl,
      metadata: metadata,
      message: `File ${filePath} is locked by ${currentOwner} (TTL: ${ttl}s)`
    };
  }
  
  async forceLock(filePath, agentId, reason) {
    const lockKey = `lock:${filePath}`;
    const metaKey = `lock:meta:${filePath}`;
    
    const currentOwner = await this.redis.get(lockKey);
    
    // Log the force action
    await this.redis.lpush('force-lock-log', JSON.stringify({
      file: filePath,
      forced_by: agentId,
      previous_owner: currentOwner,
      reason: reason,
      timestamp: new Date().toISOString()
    }));
    
    // Force acquire lock
    await this.redis.set(lockKey, agentId, 'EX', this.lockTimeout);
    await this.redis.hset(metaKey, {
      agent: agentId,
      claimed_at: new Date().toISOString(),
      file_path: filePath,
      forced: true,
      reason: reason
    });
    
    // Notify all agents
    await this.redis.publish('file-locks', JSON.stringify({
      type: 'file_force_locked',
      file: filePath,
      agent: agentId,
      previous_owner: currentOwner,
      reason: reason,
      timestamp: new Date().toISOString()
    }));
    
    return { success: true, message: `Force locked ${filePath} from ${currentOwner}` };
  }
  
  async getAllLocks() {
    const keys = await this.redis.keys('lock:*');
    const locks = {};
    
    for (const key of keys) {
      if (key.includes('meta:')) continue;
      
      const filePath = key.replace('lock:', '');
      const owner = await this.redis.get(key);
      const ttl = await this.redis.ttl(key);
      const metaKey = `lock:meta:${filePath}`;
      const meta = await this.redis.hgetall(metaKey);
      
      locks[filePath] = {
        owner,
        ttl,
        claimed_at: meta.claimed_at,
        forced: meta.forced === 'true',
        reason: meta.reason
      };
    }
    
    return locks;
  }
  
  async getAgentLocks(agentId) {
    const allLocks = await this.getAllLocks();
    const agentLocks = {};
    
    for (const [filePath, lockInfo] of Object.entries(allLocks)) {
      if (lockInfo.owner === agentId) {
        agentLocks[filePath] = lockInfo;
      }
    }
    
    return agentLocks;
  }
  
  async waitForFile(filePath, agentId, timeout = 300000) { // 5 minutes default
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const result = await this.claimFile(filePath, agentId);
      if (result.success) {
        return result;
      }
      
      // Check if file is still locked
      const lockKey = `lock:${filePath}`;
      const exists = await this.redis.exists(lockKey);
      if (!exists) {
        continue; // Try again immediately
      }
      
      // Wait 5 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    return {
      success: false,
      message: `Timeout waiting for file: ${filePath}`,
      timeout: true
    };
  }
  
  async queueAndMerge(filePath, agentId, conflictData) {
    const queueKey = `queue:${filePath}`;
    
    // Add to queue
    await this.redis.lpush(queueKey, JSON.stringify({
      agent: agentId,
      timestamp: new Date().toISOString(),
      conflict_data: conflictData
    }));
    
    // Notify conflict resolver
    await this.redis.publish('conflict-resolution', JSON.stringify({
      type: 'queue_and_merge',
      file: filePath,
      agent: agentId,
      queue_length: await this.redis.llen(queueKey)
    }));
    
    return { success: true, message: `Queued for merge: ${filePath}` };
  }
  
  async notifyAndCoordinate(filePath, agentId, conflictData) {
    const lockKey = `lock:${filePath}`;
    const currentOwner = await this.redis.get(lockKey);
    
    // Send coordination message
    await this.redis.lpush(`messages:${currentOwner}`, JSON.stringify({
      type: 'coordination_required',
      from: agentId,
      message: `Coordination needed for ${filePath}`,
      conflict_data: conflictData,
      timestamp: new Date().toISOString()
    }));
    
    // Notify coordination channel
    await this.redis.publish('coordination-required', JSON.stringify({
      file: filePath,
      requesting_agent: agentId,
      owning_agent: currentOwner,
      conflict_data: conflictData
    }));
    
    return { success: true, message: `Coordination requested for ${filePath}` };
  }
  
  async requireApproval(filePath, agentId, conflictData) {
    const approvalKey = `approval:${filePath}`;
    
    // Store approval request
    await this.redis.hset(approvalKey, {
      requesting_agent: agentId,
      file_path: filePath,
      conflict_data: JSON.stringify(conflictData),
      requested_at: new Date().toISOString(),
      status: 'pending'
    });
    
    // Notify approval channel
    await this.redis.publish('approval-required', JSON.stringify({
      file: filePath,
      requesting_agent: agentId,
      conflict_data: conflictData,
      approval_id: approvalKey
    }));
    
    return { success: true, message: `Approval required for ${filePath}` };
  }
  
  async cleanupExpiredLocks() {
    const locks = await this.getAllLocks();
    let cleaned = 0;
    
    for (const [filePath, lockInfo] of Object.entries(locks)) {
      if (lockInfo.ttl <= 0) {
        await this.redis.del(`lock:${filePath}`);
        await this.redis.del(`lock:meta:${filePath}`);
        cleaned++;
      }
    }
    
    return { cleaned, message: `Cleaned up ${cleaned} expired locks` };
  }
  
  async emergencyReleaseAll(agentId) {
    const agentLocks = await this.getAgentLocks(agentId);
    const released = [];
    
    for (const filePath of Object.keys(agentLocks)) {
      const result = await this.releaseFile(filePath, agentId);
      if (result.success) {
        released.push(filePath);
      }
    }
    
    // Log emergency release
    await this.redis.lpush('emergency-log', JSON.stringify({
      type: 'emergency_release_all',
      agent: agentId,
      files_released: released,
      timestamp: new Date().toISOString()
    }));
    
    return { success: true, released, message: `Emergency release of ${released.length} files` };
  }
}

module.exports = FileLockManager;