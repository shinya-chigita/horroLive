/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ArrowLeft,
  Archive,
  Building2,
  ChevronRight,
  LockKeyhole,
  Radio,
  RotateCcw,
  School,
} from 'lucide-react';
import type { BoardId, RunMode } from '../types';
import {
  BOARD_DEFINITIONS,
  BOARD_IDS,
  getBoardDefinition,
} from '../game/boardDefinitions';
import {
  isRunModeUnlocked,
  type ProgressionState,
} from '../game/progression';
import { RUNTIME_ATLASES } from '../game/runtimeVisualAssets';

export interface BoardSelectScreenProps {
  selectedBoardId: BoardId;
  selectedMode: RunMode;
  progression: ProgressionState;
  onSelectBoard: (boardId: BoardId) => void;
  onSelectMode: (mode: RunMode) => void;
  onStart: () => void;
  onStartPrototype: () => void;
  onBack: () => void;
}

const RUN_MODES: readonly RunMode[] = ['STANDARD', 'DEEP_BROADCAST'];

const HOSPITAL_PROPS_ATLAS = RUNTIME_ATLASES['hospital-props'];
const HOSPITAL_PROPS_CELL_WIDTH =
  HOSPITAL_PROPS_ATLAS.width / HOSPITAL_PROPS_ATLAS.columns;
const HOSPITAL_PROPS_CELL_HEIGHT =
  HOSPITAL_PROPS_ATLAS.height / HOSPITAL_PROPS_ATLAS.rows;
const OBSERVER_ATLAS = RUNTIME_ATLASES.observer;
const OBSERVER_CELL_WIDTH = OBSERVER_ATLAS.width / OBSERVER_ATLAS.columns;

interface AtlasSpriteProps {
  href: string;
  atlasWidth: number;
  atlasHeight: number;
  viewBox: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
}

function AtlasSprite({
  href,
  atlasWidth,
  atlasHeight,
  viewBox,
  x,
  y,
  width,
  height,
  opacity = 1,
}: AtlasSpriteProps) {
  return (
    <svg
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox={viewBox}
      preserveAspectRatio="none"
      overflow="hidden"
      opacity={opacity}
      aria-hidden="true"
    >
      <image
        href={href}
        width={atlasWidth}
        height={atlasHeight}
        preserveAspectRatio="none"
        style={{ imageRendering: 'pixelated' }}
      />
    </svg>
  );
}

function BoardSignal({ boardId }: { boardId: BoardId }) {
  if (boardId === 'school') {
    return (
      <svg
        aria-hidden="true"
        className="h-full w-full"
        viewBox="0 0 420 176"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width="420" height="176" fill="#090a09" />
        <path d="M0 139H420M0 143H420" stroke="#35362f" strokeWidth="2" />
        <path d="M34 32H386V140H34Z" fill="#0d0e0d" stroke="#34352f" />
        <path d="M52 52H176V118H52ZM244 52H368V118H244Z" fill="#111310" stroke="#292b26" />
        {[66, 92, 118, 270, 296, 322].map((x) => (
          <path key={x} d={`M${x} 52V118`} stroke="#252721" />
        ))}
        <path d="M194 46H226V140H194Z" fill="#070807" stroke="#31322d" />
        <path d="M199 60H221" stroke="#4b4b42" />
        <path d="M86 128h54m-44-11h34m151 11h54m-44-11h34" stroke="#4a473d" strokeWidth="3" />
        <path d="M313 51c-5 7-7 17-6 31m9-31c6 12 5 26 2 38" stroke="#171817" strokeWidth="5" opacity=".9" />
        <rect x="0" y="0" width="420" height="176" fill="url(#schoolFade)" />
        <defs>
          <linearGradient id="schoolFade" x1="0" x2="1">
            <stop stopColor="#000" stopOpacity=".62" />
            <stop offset=".48" stopColor="#000" stopOpacity=".08" />
            <stop offset="1" stopColor="#000" stopOpacity=".72" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      viewBox="0 0 420 176"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="420" height="176" fill="#090a09" />
      <path d="M0 139H420M0 143H420" stroke="#36362f" strokeWidth="2" />
      <path d="M26 27H394V140H26Z" fill="#0d0e0d" stroke="#33342e" />
      <path d="M45 48H135V140H45ZM284 48H375V140H284Z" fill="#11120f" stroke="#292a25" />
      <path d="M157 42H263V140H157Z" fill="#080908" stroke="#36372f" />
      <path d="M170 56H250M170 72H250M170 88H250" stroke="#272821" />
      <path d="M76 118h43m-37-15h30m193 15h43m-36-15h30" stroke="#4a473d" strokeWidth="3" />
      <path d="M328 55c-6 13-7 27-5 43m8-43c5 9 7 21 5 35" stroke="#171817" strokeWidth="6" opacity=".88" />
      <AtlasSprite
        href={HOSPITAL_PROPS_ATLAS.url}
        atlasWidth={HOSPITAL_PROPS_ATLAS.width}
        atlasHeight={HOSPITAL_PROPS_ATLAS.height}
        viewBox={`0 0 ${HOSPITAL_PROPS_CELL_WIDTH} ${HOSPITAL_PROPS_CELL_HEIGHT}`}
        x={20}
        y={68}
        width={166}
        height={96}
      />
      <AtlasSprite
        href={HOSPITAL_PROPS_ATLAS.url}
        atlasWidth={HOSPITAL_PROPS_ATLAS.width}
        atlasHeight={HOSPITAL_PROPS_ATLAS.height}
        viewBox={`0 ${HOSPITAL_PROPS_CELL_HEIGHT * 2} ${HOSPITAL_PROPS_CELL_WIDTH} ${HOSPITAL_PROPS_CELL_HEIGHT}`}
        x={174}
        y={35}
        width={72}
        height={128}
      />
      <AtlasSprite
        href={HOSPITAL_PROPS_ATLAS.url}
        atlasWidth={HOSPITAL_PROPS_ATLAS.width}
        atlasHeight={HOSPITAL_PROPS_ATLAS.height}
        viewBox={`${HOSPITAL_PROPS_CELL_WIDTH * 2} 0 ${HOSPITAL_PROPS_CELL_WIDTH} ${HOSPITAL_PROPS_CELL_HEIGHT}`}
        x={272}
        y={74}
        width={92}
        height={86}
      />
      <AtlasSprite
        href={OBSERVER_ATLAS.url}
        atlasWidth={OBSERVER_ATLAS.width}
        atlasHeight={OBSERVER_ATLAS.height}
        viewBox={`0 0 ${OBSERVER_CELL_WIDTH} ${OBSERVER_ATLAS.height}`}
        x={346}
        y={17}
        width={74}
        height={150}
        opacity={0.24}
      />
      <rect x="0" y="0" width="420" height="176" fill="url(#hospitalFade)" />
      <defs>
        <linearGradient id="hospitalFade" x1="0" x2="1">
          <stop stopColor="#000" stopOpacity=".6" />
          <stop offset=".5" stopColor="#000" stopOpacity=".04" />
          <stop offset="1" stopColor="#000" stopOpacity=".75" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function BoardSelectScreen({
  selectedBoardId,
  selectedMode,
  progression,
  onSelectBoard,
  onSelectMode,
  onStart,
  onStartPrototype,
  onBack,
}: BoardSelectScreenProps) {
  const selectedBoard = getBoardDefinition(selectedBoardId);
  const selectedModeUnlocked = isRunModeUnlocked(
    progression,
    selectedBoardId,
    selectedMode,
  );

  const handleBoardSelect = (boardId: BoardId) => {
    onSelectBoard(boardId);
    if (!isRunModeUnlocked(progression, boardId, selectedMode)) {
      onSelectMode('STANDARD');
    }
  };

  return (
    <section className="fixed inset-0 z-50 overflow-y-auto bg-[#050505] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 broadcast-grid opacity-30" />
      <div className="pointer-events-none fixed inset-0 ambient-vignette" />
      <div className="pointer-events-none fixed inset-0 noise-layer opacity-[0.018]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1540px] flex-col px-4 py-4 sm:px-7 sm:py-6 lg:px-10">
        <header className="flex items-start justify-between gap-5 border-b border-white/12 pb-4">
          <div className="flex min-w-0 items-start gap-3 sm:gap-5">
            <button
              type="button"
              onClick={onBack}
              className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center border border-white/12 bg-black/50 text-zinc-500 transition-colors hover:border-white/25 hover:text-zinc-100"
              aria-label="タイトルへ戻る"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-red-700">
                location routing / pre-broadcast
              </p>
              <h1 className="mt-1 font-serif text-xl font-semibold tracking-[0.08em] text-zinc-100 sm:text-3xl">
                配信する盤面を選ぶ
              </h1>
              <p className="mt-2 max-w-2xl text-[10px] leading-relaxed text-zinc-600 sm:text-xs">
                場所ごとに怪異、証拠、進行ルールが異なる。回収記録は次の配信へ引き継がれる。
              </p>
            </div>
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <div className="flex items-center justify-end gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-red-700">
              <span className="h-1.5 w-1.5 bg-red-700" /> standby
            </div>
            <p className="mt-2 font-mono text-[8px] text-zinc-700">ROUTER / 2 LOCATIONS</p>
          </div>
        </header>

        <main className="grid flex-1 gap-7 py-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(310px,.65fr)] lg:items-start lg:gap-8 lg:py-8">
          <section aria-labelledby="board-list-heading">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-zinc-700">01 / board</p>
                <h2 id="board-list-heading" className="mt-1 text-xs font-semibold tracking-[0.09em] text-zinc-300">
                  調査地点
                </h2>
              </div>
              <p className="font-mono text-[8px] text-zinc-700">{BOARD_IDS.length} SIGNALS FOUND</p>
            </div>

            <div role="radiogroup" aria-label="調査地点" className="grid gap-3 md:grid-cols-2">
              {BOARD_IDS.map((boardId) => {
                const board = BOARD_DEFINITIONS[boardId];
                const boardProgress = progression.boards[boardId];
                const isSelected = boardId === selectedBoardId;
                const BoardIcon = boardId === 'school' ? School : Building2;

                return (
                  <button
                    key={boardId}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleBoardSelect(boardId)}
                    className={`group relative overflow-hidden border text-left transition-colors ${
                      isSelected
                        ? 'border-red-900/90 bg-[#0d0c0c]'
                        : 'border-white/10 bg-[#080808] hover:border-white/20 hover:bg-[#0b0b0b]'
                    }`}
                  >
                    <div className="relative h-28 overflow-hidden border-b border-white/8 sm:h-36">
                      <BoardSignal boardId={boardId} />
                      <div className="absolute inset-0 crt-scanlines opacity-25" />
                      <div className="absolute left-3 top-3 flex items-center gap-2 border border-white/10 bg-black/75 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.15em] text-zinc-500">
                        <BoardIcon className="h-3 w-3 text-zinc-600" aria-hidden="true" />
                        {board.caseNumber}
                      </div>
                      {isSelected && (
                        <span className="absolute right-3 top-3 flex items-center gap-1.5 bg-red-950/85 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.14em] text-red-300">
                          <span className="h-1.5 w-1.5 bg-red-600" /> selected
                        </span>
                      )}
                    </div>

                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-zinc-700">{board.code}</p>
                          <h3 className="mt-1.5 font-serif text-lg font-semibold tracking-[0.05em] text-zinc-200">
                            {board.title}
                          </h3>
                          <p className="mt-1 text-[10px] text-zinc-600">{board.subtitle}</p>
                        </div>
                        <ChevronRight
                          className={`mt-3 h-4 w-4 shrink-0 transition-transform ${
                            isSelected ? 'translate-x-0 text-red-800' : 'text-zinc-800 group-hover:translate-x-0.5 group-hover:text-zinc-500'
                          }`}
                          aria-hidden="true"
                        />
                      </div>

                      <p className="mt-4 min-h-10 text-[10px] leading-5 text-zinc-500">
                        {board.description}
                      </p>

                      <dl className="mt-4 grid grid-cols-4 border-y border-white/8 py-3 font-mono">
                        <div>
                          <dt className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">attempt</dt>
                          <dd className="mt-1 text-[10px] text-zinc-400">{boardProgress.attempts}</dd>
                        </div>
                        <div>
                          <dt className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">clear</dt>
                          <dd className="mt-1 text-[10px] text-zinc-400">{boardProgress.clears}</dd>
                        </div>
                        <div>
                          <dt className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">ending</dt>
                          <dd className="mt-1 text-[10px] text-zinc-400">{boardProgress.endings.length}/3</dd>
                        </div>
                        <div>
                          <dt className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">archive</dt>
                          <dd className="mt-1 text-[10px] text-zinc-400">{boardProgress.bestArchivePercent}%</dd>
                        </div>
                      </dl>

                      <div className="mt-4 flex items-center gap-2 font-mono text-[7px] uppercase tracking-[0.11em] text-zinc-700">
                        {board.chapters.map((chapter, chapterIndex) => (
                          <div key={chapter.id} className="flex min-w-0 flex-1 items-center gap-2">
                            <span className={`h-1.5 w-1.5 shrink-0 ${isSelected ? 'bg-red-900' : 'bg-zinc-800'}`} />
                            {chapterIndex < board.chapters.length - 1 && <span className="h-px min-w-2 flex-1 bg-white/8" />}
                          </div>
                        ))}
                        <span className="shrink-0">{board.chapters.length} zones</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="border border-white/10 bg-[#080808]/95 lg:sticky lg:top-8" aria-labelledby="mode-heading">
            <div className="border-b border-red-950/80 bg-red-950/10 p-4 sm:p-5">
              <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-red-700">
                <Radio className="h-3 w-3" aria-hidden="true" /> quality gate 2
              </div>
              <h2 className="mt-2 text-sm font-semibold tracking-[0.08em] text-zinc-200">
                改善プロトタイプ
              </h2>
              <p className="mt-2 text-[9px] leading-relaxed text-zinc-600">
                病院STANDARDの固定検証経路。撮影→同接上昇→追跡→脱出→LIVE残留を3〜5分で確認する。
              </p>
              <button
                type="button"
                onClick={onStartPrototype}
                className="mt-4 flex w-full items-center justify-between border border-red-900/80 bg-red-950/35 px-4 py-3 text-left transition-colors hover:border-red-700 hover:bg-red-950/50"
              >
                <span>
                  <span className="block font-mono text-[7px] uppercase tracking-[0.16em] text-red-700">required route / 180–300 sec</span>
                  <span className="mt-1 block text-[11px] font-semibold tracking-[0.1em] text-zinc-100">品質ゲート用ビルドを開始</span>
                </span>
                <ChevronRight className="h-4 w-4 text-red-800" aria-hidden="true" />
              </button>
            </div>

            <div className="border-b border-white/10 p-4 sm:p-5">
              <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-zinc-700">02 / broadcast condition</p>
              <h2 id="mode-heading" className="mt-1 text-xs font-semibold tracking-[0.09em] text-zinc-300">
                配信条件
              </h2>
            </div>

            <div role="radiogroup" aria-label="配信条件" className="space-y-2 p-3 sm:p-4">
              {RUN_MODES.map((mode) => {
                const definition = selectedBoard.modes[mode];
                const unlocked = isRunModeUnlocked(progression, selectedBoardId, mode);
                const isSelected = selectedMode === mode;

                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={!unlocked}
                    onClick={() => onSelectMode(mode)}
                    className={`w-full border p-4 text-left transition-colors ${
                      isSelected && unlocked
                        ? 'border-red-900/80 bg-red-950/10'
                        : 'border-white/8 bg-black/20 hover:border-white/18'
                    } disabled:cursor-not-allowed disabled:border-white/5 disabled:opacity-45`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center border ${
                        isSelected && unlocked ? 'border-red-800 text-red-700' : 'border-white/10 text-zinc-700'
                      }`}>
                        {unlocked ? (
                          mode === 'STANDARD' ? <Radio className="h-3 w-3" aria-hidden="true" /> : <RotateCcw className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <LockKeyhole className="h-3 w-3" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold tracking-[0.08em] text-zinc-300">{definition.label}</span>
                          <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-zinc-700">
                            {unlocked ? mode : 'clear required'}
                          </span>
                        </span>
                        <span className="mt-2 block text-[9px] leading-relaxed text-zinc-600">{definition.description}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-white/10 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[7px] uppercase tracking-[0.13em] text-zinc-700">selected signal</p>
                  <p className="mt-1 text-[11px] font-medium text-zinc-400">{selectedBoard.locationLabel}</p>
                </div>
                <Archive className="h-4 w-4 text-zinc-800" aria-hidden="true" />
              </div>
              <button
                type="button"
                onClick={onStart}
                disabled={!selectedModeUnlocked}
                className="group mt-5 flex w-full items-center justify-between border border-red-900/80 bg-red-950/30 px-4 py-3.5 text-left transition-colors hover:border-red-700 hover:bg-red-950/45 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>
                  <span className="block font-mono text-[7px] uppercase tracking-[0.16em] text-red-800">open channel</span>
                  <span className="mt-1 block text-xs font-semibold tracking-[0.12em] text-zinc-100">この盤面で配信開始</span>
                </span>
                <ChevronRight className="h-4 w-4 text-red-800 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            </div>
          </aside>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-3 font-mono text-[7px] uppercase tracking-[0.13em] text-zinc-700">
          <p>盤面クリアで「深夜再送」を解放</p>
          <p>{progression.boards[selectedBoardId].challenges.length} challenge records</p>
        </footer>
      </div>
    </section>
  );
}
