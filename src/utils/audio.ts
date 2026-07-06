/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private heartbeatInterval: any = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazy initialize when user interacts
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      
      this.startDrone();
    } catch (e) {
      console.warn("Failed to initialize Web Audio API:", e);
    }
  }

  setMuted(mute: boolean) {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : 0.4, this.ctx.currentTime);
    }
  }

  getMuteState() {
    return this.isMuted;
  }

  private startDrone() {
    if (!this.ctx || !this.masterGain) return;

    try {
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      this.droneGain.connect(this.masterGain);

      // Low frequency rumble
      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = 'sawtooth';
      this.droneOsc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1

      // Detuned second oscillator
      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = 'sine';
      this.droneOsc2.frequency.setValueAtTime(55.8, this.ctx.currentTime);

      // Filter to make it muddy and warm
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, this.ctx.currentTime);
      filter.Q.setValueAtTime(4, this.ctx.currentTime);

      this.droneOsc1.connect(filter);
      this.droneOsc2.connect(filter);
      filter.connect(this.droneGain);

      this.droneOsc1.start();
      this.droneOsc2.start();
    } catch (err) {
      console.error("Drone generation failed:", err);
    }
  }

  updateTension(tension: number) {
    if (!this.ctx || !this.droneGain || !this.masterGain) return;
    const t = tension / 100; // 0 to 1

    // Modulate ambient drone lowpass cutoff based on tension
    if (this.droneOsc1) {
      const frequencyValue = 55 + t * 20; // slide pitch up slightly
      this.droneOsc1.frequency.setTargetAtTime(frequencyValue, this.ctx.currentTime, 0.5);
    }

    // Adjust volume of ambient drone
    const droneVol = 0.12 + t * 0.18;
    this.droneGain.gain.setTargetAtTime(droneVol, this.ctx.currentTime, 0.3);

    // Dynamic heartbeat rate and intensity
    this.updateHeartbeat(tension);
  }

  private updateHeartbeat(tension: number) {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (tension < 10) return;

    // tension 10 -> interval 1200ms
    // tension 100 -> interval 350ms
    const interval = Math.max(350, 1300 - (tension * 9.5));

    this.heartbeatInterval = setInterval(() => {
      this.playHeartbeatBeat(tension);
    }, interval);
  }

  private playHeartbeatBeat(tension: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const time = this.ctx.currentTime;
      const intensity = 0.2 + (tension / 100) * 0.5;

      // Double beat: Thump-thump
      this.triggerThump(time, intensity, 60);
      this.triggerThump(time + 0.15, intensity * 0.8, 55);
    } catch (e) {
      // Ignore
    }
  }

  private triggerThump(startTime: number, intensity: number, baseFreq: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.25);

    gain.gain.setValueAtTime(intensity, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.28);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, startTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 0.3);
  }

  playFlashlightClick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.init(); // Ensure initialized

    try {
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2000, time);
      osc.frequency.setValueAtTime(100, time + 0.01);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.06);
    } catch (e) {}
  }

  playGlitch() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.init();

    try {
      const time = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.15; // 150ms of noise
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, time);
      filter.Q.setValueAtTime(2, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, time);
      gain.gain.setValueAtTime(0.05, time + 0.05);
      gain.gain.setValueAtTime(0.2, time + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noiseNode.start(time);
    } catch (e) {}
  }

  playNotification() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.init();

    try {
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, time); // B5
      osc.frequency.setValueAtTime(1318.51, time + 0.08); // E6

      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.35);
    } catch (e) {}
  }

  playCaptureSuccess() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.init();

    try {
      const time = this.ctx.currentTime;
      
      // Camera beep
      const oscBeep = this.ctx.createOscillator();
      const gainBeep = this.ctx.createGain();
      oscBeep.type = 'sine';
      oscBeep.frequency.setValueAtTime(2200, time);
      gainBeep.gain.setValueAtTime(0.12, time);
      gainBeep.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      oscBeep.connect(gainBeep);
      gainBeep.connect(this.masterGain);
      oscBeep.start(time);
      oscBeep.stop(time + 0.15);

      // Camera shutter white noise burst
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const shutterGain = this.ctx.createGain();
      shutterGain.gain.setValueAtTime(0.18, time + 0.05);
      shutterGain.gain.exponentialRampToValueAtTime(0.001, time + 0.17);

      noise.connect(shutterGain);
      shutterGain.connect(this.masterGain);
      noise.start(time + 0.05);
    } catch (e) {}
  }

  playStinger() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.init();

    try {
      const time = this.ctx.currentTime;
      
      // Terror swell
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const osc3 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(80, time);
      osc1.frequency.exponentialRampToValueAtTime(260, time + 1.2);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(82, time);
      osc2.frequency.exponentialRampToValueAtTime(255, time + 1.2);

      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(150, time);
      osc3.frequency.exponentialRampToValueAtTime(450, time + 1.2);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, time);
      filter.frequency.exponentialRampToValueAtTime(1000, time + 1.0);

      gain.gain.setValueAtTime(0.05, time);
      gain.gain.linearRampToValueAtTime(0.35, time + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 2.0);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(time);
      osc2.start(time);
      osc3.start(time);

      osc1.stop(time + 2.1);
      osc2.stop(time + 2.1);
      osc3.stop(time + 2.1);
    } catch (e) {}
  }

  playFootstep(isRunning: boolean) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.init();

    try {
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, time);
      osc.frequency.exponentialRampToValueAtTime(10, time + 0.12);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, time);

      gain.gain.setValueAtTime(isRunning ? 0.35 : 0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.15);
    } catch (e) {}
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    try {
      if (this.droneOsc1) {
        this.droneOsc1.stop();
        this.droneOsc1 = null;
      }
      if (this.droneOsc2) {
        this.droneOsc2.stop();
        this.droneOsc2 = null;
      }
      if (this.ctx) {
        this.ctx.close();
        this.ctx = null;
      }
    } catch (e) {}
  }
}

export const AudioSynth = new SoundSynthesizer();
