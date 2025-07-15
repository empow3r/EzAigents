# 🚀 Ez Aigent Project Creator

Transform your ideas into fully-built SaaS applications in 24 hours using AI agent orchestration.

## 🎯 What is Project Creator?

Project Creator is an intelligent system that:
- **Generates** comprehensive project plans from simple descriptions
- **Orchestrates** 5+ specialized AI agents to build your application
- **Executes** tasks in parallel with real-time progress monitoring
- **Delivers** production-ready code with tests and documentation

## 🏃 Quick Start

### 1. Start the System
```bash
./start-project-creator.sh
```

### 2. Open Dashboard
Navigate to http://localhost:3000 and click **"Project Creator"**

### 3. Run the Demo
```bash
./demo-project-creator.js
```

## 📚 Features

### Intelligent Project Planning
- 6-phase development methodology
- Automatic task breakdown and scheduling
- Smart agent assignment based on expertise
- Realistic time estimation

### Multi-Agent Orchestration
| Agent | Specialization | Tasks |
|-------|----------------|-------|
| 🧠 **Claude** | Architecture & Refactoring | System design, complex logic, code optimization |
| 🤖 **GPT-4o** | Backend & APIs | Server logic, database design, API endpoints |
| 🔍 **DeepSeek** | Testing & Validation | Unit tests, integration tests, debugging |
| 📝 **Mistral** | Frontend & Documentation | UI components, user docs, README files |
| ✨ **Gemini** | Security & DevOps | Security audits, CI/CD, deployment configs |

### Real-Time Monitoring
- Live progress tracking
- Task-level status updates
- Agent activity monitoring
- Failure detection and recovery

### Project Types Supported
- **Web Applications** - Full-stack web apps with modern frameworks
- **SaaS Platforms** - Multi-tenant applications with subscriptions
- **Marketplaces** - E-commerce platforms with payment integration
- **API Services** - RESTful and GraphQL APIs
- **Mobile Apps** - React Native applications
- **AI Applications** - ML-powered solutions

## 🛠️ How It Works

### 1. Project Definition
You provide:
- Project name and type
- Brief description
- Desired features
- Tech stack preferences

### 2. Masterplan Generation
The system creates:
- Development phases
- Task breakdown (30-50 tasks)
- Agent assignments
- Execution schedule

### 3. Automated Execution
Agents work in parallel to:
- Write code
- Create tests
- Build UI components
- Set up infrastructure
- Write documentation

### 4. Continuous Delivery
- Real-time file updates
- Progress notifications
- Error handling
- Completion alerts

## 💻 API Reference

### Create Masterplan
```javascript
POST /api/project-masterplan
{
  "projectName": "My SaaS Platform",
  "projectType": "saas",
  "description": "A platform for...",
  "features": ["auth", "payments", "dashboard"],
  "timeline": "24",
  "techStack": ["Next.js", "Node.js", "PostgreSQL"]
}
```

### Execute Project
```javascript
POST /api/project-execution
{
  "projectId": "uuid",
  "autoStart": true,
  "agentConfig": {
    "claude": { "count": 1 },
    "gpt": { "count": 2 }
  }
}
```

### Monitor Progress
```javascript
GET /api/project-execution?projectId=uuid
```

## 📁 Project Structure

Generated projects follow this structure:
```
projects/{projectId}/
├── masterplan.json      # Project plan and metadata
├── src/                 # Source code
│   ├── api/            # Backend API
│   ├── components/     # UI components
│   ├── lib/            # Utilities
│   └── tests/          # Test suites
├── docs/               # Documentation
└── deployment/         # Deployment configs
```

## 🔧 Configuration

### Environment Variables
```bash
# Required API Keys
CLAUDE_API_KEY=your-key
OPENAI_API_KEY=your-key
DEEPSEEK_API_KEYS=key1,key2  # Comma-separated for rotation
MISTRAL_API_KEY=your-key
GEMINI_API_KEY=your-key

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Optional Settings
MIN_AGENTS=1
MAX_AGENTS=10
SCALE_UP_THRESHOLD=20
```

### Agent Configuration
Customize agent behavior in `shared/tokenpool.json`:
```json
{
  "claude-3-opus": {
    "keys": ["key1", "key2"],
    "maxTokens": 200000,
    "temperature": 0.7
  }
}
```

## 🎮 Usage Examples

### Basic Web App
```javascript
{
  "projectName": "Todo App",
  "projectType": "web-app",
  "description": "A simple todo list application",
  "features": ["CRUD operations", "User auth"],
  "techStack": ["React", "Express"]
}
```

### Advanced SaaS Platform
```javascript
{
  "projectName": "Analytics Platform",
  "projectType": "saas",
  "description": "Multi-tenant analytics with real-time dashboards",
  "features": [
    "Multi-tenancy",
    "Real-time data",
    "Custom dashboards",
    "API access",
    "Team collaboration"
  ],
  "techStack": ["Next.js", "Node.js", "PostgreSQL", "Redis", "Socket.io"]
}
```

## 🚨 Troubleshooting

### Common Issues

**Agents not starting**
```bash
# Check Redis connection
redis-cli ping

# Verify API keys
grep API_KEY .env

# Check agent logs
tail -f agents/*/logs/*.log
```

**Tasks failing**
```bash
# View failed tasks
redis-cli lrange queue:failures 0 -1

# Retry specific task
curl -X PUT http://localhost:3000/api/project-execution \
  -H "Content-Type: application/json" \
  -d '{"projectId": "uuid", "action": "retry-task", "taskId": "task-1"}'
```

**Project stuck**
```bash
# Check queue depths
redis-cli llen queue:claude-3-opus

# Force resume
curl -X PUT http://localhost:3000/api/project-execution \
  -H "Content-Type: application/json" \
  -d '{"projectId": "uuid", "action": "resume"}'
```

## 📊 Performance Tips

1. **Parallel Execution**: Use multiple agents of the same type for faster completion
2. **Token Management**: Monitor API usage to avoid rate limits
3. **Task Prioritization**: Critical path tasks are automatically prioritized
4. **Resource Scaling**: Adjust `MIN_AGENTS` and `MAX_AGENTS` based on workload

## 🔐 Security Considerations

- API keys are never exposed to generated code
- Agents run in isolated environments
- Generated code is scanned for vulnerabilities
- All outputs are logged for audit

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙋 Support

- **Documentation**: [PROJECT_CREATOR_GUIDE.md](PROJECT_CREATOR_GUIDE.md)
- **Architecture**: [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)
- **Issues**: [GitHub Issues](https://github.com/ez-aigent/issues)
- **Discord**: [Join our community](https://discord.gg/ez-aigent)

---

Built with ❤️ by the Ez Aigent team. Happy building! 🚀