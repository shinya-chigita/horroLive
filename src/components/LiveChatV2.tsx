/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Award, MessageCircle, Send, Shield, Signal, SignalLow, WifiOff } from 'lucide-react';
import { Comment } from '../types';
import { AudioSynth } from '../utils/audio';

interface LiveChatV2Props {
  comments: Comment[];
  onAddComment: (text: string, isPlayer: boolean) => void;
  signalBlocked: boolean;
  flashlightOn: boolean;
  isRunning: boolean;
}

const USER_POOL = [
  'yuzu_chan',
  'kage_oni',
  'live_love',
  'goma_shio',
  'taku_games',
  'momo_3',
  'ghost_hunter',
  'poko_face',
  'cyber_cat',
  'shin_123',
  'kuro_neko',
  'hannya_mask',
  'mizuki_v',
  'zero_gravity',
  'tanaka_taro',
  'horo_horo',
  'omega_9',
];

const formatClock = (timestamp: number) =>
  new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(timestamp);

const buildViewerReply = (
  playerText: string,
  username: string,
  flashlightOn: boolean,
  isRunning: boolean,
) => {
  const normalized = playerText.toLowerCase();

  if (/いる|おばけ|幽霊|人影|誰か/.test(normalized)) {
    return Math.random() > 0.45
      ? 'いる。右上のカメラだけに映ってる。止まって見て。'
      : '冗談抜きで、今うしろに顔認識出たぞ。';
  }

  if (/怖|こわ|無理|やば/.test(normalized)) {
    return Math.random() > 0.5
      ? '無理するな。撮れ高より生還優先で。'
      : 'こっちまで息止まった。音量上げたの後悔してる。';
  }

  if (/ライト|暗|電池|バッテリー/.test(normalized)) {
    return flashlightOn
      ? '電池の減り速いぞ。怪異の前だけ点けた方がいい。'
      : 'ライト消えてる！ そのまま進むのは本当にまずい。';
  }

  if (/逃|帰|戻|やめ/.test(normalized)) {
    return '帰れるうちに帰れ。コメント欄の数字、さっきから人間じゃない増え方してる。';
  }

  if (/撮|カメラ|写真|映/.test(normalized)) {
    return '距離を詰めて、ライトを当ててからCAPTURE。PIPの枠が反応した瞬間だ。';
  }

  if (isRunning) {
    return '走りながら喋るなってw でも背後の足音、ひとつ多くない？';
  }

  return `${username}: 「${playerText}」って言った直後、ノイズの奥でも同じ声したぞ。`;
};

function LiveChatV2({
  comments,
  onAddComment,
  signalBlocked,
  flashlightOn,
  isRunning,
}: LiveChatV2Props) {
  const [inputText, setInputText] = useState('');
  const [isViewerTyping, setIsViewerTyping] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const pendingTimersRef = useRef<number[]>([]);

  const visibleComments = useMemo(() => comments.slice(-60), [comments]);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    chatEndRef.current?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [visibleComments.length, isViewerTyping]);

  useEffect(
    () => () => {
      pendingTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      pendingTimersRef.current = [];
    },
    [],
  );

  const stopGameHotkeys = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const text = inputText.trim();
    if (!text || signalBlocked) return;

    onAddComment(text, true);
    setInputText('');
    setIsViewerTyping(true);
    AudioSynth.playNotification();

    const timer = window.setTimeout(() => {
      const username = USER_POOL[Math.floor(Math.random() * USER_POOL.length)];
      const reply = buildViewerReply(text, username, flashlightOn, isRunning);
      onAddComment(reply, false);
      setIsViewerTyping(false);
      AudioSynth.playNotification();
      pendingTimersRef.current = pendingTimersRef.current.filter((id) => id !== timer);
    }, 850 + Math.floor(Math.random() * 650));

    pendingTimersRef.current.push(timer);
  };

  return (
    <section className="screen-frame relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/8 bg-[#070709]/95 shadow-[0_24px_70px_rgba(0,0,0,0.72)]">
      <div className="pointer-events-none absolute inset-0 crt-scanlines opacity-[0.08]" />

      <header className="relative z-10 flex items-center justify-between border-b border-white/8 bg-black/30 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <MessageCircle className="h-4 w-4 text-red-500" />
          <div>
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.24em] text-zinc-300">
              live chat
            </p>
            <p className="mt-0.5 text-[9px] text-zinc-600">視聴者の声は、ヒントとは限らない。</p>
          </div>
        </div>

        <div
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.14em] ${
            signalBlocked
              ? 'border-red-500/25 bg-red-950/45 text-red-400'
              : 'border-emerald-500/20 bg-emerald-950/30 text-emerald-400'
          }`}
        >
          {signalBlocked ? <WifiOff className="h-3 w-3" /> : <Signal className="h-3 w-3" />}
          {signalBlocked ? 'signal jammed' : 'connected'}
        </div>
      </header>

      <div
        ref={scrollViewportRef}
        className="relative z-10 flex-1 overflow-y-auto px-3 py-3 [scrollbar-gutter:stable]"
        aria-live="polite"
      >
        <div className="space-y-2.5">
          {visibleComments.map((comment) => {
            const isPlayer = comment.username === 'STREAMER';
            const styleByType: Record<Comment['type'], string> = {
              normal: 'border-white/6 bg-white/[0.025] text-zinc-300',
              hype: 'border-amber-500/15 bg-amber-500/[0.045] text-amber-200',
              spooky: 'border-red-500/20 bg-red-950/20 text-red-300',
              glitch: 'border-red-500/25 bg-red-950/35 text-red-400 font-mono tracking-[0.08em]',
              hint: 'border-cyan-500/15 bg-cyan-500/[0.045] text-cyan-200',
              system: 'border-transparent bg-transparent text-zinc-600 italic',
            };

            return (
              <article
                key={comment.id}
                className={`rounded-lg border px-3 py-2.5 text-[11px] leading-[1.65] transition ${
                  isPlayer
                    ? 'border-red-500/18 bg-red-950/18 text-zinc-100'
                    : styleByType[comment.type]
                }`}
              >
                <div className="mb-1 flex min-w-0 items-center gap-1.5">
                  {comment.badge === 'mod' && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded bg-cyan-950/70 px-1.5 py-0.5 font-mono text-[7px] font-black text-cyan-400">
                      <Shield className="h-2.5 w-2.5" /> MOD
                    </span>
                  )}
                  {comment.badge === 'subscriber' && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded bg-amber-950/70 px-1.5 py-0.5 font-mono text-[7px] font-black text-amber-400">
                      <Award className="h-2.5 w-2.5" /> SUB
                    </span>
                  )}
                  <span
                    className={`min-w-0 truncate font-bold ${
                      isPlayer
                        ? 'text-red-400'
                        : comment.badge === 'mod'
                          ? 'text-cyan-400'
                          : comment.badge === 'subscriber'
                            ? 'text-amber-400'
                            : 'text-zinc-400'
                    }`}
                  >
                    {comment.username}
                    {isPlayer ? ' / 配信者' : ''}
                  </span>
                  <time className="ml-auto shrink-0 font-mono text-[7px] text-zinc-700">
                    {formatClock(comment.timestamp)}
                  </time>
                </div>
                <p className="break-words font-sans font-normal">{comment.text}</p>
              </article>
            );
          })}

          {isViewerTyping && !signalBlocked && (
            <div className="flex items-center gap-2 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-zinc-600">
              <span className="flex gap-1">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-1 w-1 animate-pulse rounded-full bg-zinc-500"
                    style={{ animationDelay: `${dot * 120}ms` }}
                  />
                ))}
              </span>
              viewer is typing
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        onKeyDown={stopGameHotkeys}
        onKeyUp={stopGameHotkeys}
        onPointerDown={stopGameHotkeys}
        className="relative z-20 border-t border-white/8 bg-[#09090b]/95 p-3"
      >
        {signalBlocked && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-red-500/15 bg-red-950/20 px-3 py-2 text-[9px] text-red-300">
            <SignalLow className="h-3.5 w-3.5 shrink-0" />
            精神侵食によりコメント送信回線が遮断されています。
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setInputText(event.target.value)}
            onKeyDown={stopGameHotkeys}
            onKeyUp={stopGameHotkeys}
            maxLength={48}
            disabled={signalBlocked}
            placeholder={signalBlocked ? 'SIGNAL LOST...' : '視聴者に話しかける'}
            aria-label="配信コメント"
            className="min-w-0 flex-1 rounded-lg border border-white/8 bg-black/45 px-3 py-2.5 text-[11px] text-zinc-100 outline-none transition placeholder:text-zinc-700 hover:border-white/14 focus:border-red-500/40 focus:bg-black/70 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || signalBlocked}
            aria-label="コメントを送信"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-[0_8px_24px_rgba(220,38,38,0.2)] transition hover:bg-red-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-zinc-900 disabled:text-zinc-700 disabled:shadow-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
}

export default memo(LiveChatV2);
