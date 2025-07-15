const BaseScraper = require('./base-scraper');

class LinkedInScraper extends BaseScraper {
  constructor() {
    super();
    this.name = 'linkedin';
  }

  async login(page, url, credentials) {
    try {
      // Navigate to LinkedIn login page
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });
      
      // Wait for login form
      await page.waitForSelector('#username', { timeout: 10000 });
      
      // Fill in credentials
      await page.type('#username', credentials.username);
      await page.type('#password', credentials.password);
      
      // Click sign in button
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
      ]);
      
      // Check for verification challenges
      const isLoggedIn = await this.checkLoginSuccess(page);
      
      if (!isLoggedIn) {
        // Check for 2FA or CAPTCHA
        const has2FA = await page.$('input[name="pin"]');
        if (has2FA) {
          throw new Error('2FA verification required. Please complete manually and save session.');
        }
        
        const hasCaptcha = await page.$('.recaptcha-checkbox');
        if (hasCaptcha) {
          throw new Error('CAPTCHA verification required. Please complete manually and save session.');
        }
        
        throw new Error('Login failed. Please check credentials.');
      }
      
      console.log('Successfully logged in to LinkedIn');
      return true;
    } catch (error) {
      console.error('LinkedIn login error:', error);
      throw error;
    }
  }

  async checkLoginSuccess(page) {
    try {
      // Check for feed or profile indicators
      await page.waitForSelector('.global-nav__me-photo, .feed-identity-module, nav[aria-label="Primary Navigation"]', {
        timeout: 10000
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async extract(page, rules = {}) {
    const data = {};
    
    try {
      // Default LinkedIn extractions
      if (page.url().includes('/in/')) {
        // Profile page extraction
        data.profile = await this.extractProfile(page);
      } else if (page.url().includes('/company/')) {
        // Company page extraction
        data.company = await this.extractCompany(page);
      } else if (page.url().includes('/jobs/')) {
        // Job listing extraction
        data.job = await this.extractJob(page);
      } else if (page.url().includes('/feed')) {
        // Feed extraction
        data.posts = await this.extractFeedPosts(page, rules.postLimit || 10);
      }
      
      // Custom extractions based on rules
      if (rules.selectors) {
        data.custom = await this.extractBySelectors(page, rules.selectors);
      }
      
      return data;
    } catch (error) {
      console.error('LinkedIn extraction error:', error);
      throw error;
    }
  }

  async extractProfile(page) {
    await page.waitForSelector('.pv-text-details__left-panel', { timeout: 10000 });
    
    return await page.evaluate(() => {
      const profile = {};
      
      // Name
      const nameElement = document.querySelector('.pv-text-details__left-panel h1');
      profile.name = nameElement?.textContent?.trim() || '';
      
      // Headline
      const headlineElement = document.querySelector('.pv-text-details__left-panel .text-body-medium');
      profile.headline = headlineElement?.textContent?.trim() || '';
      
      // Location
      const locationElement = document.querySelector('.pv-text-details__left-panel span.text-body-small');
      profile.location = locationElement?.textContent?.trim() || '';
      
      // About
      const aboutSection = document.querySelector('#about')?.parentElement;
      const aboutText = aboutSection?.querySelector('.pv-shared-text-with-see-more span[aria-hidden="true"]');
      profile.about = aboutText?.textContent?.trim() || '';
      
      // Experience
      profile.experience = [];
      const experienceItems = document.querySelectorAll('#experience ~ .pvs-list__container .pvs-entity');
      experienceItems.forEach(item => {
        const position = item.querySelector('.t-bold span[aria-hidden="true"]')?.textContent?.trim();
        const company = item.querySelector('.t-normal span[aria-hidden="true"]')?.textContent?.trim();
        const duration = item.querySelector('.pvs-entity__caption-wrapper')?.textContent?.trim();
        
        if (position) {
          profile.experience.push({ position, company, duration });
        }
      });
      
      // Education
      profile.education = [];
      const educationItems = document.querySelectorAll('#education ~ .pvs-list__container .pvs-entity');
      educationItems.forEach(item => {
        const school = item.querySelector('.t-bold span[aria-hidden="true"]')?.textContent?.trim();
        const degree = item.querySelector('.t-normal span[aria-hidden="true"]')?.textContent?.trim();
        const years = item.querySelector('.pvs-entity__caption-wrapper')?.textContent?.trim();
        
        if (school) {
          profile.education.push({ school, degree, years });
        }
      });
      
      // Skills
      profile.skills = [];
      const skillItems = document.querySelectorAll('#skills ~ .pvs-list__container .pvs-entity');
      skillItems.forEach(item => {
        const skill = item.querySelector('.t-bold span[aria-hidden="true"]')?.textContent?.trim();
        if (skill) {
          profile.skills.push(skill);
        }
      });
      
      return profile;
    });
  }

  async extractCompany(page) {
    await page.waitForSelector('.org-top-card', { timeout: 10000 });
    
    return await page.evaluate(() => {
      const company = {};
      
      // Company name
      company.name = document.querySelector('.org-top-card__primary-content h1')?.textContent?.trim() || '';
      
      // Industry
      company.industry = document.querySelector('.org-top-card__primary-content .org-top-card-summary__industry')?.textContent?.trim() || '';
      
      // Company size
      company.size = document.querySelector('.org-top-card__primary-content .org-top-card-summary__info-item:nth-child(2)')?.textContent?.trim() || '';
      
      // Headquarters
      company.headquarters = document.querySelector('.org-top-card__primary-content .org-top-card-summary__headquarter')?.textContent?.trim() || '';
      
      // About
      const aboutSection = document.querySelector('.org-grid__core-rail--wide .break-words');
      company.about = aboutSection?.textContent?.trim() || '';
      
      return company;
    });
  }

  async extractJob(page) {
    await page.waitForSelector('.jobs-unified-top-card', { timeout: 10000 });
    
    return await page.evaluate(() => {
      const job = {};
      
      // Job title
      job.title = document.querySelector('.jobs-unified-top-card h1')?.textContent?.trim() || '';
      
      // Company
      job.company = document.querySelector('.jobs-unified-top-card__company-name')?.textContent?.trim() || '';
      
      // Location
      job.location = document.querySelector('.jobs-unified-top-card__bullet')?.textContent?.trim() || '';
      
      // Job type
      job.type = document.querySelector('.jobs-unified-top-card__workplace-type')?.textContent?.trim() || '';
      
      // Posted date
      job.postedDate = document.querySelector('.jobs-unified-top-card__posted-date')?.textContent?.trim() || '';
      
      // Description
      const descriptionElement = document.querySelector('.jobs-description__content');
      job.description = descriptionElement?.textContent?.trim() || '';
      
      return job;
    });
  }

  async extractFeedPosts(page, limit = 10) {
    // Wait for feed to load
    await page.waitForSelector('.feed-shared-update-v2', { timeout: 10000 });
    
    // Scroll to load more posts
    let previousHeight = 0;
    let currentHeight = await page.evaluate(() => document.body.scrollHeight);
    let scrollAttempts = 0;
    
    while (previousHeight !== currentHeight && scrollAttempts < 5) {
      previousHeight = currentHeight;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      currentHeight = await page.evaluate(() => document.body.scrollHeight);
      scrollAttempts++;
    }
    
    return await page.evaluate((postLimit) => {
      const posts = [];
      const postElements = document.querySelectorAll('.feed-shared-update-v2');
      
      for (let i = 0; i < Math.min(postElements.length, postLimit); i++) {
        const postElement = postElements[i];
        const post = {};
        
        // Author
        const authorElement = postElement.querySelector('.update-components-actor__name');
        post.author = authorElement?.textContent?.trim() || '';
        
        // Author title
        const titleElement = postElement.querySelector('.update-components-actor__description');
        post.authorTitle = titleElement?.textContent?.trim() || '';
        
        // Post time
        const timeElement = postElement.querySelector('.update-components-actor__sub-description');
        post.time = timeElement?.textContent?.trim() || '';
        
        // Post content
        const contentElement = postElement.querySelector('.feed-shared-text');
        post.content = contentElement?.textContent?.trim() || '';
        
        // Engagement stats
        const reactions = postElement.querySelector('.social-details-social-counts__reactions-count');
        post.reactions = reactions?.textContent?.trim() || '0';
        
        const comments = postElement.querySelector('.social-details-social-counts__comments');
        post.comments = comments?.textContent?.trim() || '0';
        
        posts.push(post);
      }
      
      return posts;
    }, limit);
  }

  async extractBySelectors(page, selectors) {
    const results = {};
    
    for (const [key, selector] of Object.entries(selectors)) {
      try {
        if (typeof selector === 'string') {
          // Simple selector
          const element = await page.$(selector);
          if (element) {
            results[key] = await element.evaluate(el => el.textContent.trim());
          }
        } else if (typeof selector === 'object') {
          // Complex selector with options
          if (selector.multiple) {
            const elements = await page.$$(selector.selector);
            results[key] = await Promise.all(
              elements.map(el => el.evaluate(elem => elem.textContent.trim()))
            );
          } else if (selector.attribute) {
            const element = await page.$(selector.selector);
            if (element) {
              results[key] = await element.evaluate(
                (el, attr) => el.getAttribute(attr),
                selector.attribute
              );
            }
          }
        }
      } catch (error) {
        console.error(`Failed to extract ${key}:`, error.message);
        results[key] = null;
      }
    }
    
    return results;
  }
}

module.exports = LinkedInScraper;