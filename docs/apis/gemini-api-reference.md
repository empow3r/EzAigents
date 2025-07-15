# Google Gemini API Reference

## Overview
Google Gemini API provides access to advanced multimodal AI models capable of understanding and generating text, images, and code.

## Authentication
- **API Key**: Required for authentication
- **Access**: Available through Google AI Studio (https://aistudio.google.com/apikey)

## Base URL
```
https://generativelanguage.googleapis.com/v1
```

## Installation

### Python
```bash
pip install google-generativeai
```

### JavaScript/TypeScript
```bash
npm install @google/generative-ai
```

## Request Headers
- `Content-Type`: `application/json`
- `x-goog-api-key`: YOUR_API_KEY

## Core Endpoints

### Generate Content
**POST** `/v1/models/{model}:generateContent`

#### Request Parameters
- `model` (required): Model ID (e.g., "gemini-2.5-pro", "gemini-2.5-flash")
- `contents` (required): Array of content objects
- `generationConfig` (optional): Generation parameters
- `safetySettings` (optional): Safety configuration

#### Example Request (Python)
```python
import google.generativeai as genai

genai.configure(api_key="your-api-key")
model = genai.GenerativeModel("gemini-2.5-pro")

response = model.generate_content("Hello, Gemini!")
print(response.text)
```

#### Example Request (JavaScript)
```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("your-api-key");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

const result = await model.generateContent("Hello, Gemini!");
console.log(result.response.text());
```

#### Example Request (cURL)
```bash
curl "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Hello, Gemini!"
          }
        ]
      }
    ]
  }'
```

### Multimodal Input
```python
# Text and image input
import PIL.Image

img = PIL.Image.open("image.jpg")
response = model.generate_content(["Describe this image", img])
print(response.text)
```

### Streaming
```python
response = model.generate_content("Write a story", stream=True)
for chunk in response:
    print(chunk.text, end="")
```

## Response Format
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "Hello! How can I help you today?"
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "index": 0,
      "safetyRatings": [
        {
          "category": "HARM_CATEGORY_HARASSMENT",
          "probability": "NEGLIGIBLE"
        }
      ]
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 5,
    "candidatesTokenCount": 10,
    "totalTokenCount": 15
  }
}
```

## Available Models

### Production Models
- `gemini-2.5-pro`: Most capable model for complex tasks
- `gemini-2.5-flash`: Fast and efficient for most tasks
- `gemini-2.5-flash-8b`: Lightweight for simple tasks

### Experimental Models
- `gemini-exp-1206`: Latest experimental features
- `gemini-exp-1121`: Advanced reasoning capabilities

### Specialized Models
- `gemini-2.0-flash-exp`: Latest generation with enhanced capabilities
- `text-embedding-004`: High-quality text embeddings

## Generation Configuration
```python
generation_config = {
    "temperature": 0.7,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 1024,
    "response_mime_type": "text/plain"
}

response = model.generate_content(
    "Write a poem",
    generation_config=generation_config
)
```

## Safety Settings
```python
safety_settings = [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    }
]

response = model.generate_content(
    "Generate content",
    safety_settings=safety_settings
)
```

## Function Calling
```python
def get_weather(location):
    return f"Weather in {location}: 72°F, sunny"

tools = [
    {
        "function_declarations": [
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
    }
]

model = genai.GenerativeModel("gemini-2.5-pro", tools=tools)
response = model.generate_content("What's the weather in Boston?")
```

## Best Practices
1. **Model Selection**: Use gemini-2.5-flash for most tasks, gemini-2.5-pro for complex reasoning
2. **Multimodal**: Leverage image and text inputs for richer context
3. **Token Management**: Monitor usage with `usageMetadata`
4. **Safety**: Configure appropriate safety settings
5. **Streaming**: Use for real-time applications
6. **Context**: Utilize large context window (millions of tokens)

## Error Handling
Common HTTP status codes:
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Invalid API key
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server-side issue

## Rate Limits
- Varies by model and usage tier
- Monitor response headers for current limits
- Implement exponential backoff for 429 responses

## Agent Integration Notes
- **Specialization**: Excellent for code analysis and complex reasoning
- **Context Window**: Up to 2 million tokens for some models
- **Multimodal**: Unique ability to process images and text together
- **Performance**: Fast inference with high-quality outputs
- **Cost Efficiency**: Competitive pricing for high-volume usage

## Token Pool Configuration
```json
{
  "gemini": {
    "keys": ["key1", "key2", "key3"],
    "model": "gemini-2.5-flash",
    "context_window": 1000000,
    "specialization": "code_analysis"
  }
}
```

## Queue Integration
- Queue name: `queue:gemini-pro`
- Processing queue: `processing:gemini-pro`
- Optimal for: Code analysis, complex reasoning, multimodal tasks
- Batch size: 3-5 concurrent requests recommended

## Structured Output
```python
import json

response = model.generate_content(
    "List 3 colors in JSON format",
    generation_config={
        "response_mime_type": "application/json",
        "response_schema": {
            "type": "object",
            "properties": {
                "colors": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        }
    }
)

colors = json.loads(response.text)
```