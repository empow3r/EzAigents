# Claude API Reference

## Overview
The Claude API provides access to Anthropic's family of large language models for various AI applications.

## Authentication
- **API Key**: Required in the `x-api-key` header
- **Access**: Available through the Anthropic Console (https://console.anthropic.com/)
- **Organization ID**: Returned in `anthropic-organization-id` response header

## Base URL
```
https://api.anthropic.com/v1/messages
```

## Installation

### Python
```bash
pip install anthropic
```

### TypeScript/JavaScript
```bash
npm install @anthropic-ai/sdk
```

## Request Headers
- `Content-Type`: `application/json`
- `x-api-key`: Your API key
- `anthropic-version`: API version (required)

## Core Endpoints

### Create Message
**POST** `/v1/messages`

#### Request Parameters
- `model` (required): Model ID (e.g., "claude-opus-4-20250514")
- `max_tokens` (required): Maximum tokens to generate
- `messages` (required): Array of message objects
- `temperature` (optional): Controls randomness (0.0-1.0)
- `top_p` (optional): Nucleus sampling parameter
- `stream` (optional): Enable streaming responses

#### Example Request (Python)
```python
import anthropic

client = anthropic.Anthropic(api_key="my_api_key")
message = client.messages.create(
    model="claude-opus-4-20250514",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello, Claude"}
    ]
)
print(message.content)
```

#### Example Request (cURL)
```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-opus-4-20250514",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello, Claude"}]
  }'
```

## Response Format
```json
{
  "id": "msg_123",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Hello! How can I help you today?"
    }
  ],
  "model": "claude-opus-4-20250514",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 10,
    "output_tokens": 20
  }
}
```

## Response Headers
- `request-id`: Unique request identifier for support/debugging
- `anthropic-organization-id`: Organization ID associated with API key

## Available Models
- `claude-opus-4-20250514`: Most capable model
- `claude-sonnet-3-5`: Balanced performance and speed
- `claude-haiku-3`: Fastest model for simple tasks

## Best Practices
1. **Token Management**: Monitor token usage with the `usage` field
2. **Error Handling**: Implement retry logic for transient failures
3. **Rate Limiting**: Respect API rate limits
4. **Streaming**: Use streaming for real-time applications
5. **Model Selection**: Choose appropriate model for your use case

## Error Handling
Common HTTP status codes:
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Invalid API key
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server-side issue

## Agent Integration Notes
- **Context Window**: Different models have different context limits
- **Specialized Usage**: Claude excels at architecture, refactoring, and complex reasoning
- **Token Efficiency**: Use appropriate model for task complexity
- **Memory Management**: Clear context periodically for long-running agents