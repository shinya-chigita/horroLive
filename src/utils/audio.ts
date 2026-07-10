/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface ToneOptions {
  frequency: number;
  endFrequency?: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
  delay?: number;
  attack?: number;
  filterFrequency?: number;
}

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private droneFilter: BiquadFilterNode | null = null;
  private heartbeatTimer: number | null = null;
  private currentTension = 10;
  private lastTensionAutomationAt = 0;
  private isMuted = false;

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }

    try {
      const WebkitAudioContext = (
        window as typeof window & { webkitAudioContext?: typeof AudioContext }
      ).webkitAudioContext;
      const AudioContextConstructor = window.AudioContext ?? WebkitAudioContext;
      if (!AudioContextConstructor) return;

      this.ctx = new AudioContextConstructor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.36, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.startDrone();
      this.scheduleHeartbeat();
    } catch (error) {
      console.warn('Failed to initialize Web Audio API:', error);
    }
  }

  setMuted(mute: boolean) {
    this.isMuted = mute;
    if (!this.ctx || !this.masterGain) return;

    if (!mute && this.ctx.state === 'suspended') void this.ctx.resume();
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.36, this.ctx.currentTime, 0.025);
  }

  getMuteState() {
    return this.isMuted;
  }

  updateTension(tension: number) {
    this.currentTension = Math.min(100, Math.max(0, tension));
    if (!this.ctx || !this.droneGain || !this.droneFilter) return;

    const nowMs = performance.now();
    if (nowMs - this.lastTensionAutomationAt < 90) return;
    this.lastTensionAutomationAt = nowMs;

    const ratio = this.currentTension / 100;
    const now = this.ctx.currentTime;
    this.droneGain.gain.setTargetAtTime(0.08 + ratio * 0.17, now, 0.22);
    this.droneFilter.frequency.setTargetAtTime(105 + ratio * 210, now, 0.28);

    const firstOscillator = this.droneOscillators[0];
    const secondOscillator = this.droneOscillators[1];
    firstOscillator?.frequency.setTargetAtTime(48 + ratio * 14, now, 0.35);
    secondOscillator?.frequency.setTargetAtTime(48.55 + ratio * 15.5, now, 0.35);
  }

  playFlashlightClick() {
    const ctx = this.ensureReadyContext();
    if (!ctx || this.isMuted) return;

    this.playTone({
      frequency: 1850,
      endFrequency: 115,
      duration: 0.055,
      gain: 0.16,
      type: 'square',
      filterFrequency: 2200,
    });
    this.playTone({
      frequency: 92,
      endFrequency: 55,
      duration: 0.07,
      gain: 0.08,
      type: 'triangle',
      delay: 0.015,
      filterFrequency: 180,
    });
  }

  playGlitch() {
    const ctx = this.ensureReadyContext();
    if (!ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = ctx.currentTime;
      const source = ctx.createBufferSource();
      source.buffer = this.createNoiseBuffer(0.18);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(680, now);
      filter.frequency.exponentialRampToValueAtTime(2600, now + 0.16);
      filter.Q.setValueAtTime(2.8, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.21, now + 0.008);
      gain.gain.setValueAtTime(0.035, now + 0.055);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start(now);
      source.stop(now + 0.19);
    } catch {
      // A failed synthetic accent should never interrupt the game loop.
    }
  }

  playNotification() {
    const ctx = this.ensureReadyContext();
    if (!ctx || this.isMuted) return;

    this.playTone({
      frequency: 783.99,
      endFrequency: 1046.5,
      duration: 0.13,
      gain: 0.055,
      type: 'sine',
      filterFrequency: 2400,
    });
    this.playTone({
      frequency: 1174.66,
      duration: 0.18,
      gain: 0.035,
      type: 'sine',
      delay: 0.075,
      filterFrequency: 3000,
    });
  }

  playCaptureSuccess() {
    const ctx = this.ensureReadyContext();
    if (!ctx || !this.masterGain || this.isMuted) return;

    this.playTone({
      frequency: 2060,
      endFrequency: 2380,
      duration: 0.1,
      gain: 0.09,
      type: 'sine',
      filterFrequency: 3800,
    });

    try {
      const now = ctx.currentTime + 0.045;
      const source = ctx.createBufferSource();
      source.buffer = this.createNoiseBuffer(0.11);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(950, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.105);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start(now);
      source.stop(now + 0.12);
    } catch {
      // Ignore transient Web Audio errors.
    }
  }

  playStinger() {
    const ctx = this.ensureReadyContext();
    if (!ctx || !this.masterGain || this.isMuted) return;

    const now = ctx.currentTime;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(170, now);
    filter.frequency.exponentialRampToValueAtTime(1450, now + 0.95);
    filter.Q.setValueAtTime(3.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.75);
    filter.connect(gain);
    gain.connect(this.masterGain);

    [61, 62.4, 109].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = index === 2 ? 'triangle' : 'sawtooth';
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * (index === 2 ? 3.1 : 3.7),
        now + 1.28,
      );
      oscillator.connect(filter);
      oscillator.start(now);
      oscillator.stop(now + 1.8);
    });

    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.5);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(390, now);
    noiseFilter.Q.setValueAtTime(1.4, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.08, now + 0.18);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.51);
  }

  playFootstep(isRunning: boolean) {
    const ctx = this.ensureReadyContext();
    if (!ctx || !this.masterGain || this.isMuted) return;

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(isRunning ? 105 : 82, now);
    oscillator.frequency.exponentialRampToValueAtTime(18, now + 0.115);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isRunning ? 190 : 145, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(isRunning ? 0.19 : 0.105, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  }

  stop() {
    if (this.heartbeatTimer !== null) {
      window.clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.droneOscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        // Already stopped.
      }
    });
    this.droneOscillators = [];

    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }

    this.masterGain = null;
    this.droneGain = null;
    this.droneFilter = null;
  }

  private ensureReadyContext() {
    this.init();
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private startDrone() {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.09, now);
    this.droneGain.connect(this.masterGain);

    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(115, now);
    this.droneFilter.Q.setValueAtTime(5.2, now);
    this.droneFilter.connect(this.droneGain);

    const frequencies = [48, 48.55, 24.15];
    const types: OscillatorType[] = ['sawtooth', 'sine', 'triangle'];
    this.droneOscillators = frequencies.map((frequency, index) => {
      const oscillator = this.ctx!.createOscillator();
      oscillator.type = types[index];
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.connect(this.droneFilter!);
      oscillator.start(now);
      return oscillator;
    });
  }

  private scheduleHeartbeat() {
    if (this.heartbeatTimer !== null) return;

    const tick = () => {
      this.heartbeatTimer = null;
      if (!this.ctx) return;

      if (this.currentTension >= 24 && !this.isMuted) {
        this.playHeartbeatBeat();
      }

      const delay =
        this.currentTension < 24
          ? 900
          : Math.max(330, 1320 - this.currentTension * 9.3);
      this.heartbeatTimer = window.setTimeout(tick, delay);
    };

    this.heartbeatTimer = window.setTimeout(tick, 720);
  }

  private playHeartbeatBeat() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const intensity = 0.045 + (this.currentTension / 100) * 0.17;
    this.playTone({
      frequency: 63,
      endFrequency: 34,
      duration: 0.19,
      gain: intensity,
      type: 'sine',
      filterFrequency: 105,
    });
    this.playTone({
      frequency: 56,
      endFrequency: 30,
      duration: 0.16,
      gain: intensity * 0.72,
      type: 'sine',
      delay: 0.14,
      filterFrequency: 95,
    });
  }

  private playTone(options: ToneOptions) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const startAt = this.ctx.currentTime + (options.delay ?? 0);
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      oscillator.type = options.type ?? 'sine';
      oscillator.frequency.setValueAtTime(Math.max(0.01, options.frequency), startAt);
      if (options.endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(
          Math.max(0.01, options.endFrequency),
          startAt + options.duration,
        );
      }

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(options.filterFrequency ?? 3000, startAt);
      gain.gain.setValueAtTime(0.001, startAt);
      gain.gain.linearRampToValueAtTime(options.gain, startAt + (options.attack ?? 0.006));
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + options.duration);

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      oscillator.start(startAt);
      oscillator.stop(startAt + options.duration + 0.02);
    } catch {
      // Ignore transient Web Audio errors.
    }
  }

  private createNoiseBuffer(duration: number) {
    if (!this.ctx) return null;

    const frameCount = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, frameCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;

    for (let index = 0; index < frameCount; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.62 + white * 0.38;
      data[index] = previous;
    }

    return buffer;
  }
}

export const AudioSynth = new SoundSynthesizer();
