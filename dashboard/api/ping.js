// Simple ping endpoint for network latency testing
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ 
      pong: true,
      timestamp: new Date().toISOString(),
      latency: Date.now() - req.query.start || 0
    });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}