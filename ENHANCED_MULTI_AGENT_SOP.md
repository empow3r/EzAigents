# Enhanced Multi-Agent Collaboration SOP v2.0

## Overview
This document defines the Standard Operating Procedures for the enhanced Ez Aigent multi-agent collaboration system. The system now features advanced coordination, health monitoring, auto-recovery, and real-time dashboard capabilities.

## 🔧 System Architecture

### Core Components
1. **Enhanced Orchestrator** (`cli/runner.js`) - Central task distribution with coordination
2. **Agent Communication System** (`cli/agent-communication.js`) - Advanced messaging & coordination
3. **File Lock Manager** (`cli/file-lock-manager.js`) - Sophisticated file locking with priority
4. **Health Monitor** (`cli/agent-health-monitor.js`) - Real-time health tracking & auto-recovery
5. **Coordination Dashboard** (`dashboard/src/AgentDashboard.jsx`) - Real-time monitoring UI

### Agent Types & Specializations
- **Claude Agents**: Architecture, refactoring, complex reasoning (claude-[specialty])
- **GPT Agents**: Backend logic, API development (gpt-[specialty])
- **DeepSeek Agents**: Testing, validation, type generation (deepseek-[specialty])
- **Mistral Agents**: Documentation, technical writing (mistral-[specialty])
- **Gemini Agents**: Code analysis, optimization (gemini-[specialty])

## 🚀 Enhanced Protocols

### 1. Agent Registration & Identity

```bash
# Register as a specialized agent
AGENT_ID="claude-frontend-specialist"
CAPABILITIES='["react", "typescript", "ui", "frontend"]'

redis-cli HSET "agent:$AGENT_ID" \
  "id" "$AGENT_ID" \
  "capabilities" "$CAPABILITIES" \
  "status" "active" \
  "registered_at" "$(date -Iseconds)" \
  "last_heartbeat" "$(date -Iseconds)"

# Announce registration
redis-cli PUBLISH "agent-registry" '{
  "type": "agent_registered",
  "agent": {
    "id": "'$AGENT_ID'",
    "capabilities": ["react", "typescript", "ui", "frontend"]
  }
}'
```

### 2. Advanced File Locking Protocol

#### Basic File Locking
```bash
# Claim file with priority and duration
redis-cli EVAL '
  local lockKey = "lock:" .. ARGV[1]
  local lockValue = cjson.encode({
    agent = ARGV[2],
    timestamp = ARGV[3],
    duration = tonumber(ARGV[4]),
    priority = ARGV[5],
    heartbeat = ARGV[3]
  })
  return redis.call("SET", lockKey, lockValue, "EX", ARGV[4], "NX")
' 0 "src/components/Auth.tsx" "$AGENT_ID" "$(date +%s)" "1800" "high"
```

#### Coordination Request
```bash
# Request coordination for locked file
redis-cli PUBLISH "coordination-required" '{
  "type": "coordination_request",
  "requesting_agent": "'$AGENT_ID'",
  "file": "src/components/Auth.tsx",
  "priority": "high",
  "reason": "Need to implement new authentication flow"
}'
```

#### Force Lock (Emergency Only)
```bash
# Force lock for critical issues
redis-cli EVAL '
  local lockKey = "lock:" .. ARGV[1]
  local lockValue = cjson.encode({
    agent = ARGV[2],
    timestamp = ARGV[3],
    duration = 1800,
    priority = "critical",
    force_locked = true,
    reason = ARGV[4]
  })
  redis.call("SET", lockKey, lockValue, "EX", 1800)
  return "OK"
' 0 "src/components/Auth.tsx" "$AGENT_ID" "$(date +%s)" "critical_security_fix"
```

### 3. Enhanced Communication Protocols

#### Direct Messaging
```bash
# Send direct message to another agent
redis-cli LPUSH "messages:claude-backend-specialist" '{
  "type": "code_review_request",
  "from": "'$AGENT_ID'",
  "message": "Please review the authentication API changes",
  "file": "src/api/auth.ts",
  "priority": "high",
  "timestamp": "'$(date -Iseconds)'"
}'
```

#### Broadcast Communication
```bash
# Broadcast to all agents
redis-cli PUBLISH "agent-chat" '{
  "type": "announcement",
  "from": "'$AGENT_ID'",
  "message": "Starting major refactor of authentication system",
  "priority": "normal",
  "timestamp": "'$(date -Iseconds)'"
}'
```

#### Emergency Communication
```bash
# Send emergency alert
redis-cli PUBLISH "agent-emergency" '{
  "type": "critical_error",
  "from": "'$AGENT_ID'",
  "message": "Database connection lost, halting all write operations",
  "severity": "critical",
  "timestamp": "'$(date -Iseconds)'"
}'
```

### 4. Health Monitoring & Heartbeat

#### Regular Heartbeat
```bash
# Send heartbeat every 30 seconds
while true; do
  redis-cli PUBLISH "agent-heartbeat" '{
    "agent_id": "'$AGENT_ID'",
    "timestamp": "'$(date -Iseconds)'",
    "status": "active",
    "metrics": {
      "cpu_usage": 45,
      "memory_usage": 67,
      "active_tasks": 2
    }
  }'
  sleep 30
done
```

#### Status Updates
```bash
# Update status when starting/completing tasks
redis-cli PUBLISH "agent-status" '{
  "agent_id": "'$AGENT_ID'",
  "status": "busy",
  "current_task": "Refactoring authentication components",
  "progress": 65,
  "timestamp": "'$(date -Iseconds)'"
}'
```

#### Error Reporting
```bash
# Report errors for health monitoring
redis-cli PUBLISH "agent-errors" '{
  "agent_id": "'$AGENT_ID'",
  "error": "TypeScript compilation failed",
  "severity": "medium",
  "file": "src/components/LoginForm.tsx",
  "timestamp": "'$(date -Iseconds)'"
}'
```

## 🤝 Coordination Workflows

### 1. File Conflict Resolution

#### When You Need a Locked File:
1. **Check Lock Status**
   ```bash
   redis-cli GET "lock:src/components/Auth.tsx"
   ```

2. **Request Coordination** (if locked)
   ```bash
   redis-cli PUBLISH "coordination-required" '{
     "requesting_agent": "'$AGENT_ID'",
     "owning_agent": "claude-backend-specialist", 
     "file": "src/components/Auth.tsx",
     "reason": "Need to update UI to match API changes"
   }'
   ```

3. **Wait for Response** or **Escalate Priority**

#### When Someone Requests Your File:
1. **Receive Coordination Request**
2. **Evaluate Priority** (your task vs. their task)
3. **Respond with Action:**
   - Release file if their priority is higher
   - Negotiate timeline if both critical
   - Deny if your work is more urgent

### 2. Code Review Protocol

#### Requesting Review:
```bash
redis-cli PUBLISH "code-review-requests" '{
  "type": "code_review",
  "from": "'$AGENT_ID'",
  "file": "src/api/auth.ts",
  "message": "Please review security implementation",
  "reviewer_capability_required": ["security", "backend"],
  "priority": "high"
}'
```

#### Accepting Review:
```bash
redis-cli LPUSH "messages:$REQUESTING_AGENT" '{
  "type": "review_accepted",
  "from": "'$AGENT_ID'",
  "message": "I will review src/api/auth.ts",
  "estimated_completion": "'$(date -d '+30 minutes' -Iseconds)'"
}'
```

### 3. Multi-Agent Collaboration

#### Project Coordination:
```bash
# Start collaborative session
redis-cli HSET "project:auth-refactor" \
  "lead_agent" "$AGENT_ID" \
  "status" "active" \
  "participants" "claude-frontend,claude-backend,deepseek-testing" \
  "files" "src/components/Auth.tsx,src/api/auth.ts,tests/auth.test.ts"

# Invite participants
redis-cli PUBLISH "project-invitations" '{
  "project": "auth-refactor",
  "lead": "'$AGENT_ID'",
  "participants": ["claude-backend-specialist", "deepseek-testing-specialist"],
  "timeline": "2 hours",
  "priority": "high"
}'
```

## 🔍 Monitoring & Dashboard

### Real-time Monitoring URLs:
- **Main Dashboard**: `http://localhost:3000/dashboard`
- **Agent Health**: `http://localhost:3000/api/agent-health`
- **File Locks**: `http://localhost:3000/api/file-locks`
- **Coordination Events**: `http://localhost:3000/api/coordination-events`

### Key Metrics Tracked:
- **Agent Status**: active, idle, unresponsive, crashed, recovering
- **File Lock Status**: active locks, timeouts, coordination requests
- **Health Metrics**: heartbeat intervals, error counts, recovery attempts
- **System Health**: overall percentage, agent availability

## 🚨 Emergency Procedures

### 1. Agent Crash Recovery
```bash
# Automatic recovery triggered by health monitor
# Manual recovery commands:

# Check crashed agent status
redis-cli HGETALL "agent:$CRASHED_AGENT_ID"

# Attempt restart
redis-cli PUBLISH "agent-commands" '{
  "type": "restart",
  "target_agent": "'$CRASHED_AGENT_ID'",
  "reason": "crash_recovery"
}'

# Emergency release all locks
redis-cli KEYS "lock:*" | xargs -I {} redis-cli DEL {}
```

### 2. System Overload Response
```bash
# Pause non-critical agents
redis-cli PUBLISH "agent-commands" '{
  "type": "pause_non_critical",
  "reason": "system_overload"
}'

# Scale down idle agents
redis-cli PUBLISH "agent-commands" '{
  "type": "graceful_shutdown",
  "target_criteria": {"status": "idle", "priority": "low"}
}'
```

### 3. Human Escalation
```bash
# Escalate to human intervention
redis-cli LPUSH "human-escalations" '{
  "type": "human_intervention_required",
  "agent_id": "'$AGENT_ID'",
  "reason": "repeated_recovery_failures",
  "attempts": 5,
  "timestamp": "'$(date -Iseconds)'"
}'
```

## 📊 Performance Optimization

### 1. Token Usage Optimization
- **DeepSeek**: Use for high-volume, simple tasks (testing, validation)
- **Claude**: Reserve for complex reasoning and architecture
- **GPT**: Balance cost and capability for backend logic
- **Mistral**: Efficient for documentation and comments

### 2. Coordination Efficiency
- **Priority Levels**: critical > high > normal > low
- **Lock Duration**: Match to task complexity (5-30 minutes typical)
- **Heartbeat Frequency**: 30 seconds for active agents
- **Health Check Interval**: 30 seconds with 90-second timeout

### 3. System Scaling
- **Horizontal**: Add more agents of same type
- **Vertical**: Increase token limits per agent
- **Load Balancing**: Distribute tasks based on agent availability

## 🔐 Security Protocols

### 1. API Key Management
```bash
# Rotate API keys automatically
export API_KEY_POOL="sk-key1,sk-key2,sk-key3"
# Keys stored in environment, rotated in tokenpool.json
```

### 2. File Access Control
- **Lock Validation**: Verify ownership before file operations
- **Audit Logging**: All file operations logged to Redis
- **Force Lock Monitoring**: Emergency overrides logged and reviewed

### 3. Agent Authentication
- **Registration Required**: All agents must register with capabilities
- **Heartbeat Validation**: Silent agents marked as unresponsive
- **Communication Encryption**: Redis AUTH enabled in production

## 🛠️ Troubleshooting Guide

### Common Issues:

#### 1. Agent Not Responding
```bash
# Check agent status
redis-cli HGETALL "agent:$AGENT_ID"

# Check recent errors
redis-cli LRANGE "agent:errors:$AGENT_ID" 0 10

# Send ping
redis-cli PUBLISH "agent-health-ping" '{"target_agent": "'$AGENT_ID'"}'
```

#### 2. File Lock Stuck
```bash
# Check lock details
redis-cli GET "lock:$FILE_PATH"
redis-cli HGETALL "lock:meta:$FILE_PATH"

# Force release (if authorized)
redis-cli DEL "lock:$FILE_PATH"
redis-cli DEL "lock:meta:$FILE_PATH"
```

#### 3. Communication Issues
```bash
# Check message queues
redis-cli LLEN "messages:$AGENT_ID"
redis-cli LRANGE "messages:$AGENT_ID" 0 5

# Test Redis connectivity
redis-cli PING
```

#### 4. Dashboard Not Updating
```bash
# Check API endpoints
curl http://localhost:3000/api/agent-health
curl http://localhost:3000/api/file-locks
curl http://localhost:3000/api/coordination-events

# Restart dashboard
cd dashboard && npm run dev
```

## 📝 Best Practices

### 1. Agent Development
- **Capability Declaration**: Accurately declare your specializations
- **Graceful Degradation**: Handle communication failures elegantly
- **Resource Management**: Release locks promptly, send regular heartbeats
- **Error Handling**: Report errors with appropriate severity levels

### 2. File Management
- **Minimal Lock Time**: Only lock files while actively editing
- **Priority Awareness**: Respect higher-priority agent requests
- **Coordination**: Communicate with lock holders before escalating

### 3. Communication
- **Clear Messages**: Include context and expected responses
- **Appropriate Channels**: Use direct messages for specific agents, broadcasts for announcements
- **Emergency Protocol**: Reserve emergency channels for actual emergencies

### 4. System Health
- **Regular Heartbeats**: Send every 30 seconds when active
- **Status Updates**: Update status when starting/completing tasks
- **Monitoring**: Check dashboard regularly for system health

## 🔄 Continuous Improvement

### Metrics to Track:
- **Agent Uptime**: Target 99%+ availability
- **Coordination Speed**: Average resolution time < 2 minutes
- **Lock Conflicts**: Minimize through better planning
- **Recovery Success Rate**: Automatic recovery success rate

### Regular Reviews:
- **Weekly**: Review agent performance metrics
- **Monthly**: Analyze coordination patterns and bottlenecks
- **Quarterly**: Update protocols based on lessons learned

## 🎯 Quick Reference Commands

### Essential Agent Commands:
```bash
# Register agent
redis-cli HSET "agent:$AGENT_ID" "status" "active" "capabilities" '["specialty1","specialty2"]'

# Claim file
redis-cli SET "lock:$FILE" "$AGENT_ID" EX 1800 NX

# Send heartbeat
redis-cli PUBLISH "agent-heartbeat" '{"agent_id":"'$AGENT_ID'","status":"active","timestamp":"'$(date -Iseconds)'"}'

# Request coordination
redis-cli PUBLISH "coordination-required" '{"requesting_agent":"'$AGENT_ID'","file":"'$FILE'"}'

# Check system health
redis-cli HGETALL "system:health"

# Emergency shutdown
redis-cli PUBLISH "agent-emergency" '{"type":"shutdown","from":"'$AGENT_ID'"}'
```

---

**Remember**: The goal is collaborative development excellence. Communicate clearly, coordinate effectively, and always prioritize system stability and code quality.

**Last Updated**: $(date -Iseconds)
**Version**: 2.0
**System**: Ez Aigent Enhanced Multi-Agent Orchestration