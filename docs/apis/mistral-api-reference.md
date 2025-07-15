# Mistral AI API Reference

## Overview
Mistral AI API provides access to advanced language models for various AI applications with focus on performance and multilingual capabilities.

## Authentication
- **API Key**: Required for authentication
- **Access**: Available through La Plateforme (https://console.mistral.ai)

## Base URL
```
https://api.mistral.ai/v1
```

## Installation

### Python
```bash
pip install mistralai
```

### JavaScript/TypeScript
```bash
npm install @mistralai/mistralai
```

## Request Headers
- `Content-Type`: `application/json`
- `Authorization`: `Bearer YOUR_API_KEY`

## Core Endpoints

### Chat Completions
**POST** `/v1/chat/completions`

#### Request Parameters
- `model` (required): Model ID (e.g., "mistral-large", "mistral-small")
- `messages` (required): Array of message objects
- `max_tokens` (optional): Maximum tokens to generate
- `temperature` (optional): Controls randomness (0.0-0.7 recommended)
- `top_p` (optional): Nucleus sampling parameter
- `stream` (optional): Enable streaming responses
- `tools` (optional): Available tools for function calling

#### Example Request (Python)
```python
from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage

client = MistralClient(api_key="your-api-key")
response = client.chat(
    model="mistral-large",
    messages=[
        ChatMessage(role="user", content="Hello, Mistral!")
    ],
    max_tokens=1024,
    temperature=0.3
)
print(response.choices[0].message.content)
```

#### Example Request (cURL)
```bash
curl https://api.mistral.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MISTRAL_API_KEY" \
  -d '{
    "model": "mistral-large",
    "messages": [{"role": "user", "content": "Hello, Mistral!"}],
    "max_tokens": 1024,
    "temperature": 0.3
  }'
```

### Embeddings
**POST** `/v1/embeddings`

#### Request Parameters
- `model` (required): Model ID (e.g., "mistral-embed")
- `input` (required): Input text to embed
- `encoding_format` (optional): Format of embedding

### Fine-tuning
**POST** `/v1/fine_tuning/jobs`

#### Request Parameters
- `model` (required): Base model to fine-tune
- `training_files` (required): Training data files
- `hyperparameters` (optional): Training configuration

## Response Format
```json
{
  "id": "cmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "mistral-large",
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
- `mistral-large`: Most capable model for complex tasks
- `mistral-medium`: Balanced performance and cost
- `mistral-small`: Fast and cost-effective
- `mistral-tiny`: Lightweight for simple tasks

### Embedding Models
- `mistral-embed`: High-quality text embeddings

### Specialized Models
- `codestral`: Optimized for code generation
- `mistral-nemo`: Multilingual capabilities

## Function Calling
```python
tools = [
    {
        "type": "function",
        "function": {
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
    }
]

response = client.chat(
    model="mistral-large",
    messages=[
        ChatMessage(role="user", content="What's the weather in Paris?")
    ],
    tools=tools,
    tool_choice="auto"
)
```

## Best Practices
1. **Temperature Control**: Use 0.0-0.7 range for optimal results
2. **Model Selection**: Choose based on task complexity
3. **Token Management**: Monitor usage with the `usage` field
4. **Streaming**: Use for real-time applications
5. **Multilingual**: Leverage native multilingual capabilities
6. **Function Calling**: Excellent for structured outputs

## Error Handling
Common HTTP status codes:
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Invalid API key
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server-side issue

## Rate Limits
- Varies by model and subscription tier
- Monitor response headers for current limits
- Implement exponential backoff for 429 responses

## Agent Integration Notes
- **Specialization**: Excellent for documentation and content generation
- **Context Window**: 32k tokens for most models
- **Multilingual**: Native support for multiple languages
- **Performance**: Fast inference with good quality
- **Cost Efficiency**: Competitive pricing for high-volume usage

## Token Pool Configuration
```json
{
  "mistral": {
    "keys": ["key1", "key2", "key3"],
    "model": "mistral-large",
    "context_window": 32768,
    "specialization": "documentation"
  }
}
```

## Queue Integration
- Queue name: `queue:command-r-plus`
- Processing queue: `processing:command-r-plus`
- Optimal for: Documentation, content creation, multilingual tasks
- Batch size: 3-5 concurrent requests recommended

## Streaming Example
```python
stream_response = client.chat_stream(
    model="mistral-large",
    messages=[
        ChatMessage(role="user", content="Write a story about AI")
    ],
    max_tokens=1000
)

for chunk in stream_response:
    if chunk.choices[0].delta.content is not None:
        print(chunk.choices[0].delta.content, end="")
```