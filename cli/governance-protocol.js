const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

class GovernanceProtocol {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.originalOrchestrator = 'delegation-orchestrator';
    this.governanceThreshold = 2; // Minimum agents needed for executive decision
    this.visionDocument = 'CLAUDE.md';
    this.sopDocument = 'MULTI_AGENT_PROMPT.md';
    
    this.init();
  }
  
  async init() {
    // Load original vision
    await this.loadOriginalVision();
    
    // Set up governance channels
    await this.setupGovernanceChannels();
    
    console.log('🏛️ Governance Protocol initialized');
  }
  
  async loadOriginalVision() {
    try {
      const visionContent = await fs.readFile(this.visionDocument, 'utf8');
      await this.redis.hset('governance:vision', {
        content: visionContent,
        loaded_at: new Date().toISOString(),
        version: '1.0',
        status: 'active'
      });
      
      console.log('📜 Original vision loaded from CLAUDE.md');
    } catch (error) {
      console.error('❌ Failed to load original vision:', error);
    }
  }
  
  async setupGovernanceChannels() {
    const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Subscribe to governance channels
    await subscriber.subscribe('governance-proposal');
    await subscriber.subscribe('governance-vote');
    await subscriber.subscribe('governance-decision');
    await subscriber.subscribe('executive-override');
    
    subscriber.on('message', async (channel, message) => {
      try {
        const data = JSON.parse(message);
        await this.handleGovernanceMessage(channel, data);
      } catch (error) {
        console.error('❌ Governance message error:', error);
      }
    });
  }
  
  async handleGovernanceMessage(channel, data) {
    switch (channel) {
      case 'governance-proposal':
        await this.processProposal(data);
        break;
      case 'governance-vote':
        await this.processVote(data);
        break;
      case 'governance-decision':
        await this.processDecision(data);
        break;
      case 'executive-override':
        await this.processExecutiveOverride(data);
        break;
    }
  }
  
  async proposeChange(proposalData) {
    const proposal = {
      id: `proposal_${Date.now()}`,
      type: proposalData.type, // 'vision_change', 'sop_update', 'architecture_change'
      title: proposalData.title,
      description: proposalData.description,
      proposed_by: proposalData.agent_id,
      proposed_at: new Date().toISOString(),
      
      // Change details
      current_state: proposalData.current_state,
      proposed_state: proposalData.proposed_state,
      
      // Impact analysis
      value_analysis: proposalData.value_analysis,
      drawback_analysis: proposalData.drawback_analysis,
      research_documentation: proposalData.research_documentation,
      
      // Governance
      requires_orchestrator_approval: proposalData.type === 'vision_change',
      requires_executive_decision: proposalData.major_change || false,
      
      // Voting
      votes: {},
      status: 'pending',
      voting_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
    
    // Store proposal
    await this.redis.hset(`proposal:${proposal.id}`, proposal);
    
    // Notify all agents
    await this.redis.publish('governance-proposal', JSON.stringify({
      type: 'new_proposal',
      proposal
    }));
    
    // Notify original orchestrator if vision change
    if (proposal.requires_orchestrator_approval) {
      await this.redis.lpush(`messages:${this.originalOrchestrator}`, JSON.stringify({
        type: 'governance_proposal',
        from: 'governance-protocol',
        message: `🏛️ Vision change proposal requires your approval: ${proposal.title}`,
        proposal_id: proposal.id,
        priority: 'high'
      }));
    }
    
    console.log(`📋 Proposal ${proposal.id} created: ${proposal.title}`);
    return proposal;
  }
  
  async processProposal(data) {
    const proposal = data.proposal;
    
    // Validate proposal requirements
    const validationResult = await this.validateProposal(proposal);
    
    if (!validationResult.valid) {
      await this.redis.hset(`proposal:${proposal.id}`, 'status', 'rejected');
      await this.redis.hset(`proposal:${proposal.id}`, 'rejection_reason', validationResult.reason);
      
      await this.redis.publish('governance-decision', JSON.stringify({
        type: 'proposal_rejected',
        proposal_id: proposal.id,
        reason: validationResult.reason
      }));
      
      return;
    }
    
    // Start voting process
    await this.initializeVoting(proposal);
  }
  
  async validateProposal(proposal) {
    // Check if research documentation is adequate
    if (!proposal.research_documentation || proposal.research_documentation.length < 200) {
      return {
        valid: false,
        reason: 'Insufficient research documentation. Minimum 200 characters required.'
      };
    }
    
    // Check if value analysis is provided
    if (!proposal.value_analysis || proposal.value_analysis.length < 100) {
      return {
        valid: false,
        reason: 'Insufficient value analysis. Must demonstrate clear benefits.'
      };
    }
    
    // Check if drawback analysis is provided
    if (!proposal.drawback_analysis || proposal.drawback_analysis.length < 100) {
      return {
        valid: false,
        reason: 'Insufficient drawback analysis. Must address potential risks.'
      };
    }
    
    // Check if current state is documented
    if (!proposal.current_state) {
      return {
        valid: false,
        reason: 'Current state must be documented for comparison.'
      };
    }
    
    // Check if proposed state is clear
    if (!proposal.proposed_state) {
      return {
        valid: false,
        reason: 'Proposed state must be clearly defined.'
      };
    }
    
    return { valid: true };
  }
  
  async initializeVoting(proposal) {
    // Get all active agents
    const agents = await this.getActiveAgents();
    
    // Notify all agents about voting
    await this.redis.publish('governance-vote', JSON.stringify({
      type: 'voting_started',
      proposal_id: proposal.id,
      title: proposal.title,
      deadline: proposal.voting_deadline,
      requires_orchestrator_approval: proposal.requires_orchestrator_approval,
      requires_executive_decision: proposal.requires_executive_decision
    }));
    
    // Send direct messages to all agents
    for (const agent of agents) {
      await this.redis.lpush(`messages:${agent.id}`, JSON.stringify({
        type: 'governance_vote_request',
        from: 'governance-protocol',
        message: `🗳️ Vote requested: ${proposal.title}\nDeadline: ${proposal.voting_deadline}`,
        proposal_id: proposal.id,
        priority: 'high'
      }));
    }
    
    console.log(`🗳️ Voting started for proposal ${proposal.id}`);
  }
  
  async castVote(proposalId, agentId, vote, reasoning) {
    const proposal = await this.redis.hgetall(`proposal:${proposalId}`);
    
    if (!proposal || proposal.status !== 'pending') {
      throw new Error('Proposal not found or not in voting state');
    }
    
    // Check voting deadline
    if (new Date() > new Date(proposal.voting_deadline)) {
      throw new Error('Voting deadline has passed');
    }
    
    // Record vote
    const voteData = {
      agent_id: agentId,
      vote: vote, // 'approve', 'reject', 'abstain'
      reasoning: reasoning,
      timestamp: new Date().toISOString()
    };
    
    await this.redis.hset(`vote:${proposalId}:${agentId}`, voteData);
    
    // Update proposal vote count
    const votes = JSON.parse(proposal.votes || '{}');
    votes[agentId] = voteData;
    await this.redis.hset(`proposal:${proposalId}`, 'votes', JSON.stringify(votes));
    
    // Notify vote cast
    await this.redis.publish('governance-vote', JSON.stringify({
      type: 'vote_cast',
      proposal_id: proposalId,
      agent_id: agentId,
      vote: vote
    }));
    
    console.log(`🗳️ Vote cast by ${agentId} for proposal ${proposalId}: ${vote}`);
    
    // Check if voting is complete
    await this.checkVotingCompletion(proposalId);
  }
  
  async checkVotingCompletion(proposalId) {
    const proposal = await this.redis.hgetall(`proposal:${proposalId}`);
    const votes = JSON.parse(proposal.votes || '{}');
    const activeAgents = await this.getActiveAgents();
    
    // Check if all agents have voted or deadline passed
    const allVoted = activeAgents.every(agent => votes[agent.id]);
    const deadlinePassed = new Date() > new Date(proposal.voting_deadline);
    
    if (allVoted || deadlinePassed) {
      await this.finalizeVoting(proposalId);
    }
  }
  
  async finalizeVoting(proposalId) {
    const proposal = await this.redis.hgetall(`proposal:${proposalId}`);
    const votes = JSON.parse(proposal.votes || '{}');
    
    // Count votes
    const voteCount = {
      approve: 0,
      reject: 0,
      abstain: 0
    };
    
    Object.values(votes).forEach(vote => {
      voteCount[vote.vote] = (voteCount[vote.vote] || 0) + 1;
    });
    
    // Determine result
    let decision = 'rejected';
    let decisionReason = 'Insufficient approval votes';
    
    if (voteCount.approve > voteCount.reject) {
      // Check special requirements
      if (proposal.requires_orchestrator_approval) {
        const orchestratorVote = votes[this.originalOrchestrator];
        if (orchestratorVote && orchestratorVote.vote === 'approve') {
          decision = 'approved';
          decisionReason = 'Approved by majority with orchestrator approval';
        } else {
          decision = 'rejected';
          decisionReason = 'Rejected: Original orchestrator approval required';
        }
      } else if (proposal.requires_executive_decision) {
        if (voteCount.approve >= this.governanceThreshold) {
          decision = 'approved';
          decisionReason = `Approved by executive decision (${voteCount.approve} votes)`;
        } else {
          decision = 'rejected';
          decisionReason = `Rejected: Executive decision requires ${this.governanceThreshold}+ votes`;
        }
      } else {
        decision = 'approved';
        decisionReason = 'Approved by majority vote';
      }
    }
    
    // Update proposal
    await this.redis.hset(`proposal:${proposalId}`, {
      status: decision,
      decision_reason: decisionReason,
      final_vote_count: JSON.stringify(voteCount),
      decided_at: new Date().toISOString()
    });
    
    // Notify decision
    await this.redis.publish('governance-decision', JSON.stringify({
      type: 'voting_complete',
      proposal_id: proposalId,
      decision: decision,
      reason: decisionReason,
      vote_count: voteCount
    }));
    
    // If approved, implement changes
    if (decision === 'approved') {
      await this.implementChanges(proposalId);
    }
    
    console.log(`🏛️ Proposal ${proposalId} ${decision}: ${decisionReason}`);
  }
  
  async implementChanges(proposalId) {
    const proposal = await this.redis.hgetall(`proposal:${proposalId}`);
    
    try {
      switch (proposal.type) {
        case 'vision_change':
          await this.updateVisionDocument(proposal);
          break;
        case 'sop_update':
          await this.updateSOPDocument(proposal);
          break;
        case 'architecture_change':
          await this.implementArchitectureChange(proposal);
          break;
      }
      
      // Log implementation
      await this.redis.lpush('governance-implementation-log', JSON.stringify({
        proposal_id: proposalId,
        type: proposal.type,
        implemented_at: new Date().toISOString(),
        implemented_by: 'governance-protocol'
      }));
      
      console.log(`✅ Changes implemented for proposal ${proposalId}`);
      
    } catch (error) {
      console.error(`❌ Failed to implement changes for proposal ${proposalId}:`, error);
      
      // Mark as implementation failed
      await this.redis.hset(`proposal:${proposalId}`, 'implementation_status', 'failed');
      await this.redis.hset(`proposal:${proposalId}`, 'implementation_error', error.message);
    }
  }
  
  async updateVisionDocument(proposal) {
    // Backup current version
    const currentVision = await fs.readFile(this.visionDocument, 'utf8');
    await fs.writeFile(`${this.visionDocument}.backup.${Date.now()}`, currentVision);
    
    // Apply changes
    await fs.writeFile(this.visionDocument, proposal.proposed_state);
    
    // Update Redis
    await this.redis.hset('governance:vision', {
      content: proposal.proposed_state,
      updated_at: new Date().toISOString(),
      version: proposal.id,
      proposal_id: proposal.id
    });
    
    console.log('📜 Vision document updated');
  }
  
  async updateSOPDocument(proposal) {
    // Backup current version
    const currentSOP = await fs.readFile(this.sopDocument, 'utf8');
    await fs.writeFile(`${this.sopDocument}.backup.${Date.now()}`, currentSOP);
    
    // Apply changes
    await fs.writeFile(this.sopDocument, proposal.proposed_state);
    
    // Notify all agents of SOP update
    await this.redis.publish('governance-decision', JSON.stringify({
      type: 'sop_updated',
      proposal_id: proposal.id,
      message: 'Standard Operating Procedures have been updated. Please review.'
    }));
    
    console.log('📋 SOP document updated');
  }
  
  async implementArchitectureChange(proposal) {
    // This would implement actual architecture changes
    // For now, just log the change
    await this.redis.lpush('architecture-changes', JSON.stringify({
      proposal_id: proposal.id,
      change_description: proposal.description,
      implemented_at: new Date().toISOString()
    }));
    
    console.log('🏗️ Architecture change implemented');
  }
  
  async processExecutiveOverride(data) {
    // Handle executive override requests
    const overrideData = {
      id: `override_${Date.now()}`,
      type: data.type,
      reason: data.reason,
      agents_involved: data.agents,
      original_proposal: data.proposal_id,
      timestamp: new Date().toISOString()
    };
    
    // Verify sufficient agents for executive decision
    if (data.agents.length < this.governanceThreshold) {
      throw new Error(`Executive override requires ${this.governanceThreshold}+ agents`);
    }
    
    // Log override
    await this.redis.hset(`override:${overrideData.id}`, overrideData);
    
    // Notify all agents
    await this.redis.publish('governance-decision', JSON.stringify({
      type: 'executive_override',
      override_id: overrideData.id,
      reason: data.reason,
      agents: data.agents
    }));
    
    console.log(`⚡ Executive override executed: ${overrideData.id}`);
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
  
  async getGovernanceStatus() {
    const activeProposals = await this.redis.keys('proposal:*');
    const proposalStatuses = {};
    
    for (const key of activeProposals) {
      const proposalId = key.replace('proposal:', '');
      const proposal = await this.redis.hgetall(key);
      proposalStatuses[proposalId] = {
        title: proposal.title,
        status: proposal.status,
        type: proposal.type,
        proposed_by: proposal.proposed_by
      };
    }
    
    return {
      active_proposals: Object.keys(proposalStatuses).length,
      proposals: proposalStatuses,
      governance_threshold: this.governanceThreshold,
      original_orchestrator: this.originalOrchestrator
    };
  }
}

module.exports = GovernanceProtocol;