#!/usr/bin/env node

// Test script for Smart LLM Selection System
const SmartLLMSelector = require('./shared/smart-llm-selector');

const selector = new SmartLLMSelector();

// Test cases with different prompt types
const testCases = [
  {
    name: "Complex Mathematical Reasoning",
    prompt: "Analyze the mathematical complexity of this algorithm and provide a step-by-step reasoning for optimization strategies. Consider algorithmic complexity, memory usage, and potential mathematical improvements.",
    expected: "deepseek-r1"
  },
  {
    name: "Simple Code Debug",
    prompt: "Fix this simple bug in the JavaScript function. The function should return the sum of two numbers.",
    expected: "deepseek-coder"
  },
  {
    name: "Architecture Design",
    prompt: "Design a comprehensive microservices architecture for a large-scale e-commerce platform. Include detailed system design, data flow, and scalability considerations.",
    expected: "claude-3-opus"
  },
  {
    name: "Quick Analysis",
    prompt: "Analyze this data and provide a summary of trends.",
    expected: "gemini-pro"
  },
  {
    name: "Complex Code Refactoring",
    prompt: "Refactor this complex legacy codebase with advanced design patterns and architectural improvements. The code is highly sophisticated and requires deep analysis.",
    expected: "claude-3-opus"
  },
  {
    name: "Test Writing",
    prompt: "Write unit tests for this function to validate its behavior.",
    expected: "deepseek-coder"
  },
  {
    name: "Mathematical Algorithm Design",
    prompt: "Design an advanced algorithm for solving complex mathematical optimization problems with step-by-step reasoning and proof of correctness.",
    expected: "deepseek-r1"
  },
  {
    name: "Creative Writing Task",
    prompt: "Write a creative and innovative story about AI collaboration in the future. Make it engaging and original.",
    expected: "claude-3-opus"
  }
];

console.log('🧠 Testing Smart LLM Selection System\n');
console.log('=' .repeat(80));

let correctSelections = 0;
const results = [];

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log('-'.repeat(60));
  console.log(`Prompt: "${testCase.prompt.substring(0, 100)}..."`);
  
  const selection = selector.selectBestLLM(testCase.prompt, 0, {});
  const selectedModel = selection.recommended.model;
  const score = selection.recommended.score;
  
  console.log(`Expected: ${testCase.expected}`);
  console.log(`Selected: ${selectedModel} (score: ${score.toFixed(1)})`);
  console.log(`Reasoning: ${selection.selection_reasoning}`);
  
  const isCorrect = selectedModel === testCase.expected;
  if (isCorrect) {
    correctSelections++;
    console.log('✅ CORRECT');
  } else {
    console.log('❌ INCORRECT');
  }
  
  results.push({
    testCase: testCase.name,
    expected: testCase.expected,
    selected: selectedModel,
    score,
    correct: isCorrect,
    reasoning: selection.selection_reasoning,
    alternatives: selection.alternatives.slice(0, 2).map(alt => ({
      model: alt.model,
      score: alt.score
    }))
  });
});

console.log('\n' + '='.repeat(80));
console.log('📊 SUMMARY RESULTS');
console.log('='.repeat(80));
console.log(`Accuracy: ${correctSelections}/${testCases.length} (${(correctSelections/testCases.length*100).toFixed(1)}%)`);

console.log('\n📈 Detailed Results:');
results.forEach(result => {
  console.log(`${result.correct ? '✅' : '❌'} ${result.testCase}: ${result.selected} (${result.score.toFixed(1)})`);
});

// Test quick selection method
console.log('\n🚀 Testing Quick Selection Method:');
console.log('-'.repeat(40));
const quickTests = [
  { taskType: 'complex-reasoning', complexity: 'high', expected: 'deepseek-r1' },
  { taskType: 'coding', complexity: 'low', expected: 'deepseek-coder' },
  { taskType: 'architecture', complexity: 'high', expected: 'claude-3-opus' },
  { taskType: 'analysis', complexity: 'medium', expected: 'gemini-pro' }
];

quickTests.forEach(test => {
  const selected = selector.quickSelect(test.taskType, test.complexity);
  const isCorrect = selected === test.expected;
  console.log(`${isCorrect ? '✅' : '❌'} ${test.taskType} (${test.complexity}): ${selected}`);
});

// Test API integration simulation
console.log('\n🔗 Testing API Integration:');
console.log('-'.repeat(40));

async function testAPIIntegration() {
  try {
    // Simulate API call to smart queue submit
    const testPayload = {
      task: {
        prompt: "Design a complex neural network architecture for natural language processing with mathematical optimization",
        file: "src/models/nlp_model.py",
        type: "architecture"
      },
      priority: "high",
      preferences: {
        prioritizeQuality: true
      },
      autoSelect: true
    };

    console.log('Test Payload:', JSON.stringify(testPayload, null, 2));
    
    // Simulate the selection process
    const contextLength = testPayload.task.prompt.length + 1000; // Simulate file content
    const selection = selector.selectBestLLM(
      testPayload.task.prompt, 
      contextLength, 
      testPayload.preferences
    );

    console.log('\nAPI Response Simulation:');
    console.log({
      success: true,
      selectedModel: selection.recommended.model,
      queue: `queue:${selection.recommended.model}`,
      selectionInfo: {
        analysis: selection.analysis,
        reasoning: selection.selection_reasoning,
        confidence: selection.recommended.score
      },
      estimatedProcessingTime: selection.recommended.capabilities.averageResponseTime / 1000 + 's'
    });

  } catch (error) {
    console.error('❌ API Integration test failed:', error.message);
  }
}

testAPIIntegration();

console.log('\n🎯 Smart LLM Selection System Ready!');
console.log('Use the new API endpoint: POST /api/smart-queue-submit');
console.log('Features enabled:');
console.log('  • Automatic model selection based on prompt analysis');
console.log('  • DeepSeek R1 integration for complex reasoning');
console.log('  • Context-aware routing');
console.log('  • Performance and cost optimization');
console.log('  • Selection analytics and reasoning');