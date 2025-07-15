#!/usr/bin/env node

const fetch = require('node-fetch');

async function testProjectCreation() {
  console.log('🚀 Testing Project Creation Workflow...\n');

  const baseUrl = 'http://localhost:3000/api';

  // Step 1: Check system health
  console.log('1️⃣ Checking system health...');
  try {
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    console.log('✅ System health:', healthData.status || 'OK');
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return;
  }

  // Step 2: Check agent status
  console.log('\n2️⃣ Checking agent status...');
  try {
    const agentsRes = await fetch(`${baseUrl}/agents`);
    const agentsData = await agentsRes.json();
    console.log(`✅ Active agents: ${agentsData.count || 0}`);
  } catch (error) {
    console.error('❌ Agent check failed:', error.message);
  }

  // Step 3: Create project masterplan
  console.log('\n3️⃣ Creating project masterplan...');
  const projectData = {
    projectName: 'Test SaaS Platform',
    projectType: 'saas',
    description: 'A test SaaS platform for demonstrating the Ez Aigent system capabilities',
    features: [
      'User Authentication',
      'Dashboard',
      'API Integration',
      'Payment Processing'
    ],
    timeline: '24',
    budget: 'balanced',
    techStack: ['Next.js', 'Node.js', 'PostgreSQL', 'Redis']
  };

  let projectId;
  try {
    const createRes = await fetch(`${baseUrl}/project-masterplan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });

    if (!createRes.ok) {
      const error = await createRes.text();
      throw new Error(`Failed to create project: ${error}`);
    }

    const createData = await createRes.json();
    projectId = createData.projectId;
    console.log(`✅ Project created with ID: ${projectId}`);
    console.log(`   Total tasks: ${createData.masterplan.taskBreakdown.length}`);
    console.log(`   Phases: ${createData.masterplan.phases.length}`);
  } catch (error) {
    console.error('❌ Project creation failed:', error.message);
    return;
  }

  // Step 4: Start project execution
  console.log('\n4️⃣ Starting project execution...');
  try {
    const execRes = await fetch(`${baseUrl}/project-execution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        autoStart: false, // Don't auto-start agents for testing
        agentConfig: {
          claude: { count: 1 },
          gpt: { count: 1 }
        }
      })
    });

    if (!execRes.ok) {
      const error = await execRes.text();
      throw new Error(`Failed to execute project: ${error}`);
    }

    const execData = await execRes.json();
    console.log('✅ Project execution started');
    console.log(`   Status: ${execData.status}`);
  } catch (error) {
    console.error('❌ Project execution failed:', error.message);
    return;
  }

  // Step 5: Check project status
  console.log('\n5️⃣ Checking project status...');
  try {
    const statusRes = await fetch(`${baseUrl}/project-execution?projectId=${projectId}`);
    const statusData = await statusRes.json();
    console.log('✅ Project status retrieved');
    console.log(`   Status: ${statusData.project.status}`);
    console.log(`   Progress: ${statusData.progress.percentComplete}%`);
    console.log(`   Tasks: ${statusData.progress.completed}/${statusData.progress.total} completed`);
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }

  console.log('\n✨ Project creation workflow test completed!');
  console.log(`\n📊 View the project in the dashboard:`);
  console.log(`   http://localhost:3000`);
  console.log(`   Click on "Project Creator" to see your project\n`);
}

// Run the test
testProjectCreation().catch(console.error);