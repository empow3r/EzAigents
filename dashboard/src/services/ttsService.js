// TTS Service using Web Speech API
class TTSService {
  constructor() {
    this.synth = null;
    this.voices = [];
    this.isSupported = false;
    this.currentUtterance = null;
    this.config = {
      enabled: true,
      voice: null,
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      language: 'en-US'
    };
    
    this.initialize();
  }

  initialize() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.isSupported = true;
      
      // Load voices
      this.loadVoices();
      
      // Some browsers need this event to populate voices
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  loadVoices() {
    this.voices = this.synth.getVoices();
    
    // Set default voice
    if (this.voices.length > 0 && !this.config.voice) {
      const defaultVoice = this.voices.find(voice => 
        voice.lang.startsWith(this.config.language) && voice.default
      ) || this.voices.find(voice => 
        voice.lang.startsWith(this.config.language)
      ) || this.voices[0];
      
      this.config.voice = defaultVoice;
    }
  }

  getVoices() {
    return this.voices.map(voice => ({
      name: voice.name,
      lang: voice.lang,
      default: voice.default,
      local: voice.localService
    }));
  }

  speak(text, options = {}) {
    if (!this.isSupported || !this.config.enabled) {
      console.warn('TTS is not supported or disabled');
      return Promise.resolve();
    }

    // Cancel any ongoing speech
    this.cancel();

    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Apply configuration
        utterance.voice = options.voice || this.config.voice;
        utterance.rate = options.rate || this.config.rate;
        utterance.pitch = options.pitch || this.config.pitch;
        utterance.volume = options.volume || this.config.volume;
        utterance.lang = options.language || this.config.language;
        
        // Event handlers
        utterance.onend = () => {
          this.currentUtterance = null;
          resolve();
        };
        
        utterance.onerror = (event) => {
          this.currentUtterance = null;
          reject(new Error(`Speech synthesis error: ${event.error}`));
        };
        
        this.currentUtterance = utterance;
        this.synth.speak(utterance);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  pause() {
    if (this.synth && this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
    }
  }

  resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  cancel() {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  setConfig(config) {
    this.config = { ...this.config, ...config };
    
    // Update voice if voice name is provided
    if (config.voiceName) {
      const voice = this.voices.find(v => v.name === config.voiceName);
      if (voice) {
        this.config.voice = voice;
      }
    }
  }

  getConfig() {
    return {
      ...this.config,
      voiceName: this.config.voice?.name || null
    };
  }

  isSpeaking() {
    return this.synth ? this.synth.speaking : false;
  }

  isPaused() {
    return this.synth ? this.synth.paused : false;
  }

  // Convenience methods for common notifications
  announceSuccess(message = 'Operation completed successfully') {
    return this.speak(message, { rate: 1.1, pitch: 1.1 });
  }

  announceError(message = 'An error occurred') {
    return this.speak(message, { rate: 0.9, pitch: 0.9 });
  }

  announceNotification(message) {
    return this.speak(message, { rate: 1.0, pitch: 1.0 });
  }

  // Agent-specific announcements
  announceAgentStatus(agentName, status) {
    const messages = {
      'connected': `${agentName} agent is now connected`,
      'disconnected': `${agentName} agent has disconnected`,
      'busy': `${agentName} agent is processing a task`,
      'idle': `${agentName} agent is idle`,
      'error': `${agentName} agent encountered an error`
    };
    
    const message = messages[status] || `${agentName} agent status: ${status}`;
    return this.speak(message);
  }

  announceQueueUpdate(queueName, count) {
    const message = count === 0 
      ? `${queueName} queue is now empty`
      : `${queueName} queue has ${count} ${count === 1 ? 'task' : 'tasks'}`;
    return this.speak(message);
  }
}

// Create singleton instance
const ttsService = new TTSService();

export default ttsService;