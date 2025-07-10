export default function handler(req, res) {
  const defaultConfig = {
    enabled: true,
    voiceModel: 'neural-voice',
    language: 'en-US',
    speed: 1.0,
    pitch: 1.0,
    voiceNotifications: false,
    voiceCommands: false
  };

  if (req.method === 'GET') {
    // Return current TTS configuration
    res.status(200).json(defaultConfig);
  } else if (req.method === 'PUT') {
    // Update TTS configuration (in production, save to database)
    const updatedConfig = { ...defaultConfig, ...req.body };
    res.status(200).json(updatedConfig);
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}