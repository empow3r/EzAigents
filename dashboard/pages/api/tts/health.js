export default function handler(req, res) {
  if (req.method === 'GET') {
    // Check TTS service health
    // In production, this would check actual TTS service status
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        tts: 'operational',
        voice: 'operational'
      }
    };
    
    res.status(200).json(healthStatus);
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}