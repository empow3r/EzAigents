# Node.js Reference Guide

## Overview
Node.js is the runtime environment for all Ez Aigent services, providing JavaScript execution on the server.

## Installation & Setup

### Node Version Manager (Recommended)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js
nvm install 20
nvm use 20
nvm alias default 20
```

### Direct Installation
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node@20

# Verify installation
node --version
npm --version
```

## Core Modules

### File System
```javascript
const fs = require('fs').promises;
const path = require('path');

// Read file
const content = await fs.readFile('file.txt', 'utf8');

// Write file
await fs.writeFile('output.txt', content);

// Check if file exists
try {
  await fs.access('file.txt');
  console.log('File exists');
} catch {
  console.log('File does not exist');
}

// Directory operations
await fs.mkdir('new-dir', { recursive: true });
const files = await fs.readdir('directory');
```

### HTTP/HTTPS
```javascript
const http = require('http');
const https = require('https');

// HTTP Server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Hello World' }));
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});

// HTTP Client
const makeRequest = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
};
```

### Events
```javascript
const EventEmitter = require('events');

class AgentEmitter extends EventEmitter {}
const agentEmitter = new AgentEmitter();

// Listen for events
agentEmitter.on('task:completed', (task) => {
  console.log(`Task ${task.id} completed`);
});

// Emit events
agentEmitter.emit('task:completed', { id: '123', result: 'success' });

// Once listener
agentEmitter.once('startup', () => {
  console.log('Agent started');
});
```

### Streams
```javascript
const { Readable, Writable, Transform } = require('stream');

// Readable stream
class DataStream extends Readable {
  constructor(options) {
    super(options);
    this.counter = 0;
  }

  _read() {
    if (this.counter < 5) {
      this.push(`data-${this.counter++}\n`);
    } else {
      this.push(null); // End stream
    }
  }
}

// Transform stream
class UpperCaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  }
}

// Usage
const dataStream = new DataStream();
const upperTransform = new UpperCaseTransform();

dataStream
  .pipe(upperTransform)
  .pipe(process.stdout);
```

### Process & Environment
```javascript
// Environment variables
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const apiKey = process.env.CLAUDE_API_KEY;

// Command line arguments
console.log(process.argv);

// Exit handling
process.on('SIGINT', () => {
  console.log('Graceful shutdown');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

## Asynchronous Programming

### Promises
```javascript
// Promise creation
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Promise chaining
fetchUser(id)
  .then(user => fetchUserPosts(user.id))
  .then(posts => console.log(posts))
  .catch(error => console.error(error));

// Promise.all
const results = await Promise.all([
  fetchUser(1),
  fetchUser(2),
  fetchUser(3)
]);

// Promise.allSettled
const results = await Promise.allSettled([
  fetchData('url1'),
  fetchData('url2'),
  fetchData('url3')
]);
```

### Async/Await
```javascript
// Async function
async function processAgent(agentId) {
  try {
    const agent = await fetchAgent(agentId);
    const tasks = await fetchTasks(agent.id);
    const results = await Promise.all(
      tasks.map(task => processTask(task))
    );
    return results;
  } catch (error) {
    console.error(`Error processing agent ${agentId}:`, error);
    throw error;
  }
}

// Error handling
async function safeOperation() {
  try {
    const result = await riskyOperation();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Timers
```javascript
// setTimeout
const timeoutId = setTimeout(() => {
  console.log('Executed after 1 second');
}, 1000);

// clearTimeout
clearTimeout(timeoutId);

// setInterval
const intervalId = setInterval(() => {
  console.log('Executed every 5 seconds');
}, 5000);

// clearInterval
clearInterval(intervalId);

// setImmediate
setImmediate(() => {
  console.log('Executed on next tick');
});
```

## Package Management

### NPM Basics
```bash
# Initialize project
npm init -y

# Install dependencies
npm install axios ioredis
npm install --save-dev jest nodemon

# Install globally
npm install -g pm2

# Update packages
npm update
npm audit fix

# Scripts
npm run start
npm run test
npm run build
```

### Package.json
```json
{
  "name": "ez-aigent-claude",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest",
    "lint": "eslint ."
  },
  "dependencies": {
    "axios": "^1.6.0",
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "nodemon": "^3.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Module System

### CommonJS (require/exports)
```javascript
// math.js
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

module.exports = { add, subtract };

// app.js
const { add, subtract } = require('./math');
const math = require('./math');

console.log(add(2, 3)); // 5
console.log(math.subtract(5, 2)); // 3
```

### ES Modules (import/export)
```javascript
// math.mjs
export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

export default function multiply(a, b) {
  return a * b;
}

// app.mjs
import multiply, { add, subtract } from './math.mjs';
import * as math from './math.mjs';

console.log(add(2, 3)); // 5
console.log(multiply(2, 3)); // 6
```

## Error Handling

### Try-Catch
```javascript
async function processTask(task) {
  try {
    const result = await executeTask(task);
    return { success: true, result };
  } catch (error) {
    if (error.code === 'NETWORK_ERROR') {
      // Retry logic
      return await retryTask(task);
    }
    
    console.error('Task failed:', error);
    return { success: false, error: error.message };
  }
}
```

### Custom Errors
```javascript
class AgentError extends Error {
  constructor(message, code, agentId) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.agentId = agentId;
  }
}

// Usage
throw new AgentError('Task failed', 'TASK_FAILED', 'claude_001');
```

### Global Error Handling
```javascript
// Uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log error to file or external service
  gracefulShutdown();
});

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Handle the error appropriately
});
```

## Worker Threads

### Main Thread
```javascript
const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  // Main thread
  const worker = new Worker(__filename);
  
  worker.postMessage({ task: 'process', data: [1, 2, 3, 4, 5] });
  
  worker.on('message', (result) => {
    console.log('Result:', result);
  });
  
  worker.on('error', (error) => {
    console.error('Worker error:', error);
  });
} else {
  // Worker thread
  parentPort.on('message', ({ task, data }) => {
    if (task === 'process') {
      const result = data.map(x => x * 2);
      parentPort.postMessage(result);
    }
  });
}
```

## Performance Optimization

### Memory Management
```javascript
// Monitor memory usage
function logMemoryUsage() {
  const used = process.memoryUsage();
  console.log({
    rss: Math.round(used.rss / 1024 / 1024 * 100) / 100 + ' MB',
    heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100 + ' MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100 + ' MB',
    external: Math.round(used.external / 1024 / 1024 * 100) / 100 + ' MB'
  });
}

// Garbage collection
if (global.gc) {
  global.gc();
}
```

### Event Loop Monitoring
```javascript
// Monitor event loop lag
function monitorEventLoop() {
  const start = process.hrtime();
  
  setImmediate(() => {
    const delta = process.hrtime(start);
    const nanosec = delta[0] * 1e9 + delta[1];
    const millisec = nanosec / 1e6;
    
    console.log(`Event loop lag: ${millisec.toFixed(2)}ms`);
  });
}

setInterval(monitorEventLoop, 5000);
```

## Testing

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
```

### Unit Tests
```javascript
// math.test.js
const { add, subtract } = require('./math');

describe('Math functions', () => {
  test('add should return sum of two numbers', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
  });

  test('subtract should return difference of two numbers', () => {
    expect(subtract(5, 3)).toBe(2);
    expect(subtract(1, 1)).toBe(0);
  });
});
```

### Async Testing
```javascript
// agent.test.js
const Agent = require('./agent');

describe('Agent', () => {
  test('should process task successfully', async () => {
    const agent = new Agent('test-agent');
    const task = { id: '123', type: 'code-review' };
    
    const result = await agent.processTask(task);
    
    expect(result.success).toBe(true);
    expect(result.taskId).toBe('123');
  });

  test('should handle task failure', async () => {
    const agent = new Agent('test-agent');
    const invalidTask = { id: '456' }; // Missing type
    
    await expect(agent.processTask(invalidTask))
      .rejects
      .toThrow('Invalid task type');
  });
});
```

## Ez Aigent Integration

### Agent Base Class
```javascript
// base-agent.js
const EventEmitter = require('events');
const Redis = require('ioredis');

class BaseAgent extends EventEmitter {
  constructor(agentId, config) {
    super();
    this.agentId = agentId;
    this.config = config;
    this.redis = new Redis(config.redisUrl);
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    this.emit('agent:started', { agentId: this.agentId });
    
    while (this.isRunning) {
      try {
        await this.processQueue();
        await this.delay(1000);
      } catch (error) {
        this.emit('agent:error', { agentId: this.agentId, error });
      }
    }
  }

  async processQueue() {
    const task = await this.redis.brpop(this.config.queueName, 5);
    if (task) {
      await this.processTask(JSON.parse(task[1]));
    }
  }

  async processTask(task) {
    // Override in child classes
    throw new Error('processTask must be implemented');
  }

  async stop() {
    this.isRunning = false;
    await this.redis.quit();
    this.emit('agent:stopped', { agentId: this.agentId });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = BaseAgent;
```

### Memory Management
```javascript
// memory-manager.js
const fs = require('fs').promises;
const path = require('path');

class MemoryManager {
  constructor(agentId) {
    this.agentId = agentId;
    this.memoryDir = path.join('.agent-memory', agentId);
  }

  async saveMemory(type, content) {
    await fs.mkdir(this.memoryDir, { recursive: true });
    const filePath = path.join(this.memoryDir, `${type}.md`);
    await fs.writeFile(filePath, content);
  }

  async loadMemory(type) {
    try {
      const filePath = path.join(this.memoryDir, `${type}.md`);
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      return '';
    }
  }

  async clearContext() {
    // Clear working memory while preserving persistent memory
    const currentSession = await this.loadMemory('current-session');
    const completedTasks = await this.loadMemory('completed-tasks');
    
    // Archive current session
    if (currentSession) {
      await this.saveMemory('completed-tasks', 
        completedTasks + '\n\n' + currentSession);
    }
    
    // Clear current session
    await this.saveMemory('current-session', '');
  }
}

module.exports = MemoryManager;
```