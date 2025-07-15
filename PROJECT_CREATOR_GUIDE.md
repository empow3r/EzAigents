# Ez Aigent Project Creator Guide

## Overview
The Ez Aigent dashboard now includes a comprehensive Project Creator that can automatically generate project masterplans, schedule tasks, and orchestrate AI agents to build complete SaaS applications.

## Features

### 1. **Project Masterplan Generation**
- Automatically creates detailed project plans based on your requirements
- Generates 6 development phases with specific tasks
- Assigns appropriate AI agents to each task
- Creates realistic time estimates and schedules

### 2. **Agent Orchestration**
- Automatically starts required AI agents
- Manages agent workload distribution
- Provides real-time status updates
- Handles agent failures with backup assignments

### 3. **Project Execution Management**
- Start, pause, resume, and cancel projects
- Monitor real-time progress
- View task-level details and statuses
- Retry failed tasks

## How to Use

### Access the Project Creator

1. Start the dashboard:
   ```bash
   cd dashboard
   npm run dev
   ```

2. Open http://localhost:3000 in your browser

3. Click the **"Project Creator"** button on the main dashboard

### Create a New Project

1. **Fill in Project Details:**
   - **Project Name**: Give your project a descriptive name
   - **Project Type**: Choose from:
     - Web Application
     - Mobile Application
     - API Service
     - Marketplace
     - SaaS Platform
     - AI Application
   - **Description**: Describe what you want to build

2. **Add Features:**
   - Click on suggested features or type custom ones
   - Each feature will influence task generation

3. **Select Tech Stack:**
   - Choose technologies or let the system recommend
   - Stack influences agent assignments

4. **Set Timeline:**
   - Default is 24 hours
   - Can be adjusted from 1-168 hours

5. Click **"Generate Project Masterplan"**

### Review the Masterplan

The system will generate:
- **Project Phases**: 6 structured development phases
- **Task Breakdown**: Detailed tasks for each phase
- **Agent Assignments**: Which AI agent handles each task
- **Time Estimates**: Realistic completion times

### Execute the Project

1. Review the generated plan
2. Click **"Execute Project"**
3. The system will:
   - Start required AI agents
   - Begin task execution
   - Provide real-time updates

### Monitor Progress

The execution view shows:
- Overall project status
- Task completion percentage
- Active agents
- Individual task statuses
- Options to pause/resume/cancel

## API Endpoints

### Agent Control
```bash
POST /api/agent-control
{
  "action": "start|stop|restart",
  "agentType": "claude|gpt|deepseek|mistral|gemini",
  "agentId": "optional-custom-id"
}
```

### Project Masterplan
```bash
POST /api/project-masterplan
{
  "projectName": "My SaaS",
  "projectType": "saas",
  "description": "Project description",
  "features": ["feature1", "feature2"],
  "timeline": "24",
  "budget": "efficient|balanced|premium",
  "techStack": ["React", "Node.js"]
}
```

### Project Execution
```bash
POST /api/project-execution
{
  "projectId": "uuid",
  "autoStart": true,
  "agentConfig": {
    "claude": { "count": 1 },
    "gpt": { "count": 2 }
  }
}

GET /api/project-execution?projectId=uuid

PUT /api/project-execution
{
  "projectId": "uuid",
  "action": "pause|resume|cancel|retry-task",
  "taskId": "task-id" // for retry-task
}
```

## Project Types and Specializations

### Web Application
- Focus on frontend/backend split
- Includes responsive design tasks
- Emphasizes user experience

### SaaS Platform
- Includes subscription management
- Multi-tenant architecture
- Admin dashboard tasks

### Marketplace
- Payment integration phase
- Vendor management
- Order processing systems

### AI Application
- ML model integration
- Data pipeline setup
- Training/inference tasks

## Agent Specializations

- **Claude**: Architecture, refactoring, complex logic
- **GPT-4o**: Backend development, APIs, integrations
- **DeepSeek**: Testing, validation, debugging
- **Mistral**: Documentation, frontend, UI/UX
- **Gemini**: Security, DevOps, monitoring

## Testing

Run the test script to verify the system:
```bash
node dashboard/test-project-creation.js
```

## Troubleshooting

### Agents Not Starting
- Check Redis is running: `redis-cli ping`
- Verify API keys in `.env`
- Check agent logs in `agents/*/logs/`

### Tasks Failing
- View task details in the dashboard
- Use "Retry Task" button for failed tasks
- Check agent memory in `.agent-memory/`

### Project Stuck
- Use Pause/Resume to restart execution
- Check Redis queues: `redis-cli llen queue:claude-3-opus`
- View failed tasks: `redis-cli lrange queue:failures 0 -1`

## Best Practices

1. **Start Small**: Test with simple projects first
2. **Monitor Progress**: Keep the dashboard open during execution
3. **Resource Management**: Don't run too many projects simultaneously
4. **API Keys**: Ensure sufficient rate limits for your usage
5. **Backup**: Projects are saved in `projects/{projectId}/`

## Future Enhancements

- Project templates
- Cost estimation
- Deployment automation
- Multi-project management
- Team collaboration features