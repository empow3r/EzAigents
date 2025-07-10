/**
 * Authentication API endpoint for Ez Aigent Dashboard
 * Integrates with the OAuth2 authentication service
 */

const AuthenticationService = require('../../../cli/auth-service');

// Initialize auth service with environment configuration
const authService = new AuthenticationService({
  jwtSecret: process.env.JWT_SECRET,
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    }
  }
});

export default async function handler(req, res) {
  const { method, query, body } = req;

  try {
    switch (method) {
      case 'POST':
        if (query.action === 'login') {
          // Handle OAuth login
          const { provider = 'google', code } = body;
          
          try {
            const result = await authService.handleOAuthCallback(provider, code);
            
            // Set secure HTTP-only cookie
            res.setHeader('Set-Cookie', [
              `accessToken=${result.accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`,
              `refreshToken=${result.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`
            ]);
            
            res.status(200).json({
              success: true,
              user: result.user,
              message: 'Authentication successful'
            });
          } catch (error) {
            res.status(401).json({
              success: false,
              error: 'Authentication failed',
              details: error.message
            });
          }
        } else if (query.action === 'logout') {
          // Handle logout
          const sessionId = req.cookies.sessionId;
          
          if (sessionId) {
            authService.revokeSession(sessionId);
          }
          
          // Clear cookies
          res.setHeader('Set-Cookie', [
            'accessToken=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
            'refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
            'sessionId=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
          ]);
          
          res.status(200).json({
            success: true,
            message: 'Logout successful'
          });
        } else if (query.action === 'refresh') {
          // Handle token refresh
          const refreshToken = req.cookies.refreshToken;
          
          if (!refreshToken) {
            return res.status(401).json({
              success: false,
              error: 'No refresh token provided'
            });
          }
          
          try {
            const result = await authService.refreshAccessToken(refreshToken);
            
            res.setHeader('Set-Cookie', [
              `accessToken=${result.accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`,
              `refreshToken=${result.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`
            ]);
            
            res.status(200).json({
              success: true,
              message: 'Token refreshed successfully'
            });
          } catch (error) {
            res.status(401).json({
              success: false,
              error: 'Token refresh failed',
              details: error.message
            });
          }
        }
        break;

      case 'GET':
        if (query.action === 'me') {
          // Get current user info
          const accessToken = req.cookies.accessToken;
          
          if (!accessToken) {
            return res.status(401).json({
              success: false,
              error: 'Not authenticated'
            });
          }
          
          try {
            const decoded = authService.verifyToken(accessToken);
            
            res.status(200).json({
              success: true,
              user: {
                id: decoded.sub,
                email: decoded.email,
                name: decoded.name,
                role: decoded.role || 'user'
              }
            });
          } catch (error) {
            res.status(401).json({
              success: false,
              error: 'Invalid token',
              details: error.message
            });
          }
        } else if (query.action === 'oauth-url') {
          // Get OAuth authorization URL
          const provider = query.provider || 'google';
          
          try {
            const authUrl = authService.getAuthorizationUrl(provider);
            
            res.status(200).json({
              success: true,
              authUrl,
              provider
            });
          } catch (error) {
            res.status(400).json({
              success: false,
              error: 'Failed to generate OAuth URL',
              details: error.message
            });
          }
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({
          success: false,
          error: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Authentication API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}