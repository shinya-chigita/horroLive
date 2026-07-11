/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Flashlight, Search, Zap } from 'lucide-react';
import { Anomaly, GameItem, PlayerState } from '../types';
import { AudioSynth } from '../utils/audio';
import {
  ITEM_WORLD_POSITIONS,
  PIXEL_VIEW_HEIGHT,
  PIXEL_VIEW_WIDTH,
  renderPixelScene,
} from '../utils/pixelScene';

interface MainGameViewProps {
  player: PlayerState;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerState>>;
  anomalies: Anomaly[];
  onAnomaliesUpdate: (updated: Anomaly[]) => void;
  items: GameItem[];
  onAddLog: (logText: string) => void;
  onPickupItem: (itemId: string) => void;
  onTriggerScare: (type: 'jumpscare' | 'chase' | 'whisper') => void;
  currentChapterId: number;
  onChapterComplete: () => void;
  onCaptureAnomaly: () => void;
}

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
  onAnomaliesUpdate: _onAnomaliesUpdate,
  items,
  onAddLog,
  onPickupItem,
  onTriggerScare,
  currentChapterId,
  onChapterComplete,
  onCaptureAnomaly,
}: MainGameViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysPressed = useRef<Record<string, boolean>>({});
  const mousePos = useRef({ x: PIXEL_VIEW_WIDTH * 0.72, y: PIXEL_VIEW_HEIGHT * 0.52 });
  const playerRef = useRef(player);
  const itemsRef = useRef(items);
  const anomaliesRef = useRef(anomalies);
  const chapterRef = useRef(currentChapterId);
  const inspectRef = useRef<() => void>(() => undefined);
  const captureRef = useRef(onCaptureAnomaly);
  const scareTriggered = useRef<Record<number, boolean>>({});
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    anomaliesRef.current = anomalies;
  }, [anomalies]);

  useEffect(() => {
    chapterRef.current = currentChapterId;
  }, [currentChapterId]);

  useEffect(() => {
    captureRef.current = onCaptureAnomaly;
  }, [onCaptureAnomaly]);

  const clearKeys = () => {
    keysPressed.current = {};
  };

  const handleInspect = () => {
    const currentX = playerRef.current.x;
    const target = itemsRef.current.find((item) => {
      if (item.found) return false;
      const itemX = ITEM_WORLD_POSITIONS[item.id];
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
  }, [items, onAddLog, onPickupItem, player.x]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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

    const tick = (now: number) => {
      animationId = window.requestAnimationFrame(tick);
      const elapsedMs = now - previousAt;
      if (elapsedMs < 28) return;
      const dt = Math.min(0.05, Math.max(0.001, elapsedMs / 1000));
      previousAt = now;

      const left = keysPressed.current.a || keysPressed.current.arrowleft;
      const right = keysPressed.current.d || keysPressed.current.arrowright;
      const run = Boolean(keysPressed.current.shift);
      const crouch = Boolean(
        keysPressed.current.s || keysPressed.current.arrowdown || keysPressed.current.control,
      );

      const current = playerRef.current;
      const direction = left === right ? 0 : left ? -1 : 1;
      const speed = crouch ? 48 : run ? 192 : 108;
      const deltaX = direction * speed * dt;
      const nextX = Math.max(0, Math.min(5000, current.x + deltaX));
      const isRunning = direction !== 0 && run && !crouch;
      const isCrouching = crouch;

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
      const nextBattery = Math.max(0, current.battery - drainPerSecond * dt);

      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const anomaly of anomaliesRef.current) {
        if (!anomaly.captured) {
          nearestDistance = Math.min(nearestDistance, Math.abs(nextX - anomaly.x));
        }
      }

      let targetTension = 9;
      if (nearestDistance < 640) {
        targetTension = 9 + ((640 - nearestDistance) / 640) * 82;
      }
      if (!current.flashlightOn && nextX > 1100) targetTension = Math.min(100, targetTension * 1.48);
      if (isRunning && nearestDistance < 420) targetTension = Math.min(100, targetTension + 7);
      const nextTension = current.tension + (targetTension - current.tension) * Math.min(1, dt * 3.6);
      AudioSynth.updateTension(nextTension);

      const next: PlayerState = {
        ...current,
        x: nextX,
        isRunning,
        isCrouching,
        battery: nextBattery,
        tension: nextTension,
      };

      playerRef.current = next;
      setPlayer(next);

      const chapter = chapterRef.current;
      if (nextX >= 1200 && chapter === 1) onChapterComplete();
      else if (nextX >= 2400 && chapter === 2) onChapterComplete();
      else if (nextX >= 3600 && chapter === 3) onChapterComplete();
      else if (nextX >= 4500 && chapter === 4) onChapterComplete();
      else if (nextX >= 4980 && chapter === 5) onChapterComplete();

      if (nextX > 500 && !scareTriggered.current[500]) {
        scareTriggered.current[500] = true;
        onTriggerScare('whisper');
        onAddLog('左の病室から、配信者と同じ呼吸音が返ってきた。');
      }
      if (nextX > 1600 && !scareTriggered.current[1600]) {
        scareTriggered.current[1600] = true;
        onTriggerScare('jumpscare');
        onAddLog('PIP映像だけが一瞬停止した。停止した画面では誰かが近づいている。');
      }
      if (nextX > 3800 && !scareTriggered.current[3800]) {
        scareTriggered.current[3800] = true;
        onTriggerScare('chase');
        onAddLog('背後の足音が二歩ぶん増えた。立ち止まるな。');
      }
    };

    animationId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationId);
  }, [onAddLog, onChapterComplete, onTriggerScare, setPlayer]);

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
        mouse: mousePos.current,
        now,
        isMoving: moving,
      });
    };

    animationId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(animationId);
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mousePos.current = {
      x: ((event.clientX - rect.left) / rect.width) * PIXEL_VIEW_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * PIXEL_VIEW_HEIGHT,
    };
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
      onPointerMove={handlePointerMove}
      className="screen-frame relative isolate w-full overflow-hidden border border-white/10 bg-black outline-none transition-colors focus:border-stone-500/55"
      aria-label="廃病院探索画面"
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
        pos {Math.round(player.x).toString().padStart(4, '0')} / 5000
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

      <div className="pointer-events-none absolute bottom-3 left-3 hidden items-end gap-1.5 md:flex">
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

      <div className="absolute inset-x-3 bottom-3 z-20 flex items-end justify-between md:hidden">
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
            className="flex h-10 min-w-10 items-center justify-center border border-white/12 bg-black/76 px-2 text-zinc-400 active:text-white"
            aria-label="走る"
          >
            <Zap className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleFlashlight}
            className="flex h-10 min-w-10 items-center justify-center border border-white/12 bg-black/76 px-2 text-zinc-400 active:text-white"
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
            className="flex h-10 min-w-10 items-center justify-center border border-white/12 bg-black/76 px-2 text-zinc-400 active:text-white"
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
            className="flex h-10 min-w-10 items-center justify-center border border-red-900/50 bg-red-950/50 px-2 text-red-300 active:bg-red-900/70"
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
