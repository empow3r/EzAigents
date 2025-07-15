# DeepSeek API Reference

## Overview
DeepSeek API provides access to high-performance coding models optimized for software development tasks.

## Authentication
- **API Key**: Required in the `Authorization: Bearer` header
- **Access**: Available through DeepSeek Platform (https://platform.deepseek.com/)

## Base URL
```
https://api.deepseek.com/v1
```

## Installation

### Python
```bash
pip install requests
# or use openai-compatible client
pip install openai
```

### cURL
Direct HTTP requests using standard REST endpoints

## Request Headers
- `Content-Type`: `application/json`
- `Authorization`: `Bearer YOUR_API_KEY`

## Core Endpoints

### Chat Completions
**POST** `/v1/chat/completions`

#### Request Parameters
- `model` (required): Model ID (e.g., "deepseek-coder")
- `messages` (required): Array of message objects
- `max_tokens` (optional): Maximum tokens to generate
- `temperature` (optional): Controls randomness (0.0-2.0)
- `top_p` (optional): Nucleus sampling parameter
- `stream` (optional): Enable streaming responses

#### Example Request (Python with OpenAI client)
```python
from openai import OpenAI

client = OpenAI(
    api_key="your-deepseek-api-key",
    base_url="https://api.deepseek.com/v1"
)

response = client.chat.completions.create(
    model="deepseek-coder",
    messages=[
        {"role": "user", "content": "Write a Python function to sort a list"}
    ],
    max_tokens=1024,
    temperature=0.3
)
print(response.choices[0].message.content)
```

#### Example Request (cURL)
```bash
curl https://api.deepseek.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -d '{
    "model": "deepseek-coder",
    "messages": [{"role": "user", "content": "Write a Python function to sort a list"}],
    "max_tokens": 1024,
    "temperature": 0.3
  }'
```

### Code Completions
**POST** `/v1/completions`

#### Request Parameters
- `model` (required): Model ID (e.g., "deepseek-coder")
- `prompt` (required): Code prompt
- `max_tokens` (optional): Maximum tokens to generate
- `temperature` (optional): Controls randomness

## Response Format
```json
{
  "id": "cmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "deepseek-coder",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "def sort_list(lst):\n    return sorted(lst)"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 12,
    "total_tokens": 27
  }
}
```

## Available Models

### Coding Models
- `deepseek-coder`: Optimized for code generation and analysis
- `deepseek-chat`: General conversation and reasoning
- `deepseek-math`: Mathematical problem solving

### Model Capabilities
- **Code Generation**: Function creation, class design
- **Code Analysis**: Bug detection, optimization suggestions
- **Documentation**: Code comments, README generation
- **Testing**: Unit test generation, test case creation

## Best Practices
1. **Model Selection**: Use deepseek-coder for all coding tasks
2. **Temperature Settings**: Lower values (0.1-0.3) for precise code generation
3. **Context Management**: 32k token context window
4. **Cost Efficiency**: Highly cost-effective for high-volume coding tasks
5. **Batch Processing**: Efficient for multiple code analysis tasks

## Error Handling
Common HTTP status codes:
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Invalid API key
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server-side issue

## Rate Limits
- Check response headers for current limits
- Implement retry logic with exponential backoff
- Consider request queuing for high-volume scenarios

## Agent Integration Notes
- **Specialization**: Excellent for testing, validation, and code analysis
- **Context Window**: 32k tokens - suitable for analyzing large codebases
- **Cost Optimization**: Most cost-effective option for high-volume tasks
- **Performance**: Fast inference times for rapid development cycles
- **Code Quality**: Produces clean, well-structured code with minimal errors

## Token Pool Configuration
```json
{
  "deepseek": {
    "keys": ["key1", "key2", "key3"],
    "model": "deepseek-coder",
    "context_window": 32768,
    "specialization": "testing_validation"
  }
}
```

## Queue Integration
- Queue name: `queue:deepseek-coder`
- Processing queue: `processing:deepseek-coder`
- Optimal for: Unit tests, integration tests, code validation
- Batch size: 5-10 concurrent requests recommended