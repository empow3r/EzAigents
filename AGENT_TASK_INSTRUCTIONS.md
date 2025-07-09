# 🤖 AGENT TASK INSTRUCTIONS

## How to Check and Claim Tasks

### 1. Check Available Tasks
```bash
node scripts/task-manager.js list
```

### 2. Get Your Next Recommended Task
```bash
node scripts/task-manager.js next claude
node scripts/task-manager.js next gpt  
node scripts/task-manager.js next deepseek
```

### 3. Claim a Task
```bash
node scripts/task-manager.js claim TASK-006 your-agent-name
```

### 4. Complete a Task
```bash
node scripts/task-manager.js complete TASK-006 your-agent-name
```

## 📋 What Each Command Shows

### `list` Command Output:
```
🔧 REFACTORING TASK QUEUE
==================================================
📊 Progress: 5/15 (33%)
⏰ Last Updated: 1/9/2025, 10:45:00 AM

📋 Available Tasks (10):
--------------------------------------------------

🎯 HIGH PRIORITY:

1. [TASK-006] Refactor GPT Agent
   📝 Update /agents/gpt/index.js to use AgentBase class
   📁 Files: /agents/gpt/index.js, /agents/gpt/package.json
   📉 Lines Saved: ~300

2. [TASK-007] Refactor DeepSeek Agent
   📝 Update /agents/deepseek/index.js to use AgentBase class
   📁 Files: /agents/deepseek/index.js, /agents/deepseek/package.json
   📉 Lines Saved: ~300
```

### `claim` Command Output:
```
✅ Task TASK-006 claimed by gpt-agent
📝 Description: Update /agents/gpt/index.js to use AgentBase class
📁 Files to modify: /agents/gpt/index.js, /agents/gpt/package.json
📋 Instructions: Use /agents/claude/refactored-index.js as template. Extend AgentBase, implement processTask method.
```

### `complete` Command Output:
```
🎉 Task TASK-006 completed by gpt-agent!
📊 Progress: 6/15

🔄 Checking for next available task...
[Shows updated task list]
```

## 🎯 Agent-Specific Recommendations

- **Claude**: Architecture tasks, agent refactoring, complex design
- **GPT**: Dashboard components, API endpoints, backend logic  
- **DeepSeek**: Testing, validation, test suite creation
- **Mistral**: Documentation, guides, README updates
- **Gemini**: Analysis, optimization, performance improvements

## 📁 Key Files to Reference

- **Task Queue**: `/ACTIVE_TASK_QUEUE.json`
- **Base Agent Template**: `/agents/claude/refactored-index.js`
- **Shared Utilities**: `/shared/utils.js`
- **Redis Manager**: `/shared/redis-manager.js`
- **Migration Guide**: `/docs/api-cache-migration.md`

## ⚠️ Important Rules

1. **Always check dependencies** - Some tasks require others to be completed first
2. **Test your changes** - Run the agent locally before marking complete
3. **Update the queue** - Use the task-manager script, don't edit JSON directly
4. **Preserve functionality** - All existing features must work exactly as before
5. **Follow the template** - Use existing refactored agents as examples

## 🚀 Quick Workflow

```bash
# 1. Check what's available
node scripts/task-manager.js list

# 2. Get your recommended task
node scripts/task-manager.js next claude

# 3. Claim it
node scripts/task-manager.js claim TASK-006 claude

# 4. Do the work (implement the task)
# ... make your changes ...

# 5. Test it
node agents/gpt/index.js  # or whatever you refactored

# 6. Mark it complete
node scripts/task-manager.js complete TASK-006 claude

# 7. Check for next task
node scripts/task-manager.js next claude
```

## 📊 Progress Tracking

The system automatically tracks:
- Who claimed each task
- When tasks were started/completed
- Lines of code saved
- Overall progress percentage

## 💡 Pro Tips

- Use `details <task-id>` to see full task information
- The `next` command recommends tasks based on your agent type
- High priority tasks should be completed first
- Tasks with dependencies will be filtered out until dependencies are met

---

**Remember**: After completing ANY task, always run `node scripts/task-manager.js next your-agent-type` to get your next assignment!