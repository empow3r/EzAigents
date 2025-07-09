# API Key Management System

A comprehensive API key management system for Ez Aigent with automatic rotation, health monitoring, and fallback mechanisms.

## Quick Start

```bash
# 1. Interactive setup wizard
node cli/setup-api-keys.js

# 2. Start API key manager
node cli/api-key-manager.js start

# 3. Monitor API health
node cli/api-health-monitor.js monitor
```

## Components

### 1. API Key Manager (`cli/api-key-manager.js`)
- Centralized key management
- Automatic rotation based on usage
- Rate limit tracking
- Key validation

**Commands:**
```bash
# Test all configured keys
node cli/api-key-manager.js test

# Generate status report
node cli/api-key-manager.js report

# Start API key service (port 3001)
node cli/api-key-manager.js start
```

### 2. API Key Rotator (`cli/api-key-rotator.js`)
- Multiple rotation strategies
- Intelligent fallback chains
- Performance-based selection
- Health-aware rotation

**Rotation Strategies:**
- `round-robin`: Sequential key rotation
- `least-used`: Prefer keys with lowest usage
- `weighted`: Performance-based selection
- `health-based`: Skip unhealthy keys (default)

**Commands:**
```bash
# View rotation statistics
node cli/api-key-rotator.js stats

# Test rotation strategies
node cli/api-key-rotator.js test [model] [strategy]

# Monitor rotation events
node cli/api-key-rotator.js monitor
```

### 3. API Health Monitor (`cli/api-health-monitor.js`)
- Real-time health checking
- Alert system for failures
- Performance metrics tracking
- Web dashboard (port 3002)

**Commands:**
```bash
# One-time health check
node cli/api-health-monitor.js check

# View health summary
node cli/api-health-monitor.js summary

# Start monitoring + dashboard
node cli/api-health-monitor.js monitor
```

## Configuration

### Environment Variables
Add to your `.env` file:

```bash
# API Keys (multiple keys for rotation)
CLAUDE_API_KEY=sk-ant-api03-xxxxx
CLAUDE_API_KEY2=sk-ant-api03-xxxxx
CLAUDE_API_KEY3=sk-ant-api03-xxxxx

OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_API_KEY2=sk-proj-xxxxx
OPENAI_API_KEY3=sk-proj-xxxxx

DEEPSEEK_API_KEYS=key1,key2,key3,key4

MISTRAL_API_KEY=xxxxx
MISTRAL_API_KEY2=xxxxx

GEMINI_API_KEY=AIzaxxxxx
GEMINI_API_KEY2=AIzaxxxxx

# API Management Settings
API_KEY_MANAGER_PORT=3001
HEALTH_DASHBOARD_PORT=3002
ROTATION_STRATEGY=health-based
```

### Token Pool (`shared/tokenpool.json`)
Automatically generated and updated by the setup script:

```json
{
  "claude-3-opus": ["key1", "key2", "key3"],
  "gpt-4o": ["key1", "key2", "key3"],
  "deepseek-coder": ["key1", "key2", "key3", "key4"],
  "command-r-plus": ["key1", "key2"],
  "gemini-pro": ["key1", "key2"]
}
```

## Fallback Chains

When a model fails, the system automatically falls back to alternatives:

- **Claude** → Claude Sonnet → GPT-4 → Gemini Pro
- **GPT-4** → GPT-4 Turbo → Claude → Gemini Pro
- **DeepSeek** → CodeLlama → GPT-4 → Claude
- **Mistral** → Mistral Large → Claude → GPT-4
- **Gemini** → Gemini 1.5 Pro → Claude → GPT-4

## API Endpoints

### Key Manager (Port 3001)
- `GET /api/keys/status` - Overall status report
- `GET /api/keys/:model` - Get next available key for model

### Health Monitor (Port 3002)
- `GET /api/health/summary` - Health summary for all providers
- `GET /api/health/alerts` - Recent alerts
- `GET /api/health/:model/:keyIndex` - Detailed health for specific key
- WebSocket at `/` for real-time updates

## Integration with Agents

Agents automatically use the API key management system:

```javascript
// In agent code
const APIKeyManager = require('./cli/api-key-manager');
const manager = new APIKeyManager();

// Get next healthy key with rotation
const apiKey = await manager.getKey('gpt-4o');

// Track usage (automatic)
await manager.trackUsage('gpt-4o', apiKey);

// Handle failures
try {
  // Make API call
} catch (error) {
  const fallback = await rotator.handleKeyFailure('gpt-4o', apiKey, error);
  // Use fallback.model and fallback.key
}
```

## Monitoring & Alerts

### Alert Types
- **High Severity**: Consecutive failures (3+)
- **Medium Severity**: High error rate (>20%)
- **Low Severity**: High latency (>5s)

### Metrics Tracked
- Success/failure counts
- Average latency
- Rate limit status
- Usage patterns

## Troubleshooting

### All keys failing for a provider
1. Check keys are valid: `node cli/api-key-manager.js test`
2. Verify rate limits aren't exceeded
3. Check provider status page
4. Review recent changes in `.env`

### High latency alerts
1. Check network connectivity
2. Verify provider isn't experiencing issues
3. Consider geographic proximity to API endpoints

### Rotation not working
1. Ensure Redis is running: `redis-cli ping`
2. Check rotation strategy: `echo $ROTATION_STRATEGY`
3. Verify token pool has multiple keys
4. Review health status: `node cli/api-health-monitor.js summary`

## Best Practices

1. **Use Multiple Keys**: Configure 2-4 keys per provider for better reliability
2. **Monitor Regularly**: Keep health dashboard open during development
3. **Set Alerts**: Configure notifications for critical failures
4. **Rotate Keys**: Periodically regenerate API keys for security
5. **Track Costs**: Monitor usage to control API costs

## Security Notes

- API keys are masked in logs (only first 10 chars shown)
- Keys are hashed when stored in Redis
- Token pool file should be in `.gitignore`
- Use environment variables, never hardcode keys
- Regularly audit and rotate keys

## Future Enhancements

- [ ] Cost tracking and budgets
- [ ] Automatic key renewal
- [ ] Provider-specific optimizations
- [ ] Advanced analytics dashboard
- [ ] Webhook notifications
- [ ] Key vault integration