import Redis from 'ioredis';
import { spawn } from 'child_process';
import path from 'path';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

let scalerProcess = null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body;

    switch (action) {
      case 'start':
        await startAutoscaler();
        res.status(200).json({ success: true, message: 'Autoscaler started' });
        break;

      case 'stop':
        await stopAutoscaler();
        res.status(200).json({ success: true, message: 'Autoscaler stopped' });
        break;

      case 'restart':
        await stopAutoscaler();
        await startAutoscaler();
        res.status(200).json({ success: true, message: 'Autoscaler restarted' });
        break;

      default:
        res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error controlling autoscaler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to control autoscaler'
    });
  }
}

async function startAutoscaler() {
  if (scalerProcess) {
    console.log('Autoscaler is already running');
    return;
  }

  try {
    const scalerPath = path.join(process.cwd(), '../cli/auto-scaler.js');
    
    scalerProcess = spawn('node', [scalerPath, 'start'], {
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });

    scalerProcess.stdout.on('data', (data) => {
      console.log(`[AutoScaler] ${data.toString().trim()}`);
    });

    scalerProcess.stderr.on('data', (data) => {
      console.error(`[AutoScaler] ERROR: ${data.toString().trim()}`);
    });

    scalerProcess.on('exit', (code) => {
      console.log(`[AutoScaler] Exited with code ${code}`);
      scalerProcess = null;
      redis.set('autoscaler:running', 'false');
    });

    // Mark as running
    await redis.set('autoscaler:running', 'true');
    
    console.log('Autoscaler started successfully');
  } catch (error) {
    console.error('Failed to start autoscaler:', error);
    throw error;
  }
}

async function stopAutoscaler() {
  if (!scalerProcess) {
    console.log('Autoscaler is not running');
    return;
  }

  try {
    scalerProcess.kill('SIGTERM');
    
    // Force kill after timeout
    setTimeout(() => {
      if (scalerProcess && !scalerProcess.killed) {
        scalerProcess.kill('SIGKILL');
      }
    }, 10000);

    scalerProcess = null;
    await redis.set('autoscaler:running', 'false');
    
    console.log('Autoscaler stopped successfully');
  } catch (error) {
    console.error('Failed to stop autoscaler:', error);
    throw error;
  }
}

// Handle process cleanup
process.on('SIGINT', async () => {
  await stopAutoscaler();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await stopAutoscaler();
  process.exit(0);
});