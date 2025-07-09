// Agent Memory Management System - Save work and clear context
const fs = require('fs');
const path = require('path');

class AgentMemoryManager {
  constructor(agentId, agentType, workingDir = process.cwd()) {
    this.agentId = agentId;
    this.agentType = agentType;
    this.workingDir = workingDir;
    this.memoryDir = path.join(workingDir, '.agent-memory', agentType);
    this.sessionFile = path.join(this.memoryDir, 'current-session.md');
    this.completedTasksFile = path.join(this.memoryDir, 'completed-tasks.md');
    this.errorsFile = path.join(this.memoryDir, 'errors.md');
    this.learningsFile = path.join(this.memoryDir, 'learnings.md');
    
    this.ensureDirectories();
    this.currentSession = {
      startTime: new Date().toISOString(),
      tasks: [],
      errors: [],
      learnings: []
    };
  }

  ensureDirectories() {
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
  }

  // Save task details as soon as work starts
  startTask(taskId, file, prompt) {
    const task = {
      id: taskId,
      file,
      prompt,
      startTime: new Date().toISOString(),
      status: 'in_progress'
    };
    
    this.currentSession.tasks.push(task);
    this.saveSessionState();
    
    console.log(`💾 [${this.agentType}] Task ${taskId} started and saved to memory`);
  }

  // Save work completion details
  completeTask(taskId, outputPath, result, isNewFile = false) {
    const task = this.currentSession.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      task.endTime = new Date().toISOString();
      task.outputPath = outputPath;
      task.resultSize = result.length;
      task.isNewFile = isNewFile;
      task.summary = this.generateTaskSummary(task, result);
      
      // Save to permanent completed tasks log
      this.saveCompletedTask(task, result);
      
      console.log(`✅ [${this.agentType}] Task ${taskId} completed and saved to permanent memory`);
    }
  }

  // Save error details for debugging
  saveError(taskId, error, context = {}) {
    const errorRecord = {
      taskId,
      error: error.message || error,
      timestamp: new Date().toISOString(),
      context,
      stack: error.stack || 'No stack trace'
    };
    
    this.currentSession.errors.push(errorRecord);
    
    // Append to permanent error log
    const errorEntry = `## Error - ${new Date().toISOString()}\n` +
      `**Task ID:** ${taskId}\n` +
      `**Error:** ${errorRecord.error}\n` +
      `**Context:** ${JSON.stringify(context, null, 2)}\n` +
      `**Stack:** \`\`\`\n${errorRecord.stack}\n\`\`\`\n\n`;
    
    fs.appendFileSync(this.errorsFile, errorEntry);
    console.log(`❌ [${this.agentType}] Error for task ${taskId} saved to memory`);
  }

  // Save learning/insights for future tasks
  saveLearning(insight, category = 'general') {
    const learning = {
      insight,
      category,
      timestamp: new Date().toISOString(),
      sessionId: this.currentSession.startTime
    };
    
    this.currentSession.learnings.push(learning);
    
    // Append to permanent learnings log
    const learningEntry = `## Learning - ${new Date().toISOString()}\n` +
      `**Category:** ${category}\n` +
      `**Insight:** ${insight}\n\n`;
    
    fs.appendFileSync(this.learningsFile, learningEntry);
    console.log(`🧠 [${this.agentType}] Learning saved: ${category} - ${insight.substring(0, 50)}...`);
  }

  // Generate summary of what was accomplished in the task
  generateTaskSummary(task, result) {
    const lines = result.split('\n').length;
    const functions = (result.match(/function\s+\w+/g) || []).length;
    const classes = (result.match(/class\s+\w+/g) || []).length;
    const imports = (result.match(/(?:import|require)\s*\(/g) || []).length;
    
    return {
      linesOfCode: lines,
      functions,
      classes,
      imports,
      type: task.isNewFile ? 'creation' : 'modification',
      executionTime: new Date(task.endTime) - new Date(task.startTime)
    };
  }

  // Save completed task to permanent log with full details
  saveCompletedTask(task, result) {
    const entry = `## Task Completed - ${task.endTime}\n` +
      `**ID:** ${task.id}\n` +
      `**File:** ${task.file}\n` +
      `**Type:** ${task.isNewFile ? 'New File Creation' : 'File Modification'}\n` +
      `**Execution Time:** ${task.summary.executionTime}ms\n` +
      `**Lines of Code:** ${task.summary.linesOfCode}\n` +
      `**Functions:** ${task.summary.functions}\n` +
      `**Classes:** ${task.summary.classes}\n` +
      `**Prompt:** ${task.prompt}\n` +
      `**Output Path:** ${task.outputPath}\n` +
      `**Result Preview:**\n\`\`\`javascript\n${result.substring(0, 500)}${result.length > 500 ? '...' : ''}\n\`\`\`\n\n`;
    
    fs.appendFileSync(this.completedTasksFile, entry);
  }

  // Save current session state
  saveSessionState() {
    const sessionData = `# Agent Session - ${this.agentType}\n` +
      `**Agent ID:** ${this.agentId}\n` +
      `**Start Time:** ${this.currentSession.startTime}\n` +
      `**Tasks Completed:** ${this.currentSession.tasks.filter(t => t.status === 'completed').length}\n` +
      `**Tasks In Progress:** ${this.currentSession.tasks.filter(t => t.status === 'in_progress').length}\n` +
      `**Errors:** ${this.currentSession.errors.length}\n` +
      `**Learnings:** ${this.currentSession.learnings.length}\n\n` +
      `## Current Tasks\n` +
      this.currentSession.tasks.map(t => 
        `- [${t.status === 'completed' ? 'x' : ' '}] ${t.id}: ${t.file} (${t.status})`
      ).join('\n') + '\n\n';
    
    fs.writeFileSync(this.sessionFile, sessionData);
  }

  // Test that work is functioning before clearing context
  async verifyWork(taskId, filePath) {
    const task = this.currentSession.tasks.find(t => t.id === taskId);
    if (!task) return false;

    const verificationResults = {
      fileExists: fs.existsSync(filePath),
      fileSize: 0,
      syntaxValid: false,
      hasRequiredContent: false
    };

    try {
      if (verificationResults.fileExists) {
        const stats = fs.statSync(filePath);
        verificationResults.fileSize = stats.size;
        
        // Basic syntax check for JS files
        if (filePath.endsWith('.js')) {
          const content = fs.readFileSync(filePath, 'utf-8');
          require('vm').createScript(content); // Will throw if syntax error
          verificationResults.syntaxValid = true;
          
          // Check if file has meaningful content (not just comments)
          const meaningfulLines = content.split('\n').filter(line => 
            line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('*')
          );
          verificationResults.hasRequiredContent = meaningfulLines.length > 5;
        } else {
          verificationResults.syntaxValid = true;
          verificationResults.hasRequiredContent = verificationResults.fileSize > 100;
        }
      }
    } catch (error) {
      this.saveError(taskId, error, { verification: true, filePath });
      return false;
    }

    const isValid = verificationResults.fileExists && 
                   verificationResults.fileSize > 0 && 
                   verificationResults.syntaxValid && 
                   verificationResults.hasRequiredContent;

    console.log(`🔍 [${this.agentType}] Verification for ${taskId}: ${isValid ? 'PASSED' : 'FAILED'}`, verificationResults);
    
    return isValid;
  }

  // Clear context after saving everything
  async clearContextAfterTask(taskId) {
    const task = this.currentSession.tasks.find(t => t.id === taskId);
    if (!task || task.status !== 'completed') {
      console.log(`⚠️ [${this.agentType}] Cannot clear context - task ${taskId} not completed`);
      return false;
    }

    // Final save of all session data
    this.saveSessionState();
    
    // Clear the current session but keep completed task count
    const completedCount = this.currentSession.tasks.filter(t => t.status === 'completed').length;
    
    this.currentSession = {
      startTime: new Date().toISOString(),
      tasks: [],
      errors: [],
      learnings: [],
      previousSessionCompletedTasks: completedCount
    };

    console.log(`🧹 [${this.agentType}] Context cleared after completing task ${taskId}. Ready for new work.`);
    return true;
  }

  // Get performance stats for the agent
  getPerformanceStats() {
    if (!fs.existsSync(this.completedTasksFile)) return null;
    
    const content = fs.readFileSync(this.completedTasksFile, 'utf-8');
    const tasks = content.split('## Task Completed').length - 1;
    
    return {
      totalTasks: tasks,
      currentSessionTasks: this.currentSession.tasks.filter(t => t.status === 'completed').length,
      errorCount: this.currentSession.errors.length,
      learningCount: this.currentSession.learnings.length
    };
  }

  // Update agent-specific documentation
  updateAgentDocumentation(updates) {
    const docFile = path.join(this.workingDir, `docs/${this.agentType}-agent.md`);
    
    if (!fs.existsSync(path.dirname(docFile))) {
      fs.mkdirSync(path.dirname(docFile), { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const docEntry = `## Update - ${timestamp}\n` +
      `**Agent:** ${this.agentType}\n` +
      `**Updates:** ${JSON.stringify(updates, null, 2)}\n\n`;
    
    fs.appendFileSync(docFile, docEntry);
    
    // Update CLAUDE.md with agent improvements
    this.updateClaudeMd(updates);
  }

  // Update main CLAUDE.md with agent learnings
  updateClaudeMd(updates) {
    const claudeFile = path.join(this.workingDir, 'CLAUDE.md');
    if (!fs.existsSync(claudeFile)) return;

    const agentSection = `\n## ${this.agentType.toUpperCase()} Agent Updates - ${new Date().toISOString()}\n` +
      JSON.stringify(updates, null, 2) + '\n';
    
    fs.appendFileSync(claudeFile, agentSection);
  }
}

module.exports = AgentMemoryManager;