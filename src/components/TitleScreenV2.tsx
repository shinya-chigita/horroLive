/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import { createPlayerSpriteFrame } from '../game/playerSprite';
import { RUNTIME_ATLASES } from '../game/runtimeVisualAssets';

interface TitleScreenV2Props {
  onStartGame: () => void;
  onBrowseBoards: () => void;
}

const PLAYER_ATLAS = RUNTIME_ATLASES.player;
const PLAYER_CELL_WIDTH = PLAYER_ATLAS.width / PLAYER_ATLAS.columns;
const PLAYER_CELL_HEIGHT = PLAYER_ATLAS.height / PLAYER_ATLAS.rows;

const GAMEPLAY_PILLARS = [
  {
    icon: ArrowLeftRight,
    code: '01 / EXPLORE',
    title: '暗闇を歩く',
    description: '光が届く範囲だけを頼りに、病棟と旧校舎を進む。',
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

const TITLE_CHARACTER_RECTS = createPlayerSpriteFrame({
  now: 360,
  isMoving: false,
  isRunning: false,
  isCrouching: false,
  tension: 32,
});

function ReferenceCharacter() {
  return (
    <g transform="translate(276 312) scale(1.45)">
      {TITLE_CHARACTER_RECTS.map((item, index) => (
        <rect
          key={`${item.part}-${index}`}
          x={item.x}
          y={item.y}
          width={item.width}
          height={item.height}
          fill={item.color}
          opacity={item.opacity}
        />
      ))}
    </g>
  );
}

function RuntimeReferenceCharacter() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  return (
    <>
      {status !== 'ready' && <ReferenceCharacter />}
      {status !== 'error' && (
        <svg
          x="220"
          y="190"
          width="150"
          height="200"
          viewBox={`${PLAYER_CELL_WIDTH} ${PLAYER_CELL_HEIGHT} ${PLAYER_CELL_WIDTH} ${PLAYER_CELL_HEIGHT}`}
          overflow="hidden"
          aria-hidden="true"
        >
          <image
            href={PLAYER_ATLAS.url}
            width={PLAYER_ATLAS.width}
            height={PLAYER_ATLAS.height}
            preserveAspectRatio="none"
            onLoad={() => setStatus('ready')}
            onError={() => setStatus('error')}
            style={{
              imageRendering: 'pixelated',
              opacity: status === 'ready' ? 1 : 0,
              transition: 'opacity 180ms linear',
            }}
          />
        </svg>
      )}
    </>
  );
}

function ReferencePipPreview() {
  return (
    <div
      className="title-reference-pip pointer-events-none absolute right-3 top-10 w-[31%] border border-white/14 bg-[#050605] shadow-[0_10px_28px_rgba(0,0,0,.48)]"
      role="img"
      aria-label="Mainと同じ廊下を少し遅れて映し、濡れ床の反射だけが異なる胸カメラ"
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-black/80 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.1em] text-zinc-500">
        <span>pip / chest</span>
        <span>+520ms</span>
      </div>
      <svg viewBox="0 0 240 126" className="block aspect-video w-full" aria-hidden="true" shapeRendering="crispEdges">
        <rect width="240" height="126" fill="#080908" />
        <rect y="14" width="240" height="86" fill="#11120f" />
        <rect y="100" width="240" height="26" fill="#090a09" />
        <path d="M29 14V100M89 14V100M169 14V100M218 14V100" stroke="#303129" strokeWidth="2" />
        <rect x="38" y="40" width="42" height="35" fill="#0b0c0b" stroke="#282920" />
        <rect x="145" y="72" width="54" height="5" fill="#3a362d" />
        <rect x="150" y="77" width="44" height="14" fill="#171715" />
        <path d="M72 92 L235 50 L235 118 L72 97 Z" fill="#c1ae82" opacity="0.22" />
        <rect x="158" y="105" width="34" height="3" fill="#c9b88d" opacity="0.44" />
        <rect x="165" y="110" width="22" height="2" fill="#92866a" opacity="0.3" />
        <rect width="240" height="126" fill="url(#title-pip-shade)" />
        <defs>
          <linearGradient id="title-pip-shade" x1="0" x2="1">
            <stop stopColor="#000" stopOpacity=".62" />
            <stop offset=".52" stopColor="#000" stopOpacity=".02" />
            <stop offset="1" stopColor="#000" stopOpacity=".68" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 crt-scanlines opacity-25" />
    </div>
  );
}

function ReferencePreview() {
  return (
    <div className="screen-frame relative overflow-hidden border border-white/12 bg-black" aria-label="ゲーム画面イメージ">
      <svg
        viewBox="0 0 720 405"
        className="block aspect-video w-full"
        role="img"
        aria-label="廃病院の中で懐中電灯を持ち、配信映像と肉眼の差を探す配信者"
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

        <path d="M330 262 L696 151 L696 341 L330 274 Z" fill="url(#title-beam)" />
        <rect x="342" y="267" width="240" height="3" fill="#c6b58c" opacity="0.13" />

        <RuntimeReferenceCharacter />

        <g opacity="0.36">
          <rect x="91" y="80" width="1" height="192" fill="#6b6456" />
          <rect x="269" y="80" width="1" height="192" fill="#6b6456" />
          <rect x="505" y="80" width="1" height="192" fill="#6b6456" />
        </g>

        <rect width="720" height="405" fill="url(#title-vignette)" />
      </svg>

      <div className="pointer-events-none absolute inset-0 crt-scanlines opacity-30" />
      <ReferencePipPreview />
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 border border-white/14 bg-black/80 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.13em] text-zinc-400">
        <span className="h-1.5 w-1.5 bg-red-700" /> rec / cam-00
      </div>
      <div className="pointer-events-none absolute right-3 top-3 border border-white/12 bg-black/80 px-2 py-1 font-mono text-[8px] tracking-[0.12em] text-zinc-500">
        23:47:19
      </div>
      <div className="pointer-events-none absolute bottom-0 right-0 w-[38%] border-l border-t border-white/10 bg-black/78 p-3 backdrop-blur-[1px] sm:p-4">
        <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-zinc-600">live chat</p>
        <div className="mt-2 space-y-1.5 text-[8px] leading-relaxed text-zinc-500 sm:text-[9px]">
          <p><span className="mr-2 text-zinc-700">SYSTEM_LIVE</span>Main同期中</p>
          <p><span className="mr-2 text-zinc-700">SYSTEM_LIVE</span>PIP遅延 520ms</p>
        </div>
      </div>
    </div>
  );
}

export default function TitleScreenV2({
  onStartGame,
  onBrowseBoards,
}: TitleScreenV2Props) {
  const handleStart = () => {
    AudioSynth.init();
    AudioSynth.playNotification();
    onStartGame();
  };

  const handleBrowse = () => {
    AudioSynth.init();
    AudioSynth.playNotification();
    onBrowseBoards();
  };

  return (
    <section className="title-screen fixed inset-0 z-50 overflow-y-auto bg-[#050505] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 broadcast-grid opacity-30" />
      <div className="pointer-events-none fixed inset-0 ambient-vignette" />
      <div className="pointer-events-none fixed inset-0 noise-layer opacity-[0.028]" />

      <div className="title-shell relative mx-auto flex min-h-screen w-full max-w-[1540px] flex-col px-4 py-4 sm:px-7 sm:py-6 lg:px-10">
        <header className="title-header flex items-start justify-between gap-6 border-b border-white/12 pb-4">
          <div>
            <p className="font-serif text-[clamp(1.35rem,3vw,2.6rem)] font-semibold leading-tight tracking-[0.06em] text-zinc-100">
              見えていないのは、<span className="text-red-700">こっち</span>かもしれない。
            </p>
            <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.18em] text-zinc-600 sm:text-[9px]">
              2Dスクロールホラーアドベンチャー　｜　ライブ配信しながら複数の心霊盤面を探索
            </p>
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <div className="flex items-center justify-end gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-red-700">
              <span className="h-1.5 w-1.5 bg-red-700" /> live system
            </div>
            <p className="mt-2 font-mono text-[8px] text-zinc-700">CHANNEL 00 / 23:47</p>
          </div>
        </header>

        <main className="title-layout grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(320px,0.72fr)_minmax(560px,1.28fr)] lg:gap-12 lg:py-10">
          <div className="title-copy">
            <div className="title-tags flex flex-wrap gap-1.5 font-mono text-[8px] uppercase tracking-[0.13em] text-zinc-600">
              {['闇', '限定視界', '配信', 'ノイズ', '心霊', '違和感', 'バズ', '無断侵入'].map((word) => (
                <span key={word} className="border border-white/9 px-2 py-1">{word}</span>
              ))}
            </div>

            <p className="title-eyebrow mt-8 font-mono text-[9px] uppercase tracking-[0.3em] text-red-800">interactive horror transmission</p>
            <h1 className="title-live-word reference-title mt-3 text-[clamp(4.8rem,12vw,8.8rem)] font-black leading-[0.78] tracking-[-0.08em] text-zinc-100" aria-label="LIVE">
              L<span className="text-red-700">I</span>VE
            </h1>

            <div className="title-story mt-8 border-l border-red-900/80 pl-5">
              <h2 className="font-serif text-xl font-semibold leading-[1.8] tracking-[0.08em] text-zinc-200 sm:text-2xl">
                肉眼、カメラ、コメント欄。
                <br />三つの視界は、同じものを映さない。
              </h2>
              <p className="mt-4 max-w-xl text-xs leading-7 text-zinc-600 sm:text-sm">
                今夜の固定回線は、廃病院「白鳴霊園付属病棟」。肉眼と遅れて届く胸カメラを見比べ、
                コメント欄が先に気づいた違和感を記録する。画面のどれか一つだけを信じないこと。
              </p>
            </div>

            <div className="title-actions mt-8 w-full max-w-md">
              <button
                type="button"
                onClick={handleStart}
                data-route-id="hospital-standard-gate-2"
                className="title-primary-cta group flex min-h-14 w-full items-center justify-between border border-red-950 bg-[#090807] px-5 py-3 text-left transition hover:border-red-800 hover:bg-red-950/20 active:translate-y-px"
              >
                <span className="flex items-center gap-4">
                  <span className="flex h-9 w-9 items-center justify-center border border-white/10 bg-black">
                    <Radio className="h-4 w-4 text-red-800" />
                  </span>
                  <span>
                    <span className="block font-mono text-[8px] uppercase tracking-[0.18em] text-red-700">recommended signal / hospital</span>
                    <span className="mt-1 block text-sm font-semibold tracking-[0.13em] text-zinc-100">廃病院からLIVE配信を開始</span>
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 text-zinc-300 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={handleBrowse}
                className="title-secondary-cta mt-2 min-h-11 w-full border border-white/10 bg-black/30 px-4 text-left text-[11px] tracking-[0.08em] text-zinc-500 transition-colors hover:border-white/20 hover:text-zinc-200"
              >
                ほかの配信先と条件を見る
              </button>
            </div>

            <p className="title-control-guide mt-4 max-w-md border-l border-white/12 pl-3 text-[11px] leading-5 text-zinc-500">
              PC：A / Dで移動・マウスで照準・Fで灯り・Spaceで撮影<br />
              タッチ：左右ボタン・画面ドラッグ・灯り・撮影
            </p>

            <div className="title-advisory mt-4 flex items-start gap-2 text-[10px] leading-5 text-zinc-600">
              <Headphones className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>ヘッドホン推奨。キーボード・タッチ操作対応。強い光と突然の音を含みます。</span>
            </div>
          </div>

          <div className="title-preview">
            <ReferencePreview />

            <div className="title-pillars grid border-x border-b border-white/10 sm:grid-cols-3">
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

        <footer className="title-footer flex flex-col gap-3 border-t border-white/10 pt-4 font-mono text-[8px] uppercase tracking-[0.15em] text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
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
