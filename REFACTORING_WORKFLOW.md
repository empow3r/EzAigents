# 🔧 REFACTORING WORKFLOW - ACTIVE TASKS

**Last Updated**: 2025-01-09
**Status**: In Progress (5/10 tasks completed)
**Priority**: HIGH - Reducing code duplication

## 📋 TASK QUEUE - CHECK HERE AFTER COMPLETING YOUR WORK

### ✅ Completed Tasks
1. **Base Agent Class** - `/cli/AgentBase.js` - DONE
2. **Redis Manager** - `/shared/redis-manager.js` - DONE
3. **API Cache Consolidation** - `/dashboard/src/utils/unified-api-cache.js` - DONE
4. **Example Agent** - `/agents/claude/refactored-index.js` - DONE
5. **Shared Utilities** - `/shared/utils.js` - DONE

### 🔄 In Progress Tasks
None currently assigned

### 📌 TODO Queue (Priority Order)

#### HIGH PRIORITY
**6. Update All Agent Implementations** 🚨
- [ ] Refactor `/agents/gpt/index.js` to use AgentBase
- [ ] Refactor `/agents/deepseek/index.js` to use AgentBase
- [ ] Refactor `/agents/mistral/index.js` to use AgentBase
- [ ] Refactor `/agents/gemini/index.js` to use AgentBase
- **Template**: See `/agents/claude/refactored-index.js`
- **Reduces**: ~1,200 lines of duplicate code

**7. Create Testing Suite**
- [ ] Create `/test/agents/base-agent.test.js`
- [ ] Create `/test/shared/redis-manager.test.js`
- [ ] Create `/test/shared/utils.test.js`
- [ ] Test each refactored agent
- **Purpose**: Ensure refactoring doesn't break functionality

#### MEDIUM PRIORITY
**8. Unify Dashboard Components**
- [ ] Merge `MainDashboard.jsx` with `OptimizedMainDashboard.jsx`
- [ ] Consolidate duplicate `PerformanceDashboard.jsx` files
- [ ] Remove `/dashboard/src/PerformanceDashboard.jsx` (duplicate)
- **Reduces**: ~1,000 lines of duplicate code

**9. Remove Duplicate API Routes**
- [ ] Consolidate `/dashboard/api/agent-stats.js` and `/dashboard/app/api/agent-stats.js`
- [ ] Check for other duplicate API endpoints
- [ ] Standardize API route structure
- **Reduces**: ~400 lines of duplicate code

**10. Update Documentation**
- [ ] Update `CLAUDE.md` with new architecture
- [ ] Update `README.md` with refactored structure
- [ ] Create migration guide for existing deployments
- [ ] Update agent setup instructions

#### LOW PRIORITY
**11. Enhancement Services Review**
- [ ] Analyze 14 enhancement files in `/cli`
- [ ] Identify overlapping functionality
- [ ] Create consolidation plan
- **Potential reduction**: ~500 lines

## 🎯 AGENT INSTRUCTIONS

### When You Complete Your Current Task:

1. **Mark Complete**: Update this file with [x] next to completed items
2. **Pick Next Task**: Choose the highest priority uncompleted task
3. **Mark In Progress**: Add your agent name next to the task
4. **Update Status**: Add a comment with start time

### Example Update:
```markdown
**6. Update All Agent Implementations** 🚨 [GPT Agent - Started 10:30am]
- [x] Refactor `/agents/gpt/index.js` to use AgentBase ✅
- [ ] Refactor `/agents/deepseek/index.js` to use AgentBase
```

## 📊 Progress Tracking

| Metric | Status |
|--------|--------|
| Tasks Complete | 5/10 (50%) |
| Lines Reduced | ~2,250 |
| Target Reduction | ~5,900 |
| Progress | ████████░░ 38% |

## 🔗 Key Resources

- **Base Agent Class**: `/cli/AgentBase.js`
- **Redis Manager**: `/shared/redis-manager.js`
- **Shared Utils**: `/shared/utils.js`
- **Example Implementation**: `/agents/claude/refactored-index.js`
- **Migration Guide**: `/docs/api-cache-migration.md`
- **Summary**: `/docs/refactoring-summary.md`

## 💡 Quick Start for Agent Refactoring

```javascript
// Old Agent Structure (300+ lines)
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);
// ... lots of duplicate code ...

// New Agent Structure (100 lines)
const AgentBase = require('../../cli/AgentBase');

class YourAgent extends AgentBase {
  constructor() {
    super('agent-id', 'model', 'role', ['capabilities']);
  }
  
  async processTask(file, prompt, taskId, fileContent) {
    // Only agent-specific logic here
  }
}
```

## ⚠️ IMPORTANT NOTES

1. **Test Before Committing**: Run the agent locally after refactoring
2. **Preserve Functionality**: All features must work exactly as before
3. **Update Imports**: Use new shared modules instead of duplicating code
4. **Document Changes**: Update this file when you complete tasks

## 🔄 Redis Queue Check Commands

After completing your task, check for more work:
```bash
# Check refactoring tasks queue
redis-cli LLEN queue:refactoring

# View next task
redis-cli LINDEX queue:refactoring 0

# Check all queues
redis-cli KEYS "queue:*"
```

---
**Remember**: After completing your assigned task, return to this file to pick up the next task from the queue!