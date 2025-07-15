/**
 * Agent Templates and Factory for Ez Aigent
 * Provides standardized templates for creating new agent types
 */

const fs = require('fs').promises;
const path = require('path');

class AgentTemplateFactory {
  constructor() {
    this.templates = new Map();
    this.initializeTemplates();
  }

  initializeTemplates() {
    // AI Agent Templates
    this.addTemplate('ai-agent', {
      type: 'ai',
      config: {
        model: 'gpt-4',
        role: 'AI Assistant',
        capabilities: ['general_programming'],
        tokenLimit: 4000,
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        maxLoad: 3,
        priority: 'normal',
        specialization: 'General AI assistance'
      },
      envVars: ['API_KEY'],
      ports: [],
      dependencies: ['axios']
    });

    // Tool Agent Templates
    this.addTemplate('tool-agent', {
      type: 'tool',
      config: {
        role: 'Tool Agent',
        capabilities: ['tool_execution'],
        maxLoad: 5,
        priority: 'normal',
        specialization: 'Tool execution and automation'
      },
      envVars: [],
      ports: [],
      dependencies: []
    });

    // Service Agent Templates
    this.addTemplate('service-agent', {
      type: 'service',
      config: {
        role: 'Service Agent',
        capabilities: ['service_management'],
        maxLoad: 10,
        priority: 'high',
        specialization: 'Service management and coordination'
      },
      envVars: [],
      ports: [8080],
      dependencies: ['express']
    });

    // Integration Agent Templates
    this.addTemplate('integration-agent', {
      type: 'integration',
      config: {
        role: 'Integration Agent',
        capabilities: ['external_integration'],
        maxLoad: 5,
        priority: 'normal',
        specialization: 'External service integration'
      },
      envVars: ['INTEGRATION_API_KEY'],
      ports: [],
      dependencies: ['axios']
    });

    // Specialized Agent Templates
    this.addTemplate('database-agent', {
      type: 'database',
      config: {
        role: 'Database Specialist',
        capabilities: ['sql_queries', 'data_management', 'schema_design'],
        maxLoad: 3,
        priority: 'high',
        specialization: 'Database operations and management'
      },
      envVars: ['DATABASE_URL'],
      ports: [],
      dependencies: ['pg', 'mysql2', 'mongodb']
    });

    this.addTemplate('frontend-agent', {
      type: 'frontend',
      config: {
        role: 'Frontend Specialist',
        capabilities: ['react', 'vue', 'angular', 'css', 'javascript'],
        maxLoad: 3,
        priority: 'normal',
        specialization: 'Frontend development and UI/UX'
      },
      envVars: [],
      ports: [3000],
      dependencies: ['react', 'webpack', 'babel']
    });

    this.addTemplate('mobile-agent', {
      type: 'mobile',
      config: {
        role: 'Mobile Development Specialist',
        capabilities: ['ios_development', 'android_development', 'react_native', 'flutter'],
        maxLoad: 2,
        priority: 'normal',
        specialization: 'Mobile application development'
      },
      envVars: ['MOBILE_SDK_PATH'],
      ports: [8080, 8081],
      dependencies: ['react-native']
    });

    this.addTemplate('security-agent', {
      type: 'security',
      config: {
        role: 'Security Specialist',
        capabilities: ['vulnerability_scanning', 'penetration_testing', 'compliance', 'audit'],
        maxLoad: 2,
        priority: 'high',
        specialization: 'Security analysis and vulnerability assessment'
      },
      envVars: ['SECURITY_API_KEY'],
      ports: [],
      dependencies: ['helmet', 'crypto']
    });

    this.addTemplate('devops-agent', {
      type: 'devops',
      config: {
        role: 'DevOps Specialist',
        capabilities: ['infrastructure_automation', 'monitoring', 'logging', 'deployment'],
        maxLoad: 3,
        priority: 'high',
        specialization: 'Infrastructure and deployment automation'
      },
      envVars: ['DOCKER_HOST', 'KUBECTL_CONFIG'],
      ports: [9090],
      dependencies: ['kubernetes-client', 'docker']
    });

    this.addTemplate('analytics-agent', {
      type: 'analytics',
      config: {
        role: 'Analytics Specialist',
        capabilities: ['data_analysis', 'reporting', 'metrics', 'business_intelligence'],
        maxLoad: 3,
        priority: 'normal',
        specialization: 'Data analysis and business intelligence'
      },
      envVars: ['ANALYTICS_DB_URL'],
      ports: [8888],
      dependencies: ['pandas', 'numpy', 'plotly']
    });
  }

  addTemplate(name, template) {
    this.templates.set(name, template);
  }

  getTemplate(name) {
    return this.templates.get(name);
  }

  listTemplates() {
    return Array.from(this.templates.keys());
  }

  getTemplatesByType(type) {
    return Array.from(this.templates.entries())
      .filter(([name, template]) => template.type === type)
      .map(([name, template]) => ({ name, ...template }));
  }

  /**
   * Generate agent files based on template
   */
  async generateAgent(agentName, templateName, customConfig = {}) {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    const agentDir = path.join(process.cwd(), 'agents', agentName);
    
    // Create agent directory
    await fs.mkdir(agentDir, { recursive: true });
    await fs.mkdir(path.join(agentDir, 'logs'), { recursive: true });

    // Merge custom config with template
    const config = { ...template.config, ...customConfig };
    config.agentType = agentName;

    // Generate config.js
    await this.generateConfigFile(agentDir, config);

    // Generate main index.js
    await this.generateIndexFile(agentDir, agentName, template, config);

    // Generate package.json
    await this.generatePackageJson(agentDir, agentName, template);

    // Generate Dockerfile
    await this.generateDockerfile(agentDir, agentName, template);

    // Generate enhanced-coordinated-index.js
    await this.generateEnhancedIndex(agentDir, agentName, template, config);

    return {
      agentDir,
      config,
      files: [
        'config.js',
        'index.js',
        'enhanced-coordinated-index.js',
        'package.json',
        'Dockerfile'
      ]
    };
  }

  async generateConfigFile(agentDir, config) {
    const configContent = `module.exports = ${JSON.stringify(config, null, 2)};
`;
    await fs.writeFile(path.join(agentDir, 'config.js'), configContent);
  }

  async generateIndexFile(agentDir, agentName, template, config) {
    const indexContent = `// ${agentName} Agent - Enhanced Ez Aigent Implementation
const EnhancedBaseAgent = require('../../shared/enhanced-base-agent');
const config = require('./config');
const axios = require('axios');

class ${this.capitalize(agentName)}Agent extends EnhancedBaseAgent {
  constructor() {
    super({
      ...config,
      agentId: process.env.AGENT_ID || \`${agentName}-\${Date.now()}\`,
      redisUrl: process.env.REDIS_URL
    });
    
    ${this.generateConstructorContent(template, agentName)}
  }

  async initializeAgent() {
    this.log('Initializing ${agentName} agent...');
    // Add agent-specific initialization here
    ${this.generateInitContent(template)}
  }

  async executeTask(task) {
    this.log(\`Executing task: \${task.id || 'unknown'}\`);
    
    try {
      ${this.generateExecuteContent(template, agentName)}
      
      return {
        success: true,
        result: result,
        taskId: task.id,
        agentId: this.config.agentId,
        agentType: '${agentName}'
      };
    } catch (error) {
      this.log(\`Task execution failed: \${error.message}\`, 'error');
      throw error;
    }
  }

  ${this.generateHelperMethods(template, agentName)}
}

// Initialize and start the agent
async function main() {
  const agent = new ${this.capitalize(agentName)}Agent();
  
  try {
    await agent.initialize();
    console.log(\`🤖 ${this.capitalize(agentName)} Agent started successfully with ID: \${agent.config.agentId}\`);
    await agent.start();
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down agent...');
      await agent.cleanup();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('Shutting down agent...');
      await agent.cleanup();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start ${agentName} agent:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ${this.capitalize(agentName)}Agent;
`;
    await fs.writeFile(path.join(agentDir, 'index.js'), indexContent);
  }

  async generateEnhancedIndex(agentDir, agentName, template, config) {
    const enhancedContent = `// ${agentName} Agent - Enhanced Coordinated Implementation
const ${this.capitalize(agentName)}Agent = require('./index');

class Enhanced${this.capitalize(agentName)}Agent extends ${this.capitalize(agentName)}Agent {
  constructor() {
    super();
    
    // Enhanced coordination features
    this.collaborationEnabled = true;
    this.smartDelegation = true;
  }

  async checkCollaborationNeeded(task) {
    // Check if task requires collaboration with other agents
    ${this.generateCollaborationLogic(template, agentName)}
  }

  getRequiredCapabilities(task) {
    // Return capabilities needed for task collaboration
    return this.analyzeTaskRequirements(task);
  }

  analyzeTaskRequirements(task) {
    const capabilities = [];
    
    ${this.generateCapabilityAnalysis(template, agentName)}
    
    return capabilities;
  }

  async handleCollaborationRequest(data, sender) {
    this.log(\`Collaboration request from \${sender}\`);
    
    // Handle specific collaboration patterns for ${agentName}
    if (this.canAssist(data)) {
      await this.processCollaborativeTask(data);
    }
  }

  canAssist(data) {
    // Check if this agent can assist with the requested task
    const myCapabilities = this.config.capabilities;
    const requiredCapabilities = data.requiredCapabilities || [];
    
    return requiredCapabilities.some(cap => myCapabilities.includes(cap));
  }
}

// Start enhanced agent
if (require.main === module) {
  const agent = new Enhanced${this.capitalize(agentName)}Agent();
  
  agent.initialize().then(() => {
    console.log(\`🚀 Enhanced ${this.capitalize(agentName)} Agent started with coordination\`);
    return agent.start();
  }).catch(console.error);
}

module.exports = Enhanced${this.capitalize(agentName)}Agent;
`;
    await fs.writeFile(path.join(agentDir, 'enhanced-coordinated-index.js'), enhancedContent);
  }

  async generatePackageJson(agentDir, agentName, template) {
    const packageJson = {
      name: `ez-aigent-${agentName}`,
      version: "1.0.0",
      description: `Ez Aigent ${agentName} agent`,
      main: "index.js",
      scripts: {
        start: "node index.js",
        "start:enhanced": "node enhanced-coordinated-index.js",
        dev: "nodemon index.js",
        test: "jest"
      },
      dependencies: {
        axios: "^1.10.0",
        ioredis: "^5.3.2",
        ...this.getTemplateDependencies(template)
      },
      devDependencies: {
        nodemon: "^3.0.0",
        jest: "^29.0.0"
      }
    };

    await fs.writeFile(
      path.join(agentDir, 'package.json'), 
      JSON.stringify(packageJson, null, 2)
    );
  }

  async generateDockerfile(agentDir, agentName, template) {
    const dockerContent = `FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy agent files
COPY . .

# Copy shared coordination system
COPY ../../shared ./shared

# Create necessary directories
RUN mkdir -p .agent-memory/${agentName} logs

# Set permissions
RUN chown -R node:node /app
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD node -e "console.log('${agentName} agent healthy')" || exit 1

EXPOSE ${template.ports.join(' ')}

CMD ["node", "enhanced-coordinated-index.js"]
`;
    await fs.writeFile(path.join(agentDir, 'Dockerfile'), dockerContent);
  }

  // Helper methods for content generation
  generateConstructorContent(template, agentName) {
    const content = [];
    
    if (template.envVars.length > 0) {
      content.push('// Environment variables');
      template.envVars.forEach(envVar => {
        content.push(`    this.${envVar.toLowerCase()} = process.env.${envVar};`);
      });
    }

    if (template.ports.length > 0) {
      content.push('// Required ports');
      template.ports.forEach(port => {
        content.push(`    this.addRequiredPort(${port});`);
      });
    }

    return content.join('\n    ');
  }

  generateInitContent(template) {
    const content = [];
    
    if (template.type === 'ai') {
      content.push('// Initialize AI model connection');
      content.push('await this.validateApiConnection();');
    }
    
    if (template.type === 'service') {
      content.push('// Initialize service endpoints');
      content.push('await this.setupServiceEndpoints();');
    }

    return content.join('\n      ');
  }

  generateExecuteContent(template, agentName) {
    if (template.type === 'ai') {
      return `// AI agent task execution
      const prompt = this.buildPrompt(task);
      const response = await this.callAPI(prompt);
      const result = this.processResponse(response, task);`;
    }
    
    if (template.type === 'tool') {
      return `// Tool agent task execution
      const result = await this.executeTool(task);`;
    }
    
    return `// Default task execution
      const result = await this.processTask(task);`;
  }

  generateHelperMethods(template, agentName) {
    const methods = [];

    if (template.type === 'ai') {
      methods.push(`
  buildPrompt(task) {
    return \`You are a ${agentName} specialist.
    
Task: \${task.prompt}
Context: \${task.context || 'N/A'}

Provide a detailed, well-structured response.\`;
  }

  async callAPI(prompt) {
    // Implement API call logic here
    throw new Error('API call not implemented');
  }

  async validateApiConnection() {
    // Validate API key and connection
    this.log('Validating API connection...');
  }`);
    }

    if (template.type === 'tool') {
      methods.push(`
  async executeTool(task) {
    // Implement tool execution logic
    this.log(\`Executing tool for task: \${task.type}\`);
    return { status: 'completed', output: 'Tool execution result' };
  }`);
    }

    return methods.join('\n');
  }

  generateCollaborationLogic(template, agentName) {
    return `// Check if task requires collaboration based on ${agentName} specialization
    const keywords = ${JSON.stringify(template.config.capabilities)};
    const taskRequiresCollaboration = keywords.some(keyword => 
      !task.prompt.toLowerCase().includes(keyword.replace('_', ' '))
    );
    
    return taskRequiresCollaboration;`;
  }

  generateCapabilityAnalysis(template, agentName) {
    return `// Analyze what capabilities are needed
    const taskText = task.prompt.toLowerCase();
    
    ${template.config.capabilities.map(cap => 
      `if (taskText.includes('${cap.replace('_', ' ')}')) capabilities.push('${cap}');`
    ).join('\n    ')}`;
  }

  getTemplateDependencies(template) {
    const deps = {};
    template.dependencies.forEach(dep => {
      deps[dep] = 'latest';
    });
    return deps;
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = AgentTemplateFactory;