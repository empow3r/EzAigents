const BaseAgent = require('../base-agent');
const puppeteer = require('puppeteer');
const SessionManager = require('./auth/session-manager');
const LinkedInScraper = require('./scrapers/linkedin');
const GenericScraper = require('./scrapers/generic');
const GmailScraper = require('./scrapers/gmail');
const fs = require('fs').promises;
const path = require('path');

class WebScraperAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      ...config,
      model: 'webscraper',
      role: 'Web Scraping Specialist',
      capabilities: [
        'authenticated_scraping',
        'dom_extraction', 
        'session_management',
        'cookie_persistence',
        'multi_site_auth',
        'data_extraction',
        'screenshot_capture'
      ],
      systemPrompt: `You are a specialized web scraping agent capable of:
- Authenticating with websites using saved sessions
- Extracting structured data from web pages
- Managing browser sessions and cookies
- Handling dynamic JavaScript content
- Capturing screenshots for verification
- Respecting rate limits and robots.txt`
    });
    
    this.browser = null;
    this.sessionManager = new SessionManager(this.config.agentId);
    this.scrapers = {
      linkedin: new LinkedInScraper(),
      gmail: new GmailScraper(),
      generic: new GenericScraper()
    };
    
    this.sessionsDir = path.join(process.cwd(), '.agent-memory', 'webscraper', 'sessions');
    this.screenshotsDir = path.join(process.cwd(), '.agent-memory', 'webscraper', 'screenshots');
  }

  async initialize() {
    await super.initialize();
    
    // Ensure directories exist
    await fs.mkdir(this.sessionsDir, { recursive: true });
    await fs.mkdir(this.screenshotsDir, { recursive: true });
    
    // Initialize browser
    await this.initBrowser();
    
    this.log('WebScraper agent initialized with Puppeteer');
  }

  async initBrowser() {
    if (this.browser) {
      await this.browser.close();
    }
    
    this.browser = await puppeteer.launch({
      headless: process.env.SCRAPER_HEADLESS !== 'false',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });
  }

  async processTask(task) {
    this.log(`Processing scraping task: ${task.url}`);
    
    try {
      const {
        url,
        scraperType = 'generic',
        authRequired = false,
        credentials,
        extractionRules,
        captureScreenshot = false,
        analyzeWithClaude = false,
        analysisPrompt
      } = task;

      // Select appropriate scraper
      const scraper = this.scrapers[scraperType] || this.scrapers.generic;
      
      // Create new page
      const page = await this.browser.newPage();
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Load session if auth required
      if (authRequired) {
        const sessionLoaded = await this.sessionManager.loadSession(page, url);
        
        if (!sessionLoaded && credentials) {
          this.log('No saved session found, attempting login...');
          await scraper.login(page, url, credentials);
          await this.sessionManager.saveSession(page, url);
        }
      }
      
      // Navigate to URL
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for any specific elements if defined
      if (extractionRules?.waitForSelector) {
        await page.waitForSelector(extractionRules.waitForSelector, { timeout: 10000 });
      }
      
      // Extract data
      const extractedData = await scraper.extract(page, extractionRules);
      
      // Capture screenshot if requested
      let screenshotPath = null;
      if (captureScreenshot) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        screenshotPath = path.join(this.screenshotsDir, `${timestamp}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        this.log(`Screenshot saved: ${screenshotPath}`);
      }
      
      // Clean up
      await page.close();
      
      // Prepare result
      const result = {
        url,
        extractedData,
        screenshotPath,
        timestamp: new Date().toISOString(),
        scraperType
      };
      
      // Send to Claude for analysis if requested
      if (analyzeWithClaude && analysisPrompt) {
        const claudeTask = {
          type: 'analyze_scraped_data',
          data: extractedData,
          prompt: analysisPrompt,
          sourceUrl: url
        };
        
        await this.redis.lpush('queue:claude-3-opus', JSON.stringify(claudeTask));
        result.claudeAnalysisQueued = true;
      }
      
      // Save to memory
      await this.saveToMemory({
        type: 'scraping_result',
        ...result
      });
      
      return result;
      
    } catch (error) {
      this.log(`Scraping error: ${error.message}`, 'error');
      throw error;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    await super.cleanup();
  }

  async handleAuthChallenge(page, url) {
    // Check for common auth challenge indicators
    const authIndicators = [
      'input[type="password"]',
      'button[type="submit"]',
      '.login-form',
      '#login',
      '[data-testid="login"]'
    ];
    
    for (const selector of authIndicators) {
      const element = await page.$(selector);
      if (element) {
        this.log('Auth challenge detected, session may have expired');
        return true;
      }
    }
    
    return false;
  }

  getQueueName() {
    return 'queue:webscraper';
  }
}

// Export for use
module.exports = WebScraperAgent;

// Start agent if run directly
if (require.main === module) {
  const agent = new WebScraperAgent({
    agentId: process.env.AGENT_ID || `webscraper-${Date.now()}`,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  
  agent.start().catch(error => {
    console.error('Failed to start WebScraper agent:', error);
    process.exit(1);
  });
}