/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Anomaly,
  CHAPTERS,
  Comment,
  EndingType,
  GameItem,
  GamePhase,
  PlayerState,
} from './types';
import TitleScreen from './components/TitleScreen';
import StreamHeader from './components/StreamHeader';
import PipCamera from './components/PipCamera';
import LiveChat from './components/LiveChat';
import MainGameView from './components/MainGameView';
import InvestigationJournal from './components/InvestigationJournal';
import { AudioSynth } from './utils/audio';
import {
  AlertCircle,
  ArrowRight,
  FastForward,
  Keyboard,
  Radio,
  RotateCcw,
} from 'lucide-react';

const USER_NAMES = [
  'yuyu_game', 'shin_oni', 'shiba_dog', 'piko_piko', 'horror_girl', 'tarou_k',
  'mizuki_v', 'kage_99', 'nanashi_san', 'goma_shio', 'taku_games', 'momo_3',
  'ghost_hunter', 'zero_gravity', 'tanaka_taro', 'horo_horo', 'shinya_ha',
];

const BADGES: ('mod' | 'subscriber' | undefined)[] = [
  'mod',
  'subscriber',
  undefined,
  undefined,
  undefined,
];

const INITIAL_PLAYER: PlayerState = {
  x: 10,
  speed: 1.8,
  isRunning: false,
  isCrouching: false,
  flashlightOn: true,
  flashlightAngle: 0,
  battery: 100,
  tension: 10,
  health: 100,
};

const INITIAL_LOGS = [
  'LIVE配信接続完了。',
  'ストリームチャンネル：心霊突撃Ch 開設。',
  '廃病院「白鳴霊園付属病棟」へ侵入。',
];

const INTRO_STEPS = [
  {
    stamp: '23:41 / OUTSIDE GATE',
    title: '今夜のロケ地は、封鎖された廃病院。',
    body: '「10年前に集団失踪事件が起きて以来、立入禁止になった白鳴霊園付属病棟だ。ここで生配信をすると、生きて帰れないらしい。」',
  },
  {
    stamp: '23:44 / SIGNAL CHECK',
    title: '視聴者が増えるほど、怪異は強くなる。',
    body: '「都市伝説だろうが関係ない。今夜こそ同接10万を叩き出す。コメント欄、お前らが俺の目撃者だ。」',
  },
  {
    stamp: '23:46 / CAMERA ONLINE',
    title: '肉眼では見えないものが、配信カメラには映る。',
    body: '「懐中電灯と右上の配信カメラを使って進む。ノイズや顔認識が出たら、SPACEで怪異を撮影してくれ。」',
  },
  {
    stamp: '23:47 / LIVE',
    title: '配信を切るな。奥まで行って、生きて戻れ。',
    body: '「侵入成功。ここから先は電波も足場も保証なしだ。手がかりを集め、撮れ高を残し、非常口まで辿り着く。」',
  },
] as const;

function createInitialItems(): GameItem[] {
  return [
    {
      id: 'KEYCARD_BLUE',
      name: '診察室のブルーカードキー',
      description: '診察室および遺体安置所の扉を開放するためのセキュリティカードキー。',
      found: false,
      type: 'keycard',
    },
    {
      id: 'DIARY_1',
      name: '看護師の手記（ちぎれた一頁）',
      description: '1998年の事件当夜に書かれたものと思われる記録。',
      found: false,
      type: 'diary',
      content: '「23時47分、突然電子機器が一斉にノイズを吐き始めた。霊安室の扉が内側から叩かれている……これは仕込みじゃない……」',
    },
    {
      id: 'DIARY_2',
      name: '古い配信機材に残されたログ',
      description: '過去にここで失踪した配信者の最後のテキスト下書き。',
      found: false,
      type: 'diary',
      content: '「バズるために来た。カメラの顔認識が、何もない廊下に10個も出ている。奴らはレンズ越しにこちらを見ている……」',
    },
    {
      id: 'PHOTO_OLD',
      name: '祭壇に残された集合写真',
      description: 'かつてこの病院の地下で行われていた、集団生配信儀式の記録写真。',
      found: false,
      type: 'photo',
      content: '「視聴者を媒介にして、彼岸と此岸を接続するLIVE配信儀式。視聴者数が増えるほど、呪いは増幅する。」',
    },
  ];
}

function createInitialAnomalies(): Anomaly[] {
  return [
    { id: 'ANOMALY_1', x: 600, width: 40, type: 'orb', description: '浮遊する蒼い光球（オーブ）', points: 8000, captured: false, visibleOnlyInPip: false, yOffset: -30 },
    { id: 'ANOMALY_2', x: 1500, width: 60, type: 'ghost', description: '鏡の奥に佇む顔の白い少女影', points: 25000, captured: false, visibleOnlyInPip: true, yOffset: -10 },
    { id: 'ANOMALY_3', x: 2000, width: 80, type: 'writing', description: '壁に勝手に浮かび上がる呪詛文字', points: 15000, captured: false, visibleOnlyInPip: false, yOffset: 10 },
    { id: 'ANOMALY_4', x: 2900, width: 50, type: 'doll', description: '車椅子に置かれた勝手に動く日本人形', points: 18000, captured: false, visibleOnlyInPip: false, yOffset: 0 },
    { id: 'ANOMALY_5', x: 4100, width: 70, type: 'ghost', description: '廊下の天井から逆さに吊り下がる男', points: 35000, captured: false, visibleOnlyInPip: true, yOffset: -50 },
    { id: 'ANOMALY_6', x: 4750, width: 90, type: 'shadow', description: '祭壇を覆い尽くす巨大な影', points: 45000, captured: false, visibleOnlyInPip: false, yOffset: -20 },
  ];
}

function createInitialComments(): Comment[] {
  const now = Date.now();
  return [
    { id: 'opening-1', username: 'kage_oni', text: '始まった！ 待ってたで！', type: 'normal', timestamp: now - 3000 },
    { id: 'opening-2', username: 'cyber_neko', text: '今日どこ？ また廃墟かよw', type: 'normal', timestamp: now - 2000 },
    { id: 'opening-3', username: 'mizuki_v', text: '画質ちょっと低くない？ わざと？', type: 'normal', timestamp: now - 1000 },
  ];
}

function pickRandom<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function createId(prefix = 'event'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface LiveSnapshot {
  player: PlayerState;
  chapterId: number;
  viewerCount: number;
  items: GameItem[];
  anomalies: Anomaly[];
  nearestAnomaly: Anomaly | null;
  nearestDistance: number;
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('TITLE');
  const [chapterId, setChapterId] = useState(1);
  const [viewerCount, setViewerCount] = useState(237);
  const [isMuted, setIsMuted] = useState(false);
  const [player, setPlayer] = useState<PlayerState>({ ...INITIAL_PLAYER });
  const [items, setItems] = useState<GameItem[]>(createInitialItems);
  const [anomalies, setAnomalies] = useState<Anomaly[]>(createInitialAnomalies);
  const [logs, setLogs] = useState<string[]>([...INITIAL_LOGS]);
  const [comments, setComments] = useState<Comment[]>(createInitialComments);
  const [endingType, setEndingType] = useState<EndingType>('ESCAPED');
  const [introStep, setIntroStep] = useState(0);

  const gameOverTriggeredRef = useRef(false);
  const chapterTransitionRef = useRef(false);

  const { nearestAnomaly, nearestDistance } = useMemo(() => {
    let nearest: Anomaly | null = null;
    let distance = Number.POSITIVE_INFINITY;

    for (const anomaly of anomalies) {
      const nextDistance = Math.abs(player.x - anomaly.x);
      if (nextDistance < distance) {
        nearest = anomaly;
        distance = nextDistance;
      }
    }

    return { nearestAnomaly: nearest, nearestDistance: distance };
  }, [anomalies, player.x]);

  const liveSnapshotRef = useRef<LiveSnapshot>({
    player,
    chapterId,
    viewerCount,
    items,
    anomalies,
    nearestAnomaly,
    nearestDistance,
  });

  useEffect(() => {
    liveSnapshotRef.current = {
      player,
      chapterId,
      viewerCount,
      items,
      anomalies,
      nearestAnomaly,
      nearestDistance,
    };
  }, [player, chapterId, viewerCount, items, anomalies, nearestAnomaly, nearestDistance]);

  const handleAddLog = useCallback((logText: string) => {
    setLogs((previous) => [...previous.slice(-99), logText]);
  }, []);

  const handleAddComment = useCallback((text: string, isPlayer: boolean) => {
    const newComment: Comment = {
      id: createId('chat'),
      username: isPlayer ? 'STREAMER' : pickRandom(USER_NAMES),
      text,
      type: 'normal',
      timestamp: Date.now(),
    };
    setComments((previous) => [...previous.slice(-45), newComment]);
  }, []);

  useEffect(() => {
    if (phase !== 'PLAYING') return;

    const emitViewerComment = () => {
      const snapshot = liveSnapshotRef.current;
      const { player: currentPlayer, nearestAnomaly: currentAnomaly, nearestDistance: distance } = snapshot;

      let text = 'がんばえー！';
      let type: 'normal' | 'hype' | 'spooky' | 'glitch' | 'hint' = 'normal';

      if (currentPlayer.tension > 80) {
        text = pickRandom([
          'ギャアアアア！ 今の何！', 'うしろ！ うしろ！', '右上カメラに顔認識出てる！',
          'やばいやばいやばい', 'もう逃げろって！ 呪われる！', '配信切ったほうがいい',
          '画面おかしくなってない？', 'み　え　て　る　よ', 'お前の後ろにいる',
        ]);
        type = Math.random() > 0.4 ? 'spooky' : 'glitch';
      } else if (!currentPlayer.flashlightOn) {
        text = pickRandom([
          '暗くて何も見えん！', 'ライトつけてー！', '暗闇に何か立ってる気がする',
          'ビビって消したん？w', 'フラッシュたいてくれ', '画面真っ黒やぞ',
        ]);
      } else if (currentPlayer.isRunning) {
        text = pickRandom([
          'カメラぶれすぎw', 'めっちゃ逃げるやん', '走るな酔うわw',
          'ゆっくり見せてー！', '息荒くて草', '走るとお化けに気づかれるぞ',
        ]);
      } else if (currentAnomaly && distance < 400 && !currentAnomaly.captured) {
        text = pickRandom([
          'おい、右上カメラ見ろ！', '今、影が動いたぞ', 'そこ！ そこ照らして！',
          'なんかいる気がする……', '右上右上右上！', 'キャプチャーして！ 撮れ高やぞ！',
          'そこに何かある！ 調べろ！',
        ]);
        type = 'hint';
      } else {
        text = pickRandom([
          'ここまじで不気味やな', '仕込みじゃないよね？w', 'バズってきたな',
          '同接増えてる！', 'チャンネル登録したわ', '霊安室あるかな？',
          '次の扉を開けてみて！', 'がんばれ！ 応援しとるで', '警察来ない？ 大丈夫？',
        ]);
      }

      if (snapshot.chapterId >= 4 && Math.random() < 0.4) {
        text = pickRandom([
          'しんじゅしんじゅしんじゅ', 'おまえもこっちにこい', 'おまえがおまえがおまえが',
          '†††††††††', '死死死死死死', '逃げられないよ', 'L I V E は 終 わ ら な い',
        ]);
        type = 'glitch';
      }

      const newComment: Comment = {
        id: createId('viewer'),
        username: pickRandom(USER_NAMES),
        text,
        type,
        timestamp: Date.now(),
        badge: pickRandom(BADGES),
      };

      setComments((previous) => [...previous.slice(-45), newComment]);
      setViewerCount((previous) => {
        const multiplier = snapshot.chapterId * 1.5;
        return previous + Math.floor(Math.random() * 50 * multiplier) + 10;
      });

      if (type !== 'glitch' && Math.random() < 0.3) {
        AudioSynth.playNotification();
      }
    };

    const interval = window.setInterval(emitViewerComment, 1800);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'PLAYING') return;

    gameOverTriggeredRef.current = false;
    const interval = window.setInterval(() => {
      const currentPlayer = liveSnapshotRef.current.player;
      if (currentPlayer.tension <= 90 || currentPlayer.health <= 0) return;

      const nextHealth = Math.max(0, currentPlayer.health - 2);
      setPlayer((previous) => ({ ...previous, health: Math.max(0, previous.health - 2) }));

      if (nextHealth <= 0 && !gameOverTriggeredRef.current) {
        gameOverTriggeredRef.current = true;
        setPhase('GAMEOVER');
        AudioSynth.playStinger();
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((previous) => {
      const nextMuted = !previous;
      AudioSynth.setMuted(nextMuted);
      return nextMuted;
    });
  }, []);

  const handleCaptureAnomaly = useCallback(() => {
    const snapshot = liveSnapshotRef.current;
    const anomaly = snapshot.nearestAnomaly;

    if (
      anomaly &&
      snapshot.nearestDistance < 350 &&
      !anomaly.captured &&
      snapshot.player.flashlightOn
    ) {
      setAnomalies((previous) => previous.map((entry) => (
        entry.id === anomaly.id ? { ...entry, captured: true } : entry
      )));

      AudioSynth.playCaptureSuccess();
      AudioSynth.playGlitch();
      setViewerCount((previous) => previous + anomaly.points);
      handleAddLog(`【撮影成功】${anomaly.description}をカメラに収めた！ (+${anomaly.points.toLocaleString()} 視聴者)`);
      setComments((previous) => [
        ...previous.slice(-45),
        {
          id: createId('capture'),
          username: 'mod_taku',
          text: `【スクショ成功】ガチでヤバいやつ激撮！ +${anomaly.points.toLocaleString()}人！`,
          type: 'hype',
          badge: 'mod',
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    AudioSynth.playNotification();
    handleAddLog('【撮影失敗】ライトを点け、怪異が十分近づいてから撮影してください。');
  }, [handleAddLog]);

  const handleTriggerScare = useCallback((type: 'jumpscare' | 'chase' | 'whisper') => {
    AudioSynth.playStinger();
    AudioSynth.playGlitch();

    setPlayer((previous) => {
      if (type === 'jumpscare') {
        return { ...previous, tension: Math.min(100, previous.tension + 35) };
      }
      if (type === 'chase') {
        return { ...previous, tension: 95 };
      }
      return { ...previous, tension: Math.min(100, previous.tension + 15) };
    });
  }, []);

  const resolveEnding = useCallback(() => {
    const snapshot = liveSnapshotRef.current;
    const totalFound = snapshot.items.filter((item) => item.found).length;

    if (snapshot.viewerCount > 100000 && totalFound === 4) {
      setEndingType('LOST_ARCHIVE');
    } else if (snapshot.viewerCount > 130000) {
      setEndingType('OVER_EXPLOITED');
    } else {
      setEndingType('ESCAPED');
    }

    setPhase('ENDING');
    AudioSynth.playStinger();
  }, []);

  const handleChapterComplete = useCallback(() => {
    if (chapterTransitionRef.current) return;
    chapterTransitionRef.current = true;

    const snapshot = liveSnapshotRef.current;
    const currentChapterId = snapshot.chapterId;

    if (currentChapterId < 5) {
      if (currentChapterId === 2 && !snapshot.items.some((item) => item.id === 'KEYCARD_BLUE' && item.found)) {
        handleAddLog('【警告】診察室の扉はロックされている。カードキーを探せ。');
        setPlayer((previous) => ({ ...previous, x: 2350 }));
        window.setTimeout(() => {
          chapterTransitionRef.current = false;
        }, 300);
        return;
      }

      setChapterId(currentChapterId + 1);
      handleAddLog(`【チャプター完了】${CHAPTERS[currentChapterId - 1].title}を突破。`);
      AudioSynth.playNotification();
      window.setTimeout(() => {
        chapterTransitionRef.current = false;
      }, 300);
      return;
    }

    resolveEnding();
  }, [handleAddLog, resolveEnding]);

  const handlePickupItem = useCallback((itemId: string) => {
    const item = liveSnapshotRef.current.items.find((entry) => entry.id === itemId);
    if (!item || item.found) return;

    setItems((previous) => previous.map((entry) => (
      entry.id === itemId ? { ...entry, found: true } : entry
    )));
    AudioSynth.playCaptureSuccess();
    handleAddLog(`【アイテム発見】「${item.name}」を取得した。`);
    setViewerCount((previous) => previous + 5000);
  }, [handleAddLog]);

  const handleRetry = useCallback(() => {
    const currentChapterId = liveSnapshotRef.current.chapterId;
    const retryPosition = currentChapterId === 1
      ? 10
      : currentChapterId === 2
        ? 1220
        : currentChapterId === 3
          ? 2420
          : currentChapterId === 4
            ? 3620
            : 4520;

    setPlayer({ ...INITIAL_PLAYER, x: retryPosition });
    gameOverTriggeredRef.current = false;
    chapterTransitionRef.current = false;
    setPhase('PLAYING');
    handleAddLog('【復帰】配信接続を再試行し、直前のセーフドアから再開した。');
  }, [handleAddLog]);

  const resetGame = useCallback(() => {
    setChapterId(1);
    setViewerCount(237);
    setPlayer({ ...INITIAL_PLAYER });
    setItems(createInitialItems());
    setAnomalies(createInitialAnomalies());
    setLogs([...INITIAL_LOGS]);
    setComments(createInitialComments());
    setEndingType('ESCAPED');
    setIntroStep(0);
    gameOverTriggeredRef.current = false;
    chapterTransitionRef.current = false;
    setPhase('TITLE');
    AudioSynth.playNotification();
  }, []);

  const beginBroadcast = useCallback(() => {
    setPhase('PLAYING');
    AudioSynth.playNotification();
  }, []);

  const currentIntro = INTRO_STEPS[introStep];
  const introProgress = ((introStep + 1) / INTRO_STEPS.length) * 100;

  return (
    <div
      id="app-root-container"
      className="min-h-[100dvh] bg-[#050505] text-zinc-100 flex flex-col relative overflow-x-hidden"
    >
      {phase === 'TITLE' && (
        <TitleScreen
          onStartGame={() => {
            setIntroStep(0);
            setPhase('INTRO_STORY');
          }}
        />
      )}

      {phase === 'INTRO_STORY' && (
        <div
          id="intro-story-container"
          className="fixed inset-0 z-50 overflow-y-auto bg-[#050505] px-4 py-8 sm:p-8"
        >
          <div className="absolute inset-0 title-grid opacity-35 pointer-events-none" />
          <div className="absolute inset-0 signal-noise opacity-25 pointer-events-none" />
          <div className="absolute inset-0 ambient-vignette pointer-events-none" />

          <div className="relative z-10 mx-auto flex min-h-full w-full max-w-5xl items-center justify-center">
            <section className="broadcast-frame w-full overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-[0_35px_100px_rgba(0,0,0,0.9)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.025] px-5 py-4 sm:px-7">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                  <div>
                    <p className="font-mono text-[10px] font-bold tracking-[0.24em] text-red-400">PRE-LIVE TRANSMISSION</p>
                    <p className="mt-0.5 text-[10px] text-zinc-600">{currentIntro.stamp}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={beginBroadcast}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider text-zinc-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <FastForward className="h-3.5 w-3.5" />
                  導入をスキップ
                </button>
              </div>

              <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
                <div className="flex min-h-[420px] flex-col justify-between p-6 sm:p-8 lg:p-10">
                  <div>
                    <div className="mb-8 flex items-center gap-3">
                      <span className="font-mono text-[10px] font-black tracking-[0.28em] text-zinc-600">
                        TRANSMISSION {String(introStep + 1).padStart(2, '0')} / {String(INTRO_STEPS.length).padStart(2, '0')}
                      </span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <h2 className="max-w-3xl text-balance text-3xl font-black leading-tight tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
                      {currentIntro.title}
                    </h2>
                    <p className="mt-7 max-w-2xl text-sm leading-8 text-zinc-300 sm:text-base">
                      {currentIntro.body}
                    </p>
                  </div>

                  <div className="mt-10">
                    <div className="mb-5 h-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-700 via-red-500 to-amber-300 transition-[width] duration-500"
                        style={{ width: `${introProgress}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <p className="font-mono text-[10px] leading-relaxed text-zinc-600">
                        ヘッドホン推奨 / 光の点滅・大音量演出を含みます
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (introStep < INTRO_STEPS.length - 1) {
                            setIntroStep((previous) => previous + 1);
                            AudioSynth.playNotification();
                          } else {
                            beginBroadcast();
                          }
                        }}
                        className="group inline-flex min-w-[190px] items-center justify-center gap-3 rounded-lg bg-red-600 px-5 py-3 text-xs font-black tracking-[0.12em] text-white shadow-[0_0_35px_rgba(220,38,38,0.28)] transition hover:bg-red-500 hover:shadow-[0_0_45px_rgba(220,38,38,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.98]"
                      >
                        {introStep < INTRO_STEPS.length - 1 ? '次の送信ログ' : '配信を開始'}
                        {introStep < INTRO_STEPS.length - 1 ? (
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        ) : (
                          <Radio className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <aside className="border-t border-white/10 bg-white/[0.025] p-6 sm:p-8 lg:border-l lg:border-t-0">
                  <div className="flex items-center gap-2 text-red-400">
                    <Keyboard className="h-4 w-4" />
                    <h3 className="font-mono text-[11px] font-black tracking-[0.2em]">OPERATIONS</h3>
                  </div>

                  <div className="mt-6 space-y-3">
                    {[
                      ['A / D・← / →', '移動'],
                      ['SHIFT', '走る'],
                      ['S / CTRL', 'しゃがむ'],
                      ['F', '懐中電灯'],
                      ['E', '調べる'],
                      ['SPACE', '怪異を撮影'],
                    ].map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
                        <kbd className="rounded border border-white/10 bg-black px-2 py-1 font-mono text-[10px] font-black text-zinc-200 shadow-inner">
                          {key}
                        </kbd>
                        <span className="text-xs text-zinc-500">{label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 rounded-xl border border-red-500/15 bg-red-950/15 p-4">
                    <p className="font-mono text-[9px] font-black tracking-[0.18em] text-red-400">MISSION</p>
                    <p className="mt-2 text-xs leading-6 text-zinc-400">
                      手がかりを回収し、怪異を配信カメラに収め、最奥の非常口へ到達する。
                    </p>
                  </div>
                </aside>
              </div>
            </section>
          </div>
        </div>
      )}

      {phase === 'PLAYING' && (
        <div id="game-active-layout" className="min-h-[100dvh] flex-1">
          <StreamHeader
            viewerCount={viewerCount}
            battery={player.battery}
            tension={player.tension}
            chapterTitle={CHAPTERS[chapterId - 1].title}
            chapterSubtitle={CHAPTERS[chapterId - 1].subtitle}
            onToggleMute={handleToggleMute}
            isMuted={isMuted}
          />

          <main className="relative z-20 mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-3 p-2 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(0,3fr)_minmax(290px,1fr)] lg:grid-rows-[auto_minmax(280px,1fr)]">
            <section className="min-w-0 lg:col-start-1 lg:row-start-1">
              <MainGameView
                player={player}
                setPlayer={setPlayer}
                anomalies={anomalies}
                onAnomaliesUpdate={setAnomalies}
                items={items}
                onAddLog={handleAddLog}
                onPickupItem={handlePickupItem}
                onTriggerScare={handleTriggerScare}
                currentChapterId={chapterId}
                onChapterComplete={handleChapterComplete}
                onCaptureAnomaly={handleCaptureAnomaly}
              />
            </section>

            <aside className="min-w-0 lg:col-start-2 lg:row-start-1">
              <PipCamera
                currentAnomaly={nearestAnomaly}
                anomalyDistance={nearestDistance}
                tension={player.tension}
                flashlightOn={player.flashlightOn}
                onCaptureAnomaly={handleCaptureAnomaly}
                canCapture={Boolean(
                  nearestAnomaly &&
                  nearestDistance < 350 &&
                  !nearestAnomaly.captured &&
                  player.flashlightOn
                )}
              />
            </aside>

            <section className="min-h-[250px] min-w-0 lg:col-start-1 lg:row-start-2">
              <InvestigationJournal items={items} anomalies={anomalies} logs={logs} />
            </section>

            <aside className="min-h-[420px] min-w-0 lg:col-start-2 lg:row-start-2">
              <LiveChat
                comments={comments}
                onAddComment={handleAddComment}
                tension={player.tension}
                flashlightOn={player.flashlightOn}
                isRunning={player.isRunning}
              />
            </aside>
          </main>
        </div>
      )}

      {phase === 'ENDING' && (
        <div id="game-ending-sequence" className="fixed inset-0 z-50 overflow-y-auto bg-[#050505] p-4 sm:p-8">
          <div className="absolute inset-0 title-grid opacity-25 pointer-events-none" />
          <div className="absolute inset-0 crt-scanlines opacity-15 pointer-events-none" />
          <div className="relative z-10 mx-auto flex min-h-full max-w-3xl items-center justify-center">
            <section className="broadcast-frame w-full rounded-2xl border border-white/10 bg-black/85 p-6 text-center shadow-[0_35px_100px_rgba(0,0,0,0.95)] sm:p-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-950/25 px-3 py-1.5 font-mono text-[10px] font-black tracking-[0.2em] text-red-400">
                STREAM TERMINATION ARCHIVE
              </span>

              <h2 className="mt-6 text-balance text-3xl font-black tracking-[-0.035em] text-white sm:text-5xl">
                {endingType === 'LOST_ARCHIVE'
                  ? 'ENDING A — THE LOST ARCHIVE'
                  : endingType === 'OVER_EXPLOITED'
                    ? 'ENDING B — FULLY EXPLOITED'
                    : 'ENDING C — RETREAT'}
              </h2>
              <p className="mt-3 font-mono text-[10px] tracking-[0.18em] text-zinc-600">
                {endingType === 'LOST_ARCHIVE'
                  ? '深淵の真実'
                  : endingType === 'OVER_EXPLOITED'
                    ? '狂気のバズ'
                    : '生存という選択'}
              </p>

              <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-white/10 bg-white/[0.025] p-5 text-left text-sm leading-8 text-zinc-300 sm:p-7">
                {endingType === 'LOST_ARCHIVE' ? (
                  <p>
                    君はすべての手記と異常写真を集め、廃墟の奥に隠された儀式を発見した。過去の失踪事件は、配信カメラを通じて彼岸を接続する生贄の儀式だった。アーカイブはネットの深部に刻まれ、消せない証拠として残り続ける。
                  </p>
                ) : endingType === 'OVER_EXPLOITED' ? (
                  <p>
                    同接10万を超えた瞬間、視聴者の熱狂は「何か」を完全に目覚めさせた。配信終了ボタンは反応しない。赤いLIVE表示だけが点滅し、君は終わらない配信ループへ引きずり込まれた。
                  </p>
                ) : (
                  <p>
                    君は撮れ高より命を選び、夜明け前に病棟を脱出した。コメント欄には臆病者と書かれたが、生きて朝を迎えた。それ以上に価値のある数字は存在しない。
                  </p>
                )}
              </div>

              <div className="mt-8 grid grid-cols-3 overflow-hidden rounded-xl border border-white/10 bg-black font-mono">
                <div className="p-4 sm:p-5">
                  <p className="text-[8px] tracking-wider text-zinc-600 sm:text-[9px]">FINAL VIEWERS</p>
                  <p className="mt-2 text-sm font-black text-white sm:text-lg">{viewerCount.toLocaleString()}</p>
                </div>
                <div className="border-x border-white/10 p-4 sm:p-5">
                  <p className="text-[8px] tracking-wider text-zinc-600 sm:text-[9px]">CLUES</p>
                  <p className="mt-2 text-sm font-black text-white sm:text-lg">{items.filter((item) => item.found).length} / 4</p>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-[8px] tracking-wider text-zinc-600 sm:text-[9px]">CAPTURES</p>
                  <p className="mt-2 text-sm font-black text-white sm:text-lg">{anomalies.filter((anomaly) => anomaly.captured).length} / 6</p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetGame}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-xs font-black tracking-[0.12em] text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <RotateCcw className="h-4 w-4" />
                タイトルへ戻る
              </button>
            </section>
          </div>
        </div>
      )}

      {phase === 'GAMEOVER' && (
        <div id="game-over-container" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/90 p-4 backdrop-blur-lg">
          <section className="broadcast-frame relative w-full max-w-md overflow-hidden rounded-2xl border border-red-500/20 bg-[#080505] p-7 text-center shadow-[0_30px_90px_rgba(127,29,29,0.28)] sm:p-9">
            <div className="absolute inset-0 crt-scanlines opacity-25 pointer-events-none" />
            <div className="relative z-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-500/25 bg-red-950/25 text-red-500">
                <AlertCircle className="h-8 w-8" />
              </div>
              <p className="mt-6 font-mono text-[10px] font-black tracking-[0.25em] text-red-500">SIGNAL LOST</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">精神同調が切断されました</h2>
              <p className="mt-5 text-sm leading-7 text-zinc-400">
                TENSIONが限界に達し、配信カメラと意識の接続が失われました。直前のセーフドアから再接続できます。
              </p>

              <button
                type="button"
                onClick={handleRetry}
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3.5 text-xs font-black tracking-[0.12em] text-white shadow-[0_0_35px_rgba(220,38,38,0.25)] transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4" />
                STREAMを再接続
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
