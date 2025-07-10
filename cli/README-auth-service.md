# Authentication Service

A comprehensive authentication service for the Ez Aigent platform supporting OAuth2/OIDC, JWT tokens, and session management.

## Features

- **JWT Token Management**
  - Access token generation with configurable expiry
  - Refresh token functionality with rotation
  - Token verification with issuer/audience validation

- **Session Management**
  - In-memory session storage
  - Session validation and cleanup
  - Activity tracking

- **OAuth2/OIDC Integration**
  - Auth0 provider support
  - Okta provider support
  - Google OAuth support
  - Authorization URL generation
  - Code exchange for tokens
  - User info retrieval

## Installation

```bash
npm install jsonwebtoken axios
```

## Usage

### Basic Setup

```javascript
const AuthenticationService = require('./auth-service');

const authService = new AuthenticationService({
  jwtSecret: process.env.JWT_SECRET,
  accessTokenExpiry: 3600, // 1 hour
  refreshTokenExpiry: 604800, // 7 days
  providers: {
    auth0: {
      domain: 'your-domain.auth0.com',
      clientId: 'your-client-id',
      clientSecret: 'your-client-secret',
      audience: 'your-api-audience'
    },
    okta: {
      domain: 'your-domain.okta.com',
      clientId: 'your-client-id',
      clientSecret: 'your-client-secret'
    },
    google: {
      clientId: 'your-client-id',
      clientSecret: 'your-client-secret',
      redirectUri: 'http://localhost:3000/callback'
    }
  }
});
```

### JWT Token Operations

```javascript
// Generate access token
const accessToken = authService.generateAccessToken({
  userId: 'user123',
  email: 'user@example.com',
  roles: ['user', 'admin']
});

// Verify token
try {
  const payload = authService.verifyToken(accessToken);
  console.log('Valid token:', payload);
} catch (error) {
  console.error('Invalid token:', error.message);
}

// Generate refresh token
const refreshToken = authService.generateRefreshToken('user123');

// Refresh access token
const newTokens = await authService.refreshAccessToken(refreshToken);
```

### Session Management

```javascript
// Create session
const session = authService.createSession({
  id: 'user123',
  email: 'user@example.com',
  name: 'John Doe',
  roles: ['user']
});

// Validate session
try {
  const validSession = authService.validateSession(session.sessionId);
  console.log('Session valid:', validSession);
} catch (error) {
  console.error('Session invalid:', error.message);
}

// Destroy session
authService.destroySession(session.sessionId);
```

### OAuth2 Integration

```javascript
// Generate authorization URL
const authUrl = authService.getAuthorizationUrl(
  'auth0', // or 'okta', 'google'
  'random-state-string',
  'http://localhost:3000/callback'
);

// Exchange authorization code for tokens
const tokens = await authService.exchangeCodeForTokens(
  'auth0',
  'authorization-code',
  'http://localhost:3000/callback'
);

// Get user info from provider
const userInfo = await authService.getUserInfo('auth0', tokens.access_token);
```

## Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-secret-key

# Auth0
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=your-api-audience

# Okta
OKTA_DOMAIN=your-domain.okta.com
OKTA_CLIENT_ID=your-client-id
OKTA_CLIENT_SECRET=your-client-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/callback
```

## Testing

```bash
# Run tests
npm test auth-service.test.js

# Run with coverage
npm test auth-service.test.js -- --coverage
```

Current test coverage: **81.37%**

## Security Considerations

- Store JWT secret securely (use environment variables)
- Use HTTPS in production
- Implement rate limiting for token generation
- Regularly rotate JWT secrets
- Use secure session storage in production (Redis/database)
- Validate redirect URIs for OAuth flows

## Integration with Ez Aigent

The authentication service can be integrated with the Ez Aigent platform to secure:
- Agent API endpoints
- Dashboard access
- Inter-agent communication
- Task queue access
- Admin operations

Example middleware integration:

```javascript
// Express middleware
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const payload = authService.verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Protect routes
app.get('/api/agents', requireAuth, (req, res) => {
  // Only authenticated users can access
});
```

## Future Enhancements

- [ ] Redis-based session storage
- [ ] Database integration for user management
- [ ] SAML support
- [ ] Multi-factor authentication
- [ ] API key management for agents
- [ ] Role-based access control (RBAC)
- [ ] Audit logging