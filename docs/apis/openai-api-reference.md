# OpenAI API Reference

## Overview
The OpenAI API provides access to GPT models for various AI applications including text generation, code completion, and analysis.

## Authentication
- **API Key**: Required in the `Authorization: Bearer` header
- **Access**: Available through OpenAI Platform (https://platform.openai.com/)
- **Organization ID**: Optional header for organization-specific access

## Base URL
```
https://api.openai.com/v1
```

## Installation

### Python
```bash
pip install openai
```

### TypeScript/JavaScript
```bash
npm install openai
```

## Request Headers
- `Content-Type`: `application/json`
- `Authorization`: `Bearer YOUR_API_KEY`
- `OpenAI-Organization`: Your organization ID (optional)

## Core Endpoints

### Chat Completions
**POST** `/v1/chat/completions`

#### Request Parameters
- `model` (required): Model ID (e.g., "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo")
- `messages` (required): Array of message objects
- `max_tokens` (optional): Maximum tokens to generate
- `temperature` (optional): Controls randomness (0.0-2.0)
- `top_p` (optional): Nucleus sampling parameter
- `stream` (optional): Enable streaming responses
- `functions` (optional): Available functions for function calling
- `tools` (optional): Available tools for tool calling

#### Example Request (Python)
```python
from openai import OpenAI

client = OpenAI(api_key="your-api-key")
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Hello, GPT!"}
    ],
    max_tokens=1024,
    temperature=0.7
)
print(response.choices[0].message.content)
```

#### Example Request (cURL)
```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello, GPT!"}],
    "max_tokens": 1024,
    "temperature": 0.7
  }'
```

### Completions (Legacy)
**POST** `/v1/completions`

#### Request Parameters
- `model` (required): Model ID (e.g., "text-davinci-003")
- `prompt` (required): Text prompt
- `max_tokens` (optional): Maximum tokens to generate
- `temperature` (optional): Controls randomness

### Embeddings
**POST** `/v1/embeddings`

#### Request Parameters
- `model` (required): Model ID (e.g., "text-embedding-ada-002")
- `input` (required): Input text to embed
- `encoding_format` (optional): Format of embedding (float, base64)

### Fine-tuning
**POST** `/v1/fine_tuning/jobs`

#### Request Parameters
- `training_file` (required): File ID for training data
- `model` (required): Base model to fine-tune
- `hyperparameters` (optional): Training hyperparameters

## Response Format (Chat Completions)
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

## Available Models

### Chat Models
- `gpt-4o`: Most capable model (128k context)
- `gpt-4-turbo`: High performance (128k context)
- `gpt-4`: Reliable for complex tasks (8k context)
- `gpt-3.5-turbo`: Fast and cost-effective (4k context)

### Embedding Models
- `text-embedding-ada-002`: Most capable embedding model
- `text-embedding-3-small`: Smaller, faster embedding model
- `text-embedding-3-large`: Larger, more capable embedding model

## Function Calling
```python
functions = [
    {
        "name": "get_weather",
        "description": "Get current weather",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City name"
                }
            },
            "required": ["location"]
        }
    }
]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's the weather in Boston?"}],
    functions=functions,
    function_call="auto"
)
```

## Best Practices
1. **Model Selection**: Use GPT-4o for backend logic and APIs
2. **Token Management**: Monitor usage with the `usage` field
3. **Temperature Control**: Lower values for deterministic tasks
4. **Context Management**: Stay within token limits
5. **Error Handling**: Implement exponential backoff for retries
6. **Streaming**: Use for real-time applications

## Error Handling
Common HTTP status codes:
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Invalid API key
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server-side issue

## Rate Limits
- Varies by model and usage tier
- Monitor headers: `x-ratelimit-limit-requests`, `x-ratelimit-remaining-requests`
- Implement exponential backoff for 429 responses

## Agent Integration Notes
- **Specialization**: GPT-4o excels at backend logic and API development
- **Context Window**: 128k tokens for GPT-4o, 4k for GPT-3.5-turbo
- **Function Calling**: Excellent for structured outputs and tool integration
- **Cost Optimization**: Use GPT-3.5-turbo for simple tasks, GPT-4o for complex ones