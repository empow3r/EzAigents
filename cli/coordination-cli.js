#!/usr/bin/env node

const Redis = require('ioredis');
const AgentCoordinator = require('./coordination-service');
const FileLockManager = require('./file-lock-manager');
const AgentCommunication = require('./agent-communication');
const DelegationOrchestrator = require('./delegation-orchestrator');
const GovernanceProtocol = require('./governance-protocol');

class CoordinationCLI {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.agentId = process.env.AGENT_ID || 'coordination-cli';
    this.components = {};
    
    this.init();
  }
  
  async init() {
    console.log('🚀 Initializing Multi-Agent Coordination System...');
    
    // Initialize components
    this.components.lockManager = new FileLockManager();
    this.components.communication = new AgentCommunication(this.agentId);
    this.components.governance = new GovernanceProtocol();
    
    // Setup CLI commands
    this.setupCLI();
    
    console.log('✅ Coordination CLI ready');
  }
  
  setupCLI() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
      case 'start-orchestrator':
        this.startOrchestrator();
        break;
      case 'status':
        this.showStatus();
        break;
      case 'agents':
        this.listAgents();
        break;
      case 'locks':
        this.showLocks();
        break;
      case 'unlock':
        this.unlockFile(args[1], args[2]);
        break;
      case 'message':
        this.sendMessage(args[1], args.slice(2).join(' '));
        break;
      case 'broadcast':
        this.broadcastMessage(args.slice(1).join(' '));
        break;
      case 'governance':
        this.showGovernance();
        break;
      case 'propose':
        this.createProposal(args.slice(1));
        break;
      case 'vote':
        this.castVote(args[1], args[2], args.slice(3).join(' '));
        break;
      case 'cleanup':
        this.cleanup();
        break;
      case 'help':
        this.showHelp();
        break;
      default:
        this.showHelp();
    }
  }
  
  async startOrchestrator() {
    console.log('🎯 Starting Delegation Orchestrator...');
    this.components.orchestrator = new DelegationOrchestrator();
    
    // Keep process running
    process.on('SIGINT', async () => {
      console.log('\\n🛑 Shutting down orchestrator...');
      await this.components.orchestrator.coordinator.shutdown();
      process.exit(0);
    });
    
    console.log('✅ Delegation Orchestrator started. Press Ctrl+C to stop.');
    
    // Keep alive
    setInterval(() => {
      // Heartbeat to keep process alive
    }, 30000);
  }
  
  async showStatus() {
    console.log('📊 System Status:');
    console.log('================');
    
    try {
      // Agent status
      const agents = await this.getActiveAgents();
      console.log(`🤖 Active Agents: ${agents.length}`);
      
      // File locks
      const locks = await this.components.lockManager.getAllLocks();
      console.log(`🔒 Active Locks: ${Object.keys(locks).length}`);
      
      // Governance status
      const governance = await this.components.governance.getGovernanceStatus();
      console.log(`🏛️ Active Proposals: ${governance.active_proposals}`);
      
      // Queue status
      const queues = await this.getQueueStatus();
      console.log(`📋 Queue Status:`, queues);
      
    } catch (error) {
      console.error('❌ Error getting status:', error);
    }
  }
  
  async listAgents() {
    console.log('🤖 Active Agents:');
    console.log('================');
    
    try {
      const agents = await this.getActiveAgents();
      
      for (const agent of agents) {
        const capabilities = JSON.parse(agent.capabilities || '[]');
        const lastHeartbeat = new Date(agent.last_heartbeat);
        const timeSince = Math.floor((Date.now() - lastHeartbeat.getTime()) / 1000);
        
        console.log(`• ${agent.id}`);
        console.log(`  Status: ${agent.status}`);
        console.log(`  Capabilities: ${capabilities.join(', ')}`);
        console.log(`  Last heartbeat: ${timeSince}s ago`);
        console.log(`  Current task: ${agent.current_task || 'None'}`);
        console.log();
      }
    } catch (error) {
      console.error('❌ Error listing agents:', error);
    }
  }
  
  async showLocks() {
    console.log('🔒 File Locks:');
    console.log('=============');
    
    try {
      const locks = await this.components.lockManager.getAllLocks();
      
      if (Object.keys(locks).length === 0) {
        console.log('No active file locks');
        return;
      }
      
      for (const [file, lockInfo] of Object.entries(locks)) {
        console.log(`• ${file}`);
        console.log(`  Owner: ${lockInfo.owner}`);
        console.log(`  TTL: ${lockInfo.ttl}s`);
        console.log(`  Claimed: ${lockInfo.claimed_at}`);
        if (lockInfo.forced) {
          console.log(`  ⚡ FORCE LOCKED: ${lockInfo.reason}`);
        }
        console.log();
      }
    } catch (error) {
      console.error('❌ Error showing locks:', error);
    }
  }
  
  async unlockFile(filePath, agentId) {
    if (!filePath) {
      console.error('❌ Usage: unlock <file_path> [agent_id]');
      return;
    }
    
    try {
      if (agentId) {
        const result = await this.components.lockManager.releaseFile(filePath, agentId);
        console.log(result.success ? '✅' : '❌', result.message);
      } else {
        // Emergency unlock
        await this.redis.del(`lock:${filePath}`);
        console.log(`🚨 Emergency unlock: ${filePath}`);
      }
    } catch (error) {
      console.error('❌ Error unlocking file:', error);
    }
  }
  
  async sendMessage(targetAgent, message) {
    if (!targetAgent || !message) {
      console.error('❌ Usage: message <agent_id> <message>');
      return;
    }
    
    try {
      await this.components.communication.sendDirectMessage(targetAgent, message);
      console.log(`✅ Message sent to ${targetAgent}`);
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  }
  
  async broadcastMessage(message) {
    if (!message) {
      console.error('❌ Usage: broadcast <message>');
      return;
    }
    
    try {
      await this.components.communication.broadcastMessage(message);
      console.log('✅ Message broadcast');
    } catch (error) {
      console.error('❌ Error broadcasting message:', error);
    }
  }
  
  async showGovernance() {
    console.log('🏛️ Governance Status:');
    console.log('====================');
    
    try {
      const governance = await this.components.governance.getGovernanceStatus();
      
      console.log(`Original Orchestrator: ${governance.original_orchestrator}`);
      console.log(`Governance Threshold: ${governance.governance_threshold}`);
      console.log(`Active Proposals: ${governance.active_proposals}`);
      console.log();
      
      if (governance.active_proposals > 0) {
        console.log('Proposals:');
        for (const [id, proposal] of Object.entries(governance.proposals)) {
          console.log(`• ${id}: ${proposal.title}`);
          console.log(`  Type: ${proposal.type}`);
          console.log(`  Status: ${proposal.status}`);
          console.log(`  Proposed by: ${proposal.proposed_by}`);
          console.log();
        }
      }
    } catch (error) {
      console.error('❌ Error showing governance:', error);
    }
  }
  
  async createProposal(args) {
    console.log('📝 Creating governance proposal...');
    console.log('This is an interactive process.');
    console.log();
    
    // This would typically use a more sophisticated input method
    console.log('⚠️  Use the governance API directly for now:');
    console.log('redis-cli PUBLISH "governance-proposal" \'{"type":"...","agent_id":"..."}\'');
  }
  
  async castVote(proposalId, vote, reasoning) {
    if (!proposalId || !vote) {
      console.error('❌ Usage: vote <proposal_id> <approve|reject|abstain> [reasoning]');
      return;
    }
    
    try {
      await this.components.governance.castVote(proposalId, this.agentId, vote, reasoning);
      console.log(`✅ Vote cast: ${vote}`);
    } catch (error) {
      console.error('❌ Error casting vote:', error);
    }
  }
  
  async cleanup() {
    console.log('🧹 Cleaning up system...');
    
    try {
      // Clean expired locks
      const lockResult = await this.components.lockManager.cleanupExpiredLocks();
      console.log(`✅ Cleaned ${lockResult.cleaned} expired locks`);
      
      // Clean old messages
      const messageKeys = await this.redis.keys('messages:*');
      let cleaned = 0;
      for (const key of messageKeys) {
        const length = await this.redis.llen(key);
        if (length > 100) {
          await this.redis.ltrim(key, 0, 99);
          cleaned++;
        }
      }
      console.log(`✅ Cleaned ${cleaned} message queues`);
      
      console.log('✅ Cleanup complete');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
  
  showHelp() {
    console.log(`
🤖 Multi-Agent Coordination CLI

Usage: node coordination-cli.js <command> [options]

Commands:
  start-orchestrator    Start the delegation orchestrator
  status               Show system status
  agents               List active agents
  locks                Show file locks
  unlock <file> [agent] Unlock a file
  message <agent> <msg> Send direct message
  broadcast <message>   Broadcast to all agents
  governance           Show governance status
  propose              Create governance proposal
  vote <id> <vote> [reason] Cast vote on proposal
  cleanup              Clean up expired locks/messages
  help                 Show this help

Examples:
  node coordination-cli.js start-orchestrator
  node coordination-cli.js status
  node coordination-cli.js message claude-frontend "Hello!"
  node coordination-cli.js unlock src/app.js
  node coordination-cli.js vote proposal_123 approve "Good idea"

Environment Variables:
  REDIS_URL            Redis connection string
  AGENT_ID             CLI agent identifier
`);
  }
  
  async getActiveAgents() {
    const keys = await this.redis.keys('agent:*');
    const agents = [];
    
    for (const key of keys) {
      const agentData = await this.redis.hgetall(key);
      if (agentData.status === 'active') {
        agents.push(agentData);
      }
    }
    
    return agents;
  }
  
  async getQueueStatus() {
    const queueKeys = await this.redis.keys('queue:*');
    const status = {};
    
    for (const key of queueKeys) {
      const queueName = key.replace('queue:', '');
      const length = await this.redis.llen(key);
      status[queueName] = length;
    }
    
    return status;
  }
}

// Run CLI if called directly
if (require.main === module) {
  new CoordinationCLI();
}

module.exports = CoordinationCLI;