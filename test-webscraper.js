const Redis = require('redis');

async function testWebScraper() {
  console.log('🧪 Testing WebScraper Agent...\n');
  
  const redis = Redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  
  try {
    await redis.connect();
    console.log('✅ Connected to Redis');
    
    // Test 1: Simple generic scraping
    console.log('\n📋 Test 1: Generic scraping (no auth)');
    const genericTask = {
      id: `test-generic-${Date.now()}`,
      type: 'scrape',
      url: 'https://example.com',
      scraperType: 'generic',
      authRequired: false,
      extractionRules: {
        title: 'h1',
        description: 'p',
        links: {
          selector: 'a',
          attribute: 'href',
          multiple: true
        }
      },
      captureScreenshot: true,
      timestamp: new Date().toISOString()
    };
    
    await redis.lPush('queue:webscraper', JSON.stringify(genericTask));
    console.log(`✅ Queued generic scraping task: ${genericTask.id}`);
    
    // Test 2: LinkedIn scraping (simulated - no real credentials)
    console.log('\n📋 Test 2: LinkedIn scraping (auth required)');
    const linkedinTask = {
      id: `test-linkedin-${Date.now()}`,
      type: 'scrape',
      url: 'https://linkedin.com/feed',
      scraperType: 'linkedin',
      authRequired: true,
      credentials: {
        username: 'test@example.com',
        password: 'test-password'
      },
      extractionRules: {
        extractFeedPosts: true,
        postLimit: 5
      },
      analyzeWithClaude: true,
      analysisPrompt: 'Analyze these LinkedIn posts and identify key industry trends',
      timestamp: new Date().toISOString()
    };
    
    await redis.lPush('queue:webscraper', JSON.stringify(linkedinTask));
    console.log(`✅ Queued LinkedIn scraping task: ${genericTask.id}`);
    
    // Test 3: Check queue status
    console.log('\n📊 Checking queue status...');
    const queueLength = await redis.lLen('queue:webscraper');
    console.log(`Queue length: ${queueLength}`);
    
    // Test 4: Monitor for results (wait up to 30 seconds)
    console.log('\n⏳ Monitoring for results (30 seconds max)...');
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      const result1 = await redis.get(`task:${genericTask.id}:result`);
      const result2 = await redis.get(`task:${linkedinTask.id}:result`);
      
      if (result1) {
        console.log('✅ Generic scraping completed!');
        const parsedResult = JSON.parse(result1);
        console.log('   - URL:', parsedResult.url);
        console.log('   - Screenshot:', parsedResult.screenshotPath ? 'Captured' : 'None');
        console.log('   - Data keys:', Object.keys(parsedResult.extractedData || {}));
      }
      
      if (result2) {
        console.log('✅ LinkedIn scraping completed!');
        const parsedResult = JSON.parse(result2);
        console.log('   - URL:', parsedResult.url);
        console.log('   - Claude analysis queued:', parsedResult.claudeAnalysisQueued);
      }
      
      if (result1 && result2) break;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      if (attempts % 5 === 0) {
        console.log(`   Still waiting... (${attempts}/${maxAttempts})`);
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('⏰ Timeout reached. Tasks may still be processing...');
    }
    
    // Test 5: Check for errors
    console.log('\n🔍 Checking for errors...');
    const error1 = await redis.get(`task:${genericTask.id}:error`);
    const error2 = await redis.get(`task:${linkedinTask.id}:error`);
    
    if (error1) {
      console.log('❌ Generic task error:', JSON.parse(error1));
    }
    
    if (error2) {
      console.log('❌ LinkedIn task error:', JSON.parse(error2));
    }
    
    if (!error1 && !error2) {
      console.log('✅ No errors detected');
    }
    
    console.log('\n🎉 WebScraper test completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the webscraper agent: docker-compose up webscraper-agent');
    console.log('   2. Check the dashboard at http://localhost:3000');
    console.log('   3. Monitor .agent-memory/webscraper/ for results');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await redis.disconnect();
  }
}

// Run test if called directly
if (require.main === module) {
  testWebScraper().catch(console.error);
}

module.exports = { testWebScraper };