# Ez Aigent Hooks System Guide

## Overview

The Ez Aigent Hooks System provides a powerful, modular way to extend and control agent behavior without modifying core agent code. Inspired by Claude Code's hooks architecture, it enables real-time monitoring, security controls, performance optimization, and AI-powered enhancements.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Hook Types](#hook-types)
4. [Creating Custom Hooks](#creating-custom-hooks)
5. [Configuration](#configuration)
6. [API Reference](#api-reference)
7. [Examples](#examples)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Enable Hooks System

```bash
# Set environment variable
export HOOKS_ENABLED=true

# Start agents with hooks
./start-agents-with-hooks.sh
```

### 2. Monitor Hook Activity

```bash
# Watch all hook events
redis-cli PSUBSCRIBE 'hooks:*'

# View security alerts
redis-cli PSUBSCRIBE 'security:alerts'

# Check hook metrics
redis-cli HGETALL 'hook:metrics:pre-task'
```

### 3. Configure Hooks

Edit `hooks/config/hooks.json`:

```json
{
  "hooks": {
    "security:pre-execution-safety": {
      "enabled": true,
      "config": {
        "maxFileSize": 10485760,
        "blockPatterns": ["rm -rf", ".env"]
      }
    }
  }
}
```

## Architecture

### Core Components

1. **HookRegistry** - Discovers and manages hooks
2. **HookExecutor** - Executes hooks with proper error handling
3. **HookContext** - Provides rich context to hooks
4. **HookChain** - Composes multiple hooks into workflows
5. **HookAnalytics** - Tracks performance and generates insights

### Hook Lifecycle

```
Agent receives task
    ↓
Create HookContext
    ↓
Execute pre-task hooks → [Block if needed]
    ↓
Process task
    ↓
Execute post-task hooks
    ↓
Log metrics & analytics
```

## Hook Types

### Pre-Task Hooks

Executed before task processing:

- **pre-task** - General pre-processing
- **pre-task-assignment** - Before task assignment
- **pre-execution-safety** - Security validation

### Post-Task Hooks

Executed after task completion:

- **post-task** - General post-processing
- **post-execution-logging** - Performance logging
- **task-complete** - Success handling

### Event Hooks

Triggered by specific events:

- **task-error** - Error handling
- **message-routing** - Message interception
- **agent-status** - Status changes

### Intelligence Hooks

AI-powered enhancements:

- **predictive-routing** - Optimal agent selection
- **swarm-formation** - Multi-agent coordination
- **learning-capture** - Knowledge extraction

## Creating Custom Hooks

### Basic Hook Template

```javascript
const BaseHook = require('./core/BaseHook');

class MyCustomHook extends BaseHook {
  constructor(config = {}) {
    super(config);
    
    this.metadata = {
      name: 'my-custom-hook',
      version: '1.0.0',
      type: 'pre-task',
      description: 'My custom hook description',
      priority: 50, // 0-100, higher runs first
      enabled: true,
      timeout: 5000
    };
  }

  async validate(context) {
    // Validate context before execution
    if (!context.task) {
      return { valid: false, reason: 'No task provided' };
    }
    return { valid: true };
  }

  async execute(context) {
    const { task, agent } = context;
    
    // Your hook logic here
    console.log(`Processing task ${task.id} for agent ${agent.id}`);
    
    // Return results
    return {
      action: 'allow', // or 'block'
      contextModifications: {
        // Modify context for next hooks
        priority: 'high'
      },
      stopChain: false // Set true to stop hook chain
    };
  }
}

module.exports = MyCustomHook;
```

### Registering Your Hook

Place your hook in the appropriate directory:

```
hooks/handlers/
├── security/
│   └── my-security-hook.js
├── performance/
│   └── my-performance-hook.js
└── custom/
    └── my-custom-hook.js
```

## Configuration

### Global Configuration

```json
{
  "global": {
    "enabled": true,
    "logLevel": "info",
    "defaultTimeout": 30000
  }
}
```

### Hook-Specific Configuration

```json
{
  "hooks": {
    "security:pre-execution-safety": {
      "enabled": true,
      "metadata": {
        "priority": 100,
        "timeout": 5000
      },
      "config": {
        "maxFileSize": 10485760,
        "dangerousPatterns": ["rm -rf", ".env"],
        "whitelistPatterns": ["src/", "tests/"]
      }
    }
  }
}
```

### Agent-Specific Configuration

```json
{
  "agents": {
    "claude": {
      "hooksEnabled": true,
      "customHooks": ["my-claude-hook"]
    }
  }
}
```

## API Reference

### HookContext

```javascript
const context = new HookContext({
  agent: { id, type, model, capabilities },
  task: { id, type, prompt, complexity },
  system: { activeAgents, queueDepth },
  redis: redisClient,
  emit: eventEmitter
});

// Logging methods
context.debug('Debug message');
context.info('Info message');
context.warn('Warning message');
context.error('Error message');

// Shared state
context.setShared('key', value);
const value = context.getShared('key');
```

### HookExecutor

```javascript
// Execute hooks of a type
const result = await executor.execute('pre-task', context);

// Check results
if (result.executed) {
  console.log(`Executed ${result.hooks.length} hooks`);
  console.log(`Duration: ${result.duration}ms`);
}
```

### HookChain

```javascript
// Define a chain
chain.define('security-check', {
  steps: [
    { type: 'hook', hookType: 'pre-execution-safety' },
    { type: 'hook', hookType: 'vulnerability-scan' }
  ],
  continueOnError: false
});

// Execute chain
const result = await chain.execute('security-check', context);
```

## Examples

### 1. Security Hook - Block Dangerous Commands

```javascript
class CommandBlockerHook extends BaseHook {
  async execute(context) {
    const { task } = context;
    const dangerous = ['rm -rf /', 'DROP DATABASE'];
    
    for (const pattern of dangerous) {
      if (task.prompt.includes(pattern)) {
        return {
          action: 'block',
          reason: `Dangerous command detected: ${pattern}`,
          stopChain: true
        };
      }
    }
    
    return { action: 'allow' };
  }
}
```

### 2. Performance Hook - Track Execution Time

```javascript
class PerformanceTrackerHook extends BaseHook {
  async execute(context) {
    const { task, execution } = context;
    
    // Log to Redis
    await context.redis.hIncrBy(
      `metrics:task:${task.type}`,
      'count',
      1
    );
    
    await context.redis.hIncrByFloat(
      `metrics:task:${task.type}`,
      'totalDuration',
      execution.duration
    );
    
    return { logged: true };
  }
}
```

### 3. Intelligence Hook - Route to Best Agent

```javascript
class IntelligentRouterHook extends BaseHook {
  async execute(context) {
    const { task } = context;
    
    // Analyze task complexity
    const complexity = this.analyzeComplexity(task);
    
    // Select best agent
    const agent = complexity > 8 ? 'claude' : 'gpt';
    
    return {
      contextModifications: {
        preferredAgent: agent,
        routingReason: `Complexity: ${complexity}`
      }
    };
  }
}
```

## Best Practices

### 1. Hook Design

- Keep hooks focused on a single responsibility
- Use appropriate timeouts to prevent hanging
- Always validate context before processing
- Return meaningful error messages

### 2. Performance

- Use Redis for state that needs to be shared
- Batch operations when possible
- Implement caching for expensive operations
- Monitor hook execution times

### 3. Error Handling

```javascript
async execute(context) {
  try {
    // Hook logic
    return { success: true };
  } catch (error) {
    context.error('Hook failed', { error: error.message });
    
    // Don't throw - return error state
    return {
      success: false,
      error: error.message,
      continueChain: true // Allow other hooks to run
    };
  }
}
```

### 4. Testing Hooks

```javascript
const { createContext } = require('../hooks');

describe('MyHook', () => {
  it('should block dangerous commands', async () => {
    const hook = new MyHook();
    const context = createContext({
      task: { prompt: 'rm -rf /' }
    });
    
    const result = await hook.execute(context);
    expect(result.action).toBe('block');
  });
});
```

## Troubleshooting

### Hooks Not Loading

```bash
# Check if hooks are discovered
redis-cli KEYS 'hook:*'

# View registered hooks
redis-cli SMEMBERS 'hooks:registered'
```

### Performance Issues

```bash
# Check hook execution times
redis-cli ZRANGE 'hook:executions:timeline' -10 -1 WITHSCORES

# View slow hooks
redis-cli HGETALL 'hook:metrics:slow'
```

### Debugging

Enable debug logging:

```bash
export HOOK_LOG_LEVEL=debug
export NODE_ENV=development
```

View hook execution flow:

```javascript
// In your agent
this.on('hook:*', (event) => {
  console.log('Hook event:', event);
});
```

## Advanced Features

### 1. Conditional Hooks

```javascript
{
  "hooks": {
    "complex-task-handler": {
      "enabled": true,
      "conditions": {
        "task.complexity": "> 8",
        "agent.type": "in ['claude', 'gpt']"
      }
    }
  }
}
```

### 2. Hook Composition

```javascript
// Create composite hooks
class CompositeHook extends BaseHook {
  constructor(hooks) {
    super();
    this.hooks = hooks;
  }
  
  async execute(context) {
    const results = [];
    for (const hook of this.hooks) {
      const result = await hook.execute(context);
      results.push(result);
      
      if (result.stopChain) break;
    }
    return { results };
  }
}
```

### 3. Dynamic Hook Loading

```javascript
// Load hooks at runtime
const hookPath = './custom-hooks/my-hook.js';
const HookClass = require(hookPath);
await registry.register('custom:my-hook', {
  instance: new HookClass(),
  metadata: { ... }
});
```

## Integration with Dashboard

The hooks system integrates seamlessly with the Ez Aigent dashboard:

1. **Real-time Monitoring** - View hook executions live
2. **Configuration UI** - Enable/disable hooks via web interface
3. **Analytics Dashboard** - Visualize hook performance metrics
4. **Alert Management** - Configure alerts for hook failures

## Roadmap

- [ ] Visual hook chain designer
- [ ] Hook marketplace for sharing
- [ ] Machine learning-based hook optimization
- [ ] Distributed hook execution
- [ ] Hook versioning and rollback

## Contributing

To contribute a new hook:

1. Create your hook following the template
2. Add tests for your hook
3. Document configuration options
4. Submit a pull request

## Support

- **Issues**: GitHub Issues
- **Docs**: This guide and inline documentation
- **Examples**: `hooks/examples/` directory
- **Community**: Discord server

---

The Ez Aigent Hooks System empowers you to create a truly intelligent, self-optimizing multi-agent platform. Start with simple hooks and gradually build more sophisticated behaviors as your needs evolve.