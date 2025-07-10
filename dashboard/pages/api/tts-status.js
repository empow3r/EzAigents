export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ttsServerUrl = process.env.TTS_SERVER_URL || 'http://ai_llm:11435';
  
  try {
    // Try to ping the TTS server
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${ttsServerUrl}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(err => {
      // Try alternate endpoint if first fails
      return fetch(`${ttsServerUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });
    });
    
    clearTimeout(timeout);
    
    if (response && response.ok) {
      const data = await response.json().catch(() => ({}));
      return res.status(200).json({
        connected: true,
        server: ttsServerUrl,
        status: 'operational',
        models: data.models || [],
        error: null
      });
    } else {
      return res.status(200).json({
        connected: false,
        server: ttsServerUrl,
        status: 'unreachable',
        error: `Server returned ${response?.status || 'no response'}`
      });
    }
  } catch (error) {
    console.error('TTS connection check error:', error);
    
    return res.status(200).json({
      connected: false,
      server: ttsServerUrl,
      status: 'error',
      error: error.name === 'AbortError' ? 'Connection timeout' : error.message
    });
  }
}