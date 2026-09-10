/**
 * Audio Engine for Metronome Click Ear Training
 * Web Audio API based sound synthesizer for precise click/tick counting
 */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.masterGain = null;
    this.volume = 0.75;
    this.isPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.7;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  /**
   * Play a single metronome click sound
   * @param {string} soundType 'wood' | 'digital' | 'woodblock' | 'ping'
   * @param {number} startTime Offset in seconds from ctx.currentTime
   */
  playClick(soundType = 'wood', startTime = 0) {
    this.init();
    const start = this.ctx.currentTime + startTime;

    switch (soundType) {
      case 'digital':
        this._playDigitalClick(start);
        break;
      case 'woodblock':
        this._playWoodblockClick(start);
        break;
      case 'ping':
        this._playPingClick(start);
        break;
      case 'wood':
      default:
        this._playWoodClick(start);
        break;
    }
  }

  /**
   * Classic Mechanical Metronome Wood Click
   * Resonant wooden body pop + short filtered noise burst
   */
  _playWoodClick(start) {
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1100, start);
    osc.frequency.exponentialRampToValueAtTime(320, start + 0.028);

    oscGain.gain.setValueAtTime(0.9, start);
    oscGain.gain.exponentialRampToValueAtTime(0.001, start + 0.035);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.start(start);
    osc.stop(start + 0.04);

    // Subtle wooden body impact noise
    const bufferSize = this.ctx.sampleRate * 0.015;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, start);
    filter.Q.setValueAtTime(3, start);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, start);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, start + 0.025);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    whiteNoise.start(start);
    whiteNoise.stop(start + 0.03);
  }

  /**
   * Digital Beep / Metronome Click
   * Crisp high pitch short burst
   */
  _playDigitalClick(start) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, start);

    gain.gain.setValueAtTime(0.85, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.028);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(start);
    osc.stop(start + 0.032);
  }

  /**
   * Woodblock Click
   * Hollow melodic percussion tick
   */
  _playWoodblockClick(start) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, start);
    osc.frequency.exponentialRampToValueAtTime(740, start + 0.04);

    gain.gain.setValueAtTime(0.9, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.045);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(start);
    osc.stop(start + 0.05);
  }

  /**
   * Bell / Ping Click
   * Clear chime click
   */
  _playPingClick(start) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, start);

    gain.gain.setValueAtTime(0.7, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(start);
    osc.stop(start + 0.075);
  }

  /**
   * Play a series of N metronome clicks at given BPM
   * @param {number} count Number of clicks (e.g. 5)
   * @param {number} bpm Beats per minute (e.g. 80)
   * @param {string} soundType 'wood' | 'digital' | 'woodblock' | 'ping'
   * @param {function} onBeatCallback (currentBeatIndex, totalCount, isLast)
   * @returns {Promise<void>}
   */
  async playMetronomeClicks(count, bpm = 80, soundType = 'wood', onBeatCallback = null) {
    this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;

    const intervalMs = (60 / bpm) * 1000;

    for (let i = 1; i <= count; i++) {
      this.playClick(soundType, 0);

      if (onBeatCallback) {
        onBeatCallback(i, count, i === count);
      }

      // Wait until next beat
      if (i < count) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    // Small delay after last beat before finishing
    await new Promise(resolve => setTimeout(resolve, Math.min(intervalMs * 0.8, 500)));

    if (onBeatCallback) {
      onBeatCallback('end', count, true);
    }

    this.isPlaying = false;
  }

  /**
   * Get real-time audio time-domain data for visualization
   */
  getWaveformData(dataArray) {
    if (!this.analyser) return;
    this.analyser.getByteTimeDomainData(dataArray);
  }
}

window.audioEngine = new AudioEngine();
