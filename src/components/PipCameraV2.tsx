/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { BatteryMedium, Camera, Crosshair, Radio, Signal, SignalLow, WifiOff } from 'lucide-react';
import { Anomaly } from '../types';

interface PipCameraV2Props {
  currentAnomaly: Anomaly | null;
  anomalyDistance: number;
  tension: number;
  flashlightOn: boolean;
  onCaptureAnomaly: () => void;
  canCapture: boolean;
}

interface FeedSnapshot {
  anomaly: Anomaly | null;
  distance: number;
  tension: number;
  flashlightOn: boolean;
}

const WIDTH = 320;
const HEIGHT = 180;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const hash = (value: number) => {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function drawCorridor(ctx: CanvasRenderingContext2D, flashlightOn: boolean, distortion: number, now: number) {
  ctx.fillStyle = flashlightOn ? '#0e1311' : '#050706';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = flashlightOn
    ? `rgba(145,151,139,${0.11 + distortion * 0.035})`
    : `rgba(98,113,105,${0.07 + distortion * 0.025})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(120, 65);
  ctx.moveTo(WIDTH, 0);
  ctx.lineTo(200, 65);
  ctx.moveTo(0, HEIGHT);
  ctx.lineTo(120, 110);
  ctx.moveTo(WIDTH, HEIGHT);
  ctx.lineTo(200, 110);
  ctx.stroke();
  ctx.fillStyle = '#080b09';
  ctx.fillRect(120, 65, 80, 48);
  ctx.strokeStyle = 'rgba(158,161,147,0.08)';
  ctx.strokeRect(120.5, 65.5, 79, 47);
  for (let x = 26; x < WIDTH; x += 54) {
    ctx.fillStyle = '#111512';
    ctx.fillRect(x, 42, 25, 76);
    ctx.fillStyle = '#171b17';
    ctx.fillRect(x + 3, 46, 19, 68);
    ctx.fillStyle = '#080a08';
    ctx.fillRect(x + 7, 55, 11, 2);
    ctx.fillRect(x + 7, 62, 11, 2);
  }
  const beam = ctx.createRadialGradient(160, 91, 5, 160, 91, flashlightOn ? 128 : 68);
  beam.addColorStop(0, flashlightOn ? 'rgba(199,187,153,0.16)' : 'rgba(105,135,124,0.08)');
  beam.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = beam;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const frame = Math.floor(now / 120);
  for (let i = 0; i < 16; i += 1) {
    const seed = frame * 31 + i * 19;
    if (hash(seed) > 0.54) {
      ctx.fillStyle = `rgba(206,210,196,${0.018 + hash(seed * 1.7) * 0.035})`;
      ctx.fillRect(Math.floor(hash(seed * 2.1) * WIDTH), Math.floor(hash(seed * 2.9) * HEIGHT), 1, 1);
    }
  }
}

function drawCameraAnomaly(ctx: CanvasRenderingContext2D, anomaly: Anomaly, distance: number, now: number) {
  if (anomaly.captured) return;
  const proximity = clamp((560 - distance) / 500, 0, 1);
  if (proximity <= 0) return;
  const jitterX = Math.round(Math.sin(now / 79) * (1 + proximity * 3));
  const jitterY = Math.round(Math.cos(now / 127) * 2);
  const x = 163 + jitterX;
  const y = 91 + jitterY;
  const opacity = 0.08 + proximity * 0.52;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.imageSmoothingEnabled = false;
  if (anomaly.type === 'ghost') {
    ctx.fillStyle = '#b4b6aa';
    ctx.fillRect(x - 8, y - 42, 16, 17);
    ctx.fillStyle = '#0b0d0c';
    ctx.fillRect(x - 5, y - 37, 2, 4);
    ctx.fillRect(x + 3, y - 37, 2, 4);
    ctx.fillRect(x - 2, y - 29, 4, 3);
    ctx.fillStyle = '#080a09';
    ctx.fillRect(x - 12, y - 25, 24, 52);
    ctx.fillRect(x - 17, y + 4, 34, 27);
  } else if (anomaly.type === 'shadow') {
    ctx.fillStyle = '#020303';
    ctx.fillRect(x - 22, y - 45, 44, 76);
    ctx.fillRect(x - 30, y - 18, 60, 49);
    if (distance < 230) {
      ctx.fillStyle = '#6e1717';
      ctx.fillRect(x - 7, y - 24, 2, 2);
      ctx.fillRect(x + 5, y - 24, 2, 2);
    }
  } else if (anomaly.type === 'orb') {
    const radius = 7 + Math.round(Math.sin(now / 110) * 2);
    const gradient = ctx.createRadialGradient(x, y, 1, x, y, radius * 3);
    gradient.addColorStop(0, 'rgba(228,231,213,0.92)');
    gradient.addColorStop(0.25, 'rgba(137,156,146,0.48)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius * 3, y - radius * 3, radius * 6, radius * 6);
  } else if (anomaly.type === 'writing') {
    ctx.font = 'bold 13px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8c3931';
    ctx.fillText('お前の名前', x, y);
  } else {
    ctx.fillStyle = '#a79b87';
    ctx.fillRect(x - 7, y - 28, 14, 13);
    ctx.fillStyle = '#111312';
    ctx.fillRect(x - 9, y - 32, 18, 6);
    ctx.fillStyle = '#302b27';
    ctx.fillRect(x - 7, y - 15, 14, 30);
  }
  ctx.restore();
}

function PipCameraV2({
  currentAnomaly,
  anomalyDistance,
  tension,
  flashlightOn,
  onCaptureAnomaly,
  canCapture,
}: PipCameraV2Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const feedRef = useRef<FeedSnapshot>({ anomaly: currentAnomaly, distance: anomalyDistance, tension, flashlightOn });
  const captureTimerRef = useRef<number | null>(null);
  const [captureFeedback, setCaptureFeedback] = useState<string | null>(null);
  feedRef.current = { anomaly: currentAnomaly, distance: anomalyDistance, tension, flashlightOn };

  const signal = useMemo(() => {
    if (tension > 88) return { label: 'LOST', icon: WifiOff, className: 'text-red-700 border-red-900/55' };
    if (tension > 66) return { label: 'CRITICAL', icon: SignalLow, className: 'text-red-700 border-red-900/45' };
    if (tension > 34) return { label: 'WEAK', icon: SignalLow, className: 'text-amber-800 border-amber-900/35' };
    return { label: 'STABLE', icon: Signal, className: 'text-zinc-500 border-white/10' };
  }, [tension]);

  const tracked = Boolean(currentAnomaly && !currentAnomaly.captured && anomalyDistance < 390 && flashlightOn);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 80;
    noiseCanvas.height = 45;
    const noiseCtx = noiseCanvas.getContext('2d');
    const noiseImage = noiseCtx?.createImageData(80, 45) ?? null;
    let animationId = 0;
    let previousFrame = 0;
    let lastNoiseAt = 0;
    let frozenUntil = 0;

    const render = (now: number) => {
      animationId = window.requestAnimationFrame(render);
      const snapshot = feedRef.current;
      const distortion = clamp(snapshot.tension / 100, 0, 1);
      const frameInterval = 48 + distortion * 28;
      if (now - previousFrame < frameInterval) return;
      previousFrame = now;
      if (now < frozenUntil) return;
      if (snapshot.tension > 55 && Math.random() < 0.025 + distortion * 0.055) {
        frozenUntil = now + 70 + Math.random() * (120 + distortion * 260);
        return;
      }
      drawCorridor(ctx, snapshot.flashlightOn, distortion, now);
      if (snapshot.anomaly && snapshot.distance < 560) drawCameraAnomaly(ctx, snapshot.anomaly, snapshot.distance, now);
      if (noiseCtx && noiseImage && now - lastNoiseAt > 70 - distortion * 22) {
        lastNoiseAt = now;
        const pixels = noiseImage.data;
        const intensity = 0.05 + distortion * 0.33;
        for (let index = 0; index < pixels.length; index += 4) {
          const active = Math.random() < intensity;
          const value = active ? Math.floor(65 + Math.random() * 150) : 0;
          pixels[index] = value;
          pixels[index + 1] = value;
          pixels[index + 2] = value;
          pixels[index + 3] = active ? Math.floor(22 + distortion * 88) : 0;
        }
        noiseCtx.putImageData(noiseImage, 0, 0);
      }
      if (noiseImage) {
        ctx.save();
        ctx.globalAlpha = 0.16 + distortion * 0.32;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(noiseCanvas, 0, 0, WIDTH, HEIGHT);
        ctx.restore();
      }
      for (let y = 0; y < HEIGHT; y += 3) {
        ctx.fillStyle = `rgba(0,0,0,${0.2 + distortion * 0.08})`;
        ctx.fillRect(0, y, WIDTH, 1);
      }
      if (snapshot.tension > 45 && Math.random() < 0.08 + distortion * 0.08) {
        const glitchY = Math.floor(Math.random() * HEIGHT);
        const glitchH = 1 + Math.floor(Math.random() * (3 + distortion * 10));
        ctx.fillStyle = `rgba(187,194,181,${0.06 + distortion * 0.18})`;
        ctx.fillRect(0, glitchY, WIDTH, glitchH);
        if (distortion > 0.62) {
          ctx.fillStyle = `rgba(92,20,24,${0.06 + distortion * 0.12})`;
          ctx.fillRect(3, glitchY + 1, WIDTH - 3, 1);
        }
      }
      const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 34, WIDTH / 2, HEIGHT / 2, 190);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.84)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    };

    animationId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => () => {
    if (captureTimerRef.current !== null) window.clearTimeout(captureTimerRef.current);
  }, []);

  const handleCapture = () => {
    if (!canCapture) return;
    onCaptureAnomaly();
    setCaptureFeedback('RECORDED');
    if (captureTimerRef.current !== null) window.clearTimeout(captureTimerRef.current);
    captureTimerRef.current = window.setTimeout(() => {
      setCaptureFeedback(null);
      captureTimerRef.current = null;
    }, 1100);
  };

  const SignalIcon = signal.icon;
  const confidence = tracked ? Math.round(clamp(100 - anomalyDistance / 7.5, 62, 98)) : 0;

  return (
    <section className="screen-frame relative aspect-video min-h-[220px] overflow-hidden border border-white/10 bg-black">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="pixel-canvas h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 crt-scanlines opacity-25" />
      <div className="pointer-events-none absolute inset-0 pixel-screen-vignette" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
        <div className="flex items-center gap-1.5 border border-white/10 bg-black/75 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.14em] text-zinc-400">
          <span className="h-1.5 w-1.5 bg-red-700" /> rec / cam-01
        </div>
        <div className={`flex items-center gap-1.5 border bg-black/75 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.12em] ${signal.className}`}>
          <SignalIcon className="h-2.5 w-2.5" /> {signal.label}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Crosshair className={`h-7 w-7 transition ${tracked ? 'text-zinc-200 opacity-80' : 'text-zinc-500 opacity-20'}`} strokeWidth={1} />
      </div>
      {tracked && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-16 -translate-x-1/2 -translate-y-[56%] border border-zinc-300/55">
          <span className="absolute -top-4 left-0 whitespace-nowrap font-mono text-[6px] uppercase tracking-[0.12em] text-zinc-400">subject? {confidence}%</span>
          <span className="absolute -left-px -top-px h-2 w-2 border-l-2 border-t-2 border-zinc-200" />
          <span className="absolute -right-px -top-px h-2 w-2 border-r-2 border-t-2 border-zinc-200" />
          <span className="absolute -bottom-px -left-px h-2 w-2 border-b-2 border-l-2 border-zinc-200" />
          <span className="absolute -bottom-px -right-px h-2 w-2 border-b-2 border-r-2 border-zinc-200" />
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2.5 left-2.5 space-y-1 font-mono text-[6px] uppercase tracking-[0.12em] text-zinc-600">
        <p className="flex items-center gap-1"><Radio className="h-2.5 w-2.5" /> {flashlightOn ? 'LOW LIGHT' : 'IR GAIN +18'}</p>
        <p className="flex items-center gap-1"><BatteryMedium className="h-2.5 w-2.5" /> CAM 88%</p>
        <p>DIST {anomalyDistance > 9000 ? '---' : `${Math.round(anomalyDistance)}u`}</p>
      </div>
      <button
        type="button"
        onClick={handleCapture}
        disabled={!canCapture}
        className={`absolute bottom-2.5 right-2.5 z-20 inline-flex items-center gap-1.5 border px-2.5 py-2 font-mono text-[7px] font-semibold uppercase tracking-[0.12em] transition active:translate-y-px ${canCapture ? 'border-red-800/70 bg-red-950/45 text-red-300 hover:bg-red-900/55' : 'cursor-not-allowed border-white/8 bg-black/70 text-zinc-700'}`}
        aria-label="怪異を撮影"
      >
        <Camera className="h-3 w-3" /> {canCapture ? 'capture' : 'out of range'}
      </button>
      {captureFeedback && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-white/75 mix-blend-screen">
          <span className="border border-black bg-black px-4 py-2 font-mono text-[8px] font-semibold tracking-[0.2em] text-white">{captureFeedback}</span>
        </div>
      )}
    </section>
  );
}

export default memo(PipCameraV2);
