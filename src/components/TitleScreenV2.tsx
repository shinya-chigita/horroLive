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
  MessageSquareText,
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
    code: '01 / EXPLORE',
    title: '暗闇を歩く',
    description: '光が届く範囲だけを頼りに、封鎖された病棟を進む。',
  },
  {
    icon: Camera,
    code: '02 / CAMERA',
    title: '映像のズレを見る',
    description: '肉眼にいないものが、低画質の配信カメラには残る。',
  },
  {
    icon: MessageSquareText,
    code: '03 / CHAT',
    title: 'コメント欄を疑う',
    description: '視聴者は先に気づく。ただし、全員が人間とは限らない。',
  },
];

function ReferencePreview() {
  return (
    <div className="screen-frame relative overflow-hidden border border-white/12 bg-black" aria-label="ゲーム画面イメージ">
      <svg
        viewBox="0 0 720 405"
        className="block aspect-video w-full"
        role="img"
        aria-label="廃病院の中で懐中電灯を持つ配信者と、暗闇に潜む怪異"
        shapeRendering="crispEdges"
      >
        <defs>
          <linearGradient id="title-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d8c59a" stopOpacity="0.74" />
            <stop offset="0.52" stopColor="#b9a77f" stopOpacity="0.34" />
            <stop offset="1" stopColor="#81745c" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="title-vignette" cx="50%" cy="50%" r="68%">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="0.68" stopColor="#000" stopOpacity="0.18" />
            <stop offset="1" stopColor="#000" stopOpacity="0.92" />
          </radialGradient>
        </defs>

        <rect width="720" height="405" fill="#080908" />
        <rect y="42" width="720" height="272" fill="#10110f" />
        <rect y="314" width="720" height="91" fill="#090a09" />
        <rect y="308" width="720" height="6" fill="#22221e" />

        <rect x="0" y="42" width="84" height="272" fill="#090a09" />
        <rect x="84" y="42" width="8" height="272" fill="#26241f" />
        <rect x="260" y="42" width="10" height="272" fill="#24231f" />
        <rect x="496" y="42" width="10" height="272" fill="#24231f" />
        <rect x="650" y="42" width="70" height="272" fill="#070807" />

        <rect x="111" y="119" width="124" height="101" fill="#0b0c0b" stroke="#292821" />
        <rect x="124" y="133" width="98" height="73" fill="#121310" />
        <rect x="134" y="147" width="8" height="47" fill="#20201b" />
        <rect x="155" y="147" width="8" height="47" fill="#20201b" />
        <rect x="176" y="147" width="8" height="47" fill="#20201b" />
        <rect x="197" y="147" width="8" height="47" fill="#20201b" />

        <rect x="430" y="227" width="158" height="9" fill="#3a362d" />
        <rect x="446" y="236" width="126" height="30" fill="#171715" />
        <rect x="440" y="266" width="7" height="40" fill="#302d27" />
        <rect x="571" y="266" width="7" height="40" fill="#302d27" />
        <rect x="452" y="218" width="74" height="10" fill="#89806b" opacity="0.52" />
        <rect x="494" y="239" width="41" height="5" fill="#6b2826" opacity="0.58" />

        <rect x="594" y="85" width="31" height="176" fill="#0c0d0c" stroke="#252620" />
        <rect x="600" y="99" width="19" height="5" fill="#23241f" />
        <rect x="600" y="113" width="19" height="5" fill="#23241f" />
        <rect x="600" y="127" width="19" height="5" fill="#23241f" />

        <path d="M327 222 L696 128 L696 329 L327 263 Z" fill="url(#title-beam)" />
        <rect x="342" y="246" width="240" height="3" fill="#c6b58c" opacity="0.13" />

        <g opacity="0.19">
          <rect x="616" y="139" width="20" height="23" fill="#d4d3c8" />
          <rect x="608" y="163" width="37" height="92" fill="#1a1b19" />
          <rect x="603" y="204" width="47" height="61" fill="#10110f" />
          <rect x="621" y="145" width="3" height="6" fill="#080908" />
          <rect x="630" y="145" width="3" height="6" fill="#080908" />
        </g>

        <g transform="translate(276 198)">
          <rect x="-19" y="64" width="13" height="40" fill="#171916" />
          <rect x="7" y="64" width="13" height="40" fill="#171916" />
          <rect x="-22" y="100" width="17" height="7" fill="#090a09" />
          <rect x="6" y="100" width="17" height="7" fill="#090a09" />

          <rect x="-28" y="5" width="56" height="66" fill="#34372f" />
          <rect x="-23" y="11" width="46" height="53" fill="#42453a" />
          <rect x="-24" y="42" width="48" height="5" fill="#20221e" />
          <rect x="-19" y="50" width="13" height="10" fill="#292c26" />
          <rect x="7" y="50" width="13" height="10" fill="#292c26" />

          <rect x="-38" y="14" width="12" height="51" fill="#252821" />
          <rect x="28" y="14" width="10" height="48" fill="#252821" />
          <rect x="-44" y="20" width="8" height="37" fill="#1b1d19" />

          <rect x="-22" y="-28" width="44" height="37" fill="#b89d82" />
          <rect x="-27" y="-34" width="54" height="21" fill="#171918" />
          <rect x="-24" y="-18" width="10" height="18" fill="#202321" />
          <rect x="14" y="-18" width="10" height="18" fill="#202321" />
          <rect x="-13" y="-14" width="4" height="4" fill="#090a09" />
          <rect x="9" y="-14" width="4" height="4" fill="#090a09" />
          <rect x="-5" y="-4" width="10" height="3" fill="#684c43" />

          <rect x="29" y="24" width="38" height="17" fill="#1e2221" />
          <rect x="51" y="28" width="18" height="10" fill="#292e2c" />
          <rect x="65" y="30" width="10" height="6" fill="#bbb08f" />
          <rect x="33" y="28" width="6" height="6" fill="#6f1717" />

          <rect x="-35" y="25" width="8" height="24" fill="#4a4437" />
          <rect x="-41" y="42" width="15" height="9" fill="#171917" />
        </g>

        <g opacity="0.36">
          <rect x="91" y="80" width="1" height="192" fill="#6b6456" />
          <rect x="269" y="80" width="1" height="192" fill="#6b6456" />
          <rect x="505" y="80" width="1" height="192" fill="#6b6456" />
        </g>

        <rect width="720" height="405" fill="url(#title-vignette)" />
      </svg>

      <div className="pointer-events-none absolute inset-0 crt-scanlines opacity-30" />
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 border border-white/14 bg-black/80 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.13em] text-zinc-400">
        <span className="h-1.5 w-1.5 bg-red-700" /> rec / cam-00
      </div>
      <div className="pointer-events-none absolute right-3 top-3 border border-white/12 bg-black/80 px-2 py-1 font-mono text-[8px] tracking-[0.12em] text-zinc-500">
        23:47:19
      </div>
      <div className="pointer-events-none absolute bottom-0 right-0 w-[38%] border-l border-t border-white/10 bg-black/78 p-3 backdrop-blur-[1px] sm:p-4">
        <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-zinc-600">live chat</p>
        <div className="mt-2 space-y-1.5 text-[8px] leading-relaxed text-zinc-500 sm:text-[9px]">
          <p><span className="mr-2 text-zinc-700">uro_27</span>右上だけ見えてる</p>
          <p><span className="mr-2 text-zinc-700">kowai</span>うしろ、止まって</p>
          <p className="text-red-700"><span className="mr-2 text-red-950">nanashi</span>もう映ってるよ</p>
        </div>
      </div>
    </div>
  );
}

export default function TitleScreenV2({ onStartGame }: TitleScreenV2Props) {
  const handleStart = () => {
    AudioSynth.init();
    AudioSynth.playStinger();
    onStartGame();
  };

  return (
    <section className="fixed inset-0 z-50 overflow-y-auto bg-[#050505] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 broadcast-grid opacity-30" />
      <div className="pointer-events-none fixed inset-0 ambient-vignette" />
      <div className="pointer-events-none fixed inset-0 noise-layer opacity-[0.028]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1540px] flex-col px-4 py-4 sm:px-7 sm:py-6 lg:px-10">
        <header className="flex items-start justify-between gap-6 border-b border-white/12 pb-4">
          <div>
            <p className="font-serif text-[clamp(1.35rem,3vw,2.6rem)] font-semibold leading-tight tracking-[0.06em] text-zinc-100">
              見えていないのは、<span className="text-red-700">こっち</span>かもしれない。
            </p>
            <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.18em] text-zinc-600 sm:text-[9px]">
              2Dスクロールホラーアドベンチャー　｜　ライブ配信しながら探索する心霊廃墟
            </p>
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <div className="flex items-center justify-end gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-red-700">
              <span className="h-1.5 w-1.5 bg-red-700" /> live system
            </div>
            <p className="mt-2 font-mono text-[8px] text-zinc-700">HORROLIVE / BUILD 0.3</p>
          </div>
        </header>

        <main className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(320px,0.72fr)_minmax(560px,1.28fr)] lg:gap-12 lg:py-10">
          <div className="order-2 lg:order-1">
            <div className="flex flex-wrap gap-1.5 font-mono text-[7px] uppercase tracking-[0.13em] text-zinc-700">
              {['闇', '限定視界', '配信', 'ノイズ', '心霊', '違和感', 'バズ', '無断侵入'].map((word) => (
                <span key={word} className="border border-white/9 px-2 py-1">{word}</span>
              ))}
            </div>

            <p className="mt-8 font-mono text-[9px] uppercase tracking-[0.3em] text-red-800">interactive horror transmission</p>
            <h1 className="reference-title mt-3 text-[clamp(4.8rem,12vw,8.8rem)] font-black leading-[0.78] tracking-[-0.08em] text-zinc-100" aria-label="LIVE">
              L<span className="text-red-700">I</span>VE
            </h1>

            <div className="mt-8 border-l border-red-900/80 pl-5">
              <h2 className="font-serif text-xl font-semibold leading-[1.8] tracking-[0.08em] text-zinc-200 sm:text-2xl">
                肉眼、カメラ、コメント欄。
                <br />三つの視界は、同じものを映さない。
              </h2>
              <p className="mt-4 max-w-xl text-xs leading-7 text-zinc-600 sm:text-sm">
                封鎖された廃病院を配信しながら探索し、映像にだけ残る怪異を記録する。
                視聴者の警告を信じるか、撮れ高を優先するか。配信を終えられるかどうかは、あなたの視線にかかっている。
              </p>
            </div>

            <button
              type="button"
              onClick={handleStart}
              className="group mt-8 flex w-full max-w-md items-center justify-between border border-red-800 bg-red-900/80 px-5 py-4 text-left transition hover:border-red-600 hover:bg-red-800 active:translate-y-px"
            >
              <span className="flex items-center gap-4">
                <span className="flex h-9 w-9 items-center justify-center border border-white/16 bg-black/20">
                  <Radio className="h-4 w-4 text-zinc-100" />
                </span>
                <span>
                  <span className="block font-mono text-[7px] uppercase tracking-[0.22em] text-red-200/55">channel ready / 23:47</span>
                  <span className="mt-1 block text-sm font-black tracking-[0.17em] text-white">配信を開始する</span>
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-zinc-300 transition-transform group-hover:translate-x-1" />
            </button>

            <div className="mt-4 flex items-start gap-2 text-[9px] leading-5 text-zinc-700">
              <Headphones className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>ヘッドホン推奨。キーボード・タッチ操作対応。強い光と突然の音を含みます。</span>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <ReferencePreview />

            <div className="grid border-x border-b border-white/10 sm:grid-cols-3">
              {GAMEPLAY_PILLARS.map((pillar, index) => {
                const Icon = pillar.icon;
                return (
                  <article key={pillar.code} className={`min-w-0 p-4 sm:p-5 ${index > 0 ? 'border-t border-white/10 sm:border-l sm:border-t-0' : ''}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-red-900">{pillar.code}</p>
                      <Icon className="h-3.5 w-3.5 text-zinc-700" />
                    </div>
                    <h3 className="mt-3 text-xs font-bold tracking-[0.06em] text-zinc-300">{pillar.title}</h3>
                    <p className="mt-2 text-[10px] leading-5 text-zinc-700">{pillar.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </main>

        <footer className="flex flex-col gap-3 border-t border-white/10 pt-4 font-mono text-[7px] uppercase tracking-[0.15em] text-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-3 w-3" /> the camera remembers what the player cannot see
          </div>
          <div className="flex items-center gap-2 text-zinc-700">
            <ShieldAlert className="h-3 w-3" /> photosensitivity / jumpscare / loud audio
          </div>
        </footer>
      </div>
    </section>
  );
}
