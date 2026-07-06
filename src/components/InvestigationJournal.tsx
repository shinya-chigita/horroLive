/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameItem, Anomaly } from '../types';
import { BookOpen, FileText, Image, CheckCircle, ShieldAlert } from 'lucide-react';

interface InvestigationJournalProps {
  items: GameItem[];
  anomalies: Anomaly[];
  logs: string[];
}

export default function InvestigationJournal({
  items,
  anomalies,
  logs,
}: InvestigationJournalProps) {
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'LOGS' | 'PHOTOS'>('ITEMS');

  return (
    <div 
      id="investigation-journal"
      className="bg-[#050505] border border-white/5 rounded-lg p-5 font-sans select-none flex flex-col h-full text-zinc-300 shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
    >
      {/* Tabs list with modern immersive styling */}
      <div className="flex border-b border-white/5 pb-2.5 mb-4 gap-2">
        <button
          onClick={() => setActiveTab('ITEMS')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer ${
            activeTab === 'ITEMS' 
              ? 'bg-red-950/40 text-red-400 border border-red-800/40' 
              : 'hover:bg-white/5 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>INVENTORY ({items.filter(i => i.found).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LOGS')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer ${
            activeTab === 'LOGS' 
              ? 'bg-red-950/40 text-red-400 border border-red-800/40' 
              : 'hover:bg-white/5 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>BROADCAST LOGS ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PHOTOS')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer ${
            activeTab === 'PHOTOS' 
              ? 'bg-red-950/40 text-red-400 border border-red-800/40' 
              : 'hover:bg-white/5 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Image className="w-3.5 h-3.5" />
          <span>SPECTRAL SNAPSHOTS ({anomalies.filter(a => a.captured).length})</span>
        </button>
      </div>

      {/* Content Panes */}
      <div className="flex-1 overflow-y-auto max-h-[220px] scrollbar-thin scrollbar-thumb-white/5">
        
        {/* TAB 1: ITEMS */}
        {activeTab === 'ITEMS' && (
          <div className="space-y-3">
            {items.filter(i => i.found).length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-600 italic font-serif">
                まだ手がかりやアイテムを発見していません。廊下や部屋を[E鍵]で調査してください。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {items.filter(i => i.found).map(item => (
                  <div 
                    key={item.id} 
                    className="p-3 bg-white/5 border border-white/5 rounded-md flex gap-3.5 items-start glass-panel-hover"
                  >
                    <div className="p-2.5 rounded bg-red-950/50 text-red-400 border border-red-900/30">
                      {item.type === 'keycard' ? <ShieldAlert className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-white/95">{item.name}</h4>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">{item.description}</p>
                      {item.content && (
                        <div className="mt-2 text-[10px] bg-black/60 p-2.5 rounded text-[#fffee0]/80 border border-white/5 italic font-serif leading-relaxed">
                          "{item.content}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STREAM LOGS */}
        {activeTab === 'LOGS' && (
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-600 italic font-serif">
                ログはまだありません。
              </div>
            ) : (
              <div className="space-y-2 font-mono text-[10px]">
                {logs.map((log, index) => (
                  <div key={index} className="flex gap-2.5 text-zinc-400 py-1 border-b border-white/2 select-text">
                    <span className="text-red-500/60 font-black select-none">[{ (index + 1).toString().padStart(2, '0') }]</span>
                    <span className="font-light">{log}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VIRAL PHOTOS */}
        {activeTab === 'PHOTOS' && (
          <div>
            {anomalies.filter(a => a.captured).length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-600 italic font-serif leading-relaxed">
                心霊現象の写真がありません。右上カメラにノイズが走った瞬間に「CAPTURE」を起動して撮影してください。
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {anomalies.filter(a => a.captured).map(anomaly => (
                  <div 
                    key={anomaly.id} 
                    className="bg-[#0c0c0e] border border-white/5 rounded-md p-3 flex flex-col items-center text-center relative overflow-hidden group glass-panel-hover"
                  >
                    <div className="w-full aspect-video bg-black flex items-center justify-center relative rounded overflow-hidden border border-white/5">
                      <div className="absolute inset-0 bg-radial-gradient from-zinc-800 to-black opacity-30" />
                      <div className="w-6 h-6 border-2 border-red-500/30 rounded-full animate-ping" />
                      <CheckCircle className="w-5 h-5 text-emerald-500 relative z-10" />
                    </div>
                    <span className="text-[10px] font-bold text-white/90 mt-2.5 font-sans truncate w-full">{anomaly.description}</span>
                    <span className="text-[8px] font-mono text-red-500 uppercase mt-0.5 tracking-widest font-black">
                      +{anomaly.points.toLocaleString()} PV BUZZ
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
