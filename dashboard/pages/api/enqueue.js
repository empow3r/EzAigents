const { enqueueTask } = require('../../api/filemap');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const { file, model, prompt } = req.body;
    
    if (!file || !model || !prompt) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }
    
    const success = await enqueueTask(file, prompt, model);
    
    if (success) {
      res.status(200).json({ success: true, message: 'Task enqueued successfully' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to enqueue task' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}