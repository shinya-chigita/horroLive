/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, ShieldAlert, Radio } from 'lucide-react';
import { AudioSynth } from '../utils/audio';

interface TitleScreenProps {
  onStartGame: () => void;
}

export default function TitleScreen({ onStartGame }: TitleScreenProps) {
  
  const handleStart = () => {
    // Initiate audio context immediately on user click
    AudioSynth.init();
    AudioSynth.playStinger();
    onStartGame();
  };

  return (
    <div 
      id="title-screen-container"
      className="fixed inset-0 bg-[#050505] flex flex-col items-center justify-center p-6 text-zinc-100 z-50 select-none font-sans overflow-hidden"
    >
      {/* Immersive Theme Background Glow */}
      <div className="absolute inset-0 bg-radial-[circle_450px_at_50%_45%] from-[#fffee0]/10 via-[#050505] to-[#020202] opacity-90 pointer-events-none" />
      <div className="absolute inset-0 crt-scanlines opacity-30 mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black via-transparent to-black opacity-65" />

      {/* Decorative vertical pillar lines to mimic the background hospital setting */}
      <div className="absolute bottom-0 left-[12%] w-[180px] h-1/3 bg-[#0c0c0e]/40 border-l border-white/5 pointer-events-none" />
      <div className="absolute bottom-0 right-[15%] w-[120px] h-1/2 bg-[#0c0c0e]/40 border-r border-white/5 pointer-events-none" />

      <div className="w-full max-w-lg text-center space-y-8 z-10">
        
        {/* Blinking Live Header */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg">
            <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
            <span className="text-red-500 text-[10px] font-mono font-black tracking-[0.25em] uppercase">
              PARANORMAL LIVE BROADCAST INITIATOR
            </span>
          </div>
        </div>

        {/* Big Title Logo */}
        <div className="relative space-y-2">
          <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-white font-sans flex justify-center items-center select-none filter drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            <span>L</span>
            <span className="text-red-600 animate-pulse relative">I<span className="absolute inset-0 text-red-500 blur-xs">I</span></span>
            <span>V</span>
            <span>E</span>
          </h1>
          <div className="text-[9px] text-zinc-400 font-mono tracking-[0.35em] mt-2 uppercase">
            Atmospheric Side-Scroll Simulation
          </div>
        </div>

        {/* Game Warnings / Headphone Advice in pristine glass-panel style */}
        <div className="glass-panel rounded-lg p-5 text-left space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10">
          <div className="flex items-start gap-3.5 text-red-400">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <div className="text-xs font-medium leading-relaxed font-sans">
              【警告】本ゲームには強い光の点滅、精神を侵食する恐怖演出、ジャンプスケアが含まれます。心臓の弱い方、光過敏性のある方はプレイを避けてください。
            </div>
          </div>

          <div className="flex items-start gap-3.5 text-zinc-300 border-t border-white/10 pt-4">
            <Volume2 className="w-5 h-5 shrink-0 mt-0.5 text-[#fffee0]/80" />
            <div className="text-xs leading-relaxed font-sans font-light">
              【音響効果】動的ノイズ音響を搭載しています。臨場感を最大化するため、音量をオンにし、ヘッドホンの装着を推奨します。
            </div>
          </div>
        </div>

        {/* Channel setup info */}
        <div className="text-zinc-500 font-mono text-[10px] space-y-1 bg-black/20 py-2 rounded-md border border-white/5">
          <div>配信チャンネル: <span className="text-white/80 font-bold">心霊突撃Ch - 深淵バズり屋</span></div>
          <div>ストリーム解像度: <span className="text-red-500/80 font-bold font-mono">LOW-FI 360p (高感度暗視ノイズ)</span></div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="group relative px-8 py-4 w-full bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white font-extrabold rounded-md text-xs tracking-[0.2em] uppercase transition-all duration-300 shadow-[0_0_30px_rgba(220,38,38,0.35)] hover:shadow-[0_0_45px_rgba(220,38,38,0.55)] cursor-pointer overflow-hidden transform active:scale-[0.98] flex items-center justify-center gap-2.5"
        >
          <Radio className="w-4 h-4 text-white group-hover:scale-125 transition-transform animate-pulse" />
          <span>START STREAMING (配信開始)</span>
        </button>

        <div className="text-[8px] text-zinc-600 font-mono tracking-widest uppercase">
          © 2026 HORROR STREAM SYSTEM CORP. ALL RIGHTS RESERVED.
        </div>
      </div>
    </div>
  );
}
