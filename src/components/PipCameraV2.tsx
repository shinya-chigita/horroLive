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
import {
  Anomaly,
  AnomalyDirectorPhase,
  BoardId,
  GameItem,
  PlayerState,
  RiskTier,
} from '../types';
import {
  PIP_PERSPECTIVE_HEIGHT,
  PIP_PERSPECTIVE_WIDTH,
  renderPipPerspectiveScene,
} from '../utils/pipPerspectiveScene';
import {
  canonicalSceneHistory,
  createSceneSnapshot,
  SceneSnapshot,
} from '../game/sceneSnapshot';
import {
  CameraCaptureTarget,
  evaluatePipCapture,
  PIP_CAPTURE_FRAME_HEIGHT_RATIO,
  PIP_CAPTURE_FRAME_WIDTH_RATIO,
} from '../game/capture';
import { getActivePipCameraEffect } from '../game/anomalyPresentation';
import {
  createSyntheticThreatCaptureTarget,
  getViewerThreatCameraPresentation,
  getViewerThreatProfile,
} from '../game/viewerThreat';

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
  boardId: BoardId;
  runId: string;
  loopCount?: number;
  riskTier?: RiskTier;
  reducedMotion?: boolean;
  isPaused?: boolean;
  climaxActive?: boolean;
}

interface FeedMetadata {
  anomaly: Anomaly | null;
  distance: number;
  tension: number;
  flashlightOn: boolean;
  riskTier: RiskTier;
  reducedMotion: boolean;
  isPaused: boolean;
  climaxActive: boolean;
}

interface CanonicalFallback {
  boardId: BoardId;
  player?: PlayerState;
  anomalies?: Anomaly[];
  items?: GameItem[];
}

interface DisplayedTelemetry {
  flashlightOn: boolean;
  battery: number;
  facing: PlayerState['facing'];
  pitchDegrees: number;
}

const WIDTH = PIP_PERSPECTIVE_WIDTH;
const HEIGHT = PIP_PERSPECTIVE_HEIGHT;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function fallbackSnapshot(
  now: number,
  fallback: CanonicalFallback,
): SceneSnapshot | null {
  if (!fallback.player || !fallback.anomalies || !fallback.items) return null;
  return createSceneSnapshot({
    timestamp: now,
    boardId: fallback.boardId,
    player: fallback.player,
    anomalies: fallback.anomalies,
    items: fallback.items,
    mouse: {
      x: fallback.player.facing > 0 ? 560 : 80,
      y: 150 + Math.sin(fallback.player.flashlightAngle) * 220,
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
  boardId,
  runId,
  loopCount = 0,
  riskTier = 0,
  reducedMotion = false,
  isPaused = false,
  climaxActive = false,
}: PipCameraV2Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loopCountRef = useRef(loopCount);
  const feedRef = useRef<FeedMetadata>({
    anomaly: currentAnomaly,
    distance: anomalyDistance,
    tension,
    flashlightOn,
    riskTier,
    reducedMotion,
    isPaused,
    climaxActive,
  });
  const canonicalFallbackRef = useRef<CanonicalFallback>({
    boardId,
    player,
    anomalies,
    items,
  });
  const captureTimerRef = useRef<number | null>(null);
  const mistimeUntilRef = useRef(0);
  const displayedTargetRef = useRef<CameraCaptureTarget | null>(null);
  const targetChangeRef = useRef(onTargetChange);
  const [captureFeedback, setCaptureFeedback] = useState<string | null>(null);
  const [displayedTarget, setDisplayedTarget] =
    useState<CameraCaptureTarget | null>(null);
  const initialTelemetry: DisplayedTelemetry = {
    flashlightOn,
    battery: Math.max(0, Math.ceil(player?.battery ?? 0)),
    facing: player?.facing ?? 1,
    pitchDegrees: Math.round(((player?.flashlightAngle ?? 0) * 180) / Math.PI),
  };
  const displayedTelemetryRef = useRef(initialTelemetry);
  const [displayedTelemetry, setDisplayedTelemetry] =
    useState<DisplayedTelemetry>(initialTelemetry);

  feedRef.current = {
    anomaly: currentAnomaly,
    distance: anomalyDistance,
    tension,
    flashlightOn,
    riskTier,
    reducedMotion,
    isPaused,
    climaxActive,
  };
  canonicalFallbackRef.current = { boardId, player, anomalies, items };
  loopCountRef.current = loopCount;
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
    sceneCanvas.width = WIDTH;
    sceneCanvas.height = HEIGHT;
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
    let focusBlurUntil = 0;
    let pausedAt: number | null = null;
    const firedCameraEffects = new Set<string>();
    const phaseByAnomaly = new Map<string, AnomalyDirectorPhase>();
    canonicalFallbackRef.current.anomalies?.forEach((anomaly) => {
      phaseByAnomaly.set(
        anomaly.id,
        anomaly.directorState?.phase ?? 'DORMANT',
      );
    });

    ctx.fillStyle = '#030504';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const render = (now: number) => {
      animationId = window.requestAnimationFrame(render);
      const metadata = feedRef.current;
      if (metadata.isPaused) {
        if (pausedAt === null) pausedAt = now;
        return;
      }
      if (pausedAt !== null) {
        const pausedFor = Math.max(0, now - pausedAt);
        if (frozenUntil > pausedAt) frozenUntil += pausedFor;
        if (focusBlurUntil > pausedAt) focusBlurUntil += pausedFor;
        previousFrame = now;
        pausedAt = null;
      }

      canonicalFallbackRef.current.anomalies?.forEach((anomaly) => {
        const phase = anomaly.directorState?.phase ?? 'DORMANT';
        const previousPhase = phaseByAnomaly.get(anomaly.id) ?? 'DORMANT';
        if (phase !== previousPhase) {
          const effect = getActivePipCameraEffect({
            boardId,
            anomaly,
            previousPhase,
            reducedEffects: metadata.reducedMotion,
          });
          if (effect && !firedCameraEffects.has(effect.key)) {
            firedCameraEffects.add(effect.key);
            frozenUntil = Math.max(frozenUntil, now + effect.durationMs);
            focusBlurUntil = Math.max(
              focusBlurUntil,
              frozenUntil + (metadata.reducedMotion ? 0 : 160),
            );
          }
        }
        phaseByAnomaly.set(anomaly.id, phase);
      });

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

      // A camera-only ACTIVE transition deliberately holds the last TELEGRAPH frame.
      if (now < frozenUntil) return;

      // The slow wave avoids a mechanically fixed delay while remaining 400–700ms.
      const delayMs = 550 + Math.sin(now / 2800) * 150;
      let snapshot =
        canonicalSceneHistory.atOrBefore(now - delayMs) ??
        fallbackSnapshot(now - delayMs, canonicalFallbackRef.current);
      if (snapshot?.boardId !== boardId) {
        snapshot = fallbackSnapshot(now - delayMs, canonicalFallbackRef.current);
      }
      if (!snapshot) return;

      const nextTelemetry: DisplayedTelemetry = {
        flashlightOn:
          snapshot.player.flashlightOn && snapshot.player.battery > 0,
        battery: Math.max(0, Math.ceil(snapshot.player.battery)),
        facing: snapshot.player.facing,
        pitchDegrees: Math.round(
          (snapshot.player.flashlightAngle * 180) / Math.PI,
        ),
      };
      const previousTelemetry = displayedTelemetryRef.current;
      if (
        previousTelemetry.flashlightOn !== nextTelemetry.flashlightOn ||
        previousTelemetry.battery !== nextTelemetry.battery ||
        previousTelemetry.facing !== nextTelemetry.facing ||
        previousTelemetry.pitchDegrees !== nextTelemetry.pitchDegrees
      ) {
        displayedTelemetryRef.current = nextTelemetry;
        setDisplayedTelemetry(nextTelemetry);
      }

      const anomalyTarget = evaluatePipCapture(
        snapshot,
        metadata.riskTier,
        loopCountRef.current,
      );
      const threatProfile = getViewerThreatProfile(metadata.riskTier);
      const threatPresentation = getViewerThreatCameraPresentation(
        threatProfile,
        loopCountRef.current,
      );
      const syntheticThreatTarget = createSyntheticThreatCaptureTarget(
        threatProfile,
        metadata.climaxActive,
        snapshot.player,
        loopCountRef.current,
        snapshot.boardId,
      );
      const nextTarget = syntheticThreatTarget.targetId
        ? syntheticThreatTarget
        : anomalyTarget;
      const previousTarget = displayedTargetRef.current;
      if (
        !previousTarget ||
        previousTarget.targetId !== nextTarget.targetId ||
        previousTarget.reason !== nextTarget.reason ||
        previousTarget.distance !== nextTarget.distance ||
        previousTarget.isFramed !== nextTarget.isFramed ||
        previousTarget.projection?.centerX !== nextTarget.projection?.centerX ||
        previousTarget.projection?.centerY !== nextTarget.projection?.centerY ||
        previousTarget.projection?.width !== nextTarget.projection?.width ||
        previousTarget.projection?.height !== nextTarget.projection?.height
      ) {
        displayedTargetRef.current = nextTarget;
        setDisplayedTarget(nextTarget);
        targetChangeRef.current?.(nextTarget);
      }

      renderPipPerspectiveScene({
        ctx: sceneCtx,
        snapshot,
        riskTier: metadata.riskTier,
        loopCount: loopCountRef.current,
        now: snapshot.timestamp,
        viewerThreat: threatPresentation,
      });

      const exposureWave = metadata.reducedMotion
        ? 0
        : Math.sin(now / (310 - distortion * 90)) *
          (0.025 + distortion * 0.085);
      const exposure =
        (snapshot.player.flashlightOn ? 1.06 : 1.08) + exposureWave;

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#020403';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.globalAlpha = 1;
      const blurActive =
        now < focusBlurUntil || now < mistimeUntilRef.current;
      ctx.filter = `${blurActive ? 'blur(0.9px) ' : ''}brightness(${clamp(exposure, 0.84, 1.16)}) contrast(1.04)`;
      ctx.drawImage(
        sceneCanvas,
        0,
        0,
        WIDTH,
        HEIGHT,
      );
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = snapshot.player.flashlightOn
        ? 'rgba(35,53,43,0.07)'
        : 'rgba(45,78,62,0.14)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.globalCompositeOperation = 'source-over';

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

      if (
        !metadata.reducedMotion &&
        distortion > 0.35 &&
        Math.random() < 0.05 + distortion * 0.11
      ) {
        const stripY = Math.floor(Math.random() * HEIGHT);
        const stripHeight = 1 + Math.floor(Math.random() * (3 + distortion * 10));
        const sourceY = stripY;
        const sourceHeight = stripHeight;
        const displacement = Math.round((Math.random() - 0.5) * (5 + distortion * 19));
        ctx.globalAlpha = 0.2 + distortion * 0.38;
        ctx.drawImage(
          sceneCanvas,
          0,
          sourceY,
          WIDTH,
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

      ctx.restore();
    };

    animationId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(animationId);
      displayedTargetRef.current = null;
      targetChangeRef.current?.(null);
    };
  }, [boardId, runId]);

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
  const captureReady = displayedTarget?.canCapture === true;
  const captureUnavailable = displayedTarget?.reason === 'BATTERY_EMPTY';
  const projectedTargetStyle: React.CSSProperties | undefined =
    displayedTarget?.projection
      ? {
          left: `${clamp(
            (displayedTarget.projection.centerX /
              displayedTarget.projection.viewportWidth) *
              100,
            4,
            96,
          )}%`,
          top: `${clamp(
            (displayedTarget.projection.centerY /
              displayedTarget.projection.viewportHeight) *
              100,
            6,
            94,
          )}%`,
          width: `${clamp(
            (displayedTarget.projection.width /
              displayedTarget.projection.viewportWidth) *
              100,
            10,
            30,
          )}%`,
          height: `${clamp(
            (displayedTarget.projection.height /
              displayedTarget.projection.viewportHeight) *
              100,
            16,
            62,
          )}%`,
          transform: 'translate(-50%, -50%)',
        }
      : undefined;

  return (
    <section
      className="screen-frame relative aspect-video min-h-[220px] overflow-hidden border border-white/10 bg-black"
      aria-label={`${boardId} delayed camera feed`}
    >
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="pixel-canvas h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 crt-scanlines opacity-25" />
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
        <div
          className={`absolute border transition ${captureReady ? 'border-red-700/35' : tracked ? 'border-zinc-300/24' : 'border-zinc-500/12'}`}
          style={{
            width: `${PIP_CAPTURE_FRAME_WIDTH_RATIO * 100}%`,
            height: `${PIP_CAPTURE_FRAME_HEIGHT_RATIO * 100}%`,
          }}
          aria-hidden="true"
        >
          <span className="absolute -left-px -top-px h-2 w-2 border-l border-t border-current" />
          <span className="absolute -right-px -top-px h-2 w-2 border-r border-t border-current" />
          <span className="absolute -bottom-px -left-px h-2 w-2 border-b border-l border-current" />
          <span className="absolute -bottom-px -right-px h-2 w-2 border-b border-r border-current" />
        </div>
        <Crosshair
          className={`h-7 w-7 transition ${tracked ? 'text-zinc-200 opacity-80' : 'text-zinc-500 opacity-20'}`}
          strokeWidth={1}
        />
      </div>
      {tracked && (
        <div
          className="pointer-events-none absolute border border-zinc-300/55"
          style={projectedTargetStyle}
        >
          <span className="absolute -top-4 left-0 whitespace-nowrap font-mono text-[6px] uppercase tracking-[0.12em] text-zinc-400">
            face? // confidence 0.41
          </span>
          <span className="absolute -left-px -top-px h-2 w-2 border-l-2 border-t-2 border-zinc-200" />
          <span className="absolute -right-px -top-px h-2 w-2 border-r-2 border-t-2 border-zinc-200" />
          <span className="absolute -bottom-px -left-px h-2 w-2 border-b-2 border-l-2 border-zinc-200" />
          <span className="absolute -bottom-px -right-px h-2 w-2 border-b-2 border-r-2 border-zinc-200" />
        </div>
      )}
      {!tracked && riskTier >= 1 && (
        <>
          <div className="pointer-events-none absolute left-[24%] top-[28%] h-9 w-7 border border-zinc-400/25">
            <span className="absolute -top-3 left-0 font-mono text-[5px] uppercase tracking-[0.08em] text-zinc-500/70">
              face?
            </span>
          </div>
          {riskTier >= 3 && (
            <div className="pointer-events-none absolute right-[7%] top-[18%] h-14 w-10 border border-red-700/35">
              <span className="absolute -bottom-3 right-0 whitespace-nowrap font-mono text-[5px] tracking-[0.08em] text-red-700/70">
                NO SUBJECT
              </span>
            </div>
          )}
        </>
      )}
      <div className="pip-telemetry pointer-events-none absolute bottom-2.5 left-2.5 space-y-1 font-mono text-[6px] uppercase tracking-[0.12em] text-zinc-600">
        <p className="flex items-center gap-1">
          <Radio className="h-2.5 w-2.5" />
          {displayedTelemetry.flashlightOn ? 'LOW LIGHT' : 'IR GAIN +18'} / DVR 0.4–0.7s
        </p>
        <p className="flex items-center gap-1">
          <BatteryMedium className="h-2.5 w-2.5" /> RIG {displayedTelemetry.battery}%
        </p>
        <p>
          VIEW {displayedTelemetry.facing === -1 ? '←' : '→'} / PITCH {displayedTelemetry.pitchDegrees}°
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
