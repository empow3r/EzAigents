#!/usr/bin/env node

/**
 * Ez Aigent Agent Generator CLI
 * Creates new agents using templates
 */

const AgentTemplateFactory = require('../shared/agent-templates');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class AgentGenerator {
  constructor() {
    this.factory = new AgentTemplateFactory();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run() {
    console.log('🤖 Ez Aigent Agent Generator');
    console.log('==============================\n');

    try {
      if (process.argv.length > 2) {
        // Command line mode
        await this.handleCommandLine();
      } else {
        // Interactive mode
        await this.interactiveMode();
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async handleCommandLine() {
    const command = process.argv[2];

    switch (command) {
      case 'list':
        this.listTemplates();
        break;
      case 'create':
        await this.createFromArgs();
        break;
      case 'templates':
        this.listTemplateDetails();
        break;
      case 'help':
        this.showHelp();
        break;
      default:
        console.log(`Unknown command: ${command}`);
        this.showHelp();
    }
  }

  async createFromArgs() {
    const agentName = process.argv[3];
    const templateName = process.argv[4];

    if (!agentName || !templateName) {
      console.log('Usage: node create-agent.js create <agent-name> <template-name>');
      this.listTemplates();
      return;
    }

    await this.createAgent(agentName, templateName);
  }

  async interactiveMode() {
    const agentName = await this.question('Agent name: ');
    
    console.log('\nAvailable templates:');
    this.listTemplates();
    
    const templateName = await this.question('\nChoose template: ');
    
    const template = this.factory.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    console.log(`\nTemplate: ${templateName}`);
    console.log(`Type: ${template.type}`);
    console.log(`Capabilities: ${template.config.capabilities.join(', ')}`);
    
    const confirm = await this.question('\nCreate agent? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('Agent creation cancelled.');
      return;
    }

    // Collect custom configuration
    const customConfig = await this.collectCustomConfig(template);

    await this.createAgent(agentName, templateName, customConfig);
  }

  async collectCustomConfig(template) {
    const config = {};
    
    console.log('\n🔧 Custom Configuration (press Enter to use defaults):');
    
    if (template.config.model) {
      const model = await this.question(`Model (${template.config.model}): `);
      if (model) config.model = model;
    }

    if (template.config.apiEndpoint) {
      const endpoint = await this.question(`API Endpoint (${template.config.apiEndpoint}): `);
      if (endpoint) config.apiEndpoint = endpoint;
    }

    const role = await this.question(`Role (${template.config.role}): `);
    if (role) config.role = role;

    const specialization = await this.question(`Specialization (${template.config.specialization}): `);
    if (specialization) config.specialization = specialization;

    return config;
  }

  async createAgent(agentName, templateName, customConfig = {}) {
    console.log(`\n🚀 Creating agent '${agentName}' using template '${templateName}'...`);

    try {
      const result = await this.factory.generateAgent(agentName, templateName, customConfig);
      
      console.log(`✅ Agent created successfully!`);
      console.log(`📁 Location: ${result.agentDir}`);
      console.log(`📄 Files created:`);
      result.files.forEach(file => console.log(`   - ${file}`));
      
      // Update docker-compose if needed
      await this.updateDockerCompose(agentName, result.config);
      
      // Show next steps
      this.showNextSteps(agentName, result.agentDir);
      
    } catch (error) {
      console.error(`❌ Failed to create agent: ${error.message}`);
      throw error;
    }
  }

  async updateDockerCompose(agentName, config) {
    try {
      const dockerComposePath = path.join(process.cwd(), 'docker-compose.yml');
      const content = await fs.readFile(dockerComposePath, 'utf8');
      
      // Check if agent already exists in docker-compose
      if (content.includes(`${agentName}-agent:`)) {
        console.log(`⚠️  Agent '${agentName}' already exists in docker-compose.yml`);
        return;
      }

      const agentService = this.generateDockerComposeService(agentName, config);
      
      // Insert before the networks section
      const networksIndex = content.indexOf('networks:');
      if (networksIndex === -1) {
        console.log('⚠️  Could not find networks section in docker-compose.yml');
        return;
      }

      const updatedContent = 
        content.slice(0, networksIndex) + 
        agentService + '\n' +
        content.slice(networksIndex);

      await fs.writeFile(dockerComposePath, updatedContent);
      console.log(`✅ Added '${agentName}' to docker-compose.yml`);
      
    } catch (error) {
      console.log(`⚠️  Could not update docker-compose.yml: ${error.message}`);
    }
  }

  generateDockerComposeService(agentName, config) {
    const envVars = [
      `- AGENT_ID=${agentName}-docker-001`,
      `- REDIS_URL=redis://redis:6379`,
      `- AGENT_TYPE=${agentName}`
    ];

    // Add template-specific environment variables
    if (config.model) {
      envVars.push(`- MODEL=${config.model}`);
    }

    return `  # ${config.role || agentName} Agent
  ${agentName}-agent:
    build:
      context: .
      dockerfile: Dockerfile.agent
      args:
        AGENT_TYPE: ${agentName}
    container_name: ezaigents-${agentName}
    command: ["node", "agents/${agentName}/enhanced-coordinated-index.js"]
    environment:
${envVars.map(env => `      ${env}`).join('\n')}
    depends_on:
      redis:
        condition: service_healthy
    volumes:
      - ./src:/app/src
      - ./.agent-memory/${agentName}:/app/.agent-memory/${agentName}
      - ./agents/${agentName}/logs:/app/agents/${agentName}/logs
    networks:
      - ezaigents-network
    restart: unless-stopped
    profiles:
      - development
      - production

`;
  }

  listTemplates() {
    const templates = this.factory.listTemplates();
    console.log('Available templates:');
    templates.forEach(template => {
      const details = this.factory.getTemplate(template);
      console.log(`  - ${template} (${details.type})`);
    });
  }

  listTemplateDetails() {
    const templates = this.factory.listTemplates();
    
    console.log('📋 Template Details:\n');
    
    templates.forEach(templateName => {
      const template = this.factory.getTemplate(templateName);
      console.log(`🔧 ${templateName}`);
      console.log(`   Type: ${template.type}`);
      console.log(`   Role: ${template.config.role}`);
      console.log(`   Capabilities: ${template.config.capabilities.join(', ')}`);
      console.log(`   Env Vars: ${template.envVars.join(', ') || 'None'}`);
      console.log(`   Ports: ${template.ports.join(', ') || 'None'}`);
      console.log('');
    });
  }

  showNextSteps(agentName, agentDir) {
    console.log(`\n📋 Next Steps:`);
    console.log(`1. Install dependencies:`);
    console.log(`   cd ${agentDir} && npm install`);
    console.log(`\n2. Configure environment variables (if needed)`);
    console.log(`\n3. Test the agent:`);
    console.log(`   npm run dev`);
    console.log(`\n4. Start with coordination:`);
    console.log(`   npm run start:enhanced`);
    console.log(`\n5. Deploy with Docker:`);
    console.log(`   docker-compose up -d ${agentName}-agent`);
    console.log(`\n📚 See CLAUDE.md for integration guide`);
  }

  showHelp() {
    console.log(`Ez Aigent Agent Generator

Usage:
  node create-agent.js                    # Interactive mode
  node create-agent.js create <name> <template>  # Create agent
  node create-agent.js list               # List templates
  node create-agent.js templates          # Show template details
  node create-agent.js help               # Show this help

Examples:
  node create-agent.js create myapi ai-agent
  node create-agent.js create dbmgr database-agent
  node create-agent.js create security security-agent
`);
  }

  question(prompt) {
    return new Promise(resolve => {
      this.rl.question(prompt, resolve);
    });
  }
}

// Run the generator
if (require.main === module) {
  const generator = new AgentGenerator();
  generator.run().catch(console.error);
}

module.exports = AgentGenerator;