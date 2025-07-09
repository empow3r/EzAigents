// Quick script to apply memory management to all agents
const fs = require('fs');
const path = require('path');

const agents = ['deepseek', 'mistral', 'gemini'];

agents.forEach(agentType => {
  const agentFile = path.join(__dirname, '..', 'agents', agentType, 'index.js');
  
  if (fs.existsSync(agentFile)) {
    let content = fs.readFileSync(agentFile, 'utf-8');
    
    // Add memory manager import
    if (!content.includes('AgentMemoryManager')) {
      content = content.replace(
        "const AgentChatHandler = require('../../cli/agent-chat-handler');",
        "const AgentChatHandler = require('../../cli/agent-chat-handler');\nconst AgentMemoryManager = require('../../cli/agent-memory-manager');"
      );
      
      // Add memory manager initialization
      content = content.replace(
        "const lockManager = new FileLockManager();",
        "const lockManager = new FileLockManager();\nconst memoryManager = new AgentMemoryManager(AGENT_ID, '" + agentType + "', path.resolve('../../'));"
      );
      
      // Add memory management to task processing
      content = content.replace(
        /try {\s*const filePath = path\.resolve\(file\);/,
        "try {\n      const filePath = path.resolve(file);\n      \n      // Save task start to memory\n      memoryManager.startTask(taskId, file, prompt);"
      );
      
      // Add completion and cleanup
      const completionCode = `
      // Save task completion to memory
      memoryManager.completeTask(taskId, outPath, result, isNewFile);
      
      // Verify work before proceeding
      const workVerified = await memoryManager.verifyWork(taskId, filePath);
      if (!workVerified) {
        throw new Error('Work verification failed - output may be corrupted');
      }
      
      // Save learning about this task type
      const taskInsight = \`Successfully \${isNewFile ? 'created' : 'modified'} \${file} - ${agentType} specialization\`;
      memoryManager.saveLearning(taskInsight, '${agentType}_tasks');
      
      await redis.lrem(\`processing:\${MODEL}\`, 1, job);
      console.log(\`✅ ${agentType.toUpperCase()} [\${ROLE}] updated: \${file}\`);
      
      // Clear context after successful completion to save tokens
      await memoryManager.clearContextAfterTask(taskId);`;
      
      content = content.replace(
        /await redis\.lrem\(`processing:\${MODEL}`, 1, job\);\s*console\.log\(`✅.*?\);/,
        completionCode
      );
      
      // Add error memory saving
      content = content.replace(
        /} catch \(e\) {\s*console\.error\(`❌.*?\);/,
        "} catch (e) {\n      console.error(`❌ " + agentType.toUpperCase() + " [${ROLE}] error on ${file}:`, e.message);\n      \n      // Save error to memory for analysis\n      memoryManager.saveError(taskId, e, { file, model: MODEL, role: ROLE });"
      );
      
      fs.writeFileSync(agentFile, content);
      console.log(`✅ Applied memory management to ${agentType} agent`);
    } else {
      console.log(`⚠️ ${agentType} agent already has memory management`);
    }
  } else {
    console.log(`❌ ${agentType} agent file not found`);
  }
});

console.log('🎉 Memory management applied to all agents');