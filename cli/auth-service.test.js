/**
 * Unit tests for AuthenticationService
 */

const AuthenticationService = require('./auth-service');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('AuthenticationService', () => {
  let authService;
  const mockConfig = {
    jwtSecret: 'test-secret-key',
    accessTokenExpiry: 3600,
    refreshTokenExpiry: 604800,
    providers: {
      auth0: {
        domain: 'test.auth0.com',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        audience: 'test-audience'
      },
      okta: {
        domain: 'test.okta.com',
        clientId: 'okta-client-id',
        clientSecret: 'okta-client-secret'
      },
      google: {
        clientId: 'google-client-id',
        clientSecret: 'google-client-secret',
        redirectUri: 'http://localhost:3000/callback'
      }
    }
  };

  beforeEach(() => {
    authService = new AuthenticationService(mockConfig);
    jest.clearAllMocks();
  });

  describe('Token Generation', () => {
    test('should generate access token with correct payload', () => {
      const payload = { userId: '123', email: 'test@example.com' };
      const token = authService.generateAccessToken(payload);
      
      const decoded = jwt.verify(token, mockConfig.jwtSecret);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.iss).toBe('ez-aigent');
      expect(decoded.aud).toBe('ez-aigent-api');
    });

    test('should generate unique refresh tokens', () => {
      const token1 = authService.generateRefreshToken('user1');
      const token2 = authService.generateRefreshToken('user2');
      
      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64); // 32 bytes in hex
      expect(authService.refreshTokens.has(token1)).toBe(true);
    });

    test('should throw error on invalid token generation', () => {
      // Mock jwt.sign to throw error
      jest.spyOn(jwt, 'sign').mockImplementation(() => {
        throw new Error('JWT error');
      });
      
      expect(() => authService.generateAccessToken({})).toThrow('Failed to generate access token');
      
      // Restore mock
      jwt.sign.mockRestore();
    });
  });

  describe('Token Verification', () => {
    test('should verify valid token', () => {
      const payload = { userId: '123', email: 'test@example.com' };
      const token = authService.generateAccessToken(payload);
      
      const decoded = authService.verifyToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    test('should throw error for invalid token', () => {
      expect(() => authService.verifyToken('invalid-token')).toThrow('Invalid or expired token');
    });

    test('should throw error for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: '123' },
        mockConfig.jwtSecret,
        { expiresIn: '-1s', issuer: 'ez-aigent', audience: 'ez-aigent-api' }
      );
      
      expect(() => authService.verifyToken(expiredToken)).toThrow('Invalid or expired token');
    });
  });

  describe('Refresh Token', () => {
    test('should refresh access token with valid refresh token', async () => {
      const user = { id: '123', email: 'test@example.com', roles: ['user'] };
      jest.spyOn(authService, 'getUserById').mockResolvedValue(user);
      
      const refreshToken = authService.generateRefreshToken(user.id);
      const result = await authService.refreshAccessToken(refreshToken);
      
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn', 3600);
      expect(authService.refreshTokens.has(refreshToken)).toBe(false); // Old token removed
    });

    test('should throw error for invalid refresh token', async () => {
      await expect(authService.refreshAccessToken('invalid-token'))
        .rejects.toThrow('Invalid refresh token');
    });

    test('should throw error for expired refresh token', async () => {
      const refreshToken = authService.generateRefreshToken('123');
      const tokenData = authService.refreshTokens.get(refreshToken);
      tokenData.expiresAt = Date.now() - 1000; // Set to past
      
      await expect(authService.refreshAccessToken(refreshToken))
        .rejects.toThrow('Refresh token expired');
    });
  });

  describe('Session Management', () => {
    test('should create session with tokens', () => {
      const user = { id: '123', email: 'test@example.com', name: 'Test User', roles: ['user'] };
      const session = authService.createSession(user);
      
      expect(session).toHaveProperty('sessionId');
      expect(session).toHaveProperty('accessToken');
      expect(session).toHaveProperty('refreshToken');
      expect(session).toHaveProperty('expiresIn', 3600);
      expect(session.user).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles
      });
      expect(authService.sessions.has(session.sessionId)).toBe(true);
    });

    test('should validate active session', () => {
      const user = { id: '123', email: 'test@example.com' };
      const { sessionId } = authService.createSession(user);
      
      const session = authService.validateSession(sessionId);
      expect(session).toHaveProperty('userId', user.id);
      expect(session).toHaveProperty('lastActivity');
    });

    test('should throw error for invalid session', () => {
      expect(() => authService.validateSession('invalid-session'))
        .toThrow('Invalid session');
    });

    test('should destroy session', () => {
      const user = { id: '123', email: 'test@example.com' };
      const { sessionId } = authService.createSession(user);
      
      authService.destroySession(sessionId);
      expect(authService.sessions.has(sessionId)).toBe(false);
    });
  });

  describe('OAuth2 Integration', () => {
    test('should generate Auth0 authorization URL', () => {
      const url = authService.getAuthorizationUrl('auth0', 'test-state', 'http://localhost:3000/callback');
      
      expect(url).toContain('https://test.auth0.com/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('state=test-state');
      expect(url).toContain('scope=openid profile email');
    });

    test('should generate Okta authorization URL', () => {
      const url = authService.getAuthorizationUrl('okta', 'test-state', 'http://localhost:3000/callback');
      
      expect(url).toContain('https://test.okta.com/oauth2/default/v1/authorize');
      expect(url).toContain('client_id=okta-client-id');
    });

    test('should generate Google authorization URL', () => {
      const url = authService.getAuthorizationUrl('google', 'test-state', 'http://localhost:3000/callback');
      
      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=google-client-id');
    });

    test('should throw error for unsupported provider', () => {
      expect(() => authService.getAuthorizationUrl('invalid', 'state', 'redirect'))
        .toThrow('Unsupported provider: invalid');
    });
  });

  describe('Code Exchange', () => {
    test('should exchange code for tokens with Auth0', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'auth0-access-token',
          refresh_token: 'auth0-refresh-token',
          id_token: 'auth0-id-token'
        }
      };
      axios.post.mockResolvedValue(mockTokenResponse);
      
      const result = await authService.exchangeCodeForTokens('auth0', 'test-code', 'http://localhost:3000/callback');
      
      expect(axios.post).toHaveBeenCalledWith(
        'https://test.auth0.com/oauth/token',
        expect.objectContaining({
          grant_type: 'authorization_code',
          code: 'test-code',
          client_id: 'test-client-id'
        }),
        expect.any(Object)
      );
      expect(result).toEqual(mockTokenResponse.data);
    });

    test('should handle token exchange errors', async () => {
      axios.post.mockRejectedValue(new Error('Network error'));
      
      await expect(authService.exchangeCodeForTokens('auth0', 'test-code', 'redirect'))
        .rejects.toThrow('Failed to exchange authorization code with auth0');
    });
  });

  describe('User Info', () => {
    test('should get user info from Auth0', async () => {
      const mockUserInfo = {
        data: {
          sub: 'auth0|123',
          email: 'user@example.com',
          name: 'Test User',
          picture: 'https://example.com/picture.jpg'
        }
      };
      axios.get.mockResolvedValue(mockUserInfo);
      
      const result = await authService.getUserInfo('auth0', 'test-token');
      
      expect(axios.get).toHaveBeenCalledWith(
        'https://test.auth0.com/userinfo',
        { headers: { Authorization: 'Bearer test-token' } }
      );
      expect(result).toEqual({
        id: 'auth0|123',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/picture.jpg',
        provider: 'auth0',
        providerData: mockUserInfo.data
      });
    });

    test('should handle user info errors', async () => {
      axios.get.mockRejectedValue(new Error('Unauthorized'));
      
      await expect(authService.getUserInfo('auth0', 'invalid-token'))
        .rejects.toThrow('Failed to get user information from auth0');
    });
  });

  describe('Cleanup', () => {
    test('should clean up expired sessions and tokens', () => {
      // Create sessions and tokens
      const user = { id: '123', email: 'test@example.com' };
      const { sessionId } = authService.createSession(user);
      const refreshToken = authService.generateRefreshToken(user.id);
      
      // Manually expire them
      const session = authService.sessions.get(sessionId);
      session.expiresAt = Date.now() - 1000;
      
      const tokenData = authService.refreshTokens.get(refreshToken);
      tokenData.expiresAt = Date.now() - 1000;
      
      authService.cleanup();
      
      expect(authService.sessions.has(sessionId)).toBe(false);
      expect(authService.refreshTokens.has(refreshToken)).toBe(false);
    });
  });
});

describe('AuthenticationService - Integration Tests', () => {
  let authService;

  beforeEach(() => {
    authService = new AuthenticationService({
      jwtSecret: 'integration-test-secret'
    });
  });

  test('should complete full authentication flow', async () => {
    // Mock user data
    const mockUser = {
      id: 'user-123',
      email: 'integration@test.com',
      name: 'Integration Test',
      roles: ['user', 'admin']
    };
    
    // Create session
    const session = authService.createSession(mockUser);
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    
    // Verify access token
    const decoded = authService.verifyToken(session.accessToken);
    expect(decoded.userId).toBe(mockUser.id);
    expect(decoded.email).toBe(mockUser.email);
    expect(decoded.roles).toEqual(mockUser.roles);
    
    // Validate session
    const validatedSession = authService.validateSession(session.sessionId);
    expect(validatedSession.userId).toBe(mockUser.id);
    
    // Refresh token
    jest.spyOn(authService, 'getUserById').mockResolvedValue(mockUser);
    const refreshedTokens = await authService.refreshAccessToken(session.refreshToken);
    expect(refreshedTokens.accessToken).toBeTruthy();
    expect(refreshedTokens.refreshToken).toBeTruthy();
    
    // Verify new access token
    const newDecoded = authService.verifyToken(refreshedTokens.accessToken);
    expect(newDecoded.userId).toBe(mockUser.id);
    
    // Destroy session
    authService.destroySession(session.sessionId);
    expect(() => authService.validateSession(session.sessionId)).toThrow('Invalid session');
  });
});