#!/usr/bin/env node

/**
 * Ez Aigent Project Creator Demo
 * This script demonstrates creating a real SaaS project using the Project Creator API
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Demo project templates
const projectTemplates = {
  1: {
    name: 'Task Management SaaS',
    type: 'saas',
    description: 'A modern task management platform with team collaboration features, real-time updates, and AI-powered task suggestions',
    features: [
      'User Authentication',
      'Team Workspaces',
      'Real-time Collaboration',
      'Task Dependencies',
      'AI Task Suggestions',
      'Calendar Integration',
      'Email Notifications',
      'Analytics Dashboard',
      'Mobile App Support',
      'API Access'
    ],
    techStack: ['Next.js', 'Node.js', 'PostgreSQL', 'Redis', 'Socket.io', 'Stripe']
  },
  2: {
    name: 'E-Learning Marketplace',
    type: 'marketplace',
    description: 'An online learning platform where instructors can create and sell courses, with video streaming, quizzes, and certificates',
    features: [
      'Instructor Dashboard',
      'Course Creation Tools',
      'Video Streaming',
      'Quiz System',
      'Payment Processing',
      'Student Progress Tracking',
      'Certificate Generation',
      'Discussion Forums',
      'Search & Filtering',
      'Rating System'
    ],
    techStack: ['React', 'Express', 'MongoDB', 'Redis', 'AWS S3', 'Stripe', 'FFmpeg']
  },
  3: {
    name: 'AI Content Generator',
    type: 'ai-app',
    description: 'An AI-powered content generation platform for creating blog posts, social media content, and marketing copy',
    features: [
      'Multiple AI Models',
      'Content Templates',
      'Batch Generation',
      'SEO Optimization',
      'Plagiarism Check',
      'Team Collaboration',
      'Content Calendar',
      'API Integration',
      'Usage Analytics',
      'Export Options'
    ],
    techStack: ['Next.js', 'Python', 'FastAPI', 'PostgreSQL', 'Redis', 'OpenAI API', 'Langchain']
  }
};

async function printBanner() {
  console.clear();
  console.log(colors.cyan + '╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║' + colors.bright + '            🚀 Ez Aigent Project Creator Demo 🚀             ' + colors.cyan + '║');
  console.log('║                                                              ║');
  console.log('║  Watch AI agents collaborate to build your project in hours! ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝' + colors.reset);
  console.log();
}

async function selectProject() {
  console.log(colors.yellow + 'Choose a demo project:' + colors.reset);
  console.log();
  
  Object.entries(projectTemplates).forEach(([key, project]) => {
    console.log(colors.green + `  ${key}.` + colors.reset + ` ${project.name}`);
    console.log(`     ${colors.blue}Type:${colors.reset} ${project.type}`);
    console.log(`     ${colors.blue}Features:${colors.reset} ${project.features.length} core features`);
    console.log();
  });

  const choice = await question(colors.yellow + 'Enter your choice (1-3): ' + colors.reset);
  return projectTemplates[choice] || projectTemplates[1];
}

async function displayProjectDetails(project) {
  console.log();
  console.log(colors.cyan + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
  console.log(colors.bright + 'Selected Project:' + colors.reset, project.name);
  console.log(colors.cyan + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
  console.log();
  console.log(colors.blue + 'Description:' + colors.reset);
  console.log(project.description);
  console.log();
  console.log(colors.blue + 'Key Features:' + colors.reset);
  project.features.slice(0, 5).forEach(feature => {
    console.log(`  • ${feature}`);
  });
  console.log(`  ... and ${project.features.length - 5} more features`);
  console.log();
  console.log(colors.blue + 'Tech Stack:' + colors.reset, project.techStack.join(', '));
  console.log();
}

async function createMasterplan(project) {
  console.log(colors.yellow + '📋 Creating project masterplan...' + colors.reset);
  
  try {
    const response = await fetch('http://localhost:3000/api/project-masterplan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: project.name,
        projectType: project.type,
        description: project.description,
        features: project.features,
        timeline: '24',
        budget: 'balanced',
        techStack: project.techStack
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create masterplan: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(colors.green + '✓ Masterplan created successfully!' + colors.reset);
    console.log();
    
    return data;
  } catch (error) {
    console.error(colors.red + '✗ Error creating masterplan:' + colors.reset, error.message);
    throw error;
  }
}

function displayMasterplan(data) {
  const { masterplan } = data;
  
  console.log(colors.cyan + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
  console.log(colors.bright + 'Generated Masterplan' + colors.reset);
  console.log(colors.cyan + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
  console.log();
  
  console.log(colors.blue + 'Project ID:' + colors.reset, data.projectId);
  console.log(colors.blue + 'Total Tasks:' + colors.reset, masterplan.taskBreakdown.length);
  console.log(colors.blue + 'Estimated Time:' + colors.reset, 
    `${masterplan.estimatedCompletion.estimatedHours}h ${masterplan.estimatedCompletion.estimatedMinutes}m`);
  console.log();
  
  console.log(colors.yellow + 'Development Phases:' + colors.reset);
  masterplan.phases.forEach((phase, index) => {
    console.log(`  ${index + 1}. ${phase.name} (${phase.duration})`);
  });
  console.log();
  
  // Count tasks per agent
  const agentTaskCount = {};
  Object.values(masterplan.agentAssignments).forEach(assignment => {
    agentTaskCount[assignment.primaryAgent] = (agentTaskCount[assignment.primaryAgent] || 0) + 1;
  });
  
  console.log(colors.yellow + 'Agent Assignments:' + colors.reset);
  Object.entries(agentTaskCount).forEach(([agent, count]) => {
    const emoji = { claude: '🧠', gpt: '🤖', deepseek: '🔍', mistral: '📝', gemini: '✨' }[agent];
    console.log(`  ${emoji} ${agent}: ${count} tasks`);
  });
  console.log();
}

async function executeProject(projectId) {
  const confirm = await question(colors.yellow + 'Execute this project? (y/n): ' + colors.reset);
  
  if (confirm.toLowerCase() !== 'y') {
    console.log('Project execution cancelled.');
    return null;
  }
  
  console.log();
  console.log(colors.yellow + '🚀 Starting project execution...' + colors.reset);
  
  try {
    const response = await fetch('http://localhost:3000/api/project-execution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        autoStart: true,
        agentConfig: {
          claude: { count: 1 },
          gpt: { count: 2 },
          deepseek: { count: 1 },
          mistral: { count: 1 },
          gemini: { count: 1 }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to execute project: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(colors.green + '✓ Project execution started!' + colors.reset);
    console.log();
    
    return data;
  } catch (error) {
    console.error(colors.red + '✗ Error executing project:' + colors.reset, error.message);
    throw error;
  }
}

async function monitorProgress(projectId) {
  console.log(colors.yellow + '📊 Monitoring project progress...' + colors.reset);
  console.log('(Press Ctrl+C to stop monitoring)');
  console.log();
  
  let lastProgress = -1;
  
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/project-execution?projectId=${projectId}`);
      const data = await response.json();
      
      if (data.success) {
        const progress = data.progress.percentComplete;
        
        if (progress !== lastProgress) {
          lastProgress = progress;
          
          // Clear previous line and show progress
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          
          const barLength = 40;
          const filled = Math.floor((progress / 100) * barLength);
          const empty = barLength - filled;
          const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
          
          process.stdout.write(
            `Progress: [${progressBar}] ${progress}% | ` +
            `Tasks: ${data.progress.completed}/${data.progress.total} | ` +
            `Active: ${data.progress.inProgress} | ` +
            `Failed: ${data.progress.failed}`
          );
          
          if (progress === 100) {
            console.log();
            console.log();
            console.log(colors.green + '🎉 Project completed!' + colors.reset);
            clearInterval(interval);
            rl.close();
          }
        }
      }
    } catch (error) {
      console.error(colors.red + '\nError checking status:' + colors.reset, error.message);
      clearInterval(interval);
      rl.close();
    }
  }, 2000);
}

async function main() {
  try {
    await printBanner();
    
    // Check if dashboard is running
    try {
      await fetch('http://localhost:3000/api/health');
    } catch (error) {
      console.error(colors.red + '❌ Dashboard is not running!' + colors.reset);
      console.log('Please start the dashboard first:');
      console.log(colors.yellow + '  cd dashboard && npm run dev' + colors.reset);
      process.exit(1);
    }
    
    const project = await selectProject();
    await displayProjectDetails(project);
    
    const masterplanData = await createMasterplan(project);
    displayMasterplan(masterplanData);
    
    const execution = await executeProject(masterplanData.projectId);
    
    if (execution) {
      await monitorProgress(masterplanData.projectId);
    } else {
      rl.close();
    }
    
  } catch (error) {
    console.error(colors.red + 'Demo failed:' + colors.reset, error.message);
    rl.close();
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n' + colors.yellow + 'Demo stopped by user.' + colors.reset);
  console.log('Visit http://localhost:3000 to view the dashboard.');
  process.exit(0);
});

// Run the demo
main();