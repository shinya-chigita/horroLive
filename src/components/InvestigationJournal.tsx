/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Camera,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  KeyRound,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Anomaly, GameItem } from '../types';

interface InvestigationJournalProps {
  items: GameItem[];
  anomalies: Anomaly[];
  logs: string[];
  onClose?: () => void;
}

type JournalTab = 'ITEMS' | 'LOGS' | 'PHOTOS';

const TABS: Array<{
  id: JournalTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'ITEMS', label: '回収物', icon: BookOpen },
  { id: 'LOGS', label: '配信ログ', icon: FileText },
  { id: 'PHOTOS', label: '撮影記録', icon: ImageIcon },
];

function AnomalyThumbnail({ anomaly }: { anomaly: Anomaly }) {
  return (
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden border border-white/8 bg-[#080908]">
      <div className="absolute inset-0 broadcast-grid opacity-35" />
      <div className="absolute inset-0 crt-scanlines opacity-25" />
      <div className="absolute inset-x-0 top-[38%] h-px bg-white/[0.055]" />
      <div className="absolute left-[32%] top-0 h-full w-px bg-white/[0.04]" />
      <div className="absolute right-[24%] top-0 h-full w-px bg-white/[0.04]" />

      {anomaly.type === 'ghost' && (
        <div className="absolute -right-1 top-3 h-14 w-10 opacity-60">
          <div className="ml-auto h-7 w-6 bg-black" />
          <div className="ml-auto h-9 w-1.5 -translate-x-1 bg-zinc-950" />
          <div className="absolute right-0 top-7 h-4 w-9 bg-zinc-950" />
        </div>
      )}

      {anomaly.type === 'shadow' && (
        <div className="absolute -left-2 inset-y-0 w-8 bg-black opacity-90 shadow-[10px_0_24px_rgba(0,0,0,0.95)]" />
      )}

      {anomaly.type === 'writing' && (
        <p className="rotate-[-3deg] font-serif text-xs font-bold tracking-[0.22em] text-red-900/75">
          {anomaly.id.startsWith('school.') ? '欠　席　2' : '2 3 : 4'}
        </p>
      )}

      {anomaly.type === 'orb' && (
        <div className="flex rotate-[-12deg] gap-2 opacity-55">
          <span className="h-3 w-1.5 bg-zinc-500" />
          <span className="mt-2 h-3 w-1.5 bg-zinc-600" />
          <span className="mt-4 h-3 w-1.5 bg-zinc-700" />
        </div>
      )}

      {anomaly.type === 'doll' && (
        <div className="relative mt-7 h-8 w-10 opacity-65">
          <div className="mx-auto h-3 w-6 bg-black" />
          <span className="absolute left-0 top-3 h-4 w-1 bg-zinc-600" />
          <span className="absolute left-2 top-3 h-5 w-1 bg-zinc-700" />
          <span className="absolute right-2 top-3 h-5 w-1 bg-zinc-700" />
        </div>
      )}

      <div className="absolute left-2 top-2 flex items-center gap-1 font-mono text-[6px] uppercase tracking-[0.12em] text-red-800">
        <span className="h-1 w-1 bg-red-800" /> rec
      </div>
      <Camera className="absolute bottom-2 right-2 h-3 w-3 text-zinc-800" />
    </div>
  );
}

export default function InvestigationJournal({
  items,
  anomalies,
  logs,
  onClose,
}: InvestigationJournalProps) {
  const [activeTab, setActiveTab] = useState<JournalTab>('ITEMS');
  const foundItems = items.filter((item) => item.found);
  const capturedAnomalies = anomalies.filter((anomaly) => anomaly.captured);

  return (
    <section
      id="investigation-journal"
      className="screen-frame flex h-full min-h-0 flex-col border border-white/10 bg-[#050505] text-zinc-400"
    >
      <header className="flex flex-col border-b border-white/10 sm:flex-row sm:items-stretch">
        <div className="flex min-w-[190px] items-center justify-between border-b border-white/10 px-4 py-3 sm:border-b-0 sm:border-r">
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-zinc-400">archive / evidence</p>
            <p className="mt-1 text-[9px] text-zinc-700">取得した記録を照合する</p>
          </div>
          <span className="font-mono text-[8px] text-red-900">
            {String(foundItems.length + capturedAnomalies.length).padStart(2, '0')}
          </span>
        </div>

        <nav className="flex min-w-0 flex-1 overflow-x-auto" aria-label="調査記録のタブ">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count =
              tab.id === 'ITEMS'
                ? foundItems.length
                : tab.id === 'LOGS'
                  ? logs.length
                  : capturedAnomalies.length;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-w-[118px] flex-1 items-center justify-center gap-2 border-r border-white/8 px-3 py-3 font-mono text-[8px] uppercase tracking-[0.13em] transition last:border-r-0 ${
                  active
                    ? 'bg-white/[0.045] text-zinc-200'
                    : 'bg-black/15 text-zinc-700 hover:bg-white/[0.025] hover:text-zinc-500'
                }`}
              >
                <Icon className={`h-3 w-3 ${active ? 'text-red-800' : ''}`} />
                {tab.label}
                <span className={active ? 'text-red-800' : 'text-zinc-800'}>{String(count).padStart(2, '0')}</span>
              </button>
            );
          })}
        </nav>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center border-l border-white/10 text-zinc-600 transition hover:bg-white/[0.035] hover:text-zinc-200"
            aria-label="調査記録を閉じる"
            title="閉じる (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {activeTab === 'ITEMS' && (
          <div className="divide-y divide-white/[0.065] px-4">
            {foundItems.length === 0 ? (
              <div className="flex min-h-[150px] items-center justify-center py-8 text-center">
                <div>
                  <TriangleAlert className="mx-auto h-4 w-4 text-zinc-800" />
                  <p className="mt-3 font-serif text-xs tracking-[0.08em] text-zinc-700">記録可能な物品はまだない。</p>
                  <p className="mt-2 font-mono text-[7px] uppercase tracking-[0.12em] text-zinc-800">press E near evidence</p>
                </div>
              </div>
            ) : (
              foundItems.map((item, index) => (
                <article key={item.id} className="grid gap-3 py-4 sm:grid-cols-[46px_minmax(0,1fr)]">
                  <div className="flex h-10 w-10 items-center justify-center border border-white/10 bg-black/35 text-zinc-600">
                    {item.type === 'keycard' ? <KeyRound className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 font-mono text-[7px] text-red-900">{String(index + 1).padStart(2, '0')}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-semibold tracking-[0.04em] text-zinc-300">{item.name}</h3>
                        <p className="mt-1.5 text-[10px] leading-5 text-zinc-700">{item.description}</p>
                        {item.content && (
                          <blockquote className="mt-3 border-l border-red-950 pl-3 font-serif text-[10px] leading-6 text-zinc-600">
                            {item.content}
                          </blockquote>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {activeTab === 'LOGS' && (
          <div className="divide-y divide-white/[0.055] px-4 font-mono">
            {logs.length === 0 ? (
              <div className="py-10 text-center text-[8px] uppercase tracking-[0.16em] text-zinc-800">no transmission logs</div>
            ) : (
              logs.map((log, index) => (
                <div key={`${index}-${log}`} className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 py-2.5 text-[9px] leading-5">
                  <span className="text-red-950">[{String(index + 1).padStart(2, '0')}]</span>
                  <span className={log.includes('警告') || log.includes('失敗') || log.includes('切れ') ? 'text-red-800' : 'text-zinc-600'}>
                    {log}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'PHOTOS' && (
          <div className="p-4">
            {capturedAnomalies.length === 0 ? (
              <div className="flex min-h-[150px] items-center justify-center text-center">
                <div>
                  <Camera className="mx-auto h-4 w-4 text-zinc-800" />
                  <p className="mt-3 font-serif text-xs tracking-[0.08em] text-zinc-700">撮影済みの怪異はない。</p>
                  <p className="mt-2 max-w-sm text-[9px] leading-5 text-zinc-800">PIP映像の反応を確認し、対象へ近づいてCAPTUREを実行してください。</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {capturedAnomalies.map((anomaly, index) => (
                  <figure key={anomaly.id} className="min-w-0 border border-white/8 bg-black/25 p-2">
                    <AnomalyThumbnail anomaly={anomaly} />
                    <figcaption className="mt-2 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[7px] text-red-900">REC-{String(index + 1).padStart(2, '0')}</span>
                        <CheckCircle2 className="h-3 w-3 text-zinc-700" />
                      </div>
                      <p className="mt-1.5 truncate text-[9px] text-zinc-500">{anomaly.description}</p>
                      <p className="mt-1 font-mono text-[7px] text-zinc-800">+{anomaly.points.toLocaleString()} VIEWERS</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
