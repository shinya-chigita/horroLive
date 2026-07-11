/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  ArrowDown,
  Award,
  MessageSquareText,
  Send,
  Shield,
  Signal,
  SignalLow,
  WifiOff,
} from 'lucide-react';
import type { Comment } from '../types';
import type { ChatFollowMode } from '../game/chatFollow';
import {
  chatFollowReducer,
  countAddedMessageIds,
  getChatFollowMode,
} from '../game/chatFollow';
import { AudioSynth } from '../utils/audio';

interface LiveChatV2Props {
  comments: Comment[];
  onAddComment?: (text: string, isPlayer: boolean) => void;
  signalBlocked: boolean;
  flashlightOn: boolean;
  isRunning: boolean;
  /** The hospital vertical slice is narrative-only; legacy screens may opt in to posting. */
  readOnly?: boolean;
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
  readOnly = false,
}: LiveChatV2Props) {
  const [inputText, setInputText] = useState('');
  const [isViewerTyping, setIsViewerTyping] = useState(false);
  const [followState, dispatchFollow] = useReducer(chatFollowReducer, {
    mode: 'FOLLOWING',
    unreadCount: 0,
  });
  const [pausedWindowStartId, setPausedWindowStartId] = useState<string | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const pendingTimersRef = useRef<number[]>([]);
  const followModeRef = useRef<ChatFollowMode>('FOLLOWING');
  const pausedScrollTopRef = useRef(0);
  const previousCommentIdsRef = useRef<readonly string[]>([]);
  const hasMountedRef = useRef(false);

  const isFollowing = followState.mode === 'FOLLOWING';
  const unreadCount = followState.unreadCount;
  const commentIds = useMemo(() => comments.map((comment) => comment.id), [comments]);
  const visibleComments = useMemo(() => {
    if (followState.mode === 'PAUSED' && pausedWindowStartId) {
      const startIndex = comments.findIndex((comment) => comment.id === pausedWindowStartId);
      if (startIndex >= 0) return comments.slice(startIndex);
    }
    return comments.slice(-80);
  }, [comments, followState.mode, pausedWindowStartId]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    followModeRef.current = 'FOLLOWING';
    pausedScrollTopRef.current = viewport.scrollHeight;
    setPausedWindowStartId(null);
    dispatchFollow({ type: 'FOLLOW_REQUESTED' });
  }, []);

  useLayoutEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      previousCommentIdsRef.current = commentIds;
      scrollToBottom('auto');
      return;
    }

    const addedCount = countAddedMessageIds(previousCommentIdsRef.current, commentIds);
    previousCommentIdsRef.current = commentIds;
    if (addedCount === 0) return;

    if (followModeRef.current === 'FOLLOWING') {
      scrollToBottom('auto');
    } else {
      // Appending rows must not move someone who is reading older messages.
      // The paused render window is not pruned, and this assignment also
      // neutralises browser scroll anchoring differences.
      viewport.scrollTop = pausedScrollTopRef.current;
      dispatchFollow({ type: 'MESSAGES_ADDED', count: addedCount });
    }
  }, [commentIds, scrollToBottom]);

  useEffect(
    () => () => {
      pendingTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      pendingTimersRef.current = [];
    },
    [],
  );

  const handleScroll = () => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    const metrics = {
      scrollHeight: viewport.scrollHeight,
      scrollTop: viewport.scrollTop,
      clientHeight: viewport.clientHeight,
    };
    const previousMode = followModeRef.current;
    const nextMode = getChatFollowMode(metrics);

    followModeRef.current = nextMode;
    pausedScrollTopRef.current = viewport.scrollTop;
    dispatchFollow({ type: 'SCROLLED', metrics });

    if (nextMode === 'PAUSED' && previousMode === 'FOLLOWING') {
      setPausedWindowStartId(visibleComments[0]?.id ?? null);
    } else if (nextMode === 'FOLLOWING' && previousMode === 'PAUSED') {
      setPausedWindowStartId(null);
    }
  };

  const stopGameHotkeys = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const text = inputText.trim();
    if (!text || signalBlocked || readOnly || !onAddComment) return;
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
    <section className="screen-frame relative flex min-h-0 flex-col overflow-hidden border border-white/10 bg-[#050505]">
      <div className="pointer-events-none absolute inset-0 crt-scanlines opacity-[0.06]" />
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/30 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-3.5 w-3.5 text-zinc-500" />
          <div>
            <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.2em] text-zinc-300">live chat</p>
            <p className="mt-0.5 text-[8px] text-zinc-700">読んでいる間は勝手に追従しません</p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[7px] uppercase tracking-[0.12em]">
          <span className={isFollowing ? 'text-zinc-600' : 'text-amber-700'}>{isFollowing ? 'following' : 'paused'}</span>
          <span className={`flex items-center gap-1 border px-1.5 py-1 ${signalBlocked ? 'border-red-900/50 text-red-700' : 'border-white/10 text-zinc-600'}`}>
            {signalBlocked ? <WifiOff className="h-2.5 w-2.5" /> : <Signal className="h-2.5 w-2.5" />}
            {signalBlocked ? 'jammed' : 'online'}
          </span>
        </div>
      </header>

      <div
        ref={scrollViewportRef}
        onScroll={handleScroll}
        className="relative z-10 flex-1 overflow-y-auto [overflow-anchor:none] [scrollbar-gutter:stable]"
        role="log"
        aria-live={isFollowing ? 'polite' : 'off'}
        aria-relevant="additions text"
        aria-atomic="false"
        aria-label="ライブコメント"
        tabIndex={0}
      >
        <div className="divide-y divide-white/[0.055] px-3">
          {visibleComments.map((comment) => {
            const isPlayer = comment.username === 'STREAMER';
            const textClass: Record<Comment['type'], string> = {
              normal: 'text-zinc-400',
              hype: 'text-amber-300/80',
              spooky: 'text-red-300/80',
              glitch: 'text-red-500 font-mono tracking-[0.08em] glitch-text',
              hint: 'text-stone-200',
              system: 'text-zinc-700 italic font-serif',
            };
            return (
              <article key={comment.id} className={`grid grid-cols-[minmax(72px,0.32fr)_minmax(0,1fr)] gap-2 py-2 text-[10px] leading-[1.65] ${isPlayer ? 'bg-red-950/[0.08]' : ''}`}>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1">
                    {comment.badge === 'mod' && <Shield className="h-2.5 w-2.5 shrink-0 text-zinc-600" />}
                    {comment.badge === 'subscriber' && <Award className="h-2.5 w-2.5 shrink-0 text-amber-800" />}
                    <span className={`truncate font-mono text-[8px] ${isPlayer ? 'text-red-700' : comment.badge === 'mod' ? 'text-zinc-300' : 'text-zinc-600'}`}>
                      {isPlayer ? 'STREAMER' : comment.username}
                    </span>
                  </div>
                  <time className="mt-0.5 block font-mono text-[7px] text-zinc-800">{formatClock(comment.timestamp)}</time>
                </div>
                <p className={`min-w-0 break-words ${isPlayer ? 'text-zinc-200' : textClass[comment.type]}`}>{comment.text}</p>
              </article>
            );
          })}
          {isViewerTyping && !signalBlocked && (
            <div className="flex items-center gap-2 py-2 font-mono text-[7px] uppercase tracking-[0.14em] text-zinc-700">
              <span className="flex gap-1">
                {[0, 1, 2].map((dot) => (
                  <span key={dot} className="h-1 w-1 animate-pulse bg-zinc-700" style={{ animationDelay: `${dot * 120}ms` }} />
                ))}
              </span>
              viewer is typing
            </div>
          )}
        </div>
      </div>

      {!isFollowing && unreadCount > 0 && (
        <button
          type="button"
          onClick={() => scrollToBottom('auto')}
          className={`absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 border border-white/15 bg-[#090909]/95 px-3 py-2 font-mono text-[8px] tracking-[0.1em] text-zinc-300 shadow-[0_8px_24px_rgba(0,0,0,0.7)] transition hover:border-white/30 hover:text-white ${readOnly ? 'bottom-10' : 'bottom-[62px]'}`}
          aria-label={`新着コメント${unreadCount}件を表示`}
        >
          新着 {unreadCount}件
          <ArrowDown className="h-3 w-3" />
        </button>
      )}

      {readOnly ? (
        <div
          className="relative z-20 flex min-h-8 items-center justify-between border-t border-white/10 bg-[#060606] px-3 font-mono text-[7px] uppercase tracking-[0.14em] text-zinc-700"
          aria-label="コメントは読み取り専用です"
        >
          <span>narrative feed</span>
          <span>{signalBlocked ? 'signal lost' : 'read only'}</span>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          onKeyDown={stopGameHotkeys}
          onKeyUp={stopGameHotkeys}
          onPointerDown={stopGameHotkeys}
          className="relative z-20 border-t border-white/10 bg-[#060606] p-2.5"
        >
          {signalBlocked && (
            <div className="mb-2 flex items-center gap-2 border border-red-900/40 bg-red-950/15 px-2.5 py-2 text-[8px] text-red-700">
              <SignalLow className="h-3 w-3 shrink-0" />
              精神侵食によりコメント回線が遮断されています。
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
              disabled={signalBlocked || !onAddComment}
              placeholder={signalBlocked ? 'SIGNAL LOST...' : 'コメントを入力…'}
              aria-label="配信コメント"
              className="min-w-0 flex-1 border border-white/10 bg-black/50 px-3 py-2 text-[10px] text-zinc-200 outline-none transition placeholder:text-zinc-800 hover:border-white/18 focus:border-zinc-500/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || signalBlocked || !onAddComment}
              aria-label="コメントを送信"
              className="inline-flex h-9 w-10 shrink-0 items-center justify-center border border-white/12 bg-white/[0.035] text-zinc-400 transition hover:border-white/25 hover:text-white active:translate-y-px disabled:cursor-not-allowed disabled:border-white/5 disabled:text-zinc-800"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default memo(LiveChatV2);
