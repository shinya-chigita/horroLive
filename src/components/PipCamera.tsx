/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { Anomaly } from '../types';

interface PipCameraProps {
  currentAnomaly: Anomaly | null;
  anomalyDistance: number; // distance in units (e.g. 0 to 1000)
  tension: number;
  flashlightOn: boolean;
  onCaptureAnomaly: () => void;
  canCapture: boolean;
}

export default function PipCamera({
  currentAnomaly,
  anomalyDistance,
  tension,
  flashlightOn,
  onCaptureAnomaly,
  canCapture,
}: PipCameraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signalStatus, setSignalStatus] = useState<'STRONG' | 'WEAK' | 'CRITICAL' | 'LOST'>('STRONG');
  const [faceTracked, setFaceTracked] = useState(false);
  const [captureFeedback, setCaptureFeedback] = useState<string | null>(null);

  // Determine signal status based on tension
  useEffect(() => {
    if (tension > 85) {
      setSignalStatus('LOST');
    } else if (tension > 60) {
      setSignalStatus('CRITICAL');
    } else if (tension > 30) {
      setSignalStatus('WEAK');
    } else {
      setSignalStatus('STRONG');
    }
  }, [tension]);

  // Determine face tracking
  useEffect(() => {
    if (currentAnomaly && anomalyDistance < 350 && flashlightOn) {
      setFaceTracked(true);
    } else {
      setFaceTracked(false);
    }
  }, [currentAnomaly, anomalyDistance, flashlightOn]);

  // Render VHS noise static + creepy entity silhouette in Pip canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // 1. Clear background (dark grey creepy wall color)
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);

      // 2. Draw faux corridor depth lines in green nightvision if flashlight on, otherwise pitch black
      if (flashlightOn) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.lineWidth = 1;
        // Corridor ceiling/floor perspective lines
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(w * 0.4, h * 0.4);
        ctx.moveTo(w, 0); ctx.lineTo(w * 0.6, h * 0.4);
        ctx.moveTo(0, h); ctx.lineTo(w * 0.4, h * 0.6);
        ctx.moveTo(w, h); ctx.lineTo(w * 0.6, h * 0.6);
        // Back wall
        ctx.rect(w * 0.4, h * 0.4, w * 0.2, h * 0.2);
        ctx.stroke();
      }

      // 3. Draw creepy ghostly presence if anomaly is in range
      if (currentAnomaly && anomalyDistance < 500) {
        // Opacity increases as player gets closer
        const opacity = Math.min(0.9, (500 - anomalyDistance) / 450);
        
        ctx.save();
        ctx.globalAlpha = opacity;
        
        // Draw eerie face/body
        const centerX = w / 2 + Math.sin(Date.now() / 150) * 8;
        const centerY = h / 2 + Math.cos(Date.now() / 200) * 5;

        if (currentAnomaly.type === 'ghost') {
          // Creepy long neck silhouette
          ctx.fillStyle = 'rgba(5, 5, 5, 0.95)';
          ctx.beginPath();
          ctx.moveTo(centerX - 15, centerY + 15);
          ctx.lineTo(centerX - 5, centerY - 10);
          ctx.lineTo(centerX + 5, centerY - 10);
          ctx.lineTo(centerX + 15, centerY + 15);
          ctx.fill();

          // Creepy skull outline
          ctx.fillStyle = 'rgba(240, 240, 240, 0.8)';
          ctx.beginPath();
          ctx.arc(centerX, centerY - 20, 14, 0, Math.PI * 2);
          ctx.fill();

          // Hollow eyes
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(centerX - 5, centerY - 22, 3, 0, Math.PI * 2);
          ctx.arc(centerX + 5, centerY - 22, 3, 0, Math.PI * 2);
          ctx.fill();

          // Glowing red dots in eyes if extremely close
          if (anomalyDistance < 250) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(centerX - 5, centerY - 22, 1, 0, Math.PI * 2);
            ctx.arc(centerX + 5, centerY - 22, 1, 0, Math.PI * 2);
            ctx.fill();
          }

          // Creepy mouth
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.ellipse(centerX, centerY - 12, 3, 6 + Math.sin(Date.now() / 80) * 2, 0, 0, Math.PI * 2);
          ctx.fill();

        } else if (currentAnomaly.type === 'shadow') {
          // Dark lurking vapor shadow
          const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 45);
          grad.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
          grad.addColorStop(0.5, 'rgba(10, 10, 12, 0.85)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
          ctx.fill();

        } else {
          // Haunted floating Doll or Objects
          ctx.fillStyle = '#991b1b';
          ctx.beginPath();
          ctx.arc(centerX, centerY - 5, 10, 0, Math.PI * 2);
          ctx.fill();
          // Limbs hanging
          ctx.strokeStyle = '#5c1d1d';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(centerX - 5, centerY + 5); ctx.lineTo(centerX - 10, centerY + 25);
          ctx.moveTo(centerX + 5, centerY + 5); ctx.lineTo(centerX + 10, centerY + 25);
          ctx.stroke();
        }

        ctx.restore();
      }

      // 4. White noise / signal static
      const staticIntensity = tension > 80 ? 0.92 : tension > 60 ? 0.52 : tension > 30 ? 0.22 : 0.08;
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        if (Math.random() < staticIntensity) {
          const noiseValue = Math.random() * 255;
          data[i] = noiseValue;     // R
          data[i + 1] = noiseValue; // G
          data[i + 2] = noiseValue; // B
        }
      }
      ctx.putImageData(imgData, 0, 0);

      // 5. Draw horizontal TV Scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 2);
      }

      // 6. Draw VHS Signal glitches if tension is high
      if (tension > 50 && Math.random() < 0.15) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        const glitchY = Math.random() * h;
        const glitchH = 3 + Math.random() * 15;
        ctx.fillRect(0, glitchY, w, glitchH);
      }

      // 7. Green Nightvision grid tint
      ctx.fillStyle = 'rgba(16, 185, 129, 0.09)';
      ctx.fillRect(0, 0, w, h);

      // 8. Facial recognition focus square (Creepy visual highlight)
      if (faceTracked) {
        const size = 52 + Math.sin(Date.now() / 100) * 4;
        const boxX = w / 2 - size / 2 + Math.sin(Date.now() / 150) * 8;
        const boxY = h / 2 - size / 2 + Math.cos(Date.now() / 200) * 5 - 15;

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        
        // Top-Left
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + 12);
        ctx.lineTo(boxX, boxY);
        ctx.lineTo(boxX + 12, boxY);
        ctx.stroke();

        // Top-Right
        ctx.beginPath();
        ctx.moveTo(boxX + size - 12, boxY);
        ctx.lineTo(boxX + size, boxY);
        ctx.lineTo(boxX + size, boxY + 12);
        ctx.stroke();

        // Bottom-Left
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + size - 12);
        ctx.lineTo(boxX, boxY + size);
        ctx.lineTo(boxX + 12, boxY + size);
        ctx.stroke();

        // Bottom-Right
        ctx.beginPath();
        ctx.moveTo(boxX + size - 12, boxY + size);
        ctx.lineTo(boxX + size, boxY + size);
        ctx.lineTo(boxX + size, boxY + size - 12);
        ctx.stroke();

        // Text tag
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`ANOMALY DETECTED: (${Math.floor(82 + Math.random() * 18)}%)`, boxX, boxY - 4);
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [currentAnomaly, anomalyDistance, tension, flashlightOn, faceTracked]);

  const handleCapture = () => {
    if (!canCapture) return;
    onCaptureAnomaly();
    setCaptureFeedback("CAPTURED!");
    setTimeout(() => setCaptureFeedback(null), 1500);
  };

  return (
    <div 
      id="pip-camera-container"
      className="bg-black border-2 border-white/10 rounded-lg overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative w-full aspect-[4/3] flex flex-col select-none"
    >
      {/* Feed Canvas */}
      <canvas 
        ref={canvasRef} 
        width={320} 
        height={240}
        className="w-full flex-1 object-cover"
      />

      {/* Repeating lines in background just like spec */}
      <div className="absolute inset-0 crt-scanlines opacity-20 pointer-events-none" />

      {/* Screen Interface Overlays */}
      <div className="absolute inset-0 p-3.5 flex flex-col justify-between pointer-events-none">
        {/* Top bar */}
        <div className="flex justify-between items-center text-[10px] font-mono font-bold">
          <div className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded text-red-500 animate-pulse border border-white/5">
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
            <span>CAM-01 [REC]</span>
          </div>

          <div className={`px-2 py-0.5 rounded text-white border border-white/5 ${
            signalStatus === 'STRONG' ? 'bg-emerald-950/80 text-emerald-400' :
            signalStatus === 'WEAK' ? 'bg-amber-950/80 text-amber-400' :
            'bg-red-950/80 text-red-400 animate-pulse'
          }`}>
            SIG: {signalStatus}
          </div>
        </div>

        {/* Center Crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-8 h-8 border border-white/40 rounded-full relative">
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/40 -translate-y-1/2" />
            <div className="absolute left-1/2 top-0 w-[1px] h-full bg-white/40 -translate-x-1/2" />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex justify-between items-end text-[9px] font-mono font-bold text-zinc-400">
          <div className="bg-black/60 px-1.5 py-0.5 rounded border border-white/5">
            ISO 6400 | nightvision
          </div>
          <div className="bg-black/60 px-1.5 py-0.5 rounded border border-white/5">
            BAT: 88%
          </div>
        </div>
      </div>

      {/* Capture Indicator Banner */}
      {captureFeedback && (
        <div className="absolute inset-0 bg-red-900/30 backdrop-blur-xs flex items-center justify-center pointer-events-none animate-ping">
          <span className="bg-red-700 text-white font-mono font-black text-xs px-4 py-2 border border-white/20 rounded shadow-lg">
            {captureFeedback}
          </span>
        </div>
      )}

      {/* Interactive Camera Shutter UI */}
      <div className="p-3 bg-[#0a0a0c] border-t border-white/5 flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-zinc-400 font-mono tracking-wider">SPECTRAL DETECTOR</span>
          <span className="text-[9px] text-zinc-500 font-sans">Press [SPACE] or Click</span>
        </div>

        <button
          onClick={handleCapture}
          disabled={!canCapture}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded font-mono font-bold text-[10px] tracking-wider uppercase transition-all duration-300 cursor-pointer ${
            canCapture 
              ? 'bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white shadow-lg shadow-red-950/40 active:scale-95' 
              : 'bg-zinc-900 text-zinc-600 border border-white/5 cursor-not-allowed'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>CAPTURE</span>
        </button>
      </div>
    </div>
  );
}
