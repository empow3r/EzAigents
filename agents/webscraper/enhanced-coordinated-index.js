const EnhancedBaseAgent = require('../../shared/enhanced-base-agent');
const puppeteer = require('puppeteer');
const SessionManager = require('./auth/session-manager');
const LinkedInScraper = require('./scrapers/linkedin');
const GenericScraper = require('./scrapers/generic');
const GmailScraper = require('./scrapers/gmail');
const fs = require('fs').promises;
const path = require('path');

/**
 * WebScraper Agent with Universal Coordination
 * Specialized for authenticated web scraping and data extraction
 */
class WebScraperAgent extends EnhancedBaseAgent {
  constructor(config = {}) {
    super({
      agentType: 'webscraper',
      agentId: config.agentId || process.env.AGENT_ID || `webscraper-${Date.now()}`,
      model: 'webscraper-v1',
      role: 'Web Scraping & Data Extraction Specialist',
      capabilities: [
        'web_scraping',
        'authenticated_scraping',
        'dom_extraction', 
        'session_management',
        'cookie_persistence',
        'multi_site_auth',
        'data_extraction',
        'screenshot_capture',
        'research'
      ],
      systemPrompt: `You are a specialized web scraping agent capable of:
- Authenticating with websites using saved sessions
- Extracting structured data from web pages
- Managing browser sessions and cookies securely
- Handling dynamic JavaScript content
- Capturing screenshots for verification
- Respecting rate limits and robots.txt
- Collaborating with AI agents for data analysis

You work within the Ez Aigent ecosystem to provide web data to other agents.`,
      maxRetries: 3,
      retryDelay: 2000,
      memoryLimit: 150, // MB
      ...config
    });
    
    // WebScraper-specific configuration
    this.browser = null;
    this.sessionManager = new SessionManager(this.config.agentId);
    this.scrapers = {
      linkedin: new LinkedInScraper(),
      gmail: new GmailScraper(),
      generic: new GenericScraper()
    };
    
    this.sessionsDir = path.join(this.memoryDir, 'sessions');
    this.screenshotsDir = path.join(this.memoryDir, 'screenshots');
    this.dataDir = path.join(this.memoryDir, 'extracted-data');
  }

  async initializeAgent() {
    this.log('Initializing WebScraper agent with coordination system...');
    
    // Ensure scraper-specific directories exist
    await fs.mkdir(this.sessionsDir, { recursive: true });
    await fs.mkdir(this.screenshotsDir, { recursive: true });
    await fs.mkdir(this.dataDir, { recursive: true });
    
    // Initialize browser
    await this.initBrowser();
    
    // Register WebScraper-specific message handlers
    this.coordinator.registerMessageHandler('scrape:request', async (data, sender) => {
      this.log(`Received scraping request from ${sender}`);
      const result = await this.performScraping(data);
      await this.coordinator.sendDirectMessage(sender, 'scrape:result', result);
    });
    
    this.coordinator.registerMessageHandler('research:scrape', async (data, sender) => {
      this.log(`Received research scraping request from ${sender}`);
      const result = await this.performResearchScraping(data);
      await this.coordinator.sendDirectMessage(sender, 'research:data', result);
    });
    
    this.coordinator.registerMessageHandler('session:manage', async (data, sender) => {
      this.log(`Received session management request from ${sender}`);
      const result = await this.manageSession(data);
      await this.coordinator.sendDirectMessage(sender, 'session:status', result);
    });
    
    this.log('WebScraper agent initialization completed');
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
    
    this.log('Browser initialized');
  }

  async executeTask(task) {
    this.log(`Executing WebScraper task: ${task.type || 'scrape'}`);
    
    try {
      let result;
      
      switch (task.type) {
        case 'scrape':
          result = await this.performScraping(task);
          break;
          
        case 'research_scraping':
          result = await this.performResearchScraping(task);
          break;
          
        case 'session_management':
          result = await this.manageSession(task);
          break;
          
        case 'bulk_scraping':
          result = await this.performBulkScraping(task);
          break;
          
        case 'monitoring_scraping':
          result = await this.performMonitoringScraping(task);
          break;
          
        default:
          result = await this.performScraping(task);
      }
      
      // Save result to memory and data directory
      await this.saveToMemory({
        type: 'webscraper_task_completed',
        task: task,
        result: result,
        timestamp: new Date().toISOString()
      }, 'completed');
      
      await this.saveExtractedData(result, task);
      
      return result;
      
    } catch (error) {
      this.log(`WebScraper task execution failed: ${error.message}`, 'error');
      
      await this.saveToMemory({
        type: 'webscraper_task_error',
        task: task,
        error: error.message,
        timestamp: new Date().toISOString()
      }, 'error');
      
      throw error;
    }
  }

  async checkCollaborationNeeded(task) {
    const collaborationScenarios = [
      // Need Claude for data analysis after scraping
      task.analyzeWithClaude === true,
      
      // Need analysis agent for complex data processing
      task.type === 'research_scraping' && task.requiresAnalysis,
      
      // Need documentation agent for research summaries
      task.type === 'research_scraping' && task.generateSummary,
      
      // Need multiple agents for comprehensive research
      task.urls && task.urls.length > 5
    ];
    
    return collaborationScenarios.some(scenario => scenario);
  }

  getRequiredCapabilities(task) {
    const capabilities = [];
    
    if (task.analyzeWithClaude || task.requiresAnalysis) {
      capabilities.push('code_analysis', 'architecture');
    }
    
    if (task.generateSummary) {
      capabilities.push('documentation', 'summarization');
    }
    
    if (task.type === 'research_scraping' && task.topics) {
      capabilities.push('research', 'analysis');
    }
    
    return capabilities;
  }

  createSubtask(task, collaborator) {
    const subtask = { ...task, delegatedBy: this.config.agentId };
    
    if (collaborator.capabilities.includes('code_analysis')) {
      subtask.type = 'analyze_scraped_data';
      subtask.data = task.result?.extractedData;
      subtask.prompt = task.analysisPrompt || 'Analyze this scraped data and provide insights';
    }
    
    if (collaborator.capabilities.includes('documentation')) {
      subtask.type = 'summarize_research';
      subtask.data = task.result?.extractedData;
      subtask.format = task.summaryFormat || 'markdown';
    }
    
    return subtask;
  }

  async performScraping(task) {
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

    this.log(`Starting scraping: ${url} (${scraperType})`);

    // Select appropriate scraper
    const scraper = this.scrapers[scraperType] || this.scrapers.generic;
    
    // Create new page
    const page = await this.browser.newPage();
    
    try {
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
      
      // Wait for specific elements if defined
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
      
      const result = {
        url,
        extractedData,
        screenshotPath,
        timestamp: new Date().toISOString(),
        scraperType,
        success: true
      };
      
      // Send to Claude for analysis if requested
      if (analyzeWithClaude && analysisPrompt) {
        const claudeAgent = await this.coordinator.findAgentForTask('code_analysis');
        if (claudeAgent) {
          await this.coordinator.sendDirectMessage(claudeAgent.agentId, 'code:analyze', {
            data: extractedData,
            prompt: analysisPrompt,
            sourceUrl: url,
            type: 'scraped_data_analysis'
          });
          result.claudeAnalysisRequested = true;
        }
      }
      
      return result;
      
    } finally {
      await page.close();
    }
  }

  async performResearchScraping(task) {
    const { researchTopics, urls, maxPages = 10 } = task;
    
    this.log(`Starting research scraping for topics: ${researchTopics?.join(', ')}`);
    
    const results = [];
    const urlsToScrape = urls || await this.generateResearchUrls(researchTopics);
    
    for (let i = 0; i < Math.min(urlsToScrape.length, maxPages); i++) {
      const url = urlsToScrape[i];
      
      try {
        const scrapeResult = await this.performScraping({
          url,
          scraperType: 'generic',
          extractionRules: {
            title: 'h1, title',
            content: 'article, .content, main, .post-content',
            metadata: {
              selector: 'meta',
              attribute: 'content',
              multiple: true
            }
          },
          captureScreenshot: false
        });
        
        results.push(scrapeResult);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        this.log(`Failed to scrape ${url}: ${error.message}`, 'error');
        results.push({
          url,
          error: error.message,
          success: false
        });
      }
    }
    
    return {
      researchTopics,
      urlsScraped: urlsToScrape.length,
      successfulScrapes: results.filter(r => r.success).length,
      results,
      timestamp: new Date().toISOString()
    };
  }

  async performBulkScraping(task) {
    const { urls, scraperType = 'generic', concurrency = 3 } = task;
    
    this.log(`Starting bulk scraping of ${urls.length} URLs`);
    
    const results = [];
    const chunks = this.chunkArray(urls, concurrency);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (url) => {
        try {
          return await this.performScraping({
            url,
            scraperType,
            extractionRules: task.extractionRules
          });
        } catch (error) {
          return {
            url,
            error: error.message,
            success: false
          };
        }
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
      
      // Rate limiting between chunks
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    return {
      totalUrls: urls.length,
      successfulScrapes: results.filter(r => r.success).length,
      results,
      timestamp: new Date().toISOString()
    };
  }

  async performMonitoringScraping(task) {
    const { url, extractionRules, checkInterval = 3600000 } = task; // Default 1 hour
    
    this.log(`Starting monitoring scraping for ${url}`);
    
    const previousData = await this.coordinator.getSharedState(`monitor:${url}`);
    const currentResult = await this.performScraping(task);
    
    let hasChanges = false;
    let changes = [];
    
    if (previousData) {
      // Compare current data with previous
      changes = this.detectChanges(previousData.extractedData, currentResult.extractedData);
      hasChanges = changes.length > 0;
    }
    
    // Save current data for next comparison
    await this.coordinator.setSharedState(`monitor:${url}`, currentResult, checkInterval * 2);
    
    const result = {
      ...currentResult,
      monitoring: true,
      hasChanges,
      changes,
      previousScrapeTime: previousData?.timestamp || null
    };
    
    // Notify other agents if significant changes detected
    if (hasChanges && changes.length > 0) {
      await this.coordinator.broadcastMessage('scraping:changes_detected', {
        url,
        changes,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  }

  async manageSession(task) {
    const { action, domain, sessionData } = task;
    
    this.log(`Managing session for ${domain}: ${action}`);
    
    switch (action) {
      case 'save':
        // Session saving is handled during scraping
        return { success: true, message: 'Session saved during authentication' };
        
      case 'load':
        const sessions = await this.sessionManager.listSessions();
        const session = sessions.find(s => s.domain === domain);
        return { session, exists: !!session };
        
      case 'delete':
        const deleted = await this.sessionManager.deleteSession(`https://${domain}`);
        return { success: deleted, message: deleted ? 'Session deleted' : 'Session not found' };
        
      case 'list':
        const allSessions = await this.sessionManager.listSessions();
        return { sessions: allSessions };
        
      default:
        throw new Error(`Unknown session action: ${action}`);
    }
  }

  async generateResearchUrls(topics) {
    // Simple URL generation for research topics
    // In a real implementation, this might use search APIs
    const searchUrls = [];
    
    for (const topic of topics) {
      const searchQuery = encodeURIComponent(topic);
      searchUrls.push(
        `https://www.google.com/search?q=${searchQuery}`,
        `https://en.wikipedia.org/wiki/${searchQuery.replace(/\s+/g, '_')}`,
        `https://stackoverflow.com/search?q=${searchQuery}`
      );
    }
    
    return searchUrls;
  }

  async saveExtractedData(result, task) {
    if (!result.extractedData) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${task.type || 'scrape'}-${timestamp}.json`;
    const filepath = path.join(this.dataDir, filename);
    
    const dataToSave = {
      task: {
        url: task.url,
        type: task.type,
        scraperType: task.scraperType
      },
      result: result,
      metadata: {
        agentId: this.config.agentId,
        timestamp: new Date().toISOString()
      }
    };
    
    await this.safeWriteFile(filepath, JSON.stringify(dataToSave, null, 2));
    this.log(`Extracted data saved: ${filepath}`);
  }

  detectChanges(previousData, currentData) {
    const changes = [];
    
    // Simple change detection - can be enhanced
    const prevStr = JSON.stringify(previousData, null, 2);
    const currStr = JSON.stringify(currentData, null, 2);
    
    if (prevStr !== currStr) {
      changes.push({
        type: 'content_changed',
        description: 'Data structure or content has changed',
        timestamp: new Date().toISOString()
      });
    }
    
    return changes;
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.log('Browser closed');
      }
    } catch (error) {
      this.log(`Error closing browser: ${error.message}`, 'error');
    }
    
    await super.cleanup();
  }

  getQueueName() {
    return 'queue:webscraper';
  }
}

// Start agent if run directly
if (require.main === module) {
  const agent = new WebScraperAgent({
    agentId: process.env.AGENT_ID || `webscraper-coordinated-${Date.now()}`,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await agent.cleanup();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await agent.cleanup();
    process.exit(0);
  });
  
  agent.start().catch(error => {
    console.error('Failed to start WebScraper agent:', error);
    process.exit(1);
  });
}

module.exports = WebScraperAgent;