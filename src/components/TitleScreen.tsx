/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowRight,
  Camera,
  Headphones,
  Radio,
  ShieldAlert,
  Signal,
  Sparkles,
} from 'lucide-react';
import { AudioSynth } from '../utils/audio';

interface TitleScreenProps {
  onStartGame: () => void;
}

const CONTROL_ITEMS = [
  ['A / D', '移動'],
  ['SHIFT', '走る'],
  ['F', 'ライト'],
  ['E', '調査'],
  ['SPACE', '撮影'],
] as const;

export default function TitleScreen({ onStartGame }: TitleScreenProps) {
  const handleStart = () => {
    AudioSynth.init();
    AudioSynth.playStinger();
    onStartGame();
  };

  return (
    <div
      id="title-screen-container"
      className="relative min-h-[100dvh] overflow-hidden bg-[#030303] text-zinc-100"
    >
      <div className="absolute inset-0 title-grid opacity-50 pointer-events-none" />
      <div className="absolute inset-0 signal-noise opacity-35 pointer-events-none" />
      <div className="absolute inset-0 ambient-vignette pointer-events-none" />
      <div className="absolute left-1/2 top-[18%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-red-800/10 blur-[140px] pointer-events-none" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1500px] flex-col px-4 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-7 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/20 bg-red-950/20 text-red-500 shadow-[0_0_25px_rgba(220,38,38,0.12)]">
              <Radio className="h-4 w-4" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-black tracking-[0.28em] text-white">LIVE / SIGNAL 00</p>
              <p className="mt-0.5 font-mono text-[8px] tracking-[0.18em] text-zinc-600">PARANORMAL BROADCAST SYSTEM</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="font-mono text-[9px] font-black tracking-[0.2em] text-red-400">STANDBY</span>
          </div>
        </header>

        <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)] lg:gap-14 lg:py-14">
          <section className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 font-mono text-[9px] font-bold tracking-[0.2em] text-zinc-400 backdrop-blur-md">
              <Signal className="h-3.5 w-3.5 text-red-500" />
              2D SIDE-SCROLL HORROR / BROWSER GAME
            </div>

            <div className="mt-7">
              <h1 className="live-logo select-none text-[clamp(5.5rem,19vw,13rem)] font-black leading-[0.72] tracking-[-0.1em] text-white" aria-label="LIVE">
                L<span className="live-logo-mark">I</span>VE
              </h1>
              <div className="mt-6 flex items-center gap-4">
                <div className="h-px w-12 bg-red-500 sm:w-20" />
                <p className="font-mono text-[10px] font-black tracking-[0.32em] text-zinc-500 sm:text-xs">
                  視聴者は、味方とは限らない。
                </p>
              </div>
            </div>

            <p className="mt-8 max-w-2xl text-balance text-lg font-bold leading-relaxed tracking-[-0.02em] text-zinc-200 sm:text-2xl sm:leading-relaxed">
              廃病院からの生配信。<br className="hidden sm:block" />
              カメラにだけ映る怪異を撮り、コメント欄の異変を読み、生きて帰れ。
            </p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-500">
              懐中電灯、配信カメラ、増え続ける同時接続数。数字を追うほど呪いは強くなり、あなたの選択がアーカイブの結末を変えます。
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleStart}
                className="group relative inline-flex min-h-14 items-center justify-center gap-3 overflow-hidden rounded-xl bg-red-600 px-7 py-4 text-sm font-black tracking-[0.12em] text-white shadow-[0_0_45px_rgba(220,38,38,0.28)] transition hover:bg-red-500 hover:shadow-[0_0_60px_rgba(220,38,38,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.98]"
              >
                <span className="absolute inset-y-0 -left-20 w-16 skew-x-[-18deg] bg-white/20 blur-lg transition-transform duration-700 group-hover:translate-x-[360px]" />
                <Radio className="relative h-5 w-5" />
                <span className="relative">配信を開始する</span>
                <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              <div className="flex items-center gap-2 px-2 text-[11px] text-zinc-600">
                <Headphones className="h-4 w-4 text-zinc-500" />
                ヘッドホン推奨・音声は開始後に有効化
              </div>
            </div>
          </section>

          <aside className="broadcast-frame overflow-hidden rounded-2xl border border-white/10 bg-black/70 shadow-[0_30px_90px_rgba(0,0,0,0.75)] backdrop-blur-xl">
            <div className="border-b border-white/10 bg-white/[0.025] px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[9px] font-black tracking-[0.22em] text-red-400">TONIGHT'S LOCATION</p>
                  <h2 className="mt-2 text-lg font-black tracking-[-0.025em] text-white">白鳴霊園付属病棟</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black text-zinc-500">
                  <Camera className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-3 gap-2 font-mono">
                {[
                  ['STATUS', 'SEALED'],
                  ['SIGNAL', 'UNSTABLE'],
                  ['EXIT', 'UNKNOWN'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-3">
                    <p className="text-[7px] tracking-[0.15em] text-zinc-600">{label}</p>
                    <p className="mt-1.5 text-[9px] font-black tracking-wider text-zinc-300">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <p className="font-mono text-[9px] font-black tracking-[0.18em] text-zinc-400">CORE LOOP</p>
                </div>
                <ol className="mt-4 space-y-3">
                  {[
                    '暗い病棟を探索する',
                    '手がかりとカードキーを回収する',
                    '配信カメラで怪異を撮影する',
                    '同接と生存のどちらを取るか選ぶ',
                  ].map((item, index) => (
                    <li key={item} className="flex items-center gap-3 text-xs text-zinc-400">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black font-mono text-[9px] font-black text-red-400">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="font-mono text-[8px] font-black tracking-[0.2em] text-zinc-600">QUICK CONTROLS</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CONTROL_ITEMS.map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-2.5 py-2">
                      <kbd className="font-mono text-[9px] font-black text-zinc-200">{key}</kbd>
                      <span className="text-[9px] text-zinc-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/15 bg-amber-950/10 p-4">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-[10px] leading-5 text-zinc-500">
                  強い光の点滅、大音量、ジャンプスケアを含みます。光刺激や恐怖表現が苦手な方はプレイをお控えください。
                </p>
              </div>
            </div>
          </aside>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 font-mono text-[8px] tracking-[0.16em] text-zinc-700">
          <span>LIVE HORROR ARCHIVE / BUILD 2026.07</span>
          <span>DESKTOP・MOBILE / NO SAVE DATA</span>
        </footer>
      </div>
    </div>
  );
}
