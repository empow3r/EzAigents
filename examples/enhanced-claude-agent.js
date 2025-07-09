#!/usr/bin/env node

/**
 * Enhanced Claude Agent with Full Coordination
 * 
 * This example shows how to implement a Claude agent with:
 * - File conflict prevention
 * - Command coordination 
 * - Collaborative assistance
 * - Queue context awareness
 * - Automatic task checking after completion
 */

const EnhancedAgentRunner = require('../cli/enhanced-agent-runner');
const axios = require('axios');
const fs = require('fs').promises;

class EnhancedClaudeAgent extends EnhancedAgentRunner {
  constructor() {
    super('claude', [
      'architecture', 'refactoring', 'documentation', 'security', 'code_review'
    ]);
    
    this.apiKey = process.env.CLAUDE_API_KEY;
    this.model = 'claude-3-opus-20240229';
    this.apiEndpoint = 'https://api.anthropic.com/v1/messages';
    
    if (!this.apiKey) {
      throw new Error('CLAUDE_API_KEY environment variable is required');
    }
    
    console.log(`🤖 Enhanced Claude Agent initialized with full coordination`);
  }

  /**
   * Execute Claude-specific tasks with full coordination
   */
  async executeTask(task) {
    console.log(`🧠 Claude executing task: ${task.file || task.description}`);
    
    try {
      // Prepare context for Claude
      const context = await this.prepareTaskContext(task);
      
      // Call Claude API with coordination-aware prompt
      const response = await this.callClaudeAPI(task, context);
      
      // Process the response with coordination
      const result = await this.processClaudeResponse(task, response);
      
      // Apply changes with file coordination
      if (task.file && result.file_changes) {
        await this.applyFileChanges(task.file, result.file_changes);
      }
      
      // Execute any commands with command coordination
      if (result.commands) {
        await this.executeCoordinatedCommands(result.commands);
      }
      
      return {
        success: true,
        result: result.output,
        changes: result.file_changes,
        commands_executed: result.commands || [],
        agent: this.agentId,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`Claude task execution error: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        agent: this.agentId,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Prepare context for Claude with queue awareness
   */
  async prepareTaskContext(task) {
    const context = {
      task: task,
      agent_capabilities: this.agentCapabilities,
      coordination_mode: true
    };
    
    // Add file context if available
    if (task.file) {
      try {
        const fileContent = await fs.readFile(task.file, 'utf8');
        context.file_content = fileContent;
        context.file_size = fileContent.length;
      } catch (error) {
        context.file_error = error.message;
      }
    }
    
    // Add queue context for better decision making
    try {
      const queueAnalysis = await this.queueContextManager.checkQueueForAdditionalTasks(task);
      context.queue_context = {
        total_tasks: queueAnalysis.queue_analysis.total_tasks,
        related_tasks: queueAnalysis.queue_analysis.related_tasks.slice(0, 3),
        objectives: queueAnalysis.task_context.primary_objective
      };
    } catch (error) {
      context.queue_context_error = error.message;
    }
    
    return context;
  }

  /**
   * Call Claude API with coordination-aware prompt
   */
  async callClaudeAPI(task, context) {
    const prompt = this.buildCoordinationAwarePrompt(task, context);
    
    const response = await axios.post(this.apiEndpoint, {
      model: this.model,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }
    });
    
    return response.data;
  }

  /**
   * Build coordination-aware prompt
   */
  buildCoordinationAwarePrompt(task, context) {
    let prompt = `You are Claude, an AI assistant working in a coordinated multi-agent system.

COORDINATION CONTEXT:
- You are part of a team with GPT, DeepSeek, Mistral, and Gemini agents
- Other agents may be working on related tasks
- You must be aware of the broader context and objectives
- After completing tasks, you should check for additional related work

CURRENT TASK:
${task.prompt || task.description}

FILE CONTEXT:
${context.file_content ? `Current file content:\n\`\`\`\n${context.file_content}\n\`\`\`` : 'No file content available'}

QUEUE CONTEXT:
${context.queue_context ? `
- Total tasks in system: ${context.queue_context.total_tasks}
- Related tasks: ${context.queue_context.related_tasks.map(rt => rt.task.description || rt.task.prompt).join(', ')}
- Primary objective: ${context.queue_context.objectives}
` : 'No queue context available'}

YOUR SPECIALIZATION:
- Architecture design and refactoring
- Code review and documentation
- Security analysis
- System design

COORDINATION REQUIREMENTS:
1. If making file changes, provide specific changes to apply
2. If suggesting commands, list them clearly for coordination
3. Consider how your work relates to other agents' tasks
4. Suggest follow-up tasks that other agents might handle
5. Be mindful of not conflicting with concurrent work

RESPONSE FORMAT:
Provide your response as JSON with the following structure:
{
  "output": "Your main response/analysis",
  "file_changes": [
    {
      "type": "replace|insert|append",
      "line_number": number,
      "old_content": "content to replace",
      "new_content": "new content"
    }
  ],
  "commands": [
    "command1",
    "command2"
  ],
  "follow_up_suggestions": [
    {
      "task": "Description of follow-up task",
      "suitable_agent": "gpt|deepseek|mistral|gemini",
      "priority": "high|medium|low"
    }
  ],
  "collaboration_opportunities": [
    "Description of how other agents could collaborate"
  ]
}

Please proceed with the task while being mindful of the coordination context.`;

    return prompt;
  }

  /**
   * Process Claude's response with coordination awareness
   */
  async processClaudeResponse(task, response) {
    const content = response.content[0].text;
    
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(content);
      
      // Log follow-up suggestions for other agents
      if (parsed.follow_up_suggestions) {
        await this.logFollowUpSuggestions(task, parsed.follow_up_suggestions);
      }
      
      // Share collaboration opportunities
      if (parsed.collaboration_opportunities) {
        await this.shareCollaborationOpportunities(task, parsed.collaboration_opportunities);
      }
      
      return parsed;
      
    } catch (error) {
      // Fallback to plain text response
      return {
        output: content,
        file_changes: [],
        commands: [],
        follow_up_suggestions: [],
        collaboration_opportunities: []
      };
    }
  }

  /**
   * Apply file changes with coordination
   */
  async applyFileChanges(filePath, changes) {
    console.log(`📝 Applying ${changes.length} file changes to ${filePath}`);
    
    // File access is already coordinated by the runner
    // Apply changes sequentially
    
    for (const change of changes) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        
        switch (change.type) {
          case 'replace':
            if (change.line_number && change.line_number <= lines.length) {
              lines[change.line_number - 1] = change.new_content;
            }
            break;
            
          case 'insert':
            if (change.line_number) {
              lines.splice(change.line_number - 1, 0, change.new_content);
            }
            break;
            
          case 'append':
            lines.push(change.new_content);
            break;
        }
        
        await fs.writeFile(filePath, lines.join('\n'));
        console.log(`✅ Applied ${change.type} change to ${filePath}`);
        
      } catch (error) {
        console.error(`❌ Error applying change: ${error.message}`);
      }
    }
  }

  /**
   * Execute commands with coordination
   */
  async executeCoordinatedCommands(commands) {
    console.log(`⚙️  Executing ${commands.length} coordinated commands`);
    
    for (const command of commands) {
      try {
        // Command execution is already coordinated by the runner
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        
        console.log(`🔧 Executing: ${command}`);
        const result = await execPromise(command);
        
        console.log(`✅ Command completed: ${command}`);
        if (result.stdout) console.log(`   Output: ${result.stdout}`);
        if (result.stderr) console.log(`   Error: ${result.stderr}`);
        
      } catch (error) {
        console.error(`❌ Command failed: ${command} - ${error.message}`);
      }
    }
  }

  /**
   * Log follow-up suggestions for other agents
   */
  async logFollowUpSuggestions(task, suggestions) {
    for (const suggestion of suggestions) {
      await this.redis.lpush('follow_up_suggestions', JSON.stringify({
        original_task: task,
        suggestion: suggestion,
        suggested_by: this.agentId,
        timestamp: new Date().toISOString()
      }));
      
      console.log(`💡 Suggested for ${suggestion.suitable_agent}: ${suggestion.task}`);
    }
  }

  /**
   * Share collaboration opportunities
   */
  async shareCollaborationOpportunities(task, opportunities) {
    for (const opportunity of opportunities) {
      await this.redis.publish('collaboration_opportunities', JSON.stringify({
        original_task: task,
        opportunity: opportunity,
        shared_by: this.agentId,
        timestamp: new Date().toISOString()
      }));
      
      console.log(`🤝 Shared collaboration opportunity: ${opportunity}`);
    }
  }
}

// Run the enhanced Claude agent if this file is executed directly
if (require.main === module) {
  const agent = new EnhancedClaudeAgent();
  
  // Start the agent
  agent.start().catch(error => {
    console.error('Failed to start enhanced Claude agent:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down enhanced Claude agent...');
    await agent.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down enhanced Claude agent...');
    await agent.shutdown();
    process.exit(0);
  });
}

module.exports = EnhancedClaudeAgent;