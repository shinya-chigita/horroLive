/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Comment } from '../types';
import { Send, Shield, Award } from 'lucide-react';
import { AudioSynth } from '../utils/audio';

interface LiveChatProps {
  comments: Comment[];
  onAddComment: (text: string, isPlayer: boolean) => void;
  tension: number;
  flashlightOn: boolean;
  isRunning: boolean;
}

// Usernames pool for virtual viewers
const USER_POOL = [
  'yuzu_chan', 'kage_oni', 'live_love', 'goma_shio', 'taku_games', 'momo_3',
  'ghost_hunter', 'poko_face', 'cyber_cat', 'shin_123', 'kuro_neko', 'hannya_mask',
  'mizuki_v', 'zero_gravity', 'tanaka_taro', 'horo_horo', 'omega_9', 'shinya_ha'
];

export default function LiveChat({
  comments,
  onAddComment,
  tension,
  flashlightOn,
  isRunning,
}: LiveChatProps) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Handle player typing and submitting a message
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onAddComment(inputText, true);
    setInputText('');
    AudioSynth.playNotification();

    // Virtual viewers react to player text after short delays
    setTimeout(() => {
      const user = USER_POOL[Math.floor(Math.random() * USER_POOL.length)];
      let reply = 'なになに？w';
      
      const textLower = inputText.toLowerCase();
      if (textLower.includes('いる') || textLower.includes('おばけ') || textLower.includes('幽霊')) {
        reply = Math.random() > 0.5 ? 'え、ガチでいるの？脅かすなよw' : '右上のカメラ見てみ！';
      } else if (textLower.includes('怖い') || textLower.includes('こわい')) {
        reply = 'ビビってて草。盛り上がってきた！';
      } else if (textLower.includes('ライト') || textLower.includes('暗い')) {
        reply = 'ライトの電池大丈夫？予備あった？';
      } else if (textLower.includes('逃げ') || textLower.includes('帰')) {
        reply = '逃げるが勝ちやぞ！マジで無理はすんな！';
      } else {
        reply = `${user}: 「${inputText}」って配信者が言うと余計不気味やん`;
      }

      onAddComment(reply, false);
      AudioSynth.playNotification();
    }, 1200);
  };

  return (
    <div 
      id="live-chat-panel"
      className="flex flex-col h-full bg-[#050505] border-l border-white/5 text-zinc-300 font-sans shadow-2xl relative select-none w-full"
    >
      {/* Background Vignette and scanlines to preserve atmosphere in chat pane */}
      <div className="absolute inset-0 crt-scanlines opacity-10 pointer-events-none" />

      {/* Header */}
      <div className="p-3.5 border-b border-white/5 bg-black/40 flex justify-between items-center z-10">
        <span className="text-[10px] font-black tracking-[0.2em] text-zinc-400 font-mono">LIVE COMMENTS</span>
        <span className="text-[9px] bg-red-950/50 text-red-500 font-black border border-red-800/40 px-2 py-0.5 rounded tracking-widest">
          SLOW-MODE
        </span>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/5 z-10">
        {comments.map((comment) => {
          let textStyle = "text-zinc-200";
          let bubbleStyle = "bg-white/5 border border-white/5";
          let badgeEl = null;

          if (comment.type === 'spooky') {
            textStyle = "text-red-400 font-medium animate-pulse";
            bubbleStyle = "bg-red-950/20 border-l-2 border-red-600 border-y-transparent border-r-transparent";
          } else if (comment.type === 'glitch') {
            textStyle = "text-red-500 font-mono tracking-wide font-black";
            bubbleStyle = "bg-red-950/40 border-l-2 border-red-600 border-y-transparent border-r-transparent";
          } else if (comment.type === 'hype') {
            textStyle = "text-yellow-400 font-medium";
            bubbleStyle = "bg-yellow-500/5 border border-yellow-500/10";
          } else if (comment.type === 'hint') {
            textStyle = "text-cyan-400 font-bold";
            bubbleStyle = "bg-cyan-500/5 border border-cyan-500/10";
          } else if (comment.type === 'system') {
            textStyle = "text-zinc-500 text-[10px] italic font-serif";
            bubbleStyle = "bg-transparent border-none py-0 px-1";
          }

          if (comment.badge === 'mod') {
            badgeEl = (
              <span className="bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold mr-1">
                <Shield className="w-2 h-2" /> MOD
              </span>
            );
          } else if (comment.badge === 'subscriber') {
            badgeEl = (
              <span className="bg-amber-950/80 border border-amber-500/30 text-amber-500 text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold mr-1">
                <Award className="w-2 h-2" /> SUB
              </span>
            );
          }

          const isPlayer = comment.username === 'STREAMER';
          if (isPlayer) {
            bubbleStyle = "bg-zinc-900/80 border border-white/10";
          }

          return (
            <div 
              key={comment.id} 
              id={`chat-msg-${comment.id}`}
              className={`p-2.5 rounded-md transition-all duration-300 flex items-start text-xs leading-relaxed ${bubbleStyle}`}
            >
              {badgeEl}

              {/* Username */}
              <span 
                className={`font-bold mr-2 shrink-0 ${
                  isPlayer 
                    ? 'text-red-500' 
                    : comment.badge === 'mod' 
                      ? 'text-cyan-400' 
                      : comment.badge === 'subscriber'
                        ? 'text-yellow-400'
                        : 'text-zinc-400'
                }`}
              >
                {comment.username}
                {isPlayer ? ' (配信者)' : ''}:
              </span>

              {/* Text */}
              <span className={`${textStyle} break-all select-text font-sans font-light`}>
                {comment.text}
              </span>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form 
        onSubmit={handleSubmit} 
        className="p-3 border-t border-white/5 bg-[#0a0a0c] flex gap-2 z-10"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          maxLength={40}
          placeholder={tension > 80 ? "電波障害により送信不能..." : "視聴者と対話する (コメントを入力)..."}
          disabled={tension > 80}
          className="flex-1 bg-white/5 hover:bg-white/10 focus:bg-black border border-white/10 hover:border-white/20 focus:border-red-600/50 rounded-md px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all font-sans"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || tension > 80}
          className="p-2 rounded-md bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 disabled:bg-zinc-900 disabled:text-zinc-700 text-white font-semibold transition-all shrink-0 flex items-center justify-center cursor-pointer shadow-md disabled:shadow-none active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
