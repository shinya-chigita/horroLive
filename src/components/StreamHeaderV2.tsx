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
  const filledSegments = Math.round(normalized / 10);
  const activeClass =
    tone === 'battery'
      ? normalized <= 15
        ? 'bg-red-800'
        : 'bg-[#9f9275]'
      : tone === 'tension'
        ? normalized >= 74
          ? 'bg-red-700'
          : 'bg-[#6d5a51]'
        : normalized <= 25
          ? 'bg-red-800'
          : 'bg-[#68736f]';
  const valueClass =
    (tone === 'tension' && normalized >= 74) || (tone === 'health' && normalized <= 25)
      ? 'text-red-600'
      : 'text-zinc-400';

  return (
    <div className="min-w-[94px] sm:min-w-[110px]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 font-mono text-[7px] uppercase tracking-[0.14em] text-zinc-700">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <span className={`font-mono text-[8px] font-semibold ${valueClass}`}>
          {Math.round(normalized)}{suffix}
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-10 gap-[2px]" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <span
            key={index}
            className={`h-[4px] transition-colors duration-300 ${index < filledSegments ? activeClass : 'bg-white/[0.055]'}`}
          />
        ))}
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

  const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  const progressPercent = Math.max(0, Math.min(100, progress * 100));

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/96 backdrop-blur-md">
      <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-5">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.065] py-3">
          <div className="min-w-0">
            <p className="truncate font-serif text-sm font-semibold tracking-[0.08em] text-zinc-300 sm:text-lg">
              見えていないのは、<span className="text-red-700">こっち</span>かもしれない。
            </p>
            <p className="mt-1 hidden font-mono text-[7px] uppercase tracking-[0.16em] text-zinc-800 sm:block">
              2D scroll horror adventure / paranormal live archive
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div className="hidden items-center gap-1.5 font-mono text-[7px] uppercase tracking-[0.14em] text-zinc-700 md:flex">
              {['闇', '配信', 'ノイズ', '心霊'].map((tag) => (
                <span key={tag} className="border border-white/8 px-1.5 py-1">{tag}</span>
              ))}
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1.5 font-mono text-[8px] uppercase tracking-[0.17em] text-red-700">
                <span className="h-1.5 w-1.5 bg-red-700" /> live
              </p>
              <p className="mt-1 flex items-center justify-end gap-1.5 font-mono text-[9px] text-zinc-500">
                <Eye className="h-3 w-3" /> {viewerCount.toLocaleString()} 人
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-black/40">
              <span className="font-mono text-[8px] font-bold text-red-800">{chapterId.toString().padStart(2, '0')}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[7px] uppercase tracking-[0.16em] text-red-900">
                  chapter {chapterId.toString().padStart(2, '0')} / {totalChapters.toString().padStart(2, '0')}
                </span>
                <span className="hidden h-px w-8 bg-white/10 sm:block" />
                <span className="hidden truncate font-mono text-[7px] uppercase tracking-[0.13em] text-zinc-800 sm:block">
                  {chapterTitle}
                </span>
              </div>
              <h2 className="mt-1 truncate text-xs font-semibold tracking-[0.05em] text-zinc-300 sm:text-sm">
                {chapterSubtitle}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 lg:justify-end lg:gap-x-5">
            <div className="flex items-center gap-2 border border-white/8 bg-black/35 px-2.5 py-2">
              <Radio className="h-3 w-3 text-red-800" />
              <div>
                <p className="font-mono text-[6px] uppercase tracking-[0.15em] text-zinc-800">elapsed</p>
                <p className="mt-0.5 font-mono text-[9px] tracking-[0.12em] text-zinc-500">
                  {hours}:{minutes}:{seconds}
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
              className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/10 bg-black/35 text-zinc-600 transition hover:border-white/22 hover:text-zinc-200 active:translate-y-px"
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5 text-red-700" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-white/[0.04]">
        <div
          className="h-full bg-red-800 transition-[width] duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  );
}

export default memo(StreamHeaderV2);
