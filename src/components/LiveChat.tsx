/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, Award, Send, Shield, SignalHigh, SignalLow } from 'lucide-react';
import { Comment } from '../types';
import { AudioSynth } from '../utils/audio';

interface LiveChatProps {
  comments: Comment[];
  onAddComment: (text: string, isPlayer: boolean) => void;
  tension: number;
  flashlightOn: boolean;
  isRunning: boolean;
}

const REPLIES = {
  ghost: ['え、ガチでいるの？ 脅かすなよw', '右上のカメラ見てみ！', '今、顔認識出てなかった？'],
  scared: ['ビビってて草。盛り上がってきた！', '無理すんな、逃げてもええぞ', 'こっちまで怖くなってきた'],
  light: ['ライトの電池大丈夫？ 予備あった？', '暗いと何も見えん！', '一回消してカメラだけ見てみる？'],
  escape: ['逃げるが勝ちやぞ！', '撮れ高より命や', '非常口まで走れ！'],
  generic: ['なになに？w', 'コメント読んでる場合か！', '今の声もう一回聞かせて', 'そのまま進んでみて'],
} as const;

function pickRandom<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

export default function LiveChat({
  comments,
  onAddComment,
  tension,
  flashlightOn,
  isRunning,
}: LiveChatProps) {
  const [inputText, setInputText] = useState('');
  const [stickToBottom, setStickToBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const replyTimersRef = useRef<number[]>([]);
  const previousCountRef = useRef(comments.length);

  useEffect(() => {
    const newComments = Math.max(0, comments.length - previousCountRef.current);
    previousCountRef.current = comments.length;

    if (stickToBottom) {
      const area = scrollAreaRef.current;
      if (area) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        area.scrollTo({ top: area.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      setUnreadCount(0);
    } else if (newComments > 0) {
      setUnreadCount((previous) => previous + newComments);
    }
  }, [comments, stickToBottom]);

  useEffect(() => () => {
    replyTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const handleScroll = () => {
    const area = scrollAreaRef.current;
    if (!area) return;

    const distanceFromBottom = area.scrollHeight - area.scrollTop - area.clientHeight;
    const isNearBottom = distanceFromBottom < 60;
    setStickToBottom(isNearBottom);
    if (isNearBottom) setUnreadCount(0);
  };

  const scrollToLatest = () => {
    const area = scrollAreaRef.current;
    if (!area) return;
    area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
    setStickToBottom(true);
    setUnreadCount(0);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const submittedText = inputText.trim();
    if (!submittedText || tension > 80) return;

    onAddComment(submittedText, true);
    setInputText('');
    AudioSynth.playNotification();

    const timer = window.setTimeout(() => {
      const normalized = submittedText.toLowerCase();
      let reply: string;

      if (normalized.includes('いる') || normalized.includes('おばけ') || normalized.includes('幽霊')) {
        reply = pickRandom(REPLIES.ghost);
      } else if (normalized.includes('怖い') || normalized.includes('こわい')) {
        reply = pickRandom(REPLIES.scared);
      } else if (normalized.includes('ライト') || normalized.includes('暗い')) {
        reply = pickRandom(REPLIES.light);
      } else if (normalized.includes('逃げ') || normalized.includes('帰')) {
        reply = pickRandom(REPLIES.escape);
      } else {
        reply = pickRandom(REPLIES.generic);
      }

      onAddComment(reply, false);
      AudioSynth.playNotification();
    }, 900 + Math.floor(Math.random() * 700));

    replyTimersRef.current.push(timer);
  };

  const signalLabel = tension > 80 ? 'SIGNAL CORRUPTED' : tension > 55 ? 'SIGNAL UNSTABLE' : 'CHAT ONLINE';
  const inputPlaceholder = tension > 80
    ? '電波障害により送信不能……'
    : !flashlightOn
      ? '暗闇の中からコメントする……'
      : isRunning
        ? '走行中……短いコメントを入力'
        : '視聴者へコメントする';

  return (
    <section
      id="live-chat-panel"
      className="relative flex h-full min-h-[420px] w-full flex-col overflow-hidden rounded-lg border border-white/5 bg-[#050505] text-zinc-300 shadow-[0_20px_60px_rgba(0,0,0,0.75)]"
      aria-label="ライブコメント"
    >
      <div className="absolute inset-0 crt-scanlines opacity-[0.07] pointer-events-none" />

      <header className="relative z-10 flex items-center justify-between gap-3 border-b border-white/5 bg-black/55 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <div>
            <h2 className="font-mono text-[10px] font-black tracking-[0.2em] text-zinc-300">LIVE COMMENTS</h2>
            <p className="mt-0.5 font-mono text-[8px] tracking-wider text-zinc-600">{comments.length} MESSAGES IN BUFFER</p>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[8px] font-black tracking-wider ${
          tension > 80
            ? 'border-red-500/30 bg-red-950/30 text-red-400'
            : tension > 55
              ? 'border-amber-500/25 bg-amber-950/20 text-amber-400'
              : 'border-emerald-500/20 bg-emerald-950/15 text-emerald-400'
        }`}>
          {tension > 55 ? <SignalLow className="h-3 w-3" /> : <SignalHigh className="h-3 w-3" />}
          {signalLabel}
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollAreaRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto px-3 py-4 sm:px-4"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          <div className="space-y-2.5">
            {comments.map((comment) => {
              const isPlayer = comment.username === 'STREAMER';
              let textStyle = 'text-zinc-200';
              let bubbleStyle = 'border-white/5 bg-white/[0.035]';

              if (comment.type === 'spooky') {
                textStyle = 'text-red-300 font-medium';
                bubbleStyle = 'border-red-600/25 bg-red-950/15';
              } else if (comment.type === 'glitch') {
                textStyle = 'text-red-500 font-mono font-black tracking-wide';
                bubbleStyle = 'border-red-600/35 bg-red-950/30';
              } else if (comment.type === 'hype') {
                textStyle = 'text-amber-300 font-medium';
                bubbleStyle = 'border-amber-500/20 bg-amber-500/[0.055]';
              } else if (comment.type === 'hint') {
                textStyle = 'text-cyan-300 font-bold';
                bubbleStyle = 'border-cyan-500/20 bg-cyan-500/[0.055]';
              } else if (comment.type === 'system') {
                textStyle = 'text-zinc-500 italic';
                bubbleStyle = 'border-transparent bg-transparent';
              } else if (isPlayer) {
                bubbleStyle = 'border-red-500/20 bg-red-950/10';
              }

              return (
                <article
                  key={comment.id}
                  id={`chat-msg-${comment.id}`}
                  className={`rounded-lg border px-3 py-2.5 transition ${bubbleStyle}`}
                >
                  <div className="flex items-center gap-1.5">
                    {comment.badge === 'mod' && (
                      <span className="inline-flex items-center gap-1 rounded border border-cyan-500/25 bg-cyan-950/35 px-1.5 py-0.5 font-mono text-[7px] font-black text-cyan-300">
                        <Shield className="h-2.5 w-2.5" /> MOD
                      </span>
                    )}
                    {comment.badge === 'subscriber' && (
                      <span className="inline-flex items-center gap-1 rounded border border-amber-500/25 bg-amber-950/30 px-1.5 py-0.5 font-mono text-[7px] font-black text-amber-300">
                        <Award className="h-2.5 w-2.5" /> SUB
                      </span>
                    )}
                    <span className={`truncate text-[10px] font-black ${
                      isPlayer
                        ? 'text-red-400'
                        : comment.badge === 'mod'
                          ? 'text-cyan-300'
                          : comment.badge === 'subscriber'
                            ? 'text-amber-300'
                            : 'text-zinc-400'
                    }`}>
                      {comment.username}{isPlayer ? ' / 配信者' : ''}
                    </span>
                    <time className="ml-auto shrink-0 font-mono text-[8px] text-zinc-700" dateTime={new Date(comment.timestamp).toISOString()}>
                      {formatTime(comment.timestamp)}
                    </time>
                  </div>
                  <p className={`mt-1.5 break-words text-xs leading-5 ${textStyle}`}>
                    {comment.text}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        {!stickToBottom && (
          <button
            type="button"
            onClick={scrollToLatest}
            className="absolute bottom-3 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-zinc-950/95 px-3 py-2 font-mono text-[9px] font-black text-zinc-300 shadow-xl backdrop-blur transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            最新へ{unreadCount > 0 ? `・${unreadCount}件` : ''}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 flex gap-2 border-t border-white/5 bg-[#09090b] p-3">
        <label className="sr-only" htmlFor="stream-chat-input">配信コメント</label>
        <input
          id="stream-chat-input"
          type="text"
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          maxLength={40}
          placeholder={inputPlaceholder}
          disabled={tension > 80}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-700 transition hover:border-white/20 hover:bg-white/[0.075] focus:border-red-500/40 focus:bg-black focus:outline-none focus:ring-2 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-45"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || tension > 80}
          aria-label="コメントを送信"
          className="flex w-11 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.18)] transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:bg-zinc-900 disabled:text-zinc-700 disabled:shadow-none active:scale-95"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
