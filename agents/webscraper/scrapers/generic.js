const BaseScraper = require('./base-scraper');

class GenericScraper extends BaseScraper {
  constructor() {
    super();
    this.name = 'generic';
  }

  async login(page, url, credentials) {
    try {
      // Generic login implementation that works for most sites
      const { usernameSelector, passwordSelector, submitSelector, username, password } = credentials;
      
      // Navigate to login page if not already there
      if (!page.url().includes(url)) {
        await page.goto(url, { waitUntil: 'networkidle2' });
      }
      
      // Wait for login form
      await page.waitForSelector(usernameSelector, { timeout: 10000 });
      
      // Fill credentials
      await this.typeWithDelay(page, usernameSelector, username);
      await this.typeWithDelay(page, passwordSelector, password);
      
      // Submit form
      if (submitSelector) {
        await this.clickAndWait(page, submitSelector);
      } else {
        // Try pressing Enter in password field
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Wait a bit for any redirects
      await page.waitForTimeout(3000);
      
      console.log('Generic login completed');
      return true;
    } catch (error) {
      console.error('Generic login error:', error);
      throw error;
    }
  }

  async extract(page, rules = {}) {
    const data = {};
    
    try {
      // Extract based on provided rules
      if (rules.selectors) {
        data.custom = await this.extractBySelectors(page, rules.selectors);
      }
      
      // Extract common elements if requested
      if (rules.extractAll || rules.extractMeta) {
        data.meta = await this.extractMetadata(page);
      }
      
      if (rules.extractAll || rules.extractHeadings) {
        data.headings = await this.extractHeadings(page);
      }
      
      if (rules.extractAll || rules.extractLinks) {
        data.links = await this.extractLinks(page, rules.linkContainer || 'body');
      }
      
      if (rules.extractAll || rules.extractImages) {
        data.images = await this.extractImages(page, rules.imageContainer || 'body');
      }
      
      if (rules.extractAll || rules.extractTables) {
        data.tables = await this.extractAllTables(page);
      }
      
      if (rules.extractAll || rules.extractForms) {
        data.forms = await this.extractForms(page);
      }
      
      if (rules.extractAll || rules.extractText) {
        data.text = await this.extractMainText(page);
      }
      
      // Extract structured data (JSON-LD, microdata)
      if (rules.extractAll || rules.extractStructured) {
        data.structured = await this.extractStructuredData(page);
      }
      
      return data;
    } catch (error) {
      console.error('Generic extraction error:', error);
      throw error;
    }
  }

  async extractBySelectors(page, selectors) {
    const results = {};
    
    for (const [key, config] of Object.entries(selectors)) {
      try {
        if (typeof config === 'string') {
          // Simple selector
          results[key] = await this.extractText(page, config);
        } else if (typeof config === 'object') {
          // Complex selector configuration
          const { selector, attribute, multiple, transform, waitFor } = config;
          
          if (waitFor) {
            await this.waitForElement(page, selector, waitFor);
          }
          
          if (multiple) {
            const elements = await page.$$(selector);
            results[key] = await Promise.all(
              elements.map(async (el) => {
                let value;
                if (attribute) {
                  value = await el.evaluate((elem, attr) => elem.getAttribute(attr), attribute);
                } else {
                  value = await el.evaluate(elem => elem.textContent.trim());
                }
                return transform ? this.applyTransform(value, transform) : value;
              })
            );
          } else {
            let value;
            if (attribute) {
              value = await this.extractAttribute(page, selector, attribute);
            } else {
              value = await this.extractText(page, selector);
            }
            results[key] = transform ? this.applyTransform(value, transform) : value;
          }
        }
      } catch (error) {
        console.error(`Failed to extract ${key}:`, error.message);
        results[key] = null;
      }
    }
    
    return results;
  }

  async extractMetadata(page) {
    return await page.evaluate(() => {
      const meta = {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        keywords: document.querySelector('meta[name="keywords"]')?.content || '',
        author: document.querySelector('meta[name="author"]')?.content || '',
        canonical: document.querySelector('link[rel="canonical"]')?.href || '',
        ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
        ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
        ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
        twitterCard: document.querySelector('meta[name="twitter:card"]')?.content || ''
      };
      
      return meta;
    });
  }

  async extractHeadings(page) {
    return await page.evaluate(() => {
      const headings = {};
      
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        const elements = document.querySelectorAll(tag);
        if (elements.length > 0) {
          headings[tag] = Array.from(elements).map(el => el.textContent.trim());
        }
      });
      
      return headings;
    });
  }

  async extractAllTables(page) {
    return await page.evaluate(() => {
      const tables = [];
      const tableElements = document.querySelectorAll('table');
      
      tableElements.forEach((table, index) => {
        const headers = [];
        const rows = [];
        
        // Extract headers
        const headerCells = table.querySelectorAll('thead th, thead td, tr:first-child th, tr:first-child td');
        headerCells.forEach(cell => headers.push(cell.textContent.trim()));
        
        // Extract rows
        const bodyRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
        bodyRows.forEach(row => {
          const rowData = [];
          const cells = row.querySelectorAll('td, th');
          cells.forEach(cell => rowData.push(cell.textContent.trim()));
          if (rowData.length > 0) rows.push(rowData);
        });
        
        tables.push({
          index,
          headers,
          rows,
          summary: table.getAttribute('summary') || ''
        });
      });
      
      return tables;
    });
  }

  async extractForms(page) {
    return await page.evaluate(() => {
      const forms = [];
      const formElements = document.querySelectorAll('form');
      
      formElements.forEach((form, index) => {
        const formData = {
          index,
          action: form.action || '',
          method: form.method || 'GET',
          name: form.name || '',
          fields: []
        };
        
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
          formData.fields.push({
            type: input.type || input.tagName.toLowerCase(),
            name: input.name || '',
            id: input.id || '',
            placeholder: input.placeholder || '',
            required: input.required || false,
            value: input.value || ''
          });
        });
        
        forms.push(formData);
      });
      
      return forms;
    });
  }

  async extractMainText(page) {
    return await page.evaluate(() => {
      // Try to find main content area
      const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '#content',
        '.content',
        '#main',
        '.main'
      ];
      
      let contentElement = null;
      for (const selector of contentSelectors) {
        contentElement = document.querySelector(selector);
        if (contentElement) break;
      }
      
      if (!contentElement) {
        contentElement = document.body;
      }
      
      // Remove script and style tags
      const clonedContent = contentElement.cloneNode(true);
      const scripts = clonedContent.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());
      
      return clonedContent.textContent.trim().replace(/\s+/g, ' ');
    });
  }

  async extractStructuredData(page) {
    return await page.evaluate(() => {
      const structured = {
        jsonLd: [],
        microdata: [],
        rdfa: []
      };
      
      // Extract JSON-LD
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      jsonLdScripts.forEach(script => {
        try {
          structured.jsonLd.push(JSON.parse(script.textContent));
        } catch (e) {
          console.error('Failed to parse JSON-LD:', e);
        }
      });
      
      // Extract microdata
      const microdataElements = document.querySelectorAll('[itemscope]');
      microdataElements.forEach(element => {
        const item = {
          type: element.getAttribute('itemtype') || '',
          properties: {}
        };
        
        const props = element.querySelectorAll('[itemprop]');
        props.forEach(prop => {
          const propName = prop.getAttribute('itemprop');
          const propValue = prop.getAttribute('content') || prop.textContent.trim();
          item.properties[propName] = propValue;
        });
        
        structured.microdata.push(item);
      });
      
      return structured;
    });
  }

  applyTransform(value, transform) {
    if (!value) return value;
    
    switch (transform) {
      case 'trim':
        return value.trim();
      case 'lowercase':
        return value.toLowerCase();
      case 'uppercase':
        return value.toUpperCase();
      case 'number':
        return parseFloat(value.replace(/[^0-9.-]/g, ''));
      case 'date':
        return new Date(value).toISOString();
      default:
        if (typeof transform === 'function') {
          return transform(value);
        }
        return value;
    }
  }
}

module.exports = GenericScraper;