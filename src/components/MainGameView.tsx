/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { GameItem, Anomaly, PlayerState } from '../types';
import { ArrowLeftRight } from 'lucide-react';
import { AudioSynth } from '../utils/audio';

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

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

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
}: MainGameViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keyboard controls state
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef({ x: 0, y: 0 });

  // Stale-safe refs for real-time calculations and zero-lag render loop
  const playerRef = useRef(player);
  const itemsRef = useRef(items);
  const anomaliesRef = useRef(anomalies);
  const onCaptureAnomalyRef = useRef(onCaptureAnomaly);
  const handleInspectTriggerRef = useRef<() => void>(() => {});

  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { anomaliesRef.current = anomalies; }, [anomalies]);
  useEffect(() => { onCaptureAnomalyRef.current = onCaptureAnomaly; }, [onCaptureAnomaly]);
  const dustParticles = useRef<DustParticle[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Attempt auto-focus on mount
    containerRef.current?.focus();
  }, []);

  // Trigger scare flags to avoid spamming
  const scareTriggered = useRef<{ [pos: number]: boolean }>({});

  // Initialize dust particles
  useEffect(() => {
    const particles: DustParticle[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * 800,
        y: Math.random() * 300,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2
      });
    }
    dustParticles.current = particles;
  }, []);

  // Set up resize observer to keep canvas responsive
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      canvas.width = container.clientWidth;
      canvas.height = 360; // Fixed aesthetic height
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Monitor keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.key) return;
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      // Prevent default scrolling for arrows and space
      if (key === ' ' || key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright') {
        e.preventDefault();
      }

      // Flashlight switch hotkey [F]
      if (key === 'f') {
        setPlayer(prev => {
          AudioSynth.playFlashlightClick();
          return { ...prev, flashlightOn: !prev.flashlightOn };
        });
      }

      // Inspect hotkey [E]
      if (key === 'e') {
        handleInspectTriggerRef.current();
      }

      // Spectral Capture hotkey [SPACE]
      if (key === ' ') {
        onCaptureAnomalyRef.current();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.key) return;
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setPlayer]);

  // Main Physics / Movement / Interaction loop
  useEffect(() => {
    let animationId: number;
    let footstepTimer = 0;

    const tick = () => {
      const isA = keysPressed.current['a'] || keysPressed.current['arrowleft'];
      const isD = keysPressed.current['d'] || keysPressed.current['arrowright'];
      const isShift = keysPressed.current['shift'];
      const isS = keysPressed.current['s'] || keysPressed.current['arrowdown'] || keysPressed.current['control'];

      // Adjust player movement state
      let dx = 0;
      let running = false;
      let crouching = false;

      if (isS) {
        crouching = true;
      }

      if (isA) {
        dx = crouching ? -0.8 : isShift ? -3.2 : -1.8;
        running = isShift && !crouching;
      } else if (isD) {
        dx = crouching ? 0.8 : isShift ? 3.2 : 1.8;
        running = isShift && !crouching;
      }

      // 1. Footstep sound pacing
      if (dx !== 0) {
        footstepTimer += 1;
        const stepRate = running ? 15 : crouching ? 40 : 25;
        if (footstepTimer % stepRate === 0) {
          AudioSynth.playFootstep(running);
        }
      } else {
        footstepTimer = 0;
      }

      // Read current values using playerRef to prevent stale closure bugs!
      const currentVal = playerRef.current;

      // 2. Battery drainage
      let batDrain = 0.005;
      if (running) batDrain = 0.012;
      if (!currentVal.flashlightOn) batDrain = -0.001; 

      const nextX = Math.max(0, Math.min(5000, currentVal.x + dx));
      // Max battery level is 100
      const nextBat = Math.max(0, Math.min(100, currentVal.battery - (currentVal.flashlightOn ? batDrain * 8 : 0)));

      // Handle Chapter Complete boundaries (safely outside of setPlayer)
      if (nextX >= 1200 && currentChapterId === 1) onChapterComplete();
      else if (nextX >= 2400 && currentChapterId === 2) onChapterComplete();
      else if (nextX >= 3600 && currentChapterId === 3) onChapterComplete();
      else if (nextX >= 4500 && currentChapterId === 4) onChapterComplete();
      else if (nextX >= 4980 && currentChapterId === 5) onChapterComplete();

      // 3. Spooky triggers / Scares as player walks past certain marks (safely outside of setPlayer)
      if (nextX > 500 && !scareTriggered.current[500]) {
        scareTriggered.current[500] = true;
        onTriggerScare('whisper');
        onAddLog("カサカサ… 奥の物陰から物音がした。");
      }
      if (nextX > 1600 && !scareTriggered.current[1600]) {
        scareTriggered.current[1600] = true;
        onTriggerScare('jumpscare');
        onAddLog("バタン！ 右上カメラが激しくノイズを起こす！");
      }
      if (nextX > 3800 && !scareTriggered.current[3800]) {
        scareTriggered.current[3800] = true;
        onTriggerScare('chase');
        onAddLog("何かが背後から走ってくる！ 立ち止まるな！");
      }

      // 4. Calculate near entity proximity tension
      let nearAnomalyDist = 9999;
      anomaliesRef.current.forEach(a => {
        if (!a.captured) {
          const dist = Math.abs(nextX - a.x);
          if (dist < nearAnomalyDist) nearAnomalyDist = dist;
        }
      });

      let targetTension = 10;
      if (nearAnomalyDist < 600) {
        targetTension = 10 + ((600 - nearAnomalyDist) / 600) * 80;
      }
      // Double tension if flashlight is off in a dangerous zone
      if (!currentVal.flashlightOn && nextX > 1200) {
        targetTension = Math.min(100, targetTension * 1.5);
      }

      const smoothedTension = currentVal.tension + (targetTension - currentVal.tension) * 0.05;
      AudioSynth.updateTension(smoothedTension);

      // Now set state with pre-calculated, side-effect-free values!
      setPlayer({
        ...currentVal,
        x: nextX,
        isRunning: running,
        isCrouching: crouching,
        battery: nextBat,
        tension: smoothedTension,
      });

      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [setPlayer, currentChapterId, onChapterComplete, onTriggerScare, onAddLog]);

  // Canvas Painter Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Clear Screen
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);

      const playerVal = playerRef.current;
      const anomaliesVal = anomaliesRef.current;
      const itemsVal = itemsRef.current;

      // Camera view offset: Player is centered on screen, background scrolls
      const viewX = playerVal.x - w / 2;

      // 1. Draw floor lines and wall borders (rusty concrete tile styling)
      ctx.fillStyle = '#111113'; 
      ctx.fillRect(0, h - 80, w, 80);

      ctx.fillStyle = '#0a0a0c'; 
      ctx.fillRect(0, h - 88, w, 8);

      // Rusty tiles lines
      ctx.strokeStyle = '#050507';
      ctx.lineWidth = 1;
      for (let xOffset = -viewX % 120; xOffset < w; xOffset += 120) {
        ctx.beginPath();
        ctx.moveTo(xOffset, h - 80);
        ctx.lineTo(xOffset - 40, h);
        ctx.stroke();
      }

      // Draw structural pillars and doors
      ctx.fillStyle = '#0a0a0d'; 
      ctx.fillRect(0, 0, w, 50);

      // Draw rusty pipes on top wall
      ctx.strokeStyle = '#1e1111';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 60);
      ctx.lineTo(w, 60);
      ctx.stroke();

      // Pipes brackets
      ctx.fillStyle = '#2d1414';
      for (let xOffset = -viewX % 200; xOffset < w; xOffset += 200) {
        ctx.fillRect(xOffset, 55, 6, 12);
      }

      // Draw static assets
      const drawAssets = () => {
        drawFence(150);
        drawDoor(1200, "第一病棟 A-3");
        drawDoor(2400, "診察室 入口");
        drawDoor(3600, "地下電波管理室");
        drawDoor(4500, "最奥祭壇");
        drawEmergencyExit(4980);

        drawLocker(400, false);
        drawBloodyWriting(700, "ハシレ");
        drawWheelchair(850);
        drawBloodyWriting(1450, "右上ヲ見ロ");
        drawLocker(1600, true); 
        drawGurney(2050);
        drawBloodyWriting(2700, "ミツケタ");
        drawCrackedMirror(3100);
        drawGraffiti(3850, "† DEATH ZONE †");
        drawAltar(4750);
      };

      const drawFence = (posX: number) => {
        const screenX = posX - viewX;
        ctx.strokeStyle = '#22222b';
        ctx.lineWidth = 3;
        for (let ix = screenX - 10; ix < screenX + 15; ix += 8) {
          ctx.beginPath();
          ctx.moveTo(ix, 50);
          ctx.lineTo(ix, h - 80);
          ctx.stroke();
        }
        ctx.fillStyle = '#111116';
        ctx.fillRect(screenX - 15, h - 140, 30, 10);
      };

      const drawDoor = (posX: number, label: string) => {
        const screenX = posX - viewX;
        ctx.fillStyle = '#170f0f';
        ctx.fillRect(screenX - 45, 80, 90, h - 168);
        ctx.strokeStyle = '#050505';
        ctx.lineWidth = 3;
        ctx.strokeRect(screenX - 45, 80, 90, h - 168);
        ctx.fillStyle = '#2e1212';
        ctx.fillRect(screenX - 38, 85, 76, h - 173);
        ctx.fillStyle = '#050505';
        ctx.fillRect(screenX - 25, 100, 50, 15);
        ctx.fillStyle = '#857373';
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, screenX, 110);
        ctx.fillStyle = '#a1831f';
        ctx.beginPath();
        ctx.arc(screenX + 28, h - 120, 4, 0, Math.PI * 2);
        ctx.fill();
      };

      const drawEmergencyExit = (posX: number) => {
        const screenX = posX - viewX;
        ctx.fillStyle = '#043425';
        ctx.fillRect(screenX - 50, 60, 100, h - 140);
        ctx.strokeStyle = '#044e39';
        ctx.lineWidth = 4;
        ctx.strokeRect(screenX - 50, 60, 100, h - 140);
        ctx.fillStyle = '#059669';
        ctx.fillRect(screenX - 25, 75, 50, 20);
        ctx.fillStyle = '#011c15';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("EXIT 非常口", screenX, 88);
      };

      const drawLocker = (posX: number, isOpen: boolean) => {
        const screenX = posX - viewX;
        ctx.fillStyle = '#1b1d21';
        ctx.fillRect(screenX - 20, 90, 40, h - 170);
        ctx.strokeStyle = '#0d0e10';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX - 20, 90, 40, h - 170);
        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(screenX - 12, 100, 24, 4);
        ctx.fillRect(screenX - 12, 110, 24, 4);
        
        if (isOpen) {
          ctx.fillStyle = '#050505';
          ctx.fillRect(screenX - 20, 90, 40, h - 170);
          ctx.fillStyle = '#14161a';
          ctx.fillRect(screenX - 45, 90, 25, h - 170); 
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(screenX - 5, h - 180, 2, 0, Math.PI * 2);
          ctx.arc(screenX + 5, h - 180, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      const drawBloodyWriting = (posX: number, text: string) => {
        const screenX = posX - viewX;
        ctx.fillStyle = 'rgba(153, 27, 27, 0.7)';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, screenX, 150);
      };

      const drawGraffiti = (posX: number, text: string) => {
        const screenX = posX - viewX;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, screenX, 120);
      };

      const drawWheelchair = (posX: number) => {
        const screenX = posX - viewX;
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(screenX - 10, h - 140);
        ctx.lineTo(screenX - 10, h - 100);
        ctx.lineTo(screenX + 15, h - 100);
        ctx.stroke();
        ctx.fillStyle = '#18181b';
        ctx.strokeStyle = '#3f3f46';
        ctx.beginPath();
        ctx.arc(screenX + 2, h - 94, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      };

      const drawGurney = (posX: number) => {
        const screenX = posX - viewX;
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(screenX - 35, h - 110, 70, 10); 
        ctx.strokeStyle = '#718096';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(screenX - 25, h - 100); ctx.lineTo(screenX - 20, h - 80);
        ctx.moveTo(screenX + 25, h - 100); ctx.lineTo(screenX + 20, h - 80);
        ctx.stroke();
        ctx.fillStyle = 'rgba(127, 29, 29, 0.85)';
        ctx.fillRect(screenX - 10, h - 110, 25, 4);
      };

      const drawCrackedMirror = (posX: number) => {
        const screenX = posX - viewX;
        ctx.fillStyle = '#451a03';
        ctx.fillRect(screenX - 25, 90, 50, 90);
        ctx.fillStyle = '#0891b2';
        ctx.fillRect(screenX - 20, 95, 40, 80);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(screenX - 10, 95); ctx.lineTo(screenX + 5, 140);
        ctx.lineTo(screenX - 15, 160);
        ctx.moveTo(screenX + 10, 110); ctx.lineTo(screenX - 5, 140);
        ctx.stroke();
      };

      const drawAltar = (posX: number) => {
        const screenX = posX - viewX;
        ctx.fillStyle = '#0c0a09';
        ctx.fillRect(screenX - 35, h - 130, 70, 50);
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX - 35, h - 130, 70, 50);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(screenX - 20, h - 120, 8, 20);
        ctx.fillRect(screenX + 10, h - 120, 8, 20);
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(screenX, h - 138, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(screenX - 30, h - 140, 4, 10);
        ctx.fillRect(screenX + 26, h - 140, 4, 10);
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(screenX - 28, h - 143, 2, 0, Math.PI * 2);
        ctx.arc(screenX + 28, h - 143, 2, 0, Math.PI * 2);
        ctx.fill();
      };

      drawAssets();

      // 3. Draw capturable anomalies if visible in 2D
      anomaliesVal.forEach(anomaly => {
        if (!anomaly.captured && !anomaly.visibleOnlyInPip) {
          const screenX = anomaly.x - viewX;
          const y = h - 130 + (anomaly.yOffset || 0);

          ctx.save();
          if (anomaly.type === 'writing') {
            ctx.fillStyle = 'rgba(127, 29, 29, 0.95)';
            ctx.font = 'bold 22px "M PLUS 1p", Courier New, monospace';
            ctx.textAlign = 'center';
            ctx.fillText("助　ケ　テ", screenX, y + 20);
          } else if (anomaly.type === 'orb') {
            const pulse = 10 + Math.sin(Date.now() / 120) * 4;
            const grad = ctx.createRadialGradient(screenX, y, 1, screenX, y, pulse);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            grad.addColorStop(0.3, 'rgba(6, 182, 212, 0.7)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(screenX, y, pulse, 0, Math.PI * 2);
            ctx.fill();
          } else if (anomaly.type === 'doll') {
            ctx.fillStyle = '#581c87';
            ctx.fillRect(screenX - 8, y + 10, 16, 25);
            ctx.fillStyle = '#fbcfe8';
            ctx.beginPath();
            ctx.arc(screenX, y + 5, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(screenX - 3, y + 5, 1.5, 0, Math.PI * 2);
            ctx.arc(screenX + 3, y + 5, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      });

      // 4. Draw interactive Items
      itemsVal.forEach(item => {
        if (!item.found) {
          let itemX = 0;
          if (item.id === 'KEYCARD_BLUE') itemX = 1450;
          else if (item.id === 'DIARY_1') itemX = 800;
          else if (item.id === 'DIARY_2') itemX = 3100;
          else if (item.id === 'PHOTO_OLD') itemX = 4750;

          const screenX = itemX - viewX;
          const isNearby = Math.abs(playerVal.x - itemX) < 60;

          ctx.save();
          const bounceY = h - 100 + Math.sin(Date.now() / 150) * 4;
          const pulse = 12 + Math.sin(Date.now() / 100) * 3;
          const glow = ctx.createRadialGradient(screenX, bounceY, 1, screenX, bounceY, pulse);
          glow.addColorStop(0, 'rgba(217, 119, 6, 0.85)');
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(screenX, bounceY, pulse, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#d97706';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          if (item.type === 'keycard') {
            ctx.fillRect(screenX - 6, bounceY - 4, 12, 8);
            ctx.strokeRect(screenX - 6, bounceY - 4, 12, 8);
          } else {
            ctx.fillRect(screenX - 5, bounceY - 6, 10, 12);
            ctx.strokeRect(screenX - 5, bounceY - 6, 10, 12);
          }

          if (isNearby) {
            ctx.fillStyle = 'rgba(5, 5, 5, 0.95)';
            ctx.fillRect(screenX - 25, bounceY - 30, 50, 16);
            ctx.strokeStyle = '#d97706';
            ctx.strokeRect(screenX - 25, bounceY - 30, 50, 16);

            ctx.fillStyle = '#ffffff';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("[E] 調べる", screenX, bounceY - 19);
          }
          ctx.restore();
        }
      });

      // 5. Darkness & Flashlight Cone Mask
      const playerScreenX = w / 2; 
      const playerScreenY = h - 130 + (playerVal.isCrouching ? 20 : 0);

      ctx.save();
      ctx.fillStyle = 'rgba(2, 2, 3, 0.98)';
      ctx.fillRect(0, 0, w, h);

      if (playerVal.flashlightOn && playerVal.battery > 0) {
        ctx.globalCompositeOperation = 'destination-out';

        const startX = playerScreenX;
        const startY = playerScreenY - 10;
        
        const dx = mousePos.current.x - startX;
        const dy = mousePos.current.y - startY;
        const angle = Math.atan2(dy, dx);

        const range = 240 + Math.sin(Date.now() / 50) * 3; 
        const beamWidth = 0.35; 

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.arc(startX, startY, range, angle - beamWidth, angle + beamWidth);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fill();

        const beamGlow = ctx.createRadialGradient(startX, startY, 20, startX, startY, range);
        beamGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
        beamGlow.addColorStop(0.6, 'rgba(255, 255, 255, 0.85)');
        beamGlow.addColorStop(0.9, 'rgba(255, 255, 255, 0.15)');
        beamGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(startX, startY, range, 0, Math.PI * 2);
        ctx.fillStyle = beamGlow;
        ctx.fill();
      }
      ctx.restore();

      // 6. Dust particles spark list
      if (playerVal.flashlightOn && playerVal.battery > 0) {
        ctx.save();
        const startX = playerScreenX;
        const startY = playerScreenY - 10;
        const dx = mousePos.current.x - startX;
        const dy = mousePos.current.y - startY;
        const angle = Math.atan2(dy, dx);

        dustParticles.current.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = 0;

          const pdx = p.x - startX;
          const pdy = p.y - startY;
          const pAngle = Math.atan2(pdy, pdx);
          const pDist = Math.sqrt(pdx*pdx + pdy*pdy);

          let diffAngle = pAngle - angle;
          while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
          while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;

          const insideBeam = Math.abs(diffAngle) < 0.42 && pDist < 250;

          if (insideBeam) {
            ctx.fillStyle = `rgba(255, 252, 224, ${p.alpha * (1 - pDist/250) * 1.5})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.restore();
      }

      // 7. Render Streamer Character
      ctx.save();
      const faceDirection = mousePos.current.x >= playerScreenX ? 1 : -1;

      ctx.translate(playerScreenX, playerScreenY);
      ctx.scale(faceDirection, 1);

      const isMoving = keysPressed.current['a'] || keysPressed.current['arrowleft'] || keysPressed.current['d'] || keysPressed.current['arrowright'];
      const walkCycle = playerVal.isRunning ? (Date.now() / 70) : (isMoving ? (Date.now() / 120) : 0);
      const walkBounceY = Math.abs(Math.sin(walkCycle)) * 4;

      ctx.strokeStyle = '#050505';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      
      const leftLegSwing = Math.sin(walkCycle) * 12;
      const rightLegSwing = -Math.sin(walkCycle) * 12;
      
      ctx.beginPath();
      ctx.moveTo(-6, 25);
      ctx.lineTo(-6 + leftLegSwing, 45 - walkBounceY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(6, 25);
      ctx.lineTo(6 + rightLegSwing, 45 - walkBounceY);
      ctx.stroke();

      ctx.fillStyle = '#9f1239'; 
      ctx.fillRect(-12, -15 - walkBounceY, 24, 40);
      
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -15 - walkBounceY, 24, 40);

      ctx.fillStyle = '#d97706';
      ctx.fillRect(-18, -10 - walkBounceY, 7, 28);
      ctx.strokeRect(-18, -10 - walkBounceY, 7, 28);

      ctx.fillStyle = '#881337'; 
      ctx.beginPath();
      ctx.arc(0, -25 - walkBounceY, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f0f12';
      ctx.beginPath();
      ctx.arc(5, -25 - walkBounceY, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, -28 - walkBounceY, 4, 3);
      ctx.fillRect(10, -28 - walkBounceY, 2, 3);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(8, -5 - walkBounceY, 14, 8);
      ctx.strokeRect(8, -5 - walkBounceY, 14, 8);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(20, -1 - walkBounceY, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.fillRect(8, 8 - walkBounceY, 10, 5);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(16, 7 - walkBounceY, 3, 7);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    mousePos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleInspectTrigger = () => {
    let nearbyItem: GameItem | null = null;

    items.forEach(item => {
      if (!item.found) {
        let ix = 0;
        if (item.id === 'KEYCARD_BLUE') ix = 1450;
        else if (item.id === 'DIARY_1') ix = 800;
        else if (item.id === 'DIARY_2') ix = 3100;
        else if (item.id === 'PHOTO_OLD') ix = 4750;

        if (Math.abs(player.x - ix) < 70) {
          nearbyItem = item;
        }
      }
    });

    if (nearbyItem) {
      onPickupItem((nearbyItem as GameItem).id);
    } else {
      onAddLog("ここには調べるべきものはない。");
    }
  };

  useEffect(() => {
    handleInspectTriggerRef.current = handleInspectTrigger;
  }, [items, player.x, onPickupItem, onAddLog]);

  return (
    <div 
      id="main-game-viewport"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onClick={() => containerRef.current?.focus()}
      className="bg-black border-2 border-white/10 focus:border-red-500/50 rounded-lg overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.95)] relative w-full flex flex-col group cursor-crosshair select-none outline-none"
    >
      {/* Realtime HTML5 Canvas */}
      <canvas 
        ref={canvasRef}
        className="w-full h-[360px] block"
      />

      <div className="absolute inset-0 crt-scanlines opacity-15 pointer-events-none" />

      {/* Atmospheric Focus Cover */}
      {!isFocused && (
        <div className="absolute inset-0 bg-[#050507]/90 backdrop-blur-sm flex flex-col items-center justify-center z-30 cursor-pointer text-center p-6 border border-white/5 transition-all duration-300">
          <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-500/40 flex items-center justify-center animate-pulse mb-4">
            <div className="w-4 h-4 rounded-full bg-red-600" />
          </div>
          <span className="text-red-500 font-mono font-black tracking-[0.2em] text-sm md:text-base uppercase">
            CLICK TO START STREAMING
          </span>
          <p className="text-zinc-500 text-[11px] mt-2 max-w-sm leading-relaxed font-sans font-light">
            クリックしてコントロールを有効化し、お化け屋敷の探索・ライブ配信を開始してください。
          </p>
        </div>
      )}

      {/* Guide & Controls Overlay with immersive design matching the design spec */}
      <div className="absolute top-4 left-4 p-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-md flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-2 text-[10px] text-zinc-300 font-mono tracking-wider">
          <ArrowLeftRight className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span>[A/D] or [←/→] to Walk</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
          <span className="bg-white/10 text-white font-black px-1.5 py-0.5 rounded text-[8px] border border-white/5">SHIFT</span>
          <span>to Run</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
          <span className="bg-white/10 text-white font-black px-1.5 py-0.5 rounded text-[8px] border border-white/5">F</span>
          <span>Toggle Light</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
          <span className="bg-white/10 text-white font-black px-1.5 py-0.5 rounded text-[8px] border border-white/5">SPACE</span>
          <span>Capture Anomaly</span>
        </div>
      </div>

      {/* Interactive Mobile On-screen Controls Overlay with glowing futuristic game pads */}
      <div className="absolute bottom-4 right-4 left-4 flex justify-between items-center pointer-events-none">
        {/* Left: Joystick keys */}
        <div className="flex gap-2.5">
          <button
            onTouchStart={() => { keysPressed.current['arrowleft'] = true; }}
            onTouchEnd={() => { keysPressed.current['arrowleft'] = false; }}
            onMouseDown={() => { keysPressed.current['arrowleft'] = true; }}
            onMouseUp={() => { keysPressed.current['arrowleft'] = false; }}
            onMouseLeave={() => { keysPressed.current['arrowleft'] = false; }}
            className="w-12 h-12 rounded-full bg-black/60 border border-white/10 hover:border-white/20 text-white font-black hover:bg-black/80 active:scale-90 flex items-center justify-center text-sm transition-all pointer-events-auto cursor-pointer shadow-xl backdrop-blur-sm"
          >
            ◀
          </button>
          <button
            onTouchStart={() => { keysPressed.current['arrowright'] = true; }}
            onTouchEnd={() => { keysPressed.current['arrowright'] = false; }}
            onMouseDown={() => { keysPressed.current['arrowright'] = true; }}
            onMouseUp={() => { keysPressed.current['arrowright'] = false; }}
            onMouseLeave={() => { keysPressed.current['arrowright'] = false; }}
            className="w-12 h-12 rounded-full bg-black/60 border border-white/10 hover:border-white/20 text-white font-black hover:bg-black/80 active:scale-90 flex items-center justify-center text-sm transition-all pointer-events-auto cursor-pointer shadow-xl backdrop-blur-sm"
          >
            ▶
          </button>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex gap-2 pointer-events-auto">
          {/* Run Toggle */}
          <button
            onTouchStart={() => { keysPressed.current['shift'] = true; }}
            onTouchEnd={() => { keysPressed.current['shift'] = false; }}
            onMouseDown={() => { keysPressed.current['shift'] = true; }}
            onMouseUp={() => { keysPressed.current['shift'] = false; }}
            onMouseLeave={() => { keysPressed.current['shift'] = false; }}
            className="px-4 py-2.5 rounded-md bg-red-950/65 hover:bg-red-900 border border-red-700/60 text-white font-mono text-[10px] font-bold tracking-wider hover:border-red-600 active:scale-95 transition-all cursor-pointer shadow-lg shadow-red-950/40"
          >
            RUN [SHIFT]
          </button>

          {/* Inspect Button */}
          <button
            onClick={handleInspectTrigger}
            className="px-4 py-2.5 rounded-md bg-[#0c0a09]/80 hover:bg-[#1c1917] border border-white/10 text-amber-500 font-mono text-[10px] font-bold tracking-wider hover:border-white/20 active:scale-95 transition-all cursor-pointer shadow-lg"
          >
            INSPECT [E]
          </button>
        </div>
      </div>

      {/* Screen Damage Vignette Red Border */}
      {player.tension > 70 && (
        <div 
          className="absolute inset-0 border-4 border-red-600/40 pointer-events-none transition-all duration-300 animate-pulse shadow-[inset_0_0_60px_rgba(220,38,38,0.6)]" 
          style={{ opacity: (player.tension - 70) / 30 }}
        />
      )}
    </div>
  );
}
