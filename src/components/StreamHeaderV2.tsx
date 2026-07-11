/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo, useEffect, useState } from 'react';
import {
  Battery,
  BookOpen,
  Eye,
  HeartPulse,
  ListTree,
  MessageSquareText,
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
  onOpenJournal?: () => void;
  onOpenChat?: () => void;
  onShowObjective?: () => void;
  isInert?: boolean;
}

const clamp = (value: number) => Math.max(0, Math.min(100, value));

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
  onOpenJournal,
  onOpenChat,
  onShowObjective,
  isInert = false,
}: StreamHeaderV2Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((previous) => previous + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  const progressPercent = clamp(progress * 100);
  const exposureLabel = tension >= 82 ? '呼吸：乱れ' : tension >= 58 ? '呼吸：速い' : '呼吸：安定';

  return (
    <header
      className="stream-status-line"
      inert={isInert ? true : undefined}
      aria-hidden={isInert ? true : undefined}
    >
      <div className="stream-status-live" aria-label="ライブ配信中">
        <span className="stream-live-dot" />
        <span>LIVE</span>
        <time className="stream-elapsed" dateTime={`PT${elapsed}S`}>
          {hours}:{minutes}:{seconds}
        </time>
      </div>

      <div className="stream-viewers" aria-label={`視聴者 ${viewerCount.toLocaleString()}人`}>
        <Eye aria-hidden="true" />
        <span>{viewerCount.toLocaleString()}</span>
        <span className="status-unit">人</span>
      </div>

      <button
        type="button"
        className="stream-location"
        onClick={onShowObjective}
        title={`${chapterTitle} — ${chapterSubtitle}`}
      >
        <span className="stream-location-index">{String(chapterId).padStart(2, '0')}</span>
        <span className="stream-location-copy">
          <span>{chapterSubtitle}</span>
          <small>CH {chapterId}/{totalChapters}</small>
        </span>
      </button>

      <div className="stream-battery" aria-label={`カメラバッテリー ${Math.round(battery)}%`}>
        <Battery aria-hidden="true" />
        <span className={battery <= 15 ? 'status-danger' : ''}>{Math.round(battery)}%</span>
      </div>

      <div
        className={`stream-exposure exposure-${tension >= 82 ? 'high' : tension >= 58 ? 'medium' : 'low'}`}
        aria-label={exposureLabel}
        title={exposureLabel}
      >
        <Waves aria-hidden="true" />
        <span className="stream-exposure-bars" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>

      {health <= 35 && (
        <div className="stream-health-warning" aria-label="身体状態が危険です">
          <HeartPulse aria-hidden="true" />
          <span>INJURED</span>
        </div>
      )}

      <nav className="stream-status-actions" aria-label="配信画面メニュー">
        <button type="button" onClick={onShowObjective} title="現在の目的を表示">
          <ListTree aria-hidden="true" />
          <span>目的</span>
        </button>
        <button type="button" onClick={onOpenJournal} title="調査記録を開く">
          <BookOpen aria-hidden="true" />
          <span>記録</span>
        </button>
        <button type="button" className="compact-chat-trigger" onClick={onOpenChat} title="コメント欄を開く">
          <MessageSquareText aria-hidden="true" />
          <span>CHAT</span>
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? '音声をオンにする' : '音声をミュートする'}
          title={isMuted ? '音声をオンにする' : '音声をミュートする'}
        >
          {isMuted ? <VolumeX className="status-danger" aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          <span>{isMuted ? 'MUTE' : '音声'}</span>
        </button>
      </nav>

      <Radio className="stream-status-mark" aria-hidden="true" />
      <div className="stream-progress" aria-hidden="true">
        <span style={{ width: `${progressPercent}%` }} />
      </div>
    </header>
  );
}

export default memo(StreamHeaderV2);
