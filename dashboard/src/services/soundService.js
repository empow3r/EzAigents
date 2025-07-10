// Sound Service - Pleasant and quirky UI sound effects
class SoundService {
  constructor() {
    this.audioContext = null;
    this.sounds = new Map();
    this.enabled = true;
    this.volume = 0.3;
    this.initialized = false;
    
    // Track active oscillators and intervals for cleanup
    this.activeOscillators = new Set();
    this.activeIntervals = new Set();
    this.isDestroyed = false;
    
    // ADDICTION MECHANICS
    this.interactionCount = 0;
    this.lastInteractionTime = 0;
    this.streakCount = 0;
    this.comboMultiplier = 1;
    this.sessionScore = 0;
    this.randomRewardChance = 0.1; // 10% chance for random rewards
    
    // ADVANCED ENHANCEMENT FEATURES
    this.userPreferences = {
      favoriteFrequencies: [440, 523.25, 659.25], // Start with C major
      preferredTimbres: ['sine', 'triangle'],
      attentionSpan: 30000, // 30 seconds default
      energyLevel: 0.5, // 0-1 scale
      sessionDuration: 0
    };
    
    this.behaviorAnalytics = {
      clickPatterns: [],
      dwellTimes: [],
      preferredSections: new Map(),
      peakProductivityTimes: [],
      soundEffectiveness: new Map()
    };
    
    this.ambientLayers = new Map();
    this.harmonicResonance = [];
    this.binauraBeats = null;
    this.socialNotifications = [];
    this.adaptivePersonalization = true;
    
    // Neural pathway optimization
    this.neuralStimulation = {
      dopamineLevel: 0.5,
      serotoninBoost: false,
      focusEnhancement: false,
      creativityMode: false
    };
    
    // DYNAMIC SOUND ENVIRONMENTS SYSTEM
    this.currentEnvironment = 'balanced';
    this.environmentTransitioning = false;
    this.ambientLayers = new Map();
    this.environmentHistory = [];
    this.autoEnvironmentSwitching = true;
    
    // Initialize on first user interaction
    this.initOnInteraction();
  }

  // Initialize audio context on first user interaction (required by browsers)
  initOnInteraction() {
    // Only run in browser environment - prevent SSR errors
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
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
      // Only initialize in browser environment
      if (typeof window === 'undefined') return;
      
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await this.generateSounds();
      this.initialized = true;
      console.log('🔊 Sound Service initialized - Quirky mode enabled!');
    } catch (error) {
      console.warn('Sound Service failed to initialize:', error);
    }
  }

  // Generate quirky UI sounds using Web Audio API
  async generateSounds() {
    const sounds = {
      // Simple navigation sounds (short & sweet)
      tabSwitch: () => this.createQuirkyTone([440, 554.37], 0.12, 'triangle', 0.08),
      buttonClick: () => this.createQuirkyTone([800], 0.08, 'square', 0.06),
      buttonHover: () => this.createQuirkyTone([1200], 0.05, 'sine', 0.04),

      // Fun quirky event sounds (short & playful)
      sparkle: () => this.createQuirkySparkle(),
      coinDrop: () => this.createQuirkyCoin(),
      miniSuccess: () => this.createQuirkySuccess(),
      perfectClick: () => this.createQuirkyPop(),
      satisfyingPop: () => this.createQuirkyBoop(),
      quickWin: () => this.createQuirkyWin(),
      notification: () => this.createQuirkyNotification(),
      error: () => this.createQuirkyError(),
      warning: () => this.createQuirkyWarning(),
      
      // Simple success sounds
      success: () => this.createQuirkySuccess(),
      taskComplete: () => this.createQuirkyWin(),
      
      // Simple notification sounds  
      notification: () => this.createQuirkyNotification(),
      alert: () => this.createQuirkyWarning(),
      
      // Simple interaction sounds
      scroll: () => this.createQuirkyTone([800], 0.03, 'sine', 0.02),
      menuOpen: () => this.createQuirkyTone([440, 660], 0.15, 'triangle', 0.05),
      menuClose: () => this.createQuirkyTone([660, 440], 0.12, 'triangle', 0.05),
      
      // Simple agent sounds
      agentActivate: () => this.createQuirkySuccess(),
      agentComplete: () => this.createQuirkyWin(),
      
      // Simple error/warning sounds
      error: () => this.createQuirkyError(),
      warning: () => this.createQuirkyWarning(),
      
      // Fun/quirky sounds
      pop: () => this.createQuirkyPop(),
      swoosh: () => this.createQuirkyBoop(),
      click: () => this.createQuirkyTone([1200], 0.05, 'square', 0.06),
      ding: () => this.createQuirkyNotification(),
      
      // Simple loading sound
      loading: () => this.createQuirkyTone([440, 494, 523], 0.2, 'sine', 0.04),
      
      // Simple theme toggle
      themeSwitch: () => this.createQuirkyTone([523, 1047], 0.15, 'triangle', 0.06),
      
      // Simple achievement sounds
      levelUp: () => this.createQuirkyWin(),
      achievement: () => this.createQuirkySparkle(),

      // ENHANCED NEURAL OPTIMIZATION SOUNDS
      neuralSync: () => this.createNeuralSync(),
      focusBoost: () => this.createFocusBoost(), 
      creativityFlow: () => this.createCreativityFlow(),
      energyWave: () => this.createEnergyWave(),
      deepFocus: () => this.createDeepFocus(),
      socialBoost: () => this.createSocialBoost(),
      productivityPulse: () => this.createProductivityPulse(),
      euphoria: () => this.createEuphoria(),
      transcendence: () => this.createTranscendence(),
      hyperfocus: () => this.createHyperfocus(),
      
      // ADAPTIVE PERSONALIZED SOUNDS
      personalizedReward: () => this.createPersonalizedReward(),
      adaptiveSuccess: () => this.createAdaptiveSuccess(),
      behaviorOptimized: () => this.createBehaviorOptimized(),
      
      // Social sounds (simplified)
      peerSuccess: () => this.createQuirkySuccess(),
      communityWin: () => this.createQuirkySparkle(),
      leaderboardClimb: () => this.createQuirkyWin()
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
        
        // Track and cleanup oscillator properly
        this.activeOscillators.add(oscillator);
        oscillator.addEventListener('ended', () => {
          oscillator.disconnect();
          this.activeOscillators.delete(oscillator);
        });
        
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
        
        // Track and cleanup oscillator properly
        this.activeOscillators.add(oscillator);
        oscillator.addEventListener('ended', () => {
          oscillator.disconnect();
          this.activeOscillators.delete(oscillator);
        });
        
        oscillator.start(now);
        oscillator.stop(now + duration);
      });
    };
  }

  // Create quirky, short sound effects
  createQuirkyTone(frequencies, duration, waveType = 'sine', volume = 0.08) {
    return () => {
      if (!this.canPlay()) return;

      const now = this.audioContext.currentTime;
      
      frequencies.forEach((freq, index) => {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = waveType;
        oscillator.frequency.setValueAtTime(freq, now);
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Quick envelope for short, punchy sound
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * this.volume, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        // Track and cleanup oscillator properly
        this.activeOscillators.add(oscillator);
        oscillator.addEventListener('ended', () => {
          oscillator.disconnect();
          this.activeOscillators.delete(oscillator);
        });
        
        oscillator.start(now + index * 0.02);
        oscillator.stop(now + duration);
      });
    };
  }

  // Quirky sparkle sound (high pitched arpeggio)
  createQuirkySparkle() {
    return () => {
      if (!this.canPlay()) return;
      const frequencies = [1760, 2093, 2637]; // High C, C#, E
      this.createQuirkyTone(frequencies, 0.15, 'sine', 0.06)();
    };
  }

  // Quirky coin sound (descending)
  createQuirkyCoin() {
    return () => {
      if (!this.canPlay()) return;
      const frequencies = [1318, 1047, 880]; // E, C, A (descending)
      this.createQuirkyTone(frequencies, 0.2, 'square', 0.08)();
    };
  }

  // Quirky success sound (upbeat chord)
  createQuirkySuccess() {
    return () => {
      if (!this.canPlay()) return;
      const frequencies = [523, 659, 784]; // C major chord
      this.createQuirkyTone(frequencies, 0.25, 'triangle', 0.07)();
    };
  }

  // Quirky pop sound
  createQuirkyPop() {
    return () => {
      if (!this.canPlay()) return;
      this.createQuirkyTone([1200], 0.08, 'square', 0.1)();
    };
  }

  // Quirky boop sound
  createQuirkyBoop() {
    return () => {
      if (!this.canPlay()) return;
      this.createQuirkyTone([800], 0.12, 'sine', 0.08)();
    };
  }

  // Quirky win sound (quick ascending)
  createQuirkyWin() {
    return () => {
      if (!this.canPlay()) return;
      const frequencies = [440, 554, 659, 880]; // Ascending notes
      this.createQuirkyTone(frequencies, 0.3, 'sine', 0.06)();
    };
  }

  // Quirky notification (gentle ding)
  createQuirkyNotification() {
    return () => {
      if (!this.canPlay()) return;
      this.createQuirkyTone([1047, 1319], 0.18, 'sine', 0.07)(); // C, E
    };
  }

  // Quirky error sound (low, descending)
  createQuirkyError() {
    return () => {
      if (!this.canPlay()) return;
      this.createQuirkyTone([220, 180], 0.4, 'sawtooth', 0.08)();
    };
  }

  // Quirky warning sound (wobble)
  createQuirkyWarning() {
    return () => {
      if (!this.canPlay()) return;
      this.createQuirkyTone([440, 494, 440], 0.25, 'triangle', 0.07)();
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

  // ADDICTIVE REWARD SOUND METHODS
  createSparkle() {
    return () => this.createSequence([
      { freq: 1760, duration: 0.05 },
      { freq: 2217.46, duration: 0.05 },
      { freq: 2794.65, duration: 0.1 }
    ])();
  }

  createCoinDrop() {
    return () => this.createTone([659.25, 830.61], 0.2, 'sine', 0.1)();
  }

  createMiniSuccess() {
    return () => this.createTone([523.25, 659.25], 0.15, 'sine', 0.08)();
  }

  createPerfectClick() {
    return () => this.createTone([1046.50], 0.1, 'sine', 0.06)();
  }

  createSatisfyingPop() {
    return () => this.createPop()();
  }

  createDopamineHit() {
    return () => this.createChord([659.25, 830.61, 1046.50], 0.25, 'sine', 0.1)();
  }

  createQuickWin() {
    return () => this.createSequence([
      { freq: 523.25, duration: 0.08 },
      { freq: 659.25, duration: 0.12 }
    ])();
  }

  createStreakBonus() {
    return () => this.createSequence([
      { freq: 880, duration: 0.1 },
      { freq: 1108.73, duration: 0.1 },
      { freq: 1396.91, duration: 0.15 }
    ])();
  }

  createComboBonus() {
    return () => this.createChord([440, 554.37, 659.25, 830.61], 0.3, 'sine', 0.12)();
  }

  createExploration() {
    return () => this.createSlide(220, 440, 0.2)();
  }

  createMicroReward() {
    return () => this.createTone([783.99], 0.1, 'sine', 0.05)();
  }

  createEngagement() {
    return () => this.createTone([493.88, 622.25], 0.15, 'sine', 0.07)();
  }

  // Check if we can play sounds
  canPlay() {
    return typeof window !== 'undefined' && this.enabled && this.initialized && this.audioContext && this.audioContext.state === 'running';
  }

  // Play a sound by name with addiction mechanics
  play(soundName, delay = 0) {
    if (!this.canPlay()) return;

    const now = Date.now();
    const timeSinceLastInteraction = now - this.lastInteractionTime;
    
    // Update interaction tracking
    this.interactionCount++;
    this.lastInteractionTime = now;
    
    // Calculate combo multiplier based on rapid interactions
    if (timeSinceLastInteraction < 1000) { // Within 1 second
      this.comboMultiplier = Math.min(this.comboMultiplier + 0.1, 3);
      this.streakCount++;
    } else {
      this.comboMultiplier = 1;
      this.streakCount = 0;
    }
    
    // Add session scoring
    this.sessionScore += Math.floor(10 * this.comboMultiplier);
    
    const soundGenerator = this.sounds.get(soundName);
    if (soundGenerator) {
      if (delay > 0) {
        setTimeout(() => {
          soundGenerator();
          this.triggerRewardMechanics(soundName);
        }, delay);
      } else {
        soundGenerator();
        this.triggerRewardMechanics(soundName);
      }
    } else {
      console.warn(`Sound not found: ${soundName}`);
    }
  }

  // Trigger addiction mechanics
  triggerRewardMechanics(soundName) {
    // Skip reward mechanics for reward sounds to prevent recursion
    const rewardSounds = ['comboBonus', 'streakBonus', 'sparkle', 'coinDrop', 'miniSuccess', 'microReward', 'dopamineHit', 'perfectClick'];
    if (rewardSounds.includes(soundName)) return;
    
    // Combo bonus every 5 rapid interactions
    if (this.streakCount > 0 && this.streakCount % 5 === 0) {
      setTimeout(() => this.playDirect('comboBonus'), 100);
    }
    
    // Streak bonus every 10 interactions
    if (this.interactionCount % 10 === 0) {
      setTimeout(() => this.playDirect('streakBonus'), 150);
    }
    
    // Random reward system
    if (Math.random() < this.randomRewardChance) {
      const rewards = ['sparkle', 'coinDrop', 'miniSuccess', 'microReward'];
      const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
      setTimeout(() => this.playDirect(randomReward), 200);
    }
    
    // Milestone rewards
    if (this.sessionScore % 100 === 0 && this.sessionScore > 0) {
      setTimeout(() => this.playDirect('dopamineHit'), 250);
    }
    
    // Perfect timing rewards (rapid sequential clicks)
    if (this.comboMultiplier > 2) {
      setTimeout(() => this.playDirect('perfectClick'), 50);
    }
  }

  // Play sound directly without triggering reward mechanics
  playDirect(soundName, delay = 0) {
    if (!this.canPlay()) return;

    const soundGenerator = this.sounds.get(soundName);
    if (soundGenerator) {
      if (delay > 0) {
        setTimeout(soundGenerator, delay);
      } else {
        soundGenerator();
      }
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
    console.log(`🔊 Quirky sounds volume: ${Math.round(this.volume * 100)}%`);
  }

  // Get current settings
  getSettings() {
    return {
      enabled: this.enabled,
      volume: this.volume,
      initialized: this.initialized,
      neuralState: this.neuralStimulation,
      userPreferences: this.userPreferences,
      sessionScore: this.sessionScore
    };
  }

  // ENHANCED NEURAL OPTIMIZATION METHODS

  // Neural Sync - Harmonizes brainwaves with binaural beats
  createNeuralSync() {
    return () => {
      if (!this.canPlay()) return;
      
      const now = this.audioContext.currentTime;
      const baseFreq = 40; // 40Hz gamma base
      
      // Create binaural beat for neural entrainment
      const leftOsc = this.audioContext.createOscillator();
      const rightOsc = this.audioContext.createOscillator();
      const leftGain = this.audioContext.createGain();
      const rightGain = this.audioContext.createGain();
      const merger = this.audioContext.createChannelMerger(2);
      
      leftOsc.frequency.setValueAtTime(baseFreq, now);
      rightOsc.frequency.setValueAtTime(baseFreq + 10, now); // 10Hz binaural beat
      
      leftOsc.connect(leftGain);
      rightOsc.connect(rightGain);
      leftGain.connect(merger, 0, 0);
      rightGain.connect(merger, 0, 1);
      merger.connect(this.audioContext.destination);
      
      leftGain.gain.setValueAtTime(0.03 * this.volume, now);
      rightGain.gain.setValueAtTime(0.03 * this.volume, now);
      
      leftOsc.start(now);
      rightOsc.start(now);
      leftOsc.stop(now + 2.0);
      rightOsc.stop(now + 2.0);
      
      this.neuralStimulation.focusEnhancement = true;
    };
  }

  // Focus Boost - Alpha wave stimulation  
  createFocusBoost() {
    return () => {
      if (!this.canPlay()) return;
      
      const now = this.audioContext.currentTime;
      const alphaFreq = 10; // 10Hz alpha waves
      
      // Create amplitude modulated tone for focus
      const carrier = this.audioContext.createOscillator();
      const modulator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      const modGain = this.audioContext.createGain();
      
      carrier.frequency.setValueAtTime(432, now); // 432Hz healing frequency
      modulator.frequency.setValueAtTime(alphaFreq, now);
      
      modulator.connect(modGain);
      modGain.connect(gainNode.gain);
      carrier.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      modGain.gain.setValueAtTime(0.05 * this.volume, now);
      gainNode.gain.setValueAtTime(0.05 * this.volume, now);
      
      carrier.start(now);
      modulator.start(now);
      carrier.stop(now + 1.5);
      modulator.stop(now + 1.5);
    };
  }

  // Euphoria - Multi-frequency cascade for maximum dopamine
  createEuphoria() {
    return () => {
      if (!this.canPlay()) return;
      
      const now = this.audioContext.currentTime;
      
      // Solfeggio frequencies for healing and euphoria
      const euphoriaSequence = [
        { freq: 396, duration: 0.15 }, // Liberation from fear
        { freq: 528, duration: 0.2 },  // Love frequency
        { freq: 741, duration: 0.15 }, // Awakening intuition
        { freq: 963, duration: 0.25 }  // Divine connection
      ];
      
      let time = now;
      euphoriaSequence.forEach((note, index) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.frequency.setValueAtTime(note.freq, time);
        osc.type = 'sine';
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(note.freq * 1.5, time);
        filter.Q.setValueAtTime(5, time);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioContext.destination);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08 * this.volume, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + note.duration);
        
        osc.start(time);
        osc.stop(time + note.duration);
        
        time += note.duration * 0.7; // Overlapping notes
      });
      
      this.neuralStimulation.dopamineLevel = Math.min(1.0, this.neuralStimulation.dopamineLevel + 0.3);
    };
  }

  // Personalized Reward - Adapts to user's neural response patterns
  createPersonalizedReward() {
    return () => {
      if (!this.canPlay()) return;
      
      const now = this.audioContext.currentTime;
      const userFreqs = this.userPreferences.favoriteFrequencies;
      const personalizedVolume = this.volume * (0.8 + this.userPreferences.energyLevel * 0.4);
      
      // Build adaptive harmony based on user's dopamine level
      userFreqs.forEach((freq, index) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sine';
        // Slightly detune based on neural state for more complex harmonics
        osc.frequency.setValueAtTime(freq * (1 + this.neuralStimulation.dopamineLevel * 0.05), now);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 3, now);
        filter.Q.setValueAtTime(2, now);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioContext.destination);
        
        gain.gain.setValueAtTime(0, now + index * 0.03);
        gain.gain.linearRampToValueAtTime(personalizedVolume / (index + 1), now + index * 0.03 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.03 + 0.5);
        
        osc.start(now + index * 0.03);
        osc.stop(now + index * 0.03 + 0.5);
      });
      
      // Learn from this interaction
      this.updateUserPreferences('personalizedReward');
    };
  }

  // Social Boost - Triggers oxytocin and connection feelings
  createSocialBoost() {
    return () => {
      if (!this.canPlay()) return;
      
      const now = this.audioContext.currentTime;
      
      // Warm, community-building frequencies in perfect harmony
      const socialChord = [174, 285, 396]; // Healing frequencies for connection
      
      socialChord.forEach((freq, index) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const reverb = this.audioContext.createConvolver();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        
        // Simple reverb simulation
        const reverbGain = this.audioContext.createGain();
        const delay = this.audioContext.createDelay();
        delay.delayTime.setValueAtTime(0.1, now);
        
        osc.connect(gain);
        gain.connect(delay);
        delay.connect(reverbGain);
        reverbGain.connect(this.audioContext.destination);
        gain.connect(this.audioContext.destination);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06 * this.volume, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        
        reverbGain.gain.setValueAtTime(0.02 * this.volume, now);
        
        osc.start(now + index * 0.1);
        osc.stop(now + 1.0);
      });
      
      this.neuralStimulation.serotoninBoost = true;
    };
  }

  // ADAPTIVE AI-DRIVEN SOUND PERSONALIZATION SYSTEM
  
  // Advanced machine learning simulation for user preference learning
  updateUserPreferences(soundType) {
    const currentTime = Date.now();
    
    // Advanced behavioral pattern analysis
    const recentInteractions = this.behaviorAnalytics.clickPatterns.filter(
      time => currentTime - time < 60000 // Last minute
    ).length;
    
    // Time-of-day adaptation
    const hour = new Date().getHours();
    const timeOfDay = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    
    // Energy level adaptation with circadian rhythm consideration
    let energyModifier = 1.0;
    switch(timeOfDay) {
      case 'morning': energyModifier = 1.2; break;
      case 'afternoon': energyModifier = 1.0; break;
      case 'evening': energyModifier = 0.8; break;
      case 'night': energyModifier = 0.5; break;
    }
    
    if (recentInteractions > 15) {
      this.userPreferences.energyLevel = Math.min(1.0, this.userPreferences.energyLevel + (0.08 * energyModifier));
      this.learnFromHighEngagement(soundType);
    } else if (recentInteractions < 3) {
      this.userPreferences.energyLevel = Math.max(0.1, this.userPreferences.energyLevel - 0.03);
      this.adaptForLowEngagement();
    }
    
    // Advanced frequency preference learning
    this.adaptFrequencyPreferences(soundType, recentInteractions);
    
    // Behavioral pattern recognition
    this.recognizeBehaviorPatterns(currentTime, soundType);
    
    // Track interaction for analytics
    this.behaviorAnalytics.clickPatterns.push(currentTime);
    if (this.behaviorAnalytics.clickPatterns.length > 500) { // Increased memory
      this.behaviorAnalytics.clickPatterns.shift();
    }
    
    // Update session duration and productivity metrics
    this.userPreferences.sessionDuration = currentTime - (this.behaviorAnalytics.clickPatterns[0] || currentTime);
    this.calculateProductivityScore();
  }
  
  // Learn from high engagement periods
  learnFromHighEngagement(soundType) {
    const effectiveness = this.behaviorAnalytics.soundEffectiveness.get(soundType) || { positive: 0, negative: 0 };
    effectiveness.positive += 1;
    this.behaviorAnalytics.soundEffectiveness.set(soundType, effectiveness);
    
    // Boost related frequency preferences
    if (soundType.includes('euphoria') || soundType.includes('reward')) {
      this.userPreferences.favoriteFrequencies = this.userPreferences.favoriteFrequencies.map(f => f * 1.01); // Slight upward drift
    }
  }
  
  // Adapt for low engagement periods
  adaptForLowEngagement() {
    // Increase reward frequency for struggling users
    this.randomRewardChance = Math.min(0.25, this.randomRewardChance + 0.02);
    
    // Shift to more comforting, less stimulating frequencies
    this.userPreferences.favoriteFrequencies = this.userPreferences.favoriteFrequencies.map(f => f * 0.99);
  }
  
  // Advanced frequency preference adaptation
  adaptFrequencyPreferences(soundType, engagementLevel) {
    const freqMap = {
      'sparkle': [1760, 2217, 2794],
      'euphoria': [396, 528, 741, 963],
      'focus': [40, 432, 10],
      'social': [174, 285, 396],
      'creativity': [256, 432, 963]
    };
    
    // Find which frequency category this sound belongs to
    for (const [category, frequencies] of Object.entries(freqMap)) {
      if (soundType.includes(category) || soundType.includes(category.slice(0, 5))) {
        // Weight these frequencies based on engagement
        const weight = engagementLevel > 10 ? 1.05 : engagementLevel < 5 ? 0.95 : 1.0;
        
        frequencies.forEach(freq => {
          const index = this.userPreferences.favoriteFrequencies.indexOf(freq);
          if (index !== -1) {
            this.userPreferences.favoriteFrequencies[index] *= weight;
          } else if (weight > 1.0 && this.userPreferences.favoriteFrequencies.length < 10) {
            this.userPreferences.favoriteFrequencies.push(freq);
          }
        });
        break;
      }
    }
    
    // Maintain frequency bounds (20Hz - 4000Hz for safety)
    this.userPreferences.favoriteFrequencies = this.userPreferences.favoriteFrequencies
      .map(f => Math.max(20, Math.min(4000, f)))
      .slice(0, 8); // Keep top 8 frequencies
  }
  
  // Pattern recognition for behavioral insights
  recognizeBehaviorPatterns(currentTime, soundType) {
    const patterns = this.behaviorAnalytics.clickPatterns;
    
    if (patterns.length > 10) {
      // Calculate interaction velocity (interactions per minute)
      const recentMinute = patterns.filter(time => currentTime - time < 60000).length;
      const previousMinute = patterns.filter(time => 
        currentTime - time >= 60000 && currentTime - time < 120000
      ).length;
      
      const velocity = recentMinute - previousMinute;
      
      // Detect acceleration patterns
      if (velocity > 5) {
        this.triggerAccelerationBonus();
      } else if (velocity < -3) {
        this.triggerDecelrationSupport();
      }
      
      // Detect work patterns
      this.detectWorkSession(patterns, currentTime);
      
      // Learn from session context
      this.adaptToSessionContext(soundType, velocity);
    }
  }
  
  // Calculate productivity score based on interaction patterns
  calculateProductivityScore() {
    const interactions = this.behaviorAnalytics.clickPatterns;
    const now = Date.now();
    
    if (interactions.length < 5) return;
    
    // Score based on consistency, not just frequency
    const intervals = [];
    for (let i = 1; i < interactions.length; i++) {
      intervals.push(interactions[i] - interactions[i-1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((acc, interval) => acc + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const consistency = 1 / (1 + Math.sqrt(variance) / 1000); // Higher consistency = higher score
    
    this.userPreferences.productivityScore = Math.min(1.0, consistency * this.userPreferences.energyLevel);
  }
  
  // Trigger bonus for acceleration patterns
  triggerAccelerationBonus() {
    setTimeout(() => this.playDirect('productivityPulse'), 100);
    setTimeout(() => this.playDirect('energyWave'), 300);
    this.neuralStimulation.focusEnhancement = true;
  }
  
  // Support for deceleration periods
  triggerDecelrationSupport() {
    setTimeout(() => this.playDirect('focusBoost'), 150);
    setTimeout(() => this.playDirect('creativityFlow'), 400);
  }
  
  // Detect focused work sessions
  detectWorkSession(patterns, currentTime) {
    const workSessionLength = 15 * 60 * 1000; // 15 minutes
    const workPatterns = patterns.filter(time => currentTime - time < workSessionLength);
    
    if (workPatterns.length > 50) { // High activity over 15 minutes
      this.isInWorkSession = true;
      this.adaptForWorkSession();
    } else {
      this.isInWorkSession = false;
    }
  }
  
  // Adapt for work session context
  adaptForWorkSession() {
    // Reduce random rewards during focused work
    this.randomRewardChance = Math.max(0.05, this.randomRewardChance * 0.7);
    
    // Prefer focus and productivity sounds
    this.workSessionBoosts = ['focusBoost', 'neuralSync', 'productivityPulse', 'deepFocus'];
  }
  
  // Adapt to session context based on interaction velocity
  adaptToSessionContext(soundType, velocity) {
    if (velocity > 3) {
      // High velocity - prefer energetic sounds
      this.currentContext = 'energetic';
      this.contextualSounds = ['energyWave', 'productivityPulse', 'betaStimulation'];
    } else if (velocity < -2) {
      // Slowing down - prefer calming, refocusing sounds
      this.currentContext = 'refocusing';
      this.contextualSounds = ['alphaWaves', 'deepFocus', 'creativityFlow'];
    } else {
      // Steady state - balanced approach
      this.currentContext = 'balanced';
      this.contextualSounds = ['personalizedReward', 'focusBoost', 'neuralSync'];
    }
  }
  
  // AI-driven sound selection based on learned patterns
  selectAdaptiveSound(category = 'reward') {
    const contextMap = {
      'reward': {
        'energetic': ['coinDrop', 'dopamineHit', 'energyWave'],
        'refocusing': ['microReward', 'perfectClick', 'focusBoost'],
        'balanced': ['personalizedReward', 'sparkle', 'miniSuccess']
      },
      'navigation': {
        'energetic': ['perfectClick', 'engagement'],
        'refocusing': ['buttonClick', 'microReward'],
        'balanced': ['satisfyingPop', 'buttonHover']
      },
      'achievement': {
        'energetic': ['euphoria', 'transcendence', 'communityWin'],
        'refocusing': ['socialBoost', 'peerSuccess'],
        'balanced': ['achievement', 'levelUp', 'personalizedReward']
      }
    };
    
    const context = this.currentContext || 'balanced';
    const sounds = contextMap[category]?.[context] || contextMap[category]['balanced'];
    
    // Weight selection based on learned effectiveness
    const weightedSounds = sounds.map(sound => {
      const effectiveness = this.behaviorAnalytics.soundEffectiveness.get(sound) || { positive: 1, negative: 0 };
      const score = effectiveness.positive / Math.max(1, effectiveness.positive + effectiveness.negative);
      return { sound, weight: score };
    });
    
    // Select based on weighted probability
    const totalWeight = weightedSounds.reduce((sum, item) => sum + item.weight, 0);
    const random = Math.random() * totalWeight;
    let accumulator = 0;
    
    for (const item of weightedSounds) {
      accumulator += item.weight;
      if (random <= accumulator) {
        return item.sound;
      }
    }
    
    return sounds[0]; // Fallback
  }
  
  // Enhanced play method with AI selection
  playAdaptive(category = 'reward', delay = 0) {
    const selectedSound = this.selectAdaptiveSound(category);
    this.play(selectedSound, delay);
    return selectedSound;
  }
  
  // DYNAMIC SOUND ENVIRONMENTS SYSTEM
  
  // Create and manage dynamic sound environments based on user behavior
  createSoundEnvironment(environmentType = 'balanced', duration = 30000) {
    if (!this.canPlay()) return;
    
    this.environmentTransitioning = true;
    
    // Stop current environment if active
    this.stopCurrentEnvironment();
    
    const environments = {
      'hyperfocus': {
        ambientDrone: { freq: 40, harmonics: [1, 2, 3, 5], duration: duration },
        crystalTexture: { baseFreq: 432, count: 3, shimmer: 0.05 },
        binauralBeat: { baseFreq: 40, beatFreq: 10 }, // Alpha focus
        description: 'Deep concentration environment with gamma/alpha waves'
      },
      'creativity': {
        ambientDrone: { freq: 256, harmonics: [1, 1.618, 2.618], duration: duration }, // Golden ratio
        crystalTexture: { baseFreq: 528, count: 7, shimmer: 0.15 },
        binauralBeat: { baseFreq: 10, beatFreq: 6 }, // Theta creativity
        description: 'Expansive creative environment with theta waves'
      },
      'energy': {
        ambientDrone: { freq: 220, harmonics: [1, 2, 4, 8], duration: duration },
        crystalTexture: { baseFreq: 741, count: 5, shimmer: 0.25 },
        binauralBeat: { baseFreq: 20, beatFreq: 15 }, // Beta energy
        description: 'High-energy productive environment with beta waves'
      },
      'calm': {
        ambientDrone: { freq: 174, harmonics: [1, 1.5, 2, 3], duration: duration },
        crystalTexture: { baseFreq: 396, count: 4, shimmer: 0.08 },
        binauralBeat: { baseFreq: 8, beatFreq: 4 }, // Theta relaxation
        description: 'Calming restorative environment with healing frequencies'
      },
      'social': {
        ambientDrone: { freq: 285, harmonics: [1, 1.25, 1.5, 2], duration: duration },
        crystalTexture: { baseFreq: 528, count: 6, shimmer: 0.12 },
        binauralBeat: { baseFreq: 40, beatFreq: 8 }, // Social bonding
        description: 'Community-oriented environment promoting connection'
      },
      'balanced': {
        ambientDrone: { freq: 432, harmonics: [1, 2, 3, 4], duration: duration },
        crystalTexture: { baseFreq: 528, count: 5, shimmer: 0.1 },
        binauralBeat: { baseFreq: 10, beatFreq: 8 }, // Alpha balance
        description: 'Balanced environment for general productivity'
      }
    };
    
    const env = environments[environmentType] || environments['balanced'];
    this.currentEnvironment = environmentType;
    
    // Create ambient foundation
    setTimeout(() => {
      this.createAmbientDrone(env.ambientDrone.freq, env.ambientDrone.duration / 1000)();
      this.ambientLayers.set('drone', { type: 'drone', startTime: Date.now() });
    }, 100);
    
    // Add crystalline texture
    setTimeout(() => {
      this.createCrystallineTexture(env.crystalTexture.baseFreq, env.crystalTexture.count, env.crystalTexture.shimmer)();
      this.ambientLayers.set('crystal', { type: 'crystal', startTime: Date.now() });
    }, 500);
    
    // Add binaural beats for brainwave entrainment
    setTimeout(() => {
      this.createBinauralEnvironmentLayer(env.binauralBeat.baseFreq, env.binauralBeat.beatFreq, duration / 1000);
      this.ambientLayers.set('binaural', { type: 'binaural', startTime: Date.now() });
    }, 1000);
    
    // Update environment tracking
    this.environmentHistory.push({
      type: environmentType,
      startTime: Date.now(),
      duration: duration,
      description: env.description
    });
    
    // Auto-transition when environment ends
    setTimeout(() => {
      this.environmentTransitioning = false;
      if (this.autoEnvironmentSwitching) {
        this.selectNextEnvironmentBasedOnBehavior();
      }
    }, duration);
    
    console.log(`🌊 Environment: ${environmentType} - ${env.description}`);
  }
  
  // Create binaural beat layer for environment
  createBinauralEnvironmentLayer(carrierFreq, beatFreq, duration) {
    if (!this.canPlay()) return;
    
    const now = this.audioContext.currentTime;
    
    // Left channel
    const leftOsc = this.audioContext.createOscillator();
    const leftGain = this.audioContext.createGain();
    
    // Right channel  
    const rightOsc = this.audioContext.createOscillator();
    const rightGain = this.audioContext.createGain();
    
    // Stereo merger
    const merger = this.audioContext.createChannelMerger(2);
    const masterGain = this.audioContext.createGain();
    
    // Set frequencies (binaural beat = difference between channels)
    leftOsc.frequency.setValueAtTime(carrierFreq, now);
    rightOsc.frequency.setValueAtTime(carrierFreq + beatFreq, now);
    
    // Connect audio graph
    leftOsc.connect(leftGain);
    rightOsc.connect(rightGain);
    leftGain.connect(merger, 0, 0);
    rightGain.connect(merger, 0, 1);
    merger.connect(masterGain);
    masterGain.connect(this.audioContext.destination);
    
    // Set volumes (very low for ambient)
    const volume = 0.02 * this.volume;
    leftGain.gain.setValueAtTime(0, now);
    rightGain.gain.setValueAtTime(0, now);
    masterGain.gain.setValueAtTime(0, now);
    
    // Fade in
    leftGain.gain.linearRampToValueAtTime(volume, now + 2);
    rightGain.gain.linearRampToValueAtTime(volume, now + 2);
    masterGain.gain.linearRampToValueAtTime(1, now + 2);
    
    // Fade out
    leftGain.gain.linearRampToValueAtTime(0, now + duration - 2);
    rightGain.gain.linearRampToValueAtTime(0, now + duration - 2);
    masterGain.gain.linearRampToValueAtTime(0, now + duration - 1);
    
    // Track oscillators for cleanup
    this.activeOscillators.add(leftOsc);
    this.activeOscillators.add(rightOsc);
    
    leftOsc.addEventListener('ended', () => {
      leftOsc.disconnect();
      rightOsc.disconnect();
      merger.disconnect();
      masterGain.disconnect();
      this.activeOscillators.delete(leftOsc);
      this.activeOscillators.delete(rightOsc);
    });
    
    // Start and stop
    leftOsc.start(now);
    rightOsc.start(now);
    leftOsc.stop(now + duration);
    rightOsc.stop(now + duration);
  }
  
  // Stop current environment
  stopCurrentEnvironment() {
    this.ambientLayers.clear();
    // Note: Individual oscillators will naturally stop based on their duration
  }
  
  // Intelligently select next environment based on user behavior patterns
  selectNextEnvironmentBasedOnBehavior() {
    const recentPatterns = this.behaviorAnalytics.clickPatterns.slice(-20);
    const currentTime = Date.now();
    const hour = new Date().getHours();
    
    // Calculate interaction intensity over last 5 minutes
    const recentActivity = recentPatterns.filter(time => currentTime - time < 300000).length;
    
    // Time-based environment preferences
    let timeBasedEnvironment = 'balanced';
    if (hour >= 6 && hour < 10) timeBasedEnvironment = 'energy'; // Morning energy
    else if (hour >= 10 && hour < 14) timeBasedEnvironment = 'hyperfocus'; // Mid-day focus
    else if (hour >= 14 && hour < 18) timeBasedEnvironment = 'creativity'; // Afternoon creativity
    else if (hour >= 18 && hour < 22) timeBasedEnvironment = 'social'; // Evening social
    else timeBasedEnvironment = 'calm'; // Night calm
    
    // Behavior-based environment selection
    let behaviorEnvironment = 'balanced';
    if (recentActivity > 15) {
      behaviorEnvironment = 'hyperfocus'; // High activity = focus needed
    } else if (recentActivity < 5) {
      behaviorEnvironment = 'energy'; // Low activity = energy needed
    } else if (this.neuralStimulation.creativityMode) {
      behaviorEnvironment = 'creativity';
    } else if (this.neuralStimulation.serotoninBoost) {
      behaviorEnvironment = 'social';
    }
    
    // Weight time vs behavior (behavior gets priority during work hours)
    const workHours = hour >= 9 && hour <= 17;
    const selectedEnvironment = workHours ? behaviorEnvironment : 
      Math.random() > 0.3 ? behaviorEnvironment : timeBasedEnvironment;
    
    // Avoid repeating the same environment immediately
    const lastEnvironment = this.environmentHistory[this.environmentHistory.length - 1];
    if (lastEnvironment && lastEnvironment.type === selectedEnvironment) {
      const alternatives = ['balanced', 'creativity', 'hyperfocus', 'energy', 'calm', 'social'];
      const filtered = alternatives.filter(env => env !== selectedEnvironment);
      const finalEnvironment = filtered[Math.floor(Math.random() * filtered.length)];
      this.createSoundEnvironment(finalEnvironment, 45000); // 45 second duration
    } else {
      this.createSoundEnvironment(selectedEnvironment, 45000);
    }
  }
  
  // Manual environment control
  switchEnvironment(environmentType, duration = 30000) {
    this.autoEnvironmentSwitching = false; // Disable auto-switching when manual control is used
    this.createSoundEnvironment(environmentType, duration);
    
    // Re-enable auto-switching after the manually selected environment ends
    setTimeout(() => {
      this.autoEnvironmentSwitching = true;
    }, duration + 5000);
  }
  
  // Get current environment status
  getEnvironmentStatus() {
    const activeEnvironment = this.currentEnvironment;
    const activeLayers = Array.from(this.ambientLayers.keys());
    const lastEnvironment = this.environmentHistory[this.environmentHistory.length - 1];
    
    return {
      currentEnvironment: activeEnvironment,
      activeLayers: activeLayers,
      isTransitioning: this.environmentTransitioning,
      autoSwitching: this.autoEnvironmentSwitching,
      environmentHistory: this.environmentHistory.slice(-5), // Last 5 environments
      sessionDuration: lastEnvironment ? Date.now() - lastEnvironment.startTime : 0
    };
  }
  
  // Environment-aware sound playback
  playEnvironmentAware(soundName, delay = 0) {
    // Adjust sound characteristics based on current environment
    const environmentAdjustments = {
      'hyperfocus': { volume: 0.7, preferredSounds: ['perfectClick', 'microReward', 'neuralSync'] },
      'creativity': { volume: 1.0, preferredSounds: ['sparkle', 'creativityFlow', 'exploration'] },
      'energy': { volume: 1.2, preferredSounds: ['coinDrop', 'energyWave', 'productivityPulse'] },
      'calm': { volume: 0.6, preferredSounds: ['satisfyingPop', 'personalizedReward', 'alphaWaves'] },
      'social': { volume: 1.0, preferredSounds: ['socialBoost', 'communityWin', 'peerSuccess'] },
      'balanced': { volume: 1.0, preferredSounds: [] } // No restrictions
    };
    
    const adjustment = environmentAdjustments[this.currentEnvironment] || environmentAdjustments['balanced'];
    
    // Temporarily adjust volume for environment
    const originalVolume = this.volume;
    this.volume *= adjustment.volume;
    
    // Play the sound
    this.play(soundName, delay);
    
    // Restore original volume
    setTimeout(() => {
      this.volume = originalVolume;
    }, 100);
  }
  
  // TIME-BASED AMBIENT SOUNDSCAPES SYSTEM
  
  // Initialize the environment system with time-based automation
  initializeEnvironmentSystem() {
    // Start with appropriate environment based on time of day
    setTimeout(() => {
      this.selectNextEnvironmentBasedOnBehavior();
    }, 3000); // 3 second delay to let user settle in
    
    // Set up hourly environment updates
    this.setupTimeBasedEnvironmentSwitching();
    
    // Initialize circadian rhythm tracking
    this.initializeCircadianRhythm();
  }
  
  // Set up automatic environment switching based on time
  setupTimeBasedEnvironmentSwitching() {
    const checkAndUpdateEnvironment = () => {
      if (this.autoEnvironmentSwitching) {
        const hour = new Date().getHours();
        const currentEnv = this.currentEnvironment;
        const recommendedEnv = this.getRecommendedEnvironmentForTime(hour);
        
        // Only switch if recommendation is significantly different and we've been in current env for >10 minutes
        const lastEnvChange = this.environmentHistory[this.environmentHistory.length - 1];
        const timeSinceLastChange = lastEnvChange ? Date.now() - lastEnvChange.startTime : Infinity;
        
        if (recommendedEnv !== currentEnv && timeSinceLastChange > 600000) { // 10 minutes
          this.createSoundEnvironment(recommendedEnv, 60000); // 1 minute duration
          console.log(`⏰ Automatic environment switch: ${currentEnv} → ${recommendedEnv} (time-based)`);
        }
      }
    };
    
    // Check every 30 minutes
    const environmentInterval = setInterval(() => {
      if (this.isDestroyed) {
        clearInterval(environmentInterval);
        return;
      }
      checkAndUpdateEnvironment();
    }, 30 * 60 * 1000);
    this.activeIntervals.add(environmentInterval);
  }
  
  // Get recommended environment based on time of day
  getRecommendedEnvironmentForTime(hour) {
    const timeEnvironments = {
      'dawn': 'energy',        // 5-7 AM
      'morning': 'hyperfocus', // 7-11 AM
      'midday': 'balanced',    // 11 AM-2 PM
      'afternoon': 'creativity', // 2-6 PM
      'evening': 'social',     // 6-9 PM
      'night': 'calm',         // 9 PM-5 AM
    };
    
    if (hour >= 5 && hour < 7) return timeEnvironments.dawn;
    if (hour >= 7 && hour < 11) return timeEnvironments.morning;
    if (hour >= 11 && hour < 14) return timeEnvironments.midday;
    if (hour >= 14 && hour < 18) return timeEnvironments.afternoon;
    if (hour >= 18 && hour < 21) return timeEnvironments.evening;
    return timeEnvironments.night;
  }
  
  // Initialize circadian rhythm tracking and adaptation
  initializeCircadianRhythm() {
    this.circadianState = {
      cortisol: 0.5,      // Stress hormone (0-1)
      melatonin: 0.3,     // Sleep hormone (0-1)
      alertness: 0.7,     // Mental alertness (0-1)
      energyLevel: 0.6,   // Physical energy (0-1)
      creativityPeak: false,
      focusPeak: false
    };
    
    // Update circadian state every 15 minutes
    const circadianInterval = setInterval(() => {
      if (this.isDestroyed) {
        clearInterval(circadianInterval);
        return;
      }
      this.updateCircadianState();
    }, 15 * 60 * 1000);
    this.activeIntervals.add(circadianInterval);
    
    // Initial calculation
    this.updateCircadianState();
  }
  
  // Update circadian rhythm state based on time and user behavior
  updateCircadianState() {
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    const timeDecimal = hour + minute / 60;
    
    // Calculate natural circadian rhythms (24-hour cycles)
    const cortisolCycle = Math.sin((timeDecimal - 8) * Math.PI / 12); // Peak at 8 AM
    const melatoninCycle = Math.sin((timeDecimal - 21) * Math.PI / 12); // Peak at 9 PM
    const alertnessCycle = Math.cos((timeDecimal - 14) * Math.PI / 12); // Peak at 2 PM
    
    // Update state with natural cycles + user behavior modifiers
    this.circadianState.cortisol = Math.max(0, Math.min(1, 0.5 + cortisolCycle * 0.3));
    this.circadianState.melatonin = Math.max(0, Math.min(1, 0.3 + Math.max(0, melatoninCycle) * 0.5));
    this.circadianState.alertness = Math.max(0, Math.min(1, 0.5 + alertnessCycle * 0.4));
    this.circadianState.energyLevel = Math.max(0, Math.min(1, 1 - this.circadianState.melatonin * 0.8));
    
    // Determine peak windows
    this.circadianState.creativityPeak = (hour >= 14 && hour <= 17) || (hour >= 20 && hour <= 22);
    this.circadianState.focusPeak = (hour >= 9 && hour <= 11) || (hour >= 15 && hour <= 16);
    
    // Adjust sound preferences based on circadian state
    this.adaptSoundsToCircadianRhythm();
  }
  
  // Adapt sound characteristics to circadian rhythm
  adaptSoundsToCircadianRhythm() {
    const state = this.circadianState;
    
    // Adjust base volume based on energy levels
    const circadianVolumeModifier = 0.7 + (state.energyLevel * 0.6);
    
    // Adjust frequency preferences based on alertness
    if (state.alertness > 0.7) {
      // High alertness - prefer crisp, clear frequencies
      this.userPreferences.preferredTimbres = ['sine', 'triangle'];
    } else if (state.alertness < 0.4) {
      // Low alertness - prefer warmer, softer frequencies
      this.userPreferences.preferredTimbres = ['sine'];
    }
    
    // Adjust reward frequency based on cortisol levels
    if (state.cortisol > 0.7) {
      // High stress - increase comforting rewards
      this.randomRewardChance = Math.min(0.3, this.randomRewardChance + 0.05);
    } else if (state.cortisol < 0.3) {
      // Low stress - reduce reward frequency to maintain engagement
      this.randomRewardChance = Math.max(0.05, this.randomRewardChance - 0.02);
    }
    
    // Update neural stimulation preferences
    if (state.creativityPeak) {
      this.neuralStimulation.creativityMode = true;
    }
    if (state.focusPeak) {
      this.neuralStimulation.focusEnhancement = true;
    }
  }
  
  // Create time-sensitive ambient soundscape
  createTimeBasedAmbientSoundscape(duration = 120000) {
    const hour = new Date().getHours();
    const circadianState = this.circadianState;
    
    // Define time-specific soundscape characteristics
    const timeBasedSoundscapes = {
      dawn: {
        baseFreq: 174,      // Grounding frequency
        harmonics: [1, 1.5, 2, 3],
        crystalFreq: 396,   // Liberation frequency
        binauralBase: 8,    // Alpha waves
        binauralBeat: 4,    // Relaxed alertness
        description: 'Dawn awakening soundscape with gentle energy building'
      },
      morning: {
        baseFreq: 285,      // Energy frequency
        harmonics: [1, 2, 3, 4, 6],
        crystalFreq: 528,   // Love/DNA repair frequency
        binauralBase: 40,   // Gamma waves
        binauralBeat: 10,   // Focus enhancement
        description: 'Morning productivity soundscape with focused energy'
      },
      midday: {
        baseFreq: 432,      // Natural tuning
        harmonics: [1, 2, 3, 4, 5],
        crystalFreq: 741,   // Intuition frequency
        binauralBase: 20,   // Beta waves
        binauralBeat: 8,    // Active concentration
        description: 'Midday balance soundscape for sustained attention'
      },
      afternoon: {
        baseFreq: 528,      // Love frequency
        harmonics: [1, 1.618, 2.618, 4.236], // Golden ratio
        crystalFreq: 852,   // Third eye frequency
        binauralBase: 10,   // Alpha waves
        binauralBeat: 6,    // Creative flow
        description: 'Afternoon creativity soundscape with golden ratios'
      },
      evening: {
        baseFreq: 396,      // Liberation frequency
        harmonics: [1, 1.25, 1.5, 2, 2.5],
        crystalFreq: 528,   // Love frequency
        binauralBase: 8,    // Alpha waves
        binauralBeat: 4,    // Social relaxation
        description: 'Evening social soundscape for connection and reflection'
      },
      night: {
        baseFreq: 174,      // Foundation frequency
        harmonics: [1, 1.5, 2],
        crystalFreq: 396,   // Liberation frequency
        binauralBase: 4,    // Theta waves
        binauralBeat: 2,    // Deep relaxation
        description: 'Night restoration soundscape for deep relaxation'
      }
    };
    
    // Select appropriate soundscape
    let selectedSoundscape = 'balanced';
    if (hour >= 5 && hour < 8) selectedSoundscape = 'dawn';
    else if (hour >= 8 && hour < 12) selectedSoundscape = 'morning';
    else if (hour >= 12 && hour < 15) selectedSoundscape = 'midday';
    else if (hour >= 15 && hour < 18) selectedSoundscape = 'afternoon';
    else if (hour >= 18 && hour < 22) selectedSoundscape = 'evening';
    else selectedSoundscape = 'night';
    
    const soundscape = timeBasedSoundscapes[selectedSoundscape];
    
    // Create the time-based ambient environment
    this.currentEnvironment = `time_${selectedSoundscape}`;
    
    // Ambient foundation with circadian-adjusted volume
    const ambientVolume = (0.015 * this.volume) * (0.7 + circadianState.energyLevel * 0.6);
    setTimeout(() => {
      this.createAmbientDrone(soundscape.baseFreq, duration / 1000)();
    }, 100);
    
    // Crystalline texture with alertness-based intensity
    const crystalIntensity = 0.05 + (circadianState.alertness * 0.15);
    setTimeout(() => {
      this.createCrystallineTexture(soundscape.crystalFreq, 4, crystalIntensity)();
    }, 2000);
    
    // Binaural beats for circadian entrainment
    setTimeout(() => {
      this.createBinauralEnvironmentLayer(soundscape.binauralBase, soundscape.binauralBeat, duration / 1000);
    }, 4000);
    
    console.log(`🌅 Time-based soundscape: ${selectedSoundscape} - ${soundscape.description}`);
    
    // Schedule next soundscape transition
    setTimeout(() => {
      if (this.autoEnvironmentSwitching) {
        this.createTimeBasedAmbientSoundscape(120000); // Continue for 2 more minutes
      }
    }, duration);
  }
  
  // Manual control for time-based soundscapes
  enableTimeBasedSoundscapes(enable = true) {
    if (enable) {
      this.createTimeBasedAmbientSoundscape();
      console.log('🕐 Time-based ambient soundscapes enabled');
    } else {
      this.stopCurrentEnvironment();
      console.log('🔇 Time-based ambient soundscapes disabled');
    }
  }
  
  // Get comprehensive environment and circadian status
  getEnvironmentAndCircadianStatus() {
    return {
      ...this.getEnvironmentStatus(),
      circadianState: this.circadianState,
      timeBasedEnvironment: this.getRecommendedEnvironmentForTime(new Date().getHours()),
      environmentRecommendation: this.getEnvironmentRecommendation()
    };
  }
  
  // Get smart environment recommendation
  getEnvironmentRecommendation() {
    const hour = new Date().getHours();
    const recentActivity = this.behaviorAnalytics.clickPatterns.filter(
      time => Date.now() - time < 300000
    ).length;
    
    const timeRec = this.getRecommendedEnvironmentForTime(hour);
    const activityRec = recentActivity > 15 ? 'hyperfocus' : recentActivity < 5 ? 'energy' : 'balanced';
    const circadianRec = this.circadianState.creativityPeak ? 'creativity' : 
                         this.circadianState.focusPeak ? 'hyperfocus' : 'balanced';
    
    return {
      timeBased: timeRec,
      activityBased: activityRec,
      circadianBased: circadianRec,
      overall: this.weighEnvironmentRecommendations(timeRec, activityRec, circadianRec)
    };
  }
  
  // Weight different environment recommendations
  weighEnvironmentRecommendations(timeRec, activityRec, circadianRec) {
    const recommendations = [timeRec, activityRec, circadianRec];
    const counts = {};
    
    recommendations.forEach(rec => {
      counts[rec] = (counts[rec] || 0) + 1;
    });
    
    // Return most common recommendation, with time-based as tiebreaker
    const maxCount = Math.max(...Object.values(counts));
    const topRecommendations = Object.keys(counts).filter(rec => counts[rec] === maxCount);
    
    return topRecommendations.includes(timeRec) ? timeRec : topRecommendations[0];
  }

  // Enhanced trigger with neural optimization
  triggerEnhancedRewards(baseSound) {
    // Determine if user is in flow state
    const isInFlow = this.streakCount > 15 && this.comboMultiplier > 2;
    const isLongSession = this.userPreferences.sessionDuration > 300000; // 5+ minutes
    
    if (isInFlow) {
      setTimeout(() => this.playDirect('neuralSync'), 100);
      setTimeout(() => this.playDirect('euphoria'), 300);
    }
    
    if (isLongSession && Math.random() < 0.3) { // 30% chance
      setTimeout(() => this.playDirect('personalizedReward'), 200);
    }
    
    // Adaptive difficulty - make rewards rarer as user gets more engaged
    if (this.neuralStimulation.dopamineLevel > 0.8) {
      this.randomRewardChance = Math.max(0.05, this.randomRewardChance - 0.01);
    } else {
      this.randomRewardChance = Math.min(0.15, this.randomRewardChance + 0.005);
    }
  }

  // Get neural state for external monitoring
  getNeuralState() {
    return {
      ...this.neuralStimulation,
      engagement: this.sessionScore / Math.max(1, this.interactionCount),
      flowState: this.streakCount > 10 && this.comboMultiplier > 1.5,
      sessionMetrics: {
        interactions: this.interactionCount,
        streakCount: this.streakCount,
        sessionDuration: this.userPreferences.sessionDuration,
        energyLevel: this.userPreferences.energyLevel
      }
    };
  }

  // ADVANCED SOUND LAYERING AND HARMONICS SYSTEM
  
  // Multi-layer harmonic generator with phase relationships
  createHarmonicLayer(fundamentalFreq, harmonicSeries = [1, 2, 3, 5, 8], panning = 0, duration = 1.0) {
    return () => {
      if (!this.canPlay()) return;
      
      const now = this.audioContext.currentTime;
      const masterGain = this.audioContext.createGain();
      const compressor = this.audioContext.createDynamicsCompressor();
      
      // Create stereo panner for spatial audio
      const panner = this.audioContext.createStereoPanner();
      panner.pan.setValueAtTime(panning, now);
      
      masterGain.connect(compressor);
      compressor.connect(panner);
      panner.connect(this.audioContext.destination);
      
      harmonicSeries.forEach((harmonic, index) => {
        const freq = fundamentalFreq * harmonic;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // Golden ratio phase relationships for pleasing harmonics
        const phaseOffset = index * 0.618; // Golden ratio
        osc.type = index % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        
        // Harmonic filtering
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 1.2, now);
        filter.Q.setValueAtTime(3 + index, now);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        
        // Volume follows harmonic series falloff
        const harmonicVolume = (0.1 * this.volume) / (harmonic * 0.5 + 1);
        gain.gain.setValueAtTime(0, now + phaseOffset);
        gain.gain.linearRampToValueAtTime(harmonicVolume, now + phaseOffset + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        osc.start(now + phaseOffset);
        osc.stop(now + duration);
      });
      
      // Master envelope
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(1, now + 0.1);
      masterGain.gain.linearRampToValueAtTime(0.7, now + duration * 0.8);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    };
  }
  
  // Crystalline texture generator with frequency modulation
  createCrystallineTexture(baseFreq = 528, crystalCount = 7, shimmerRate = 0.1) {
    return () => {
      if (!this.canPlay()) return;
      
      const now = this.audioContext.currentTime;
      const duration = 2.0;
      
      for (let i = 0; i < crystalCount; i++) {
        const freq = baseFreq * Math.pow(1.059463, i * 2); // Musical intervals
        const delay = Math.random() * 0.5;
        const pan = (Math.random() - 0.5) * 0.8; // Stereo spread
        
        setTimeout(() => {
          const osc = this.audioContext.createOscillator();
          const fmOsc = this.audioContext.createOscillator();
          const fmGain = this.audioContext.createGain();
          const gain = this.audioContext.createGain();
          const filter = this.audioContext.createBiquadFilter();
          const panner = this.audioContext.createStereoPanner();
          
          // Frequency modulation for shimmer
          fmOsc.frequency.setValueAtTime(shimmerRate * (i + 1), now + delay);
          fmGain.gain.setValueAtTime(freq * 0.01, now + delay);
          
          osc.frequency.setValueAtTime(freq, now + delay);
          osc.type = 'sine';
          
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(freq * 0.8, now + delay);
          
          panner.pan.setValueAtTime(pan, now + delay);
          
          fmOsc.connect(fmGain);
          fmGain.connect(osc.frequency);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(panner);
          panner.connect(this.audioContext.destination);
          
          const volume = (0.03 * this.volume) / (i + 1);
          gain.gain.setValueAtTime(0, now + delay);
          gain.gain.linearRampToValueAtTime(volume, now + delay + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
          
          osc.start(now + delay);
          fmOsc.start(now + delay);
          osc.stop(now + delay + duration);
          fmOsc.stop(now + delay + duration);
        }, delay * 1000);
      }
    };
  }
  
  // Ambient drone layer with slowly evolving harmonics
  createAmbientDrone(fundamental = 110, evolveTime = 10.0) {
    return () => {
      if (!this.canPlay()) return;
      
      const now = this.audioContext.currentTime;
      const harmonics = [1, 1.5, 2, 2.5, 3, 4, 5];
      
      harmonics.forEach((ratio, index) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(fundamental * ratio, now);
        
        // LFO for slow evolution
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.1 / (index + 1), now);
        lfoGain.gain.setValueAtTime(fundamental * ratio * 0.02, now);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(fundamental * ratio * 3, now);
        filter.Q.setValueAtTime(0.5, now);
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioContext.destination);
        
        const volume = (0.01 * this.volume) / (index + 1);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 2.0);
        gain.gain.linearRampToValueAtTime(volume * 0.7, now + evolveTime - 2.0);
        gain.gain.exponentialRampToValueAtTime(0.001, now + evolveTime);
        
        osc.start(now);
        lfo.start(now);
        osc.stop(now + evolveTime);
        lfo.stop(now + evolveTime);
      });
    };
  }
  
  // Enhanced method implementations with layering
  createCreativityFlow() { 
    return () => {
      this.createHarmonicLayer(256, [1, 1.618, 2.618, 4.236], -0.3, 1.5)(); // Golden ratio harmonics
      setTimeout(() => this.createCrystallineTexture(432, 5, 0.15)(), 200);
      setTimeout(() => this.createPersonalizedReward()(), 400);
    };
  }
  
  createEnergyWave() { 
    return () => {
      this.createHarmonicLayer(220, [1, 2, 4, 8, 16], 0.2, 1.0)(); // Power of 2 harmonics
      setTimeout(() => this.createSocialBoost()(), 150);
    };
  }
  
  createDeepFocus() { 
    return () => {
      this.createAmbientDrone(55, 3.0)(); // Sub-bass foundation
      setTimeout(() => this.createFocusBoost()(), 500);
    };
  }
  
  createProductivityPulse() { 
    return () => {
      this.createHarmonicLayer(174, [1, 3, 5, 7, 9], 0, 0.8)(); // Odd harmonics for energy
      setTimeout(() => this.createNeuralSync()(), 100);
    };
  }
  
  createTranscendence() { 
    return () => {
      this.createAmbientDrone(108, 4.0)(); // Om frequency
      setTimeout(() => this.createCrystallineTexture(963, 9, 0.05)(), 300); // Divine connection
      setTimeout(() => this.createEuphoria()(), 800);
    };
  }
  
  createHyperfocus() { 
    return () => {
      this.createHarmonicLayer(40, [1, 2, 3, 5, 8, 13], 0, 2.0)(); // Fibonacci harmonics
      setTimeout(() => this.createFocusBoost()(), 200);
    };
  }
  
  createAdaptiveSuccess() { 
    return () => {
      const userHarmonics = this.userPreferences.favoriteFrequencies.map((f, i) => 1 + i * 0.5);
      this.createHarmonicLayer(this.userPreferences.favoriteFrequencies[0], userHarmonics, 0, 1.2)();
      setTimeout(() => this.createPersonalizedReward()(), 300);
    };
  }
  
  createBehaviorOptimized() { 
    return () => {
      const energyLevel = this.userPreferences.energyLevel;
      const harmonics = energyLevel > 0.7 ? [1, 2, 4, 8] : [1, 1.5, 2, 3];
      this.createHarmonicLayer(285, harmonics, 0, 1.0)();
      setTimeout(() => this.createPersonalizedReward()(), 250);
    };
  }
  
  createPeerSuccess() { 
    return () => {
      this.createHarmonicLayer(396, [1, 1.25, 1.5, 2], -0.5, 1.0)(); // Major chord progression
      setTimeout(() => this.createSocialBoost()(), 100);
    };
  }
  
  createCommunityWin() { 
    return () => {
      this.createCrystallineTexture(528, 8, 0.2)(); // Love frequency with celebration
      setTimeout(() => this.createSocialBoost()(), 200);
    };
  }
  
  createLeaderboardClimb() { 
    return () => {
      this.createHarmonicLayer(741, [1, 2, 3, 4, 5, 6, 7, 8], 0.3, 2.0)(); // Ascending harmonics
      setTimeout(() => this.createEuphoria()(), 400);
    };
  }
  
  createBinauralFocus() { 
    return () => {
      this.createAmbientDrone(200, 5.0)(); // Foundation
      setTimeout(() => this.createNeuralSync()(), 500);
    };
  }
  
  createAlphaWaves() { 
    return () => {
      this.createHarmonicLayer(10, [1, 2, 4, 8], -0.2, 3.0)(); // Alpha frequency harmonics
      setTimeout(() => this.createFocusBoost()(), 300);
    };
  }
  
  createBetaStimulation() { 
    return () => {
      this.createHarmonicLayer(20, [1, 1.5, 2, 3], 0.2, 1.5)(); // Beta waves
      setTimeout(() => this.createEnergyWave()(), 200);
    };
  }
  
  createGammaBoost() { 
    return () => {
      this.createCrystallineTexture(40, 6, 0.3)(); // Gamma frequency shimmer
      setTimeout(() => this.createFocusBoost()(), 300);
    };
  }

  // Cleanup methods to prevent audio hanging
  stopAllOscillators() {
    // Stop and disconnect all active oscillators
    this.activeOscillators.forEach(oscillator => {
      try {
        if (oscillator.state !== 'closed') {
          oscillator.stop();
          oscillator.disconnect();
        }
      } catch (error) {
        console.warn('Error stopping oscillator:', error);
      }
    });
    this.activeOscillators.clear();
  }

  clearAllIntervals() {
    // Clear all tracked intervals
    this.activeIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.activeIntervals.clear();
  }

  stopCurrentEnvironment() {
    // Stop current ambient environment
    this.stopAllOscillators();
    this.ambientLayers.clear();
    this.environmentTransitioning = false;
  }

  destroy() {
    // Complete cleanup of the sound service
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    this.stopAllOscillators();
    this.clearAllIntervals();
    this.stopCurrentEnvironment();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    console.log('🔇 Sound Service destroyed and cleaned up');
  }

  // Emergency stop all audio - for immediate use when audio hangs
  emergencyStop() {
    console.log('🚨 Emergency audio stop triggered');
    
    // Stop all oscillators immediately
    this.stopAllOscillators();
    
    // Stop all Web Speech API
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Suspend audio context
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
    
    // Clear all timers
    this.clearAllIntervals();
    
    console.log('🔇 Emergency stop completed');
  }
}

// Create singleton instance only in browser
let soundService;

if (typeof window !== 'undefined') {
  soundService = new SoundService();
  
  // Add global emergency stop function for debugging
  window.stopAllAudio = () => {
    soundService.emergencyStop();
    
    // Also clean up any other potential audio sources
    const allAudioElements = document.querySelectorAll('audio, video');
    allAudioElements.forEach(element => {
      element.pause();
      element.currentTime = 0;
    });
    
    console.log('🔇 Global audio cleanup completed');
  };
} else {
  // SSR fallback with dummy methods
  soundService = {
    play: () => {},
    playDirect: () => {},
    stopCurrentEnvironment: () => {},
    destroy: () => {},
    stopAllOscillators: () => {},
    clearAllIntervals: () => {},
    emergencyStop: () => {},
    enabled: false,
    initialized: false
  };
}

// Export the service
export default soundService;