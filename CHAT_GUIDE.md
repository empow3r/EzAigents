# Ez Aigent Agent Chat & Communication Guide

## 🗣️ Real-time Agent Communication System

The Ez Aigent system now includes comprehensive chat and monitoring capabilities to see and interact with your AI agents in real-time.

## 🚀 Quick Start

### 1. Start Redis (Required)
```bash
# Make sure Redis is running
redis-server
# Or if using Docker
docker run -d -p 6379:6379 redis:alpine
```

### 2. Choose Your Chat Interface

#### **Simple Chat** (Basic interaction)
```bash
npm run chat
```

#### **Advanced Chat** (Rich UI, requires chalk/boxen)
```bash
npm run chat:advanced
```

#### **Monitor & Chat** (See everything + interact)
```bash
npm run chat:monitor
```

#### **Demo Mode** (See simulated agent conversations)
```bash
npm run chat:demo
```

## 📋 Monitor Modes

The monitor shows different types of communications:

### `/mode all` - Everything
- Agent-to-agent messages
- File lock operations  
- Task processing
- System announcements
- Coordination requests

### `/mode chat` - Only Chat Messages
- Direct messages between agents
- Broadcast messages
- User interactions

### `/mode files` - File Operations Only
- File locks and releases
- File modifications
- Output file creation

### `/mode tasks` - Task Processing Only
- Queue operations
- Task assignments
- Completion notifications

## 💬 Chat Commands

### Basic Commands
```bash
/help           # Show all commands
/agents         # List online agents
/status         # Show system status
/clear          # Clear screen
/exit           # Exit chat
```

### Communication Commands
```bash
/select agent-id     # Select agent for direct chat
/join agent-id       # Join agent conversation (monitor mode)
/broadcast message   # Send message to all agents
/leave              # Leave current conversation
```

### Monitoring Commands (Monitor Mode Only)
```bash
/mode all|chat|files|tasks   # Set monitor mode
/watch filepath              # Watch specific file
/files                       # Show recent output files
```

## 🎭 Demo Scenarios

Run the demo to see realistic agent interactions:

```bash
npm run chat:demo
```

**Demo Scenarios Include:**
1. **Auth Refactor** - Claude architects, GPT implements, DeepSeek tests
2. **API Testing** - GPT builds API, DeepSeek creates tests
3. **Documentation** - Mistral documents recent changes
4. **Emergency Response** - Security vulnerability handling

## 🔍 What You'll See

### Agent-to-Agent Communication
```
[14:32:15] claude-arch-001 → gpt-backend-002: Can you review my API changes?
[14:32:18] [BROADCAST] gpt-backend-002: I'm available for API reviews
```

### File Operations
```
[14:32:16] 🔒 [FILE] claude-arch-001 file_claimed auth/login.js
[14:32:25] 🔓 [FILE] claude-arch-001 file_released auth/login.js
```

### Coordination
```
[14:32:20] 🤝 [COORDINATION] claude-arch-001 ↔ gpt-backend-002 for auth/login.js
```

### Task Processing
```
[14:32:22] 📋 [CLAUDE-3-OPUS] Task: auth/login.js Model: claude-3-opus
```

### Emergency Alerts
```
🚨 EMERGENCY: Critical security vulnerability detected in auth module
```

## 🤖 Interacting with Agents

### 1. Start Monitor
```bash
npm run chat:monitor
```

### 2. List Available Agents
```
[Monitor]> /agents

Active Agents:
  claude-arch-001 (claude/claude-3-opus) - refactoring auth module
  gpt-backend-001 (gpt/gpt-4o) - implementing APIs
  deepseek-test-001 (deepseek/deepseek-coder) - creating tests
```

### 3. Join Agent Conversation
```
[Monitor]> /join claude-arch-001
[Monitor → claude-arch-001]> Hello! What are you working on?
```

### 4. Watch Their Response
```
[14:35:12] claude-arch-001 → monitor-123456: Hi! I'm currently refactoring the authentication architecture. I'm focusing on improving security patterns and code organization.
```

## 🔧 Technical Details

### Redis Channels Used
- `agent-chat` - Broadcast messages
- `messages:{agent-id}` - Direct messages
- `file-locks` - File operation notifications
- `agent-registry` - Agent status changes
- `task-updates` - Task processing updates
- `agent-emergency` - Emergency alerts
- `coordination-required` - File coordination requests

### File Monitoring
The system automatically watches:
- `shared/filemap.json` - Task assignments
- `src/output/` directory - Agent outputs
- Any files you add with `/watch`

### Agent Types & Specialties
- **Claude** - Architecture, refactoring, code review
- **GPT** - Backend logic, API development
- **DeepSeek** - Testing, validation, types
- **Mistral** - Documentation, technical writing
- **Gemini** - Analysis, optimization

## 🎯 Real-World Usage

### Development Workflow
1. **Start monitoring** to see agent activity
2. **Watch file operations** during development
3. **Join agent conversations** when you need updates
4. **Use broadcast** to coordinate team-wide changes

### Debugging
1. **Monitor mode** shows exactly what agents are doing
2. **File watch** reveals which files are being modified
3. **Task tracking** shows processing pipeline
4. **Error alerts** appear in real-time

### Coordination
1. **See conflicts** as they happen
2. **Watch negotiation** between agents
3. **Emergency handling** with immediate alerts
4. **Review requests** visible in real-time

## 📖 Example Session

```bash
# Terminal 1: Start monitoring
npm run chat:monitor

# Terminal 2: Start some agents
npm run agent:claude
npm run agent:gpt

# Terminal 3: Enqueue tasks
cd cli && node enqueue.js

# Terminal 4: Run demo (optional)
npm run chat:demo
```

**In Monitor Terminal:**
```
[Monitor]> /mode all
✓ Monitor mode set to: all

[14:30:01] ✅ [ONLINE] Agent claude-refactor-001 joined
[14:30:02] ✅ [ONLINE] Agent gpt-backend-001 joined
[14:30:15] 📋 [CLAUDE-3-OPUS] Task: auth/login.js Model: claude-3-opus
[14:30:16] 🔒 [FILE] claude-refactor-001 file_claimed auth/login.js
[14:30:25] claude-refactor-001 → gpt-backend-001: Please review auth changes when ready
[14:30:27] gpt-backend-001 → claude-refactor-001: I'll review after current task
[14:30:45] 🔓 [FILE] claude-refactor-001 file_released auth/login.js
[14:30:46] 📝 [OUTPUT] File change: auth__login.js

[Monitor]> /join claude-refactor-001
✓ Joined claude-refactor-001 conversation

[Monitor → claude-refactor-001]> What changes did you make to the auth system?

[14:31:12] claude-refactor-001 → monitor-123456: I refactored the authentication flow to use a more secure token-based system with proper validation layers. The main changes include: 1) Centralized auth service, 2) JWT token handling, 3) Improved error handling, 4) Better session management.
```

This gives you complete visibility into your AI agent team's activities and lets you participate in their development process! 🚀