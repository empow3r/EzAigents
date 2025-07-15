class BaseScraper {
  constructor() {
    this.name = 'base';
  }

  async login(page, url, credentials) {
    throw new Error('Login method must be implemented by subclass');
  }

  async extract(page, rules) {
    throw new Error('Extract method must be implemented by subclass');
  }

  async waitForElement(page, selector, timeout = 10000) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      console.log(`Element ${selector} not found within ${timeout}ms`);
      return false;
    }
  }

  async scrollToBottom(page, maxScrolls = 5) {
    let previousHeight = 0;
    let currentHeight = await page.evaluate(() => document.body.scrollHeight);
    let scrollCount = 0;
    
    while (previousHeight !== currentHeight && scrollCount < maxScrolls) {
      previousHeight = currentHeight;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      currentHeight = await page.evaluate(() => document.body.scrollHeight);
      scrollCount++;
    }
    
    return scrollCount;
  }

  async extractText(page, selector) {
    try {
      const element = await page.$(selector);
      if (!element) return null;
      
      return await element.evaluate(el => el.textContent.trim());
    } catch (error) {
      console.error(`Failed to extract text from ${selector}:`, error.message);
      return null;
    }
  }

  async extractAttribute(page, selector, attribute) {
    try {
      const element = await page.$(selector);
      if (!element) return null;
      
      return await element.evaluate((el, attr) => el.getAttribute(attr), attribute);
    } catch (error) {
      console.error(`Failed to extract attribute ${attribute} from ${selector}:`, error.message);
      return null;
    }
  }

  async extractMultiple(page, selector, extractor) {
    try {
      const elements = await page.$$(selector);
      const results = [];
      
      for (const element of elements) {
        const result = await extractor(element);
        if (result) results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error(`Failed to extract multiple from ${selector}:`, error.message);
      return [];
    }
  }

  async clickAndWait(page, selector, waitForNavigation = true) {
    try {
      if (waitForNavigation) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          page.click(selector)
        ]);
      } else {
        await page.click(selector);
      }
      return true;
    } catch (error) {
      console.error(`Failed to click ${selector}:`, error.message);
      return false;
    }
  }

  async typeWithDelay(page, selector, text, delay = 100) {
    try {
      await page.focus(selector);
      await page.type(selector, text, { delay });
      return true;
    } catch (error) {
      console.error(`Failed to type in ${selector}:`, error.message);
      return false;
    }
  }

  async waitForNetworkIdle(page, timeout = 30000) {
    try {
      await page.waitForLoadState('networkidle', { timeout });
      return true;
    } catch (error) {
      console.error('Network idle timeout:', error.message);
      return false;
    }
  }

  async handleDialog(page, accept = true, promptText = '') {
    page.on('dialog', async dialog => {
      console.log(`Dialog detected: ${dialog.message()}`);
      if (accept) {
        await dialog.accept(promptText);
      } else {
        await dialog.dismiss();
      }
    });
  }

  async extractTable(page, tableSelector) {
    try {
      return await page.evaluate((selector) => {
        const table = document.querySelector(selector);
        if (!table) return null;
        
        const headers = [];
        const rows = [];
        
        // Extract headers
        const headerCells = table.querySelectorAll('thead th, thead td');
        headerCells.forEach(cell => headers.push(cell.textContent.trim()));
        
        // Extract rows
        const bodyRows = table.querySelectorAll('tbody tr');
        bodyRows.forEach(row => {
          const rowData = [];
          const cells = row.querySelectorAll('td');
          cells.forEach(cell => rowData.push(cell.textContent.trim()));
          if (rowData.length > 0) rows.push(rowData);
        });
        
        return { headers, rows };
      }, tableSelector);
    } catch (error) {
      console.error(`Failed to extract table from ${tableSelector}:`, error.message);
      return null;
    }
  }

  async extractLinks(page, containerSelector = 'body') {
    try {
      return await page.evaluate((selector) => {
        const container = document.querySelector(selector);
        if (!container) return [];
        
        const links = container.querySelectorAll('a[href]');
        return Array.from(links).map(link => ({
          text: link.textContent.trim(),
          href: link.href,
          title: link.title || ''
        }));
      }, containerSelector);
    } catch (error) {
      console.error(`Failed to extract links from ${containerSelector}:`, error.message);
      return [];
    }
  }

  async extractImages(page, containerSelector = 'body') {
    try {
      return await page.evaluate((selector) => {
        const container = document.querySelector(selector);
        if (!container) return [];
        
        const images = container.querySelectorAll('img[src]');
        return Array.from(images).map(img => ({
          src: img.src,
          alt: img.alt || '',
          title: img.title || ''
        }));
      }, containerSelector);
    } catch (error) {
      console.error(`Failed to extract images from ${containerSelector}:`, error.message);
      return [];
    }
  }
}

module.exports = BaseScraper;