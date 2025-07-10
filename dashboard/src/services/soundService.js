// Sound Service - Pleasant and quirky UI sound effects
class SoundService {
  constructor() {
    this.audioContext = null;
    this.sounds = new Map();
    this.enabled = true;
    this.volume = 0.3;
    this.initialized = false;
    
    // Initialize on first user interaction
    this.initOnInteraction();
  }

  // Initialize audio context on first user interaction (required by browsers)
  initOnInteraction() {
    const initAudio = () => {
      if (!this.initialized) {
        this.init();
        document.removeEventListener('click', initAudio);
        document.removeEventListener('keydown', initAudio);
        document.removeEventListener('touchstart', initAudio);
      }
    };

    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);
    document.addEventListener('touchstart', initAudio);
  }

  async init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await this.generateSounds();
      this.initialized = true;
      console.log('🔊 Sound Service initialized');
    } catch (error) {
      console.warn('Sound Service failed to initialize:', error);
    }
  }

  // Generate pleasant UI sounds using Web Audio API
  async generateSounds() {
    const sounds = {
      // Navigation sounds
      tabSwitch: () => this.createTone([440, 554.37], 0.15, 'sine', 0.1),
      buttonClick: () => this.createTone([523.25], 0.1, 'sine', 0.08),
      buttonHover: () => this.createTone([659.25], 0.08, 'sine', 0.05),
      
      // Success/completion sounds
      success: () => this.createChord([523.25, 659.25, 783.99], 0.3, 'sine'),
      taskComplete: () => this.createSequence([
        { freq: 523.25, duration: 0.1 },
        { freq: 659.25, duration: 0.1 },
        { freq: 783.99, duration: 0.2 }
      ]),
      
      // Notification sounds
      notification: () => this.createTone([880, 1108.73], 0.2, 'sine', 0.12),
      alert: () => this.createTone([1046.50, 1244.51], 0.25, 'triangle', 0.15),
      
      // Interaction sounds
      scroll: () => this.createTone([220], 0.05, 'sine', 0.03),
      menuOpen: () => this.createSlide(220, 440, 0.2),
      menuClose: () => this.createSlide(440, 220, 0.15),
      
      // Agent/system sounds
      agentActivate: () => this.createChord([329.63, 415.30, 523.25], 0.25, 'sine'),
      agentComplete: () => this.createSequence([
        { freq: 659.25, duration: 0.08 },
        { freq: 783.99, duration: 0.08 },
        { freq: 1046.50, duration: 0.15 }
      ]),
      
      // Error/warning sounds
      error: () => this.createTone([207.65], 0.3, 'sawtooth', 0.1),
      warning: () => this.createTone([311.13, 369.99], 0.2, 'triangle', 0.08),
      
      // Fun/quirky sounds
      pop: () => this.createPop(),
      swoosh: () => this.createSwoosh(),
      click: () => this.createClick(),
      ding: () => this.createTone([1760], 0.15, 'sine', 0.1),
      
      // Loading/progress sounds
      loading: () => this.createSequence([
        { freq: 440, duration: 0.1 },
        { freq: 493.88, duration: 0.1 },
        { freq: 523.25, duration: 0.1 }
      ]),
      
      // Theme toggle
      themeSwitch: () => this.createSlide(523.25, 1046.50, 0.2),
      
      // Achievement sounds
      levelUp: () => this.createSequence([
        { freq: 523.25, duration: 0.1 },
        { freq: 659.25, duration: 0.1 },
        { freq: 783.99, duration: 0.1 },
        { freq: 1046.50, duration: 0.3 }
      ]),
      achievement: () => this.createChord([659.25, 830.61, 1046.50, 1318.51], 0.4, 'sine')
    };

    // Generate and store all sounds
    for (const [name, generator] of Object.entries(sounds)) {
      try {
        this.sounds.set(name, generator);
      } catch (error) {
        console.warn(`Failed to generate sound: ${name}`, error);
      }
    }
  }

  // Create a simple tone
  createTone(frequencies, duration, waveType = 'sine', volume = 0.1) {
    return () => {
      if (!this.canPlay()) return;

      const now = this.audioContext.currentTime;
      const gainNode = this.audioContext.createGain();
      gainNode.connect(this.audioContext.destination);
      
      frequencies.forEach((freq, index) => {
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = waveType;
        oscillator.frequency.setValueAtTime(freq, now);
        oscillator.connect(gainNode);
        
        // Envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * this.volume, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        oscillator.start(now + index * 0.01);
        oscillator.stop(now + duration);
      });
    };
  }

  // Create a chord (multiple tones at once)
  createChord(frequencies, duration, waveType = 'sine', volume = 0.08) {
    return () => {
      if (!this.canPlay()) return;

      const now = this.audioContext.currentTime;
      
      frequencies.forEach(freq => {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = waveType;
        oscillator.frequency.setValueAtTime(freq, now);
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * this.volume, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        oscillator.start(now);
        oscillator.stop(now + duration);
      });
    };
  }

  // Create a sequence of tones
  createSequence(notes) {
    return () => {
      if (!this.canPlay()) return;

      let time = this.audioContext.currentTime;
      
      notes.forEach(note => {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(note.freq, time);
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Envelope
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.08 * this.volume, time + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + note.duration);
        
        oscillator.start(time);
        oscillator.stop(time + note.duration);
        
        time += note.duration;
      });
    };
  }

  // Create a frequency slide
  createSlide(startFreq, endFreq, duration, waveType = 'sine') {
    return () => {
      if (!this.canPlay()) return;

      const now = this.audioContext.currentTime;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = waveType;
      oscillator.frequency.setValueAtTime(startFreq, now);
      oscillator.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1 * this.volume, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      oscillator.start(now);
      oscillator.stop(now + duration);
    };
  }

  // Create a pop sound
  createPop() {
    return () => {
      if (!this.canPlay()) return;

      const now = this.audioContext.currentTime;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, now);
      oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      gainNode.gain.setValueAtTime(0.15 * this.volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      oscillator.start(now);
      oscillator.stop(now + 0.1);
    };
  }

  // Create a swoosh sound
  createSwoosh() {
    return () => {
      if (!this.canPlay()) return;

      const now = this.audioContext.currentTime;
      const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      
      // Generate pink noise
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() - 0.5) * 2;
      }
      
      const noiseSource = this.audioContext.createBufferSource();
      const filter = this.audioContext.createBiquadFilter();
      const gainNode = this.audioContext.createGain();
      
      noiseSource.buffer = noiseBuffer;
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.2);
      
      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      gainNode.gain.setValueAtTime(0.1 * this.volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      
      noiseSource.start(now);
      noiseSource.stop(now + 0.2);
    };
  }

  // Create a click sound
  createClick() {
    return () => {
      if (!this.canPlay()) return;

      const now = this.audioContext.currentTime;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(1200, now);
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      gainNode.gain.setValueAtTime(0.05 * this.volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      oscillator.start(now);
      oscillator.stop(now + 0.05);
    };
  }

  // Check if we can play sounds
  canPlay() {
    return this.enabled && this.initialized && this.audioContext && this.audioContext.state === 'running';
  }

  // Play a sound by name
  play(soundName, delay = 0) {
    if (!this.canPlay()) return;

    const soundGenerator = this.sounds.get(soundName);
    if (soundGenerator) {
      if (delay > 0) {
        setTimeout(soundGenerator, delay);
      } else {
        soundGenerator();
      }
    } else {
      console.warn(`Sound not found: ${soundName}`);
    }
  }

  // Play multiple sounds in sequence
  playSequence(soundNames, interval = 100) {
    soundNames.forEach((soundName, index) => {
      this.play(soundName, index * interval);
    });
  }

  // Enable/disable sounds
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Set volume (0-1)
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  // Get current settings
  getSettings() {
    return {
      enabled: this.enabled,
      volume: this.volume,
      initialized: this.initialized
    };
  }
}

// Create singleton instance
const soundService = new SoundService();

// Export the service
export default soundService;