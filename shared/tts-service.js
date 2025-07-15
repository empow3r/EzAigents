const axios = require('axios');

class TTSService {
  constructor() {
    this.ttsServerUrl = process.env.TTS_SERVER_URL || 'http://ai_llm:11435';
    this.enabled = process.env.TTS_ENABLED === 'true';
    this.voiceModel = process.env.TTS_VOICE_MODEL || 'neural-voice';
    this.language = process.env.TTS_LANGUAGE || 'en-US';
    this.voiceNotifications = process.env.ENABLE_VOICE_NOTIFICATIONS === 'true';
    this.voiceCommands = process.env.ENABLE_VOICE_COMMANDS === 'true';
  }

  async synthesizeSpeech(text, options = {}) {
    if (!this.enabled) {
      console.log('TTS is disabled');
      return null;
    }

    try {
      const response = await axios.post(`${this.ttsServerUrl}/api/tts`, {
        text,
        voice: options.voice || this.voiceModel,
        language: options.language || this.language,
        speed: options.speed || 1.0,
        pitch: options.pitch || 1.0
      }, {
        timeout: 10000,
        responseType: 'stream',
        validateStatus: (status) => status < 500
      });

      return response.data;
    } catch (error) {
      console.error('TTS synthesis failed:', error.message);
      return null;
    }
  }

  async announceAgentStatus(agentId, status, message) {
    if (!this.voiceNotifications) return;

    const statusMessages = {
      'started': `Agent ${agentId} has started processing`,
      'completed': `Agent ${agentId} has completed task: ${message}`,
      'failed': `Agent ${agentId} encountered an error: ${message}`,
      'idle': `Agent ${agentId} is now idle`,
      'busy': `Agent ${agentId} is busy processing`
    };

    const announcement = statusMessages[status] || `Agent ${agentId}: ${message}`;
    return await this.synthesizeSpeech(announcement);
  }

  async announceSystemStatus(type, data) {
    if (!this.voiceNotifications) return;

    let announcement;
    switch (type) {
      case 'queue_depth':
        announcement = `System alert: Queue depth is ${data.depth} tasks`;
        break;
      case 'error_rate':
        announcement = `System alert: Error rate is ${(data.rate * 100).toFixed(1)} percent`;
        break;
      case 'scale_up':
        announcement = `System scaling up: Adding ${data.count} agents`;
        break;
      case 'scale_down':
        announcement = `System scaling down: Removing ${data.count} agents`;
        break;
      case 'deployment_complete':
        announcement = `Deployment complete: ${data.service} is now running`;
        break;
      default:
        announcement = `System notification: ${data.message}`;
    }

    return await this.synthesizeSpeech(announcement);
  }

  async processVoiceCommand(command) {
    if (!this.voiceCommands) return null;

    const commands = {
      'status': 'Getting system status',
      'scale up': 'Scaling up agents',
      'scale down': 'Scaling down agents',
      'stop all': 'Stopping all agents',
      'restart': 'Restarting system',
      'queue stats': 'Getting queue statistics',
      'agent count': 'Getting agent count'
    };

    const response = commands[command.toLowerCase()];
    if (response) {
      await this.synthesizeSpeech(`Command received: ${response}`);
      return command.toLowerCase().replace(/\s+/g, '_');
    }

    return null;
  }

  async readNotification(notification) {
    if (!this.voiceNotifications) return;

    const { type, title, message, priority } = notification;
    
    const priorityPrefix = priority === 'high' ? 'High priority alert: ' : 
                          priority === 'medium' ? 'Notification: ' : '';
    
    const announcement = `${priorityPrefix}${title}. ${message}`;
    return await this.synthesizeSpeech(announcement);
  }

  async healthCheck() {
    if (!this.enabled) return { status: 'disabled' };

    try {
      const response = await axios.get(`${this.ttsServerUrl}/api/health`, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      return { status: 'healthy', ...response.data };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  getConfig() {
    return {
      enabled: this.enabled,
      serverUrl: this.ttsServerUrl,
      voiceModel: this.voiceModel,
      language: this.language,
      voiceNotifications: this.voiceNotifications,
      voiceCommands: this.voiceCommands
    };
  }
}

module.exports = TTSService;