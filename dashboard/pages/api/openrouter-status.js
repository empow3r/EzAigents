export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.CLAUDE_API_KEY;
  
  if (!apiKey) {
    return res.status(200).json({
      connected: false,
      status: 'no_api_key',
      error: 'No API key configured'
    });
  }

  try {
    // Check OpenRouter API status
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      const data = await response.json();
      const availableModels = data.data || [];
      
      // Filter for models we care about
      const relevantModels = availableModels.filter(model => 
        model.id.includes('claude') || 
        model.id.includes('gpt') || 
        model.id.includes('deepseek') ||
        model.id.includes('mistral') ||
        model.id.includes('gemini')
      );
      
      return res.status(200).json({
        connected: true,
        status: 'operational',
        models: relevantModels.map(m => ({
          id: m.id,
          name: m.name,
          contextLength: m.context_length,
          pricing: m.pricing
        })),
        totalModels: availableModels.length,
        error: null
      });
    } else {
      const errorText = await response.text();
      return res.status(200).json({
        connected: false,
        status: 'api_error',
        error: `API returned ${response.status}: ${errorText}`,
        models: []
      });
    }
  } catch (error) {
    console.error('OpenRouter connection check error:', error);
    
    return res.status(200).json({
      connected: false,
      status: 'error',
      error: error.name === 'AbortError' ? 'Connection timeout' : error.message,
      models: []
    });
  }
}