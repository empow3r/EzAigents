class OptimizedSoundService {
  constructor() {
    this.sounds = new Map();
    this.audioContext = null;
    this.isInitialized = false;
    this.isEnabled = true;
    this.volume = 0.3;
    this.preloadedSounds = new Set();
    
    // Check user preferences
    this.checkAudioPreferences();
  }

  checkAudioPreferences() {
    // Check if user prefers reduced motion (often correlates with audio preferences)
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        this.isEnabled = false;
        return;
      }

      // Check if user has specifically disabled audio
      const audioDisabled = localStorage.getItem('ez-aigent-audio-disabled') === 'true';
      if (audioDisabled) {
        this.isEnabled = false;
        return;
      }

      // Check device memory - disable on low memory devices
      if (navigator.deviceMemory && navigator.deviceMemory < 2) {
        this.isEnabled = false;
        return;
      }
    }
  }

  async initializeAudioContext() {
    if (this.isInitialized || !this.isEnabled) return;

    try {
      // Only initialize AudioContext when actually needed
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create a master gain node for volume control
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
      
      this.isInitialized = true;
      console.log('Audio context initialized on-demand');
    } catch (error) {
      console.warn('Could not initialize audio context:', error);
      this.isEnabled = false;
    }
  }

  async loadSound(name, url) {
    if (!this.isEnabled) return null;

    try {
      await this.initializeAudioContext();
      
      if (this.sounds.has(name)) {
        return this.sounds.get(name);
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.sounds.set(name, audioBuffer);
      this.preloadedSounds.add(name);
      
      return audioBuffer;
    } catch (error) {
      console.warn(`Failed to load sound ${name}:`, error);
      return null;
    }
  }

  async preloadEssentialSounds() {
    if (!this.isEnabled) return;

    // Only preload the most essential sounds to minimize memory usage
    const essentialSounds = {
      'click': '/sounds/click.mp3',
      'success': '/sounds/success.mp3',
      'error': '/sounds/error.mp3'
    };

    const loadPromises = Object.entries(essentialSounds).map(([name, url]) => {
      return this.loadSound(name, url).catch(error => {
        console.warn(`Failed to preload essential sound ${name}:`, error);
      });
    });

    await Promise.allSettled(loadPromises);
  }

  async play(soundName, options = {}) {
    if (!this.isEnabled) return;

    try {
      await this.initializeAudioContext();

      // Resume audio context if suspended (required by browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      let audioBuffer = this.sounds.get(soundName);
      
      // Load sound on-demand if not preloaded
      if (!audioBuffer) {
        const soundUrl = this.getSoundUrl(soundName);
        if (soundUrl) {
          audioBuffer = await this.loadSound(soundName, soundUrl);
        }
      }

      if (!audioBuffer) {
        console.warn(`Sound ${soundName} not found`);
        return;
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = audioBuffer;
      source.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      // Apply options
      const volume = options.volume !== undefined ? options.volume : 1;
      const playbackRate = options.playbackRate || 1;
      
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      source.playbackRate.setValueAtTime(playbackRate, this.audioContext.currentTime);
      
      source.start(0);
      
      // Clean up the source after it finishes
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };

    } catch (error) {
      console.warn(`Failed to play sound ${soundName}:`, error);
    }
  }

  getSoundUrl(soundName) {
    // Map sound names to URLs - only include essential sounds
    const soundUrls = {
      'click': '/sounds/click.mp3',
      'hover': '/sounds/hover.mp3',
      'success': '/sounds/success.mp3',
      'error': '/sounds/error.mp3',
      'notification': '/sounds/notification.mp3',
      'swoosh': '/sounds/swoosh.mp3'
    };

    return soundUrls[soundName];
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    }
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ez-aigent-audio-disabled', (!enabled).toString());
    }
  }

  // Cleanup method for memory management
  cleanup() {
    this.sounds.clear();
    this.preloadedSounds.clear();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.isInitialized = false;
  }

  // Get memory usage info
  getMemoryUsage() {
    const soundCount = this.sounds.size;
    const preloadedCount = this.preloadedSounds.size;
    
    return {
      soundCount,
      preloadedCount,
      isEnabled: this.isEnabled,
      isInitialized: this.isInitialized
    };
  }
}

// Create singleton instance
const optimizedSoundService = new OptimizedSoundService();

// Preload essential sounds when the user first interacts with the page
if (typeof window !== 'undefined') {
  let hasInteracted = false;
  
  const initializeOnInteraction = () => {
    if (!hasInteracted) {
      hasInteracted = true;
      optimizedSoundService.preloadEssentialSounds();
      
      // Remove event listeners after first interaction
      document.removeEventListener('click', initializeOnInteraction);
      document.removeEventListener('keydown', initializeOnInteraction);
      document.removeEventListener('touchstart', initializeOnInteraction);
    }
  };
  
  document.addEventListener('click', initializeOnInteraction, { passive: true });
  document.addEventListener('keydown', initializeOnInteraction, { passive: true });
  document.addEventListener('touchstart', initializeOnInteraction, { passive: true });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    optimizedSoundService.cleanup();
  });
}

export default optimizedSoundService;