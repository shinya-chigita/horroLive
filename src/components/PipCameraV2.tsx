/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  BatteryMedium,
  Camera,
  Crosshair,
  Radio,
  Signal,
  SignalLow,
  WifiOff,
} from 'lucide-react';
import { Anomaly, GameItem, PlayerState, RiskTier } from '../types';
import {
  PIXEL_VIEW_HEIGHT,
  PIXEL_VIEW_WIDTH,
  renderPixelScene,
} from '../utils/pixelScene';
import {
  canonicalSceneHistory,
  createSceneSnapshot,
  SceneSnapshot,
} from '../game/sceneSnapshot';
import {
  CameraCaptureTarget,
  evaluatePipCapture,
} from '../game/capture';

export interface PipCameraV2Props {
  currentAnomaly: Anomaly | null;
  anomalyDistance: number;
  tension: number;
  flashlightOn: boolean;
  onCaptureAnomaly: (target?: CameraCaptureTarget | null) => boolean | void;
  onTargetChange?: (target: CameraCaptureTarget | null) => void;
  /** Canonical inputs are optional while older callers migrate to the shared renderer. */
  player?: PlayerState;
  anomalies?: Anomaly[];
  items?: GameItem[];
  riskTier?: RiskTier;
  reducedMotion?: boolean;
}

interface FeedMetadata {
  anomaly: Anomaly | null;
  distance: number;
  tension: number;
  flashlightOn: boolean;
  riskTier: RiskTier;
  reducedMotion: boolean;
}

interface CanonicalFallback {
  player?: PlayerState;
  anomalies?: Anomaly[];
  items?: GameItem[];
}

const WIDTH = 320;
const HEIGHT = 180;
const SOURCE_WIDTH = Math.round((PIXEL_VIEW_HEIGHT * 16) / 9);
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function fallbackSnapshot(
  now: number,
  fallback: CanonicalFallback,
): SceneSnapshot | null {
  if (!fallback.player || !fallback.anomalies || !fallback.items) return null;
  const direction = fallback.player.flashlightAngle < -Math.PI / 2 ? -1 : 1;
  return createSceneSnapshot({
    timestamp: now,
    player: fallback.player,
    anomalies: fallback.anomalies,
    items: fallback.items,
    mouse: {
      x: direction > 0 ? PIXEL_VIEW_WIDTH * 0.82 : PIXEL_VIEW_WIDTH * 0.12,
      y: PIXEL_VIEW_HEIGHT * 0.52,
    },
    isMoving: fallback.player.isRunning,
  });
}

function PipCameraV2({
  currentAnomaly,
  anomalyDistance,
  tension,
  flashlightOn,
  onCaptureAnomaly,
  onTargetChange,
  player,
  anomalies,
  items,
  riskTier = 0,
  reducedMotion = false,
}: PipCameraV2Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const feedRef = useRef<FeedMetadata>({
    anomaly: currentAnomaly,
    distance: anomalyDistance,
    tension,
    flashlightOn,
    riskTier,
    reducedMotion,
  });
  const canonicalFallbackRef = useRef<CanonicalFallback>({ player, anomalies, items });
  const captureTimerRef = useRef<number | null>(null);
  const mistimeUntilRef = useRef(0);
  const displayedTargetRef = useRef<CameraCaptureTarget | null>(null);
  const targetChangeRef = useRef(onTargetChange);
  const [captureFeedback, setCaptureFeedback] = useState<string | null>(null);
  const [displayedTarget, setDisplayedTarget] =
    useState<CameraCaptureTarget | null>(null);

  feedRef.current = {
    anomaly: currentAnomaly,
    distance: anomalyDistance,
    tension,
    flashlightOn,
    riskTier,
    reducedMotion,
  };
  canonicalFallbackRef.current = { player, anomalies, items };
  targetChangeRef.current = onTargetChange;

  const signal = useMemo(() => {
    const corruption = Math.max(tension, riskTier * 27);
    if (corruption > 88)
      return {
        label: 'LOST',
        icon: WifiOff,
        className: 'text-red-700 border-red-900/55',
      };
    if (corruption > 66)
      return {
        label: 'CRITICAL',
        icon: SignalLow,
        className: 'text-red-700 border-red-900/45',
      };
    if (corruption > 34)
      return {
        label: 'WEAK',
        icon: SignalLow,
        className: 'text-amber-800 border-amber-900/35',
      };
    return {
      label: 'STABLE',
      icon: Signal,
      className: 'text-zinc-500 border-white/10',
    };
  }, [riskTier, tension]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const sceneCanvas = document.createElement('canvas');
    sceneCanvas.width = PIXEL_VIEW_WIDTH;
    sceneCanvas.height = PIXEL_VIEW_HEIGHT;
    const sceneCtx = sceneCanvas.getContext('2d', { alpha: false });
    if (!sceneCtx) return;

    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 80;
    noiseCanvas.height = 45;
    const noiseCtx = noiseCanvas.getContext('2d');
    const noiseImage = noiseCtx?.createImageData(80, 45) ?? null;

    let animationId = 0;
    let previousFrame = 0;
    let lastNoiseAt = 0;
    let frozenUntil = 0;
    let repeatUntil = 0;
    let focusBlurUntil = 0;
    let heldSnapshot: SceneSnapshot | null = null;

    ctx.fillStyle = '#030504';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const render = (now: number) => {
      animationId = window.requestAnimationFrame(render);
      const metadata = feedRef.current;
      const baseDistortion = clamp(
        Math.max(metadata.tension / 100, metadata.riskTier * 0.18),
        0,
        1,
      );
      const distortion = metadata.reducedMotion
        ? Math.min(baseDistortion, 0.26)
        : baseDistortion;
      const framesPerSecond = 18 - distortion * 6;
      const frameInterval = 1000 / framesPerSecond;
      if (now - previousFrame < frameInterval) return;
      previousFrame = now;

      // Leaving the existing canvas untouched is an intentional frame freeze/repeat.
      if (now < frozenUntil) return;
      if (
        !metadata.reducedMotion &&
        distortion > 0.5 &&
        Math.random() < 0.006 + distortion * 0.026
      ) {
        const freezeDuration = 250 + Math.random() * (160 + distortion * 490);
        frozenUntil = now + freezeDuration;
        focusBlurUntil = frozenUntil + 110 + distortion * 140;
        return;
      }
      if (
        !metadata.reducedMotion &&
        distortion > 0.42 &&
        Math.random() < 0.012 + distortion * 0.035
      ) {
        return;
      }

      let snapshot: SceneSnapshot | null;
      if (heldSnapshot && now < repeatUntil) {
        snapshot = heldSnapshot;
      } else {
        // The slow wave avoids a mechanically fixed delay while remaining 400–700ms.
        const delayMs = 550 + Math.sin(now / 2800) * 150;
        snapshot =
          canonicalSceneHistory.atOrBefore(now - delayMs) ??
          fallbackSnapshot(now - delayMs, canonicalFallbackRef.current);
        if (!snapshot) return;
        heldSnapshot = snapshot;
        if (
          !metadata.reducedMotion &&
          distortion > 0.38 &&
          Math.random() < 0.007 + distortion * 0.019
        ) {
          repeatUntil = now + 120 + Math.random() * (130 + distortion * 310);
        }
      }

      const nextTarget = evaluatePipCapture(snapshot, metadata.riskTier);
      const previousTarget = displayedTargetRef.current;
      if (
        !previousTarget ||
        previousTarget.targetId !== nextTarget.targetId ||
        previousTarget.reason !== nextTarget.reason ||
        previousTarget.distance !== nextTarget.distance ||
        previousTarget.isFramed !== nextTarget.isFramed
      ) {
        displayedTargetRef.current = nextTarget;
        setDisplayedTarget(nextTarget);
        targetChangeRef.current?.(nextTarget);
      }

      renderPixelScene({
        ctx: sceneCtx,
        player: snapshot.player,
        anomalies: snapshot.anomalies.map((anomaly) =>
          anomaly.visibleOnlyInPip && metadata.riskTier === 0
            ? { ...anomaly, captured: true }
            : anomaly,
        ),
        items: snapshot.items,
        mouse: snapshot.mouse,
        now: snapshot.timestamp,
        isMoving: snapshot.isMoving,
        channel: 'pip',
        recordSnapshot: false,
      });

      const lookingRight = snapshot.mouse.x >= PIXEL_VIEW_WIDTH * 0.42;
      const sourceX = lookingRight ? PIXEL_VIEW_WIDTH - SOURCE_WIDTH : 0;
      const exposureWave = metadata.reducedMotion
        ? 0
        : Math.sin(now / (310 - distortion * 90)) *
          (0.025 + distortion * 0.085);
      const exposure =
        (snapshot.player.flashlightOn ? 0.92 : 1.08) + exposureWave;

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#020403';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.globalAlpha = clamp(exposure, 0.68, 1.16);
      ctx.filter =
        now < focusBlurUntil || now < mistimeUntilRef.current
          ? 'blur(0.9px)'
          : 'none';
      ctx.drawImage(
        sceneCanvas,
        sourceX,
        0,
        SOURCE_WIDTH,
        PIXEL_VIEW_HEIGHT,
        0,
        0,
        WIDTH,
        HEIGHT,
      );
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.fillStyle = snapshot.player.flashlightOn
        ? 'rgba(35,53,43,0.13)'
        : 'rgba(45,78,62,0.22)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

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
        ctx.globalAlpha = 0.16 + distortion * 0.32;
        ctx.drawImage(noiseCanvas, 0, 0, WIDTH, HEIGHT);
        ctx.globalAlpha = 1;
      }

      for (let y = 0; y < HEIGHT; y += 3) {
        ctx.fillStyle = `rgba(0,0,0,${0.2 + distortion * 0.08})`;
        ctx.fillRect(0, y, WIDTH, 1);
      }

      if (
        !metadata.reducedMotion &&
        distortion > 0.35 &&
        Math.random() < 0.05 + distortion * 0.11
      ) {
        const stripY = Math.floor(Math.random() * HEIGHT);
        const stripHeight = 1 + Math.floor(Math.random() * (3 + distortion * 10));
        const sourceY = Math.floor((stripY / HEIGHT) * PIXEL_VIEW_HEIGHT);
        const sourceHeight = Math.max(
          1,
          Math.ceil((stripHeight / HEIGHT) * PIXEL_VIEW_HEIGHT),
        );
        const displacement = Math.round((Math.random() - 0.5) * (5 + distortion * 19));
        ctx.globalAlpha = 0.2 + distortion * 0.38;
        ctx.drawImage(
          sceneCanvas,
          sourceX,
          sourceY,
          SOURCE_WIDTH,
          sourceHeight,
          displacement,
          stripY,
          WIDTH,
          stripHeight,
        );
        ctx.globalAlpha = 1;
        if (distortion > 0.62) {
          ctx.fillStyle = `rgba(92,20,24,${0.06 + distortion * 0.12})`;
          ctx.fillRect(3, stripY + 1, WIDTH - 3, 1);
        }
      }

      const vignette = ctx.createRadialGradient(
        WIDTH / 2,
        HEIGHT / 2,
        34,
        WIDTH / 2,
        HEIGHT / 2,
        190,
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.84)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.restore();
    };

    animationId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(animationId);
      displayedTargetRef.current = null;
      targetChangeRef.current?.(null);
    };
  }, []);

  useEffect(
    () => () => {
      if (captureTimerRef.current !== null)
        window.clearTimeout(captureTimerRef.current);
    },
    [],
  );

  const handleCapture = () => {
    const target = displayedTargetRef.current;
    const succeeded = onCaptureAnomaly(target) === true;
    setCaptureFeedback(succeeded ? 'RECORDED' : 'FOCUS LOST');
    if (!succeeded) mistimeUntilRef.current = performance.now() + 520;
    if (captureTimerRef.current !== null)
      window.clearTimeout(captureTimerRef.current);
    captureTimerRef.current = window.setTimeout(() => {
      setCaptureFeedback(null);
      captureTimerRef.current = null;
    }, 1100);
  };

  const SignalIcon = signal.icon;
  const tracked = Boolean(
    displayedTarget?.targetId &&
      displayedTarget.reason !== 'RESOLVED' &&
      displayedTarget.reason !== 'RISK_LOCKED' &&
      displayedTarget.distance !== null &&
      displayedTarget.distance < 390 &&
      displayedTarget.isFramed,
  );
  const confidence = tracked
    ? Math.round(
        clamp(100 - (displayedTarget?.distance ?? 0) / 7.5, 62, 98),
      )
    : 0;
  const captureReady = displayedTarget?.canCapture === true;
  const captureUnavailable = displayedTarget?.reason === 'BATTERY_EMPTY';

  return (
    <section className="screen-frame relative aspect-video min-h-[220px] overflow-hidden border border-white/10 bg-black">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="pixel-canvas h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 crt-scanlines opacity-25" />
      <div className="pointer-events-none absolute inset-0 pixel-screen-vignette" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
        <div className="flex items-center gap-1.5 border border-white/10 bg-black/75 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.14em] text-zinc-400">
          <span className="h-1.5 w-1.5 bg-red-700" /> rec / cam-01
        </div>
        <div
          className={`flex items-center gap-1.5 border bg-black/75 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.12em] ${signal.className}`}
        >
          <SignalIcon className="h-2.5 w-2.5" /> {signal.label}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Crosshair
          className={`h-7 w-7 transition ${tracked ? 'text-zinc-200 opacity-80' : 'text-zinc-500 opacity-20'}`}
          strokeWidth={1}
        />
      </div>
      {tracked && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-16 -translate-x-1/2 -translate-y-[56%] border border-zinc-300/55">
          <span className="absolute -top-4 left-0 whitespace-nowrap font-mono text-[6px] uppercase tracking-[0.12em] text-zinc-400">
            subject? {confidence}%
          </span>
          <span className="absolute -left-px -top-px h-2 w-2 border-l-2 border-t-2 border-zinc-200" />
          <span className="absolute -right-px -top-px h-2 w-2 border-r-2 border-t-2 border-zinc-200" />
          <span className="absolute -bottom-px -left-px h-2 w-2 border-b-2 border-l-2 border-zinc-200" />
          <span className="absolute -bottom-px -right-px h-2 w-2 border-b-2 border-r-2 border-zinc-200" />
        </div>
      )}
      <div className="pip-telemetry pointer-events-none absolute bottom-2.5 left-2.5 space-y-1 font-mono text-[6px] uppercase tracking-[0.12em] text-zinc-600">
        <p className="flex items-center gap-1">
          <Radio className="h-2.5 w-2.5" />
          {flashlightOn ? 'LOW LIGHT' : 'IR GAIN +18'} / DVR 0.4–0.7s
        </p>
        <p className="flex items-center gap-1">
          <BatteryMedium className="h-2.5 w-2.5" /> CAM 88%
        </p>
        <p>
          DIST{' '}
          {displayedTarget?.distance == null
            ? '---'
            : `${Math.round(displayedTarget.distance)}u`}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCapture}
        disabled={captureUnavailable}
        className={`pip-capture-button absolute bottom-2.5 right-2.5 z-20 inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 border px-2.5 py-2 font-mono text-[7px] font-semibold uppercase tracking-[0.12em] transition active:translate-y-px ${captureReady ? 'border-red-800/70 bg-red-950/45 text-red-300 hover:bg-red-900/55' : captureUnavailable ? 'cursor-not-allowed border-white/8 bg-black/70 text-zinc-700' : 'border-white/12 bg-black/75 text-zinc-500 hover:text-zinc-300'}`}
        aria-label="怪異を撮影"
      >
        <Camera className="h-3 w-3" />
        <span className="pip-capture-label">
          {captureReady ? 'capture' : 'focus'}
        </span>
      </button>
      {captureFeedback && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-white/75 mix-blend-screen">
          <span className="border border-black bg-black px-4 py-2 font-mono text-[8px] font-semibold tracking-[0.2em] text-white">
            {captureFeedback}
          </span>
        </div>
      )}
    </section>
  );
}

export default memo(PipCameraV2);
