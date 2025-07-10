import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, model, settings, history } = req.body;

    if (!message || !model) {
      return res.status(400).json({ error: 'Message and model are required' });
    }

    // Route to appropriate AI service based on model
    let response;
    let tokens = 0;

    switch (model) {
      case 'claude':
        response = await callClaude(message, settings, history);
        tokens = response.usage?.output_tokens || 0;
        break;
      case 'gpt':
        response = await callOpenAI(message, settings, history);
        tokens = response.usage?.completion_tokens || 0;
        break;
      case 'deepseek':
        response = await callDeepSeek(message, settings, history);
        tokens = response.usage?.completion_tokens || 0;
        break;
      case 'mistral':
        response = await callMistral(message, settings, history);
        tokens = response.usage?.completion_tokens || 0;
        break;
      case 'gemini':
        response = await callGemini(message, settings, history);
        tokens = response.usage?.completion_tokens || 0;
        break;
      default:
        return res.status(400).json({ error: 'Invalid model' });
    }

    return res.status(200).json({
      response: response.content || response.message || 'No response',
      tokens: tokens,
      model: model
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({ 
      error: 'AI service temporarily unavailable',
      details: error.message 
    });
  }
}

// Claude API Integration
async function callClaude(message, settings, history) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('Claude API key not configured');
  }

  const messages = [
    ...history.map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content
    })),
    { role: 'user', content: message }
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      messages: messages,
      max_tokens: settings.maxTokens || 4000,
      temperature: settings.temperature || 0.7,
      system: settings.systemPrompt || undefined
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.content[0].text,
    usage: data.usage
  };
}

// OpenAI API Integration
async function callOpenAI(message, settings, history) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const messages = [
    ...(settings.systemPrompt ? [{ role: 'system', content: settings.systemPrompt }] : []),
    ...history.map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content
    })),
    { role: 'user', content: message }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: messages,
      max_tokens: settings.maxTokens || 4000,
      temperature: settings.temperature || 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage
  };
}

// DeepSeek API Integration
async function callDeepSeek(message, settings, history) {
  const apiKeys = process.env.DEEPSEEK_API_KEYS?.split(',') || [];
  if (apiKeys.length === 0) {
    throw new Error('DeepSeek API keys not configured');
  }

  const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
  const messages = [
    ...(settings.systemPrompt ? [{ role: 'system', content: settings.systemPrompt }] : []),
    ...history.map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content
    })),
    { role: 'user', content: message }
  ];

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-coder',
      messages: messages,
      max_tokens: settings.maxTokens || 2000,
      temperature: settings.temperature || 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage
  };
}

// Mistral API Integration
async function callMistral(message, settings, history) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('Mistral API key not configured');
  }

  const messages = [
    ...(settings.systemPrompt ? [{ role: 'system', content: settings.systemPrompt }] : []),
    ...history.map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content
    })),
    { role: 'user', content: message }
  ];

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: messages,
      max_tokens: settings.maxTokens || 2000,
      temperature: settings.temperature || 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage
  };
}

// Gemini API Integration
async function callGemini(message, settings, history) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  // Gemini uses a different message format
  const contents = [
    ...history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    })),
    { role: 'user', parts: [{ text: message }] }
  ];

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: contents,
      generationConfig: {
        temperature: settings.temperature || 0.7,
        maxOutputTokens: settings.maxTokens || 2000
      },
      systemInstruction: settings.systemPrompt ? {
        parts: [{ text: settings.systemPrompt }]
      } : undefined
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.candidates[0].content.parts[0].text,
    usage: data.usageMetadata
  };
}