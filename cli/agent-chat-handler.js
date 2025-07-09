/**
 * Agent Chat Handler
 * 
 * Mixin for agents to handle chat messages from the CLI
 */

class AgentChatHandler {
  constructor(agentId, agentType) {
    this.agentId = agentId;
    this.agentType = agentType;
  }
  
  /**
   * Process incoming chat messages
   */
  async handleChatMessage(data, communication) {
    const { type, from, message } = data;
    
    // Log the incoming message
    console.log(`💬 Chat message from ${from}: ${message}`);
    
    // Generate context-aware response
    const response = await this.generateResponse(message);
    
    // Send response back
    if (from.startsWith('cli-user-')) {
      // Direct response to CLI user
      await communication.sendDirectMessage(from, response, 'chat_response');
    } else {
      // Response to another agent
      await communication.sendDirectMessage(from, response, 'agent_response');
    }
  }
  
  /**
   * Generate agent-specific responses
   */
  async generateResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Agent-specific responses based on type
    const responses = {
      'claude': this.getClaudeResponses(lowerMessage),
      'gpt': this.getGPTResponses(lowerMessage),
      'deepseek': this.getDeepSeekResponses(lowerMessage),
      'mistral': this.getMistralResponses(lowerMessage),
      'gemini': this.getGeminiResponses(lowerMessage)
    };
    
    const agentResponses = responses[this.agentType] || this.getDefaultResponses(lowerMessage);
    
    // Check for matching patterns
    for (const [pattern, response] of Object.entries(agentResponses)) {
      if (lowerMessage.includes(pattern)) {
        return response.replace('{agent}', this.agentId);
      }
    }
    
    // Default response
    return `Hello! I'm ${this.agentId}, a ${this.agentType} agent. I received your message: "${message}". How can I assist you with ${this.getSpecialty()}?`;
  }
  
  getClaudeResponses(message) {
    return {
      'help': 'I specialize in architecture design, code refactoring, and comprehensive code reviews. I can help you improve code structure, identify architectural patterns, and ensure best practices.',
      'refactor': 'I\'d be happy to help refactor your code! Please specify which file or module you\'d like me to analyze. I\'ll focus on improving clarity, maintainability, and architectural patterns.',
      'architecture': 'I can analyze your system architecture and suggest improvements. What specific aspect would you like me to review - microservices design, component structure, or overall system patterns?',
      'review': 'I\'ll perform a thorough code review focusing on design patterns, code quality, and architectural concerns. Which files would you like me to examine?',
      'status': 'I\'m currently {agent}, specialized in refactoring and architecture. My current workload is manageable and I\'m ready to assist.',
      'hello': 'Hello! I\'m {agent}, your architecture and refactoring specialist. I excel at improving code structure and ensuring robust design patterns.'
    };
  }
  
  getGPTResponses(message) {
    return {
      'help': 'I\'m specialized in backend logic, API development, and data processing. I can help you build robust server-side functionality, design RESTful APIs, and handle complex data operations.',
      'api': 'I can help you design and implement APIs! Whether it\'s REST, GraphQL, or WebSocket endpoints, I\'ll ensure proper error handling, validation, and performance.',
      'backend': 'Backend development is my specialty! I can help with database queries, business logic, authentication systems, and server optimization.',
      'logic': 'I excel at implementing complex business logic. Describe your requirements and I\'ll create clean, efficient, and well-tested implementations.',
      'status': 'I\'m {agent}, your backend specialist. Currently active and ready to handle API development and server-side logic.',
      'hello': 'Hi there! I\'m {agent}, focused on backend development and API design. How can I help with your server-side needs?'
    };
  }
  
  getDeepSeekResponses(message) {
    return {
      'help': 'I specialize in testing, validation, and type generation. I can create comprehensive test suites, implement validation logic, and ensure type safety across your codebase.',
      'test': 'I\'ll create thorough test coverage for your code! I can write unit tests, integration tests, and end-to-end tests. Which components need testing?',
      'validation': 'I can implement robust validation logic for your data models, API inputs, and business rules. What validation requirements do you have?',
      'types': 'I\'ll generate TypeScript types or implement type checking to ensure type safety. Which modules need type definitions?',
      'status': 'I\'m {agent}, your testing and validation expert. Ready to ensure code quality through comprehensive testing.',
      'hello': 'Hello! I\'m {agent}, specialized in testing and validation. I ensure your code is reliable and type-safe.'
    };
  }
  
  getMistralResponses(message) {
    return {
      'help': 'I focus on documentation, technical writing, and code comments. I can create comprehensive documentation, write clear README files, and add helpful inline comments.',
      'document': 'I\'ll create clear and comprehensive documentation! Whether it\'s API docs, user guides, or technical specifications, I ensure clarity and completeness.',
      'readme': 'I can write or improve your README files with proper structure, examples, and clear instructions. What project needs documentation?',
      'comment': 'I\'ll add helpful inline comments to explain complex logic, document functions, and improve code readability. Which files need better comments?',
      'status': 'I\'m {agent}, your documentation specialist. Ready to make your code more understandable through clear documentation.',
      'hello': 'Greetings! I\'m {agent}, specialized in documentation and technical writing. I make code understandable and well-documented.'
    };
  }
  
  getGeminiResponses(message) {
    return {
      'help': 'I specialize in code analysis, optimization, and performance improvements. I can identify bottlenecks, suggest optimizations, and analyze code metrics.',
      'analyze': 'I\'ll perform a detailed analysis of your code! I can check for performance issues, code smells, and optimization opportunities.',
      'optimize': 'I can optimize your code for better performance! Whether it\'s algorithm improvements, caching strategies, or resource optimization, I\'ll help.',
      'performance': 'Performance analysis is my specialty! I\'ll identify bottlenecks, suggest improvements, and help you achieve better efficiency.',
      'status': 'I\'m {agent}, your optimization expert. Currently analyzing code patterns and ready to improve performance.',
      'hello': 'Hello! I\'m {agent}, focused on analysis and optimization. I help make your code faster and more efficient.'
    };
  }
  
  getDefaultResponses(message) {
    return {
      'help': 'I\'m an AI agent ready to assist with software development tasks. My capabilities depend on my specific type and configuration.',
      'status': 'I\'m {agent}, currently active and monitoring for tasks.',
      'hello': 'Hello! I\'m {agent}, ready to help with your development needs.',
      'capabilities': 'I can assist with various development tasks based on my configuration. Feel free to ask about specific capabilities!',
      'how are you': 'I\'m functioning optimally! Ready to tackle any development challenges you have.'
    };
  }
  
  getSpecialty() {
    const specialties = {
      'claude': 'architecture design and code refactoring',
      'gpt': 'backend logic and API development',
      'deepseek': 'testing and validation',
      'mistral': 'documentation and technical writing',
      'gemini': 'code analysis and optimization'
    };
    
    return specialties[this.agentType] || 'general development tasks';
  }
  
  /**
   * Handle mentions in broadcasts
   */
  async handleMention(data, communication) {
    const { from, message } = data;
    
    // Check if the mention is asking for help
    if (message.toLowerCase().includes('help') || message.toLowerCase().includes('assist')) {
      const response = `I heard you mention me! I'm ${this.agentId}, specializing in ${this.getSpecialty()}. How can I help?`;
      await communication.broadcastMessage(response, 'mention_response');
    }
  }
  
  /**
   * Set up chat handlers for an agent
   */
  static setupChatHandlers(agentId, agentType, communication) {
    const handler = new AgentChatHandler(agentId, agentType);
    
    // Handle direct chat messages
    communication.on('directMessage', async (data) => {
      if (data.type === 'chat') {
        await handler.handleChatMessage(data, communication);
      }
    });
    
    // Handle mentions
    communication.on('mentioned', async (data) => {
      await handler.handleMention(data, communication);
    });
    
    // Handle broadcast messages
    communication.on('message', async ({ channel, data }) => {
      if (channel === 'agent-chat' && data.type === 'broadcast') {
        // Respond to broadcasts that seem like questions
        if (data.message.includes('?') || data.message.toLowerCase().includes('help')) {
          const response = `${agentId} here - ${handler.getSpecialty()}`;
          setTimeout(async () => {
            await communication.broadcastMessage(response, 'broadcast_response', 'low');
          }, Math.random() * 2000); // Random delay to avoid spam
        }
      }
    });
    
    console.log(`💬 Chat handlers initialized for ${agentId}`);
    return handler;
  }
}

module.exports = AgentChatHandler;