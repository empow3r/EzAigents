const BaseScraper = require('./base-scraper');

class GmailScraper extends BaseScraper {
  constructor() {
    super();
    this.name = 'gmail';
  }

  async login(page, url, credentials) {
    try {
      // Navigate to Gmail
      await page.goto('https://mail.google.com', { waitUntil: 'networkidle2' });
      
      // Check if already logged in
      const isLoggedIn = await this.checkLoginStatus(page);
      if (isLoggedIn) {
        console.log('Already logged in to Gmail');
        return true;
      }
      
      // Enter email
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await this.typeWithDelay(page, 'input[type="email"]', credentials.email);
      
      // Click next
      await this.clickAndWait(page, '#identifierNext', false);
      await page.waitForTimeout(2000);
      
      // Enter password
      await page.waitForSelector('input[type="password"]', { timeout: 10000 });
      await this.typeWithDelay(page, 'input[type="password"]', credentials.password);
      
      // Click next
      await this.clickAndWait(page, '#passwordNext');
      
      // Wait for Gmail to load
      await page.waitForSelector('[gh="cm"]', { timeout: 30000 }); // Compose button
      
      console.log('Successfully logged in to Gmail');
      return true;
    } catch (error) {
      console.error('Gmail login error:', error);
      throw error;
    }
  }

  async checkLoginStatus(page) {
    try {
      // Check for compose button which indicates logged in state
      await page.waitForSelector('[gh="cm"]', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async extract(page, rules = {}) {
    const data = {};
    
    try {
      // Wait for Gmail to fully load
      await page.waitForSelector('.AO', { timeout: 10000 });
      
      if (rules.extractEmails !== false) {
        data.emails = await this.extractEmails(page, rules.emailCount || 20);
      }
      
      if (rules.extractLabels) {
        data.labels = await this.extractLabels(page);
      }
      
      if (rules.extractContacts) {
        data.contacts = await this.extractRecentContacts(page);
      }
      
      if (rules.searchQuery) {
        data.searchResults = await this.searchEmails(page, rules.searchQuery);
      }
      
      if (rules.emailId) {
        data.emailDetail = await this.extractEmailDetail(page, rules.emailId);
      }
      
      return data;
    } catch (error) {
      console.error('Gmail extraction error:', error);
      throw error;
    }
  }

  async extractEmails(page, count = 20) {
    // Ensure we're in the inbox
    const inboxLink = await page.$('[data-tooltip="Inbox"]');
    if (inboxLink) {
      await inboxLink.click();
      await page.waitForTimeout(2000);
    }
    
    return await page.evaluate((emailCount) => {
      const emails = [];
      const rows = document.querySelectorAll('tr.zA');
      
      for (let i = 0; i < Math.min(rows.length, emailCount); i++) {
        const row = rows[i];
        const email = {};
        
        // Sender
        const senderElement = row.querySelector('.yW span[email]');
        email.sender = senderElement?.getAttribute('email') || '';
        email.senderName = senderElement?.getAttribute('name') || senderElement?.textContent || '';
        
        // Subject and snippet
        const subjectElement = row.querySelector('.y6');
        if (subjectElement) {
          const subjectSpans = subjectElement.querySelectorAll('span');
          email.subject = subjectSpans[0]?.textContent || '';
          email.snippet = subjectSpans[1]?.textContent || '';
        }
        
        // Date
        email.date = row.querySelector('.xW span')?.getAttribute('title') || 
                    row.querySelector('.xW span')?.textContent || '';
        
        // Read status
        email.isRead = !row.classList.contains('zE');
        
        // Has attachment
        email.hasAttachment = !!row.querySelector('.aZo');
        
        // Starred
        email.isStarred = row.querySelector('.T-KT')?.classList.contains('T-KT-Jp') || false;
        
        // Important
        email.isImportant = row.querySelector('.pG')?.classList.contains('pH') || false;
        
        // Email ID (for fetching detail)
        email.id = row.querySelector('.aDP')?.getAttribute('data-legacy-thread-id') || '';
        
        emails.push(email);
      }
      
      return emails;
    }, count);
  }

  async extractLabels(page) {
    return await page.evaluate(() => {
      const labels = [];
      const labelElements = document.querySelectorAll('.aim .TO');
      
      labelElements.forEach(element => {
        const label = {
          name: element.querySelector('.nU')?.textContent || '',
          unreadCount: element.querySelector('.bsU')?.textContent || '0',
          color: window.getComputedStyle(element.querySelector('.qq')).backgroundColor || ''
        };
        
        if (label.name) {
          labels.push(label);
        }
      });
      
      return labels;
    });
  }

  async extractRecentContacts(page) {
    // This would require navigating to contacts section
    // For now, extract from visible emails
    return await page.evaluate(() => {
      const contacts = new Map();
      const senderElements = document.querySelectorAll('.yW span[email]');
      
      senderElements.forEach(element => {
        const email = element.getAttribute('email');
        const name = element.getAttribute('name') || element.textContent;
        
        if (email && !contacts.has(email)) {
          contacts.set(email, { email, name });
        }
      });
      
      return Array.from(contacts.values());
    });
  }

  async searchEmails(page, query) {
    // Click search box
    await page.click('input[aria-label="Search mail"]');
    
    // Clear and type query
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.type(query);
    
    // Submit search
    await page.keyboard.press('Enter');
    
    // Wait for results
    await page.waitForTimeout(3000);
    
    // Extract search results
    return await this.extractEmails(page, 20);
  }

  async extractEmailDetail(page, emailId) {
    // Click on email to open it
    const emailRow = await page.$(`tr[data-legacy-thread-id="${emailId}"]`);
    if (!emailRow) {
      throw new Error('Email not found');
    }
    
    await emailRow.click();
    await page.waitForTimeout(2000);
    
    return await page.evaluate(() => {
      const detail = {};
      
      // Full email content
      const contentElement = document.querySelector('.ii.gt');
      detail.content = contentElement?.textContent || '';
      
      // Headers
      detail.from = document.querySelector('.gD')?.getAttribute('email') || '';
      detail.fromName = document.querySelector('.gD')?.getAttribute('name') || '';
      detail.to = Array.from(document.querySelectorAll('.g2')).map(el => ({
        email: el.getAttribute('email'),
        name: el.getAttribute('name') || el.textContent
      }));
      
      detail.date = document.querySelector('.g3')?.textContent || '';
      detail.subject = document.querySelector('.hP')?.textContent || '';
      
      // Attachments
      detail.attachments = Array.from(document.querySelectorAll('.aZo')).map(el => ({
        name: el.querySelector('.aV3')?.textContent || '',
        size: el.querySelector('.SaH9Ve')?.textContent || ''
      }));
      
      return detail;
    });
  }

  async composeEmail(page, emailData) {
    // Click compose button
    await page.click('[gh="cm"]');
    await page.waitForSelector('.AD', { timeout: 5000 });
    
    // Fill in recipient
    if (emailData.to) {
      await page.type('[name="to"]', emailData.to);
    }
    
    // Fill in subject
    if (emailData.subject) {
      await page.type('[name="subjectbox"]', emailData.subject);
    }
    
    // Fill in body
    if (emailData.body) {
      await page.click('[aria-label="Message Body"]');
      await page.type('[aria-label="Message Body"]', emailData.body);
    }
    
    // Send or save draft based on preference
    if (emailData.send) {
      await page.keyboard.down('Control');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Control');
    }
    
    return true;
  }
}

module.exports = GmailScraper;