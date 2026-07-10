/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Focus, ScanLine, Signal, SignalHigh, SignalLow, WifiOff } from 'lucide-react';
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function drawGhost(
  ctx: CanvasRenderingContext2D,
  anomaly: Anomaly,
  distance: number,
  width: number,
  height: number,
  now: number,
) {
  const proximity = clamp((560 - distance) / 500, 0, 1);
  if (proximity <= 0 || anomaly.captured) return;

  const jitter = Math.sin(now / 67) * (2 + proximity * 7);
  const float = Math.cos(now / 180) * 4;
  const centerX = width * 0.52 + jitter;
  const centerY = height * 0.53 + float;

  ctx.save();
  ctx.globalAlpha = 0.08 + proximity * 0.82;
  ctx.shadowBlur = 12 + proximity * 22;
  ctx.shadowColor = anomaly.type === 'orb' ? 'rgba(153,246,228,0.7)' : 'rgba(255,255,255,0.18)';

  if (anomaly.type === 'ghost') {
    const headRadius = 11 + proximity * 7;
    ctx.fillStyle = 'rgba(226,232,240,0.78)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - 30, headRadius, headRadius * 1.18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.96)';
    ctx.beginPath();
    ctx.ellipse(centerX - 5, centerY - 33, 2.4 + proximity, 4 + proximity, 0, 0, Math.PI * 2);
    ctx.ellipse(centerX + 5, centerY - 33, 2.4 + proximity, 4 + proximity, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - 21, 3, 5 + Math.sin(now / 80) * 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(2,6,8,0.94)';
    ctx.beginPath();
    ctx.moveTo(centerX - 17, centerY - 12);
    ctx.quadraticCurveTo(centerX - 30, centerY + 45, centerX - 42, centerY + 88);
    ctx.lineTo(centerX + 40, centerY + 88);
    ctx.quadraticCurveTo(centerX + 28, centerY + 45, centerX + 16, centerY - 12);
    ctx.closePath();
    ctx.fill();
  } else if (anomaly.type === 'shadow') {
    const gradient = ctx.createRadialGradient(centerX, centerY, 3, centerX, centerY, 45 + proximity * 35);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.48, 'rgba(0,0,0,0.92)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 55 + proximity * 38, 82 + proximity * 55, 0, 0, Math.PI * 2);
    ctx.fill();

    if (distance < 260) {
      ctx.fillStyle = `rgba(220,38,38,${0.2 + proximity * 0.65})`;
      ctx.beginPath();
      ctx.arc(centerX - 12, centerY - 16, 2.2, 0, Math.PI * 2);
      ctx.arc(centerX + 12, centerY - 16, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (anomaly.type === 'orb') {
    const pulse = 15 + Math.sin(now / 105) * 4 + proximity * 12;
    const gradient = ctx.createRadialGradient(centerX, centerY, 1, centerX, centerY, pulse * 2.2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.22, 'rgba(153,246,228,0.72)');
    gradient.addColorStop(1, 'rgba(13,148,136,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulse * 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (anomaly.type === 'writing') {
    ctx.fillStyle = 'rgba(220,38,38,0.78)';
    ctx.font = `900 ${14 + proximity * 9}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText('み　て　い　る', centerX, centerY);
  } else {
    ctx.fillStyle = 'rgba(69,10,10,0.92)';
    ctx.beginPath();
    ctx.arc(centerX, centerY - 18, 12 + proximity * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(centerX - 10, centerY - 7, 20, 40 + proximity * 15);
    ctx.strokeStyle = 'rgba(15,15,15,0.95)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX - 7, centerY + 7);
    ctx.lineTo(centerX - 18, centerY + 45);
    ctx.moveTo(centerX + 7, centerY + 7);
    ctx.lineTo(centerX + 18, centerY + 45);
    ctx.stroke();
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
  const feedRef = useRef<FeedSnapshot>({
    anomaly: currentAnomaly,
    distance: anomalyDistance,
    tension,
    flashlightOn,
  });
  const captureTimerRef = useRef<number | null>(null);
  const [captureFeedback, setCaptureFeedback] = useState<string | null>(null);

  feedRef.current = {
    anomaly: currentAnomaly,
    distance: anomalyDistance,
    tension,
    flashlightOn,
  };

  const signal = useMemo(() => {
    if (tension > 88) return { label: 'LOST', icon: WifiOff, className: 'text-red-400 bg-red-950/65 border-red-500/25' };
    if (tension > 66) return { label: 'CRITICAL', icon: SignalLow, className: 'text-red-300 bg-red-950/45 border-red-500/20' };
    if (tension > 34) return { label: 'WEAK', icon: Signal, className: 'text-amber-300 bg-amber-950/35 border-amber-500/20' };
    return { label: 'STABLE', icon: SignalHigh, className: 'text-emerald-300 bg-emerald-950/30 border-emerald-500/20' };
  }, [tension]);

  const faceTracked = Boolean(
    currentAnomaly && !currentAnomaly.captured && anomalyDistance < 380 && flashlightOn,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 80;
    noiseCanvas.height = 60;
    const noiseCtx = noiseCanvas.getContext('2d');
    const noiseImage = noiseCtx?.createImageData(noiseCanvas.width, noiseCanvas.height) ?? null;

    let animationId = 0;
    let previousFrame = 0;
    let lastNoiseAt = 0;

    const render = (now: number) => {
      animationId = window.requestAnimationFrame(render);
      if (now - previousFrame < 32) return;
      previousFrame = now;

      const width = canvas.width;
      const height = canvas.height;
      const snapshot = feedRef.current;
      const distortion = clamp(snapshot.tension / 100, 0, 1);

      const wallGradient = ctx.createLinearGradient(0, 0, 0, height);
      wallGradient.addColorStop(0, snapshot.flashlightOn ? '#10201b' : '#020303');
      wallGradient.addColorStop(0.55, snapshot.flashlightOn ? '#09110f' : '#010101');
      wallGradient.addColorStop(1, '#030404');
      ctx.fillStyle = wallGradient;
      ctx.fillRect(0, 0, width, height);

      if (snapshot.flashlightOn) {
        ctx.save();
        ctx.strokeStyle = `rgba(110,231,183,${0.08 + distortion * 0.03})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width * 0.38, height * 0.36);
        ctx.moveTo(width, 0);
        ctx.lineTo(width * 0.62, height * 0.36);
        ctx.moveTo(0, height);
        ctx.lineTo(width * 0.38, height * 0.64);
        ctx.moveTo(width, height);
        ctx.lineTo(width * 0.62, height * 0.64);
        ctx.rect(width * 0.38, height * 0.36, width * 0.24, height * 0.28);
        ctx.stroke();

        for (let x = -20; x < width + 40; x += 38) {
          const sway = Math.sin(now / 800 + x) * 1.5;
          ctx.beginPath();
          ctx.moveTo(x + sway, height * 0.66);
          ctx.lineTo(width / 2 + (x - width / 2) * 0.23, height * 0.52);
          ctx.stroke();
        }

        const beam = ctx.createRadialGradient(width / 2, height / 2, 8, width / 2, height / 2, width * 0.48);
        beam.addColorStop(0, 'rgba(187,247,208,0.12)');
        beam.addColorStop(0.58, 'rgba(16,185,129,0.035)');
        beam.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = beam;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      if (snapshot.anomaly && snapshot.distance < 560) {
        drawGhost(ctx, snapshot.anomaly, snapshot.distance, width, height, now);
      }

      if (noiseCtx && noiseImage && now - lastNoiseAt > Math.max(55, 95 - distortion * 45)) {
        lastNoiseAt = now;
        const pixels = noiseImage.data;
        const intensity = snapshot.tension > 82 ? 0.44 : snapshot.tension > 58 ? 0.24 : snapshot.tension > 28 ? 0.12 : 0.055;
        for (let index = 0; index < pixels.length; index += 4) {
          const active = Math.random() < intensity;
          const value = active ? Math.floor(Math.random() * 210 + 25) : 0;
          pixels[index] = value;
          pixels[index + 1] = value;
          pixels[index + 2] = value;
          pixels[index + 3] = active ? Math.floor(40 + distortion * 100) : 0;
        }
        noiseCtx.putImageData(noiseImage, 0, 0);
      }

      ctx.save();
      ctx.globalAlpha = 0.16 + distortion * 0.28;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(noiseCanvas, 0, 0, width, height);
      ctx.restore();

      ctx.fillStyle = `rgba(0,0,0,${0.12 + distortion * 0.16})`;
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      if (snapshot.tension > 48 && Math.random() < 0.07 + distortion * 0.1) {
        const glitchY = Math.random() * height;
        const glitchHeight = 2 + Math.random() * (4 + distortion * 16);
        ctx.fillStyle = `rgba(236,253,245,${0.08 + distortion * 0.25})`;
        ctx.fillRect(0, glitchY, width, glitchHeight);
      }

      if (!snapshot.flashlightOn) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, width, height);
      }

      const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.12, width / 2, height / 2, width * 0.67);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.82)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    };

    animationId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(animationId);
  }, []);

  useEffect(
    () => () => {
      if (captureTimerRef.current !== null) window.clearTimeout(captureTimerRef.current);
    },
    [],
  );

  const handleCapture = () => {
    if (!canCapture) return;
    onCaptureAnomaly();
    setCaptureFeedback('ANOMALY RECORDED');

    if (captureTimerRef.current !== null) window.clearTimeout(captureTimerRef.current);
    captureTimerRef.current = window.setTimeout(() => {
      setCaptureFeedback(null);
      captureTimerRef.current = null;
    }, 1350);
  };

  const SignalIcon = signal.icon;
  const confidence = faceTracked ? Math.round(clamp(100 - anomalyDistance / 7, 64, 99)) : 0;

  return (
    <section className="screen-frame relative aspect-[4/3] min-h-[250px] overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.75)]">
      <canvas ref={canvasRef} width={320} height={240} className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 crt-scanlines opacity-20" />
      <div className="pointer-events-none absolute inset-0 border-[10px] border-black/12" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
        <div className="flex items-center gap-2 rounded-md border border-white/8 bg-black/65 px-2.5 py-1.5 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-red-400 backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-600" />
          </span>
          cam-01 / rec
        </div>

        <div className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[8px] font-black uppercase tracking-[0.12em] backdrop-blur-md ${signal.className}`}>
          <SignalIcon className="h-3 w-3" />
          {signal.label}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className={`relative h-11 w-11 transition-all duration-300 ${faceTracked ? 'scale-125 text-emerald-400 opacity-100' : 'text-white opacity-25'}`}>
          <Focus className="h-full w-full" strokeWidth={1.25} />
        </div>
      </div>

      {faceTracked && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-20 -translate-x-1/2 -translate-y-[58%] border border-emerald-400/80 shadow-[0_0_18px_rgba(52,211,153,0.2)]">
          <span className="absolute -left-px -top-px h-3 w-3 border-l-2 border-t-2 border-emerald-300" />
          <span className="absolute -right-px -top-px h-3 w-3 border-r-2 border-t-2 border-emerald-300" />
          <span className="absolute -bottom-px -left-px h-3 w-3 border-b-2 border-l-2 border-emerald-300" />
          <span className="absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 border-emerald-300" />
          <span className="absolute -top-5 left-0 whitespace-nowrap font-mono text-[7px] font-bold text-emerald-300">
            SUBJECT? {confidence}%
          </span>
        </div>
      )}

      {!flashlightOn && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/48">
          <div className="rounded-lg border border-red-500/15 bg-black/70 px-4 py-3 text-center backdrop-blur-sm">
            <WifiOff className="mx-auto h-4 w-4 text-red-500" />
            <p className="mt-2 font-mono text-[8px] font-black uppercase tracking-[0.18em] text-red-400">
              optical feed unavailable
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3.5">
        <div className="space-y-1 font-mono text-[7px] uppercase tracking-[0.12em] text-emerald-300/75">
          <p className="flex items-center gap-1.5"><ScanLine className="h-3 w-3" /> IR / ISO 6400</p>
          <p>DIST {anomalyDistance > 9000 ? '---' : `${Math.round(anomalyDistance)}u`}</p>
        </div>

        <button
          type="button"
          onClick={handleCapture}
          disabled={!canCapture}
          className={`pointer-events-auto inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[8px] font-black uppercase tracking-[0.14em] transition active:scale-95 ${
            canCapture
              ? 'border-red-500/40 bg-red-600 text-white shadow-[0_8px_30px_rgba(220,38,38,0.32)] hover:bg-red-500'
              : 'cursor-not-allowed border-white/8 bg-black/55 text-zinc-600'
          }`}
          aria-label="怪異を撮影"
        >
          <Camera className="h-3.5 w-3.5" />
          {canCapture ? 'capture' : 'out of range'}
        </button>
      </div>

      {captureFeedback && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/80 mix-blend-screen">
          <div className="rounded-md bg-black px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-white">
            {captureFeedback}
          </div>
        </div>
      )}
    </section>
  );
}

export default memo(PipCameraV2);
