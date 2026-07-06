/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Radio, Battery, Flame, Volume2, VolumeX, Eye } from 'lucide-react';

interface StreamHeaderProps {
  viewerCount: number;
  battery: number;
  tension: number;
  chapterTitle: string;
  chapterSubtitle: string;
  onToggleMute: () => void;
  isMuted: boolean;
}

export default function StreamHeader({
  viewerCount,
  battery,
  tension,
  chapterTitle,
  chapterSubtitle,
  onToggleMute,
  isMuted,
}: StreamHeaderProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViewers = (count: number) => {
    return count.toLocaleString();
  };

  return (
    <header 
      id="stream-header"
      className="bg-[#050505] border-b border-white/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-zinc-200 select-none font-sans relative z-30 shadow-2xl"
    >
      {/* Dynamic scanline layer subtly over the header too */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="flex items-center gap-4">
        {/* Blinking Live indicator matching the exact layout of the design spec */}
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3.5 py-2 rounded-md border border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
            <span className="text-[10px] font-bold tracking-widest text-red-500 font-mono uppercase">LIVE</span>
          </div>
          <div className="w-px h-3 bg-white/20" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-white/80 uppercase">
              {formatViewers(viewerCount)} VIEWERS
            </span>
          </div>
        </div>

        {/* Current Chapter */}
        <div className="flex flex-col">
          <span className="text-[9px] text-red-500 font-mono tracking-widest uppercase font-black">
            {chapterTitle}
          </span>
          <span className="text-sm font-bold tracking-tight text-white/95">
            {chapterSubtitle}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 md:gap-6">
        {/* Stream Timer */}
        <div className="flex flex-col">
          <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">ELAPSED TIME</span>
          <span className="text-xs font-mono font-bold text-zinc-300 tracking-wider">
            {formatTime(elapsed)}
          </span>
        </div>

        {/* Battery Indicator */}
        <div className="flex flex-col min-w-[100px]">
          <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase flex items-center gap-1">
            <Battery className="w-3 h-3 text-emerald-500" /> BATTERY
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  battery > 40 ? 'bg-emerald-500' : battery > 15 ? 'bg-amber-500 animate-pulse' : 'bg-red-600 animate-pulse'
                }`}
                style={{ width: `${battery}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-zinc-400 font-medium">{Math.ceil(battery)}%</span>
          </div>
        </div>

        {/* Tension Meter */}
        <div className="flex flex-col min-w-[100px]">
          <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-500 animate-bounce" /> TENSION
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  tension < 40 ? 'bg-zinc-400' : tension < 75 ? 'bg-orange-500' : 'bg-red-600 animate-pulse'
                }`}
                style={{ width: `${tension}%` }}
              />
            </div>
            <span className={`text-[10px] font-mono font-bold ${tension > 75 ? 'text-red-500' : 'text-zinc-400'}`}>
              {Math.floor(tension)}
            </span>
          </div>
        </div>

        {/* Mute/Sound controls with nice premium look */}
        <button
          onClick={onToggleMute}
          className="p-2 rounded-md bg-black/40 hover:bg-black/60 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-lg active:scale-95"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5 text-zinc-300" />}
        </button>
      </div>
    </header>
  );
}
