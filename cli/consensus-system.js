#!/usr/bin/env node

/**
 * Multi-Agent Consensus System for Ez Aigents
 * 
 * Ensures multiple agents agree before performing destructive operations
 */

const EventEmitter = require('events');
const Redis = require('ioredis');
const crypto = require('crypto');

class ConsensusSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    this.redis = new Redis(options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.defaultTimeout = options.defaultTimeout || 300000; // 5 minutes
    this.minApprovals = options.minApprovals || 2;
  }

  /**
   * Request approval for a destructive operation
   * @param {Object} options - Consensus request options
   * @param {string} options.operation - Type of operation (delete_files, major_refactor, etc)
   * @param {string[]} options.files - Files affected by the operation
   * @param {string} options.reason - Reason for the operation
   * @param {number} options.required_approvals - Number of approvals needed
   * @param {number} options.timeout - Timeout for consensus in milliseconds
   * @param {string} options.initiated_by - Agent initiating the request
   * @returns {Promise<Object>} Consensus result
   */
  async requestApproval(options) {
    const {
      operation,
      files,
      reason,
      required_approvals = this.minApprovals,
      timeout = this.defaultTimeout,
      initiated_by
    } = options;

    const requestId = `consensus_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const request = {
      id: requestId,
      operation,
      files,
      reason,
      required_approvals,
      initiated_by,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + timeout).toISOString(),
      status: 'pending',
      approvers: [],
      rejectors: [],
      votes: {}
    };

    // Store request in Redis
    await this.redis.hset('consensus:requests', requestId, JSON.stringify(request));
    await this.redis.zadd('consensus:pending', Date.now() + timeout, requestId);
    
    // Publish request for agents to see
    await this.redis.publish('consensus:new_request', JSON.stringify({
      request_id: requestId,
      operation,
      files,
      reason,
      required_approvals
    }));

    console.log(`\n🤝 Consensus request created: ${requestId}`);
    console.log(`   Operation: ${operation}`);
    console.log(`   Files: ${files.length} files`);
    console.log(`   Required approvals: ${required_approvals}`);
    console.log(`   Timeout: ${timeout}ms`);

    // Wait for consensus
    const result = await this.waitForConsensus(requestId, timeout);
    
    return result;
  }

  /**
   * Vote on a consensus request
   * @param {string} requestId - Request ID to vote on
   * @param {string} agentId - Agent casting the vote
   * @param {boolean} approve - Whether to approve or reject
   * @param {string} comment - Optional comment explaining the vote
   * @returns {Promise<Object>} Updated request status
   */
  async vote(requestId, agentId, approve, comment = '') {
    const requestData = await this.redis.hget('consensus:requests', requestId);
    if (!requestData) {
      throw new Error('Consensus request not found');
    }

    const request = JSON.parse(requestData);
    
    // Check if request has expired
    if (new Date(request.expires_at) < new Date()) {
      request.status = 'expired';
      await this.redis.hset('consensus:requests', requestId, JSON.stringify(request));
      throw new Error('Consensus request has expired');
    }

    // Check if agent already voted
    if (request.votes[agentId]) {
      throw new Error('Agent has already voted on this request');
    }

    // Record vote
    request.votes[agentId] = {
      approved: approve,
      comment,
      timestamp: new Date().toISOString()
    };

    if (approve) {
      request.approvers.push(agentId);
    } else {
      request.rejectors.push(agentId);
    }

    // Check if consensus reached
    if (request.approvers.length >= request.required_approvals) {
      request.status = 'approved';
      request.completed_at = new Date().toISOString();
    } else if (request.rejectors.length > (request.required_approvals / 2)) {
      // If more than half required votes are rejections, fail early
      request.status = 'rejected';
      request.completed_at = new Date().toISOString();
    }

    // Update in Redis
    await this.redis.hset('consensus:requests', requestId, JSON.stringify(request));
    
    // Publish vote event
    await this.redis.publish('consensus:vote', JSON.stringify({
      request_id: requestId,
      agent_id: agentId,
      approved: approve,
      status: request.status
    }));

    console.log(`\n🗳️  Vote cast by ${agentId}: ${approve ? '✅ Approved' : '❌ Rejected'}`);
    console.log(`   Current status: ${request.approvers.length}/${request.required_approvals} approvals`);

    return request;
  }

  /**
   * Wait for consensus to be reached
   * @param {string} requestId - Request ID to wait for
   * @param {number} timeout - Maximum time to wait
   * @returns {Promise<Object>} Final consensus result
   */
  async waitForConsensus(requestId, timeout) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const requestData = await this.redis.hget('consensus:requests', requestId);
      if (!requestData) {
        throw new Error('Consensus request not found');
      }

      const request = JSON.parse(requestData);
      
      if (request.status === 'approved' || request.status === 'rejected') {
        return {
          id: requestId,
          approved: request.status === 'approved',
          status: request.status,
          approvers: request.approvers,
          rejectors: request.rejectors,
          votes: request.votes,
          completed_at: request.completed_at
        };
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Timeout reached
    const requestData = await this.redis.hget('consensus:requests', requestId);
    const request = JSON.parse(requestData);
    
    request.status = 'timeout';
    request.completed_at = new Date().toISOString();
    
    await this.redis.hset('consensus:requests', requestId, JSON.stringify(request));
    
    return {
      id: requestId,
      approved: false,
      status: 'timeout',
      approvers: request.approvers,
      rejectors: request.rejectors,
      votes: request.votes,
      completed_at: request.completed_at
    };
  }

  /**
   * Get active consensus requests
   * @returns {Promise<Array>} List of active requests
   */
  async getActiveRequests() {
    const now = Date.now();
    const activeIds = await this.redis.zrangebyscore('consensus:pending', now, '+inf');
    
    const requests = [];
    for (const id of activeIds) {
      const data = await this.redis.hget('consensus:requests', id);
      if (data) {
        const request = JSON.parse(data);
        if (request.status === 'pending') {
          requests.push(request);
        }
      }
    }
    
    return requests;
  }

  /**
   * Get consensus request details
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Request details
   */
  async getRequest(requestId) {
    const data = await this.redis.hget('consensus:requests', requestId);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Cancel a consensus request
   * @param {string} requestId - Request ID to cancel
   * @param {string} canceledBy - Agent canceling the request
   * @returns {Promise<Object>} Updated request
   */
  async cancelRequest(requestId, canceledBy) {
    const requestData = await this.redis.hget('consensus:requests', requestId);
    if (!requestData) {
      throw new Error('Consensus request not found');
    }

    const request = JSON.parse(requestData);
    
    if (request.status !== 'pending') {
      throw new Error('Can only cancel pending requests');
    }

    request.status = 'canceled';
    request.canceled_by = canceledBy;
    request.completed_at = new Date().toISOString();
    
    await this.redis.hset('consensus:requests', requestId, JSON.stringify(request));
    await this.redis.zrem('consensus:pending', requestId);
    
    return request;
  }

  /**
   * Clean up expired requests
   */
  async cleanupExpired() {
    const now = Date.now();
    const expiredIds = await this.redis.zrangebyscore('consensus:pending', 0, now);
    
    for (const id of expiredIds) {
      const data = await this.redis.hget('consensus:requests', id);
      if (data) {
        const request = JSON.parse(data);
        if (request.status === 'pending') {
          request.status = 'expired';
          request.completed_at = new Date().toISOString();
          await this.redis.hset('consensus:requests', id, JSON.stringify(request));
        }
      }
      await this.redis.zrem('consensus:pending', id);
    }
    
    return expiredIds.length;
  }

  /**
   * Subscribe to consensus events
   * @param {Function} callback - Callback for new requests
   */
  async subscribeToRequests(callback) {
    const subscriber = new Redis(this.redis.options);
    
    subscriber.subscribe('consensus:new_request', 'consensus:vote');
    
    subscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        callback(channel, data);
      } catch (error) {
        console.error('Failed to parse consensus message:', error);
      }
    });
    
    return subscriber;
  }

  /**
   * Close Redis connections
   */
  async close() {
    await this.redis.quit();
  }
}

// Agent mixin for consensus participation
class ConsensusAgent {
  constructor(agentId, consensusSystem) {
    this.agentId = agentId;
    this.consensus = consensusSystem;
    this.autoReviewEnabled = true;
  }

  /**
   * Review and vote on a consensus request
   * @param {Object} request - Consensus request to review
   * @returns {Promise<Object>} Vote result
   */
  async reviewRequest(request) {
    console.log(`\n🔍 [${this.agentId}] Reviewing consensus request: ${request.id}`);
    console.log(`   Operation: ${request.operation}`);
    console.log(`   Files: ${request.files.join(', ')}`);
    console.log(`   Reason: ${request.reason}`);

    // Implement review logic based on operation type
    let approve = false;
    let comment = '';

    switch (request.operation) {
      case 'delete_files':
        // Check if files are truly deprecated/unused
        approve = await this.validateFileDeletion(request.files);
        comment = approve 
          ? 'Files appear to be safely deletable'
          : 'Files may still be in use';
        break;

      case 'major_refactor':
        // Check if refactoring has proper test coverage
        approve = await this.validateRefactoring(request.files);
        comment = approve
          ? 'Refactoring appears safe with adequate test coverage'
          : 'Insufficient test coverage for safe refactoring';
        break;

      default:
        // Conservative default - require manual review
        approve = false;
        comment = 'Unknown operation type - manual review required';
    }

    // Cast vote
    const result = await this.consensus.vote(request.id, this.agentId, approve, comment);
    
    return result;
  }

  /**
   * Validate file deletion safety
   * @param {string[]} files - Files to be deleted
   * @returns {Promise<boolean>} Whether deletion is safe
   */
  async validateFileDeletion(files) {
    // This is a simplified check - in production, would do deeper analysis
    for (const file of files) {
      // Check if file path contains common indicators of deprecated code
      if (!file.includes('deprecated') && 
          !file.includes('old') && 
          !file.includes('backup') &&
          !file.includes('temp')) {
        return false;
      }
    }
    return true;
  }

  /**
   * Validate refactoring safety
   * @param {string[]} files - Files to be refactored
   * @returns {Promise<boolean>} Whether refactoring is safe
   */
  async validateRefactoring(files) {
    // This is a simplified check - in production, would check test coverage
    // For now, approve if less than 5 files affected
    return files.length <= 5;
  }

  /**
   * Start auto-reviewing consensus requests
   */
  async startAutoReview() {
    const subscriber = await this.consensus.subscribeToRequests(async (channel, data) => {
      if (channel === 'consensus:new_request' && this.autoReviewEnabled) {
        // Don't review own requests
        if (data.initiated_by === this.agentId) return;
        
        // Get full request details
        const request = await this.consensus.getRequest(data.request_id);
        if (request && request.status === 'pending') {
          await this.reviewRequest(request);
        }
      }
    });
    
    return subscriber;
  }
}

// Export classes
module.exports = ConsensusSystem;
module.exports.ConsensusAgent = ConsensusAgent;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const consensus = new ConsensusSystem();

  async function main() {
    switch (command) {
      case 'request':
        if (args.length < 3) {
          console.error('Usage: consensus-system.js request <operation> <file1> [file2] ...');
          process.exit(1);
        }
        const operation = args[1];
        const files = args.slice(2);
        
        const result = await consensus.requestApproval({
          operation,
          files,
          reason: 'CLI consensus request',
          initiated_by: 'cli_user',
          required_approvals: 2,
          timeout: 60000 // 1 minute for testing
        });
        
        console.log('\n📊 Consensus Result:');
        console.log(`   Status: ${result.status}`);
        console.log(`   Approved: ${result.approved}`);
        console.log(`   Approvers: ${result.approvers.join(', ') || 'none'}`);
        console.log(`   Rejectors: ${result.rejectors.join(', ') || 'none'}`);
        break;

      case 'vote':
        if (args.length < 4) {
          console.error('Usage: consensus-system.js vote <request_id> <agent_id> <approve|reject> [comment]');
          process.exit(1);
        }
        const requestId = args[1];
        const agentId = args[2];
        const approve = args[3] === 'approve';
        const comment = args.slice(4).join(' ');
        
        const voteResult = await consensus.vote(requestId, agentId, approve, comment);
        console.log(`\n✅ Vote recorded. Request status: ${voteResult.status}`);
        break;

      case 'list':
        const active = await consensus.getActiveRequests();
        console.log(`\n📋 Active Consensus Requests: ${active.length}`);
        active.forEach(req => {
          console.log(`\n${req.id}`);
          console.log(`  Operation: ${req.operation}`);
          console.log(`  Files: ${req.files.length}`);
          console.log(`  Votes: ${req.approvers.length}/${req.required_approvals}`);
          console.log(`  Expires: ${req.expires_at}`);
        });
        break;

      case 'cleanup':
        const cleaned = await consensus.cleanupExpired();
        console.log(`\n🧹 Cleaned up ${cleaned} expired requests`);
        break;

      default:
        console.log('Usage: consensus-system.js <command> [args]');
        console.log('Commands:');
        console.log('  request <operation> <files...> - Create consensus request');
        console.log('  vote <request_id> <agent_id> <approve|reject> [comment]');
        console.log('  list                          - List active requests');
        console.log('  cleanup                       - Clean expired requests');
    }

    await consensus.close();
  }

  main().catch(console.error);
}