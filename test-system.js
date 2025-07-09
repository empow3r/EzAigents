const Redis = require('ioredis');
const chalk = require('chalk');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Test components
async function testRedis() {
    console.log(chalk.blue('\n🔴 Testing Redis Connection...'));
    const redis = new Redis({
        host: 'localhost',
        port: 6379,
        retryStrategy: (times) => Math.min(times * 50, 2000)
    });
    
    try {
        await redis.ping();
        console.log(chalk.green('✅ Redis connection successful'));
        
        // Test queue operations
        const testQueue = 'queue:test';
        const testJob = JSON.stringify({ id: '123', task: 'test' });
        
        await redis.lpush(testQueue, testJob);
        const job = await redis.rpop(testQueue);
        
        if (job === testJob) {
            console.log(chalk.green('✅ Queue operations working'));
        } else {
            throw new Error('Queue operations failed');
        }
        
        redis.disconnect();
        return true;
    } catch (error) {
        console.log(chalk.red('❌ Redis test failed:', error.message));
        redis.disconnect();
        return false;
    }
}

async function testCLI() {
    console.log(chalk.blue('\n📦 Testing CLI/Orchestrator...'));
    
    try {
        // Check if runner.js exists
        await fs.access('cli/runner.js');
        console.log(chalk.green('✅ Orchestrator file exists'));
        
        // Check dependencies
        const cliPackage = JSON.parse(await fs.readFile('cli/package.json', 'utf8'));
        if (cliPackage.dependencies.ioredis && cliPackage.dependencies.axios) {
            console.log(chalk.green('✅ CLI dependencies configured'));
        }
        
        return true;
    } catch (error) {
        console.log(chalk.red('❌ CLI test failed:', error.message));
        return false;
    }
}

async function testAgents() {
    console.log(chalk.blue('\n🤖 Testing Agent Configurations...'));
    
    const agents = ['claude', 'gpt', 'deepseek', 'mistral', 'gemini'];
    let allPassed = true;
    
    for (const agent of agents) {
        try {
            await fs.access(`agents/${agent}/index.js`);
            const agentPackage = JSON.parse(
                await fs.readFile(`agents/${agent}/package.json`, 'utf8')
            );
            
            if (agentPackage.dependencies.ioredis && agentPackage.dependencies.axios) {
                console.log(chalk.green(`✅ ${agent} agent configured`));
            } else {
                throw new Error('Missing dependencies');
            }
        } catch (error) {
            console.log(chalk.red(`❌ ${agent} agent test failed:`, error.message));
            allPassed = false;
        }
    }
    
    return allPassed;
}

async function testDashboard() {
    console.log(chalk.blue('\n🖥️  Testing Dashboard...'));
    
    try {
        const dashboardPackage = JSON.parse(
            await fs.readFile('dashboard/package.json', 'utf8')
        );
        
        if (dashboardPackage.dependencies.next && dashboardPackage.dependencies.react) {
            console.log(chalk.green('✅ Dashboard dependencies configured'));
            console.log(chalk.gray(`   Next.js: ${dashboardPackage.dependencies.next}`));
            console.log(chalk.gray(`   React: ${dashboardPackage.dependencies.react}`));
        }
        
        // Check if build would work
        await fs.access('dashboard/next.config.js');
        console.log(chalk.green('✅ Next.js configuration exists'));
        
        return true;
    } catch (error) {
        console.log(chalk.red('❌ Dashboard test failed:', error.message));
        return false;
    }
}

async function testDockerConfig() {
    console.log(chalk.blue('\n🐳 Testing Docker Configurations...'));
    
    const dockerFiles = [
        'docker-compose.yaml',
        'docker-compose.production.yml',
        'dockge-stack.yml'
    ];
    
    let allPassed = true;
    
    for (const file of dockerFiles) {
        try {
            await fs.access(file);
            console.log(chalk.green(`✅ ${file} exists`));
        } catch (error) {
            console.log(chalk.yellow(`⚠️  ${file} not found`));
            allPassed = false;
        }
    }
    
    return allPassed;
}

async function testEnvironment() {
    console.log(chalk.blue('\n🔐 Testing Environment Configuration...'));
    
    try {
        await fs.access('.env');
        console.log(chalk.green('✅ .env file exists'));
        
        // Check for template
        await fs.access('.env.example');
        console.log(chalk.green('✅ .env.example template exists'));
        
        return true;
    } catch (error) {
        console.log(chalk.yellow('⚠️  Environment files missing'));
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log(chalk.bold.blue('🧪 Ez Aigent System Test Suite'));
    console.log(chalk.blue('=============================='));
    
    const results = {
        redis: await testRedis(),
        cli: await testCLI(),
        agents: await testAgents(),
        dashboard: await testDashboard(),
        docker: await testDockerConfig(),
        environment: await testEnvironment()
    };
    
    console.log(chalk.blue('\n📊 Test Results Summary'));
    console.log(chalk.blue('====================='));
    
    let allPassed = true;
    for (const [component, passed] of Object.entries(results)) {
        const status = passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
        console.log(`${component.padEnd(15)} ${status}`);
        if (!passed) allPassed = false;
    }
    
    if (allPassed) {
        console.log(chalk.bold.green('\n🎉 All tests passed! System is ready.'));
        console.log(chalk.yellow('\n📝 Next steps:'));
        console.log('1. Ensure .env is configured with API keys');
        console.log('2. Run: docker-compose build');
        console.log('3. Run: docker-compose up');
        console.log('4. Access dashboard at http://localhost:3000');
    } else {
        console.log(chalk.bold.red('\n⚠️  Some tests failed. Please fix issues before deployment.'));
    }
    
    process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(console.error);