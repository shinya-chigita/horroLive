/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Flashlight, Search, Zap } from 'lucide-react';
import { CHAPTERS } from '../types';
import type {
  Anomaly,
  AnomalyDirectorPhase,
  AnomalyDirectorState,
  BoardId,
  Chapter,
  GameItem,
  PlayerState,
  RiskTier,
} from '../types';
import {
  advanceAnomalyDirector,
  createAnomalyDirectorState,
  getAnomalyRuntimeDefinition,
  isAnomalyThreatening,
} from '../game/anomalyDirector';
import { getItemWorldPositions, getSceneDefinitionAt } from '../game/sceneDefinitions';
import { AudioSynth } from '../utils/audio';
import {
  PIXEL_VIEW_HEIGHT,
  PIXEL_VIEW_WIDTH,
  renderPixelScene,
} from '../utils/pixelScene';
import {
  aimTargetToPoint,
  pointerToAimTarget,
  smoothAim,
} from '../game/aim';
import { getViewerThreatTensionFloor } from '../game/viewerThreat';
import { selectPrototypeScareType } from '../game/improvementPrototype';
import { applyScareTension } from '../game/tension';

interface MainGameViewProps {
  key?: React.Key;
  player: PlayerState;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerState>>;
  anomalies: Anomaly[];
  onAnomaliesUpdate: React.Dispatch<React.SetStateAction<Anomaly[]>>;
  items: GameItem[];
  onAddLog: (logText: string) => void;
  onPickupItem: (itemId: string) => void;
  onTriggerScare: (type: 'jumpscare' | 'chase' | 'whisper') => void;
  currentChapterId: number;
  onChapterComplete: () => void;
  onCaptureAnomaly: () => void;
  boardId?: BoardId;
  boardLabel?: string;
  chapters?: readonly Chapter[];
  worldEnd?: number;
  riskTier?: RiskTier;
  loopCount?: number;
  batteryDrainMultiplier?: number;
  telegraphDurationMultiplier?: number;
  activeWindowMultiplier?: number;
  onAnomalyCue?: (
    anomaly: Anomaly,
    phase: AnomalyDirectorPhase,
    previousPhase: AnomalyDirectorPhase,
  ) => void;
  isPaused?: boolean;
  climaxActive?: boolean;
  onExit?: () => void;
  reducedMotion?: boolean;
  hidePlayer?: boolean;
  improvementPrototype?: boolean;
  chaseActive?: boolean;
}

const ENGAGED_PHASES: ReadonlySet<AnomalyDirectorPhase> = new Set([
  'TELEGRAPH',
  'ACTIVE',
  'RECORDED',
  'IGNORED',
  'MISSED',
  'AFTERMATH',
]);

const AIM_ORIGIN = {
  x: PIXEL_VIEW_WIDTH * 0.42,
  y: 199,
} as const;

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
};

const setPressed = (
  keys: React.MutableRefObject<Record<string, boolean>>,
  key: string,
  value: boolean,
) => {
  keys.current[key] = value;
};

export default function MainGameView({
  player,
  setPlayer,
  anomalies,
  onAnomaliesUpdate,
  items,
  onAddLog,
  onPickupItem,
  onTriggerScare,
  currentChapterId,
  onChapterComplete,
  onCaptureAnomaly,
  boardId = 'hospital',
  boardLabel = '廃病院「白鳴霊園付属病棟」',
  chapters = CHAPTERS,
  worldEnd = 5_000,
  riskTier = 0,
  loopCount = 0,
  batteryDrainMultiplier = 1,
  telegraphDurationMultiplier = 1,
  activeWindowMultiplier = 1,
  onAnomalyCue,
  isPaused = false,
  climaxActive = false,
  onExit,
  reducedMotion = false,
  hidePlayer = false,
  improvementPrototype = false,
  chaseActive = false,
}: MainGameViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysPressed = useRef<Record<string, boolean>>({});
  const mousePos = useRef({ x: PIXEL_VIEW_WIDTH * 0.72, y: PIXEL_VIEW_HEIGHT * 0.52 });
  const actualAimPointRef = useRef(
    aimTargetToPoint({ facing: player.facing, pitch: player.flashlightAngle }, AIM_ORIGIN),
  );
  const activeAimPointerIdRef = useRef<number | null>(null);
  const pointerAimedRef = useRef(false);
  const velocityRef = useRef(0);
  const playerRef = useRef(player);
  const itemsRef = useRef(items);
  const anomaliesRef = useRef(anomalies);
  const updateAnomaliesRef = useRef(onAnomaliesUpdate);
  const directorStatesRef = useRef<Record<string, AnomalyDirectorState>>({});
  const simulationNowRef = useRef(0);
  const chapterRef = useRef(currentChapterId);
  const inspectRef = useRef<() => void>(() => undefined);
  const captureRef = useRef(onCaptureAnomaly);
  const pausedRef = useRef(isPaused);
  const riskTierRef = useRef(riskTier);
  const loopCountRef = useRef(loopCount);
  const chaseActiveRef = useRef(chaseActive);
  const pendingScareRef = useRef<'jumpscare' | 'chase' | 'whisper' | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    updateAnomaliesRef.current = onAnomaliesUpdate;
  }, [onAnomaliesUpdate]);

  useEffect(() => {
    riskTierRef.current = riskTier;
  }, [riskTier]);

  useEffect(() => {
    loopCountRef.current = loopCount;
  }, [loopCount]);

  useEffect(() => {
    chaseActiveRef.current = chaseActive;
  }, [chaseActive]);

  useEffect(() => {
    let needsParentSync = false;
    const nextStates: Record<string, AnomalyDirectorState> = {};
    const hydrated = anomalies.map((anomaly) => {
      const fallbackSceneId = getSceneDefinitionAt(anomaly.x, boardId).id;
      const definition = getAnomalyRuntimeDefinition(anomaly.id, fallbackSceneId);
      const stored = directorStatesRef.current[anomaly.id];
      const incoming = anomaly.directorState;
      const state =
        incoming && (!stored || incoming.transitionCount > stored.transitionCount)
          ? incoming
          : stored ?? incoming ?? createAnomalyDirectorState(anomaly.id, simulationNowRef.current);
      nextStates[anomaly.id] = state;
      const resolution = state.resolution;
      const sceneId = anomaly.sceneId ?? definition.sceneId;
      if (
        anomaly.sceneId !== sceneId ||
        anomaly.directorState !== state ||
        anomaly.resolution !== resolution
      ) {
        needsParentSync = true;
        return { ...anomaly, sceneId, directorState: state, resolution };
      }
      return anomaly;
    });

    directorStatesRef.current = nextStates;
    anomaliesRef.current = hydrated;

    if (needsParentSync) {
      updateAnomaliesRef.current((previous) =>
        previous.map((anomaly) => {
          const hydratedAnomaly = hydrated.find((candidate) => candidate.id === anomaly.id);
          if (!hydratedAnomaly) return anomaly;
          return {
            ...anomaly,
            sceneId: hydratedAnomaly.sceneId,
            directorState: hydratedAnomaly.directorState,
            resolution: hydratedAnomaly.resolution,
          };
        }),
      );
    }
  }, [anomalies, boardId]);

  useEffect(() => {
    chapterRef.current = currentChapterId;
  }, [currentChapterId]);

  useEffect(() => {
    captureRef.current = onCaptureAnomaly;
  }, [onCaptureAnomaly]);

  useEffect(() => {
    pausedRef.current = isPaused;
    if (isPaused) clearKeys();
  }, [isPaused]);

  const clearKeys = () => {
    keysPressed.current = {};
  };

  const handleInspect = () => {
    const currentX = playerRef.current.x;
    if (climaxActive && currentX >= worldEnd - 180) {
      onExit?.();
      return;
    }
    const itemPositions = getItemWorldPositions(boardId);
    const target = itemsRef.current.find((item) => {
      if (item.found) return false;
      const itemX = itemPositions[item.id];
      return itemX !== undefined && Math.abs(currentX - itemX) < 72;
    });

    if (target) {
      onPickupItem(target.id);
      return;
    }

    onAddLog('ここには記録できるものはない。');
  };

  useEffect(() => {
    inspectRef.current = handleInspect;
  }, [boardId, climaxActive, items, onAddLog, onExit, onPickupItem, player.x, worldEnd]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (pausedRef.current) return;
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      setPressed(keysPressed, key, true);

      if (
        key === ' ' ||
        key === 'arrowup' ||
        key === 'arrowdown' ||
        key === 'arrowleft' ||
        key === 'arrowright'
      ) {
        event.preventDefault();
      }

      if (event.repeat) return;

      if (key === 'f') {
        setPlayer((previous) => {
          if (previous.battery <= 0 && !previous.flashlightOn) return previous;
          AudioSynth.playFlashlightClick();
          const next = { ...previous, flashlightOn: !previous.flashlightOn };
          playerRef.current = next;
          return next;
        });
      } else if (key === 'e') {
        inspectRef.current();
      } else if (key === ' ') {
        captureRef.current();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.key) return;
      setPressed(keysPressed, event.key.toLowerCase(), false);
    };

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') clearKeys();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [setPlayer]);

  useEffect(() => {
    let animationId = 0;
    let previousAt = performance.now();
    let footstepDistance = 0;

    const getRuntimeDefinition = (anomaly: Anomaly) => {
      const fallbackSceneId =
        anomaly.sceneId ?? getSceneDefinitionAt(anomaly.x, boardId).id;
      const definition = getAnomalyRuntimeDefinition(
        anomaly.id,
        fallbackSceneId,
      );
      return {
        ...definition,
        telegraphDurationMs: Math.round(
          definition.telegraphDurationMs * telegraphDurationMultiplier,
        ),
        activeWindowMs: Math.round(
          definition.activeWindowMs * activeWindowMultiplier,
        ),
      };
    };

    const announceTransition = (
      anomaly: Anomaly,
      previous: AnomalyDirectorState,
      next: AnomalyDirectorState,
    ) => {
      if (previous.phase === next.phase) return;
      switch (next.phase) {
        case 'TELEGRAPH':
          onAddLog(`【予兆】${anomaly.description}の気配が、映像の端に混じった。`);
          onAnomalyCue?.(anomaly, next.phase, previous.phase);
          break;
        case 'ACTIVE':
          onAddLog(`【異常検知】${anomaly.description}。今なら記録できる。`);
          onAnomalyCue?.(anomaly, next.phase, previous.phase);
          {
            const scareType = selectPrototypeScareType({
              improvementPrototype,
              anomalyX: anomaly.x,
              worldEnd,
              currentChapterId: chapterRef.current,
              totalChapters: chapters.length,
            });
            // The previous parent setState was overwritten later in this RAF.
            // Queue the authored scare here so both existing runs and the
            // prototype apply the intended tension change exactly once.
            pendingScareRef.current = scareType;
            onTriggerScare(scareType);
          }
          break;
        case 'IGNORED':
          onAddLog(`【見送り】${anomaly.description}を記録せず、その場を離れた。`);
          onAnomalyCue?.(anomaly, next.phase, previous.phase);
          break;
        case 'MISSED':
          onAddLog(`【記録失敗】${anomaly.description}の撮影可能時間を逃した。`);
          onAnomalyCue?.(anomaly, next.phase, previous.phase);
          break;
      }
    };

    const mergeRuntimeState = (
      anomaly: Anomaly,
      states: Readonly<Record<string, AnomalyDirectorState>>,
    ): Anomaly => {
      const state = states[anomaly.id];
      if (!state) return anomaly;
      const definition = getRuntimeDefinition(anomaly);
      const sceneId = anomaly.sceneId ?? definition.sceneId;
      if (
        anomaly.sceneId === sceneId &&
        anomaly.directorState === state &&
        anomaly.resolution === state.resolution
      ) {
        return anomaly;
      }
      return {
        ...anomaly,
        sceneId,
        directorState: state,
        resolution: state.resolution,
      };
    };

    const commitRuntimeStates = (
      states: Readonly<Record<string, AnomalyDirectorState>>,
    ) => {
      directorStatesRef.current = { ...states };
      anomaliesRef.current = anomaliesRef.current.map((anomaly) =>
        mergeRuntimeState(anomaly, states),
      );
      updateAnomaliesRef.current((previous) =>
        previous.map((anomaly) => mergeRuntimeState(anomaly, states)),
      );
    };

    const advanceRuntime = (nowMs: number, playerX: number) => {
      const currentAnomalies = anomaliesRef.current;
      const currentSceneId = getSceneDefinitionAt(playerX, boardId).id;
      const nextStates = { ...directorStatesRef.current };
      let changed = false;

      const advanceOne = (anomaly: Anomaly) => {
        const state = nextStates[anomaly.id];
        if (!state) return;
        const definition = getRuntimeDefinition(anomaly);
        const next = advanceAnomalyDirector(state, definition, {
          nowMs,
          sceneId: currentSceneId,
          distance: Math.abs(playerX - anomaly.x),
          distancePast: playerX - anomaly.x,
          captured: anomaly.captured,
        });
        if (next === state) return;
        nextStates[anomaly.id] = next;
        changed = true;
        announceTransition(anomaly, state, next);
      };

      // Camera capture is owned by AppV2. Reconcile that external result before
      // selecting the next event so it cannot race a timeout or leave state active.
      currentAnomalies.forEach((anomaly) => {
        const state = nextStates[anomaly.id];
        if (anomaly.captured && state && state.resolution === null) advanceOne(anomaly);
      });

      const withRuntime = currentAnomalies.map((anomaly) =>
        mergeRuntimeState(anomaly, nextStates),
      );
      const engaged = withRuntime.find((anomaly) => {
        const phase = anomaly.directorState?.phase;
        return phase ? ENGAGED_PHASES.has(phase) : false;
      });

      if (engaged) {
        advanceOne(engaged);
      } else {
        const candidate = withRuntime
          .filter((anomaly) => {
            if (anomaly.captured || anomaly.directorState?.phase !== 'DORMANT') return false;
            if (anomaly.visibleOnlyInPip && riskTierRef.current < 1) return false;
            const definition = getRuntimeDefinition(anomaly);
            return (
              definition.sceneId === currentSceneId &&
              Math.abs(playerX - anomaly.x) <= definition.telegraphDistance
            );
          })
          .sort((left, right) => {
            const leftDefinition = getRuntimeDefinition(left);
            const rightDefinition = getRuntimeDefinition(right);
            return (
              rightDefinition.priority - leftDefinition.priority ||
              Math.abs(playerX - left.x) - Math.abs(playerX - right.x)
            );
          })[0];
        if (candidate) advanceOne(candidate);
      }

      if (changed) commitRuntimeStates(nextStates);
    };

    const tick = (now: number) => {
      animationId = window.requestAnimationFrame(tick);
      if (pausedRef.current) {
        previousAt = now;
        return;
      }
      const elapsedMs = now - previousAt;
      if (elapsedMs < 28) return;
      const dt = Math.min(0.05, Math.max(0.001, elapsedMs / 1000));
      previousAt = now;
      simulationNowRef.current += elapsedMs;

      const left = keysPressed.current.a || keysPressed.current.arrowleft;
      const right = keysPressed.current.d || keysPressed.current.arrowright;
      const run = Boolean(keysPressed.current.shift);
      const crouch = Boolean(
        keysPressed.current.s || keysPressed.current.arrowdown || keysPressed.current.control,
      );

      const current = playerRef.current;
      const direction = left === right ? 0 : left ? -1 : 1;
      const targetSpeed = crouch ? 48 : run ? 192 : 108;
      const targetVelocity = direction * targetSpeed;
      const velocityResponse = direction === 0 ? 0.055 : 0.085;
      const velocityAlpha = 1 - Math.exp(-dt / velocityResponse);
      let velocity = velocityRef.current +
        (targetVelocity - velocityRef.current) * velocityAlpha;
      if (direction === 0 && Math.abs(velocity) < 2) velocity = 0;
      velocityRef.current = velocity;
      const deltaX = velocity * dt;
      const nextX = Math.max(0, Math.min(worldEnd, current.x + deltaX));
      const isRunning = Math.abs(velocity) > 142 && run && !crouch;
      const isCrouching = crouch;

      const pointerTarget = pointerToAimTarget(
        mousePos.current,
        AIM_ORIGIN,
        current.facing,
      );
      const movementTarget = {
        facing: (direction < 0 ? -1 : 1) as PlayerState['facing'],
        pitch: current.flashlightAngle,
      };
      const targetAim =
        direction !== 0 && !pointerAimedRef.current
          ? movementTarget
          : pointerTarget;
      const nextAim = smoothAim(
        { facing: current.facing, pitch: current.flashlightAngle },
        targetAim,
        dt,
      );
      actualAimPointRef.current = aimTargetToPoint(nextAim, AIM_ORIGIN);

      if (direction !== 0) {
        footstepDistance += Math.abs(deltaX);
        const stepLength = isRunning ? 28 : isCrouching ? 46 : 36;
        if (footstepDistance >= stepLength) {
          AudioSynth.playFootstep(isRunning);
          footstepDistance = 0;
        }
      } else {
        footstepDistance = 0;
      }

      const drainPerSecond = current.flashlightOn
        ? isRunning
          ? 0.78
          : isCrouching
            ? 0.3
            : 0.46
        : 0;
      const nextBattery = Math.max(
        0,
        current.battery - drainPerSecond * batteryDrainMultiplier * dt,
      );

      const chapter = chapters.find(
        (candidate) => candidate.id === chapterRef.current,
      );
      if (chapter && nextX >= chapter.endPos) {
        // Let AppV2 resolve gates/checkpoints before the director observes the
        // next scene. A locked boundary may rewind the player this same frame.
        onChapterComplete();
        return;
      }

      advanceRuntime(simulationNowRef.current, nextX);

      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const anomaly of anomaliesRef.current) {
        if (isAnomalyThreatening(anomaly)) {
          nearestDistance = Math.min(nearestDistance, Math.abs(nextX - anomaly.x));
        }
      }

      let targetTension = improvementPrototype
        ? getViewerThreatTensionFloor(riskTierRef.current)
        : 9;
      if (nearestDistance < 640) {
        targetTension = Math.max(
          targetTension,
          9 + ((640 - nearestDistance) / 640) * 82,
        );
      }
      if (!current.flashlightOn && nextX > 1100) targetTension = Math.min(100, targetTension * 1.48);
      if (isRunning && nearestDistance < 420) targetTension = Math.min(100, targetTension + 7);
      if (chaseActiveRef.current) {
        targetTension = Math.max(targetTension, Math.abs(velocity) < 72 ? 100 : 96);
      }
      let nextTension = current.tension +
        (targetTension - current.tension) * Math.min(1, dt * 3.6);
      const pendingScare = pendingScareRef.current;
      pendingScareRef.current = null;
      if (pendingScare) {
        nextTension = applyScareTension(
          nextTension,
          pendingScare,
          reducedMotion,
        );
      }
      AudioSynth.updateTension(nextTension);

      const next: PlayerState = {
        ...current,
        x: nextX,
        speed: Math.abs(velocity),
        isRunning,
        isCrouching,
        facing: nextAim.facing,
        flashlightAngle: nextAim.pitch,
        battery: nextBattery,
        tension: nextTension,
      };

      playerRef.current = next;
      setPlayer(next);
    };

    animationId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationId);
  }, [
    activeWindowMultiplier,
    batteryDrainMultiplier,
    boardId,
    chapters,
    improvementPrototype,
    onAddLog,
    onAnomalyCue,
    onChapterComplete,
    onTriggerScare,
    reducedMotion,
    setPlayer,
    telegraphDurationMultiplier,
    worldEnd,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationId = 0;
    let previousFrame = 0;

    const render = (now: number) => {
      animationId = window.requestAnimationFrame(render);
      if (now - previousFrame < 32) return;
      previousFrame = now;
      const moving = Boolean(
        keysPressed.current.a ||
          keysPressed.current.arrowleft ||
          keysPressed.current.d ||
          keysPressed.current.arrowright,
      );

      renderPixelScene({
        ctx,
        player: playerRef.current,
        anomalies: anomaliesRef.current,
        items: itemsRef.current,
        mouse: actualAimPointRef.current,
        now,
        isMoving: moving,
        boardId,
        riskTier: riskTierRef.current,
        loopCount: loopCountRef.current,
        reducedMotion,
        hidePlayer,
      });
    };

    animationId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(animationId);
  }, [boardId, hidePlayer, reducedMotion]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest('.mobile-game-controls')
    ) {
      return;
    }
    if (
      event.pointerType !== 'mouse' &&
      activeAimPointerIdRef.current !== event.pointerId
    ) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const fit = window.getComputedStyle(canvas).objectFit;
    const scaleForWidth = rect.width / PIXEL_VIEW_WIDTH;
    const scaleForHeight = rect.height / PIXEL_VIEW_HEIGHT;
    const scale = fit === 'cover'
      ? Math.max(scaleForWidth, scaleForHeight)
      : Math.min(scaleForWidth, scaleForHeight);
    const renderedWidth = PIXEL_VIEW_WIDTH * scale;
    const renderedHeight = PIXEL_VIEW_HEIGHT * scale;
    const offsetX = (rect.width - renderedWidth) / 2;
    const offsetY = (rect.height - renderedHeight) / 2;
    const localX = Math.max(
      0,
      Math.min(renderedWidth, event.clientX - rect.left - offsetX),
    );
    const localY = Math.max(
      0,
      Math.min(renderedHeight, event.clientY - rect.top - offsetY),
    );
    mousePos.current = {
      x: localX / scale,
      y: localY / scale,
    };
    pointerAimedRef.current = true;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest('.mobile-game-controls')
    ) {
      return;
    }
    activeAimPointerIdRef.current = event.pointerId;
    handlePointerMove(event);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    containerRef.current?.focus();
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activeAimPointerIdRef.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activeAimPointerIdRef.current = null;
  };

  const holdKey = (key: string, value: boolean) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setPressed(keysPressed, key, value);
    if (value) event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const toggleFlashlight = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setPlayer((previous) => {
      if (previous.battery <= 0 && !previous.flashlightOn) return previous;
      AudioSynth.playFlashlightClick();
      const next = { ...previous, flashlightOn: !previous.flashlightOn };
      playerRef.current = next;
      return next;
    });
  };

  return (
    <section
      id="main-game-viewport"
      ref={containerRef}
      tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocused(false);
          clearKeys();
        }
      }}
      onClick={() => containerRef.current?.focus()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className="screen-frame relative isolate w-full overflow-hidden border border-white/10 bg-black outline-none transition-colors focus:border-stone-500/55"
      aria-label={`${boardLabel}探索画面`}
    >
      <canvas
        ref={canvasRef}
        width={PIXEL_VIEW_WIDTH}
        height={PIXEL_VIEW_HEIGHT}
        className="pixel-canvas block aspect-[64/30] w-full bg-black"
      />

      <div className="pointer-events-none absolute inset-0 crt-scanlines opacity-[0.18]" />
      <div className="pointer-events-none absolute inset-0 pixel-screen-vignette" />

      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 border border-white/10 bg-black/72 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.15em] text-zinc-500">
        <span className="h-1.5 w-1.5 bg-red-700" />
        player feed / ch-{currentChapterId.toString().padStart(2, '0')}
      </div>

      <div className="pointer-events-none absolute right-3 top-3 border border-white/10 bg-black/72 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-600">
        pos {Math.round(player.x).toString().padStart(4, '0')} / {worldEnd}
      </div>

      {!isFocused && (
        <div className="absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center bg-black/76 px-6 text-center backdrop-blur-[1px]">
          <div className="mb-4 h-9 w-9 border border-stone-500/50 p-2">
            <div className="h-full w-full bg-red-800/70" />
          </div>
          <p className="font-serif text-base font-semibold tracking-[0.12em] text-zinc-200">
            画面をクリックして操作を有効化
          </p>
          <p className="mt-2 max-w-sm text-[10px] leading-5 text-zinc-600">
            カーソルで懐中電灯を向け、A / Dで廊下を探索します。
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 hidden items-end gap-1.5 xl:flex">
        {[
          ['A / D', '移動'],
          ['SHIFT', '走る'],
          ['F', '灯り'],
          ['E', '調査'],
          ['SPACE', '撮影'],
        ].map(([key, label]) => (
          <div key={key} className="border border-white/10 bg-black/68 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-zinc-600">
            <span className="text-zinc-300">{key}</span> {label}
          </div>
        ))}
      </div>

      <div className="mobile-game-controls absolute z-20 flex items-end justify-between xl:hidden">
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="左へ移動"
            onPointerDown={holdKey('arrowleft', true)}
            onPointerUp={holdKey('arrowleft', false)}
            onPointerCancel={holdKey('arrowleft', false)}
            onPointerLeave={holdKey('arrowleft', false)}
            className="flex h-11 w-11 items-center justify-center border border-white/16 bg-black/76 text-zinc-300 active:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="右へ移動"
            onPointerDown={holdKey('arrowright', true)}
            onPointerUp={holdKey('arrowright', false)}
            onPointerCancel={holdKey('arrowright', false)}
            onPointerLeave={holdKey('arrowright', false)}
            className="flex h-11 w-11 items-center justify-center border border-white/16 bg-black/76 text-zinc-300 active:bg-zinc-800"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onPointerDown={holdKey('shift', true)}
            onPointerUp={holdKey('shift', false)}
            onPointerCancel={holdKey('shift', false)}
            onPointerLeave={holdKey('shift', false)}
            className="flex h-11 min-w-11 items-center justify-center border border-white/12 bg-black/76 px-2 text-zinc-400 active:text-white"
            aria-label="走る"
          >
            <Zap className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleFlashlight}
            className="flex h-11 min-w-11 items-center justify-center border border-white/12 bg-black/76 px-2 text-zinc-400 active:text-white"
            aria-label="懐中電灯を切り替える"
          >
            <Flashlight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleInspect();
            }}
            className="flex h-11 min-w-11 items-center justify-center border border-white/12 bg-black/76 px-2 text-zinc-400 active:text-white"
            aria-label="調べる"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              captureRef.current();
            }}
            className="flex h-11 min-w-11 items-center justify-center border border-red-900/50 bg-red-950/50 px-2 text-red-300 active:bg-red-900/70"
            aria-label="撮影する"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {player.tension > 72 && (
        <div
          className="pointer-events-none absolute inset-0 border border-red-900/50"
          style={{ opacity: Math.min(0.8, (player.tension - 70) / 34) }}
        />
      )}
    </section>
  );
}
