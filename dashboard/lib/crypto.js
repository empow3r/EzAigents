import crypto from 'crypto';

// Use environment variable or generate a secure key
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts text using AES-256-CBC
 * @param {string} text - The text to encrypt
 * @returns {string} - Encrypted text with IV prepended
 */
export function encrypt(text) {
  if (!text) return '';
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend IV to encrypted data
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts text using AES-256-CBC
 * @param {string} encryptedText - The encrypted text with IV prepended
 * @returns {string} - Decrypted text
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return '';
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Masks an API key for display purposes
 * @param {string} apiKey - The API key to mask
 * @returns {string} - Masked API key
 */
export function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) return '****';
  
  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  const middle = '*'.repeat(Math.max(4, apiKey.length - 8));
  
  return start + middle + end;
}

/**
 * Validates API key format based on provider
 * @param {string} provider - The LLM provider
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} - Whether the API key format is valid
 */
export function validateApiKeyFormat(provider, apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return false;
  
  const patterns = {
    openai: /^sk-[a-zA-Z0-9]{48,}$/,
    claude: /^sk-(ant-)?[a-zA-Z0-9-_]{50,}$/,
    deepseek: /^sk-[a-zA-Z0-9]{32,}$/,
    mistral: /^[a-zA-Z0-9]{32,}$/,
    gemini: /^[a-zA-Z0-9-_]{32,}$/,
    cohere: /^[a-zA-Z0-9-_]{40,}$/,
    perplexity: /^pplx-[a-zA-Z0-9]{32,}$/,
    ollama: /.*/  // Ollama typically doesn't require API keys
  };
  
  return patterns[provider]?.test(apiKey) || false;
}