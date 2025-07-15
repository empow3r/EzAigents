const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class SessionManager {
  constructor(agentId) {
    this.agentId = agentId;
    this.sessionsDir = path.join(process.cwd(), '.agent-memory', 'webscraper', 'sessions');
    this.algorithm = 'aes-256-gcm';
    this.secretKey = this.getOrCreateSecretKey();
  }

  getOrCreateSecretKey() {
    // In production, this should come from environment or secure key management
    const keyPath = path.join(this.sessionsDir, '..', '.session-key');
    try {
      return require('fs').readFileSync(keyPath, 'utf8');
    } catch (error) {
      const key = crypto.randomBytes(32).toString('hex');
      require('fs').mkdirSync(path.dirname(keyPath), { recursive: true });
      require('fs').writeFileSync(keyPath, key);
      return key;
    }
  }

  async saveSession(page, url) {
    try {
      const cookies = await page.cookies();
      const localStorage = await page.evaluate(() => {
        const items = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          items[key] = window.localStorage.getItem(key);
        }
        return items;
      });

      const sessionData = {
        url,
        cookies,
        localStorage,
        userAgent: await page.evaluate(() => navigator.userAgent),
        timestamp: new Date().toISOString()
      };

      // Encrypt session data
      const encrypted = this.encrypt(JSON.stringify(sessionData));
      
      // Create domain-specific filename
      const domain = new URL(url).hostname.replace(/\./g, '_');
      const sessionPath = path.join(this.sessionsDir, `${domain}.session`);
      
      await fs.mkdir(this.sessionsDir, { recursive: true });
      await fs.writeFile(sessionPath, JSON.stringify(encrypted));
      
      console.log(`Session saved for ${domain}`);
      return true;
    } catch (error) {
      console.error('Failed to save session:', error);
      return false;
    }
  }

  async loadSession(page, url) {
    try {
      const domain = new URL(url).hostname.replace(/\./g, '_');
      const sessionPath = path.join(this.sessionsDir, `${domain}.session`);
      
      const encryptedData = await fs.readFile(sessionPath, 'utf8');
      const encrypted = JSON.parse(encryptedData);
      const decrypted = this.decrypt(encrypted);
      const sessionData = JSON.parse(decrypted);
      
      // Check if session is not too old (7 days)
      const sessionAge = Date.now() - new Date(sessionData.timestamp).getTime();
      if (sessionAge > 7 * 24 * 60 * 60 * 1000) {
        console.log('Session expired, removing...');
        await fs.unlink(sessionPath);
        return false;
      }
      
      // Set user agent
      await page.setUserAgent(sessionData.userAgent);
      
      // Navigate to URL first to set domain context
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // Restore cookies
      if (sessionData.cookies && sessionData.cookies.length > 0) {
        await page.setCookie(...sessionData.cookies);
      }
      
      // Restore localStorage
      if (sessionData.localStorage && Object.keys(sessionData.localStorage).length > 0) {
        await page.evaluate((items) => {
          for (const [key, value] of Object.entries(items)) {
            window.localStorage.setItem(key, value);
          }
        }, sessionData.localStorage);
      }
      
      // Reload page with session
      await page.reload({ waitUntil: 'networkidle2' });
      
      console.log(`Session loaded for ${domain}`);
      return true;
    } catch (error) {
      console.log('No saved session found or failed to load:', error.message);
      return false;
    }
  }

  async deleteSession(url) {
    try {
      const domain = new URL(url).hostname.replace(/\./g, '_');
      const sessionPath = path.join(this.sessionsDir, `${domain}.session`);
      await fs.unlink(sessionPath);
      console.log(`Session deleted for ${domain}`);
      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }

  async listSessions() {
    try {
      const files = await fs.readdir(this.sessionsDir);
      const sessions = [];
      
      for (const file of files) {
        if (file.endsWith('.session')) {
          const domain = file.replace('.session', '').replace(/_/g, '.');
          const filePath = path.join(this.sessionsDir, file);
          const stats = await fs.stat(filePath);
          
          sessions.push({
            domain,
            lastModified: stats.mtime,
            size: stats.size
          });
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('Failed to list sessions:', error);
      return [];
    }
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      Buffer.from(this.secretKey, 'hex'),
      iv
    );
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      authTag: authTag.toString('hex'),
      iv: iv.toString('hex')
    };
  }

  decrypt(data) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(this.secretKey, 'hex'),
      Buffer.from(data.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async exportSession(url) {
    try {
      const domain = new URL(url).hostname.replace(/\./g, '_');
      const sessionPath = path.join(this.sessionsDir, `${domain}.session`);
      const encryptedData = await fs.readFile(sessionPath, 'utf8');
      const encrypted = JSON.parse(encryptedData);
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to export session:', error);
      return null;
    }
  }

  async importSession(sessionData) {
    try {
      const encrypted = this.encrypt(JSON.stringify(sessionData));
      const domain = new URL(sessionData.url).hostname.replace(/\./g, '_');
      const sessionPath = path.join(this.sessionsDir, `${domain}.session`);
      
      await fs.mkdir(this.sessionsDir, { recursive: true });
      await fs.writeFile(sessionPath, JSON.stringify(encrypted));
      
      console.log(`Session imported for ${domain}`);
      return true;
    } catch (error) {
      console.error('Failed to import session:', error);
      return false;
    }
  }
}

module.exports = SessionManager;