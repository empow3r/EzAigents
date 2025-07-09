const AgentCoordinator = require('./coordination-service');
const FileLockManager = require('./file-lock-manager');
const AgentCommunication = require('./agent-communication');

class DelegationOrchestrator {
  constructor(agentId = 'delegation-orchestrator') {
    this.agentId = agentId;
    this.coordinator = new AgentCoordinator(agentId, ['orchestration', 'delegation', 'coordination'], 'critical');
    this.fileLockManager = new FileLockManager();
    this.communication = new AgentCommunication(agentId);
    this.todoList = [];
    this.agentAssignments = {};
    this.completedTasks = [];
    
    this.init();
  }
  
  async init() {
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize todo management
    await this.initializeTodoManagement();
    
    // Start monitoring
    this.startMonitoring();
    
    console.log('🎯 Delegation Orchestrator initialized');
  }
  
  setupEventListeners() {
    this.communication.on('directMessage', async (data) => {
      await this.handleDirectMessage(data);
    });
    
    this.communication.on('agentRegistryEvent', async (data) => {
      await this.handleAgentRegistryEvent(data);
    });
    
    this.communication.on('projectUpdate', async (data) => {
      await this.handleProjectUpdate(data);
    });
  }
  
  async initializeTodoManagement() {
    // Load existing todos from Redis
    const existingTodos = await this.coordinator.redis.lrange('global-todos', 0, -1);
    this.todoList = existingTodos.map(todo => JSON.parse(todo));
    
    // Initialize default project todos
    if (this.todoList.length === 0) {
      await this.createInitialTodos();
    }
    
    console.log(`📋 Loaded ${this.todoList.length} todos`);
  }
  
  async createInitialTodos() {
    const initialTodos = [
      {
        id: 'todo-1',
        title: 'Fix Dashboard Authentication',
        description: 'Resolve Next.js authentication issues in dashboard',
        priority: 'high',
        status: 'pending',
        files: ['dashboard/src/app.jsx', 'dashboard/components/Auth.jsx'],
        capabilities_needed: ['react', 'nextjs', 'authentication'],
        estimated_time: 120, // minutes
        created_at: new Date().toISOString()
      },
      {
        id: 'todo-2',
        title: 'Implement Redis Queue Monitoring',
        description: 'Add real-time queue monitoring to dashboard',
        priority: 'medium',
        status: 'pending',
        files: ['dashboard/api/metrics.js', 'cli/runner.js'],
        capabilities_needed: ['redis', 'nodejs', 'monitoring'],
        estimated_time: 90,
        created_at: new Date().toISOString()
      },
      {
        id: 'todo-3',
        title: 'Enhance Agent Error Handling',
        description: 'Improve error handling and retry logic in agents',
        priority: 'medium',
        status: 'pending',
        files: ['agents/*/index.js', 'cli/runner.js'],
        capabilities_needed: ['nodejs', 'error-handling', 'redis'],
        estimated_time: 150,
        created_at: new Date().toISOString()
      },
      {
        id: 'todo-4',
        title: 'Add Agent Health Checks',
        description: 'Implement health check endpoints for all agents',
        priority: 'medium',
        status: 'pending',
        files: ['agents/*/index.js', 'check-agents.sh'],
        capabilities_needed: ['nodejs', 'health-checks', 'monitoring'],
        estimated_time: 60,
        created_at: new Date().toISOString()
      },
      {
        id: 'todo-5',
        title: 'Optimize Token Usage',
        description: 'Implement token usage optimization and cost tracking',
        priority: 'low',
        status: 'pending',
        files: ['cli/cost_model.js', 'shared/tokenpool.json'],
        capabilities_needed: ['cost-optimization', 'analytics'],
        estimated_time: 180,
        created_at: new Date().toISOString()
      }
    ];
    
    this.todoList = initialTodos;
    await this.saveTodos();
    
    // Announce initial todos
    await this.communication.broadcastMessage(
      `📋 Initial todo list created with ${initialTodos.length} tasks. Ready for delegation!`,
      'todo_announcement'
    );
  }
  
  async delegateTask(todoId, agentId = null) {
    const todo = this.todoList.find(t => t.id === todoId);
    if (!todo) {
      throw new Error(`Todo ${todoId} not found`);
    }
    
    if (todo.status !== 'pending') {
      throw new Error(`Todo ${todoId} is not available for delegation (status: ${todo.status})`);
    }
    
    // Auto-assign if no agent specified
    if (!agentId) {
      agentId = await this.findBestAgent(todo);
    }
    
    if (!agentId) {
      throw new Error(`No suitable agent found for todo ${todoId}`);
    }
    
    // Claim files for the agent
    const fileClaims = [];
    for (const file of todo.files) {
      const claimed = await this.fileLockManager.claimFile(file, agentId, 7200); // 2 hours
      fileClaims.push({ file, claimed: claimed.success });
    }
    
    // Update todo status
    todo.status = 'assigned';
    todo.assigned_to = agentId;
    todo.assigned_at = new Date().toISOString();
    todo.file_claims = fileClaims;
    
    this.agentAssignments[agentId] = this.agentAssignments[agentId] || [];
    this.agentAssignments[agentId].push(todoId);
    
    await this.saveTodos();
    
    // Notify the agent
    await this.communication.sendDirectMessage(agentId, 
      `🎯 Task assigned: ${todo.title}\n` +
      `Description: ${todo.description}\n` +
      `Priority: ${todo.priority}\n` +
      `Files: ${todo.files.join(', ')}\n` +
      `Estimated time: ${todo.estimated_time} minutes\n` +
      `Task ID: ${todoId}`,
      'task_assignment',
      todo.priority
    );
    
    // Broadcast assignment
    await this.communication.broadcastMessage(
      `🎯 Task "${todo.title}" assigned to ${agentId}`,
      'delegation_update'
    );
    
    console.log(`✅ Task ${todoId} delegated to ${agentId}`);
    return { success: true, todo, agent: agentId };
  }
  
  async findBestAgent(todo) {
    const activeAgents = await this.communication.getOnlineAgents();
    const candidates = [];
    
    for (const agent of activeAgents) {
      if (agent.id === this.agentId) continue; // Skip self
      
      const capabilities = JSON.parse(agent.capabilities || '[]');
      const score = this.calculateAgentScore(todo, capabilities, agent);
      
      if (score > 0) {
        candidates.push({ agent: agent.id, score, capabilities });
      }
    }
    
    // Sort by score (descending)
    candidates.sort((a, b) => b.score - a.score);
    
    return candidates.length > 0 ? candidates[0].agent : null;
  }
  
  calculateAgentScore(todo, capabilities, agent) {
    let score = 0;
    
    // Capability matching
    const neededCapabilities = todo.capabilities_needed || [];
    const matchedCapabilities = capabilities.filter(cap => 
      neededCapabilities.includes(cap)
    );
    score += matchedCapabilities.length * 10;
    
    // Priority bonus
    if (todo.priority === 'high') score += 20;
    if (todo.priority === 'medium') score += 10;
    
    // Agent availability (fewer current tasks = higher score)
    const currentTasks = this.agentAssignments[agent.id] || [];
    score -= currentTasks.length * 5;
    
    // Agent priority (higher priority agents get preference)
    if (agent.priority === 'high') score += 15;
    if (agent.priority === 'critical') score += 25;
    
    return score;
  }
  
  async completeTask(todoId, agentId, results = {}) {
    const todo = this.todoList.find(t => t.id === todoId);
    if (!todo) {
      throw new Error(`Todo ${todoId} not found`);
    }
    
    if (todo.assigned_to !== agentId) {
      throw new Error(`Todo ${todoId} is not assigned to ${agentId}`);
    }
    
    // Release file locks
    if (todo.file_claims) {
      for (const claim of todo.file_claims) {
        if (claim.claimed) {
          await this.fileLockManager.releaseFile(claim.file, agentId);
        }
      }
    }
    
    // Update todo status
    todo.status = 'completed';
    todo.completed_at = new Date().toISOString();
    todo.results = results;
    
    // Remove from agent assignments
    if (this.agentAssignments[agentId]) {
      this.agentAssignments[agentId] = this.agentAssignments[agentId].filter(id => id !== todoId);
    }
    
    // Add to completed tasks
    this.completedTasks.push(todo);
    
    await this.saveTodos();
    
    // Notify completion
    await this.communication.broadcastMessage(
      `✅ Task "${todo.title}" completed by ${agentId}`,
      'task_completion'
    );
    
    console.log(`✅ Task ${todoId} completed by ${agentId}`);
    
    // Check if agent is free for more tasks
    await this.checkForMoreTasks(agentId);
    
    return { success: true, todo };
  }
  
  async checkForMoreTasks(agentId) {
    const pendingTasks = this.todoList.filter(t => t.status === 'pending');
    
    if (pendingTasks.length > 0) {
      const agent = await this.coordinator.redis.hgetall(`agent:${agentId}`);
      const capabilities = JSON.parse(agent.capabilities || '[]');
      
      // Find best matching task
      let bestTask = null;
      let bestScore = 0;
      
      for (const task of pendingTasks) {
        const score = this.calculateAgentScore(task, capabilities, agent);
        if (score > bestScore) {
          bestScore = score;
          bestTask = task;
        }
      }
      
      if (bestTask) {
        await this.communication.sendDirectMessage(agentId,
          `🔄 Ready for more work? Task "${bestTask.title}" is available. Reply with "accept ${bestTask.id}" to take it.`,
          'task_suggestion'
        );
      }
    }
  }
  
  async handleDirectMessage(data) {
    const message = data.message.toLowerCase();
    
    // Handle task acceptance
    if (message.startsWith('accept ')) {
      const todoId = message.replace('accept ', '');
      try {
        await this.delegateTask(todoId, data.from);
        await this.communication.sendDirectMessage(data.from, `✅ Task ${todoId} assigned to you!`);
      } catch (error) {
        await this.communication.sendDirectMessage(data.from, `❌ Error assigning task: ${error.message}`);
      }
    }
    
    // Handle task completion
    if (message.startsWith('complete ')) {
      const todoId = message.replace('complete ', '');
      try {
        await this.completeTask(todoId, data.from);
        await this.communication.sendDirectMessage(data.from, `✅ Task ${todoId} marked as completed!`);
      } catch (error) {
        await this.communication.sendDirectMessage(data.from, `❌ Error completing task: ${error.message}`);
      }
    }
    
    // Handle status requests
    if (message === 'status' || message === 'todos') {
      const status = await this.getProjectStatus();
      await this.communication.sendDirectMessage(data.from, status);
    }
    
    // Handle help requests
    if (message === 'help') {
      const help = this.getHelpMessage();
      await this.communication.sendDirectMessage(data.from, help);
    }
  }
  
  async getProjectStatus() {
    const pending = this.todoList.filter(t => t.status === 'pending').length;
    const assigned = this.todoList.filter(t => t.status === 'assigned').length;
    const completed = this.todoList.filter(t => t.status === 'completed').length;
    
    return `📊 Project Status:\n` +
           `• Pending: ${pending}\n` +
           `• Assigned: ${assigned}\n` +
           `• Completed: ${completed}\n` +
           `• Total: ${this.todoList.length}\n\n` +
           `Active Agents: ${Object.keys(this.agentAssignments).length}`;
  }
  
  getHelpMessage() {
    return `🤖 Delegation Orchestrator Commands:\n` +
           `• "accept <task_id>" - Accept a suggested task\n` +
           `• "complete <task_id>" - Mark task as completed\n` +
           `• "status" or "todos" - View project status\n` +
           `• "help" - Show this help message\n\n` +
           `I'll automatically suggest tasks based on your capabilities!`;
  }
  
  async saveTodos() {
    await this.coordinator.redis.del('global-todos');
    for (const todo of this.todoList) {
      await this.coordinator.redis.lpush('global-todos', JSON.stringify(todo));
    }
  }
  
  startMonitoring() {
    // Monitor agent heartbeats every 2 minutes
    setInterval(async () => {
      await this.checkAgentHealth();
    }, 120000);
    
    // Auto-delegate high priority tasks every 30 seconds
    setInterval(async () => {
      await this.autoDelegateHighPriorityTasks();
    }, 30000);
  }
  
  async checkAgentHealth() {
    const now = Date.now();
    const staleThreshold = 180000; // 3 minutes
    
    for (const [agentId, tasks] of Object.entries(this.agentAssignments)) {
      const agentData = await this.coordinator.redis.hgetall(`agent:${agentId}`);
      
      if (agentData.last_heartbeat) {
        const lastHeartbeat = new Date(agentData.last_heartbeat).getTime();
        
        if (now - lastHeartbeat > staleThreshold) {
          console.log(`⚠️  Agent ${agentId} appears stale, reassigning tasks`);
          await this.reassignAgentTasks(agentId);
        }
      }
    }
  }
  
  async reassignAgentTasks(staleAgentId) {
    const tasks = this.agentAssignments[staleAgentId] || [];
    
    for (const todoId of tasks) {
      const todo = this.todoList.find(t => t.id === todoId);
      if (todo && todo.status === 'assigned') {
        // Reset task to pending
        todo.status = 'pending';
        todo.assigned_to = null;
        todo.assigned_at = null;
        
        // Release file locks
        if (todo.file_claims) {
          for (const claim of todo.file_claims) {
            if (claim.claimed) {
              await this.fileLockManager.releaseFile(claim.file, staleAgentId);
            }
          }
        }
        
        console.log(`🔄 Task ${todoId} reset to pending due to stale agent`);
      }
    }
    
    delete this.agentAssignments[staleAgentId];
    await this.saveTodos();
  }
  
  async autoDelegateHighPriorityTasks() {
    const highPriorityTasks = this.todoList.filter(t => 
      t.status === 'pending' && t.priority === 'high'
    );
    
    for (const task of highPriorityTasks) {
      try {
        await this.delegateTask(task.id);
      } catch (error) {
        // Task couldn't be delegated, will try again later
      }
    }
  }
}

module.exports = DelegationOrchestrator;