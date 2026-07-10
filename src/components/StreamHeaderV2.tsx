/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo, useEffect, useState } from 'react';
import {
  Battery,
  Eye,
  HeartPulse,
  Radio,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';

interface StreamHeaderV2Props {
  viewerCount: number;
  battery: number;
  tension: number;
  health: number;
  chapterTitle: string;
  chapterSubtitle: string;
  chapterId: number;
  totalChapters: number;
  progress: number;
  onToggleMute: () => void;
  isMuted: boolean;
}

interface MeterProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'battery' | 'tension' | 'health';
  suffix?: string;
}

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function Meter({ label, value, icon: Icon, tone, suffix = '%' }: MeterProps) {
  const normalized = clamp(value);
  const barClass =
    tone === 'battery'
      ? normalized > 40
        ? 'bg-emerald-500'
        : normalized > 15
          ? 'bg-amber-500'
          : 'bg-red-600 animate-pulse'
      : tone === 'health'
        ? normalized > 55
          ? 'bg-cyan-500'
          : normalized > 25
            ? 'bg-amber-500'
            : 'bg-red-600 animate-pulse'
        : normalized < 45
          ? 'bg-zinc-400'
          : normalized < 75
            ? 'bg-orange-500'
            : 'bg-red-600 animate-pulse';

  const valueClass =
    tone === 'tension' && normalized >= 75
      ? 'text-red-400'
      : tone === 'health' && normalized <= 25
        ? 'text-red-400'
        : 'text-zinc-300';

  return (
    <div className="min-w-[92px] sm:min-w-[106px]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-zinc-600">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <span className={`font-mono text-[9px] font-bold ${valueClass}`}>
          {Math.round(normalized)}{suffix}
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${barClass}`}
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  );
}

function StreamHeaderV2({
  viewerCount,
  battery,
  tension,
  health,
  chapterTitle,
  chapterSubtitle,
  chapterId,
  totalChapters,
  progress,
  onToggleMute,
  isMuted,
}: StreamHeaderV2Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((previous) => previous + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  const progressPercent = Math.max(0, Math.min(100, progress * 100));

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#050505]/92 backdrop-blur-xl">
      <div className="signal-sweep pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-70" />
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-3 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <div className="flex min-w-0 items-center justify-between gap-4 lg:justify-start">
          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-3 py-2 shadow-inner">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
            </span>
            <div>
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-red-400">
                live
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[8px] text-zinc-600">
                <Eye className="h-3 w-3" />
                {viewerCount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-red-500/80">
                ch {chapterId.toString().padStart(2, '0')} / {totalChapters.toString().padStart(2, '0')}
              </span>
              <span className="hidden h-px w-8 bg-white/10 sm:block" />
              <span className="hidden truncate font-mono text-[8px] uppercase tracking-[0.14em] text-zinc-700 sm:block">
                {chapterTitle}
              </span>
            </div>
            <h2 className="mt-1 truncate text-xs font-bold tracking-wide text-zinc-100 sm:text-sm">
              {chapterSubtitle}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 lg:justify-end lg:gap-x-5">
          <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-2.5 py-2">
            <Radio className="h-3.5 w-3.5 text-red-500" />
            <div>
              <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-zinc-700">
                elapsed
              </p>
              <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-zinc-300">
                {minutes}:{seconds}
              </p>
            </div>
          </div>

          <Meter label="battery" value={battery} icon={Battery} tone="battery" />
          <Meter label="tension" value={tension} icon={Waves} tone="tension" suffix="" />
          <Meter label="health" value={health} icon={HeartPulse} tone="health" />

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? '音声をオンにする' : '音声をミュートする'}
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.025] text-zinc-500 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white active:scale-95"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 text-red-500" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="h-[2px] bg-white/[0.035]">
        <div
          className="h-full bg-gradient-to-r from-red-800 via-red-500 to-red-700 transition-[width] duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  );
}

export default memo(StreamHeaderV2);
