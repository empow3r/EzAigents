// /dashboard/api/filemap.js
const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const FILEMAP_PATH = path.resolve(__dirname, '../../shared/filemap.json');

// Load current filemap
const loadFilemap = () => {
  try {
    return JSON.parse(fs.readFileSync(FILEMAP_PATH, 'utf-8'));
  } catch (err) {
    console.error('Error loading filemap:', err);
    return {};
  }
};

// Save filemap
const saveFilemap = (filemap) => {
  try {
    fs.writeFileSync(FILEMAP_PATH, JSON.stringify(filemap, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving filemap:', err);
    return false;
  }
};

// Enqueue a single task
const enqueueTask = async (file, prompt, model) => {
  try {
    const payload = JSON.stringify({ file, prompt });
    await redis.lpush(`queue:${model}`, payload);
    return true;
  } catch (err) {
    console.error('Error enqueuing task:', err);
    return false;
  }
};

// API Routes
const handleRequest = async (req, res) => {
  const { method } = req;
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    switch (method) {
      case 'GET':
        // Get all tasks
        const filemap = loadFilemap();
        res.status(200).json({ success: true, data: filemap });
        break;

      case 'POST':
        // Add new task
        const { file, model, prompt } = req.body;
        if (!file || !model || !prompt) {
          res.status(400).json({ success: false, error: 'Missing required fields' });
          return;
        }
        
        const currentFilemap = loadFilemap();
        currentFilemap[file] = { model, prompt };
        
        if (saveFilemap(currentFilemap)) {
          res.status(201).json({ success: true, message: 'Task added successfully' });
        } else {
          res.status(500).json({ success: false, error: 'Failed to save task' });
        }
        break;

      case 'PUT':
        // Update existing task
        const { file: updateFile, model: updateModel, prompt: updatePrompt } = req.body;
        if (!updateFile || !updateModel || !updatePrompt) {
          res.status(400).json({ success: false, error: 'Missing required fields' });
          return;
        }
        
        const updateFilemap = loadFilemap();
        updateFilemap[updateFile] = { model: updateModel, prompt: updatePrompt };
        
        if (saveFilemap(updateFilemap)) {
          res.status(200).json({ success: true, message: 'Task updated successfully' });
        } else {
          res.status(500).json({ success: false, error: 'Failed to update task' });
        }
        break;

      case 'DELETE':
        // Delete task
        const { file: deleteFile } = req.body;
        if (!deleteFile) {
          res.status(400).json({ success: false, error: 'File path required' });
          return;
        }
        
        const deleteFilemap = loadFilemap();
        if (deleteFilemap[deleteFile]) {
          delete deleteFilemap[deleteFile];
          if (saveFilemap(deleteFilemap)) {
            res.status(200).json({ success: true, message: 'Task deleted successfully' });
          } else {
            res.status(500).json({ success: false, error: 'Failed to delete task' });
          }
        } else {
          res.status(404).json({ success: false, error: 'Task not found' });
        }
        break;

      default:
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = { handleRequest, enqueueTask, loadFilemap };