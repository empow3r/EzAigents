#!/usr/bin/env node

/**
 * Test script to demonstrate token efficiency with context clearing
 * Simulates agent processing with and without memory management
 */

const fs = require('fs');
const path = require('path');

// Simulate token counting (rough approximation: 1 token ≈ 4 characters)
function countTokens(text) {
  return Math.ceil(text.length / 4);
}

// Simulate a conversation context
class ConversationContext {
  constructor(name) {
    this.name = name;
    this.messages = [];
    this.totalTokensIn = 0;
    this.totalTokensOut = 0;
  }

  addMessage(role, content) {
    this.messages.push({ role, content, timestamp: new Date().toISOString() });
    const tokens = countTokens(content);
    
    if (role === 'user') {
      // Include full context in input tokens (what gets sent to API)
      const fullContext = this.getContextString();
      this.totalTokensIn += countTokens(fullContext + '\n' + content);
    } else {
      this.totalTokensOut += tokens;
    }
    
    return tokens;
  }
  
  getContextString() {
    return this.messages.map(m => `${m.role}: ${m.content}`).join('\n');
  }

  getContextSize() {
    const contextString = this.messages.map(m => `${m.role}: ${m.content}`).join('\n');
    return countTokens(contextString);
  }

  clearContext() {
    // Save summary before clearing
    const summary = {
      messagesCleared: this.messages.length,
      tokensCleared: this.getContextSize(),
      timestamp: new Date().toISOString()
    };
    
    // Clear messages but keep token counts
    this.messages = [];
    
    return summary;
  }

  getStats() {
    return {
      name: this.name,
      messageCount: this.messages.length,
      currentContextSize: this.getContextSize(),
      totalTokensIn: this.totalTokensIn,
      totalTokensOut: this.totalTokensOut,
      totalTokens: this.totalTokensIn + this.totalTokensOut
    };
  }
}

// Simulate agent memory management
class AgentMemorySimulator {
  constructor(agentName, enableAutoClear = true) {
    this.agentName = agentName;
    this.enableAutoClear = enableAutoClear;
    this.context = new ConversationContext(agentName);
    this.completedTasks = [];
    this.clearHistory = [];
  }

  async processTask(taskPrompt, taskContent) {
    console.log(`\n${this.agentName} - Processing task...`);
    
    // Add user prompt to context
    this.context.addMessage('user', taskPrompt);
    
    // Simulate agent thinking (would include all previous context)
    const contextOverhead = this.context.getContextSize();
    console.log(`  Context size before processing: ${contextOverhead} tokens`);
    
    // Simulate agent response
    const response = `I've analyzed the request. Here's my implementation:\n\n\`\`\`javascript\n${taskContent}\n\`\`\`\n\nThis solution addresses the requirements by...`;
    this.context.addMessage('assistant', response);
    
    // Save to completed tasks
    this.completedTasks.push({
      prompt: taskPrompt,
      response: response,
      contextSize: contextOverhead,
      timestamp: new Date().toISOString()
    });
    
    // Auto-clear context if enabled
    if (this.enableAutoClear) {
      const clearSummary = this.context.clearContext();
      this.clearHistory.push(clearSummary);
      console.log(`  ✓ Context automatically cleared, saved ${clearSummary.tokensCleared} tokens`);
    }
    
    return this.context.getStats();
  }

  getReport() {
    const stats = this.context.getStats();
    const avgContextSize = this.completedTasks.reduce((sum, task) => sum + task.contextSize, 0) / (this.completedTasks.length || 1);
    
    return {
      ...stats,
      completedTasks: this.completedTasks.length,
      clearHistory: this.clearHistory.length,
      avgContextSize: Math.round(avgContextSize),
      tokensSaved: this.clearHistory.reduce((sum, clear) => sum + clear.tokensCleared, 0)
    };
  }
}

// Run the test
async function runTokenEfficiencyTest() {
  console.log('🧪 Token Efficiency Test - Context Clearing Comparison\n');
  console.log('='.repeat(60));
  
  // Test data - 5 typical agent tasks
  const tasks = [
    {
      prompt: "Refactor the user authentication module to use JWT tokens instead of sessions",
      content: "function authenticateUser(credentials) {\n  // JWT implementation\n  const token = jwt.sign(credentials, SECRET);\n  return { success: true, token };\n}"
    },
    {
      prompt: "Add error handling to the API endpoints in the user controller",
      content: "app.use((err, req, res, next) => {\n  logger.error(err);\n  res.status(err.status || 500).json({ error: err.message });\n});"
    },
    {
      prompt: "Implement caching for the product catalog queries to improve performance",
      content: "const cache = new Redis();\nasync function getProducts() {\n  const cached = await cache.get('products');\n  if (cached) return JSON.parse(cached);\n  const products = await db.query('SELECT * FROM products');\n  await cache.set('products', JSON.stringify(products), 'EX', 3600);\n  return products;\n}"
    },
    {
      prompt: "Create unit tests for the order processing service",
      content: "describe('OrderService', () => {\n  it('should process valid orders', async () => {\n    const order = { id: 1, items: [...] };\n    const result = await orderService.process(order);\n    expect(result.status).toBe('completed');\n  });\n});"
    },
    {
      prompt: "Optimize the database queries in the reporting module",
      content: "SELECT \n  DATE_TRUNC('day', created_at) as date,\n  COUNT(*) as order_count,\n  SUM(total) as revenue\nFROM orders\nWHERE created_at >= NOW() - INTERVAL '30 days'\nGROUP BY date\nORDER BY date DESC;"
    }
  ];
  
  // Test 1: With automatic context clearing (memory-managed agent)
  console.log('\n📊 Test 1: Agent WITH Automatic Context Clearing\n');
  const efficientAgent = new AgentMemorySimulator('Efficient Agent', true);
  
  for (const task of tasks) {
    const stats = await efficientAgent.processTask(task.prompt, task.content);
    console.log(`  Current total tokens: ${stats.totalTokens}`);
  }
  
  const efficientReport = efficientAgent.getReport();
  
  // Test 2: Without context clearing (traditional agent)
  console.log('\n📊 Test 2: Agent WITHOUT Context Clearing\n');
  const traditionalAgent = new AgentMemorySimulator('Traditional Agent', false);
  
  for (const task of tasks) {
    const stats = await traditionalAgent.processTask(task.prompt, task.content);
    console.log(`  Current total tokens: ${stats.totalTokens}`);
  }
  
  const traditionalReport = traditionalAgent.getReport();
  
  // Generate comparison report
  console.log('\n' + '='.repeat(60));
  console.log('📈 COMPARISON REPORT\n');
  
  console.log('Efficient Agent (with auto-clearing):');
  console.log(`  • Total tokens used: ${efficientReport.totalTokens}`);
  console.log(`  • Average context size: ${efficientReport.avgContextSize} tokens`);
  console.log(`  • Context clears: ${efficientReport.clearHistory}`);
  console.log(`  • Tokens saved: ${efficientReport.tokensSaved}`);
  
  console.log('\nTraditional Agent (no clearing):');
  console.log(`  • Total tokens used: ${traditionalReport.totalTokens}`);
  console.log(`  • Average context size: ${traditionalReport.avgContextSize} tokens`);
  console.log(`  • Final context size: ${traditionalReport.currentContextSize} tokens`);
  console.log(`  • Context clears: 0`);
  
  const tokenSavings = traditionalReport.totalTokens - efficientReport.totalTokens;
  const savingsPercent = Math.round((tokenSavings / traditionalReport.totalTokens) * 100);
  
  console.log('\n💰 EFFICIENCY GAINS:');
  console.log(`  • Tokens saved: ${tokenSavings} (${savingsPercent}% reduction)`);
  console.log(`  • Cost savings: ~$${(tokenSavings * 0.00002).toFixed(4)} per run`);
  console.log(`  • Scaled to 1000 tasks: ~$${(tokenSavings * 0.00002 * 200).toFixed(2)} saved`);
  
  // Simulate memory files
  const memoryDir = '.agent-memory/test-simulation';
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
  
  // Save completed tasks log
  fs.writeFileSync(
    path.join(memoryDir, 'completed-tasks.md'),
    `# Completed Tasks\n\n` +
    efficientAgent.completedTasks.map((task, i) => 
      `## Task ${i + 1}\n**Prompt:** ${task.prompt}\n**Context Size:** ${task.contextSize} tokens\n**Timestamp:** ${task.timestamp}\n\n`
    ).join('')
  );
  
  // Save efficiency report
  fs.writeFileSync(
    path.join(memoryDir, 'efficiency-report.json'),
    JSON.stringify({
      testDate: new Date().toISOString(),
      efficientAgent: efficientReport,
      traditionalAgent: traditionalReport,
      savings: {
        tokens: tokenSavings,
        percentage: savingsPercent,
        estimatedCostSavings: tokenSavings * 0.00002
      }
    }, null, 2)
  );
  
  console.log(`\n✅ Test complete! Results saved to ${memoryDir}/`);
}

// Run the test
runTokenEfficiencyTest().catch(console.error);