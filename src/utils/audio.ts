/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private heartbeatTimer: number | null = null;
  private nextHeartbeatAt = 0;
  private tension = 0;
  private isMuted = false;

  init() {
    if (this.ctx) {
      void this.resume();
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.36, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.startDrone();
      this.startHeartbeatScheduler();
      void this.resume();
    } catch (error) {
      console.warn('Failed to initialize Web Audio API:', error);
    }
  }

  setMuted(mute: boolean) {
    this.isMuted = mute;
    if (!this.ctx || !this.masterGain) return;

    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.36, this.ctx.currentTime, 0.025);
  }

  getMuteState() {
    return this.isMuted;
  }

  updateTension(tension: number) {
    this.tension = Math.max(0, Math.min(100, tension));
    if (!this.ctx || !this.droneGain) return;

    const normalized = this.tension / 100;
    const now = this.ctx.currentTime;
    this.droneGain.gain.setTargetAtTime(0.08 + normalized * 0.2, now, 0.35);

    this.droneOscillators.forEach((oscillator, index) => {
      const baseFrequency = index === 0 ? 48 : 48.7;
      oscillator.frequency.setTargetAtTime(baseFrequency + normalized * 17, now, 0.45);
    });
  }

  playFlashlightClick() {
    if (!this.ensureReady()) return;

    const ctx = this.ctx!;
    const masterGain = this.masterGain!;
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(1900, now);
    oscillator.frequency.exponentialRampToValueAtTime(120, now + 0.035);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + 0.06);
  }

  playGlitch() {
    if (!this.ensureReady()) return;

    const ctx = this.ctx!;
    const masterGain = this.masterGain!;
    const now = ctx.currentTime;
    const duration = 0.16;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (index % 17 < 8 ? 1 : 0.2);
    }

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(780, now);
    filter.frequency.exponentialRampToValueAtTime(1800, now + duration);
    filter.Q.setValueAtTime(2.4, now);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.setValueAtTime(0.04, now + 0.045);
    gain.gain.setValueAtTime(0.16, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start(now);
  }

  playNotification() {
    if (!this.ensureReady()) return;

    const ctx = this.ctx!;
    const masterGain = this.masterGain!;
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(987.77, now);
    oscillator.frequency.setValueAtTime(1318.51, now + 0.075);
    gain.gain.setValueAtTime(0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + 0.28);
  }

  playCaptureSuccess() {
    if (!this.ensureReady()) return;

    const ctx = this.ctx!;
    const masterGain = this.masterGain!;
    const now = ctx.currentTime;

    const beep = ctx.createOscillator();
    const beepGain = ctx.createGain();
    beep.type = 'sine';
    beep.frequency.setValueAtTime(2100, now);
    beep.frequency.setValueAtTime(2700, now + 0.055);
    beepGain.gain.setValueAtTime(0.11, now);
    beepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    beep.connect(beepGain);
    beepGain.connect(masterGain);
    beep.start(now);
    beep.stop(now + 0.14);

    const duration = 0.1;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }

    const shutter = ctx.createBufferSource();
    const shutterGain = ctx.createGain();
    shutter.buffer = buffer;
    shutterGain.gain.setValueAtTime(0.13, now + 0.04);
    shutterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    shutter.connect(shutterGain);
    shutterGain.connect(masterGain);
    shutter.start(now + 0.04);
  }

  playStinger() {
    if (!this.ensureReady()) return;

    const ctx = this.ctx!;
    const masterGain = this.masterGain!;
    const now = ctx.currentTime;
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const frequencies = [73, 76.5, 146];

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(170, now);
    filter.frequency.exponentialRampToValueAtTime(1300, now + 0.9);
    filter.Q.setValueAtTime(5, now);

    gain.gain.setValueAtTime(0.025, now);
    gain.gain.linearRampToValueAtTime(0.26, now + 0.33);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.7);

    filter.connect(gain);
    gain.connect(masterGain);

    frequencies.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = index === 2 ? 'triangle' : 'sawtooth';
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * (index === 2 ? 2.6 : 3.2), now + 1.1);
      oscillator.connect(filter);
      oscillator.start(now);
      oscillator.stop(now + 1.75);
    });
  }

  playFootstep(isRunning: boolean) {
    if (!this.ensureReady()) return;

    const ctx = this.ctx!;
    const masterGain = this.masterGain!;
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(isRunning ? 125 : 98, now);
    oscillator.frequency.exponentialRampToValueAtTime(24, now + 0.11);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isRunning ? 170 : 125, now);
    gain.gain.setValueAtTime(isRunning ? 0.24 : 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  }

  stop() {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
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
    }

    this.ctx = null;
    this.masterGain = null;
    this.droneGain = null;
    this.nextHeartbeatAt = 0;
  }

  private ensureReady() {
    if (!this.ctx || !this.masterGain) {
      this.init();
    }

    if (!this.ctx || !this.masterGain || this.isMuted) return false;
    void this.resume();
    return true;
  }

  private async resume() {
    if (this.ctx?.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // The next user gesture will retry.
      }
    }
  }

  private startDrone() {
    if (!this.ctx || !this.masterGain) return;

    const filter = this.ctx.createBiquadFilter();
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.09, this.ctx.currentTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(115, this.ctx.currentTime);
    filter.Q.setValueAtTime(4, this.ctx.currentTime);

    filter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    [48, 48.7].forEach((frequency, index) => {
      const oscillator = this.ctx!.createOscillator();
      oscillator.type = index === 0 ? 'sawtooth' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, this.ctx!.currentTime);
      oscillator.connect(filter);
      oscillator.start();
      this.droneOscillators.push(oscillator);
    });
  }

  private startHeartbeatScheduler() {
    if (this.heartbeatTimer !== null) return;

    this.heartbeatTimer = window.setInterval(() => {
      if (!this.ctx || !this.masterGain || this.isMuted || this.tension < 15) {
        return;
      }

      const now = this.ctx.currentTime;
      if (now < this.nextHeartbeatAt) return;

      const interval = Math.max(0.34, 1.28 - this.tension * 0.0094);
      this.playHeartbeatBeat(this.tension);
      this.nextHeartbeatAt = now + interval;
    }, 80);
  }

  private playHeartbeatBeat(tension: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const intensity = 0.12 + (tension / 100) * 0.32;
    this.triggerThump(now, intensity, 62);
    this.triggerThump(now + 0.14, intensity * 0.74, 54);
  }

  private triggerThump(startTime: number, intensity: number, baseFrequency: number) {
    if (!this.ctx || !this.masterGain) return;

    const oscillator = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(baseFrequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(18, startTime + 0.22);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(90, startTime);
    gain.gain.setValueAtTime(intensity, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.24);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.25);
  }
}

export const AudioSynth = new SoundSynthesizer();
