/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowLeftRight,
  Camera,
  ChevronRight,
  Eye,
  Headphones,
  MessageSquare,
  Radio,
  ShieldAlert,
} from 'lucide-react';
import { AudioSynth } from '../utils/audio';

interface TitleScreenV2Props {
  onStartGame: () => void;
}

const GAMEPLAY_PILLARS = [
  {
    icon: ArrowLeftRight,
    label: 'EXPLORE',
    title: '暗い廊下を進む',
    description: '歩く、走る、しゃがむ。音と距離を読みながら奥へ。',
  },
  {
    icon: MessageSquare,
    label: 'READ CHAT',
    title: 'コメント欄を疑う',
    description: '視聴者には見えて、配信者には見えないものがある。',
  },
  {
    icon: Camera,
    label: 'RECORD',
    title: '怪異を証拠に変える',
    description: '右上カメラで対象を捉え、決定的な一瞬を記録する。',
  },
];

export default function TitleScreenV2({ onStartGame }: TitleScreenV2Props) {
  const handleStart = () => {
    AudioSynth.init();
    AudioSynth.playStinger();
    onStartGame();
  };

  return (
    <section className="fixed inset-0 z-50 overflow-y-auto bg-[#050505] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 broadcast-grid opacity-45" />
      <div className="pointer-events-none fixed inset-0 ambient-vignette" />
      <div className="pointer-events-none fixed inset-0 noise-layer opacity-[0.045]" />
      <div className="pointer-events-none fixed left-1/2 top-[35%] h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-950/20 blur-[120px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/8 pb-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
            </span>
            <span className="font-mono text-[9px] font-black uppercase tracking-[0.26em] text-red-400">
              paranormal broadcast system
            </span>
          </div>
          <div className="hidden items-center gap-5 font-mono text-[8px] uppercase tracking-[0.18em] text-zinc-600 sm:flex">
            <span>signal / unstable</span>
            <span>archive / 00</span>
            <span className="text-zinc-500">jp-奈良 / 23:47</span>
          </div>
        </header>

        <main className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)] lg:gap-16 lg:py-16">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 backdrop-blur-md">
              <Eye className="h-3.5 w-3.5 text-red-500" />
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                視聴者が見ているものを、信じられるか
              </span>
            </div>

            <div className="relative inline-block">
              <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.35em] text-zinc-600">
                interactive horror transmission
              </p>
              <h1
                aria-label="LIVE"
                className="title-mark select-none text-[clamp(6.4rem,18vw,12rem)] font-black leading-[0.78] tracking-[-0.09em] text-white"
              >
                L<span className="text-red-600">I</span>VE
              </h1>
              <div className="absolute -right-1 top-[38%] hidden font-mono text-[8px] uppercase tracking-[0.22em] text-red-500/70 md:block">
                rec ●
              </div>
            </div>

            <div className="mt-8 max-w-2xl border-l border-red-700/70 pl-5">
              <h2 className="font-serif text-xl font-bold leading-relaxed tracking-[0.04em] text-zinc-100 sm:text-2xl">
                コメント欄だけが、
                <br className="hidden sm:block" />
                そこにいる“何か”を先に見つける。
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-500">
                封鎖された廃病院を生配信する、2Dサイドスクロール・ホラー。
                肉眼、配信用カメラ、視聴者コメントの食い違いから真相を記録し、生きて配信を終わらせろ。
              </p>
            </div>

            <button
              type="button"
              onClick={handleStart}
              className="group mt-9 inline-flex w-full max-w-md items-center justify-between overflow-hidden rounded-2xl bg-red-600 px-5 py-4 text-left shadow-[0_20px_60px_rgba(220,38,38,0.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-red-500 hover:shadow-[0_24px_75px_rgba(220,38,38,0.3)] active:translate-y-0 active:scale-[0.99] sm:px-6"
            >
              <span className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/15">
                  <Radio className="h-4 w-4 animate-pulse text-white" />
                </span>
                <span>
                  <span className="block font-mono text-[8px] font-bold uppercase tracking-[0.24em] text-red-100/70">
                    channel ready
                  </span>
                  <span className="mt-1 block text-sm font-black tracking-[0.16em] text-white">
                    配信を開始する
                  </span>
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-white transition-transform group-hover:translate-x-1" />
            </button>

            <p className="mt-4 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-zinc-700">
              <Headphones className="h-3.5 w-3.5" />
              best experienced with headphones / keyboard or touch controls
            </p>
          </div>

          <aside className="screen-frame relative overflow-hidden rounded-[24px] border border-white/10 bg-[#08080a]/90 p-5 shadow-[0_35px_100px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:p-6">
            <div className="signal-sweep pointer-events-none absolute inset-x-0 top-0 h-px" />
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div>
                <p className="font-mono text-[9px] font-black uppercase tracking-[0.24em] text-red-400">
                  how to survive
                </p>
                <p className="mt-1 text-xs text-zinc-600">配信の基本ループ</p>
              </div>
              <span className="rounded-md border border-red-500/20 bg-red-950/25 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.15em] text-red-400">
                tutorial
              </span>
            </div>

            <div className="mt-3 divide-y divide-white/8">
              {GAMEPLAY_PILLARS.map((pillar, index) => {
                const Icon = pillar.icon;
                return (
                  <div key={pillar.label} className="group flex gap-4 py-5 first:pt-4 last:pb-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.025] text-zinc-500 transition group-hover:border-red-500/25 group-hover:text-red-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[8px] text-zinc-700">0{index + 1}</span>
                        <span className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-red-500/80">
                          {pillar.label}
                        </span>
                      </div>
                      <h3 className="mt-1 text-sm font-bold text-zinc-200">{pillar.title}</h3>
                      <p className="mt-1.5 text-xs leading-6 text-zinc-600">{pillar.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-500 sm:grid-cols-4">
              {[
                ['A / D', 'walk'],
                ['SHIFT', 'run'],
                ['F', 'light'],
                ['SPACE', 'record'],
              ].map(([key, action]) => (
                <div key={key} className="rounded-lg border border-white/8 bg-black/40 px-2 py-2.5 text-center">
                  <span className="block font-bold text-zinc-300">{key}</span>
                  <span className="mt-1 block text-zinc-700">{action}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/10 bg-amber-500/[0.035] p-3.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/80" />
              <p className="text-[10px] leading-5 text-zinc-500">
                光の点滅、突然の大音量、ジャンプスケアを含みます。体調に不安がある場合はプレイを中止してください。
              </p>
            </div>
          </aside>
        </main>

        <footer className="flex flex-col gap-2 border-t border-white/8 pt-4 font-mono text-[8px] uppercase tracking-[0.16em] text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
          <span>horrolive / build 0.2 / archive protocol</span>
          <span>the stream remembers everyone who watched</span>
        </footer>
      </div>
    </section>
  );
}
