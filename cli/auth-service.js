/**
 * Authentication Service for Ez Aigent Platform
 * Provides OAuth2/OIDC authentication with JWT tokens and session management
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');
const axios = require('axios');

/**
 * AuthenticationService - Handles authentication for the Ez Aigent platform
 * @class
 */
class AuthenticationService {
  /**
   * Initialize the authentication service
   * @param {Object} config - Configuration object
   * @param {string} config.jwtSecret - Secret for JWT signing
   * @param {number} config.accessTokenExpiry - Access token expiry in seconds (default: 3600)
   * @param {number} config.refreshTokenExpiry - Refresh token expiry in seconds (default: 604800)
   * @param {Object} config.providers - OAuth provider configurations
   */
  constructor(config = {}) {
    this.jwtSecret = config.jwtSecret || process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
    this.accessTokenExpiry = config.accessTokenExpiry || 3600; // 1 hour
    this.refreshTokenExpiry = config.refreshTokenExpiry || 604800; // 7 days
    this.sessions = new Map(); // In-memory session store
    this.refreshTokens = new Map(); // In-memory refresh token store
    
    // OAuth provider configurations
    this.providers = {
      auth0: {
        domain: config.providers?.auth0?.domain || process.env.AUTH0_DOMAIN,
        clientId: config.providers?.auth0?.clientId || process.env.AUTH0_CLIENT_ID,
        clientSecret: config.providers?.auth0?.clientSecret || process.env.AUTH0_CLIENT_SECRET,
        audience: config.providers?.auth0?.audience || process.env.AUTH0_AUDIENCE
      },
      okta: {
        domain: config.providers?.okta?.domain || process.env.OKTA_DOMAIN,
        clientId: config.providers?.okta?.clientId || process.env.OKTA_CLIENT_ID,
        clientSecret: config.providers?.okta?.clientSecret || process.env.OKTA_CLIENT_SECRET,
        authorizationServerId: config.providers?.okta?.authorizationServerId || 'default'
      },
      google: {
        clientId: config.providers?.google?.clientId || process.env.GOOGLE_CLIENT_ID,
        clientSecret: config.providers?.google?.clientSecret || process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: config.providers?.google?.redirectUri || process.env.GOOGLE_REDIRECT_URI
      }
    };
  }

  /**
   * Generate JWT access token
   * @param {Object} payload - Token payload
   * @param {Object} options - Additional JWT options
   * @returns {string} JWT token
   */
  generateAccessToken(payload, options = {}) {
    try {
      const tokenOptions = {
        expiresIn: this.accessTokenExpiry,
        issuer: 'ez-aigent',
        audience: 'ez-aigent-api',
        ...options
      };
      
      return jwt.sign(payload, this.jwtSecret, tokenOptions);
    } catch (error) {
      console.error('Error generating access token:', error);
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Generate refresh token
   * @param {string} userId - User identifier
   * @returns {string} Refresh token
   */
  generateRefreshToken(userId) {
    try {
      const refreshToken = crypto.randomBytes(32).toString('hex');
      const tokenData = {
        userId,
        createdAt: Date.now(),
        expiresAt: Date.now() + (this.refreshTokenExpiry * 1000)
      };
      
      this.refreshTokens.set(refreshToken, tokenData);
      return refreshToken;
    } catch (error) {
      console.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'ez-aigent',
        audience: 'ez-aigent-api'
      });
    } catch (error) {
      console.error('Token verification failed:', error.message);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New access token and refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const tokenData = this.refreshTokens.get(refreshToken);
      
      if (!tokenData) {
        throw new Error('Invalid refresh token');
      }
      
      if (Date.now() > tokenData.expiresAt) {
        this.refreshTokens.delete(refreshToken);
        throw new Error('Refresh token expired');
      }
      
      // Generate new tokens
      const user = await this.getUserById(tokenData.userId);
      const newAccessToken = this.generateAccessToken({ 
        userId: user.id, 
        email: user.email,
        roles: user.roles || []
      });
      
      // Optionally rotate refresh token
      this.refreshTokens.delete(refreshToken);
      const newRefreshToken = this.generateRefreshToken(user.id);
      
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.accessTokenExpiry
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Create user session
   * @param {Object} user - User object
   * @returns {Object} Session data with tokens
   */
  createSession(user) {
    try {
      const sessionId = crypto.randomBytes(16).toString('hex');
      const accessToken = this.generateAccessToken({
        userId: user.id,
        email: user.email,
        roles: user.roles || []
      });
      const refreshToken = this.generateRefreshToken(user.id);
      
      const session = {
        id: sessionId,
        userId: user.id,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + (this.accessTokenExpiry * 1000)
      };
      
      this.sessions.set(sessionId, session);
      
      return {
        sessionId,
        accessToken,
        refreshToken,
        expiresIn: this.accessTokenExpiry,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles || []
        }
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Validate session
   * @param {string} sessionId - Session ID
   * @returns {Object} Session data if valid
   */
  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Invalid session');
    }
    
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      throw new Error('Session expired');
    }
    
    // Update last activity
    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Destroy session
   * @param {string} sessionId - Session ID
   */
  destroySession(sessionId) {
    this.sessions.delete(sessionId);
  }

  /**
   * OAuth2 authorization URL generation
   * @param {string} provider - Provider name (auth0, okta, google)
   * @param {string} state - State parameter for CSRF protection
   * @param {string} redirectUri - Redirect URI after authorization
   * @returns {string} Authorization URL
   */
  getAuthorizationUrl(provider, state, redirectUri) {
    switch (provider) {
      case 'auth0':
        return `https://${this.providers.auth0.domain}/authorize?` +
          `response_type=code&` +
          `client_id=${this.providers.auth0.clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=openid profile email&` +
          `state=${state}&` +
          `audience=${this.providers.auth0.audience}`;
      
      case 'okta':
        return `https://${this.providers.okta.domain}/oauth2/${this.providers.okta.authorizationServerId}/v1/authorize?` +
          `response_type=code&` +
          `client_id=${this.providers.okta.clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=openid profile email&` +
          `state=${state}`;
      
      case 'google':
        return `https://accounts.google.com/o/oauth2/v2/auth?` +
          `response_type=code&` +
          `client_id=${this.providers.google.clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=openid profile email&` +
          `state=${state}`;
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} provider - Provider name
   * @param {string} code - Authorization code
   * @param {string} redirectUri - Redirect URI
   * @returns {Object} Token response
   */
  async exchangeCodeForTokens(provider, code, redirectUri) {
    try {
      let tokenEndpoint, params;
      
      switch (provider) {
        case 'auth0':
          tokenEndpoint = `https://${this.providers.auth0.domain}/oauth/token`;
          params = {
            grant_type: 'authorization_code',
            client_id: this.providers.auth0.clientId,
            client_secret: this.providers.auth0.clientSecret,
            code,
            redirect_uri: redirectUri
          };
          break;
        
        case 'okta':
          tokenEndpoint = `https://${this.providers.okta.domain}/oauth2/${this.providers.okta.authorizationServerId}/v1/token`;
          params = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: this.providers.okta.clientId,
            client_secret: this.providers.okta.clientSecret,
            code,
            redirect_uri: redirectUri
          });
          break;
        
        case 'google':
          tokenEndpoint = 'https://oauth2.googleapis.com/token';
          params = {
            grant_type: 'authorization_code',
            client_id: this.providers.google.clientId,
            client_secret: this.providers.google.clientSecret,
            code,
            redirect_uri: redirectUri
          };
          break;
        
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      
      const response = await axios.post(tokenEndpoint, params, {
        headers: {
          'Content-Type': provider === 'okta' ? 'application/x-www-form-urlencoded' : 'application/json'
        },
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error exchanging code with ${provider}:`, error.response?.data || error.message);
      throw new Error(`Failed to exchange authorization code with ${provider}`);
    }
  }

  /**
   * Get user info from OAuth provider
   * @param {string} provider - Provider name
   * @param {string} accessToken - Provider access token
   * @returns {Object} User information
   */
  async getUserInfo(provider, accessToken) {
    try {
      let userInfoEndpoint;
      
      switch (provider) {
        case 'auth0':
          userInfoEndpoint = `https://${this.providers.auth0.domain}/userinfo`;
          break;
        
        case 'okta':
          userInfoEndpoint = `https://${this.providers.okta.domain}/oauth2/${this.providers.okta.authorizationServerId}/v1/userinfo`;
          break;
        
        case 'google':
          userInfoEndpoint = 'https://www.googleapis.com/oauth2/v2/userinfo';
          break;
        
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      
      const response = await axios.get(userInfoEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      
      // Normalize user info across providers
      const userInfo = response.data;
      return {
        id: userInfo.sub || userInfo.id,
        email: userInfo.email,
        name: userInfo.name || `${userInfo.given_name} ${userInfo.family_name}`.trim(),
        picture: userInfo.picture,
        provider,
        providerData: userInfo
      };
    } catch (error) {
      console.error(`Error getting user info from ${provider}:`, error.response?.data || error.message);
      throw new Error(`Failed to get user information from ${provider}`);
    }
  }

  /**
   * Mock getUserById - Should be replaced with actual database lookup
   * @param {string} userId - User ID
   * @returns {Object} User object
   */
  async getUserById(userId) {
    // This is a mock implementation
    // In production, this should query your user database
    return {
      id: userId,
      email: 'user@example.com',
      name: 'Test User',
      roles: ['user']
    };
  }

  /**
   * Clean up expired sessions and tokens
   */
  cleanup() {
    const now = Date.now();
    
    // Clean up expired sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
    
    // Clean up expired refresh tokens
    for (const [token, data] of this.refreshTokens.entries()) {
      if (now > data.expiresAt) {
        this.refreshTokens.delete(token);
      }
    }
  }
}

module.exports = AuthenticationService;