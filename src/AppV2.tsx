/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Camera,
  Home,
  Radio,
  RotateCcw,
} from 'lucide-react';
import {
  Anomaly,
  CHAPTERS,
  Comment,
  EndingType,
  GameItem,
  GamePhase,
  PlayerState,
} from './types';
import InvestigationJournal from './components/InvestigationJournal';
import MainGameView from './components/MainGameView';
import LiveChatV2 from './components/LiveChatV2';
import PipCameraV2 from './components/PipCameraV2';
import StreamHeaderV2 from './components/StreamHeaderV2';
import TitleScreenV2 from './components/TitleScreenV2';
import { AudioSynth } from './utils/audio';

const USER_NAMES = [
  'yuyu_game',
  'shin_oni',
  'shiba_dog',
  'piko_piko',
  'horror_girl',
  'tarou_k',
  'mizuki_v',
  'kage_99',
  'nanashi_san',
  'goma_shio',
  'taku_games',
  'momo_3',
  'ghost_hunter',
  'zero_gravity',
  'tanaka_taro',
  'horo_horo',
  'shinya_ha',
];

const BADGES: Comment['badge'][] = [
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

const createInitialItems = (): GameItem[] => [
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
    content:
      '「23時47分、突然電子機器が一斉にノイズを吐き始めた。霊安室の扉が内側から叩かれている……これは仕込みじゃない……」',
  },
  {
    id: 'DIARY_2',
    name: '古い配信機材に残されたログ',
    description: '過去にここで失踪した配信者の最後のテキスト下書き。',
    found: false,
    type: 'diary',
    content:
      '「バズるために来た。カメラの顔認識が、何もない廊下に10個も出ている。奴らはレンズ越しにこちらを見ている……」',
  },
  {
    id: 'PHOTO_OLD',
    name: '祭壇に残された集合写真',
    description: 'かつてこの病院の地下で行われていた、集団生配信儀式の記録写真。',
    found: false,
    type: 'photo',
    content:
      '「視聴者を媒介にして、彼岸と此岸を接続するLIVE配信儀式。視聴者数が増えるほど、呪いは増幅する。」',
  },
];

const createInitialAnomalies = (): Anomaly[] => [
  {
    id: 'ANOMALY_1',
    x: 600,
    width: 40,
    type: 'orb',
    description: '浮遊する蒼い光球（オーブ）',
    points: 8000,
    captured: false,
    visibleOnlyInPip: false,
    yOffset: -30,
  },
  {
    id: 'ANOMALY_2',
    x: 1500,
    width: 60,
    type: 'ghost',
    description: '鏡の奥に佇む顔の白い少女影',
    points: 25000,
    captured: false,
    visibleOnlyInPip: true,
    yOffset: -10,
  },
  {
    id: 'ANOMALY_3',
    x: 2000,
    width: 80,
    type: 'writing',
    description: '壁に勝手に浮かび上がる呪詛文字',
    points: 15000,
    captured: false,
    visibleOnlyInPip: false,
    yOffset: 10,
  },
  {
    id: 'ANOMALY_4',
    x: 2900,
    width: 50,
    type: 'doll',
    description: '車椅子に置かれた勝手に動く日本人形',
    points: 18000,
    captured: false,
    visibleOnlyInPip: false,
    yOffset: 0,
  },
  {
    id: 'ANOMALY_5',
    x: 4100,
    width: 70,
    type: 'ghost',
    description: '廊下の天井から逆さに吊る下がる男',
    points: 35000,
    captured: false,
    visibleOnlyInPip: true,
    yOffset: -50,
  },
  {
    id: 'ANOMALY_6',
    x: 4750,
    width: 90,
    type: 'shadow',
    description: '祭壇を覆い尽くす巨大な影',
    points: 45000,
    captured: false,
    visibleOnlyInPip: false,
    yOffset: -20,
  },
];

const createInitialComments = (): Comment[] => {
  const now = Date.now();
  return [
    {
      id: 'seed-1',
      username: 'kage_oni',
      text: '始まった！待ってたで！',
      type: 'normal',
      timestamp: now - 3000,
    },
    {
      id: 'seed-2',
      username: 'cyber_neko',
      text: '今日どこ？ また廃墟かよw',
      type: 'normal',
      timestamp: now - 2000,
    },
    {
      id: 'seed-3',
      username: 'mizuki_v',
      text: '右上のカメラ、さっきから一瞬だけ変じゃない？',
      type: 'hint',
      timestamp: now - 1000,
    },
  ];
};

const INITIAL_LOGS = [
  'LIVE配信接続完了。',
  'ストリームチャンネル：心霊突撃Ch 開設。',
  '廃病院「白鳴霊園付属病棟」へ侵入。映像記録を開始した。',
];

const INTRO_TEXTS = [
  {
    label: '23:42 / OUTSIDE',
    text: '「今夜は、配信者が何人も消えた廃病院から生配信する。肉眼で見えなくても、カメラには映るらしい。」',
  },
  {
    label: '23:47 / SIGNAL ONLINE',
    text: '「頼れるのは懐中電灯と右上の配信用カメラ、それからコメント欄だけ。視聴者が先に異変を見つけるかもしれない。」',
  },
  {
    label: '23:49 / RULE DISCOVERED',
    text: '「怪異を画面中央に捉えたら撮影する。手記も回収する。同接が増えるほど撮れ高は上がるが、ここでは何かも強くなる。」',
  },
  {
    label: '23:50 / DOOR UNSEALED',
    text: '「奥の祭壇まで行き、真相を記録して、生きて帰る。……配信、開始。」',
  },
];

const startPositionForChapter = (chapterId: number) =>
  CHAPTERS[Math.max(0, chapterId - 1)]?.startPos ?? 10;

const uniqueId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function AppV2() {
  const [phase, setPhase] = useState<GamePhase>('TITLE');
  const [chapterId, setChapterId] = useState(1);
  const [viewerCount, setViewerCount] = useState(237);
  const [isMuted, setIsMuted] = useState(false);
  const [introStep, setIntroStep] = useState(0);
  const [endingType, setEndingType] = useState<EndingType>('ESCAPED');
  const [showChapterCard, setShowChapterCard] = useState(false);

  const [player, setPlayer] = useState<PlayerState>({ ...INITIAL_PLAYER });
  const [items, setItems] = useState<GameItem[]>(createInitialItems);
  const [anomalies, setAnomalies] = useState<Anomaly[]>(createInitialAnomalies);
  const [logs, setLogs] = useState<string[]>([...INITIAL_LOGS]);
  const [comments, setComments] = useState<Comment[]>(createInitialComments);

  const playerRef = useRef(player);
  const itemsRef = useRef(items);
  const anomaliesRef = useRef(anomalies);
  const chapterRef = useRef(chapterId);
  const viewerRef = useRef(viewerCount);
  const nearestRef = useRef<{ anomaly: Anomaly | null; distance: number }>({
    anomaly: null,
    distance: Number.POSITIVE_INFINITY,
  });
  const transitionGuardRef = useRef<number | null>(null);
  const emptyBatteryLoggedRef = useRef(false);
  const gameOverTriggeredRef = useRef(false);

  const nearest = useMemo(() => {
    let anomaly: Anomaly | null = null;
    let distance = Number.POSITIVE_INFINITY;

    for (const candidate of anomalies) {
      const nextDistance = Math.abs(player.x - candidate.x);
      if (nextDistance < distance) {
        anomaly = candidate;
        distance = nextDistance;
      }
    }

    return { anomaly, distance };
  }, [anomalies, player.x]);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    anomaliesRef.current = anomalies;
  }, [anomalies]);

  useEffect(() => {
    chapterRef.current = chapterId;
    transitionGuardRef.current = null;
  }, [chapterId]);

  useEffect(() => {
    viewerRef.current = viewerCount;
  }, [viewerCount]);

  useEffect(() => {
    nearestRef.current = nearest;
  }, [nearest]);

  const handleAddLog = useCallback((logText: string) => {
    setLogs((previous) => [...previous.slice(-79), logText]);
  }, []);

  const pushComment = useCallback(
    (comment: Omit<Comment, 'id' | 'timestamp'>) => {
      setComments((previous) => [
        ...previous.slice(-59),
        {
          ...comment,
          id: uniqueId('chat'),
          timestamp: Date.now(),
        },
      ]);
    },
    [],
  );

  const handleAddComment = useCallback(
    (text: string, isPlayer: boolean) => {
      pushComment({
        username: isPlayer ? 'STREAMER' : 'anonymous',
        text,
        type: 'normal',
      });
    },
    [pushComment],
  );

  useEffect(() => {
    if (phase !== 'PLAYING') return undefined;

    let timerId = 0;

    const schedule = () => {
      const delay = 1450 + Math.random() * 1350;
      timerId = window.setTimeout(emitComment, delay);
    };

    const emitComment = () => {
      const currentPlayer = playerRef.current;
      const currentNearest = nearestRef.current;
      const currentChapter = chapterRef.current;
      const user = USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)];
      const badge = BADGES[Math.floor(Math.random() * BADGES.length)];

      let text = 'ここ、空気やばくない？';
      let type: Comment['type'] = 'normal';

      if (currentPlayer.tension > 88) {
        const lines = [
          'うしろ！！ 今すぐ走れ！',
          '右上の顔認識、数が増えてる',
          '音消したの誰？ 息だけ聞こえる',
          '配信切れ、マジで帰れ',
          'み　え　て　る　よ',
          'コメントしてるの、今もう視聴者だけじゃない',
        ];
        text = lines[Math.floor(Math.random() * lines.length)];
        type = Math.random() > 0.35 ? 'spooky' : 'glitch';
      } else if (!currentPlayer.flashlightOn) {
        const lines = [
          'ライト消えた！？',
          '暗闇の左側に誰かいる',
          '電池、温存したほうがいいけど今は点けて',
          '画面真っ黒なのに右上だけ顔認識してる',
        ];
        text = lines[Math.floor(Math.random() * lines.length)];
        type = 'spooky';
      } else if (currentPlayer.isRunning) {
        const lines = [
          'カメラぶれすぎ！ でも止まるな！',
          '後ろの足音、配信者のと合ってない',
          '走れ走れ走れ',
          '今の曲がり角に何かいたぞ',
        ];
        text = lines[Math.floor(Math.random() * lines.length)];
      } else if (
        currentNearest.anomaly &&
        currentNearest.distance < 430 &&
        !currentNearest.anomaly.captured
      ) {
        const lines = [
          '右上カメラを見て！',
          '画面中央、そこに合わせて撮って！',
          '肉眼じゃなくてカメラにいる',
          '止まって。今、顔認識が出た',
          '撮れ高じゃなくて証拠だ、CAPTURE！',
        ];
        text = lines[Math.floor(Math.random() * lines.length)];
        type = 'hint';
      } else {
        const lines = [
          '同接じわじわ増えてる',
          'この病院、奥に行くほど時刻が巻き戻ってない？',
          '手記は全部拾って。たぶんエンディング変わる',
          'コメント欄に知らない固定コメントがあるんだけど',
          '右上カメラだけ色味が違うの、仕様？',
          '無理はすんな。でも次の扉までは見たい',
        ];
        text = lines[Math.floor(Math.random() * lines.length)];
      }

      if (currentChapter >= 4 && Math.random() < 0.32) {
        const lines = [
          'L I V E は 終 わ ら な い',
          'おまえの部屋も映ってる',
          '視聴者数　＝　入口の数',
          '配信者を退出させました',
          '死死死死死死死死',
        ];
        text = lines[Math.floor(Math.random() * lines.length)];
        type = 'glitch';
      }

      pushComment({ username: user, text, type, badge });

      const tensionBoost = 1 + currentPlayer.tension / 180;
      const chapterBoost = 1 + currentChapter * 0.35;
      const growth = Math.max(
        8,
        Math.round((10 + Math.random() * 34) * tensionBoost * chapterBoost),
      );
      setViewerCount((previous) => previous + growth);

      if (type !== 'glitch' && Math.random() < 0.22) {
        AudioSynth.playNotification();
      }

      schedule();
    };

    schedule();
    return () => window.clearTimeout(timerId);
  }, [phase, pushComment]);

  useEffect(() => {
    if (phase !== 'PLAYING') return undefined;

    const timer = window.setInterval(() => {
      setPlayer((previous) => {
        if (previous.tension <= 92 || previous.health <= 0) return previous;
        const damage = previous.tension >= 99 ? 3 : previous.tension >= 96 ? 2 : 1;
        return { ...previous, health: Math.max(0, previous.health - damage) };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (
      phase === 'PLAYING' &&
      player.health <= 0 &&
      !gameOverTriggeredRef.current
    ) {
      gameOverTriggeredRef.current = true;
      setPhase('GAMEOVER');
      AudioSynth.playStinger();
    }

    if (phase === 'PLAYING' && player.health > 0) {
      gameOverTriggeredRef.current = false;
    }
  }, [phase, player.health]);

  useEffect(() => {
    if (phase !== 'PLAYING') return;

    if (player.battery <= 0) {
      if (player.flashlightOn) {
        setPlayer((previous) => ({ ...previous, flashlightOn: false }));
      }
      if (!emptyBatteryLoggedRef.current) {
        emptyBatteryLoggedRef.current = true;
        handleAddLog('【電池切れ】懐中電灯が沈黙した。配信用カメラの暗視だけが頼りだ。');
        pushComment({
          username: 'mod_taku',
          text: '電池切れ！ 右上カメラで位置を確認して！',
          type: 'hint',
          badge: 'mod',
        });
      }
    } else if (player.battery > 3) {
      emptyBatteryLoggedRef.current = false;
    }
  }, [handleAddLog, phase, player.battery, player.flashlightOn, pushComment]);

  useEffect(() => {
    if (phase !== 'PLAYING') return undefined;
    setShowChapterCard(true);
    const timer = window.setTimeout(() => setShowChapterCard(false), 1800);
    return () => window.clearTimeout(timer);
  }, [chapterId, phase]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((previous) => {
      const next = !previous;
      AudioSynth.setMuted(next);
      return next;
    });
  }, []);

  const handleTriggerScare = useCallback(
    (type: 'jumpscare' | 'chase' | 'whisper') => {
      AudioSynth.playStinger();
      AudioSynth.playGlitch();

      setPlayer((previous) => {
        if (type === 'chase') return { ...previous, tension: Math.max(95, previous.tension) };
        const increase = type === 'jumpscare' ? 35 : 15;
        return {
          ...previous,
          tension: Math.min(100, previous.tension + increase),
        };
      });
    },
    [],
  );

  const handlePickupItem = useCallback(
    (itemId: string) => {
      const item = itemsRef.current.find((candidate) => candidate.id === itemId);
      if (!item || item.found) return;

      setItems((previous) =>
        previous.map((candidate) =>
          candidate.id === itemId ? { ...candidate, found: true } : candidate,
        ),
      );
      AudioSynth.playCaptureSuccess();
      handleAddLog(`【証拠回収】「${item.name}」を記録した。`);
      setViewerCount((previous) => previous + 5000);
      pushComment({
        username: 'archive_watch',
        text: `その「${item.name}」、絶対に最後まで持っていって。`,
        type: 'hint',
      });
    },
    [handleAddLog, pushComment],
  );

  const handleCaptureAnomaly = useCallback(() => {
    const currentNearest = nearestRef.current;
    const currentPlayer = playerRef.current;
    const target = currentNearest.anomaly;

    if (
      target &&
      currentNearest.distance < 350 &&
      !target.captured &&
      currentPlayer.flashlightOn &&
      currentPlayer.battery > 0
    ) {
      setAnomalies((previous) =>
        previous.map((candidate) =>
          candidate.id === target.id ? { ...candidate, captured: true } : candidate,
        ),
      );
      AudioSynth.playCaptureSuccess();
      AudioSynth.playGlitch();
      setViewerCount((previous) => previous + target.points);
      handleAddLog(
        `【REC成功】${target.description} を記録した。 +${target.points.toLocaleString()} viewers`,
      );
      pushComment({
        username: 'mod_taku',
        text: `証拠映像きた！「${target.description}」をアーカイブした！`,
        type: 'hype',
        badge: 'mod',
      });
      return;
    }

    AudioSynth.playNotification();
    handleAddLog('【REC失敗】対象を中央に捉え、ライトを点けて十分近づく必要がある。');
  }, [handleAddLog, pushComment]);

  const resolveEnding = useCallback(() => {
    const totalFound = itemsRef.current.filter((item) => item.found).length;
    const totalCaptured = anomaliesRef.current.filter((anomaly) => anomaly.captured).length;
    const viewers = viewerRef.current;

    if (totalFound === createInitialItems().length && totalCaptured >= 5) {
      setEndingType('LOST_ARCHIVE');
    } else if (viewers > 130000) {
      setEndingType('OVER_EXPLOITED');
    } else {
      setEndingType('ESCAPED');
    }

    setPhase('ENDING');
    AudioSynth.playStinger();
  }, []);

  const handleChapterComplete = useCallback(() => {
    const currentChapter = chapterRef.current;
    if (transitionGuardRef.current === currentChapter) return;
    transitionGuardRef.current = currentChapter;

    if (
      currentChapter === 2 &&
      !itemsRef.current.find((item) => item.id === 'KEYCARD_BLUE')?.found
    ) {
      handleAddLog('【LOCKED】診察室は施錠されている。第一病棟でカードキーを探せ。');
      setPlayer((previous) => ({ ...previous, x: 2320 }));
      pushComment({
        username: 'kage_99',
        text: 'カードキー取り忘れてる！ 開いたロッカーの近く！',
        type: 'hint',
      });
      window.setTimeout(() => {
        if (transitionGuardRef.current === currentChapter) {
          transitionGuardRef.current = null;
        }
      }, 600);
      return;
    }

    if (currentChapter < CHAPTERS.length) {
      const nextChapter = currentChapter + 1;
      handleAddLog(`【CHECKPOINT】${CHAPTERS[currentChapter - 1].subtitle} を突破した。`);
      setChapterId(nextChapter);
      pushComment({
        username: 'SYSTEM_ARCHIVE',
        text: `${CHAPTERS[nextChapter - 1].title} — ${CHAPTERS[nextChapter - 1].subtitle}`,
        type: 'system',
      });
      AudioSynth.playNotification();
      return;
    }

    resolveEnding();
  }, [handleAddLog, pushComment, resolveEnding]);

  const handleRetry = useCallback(() => {
    const currentChapter = chapterRef.current;
    setPlayer({
      ...INITIAL_PLAYER,
      x: Math.max(10, startPositionForChapter(currentChapter) + 20),
    });
    gameOverTriggeredRef.current = false;
    setPhase('PLAYING');
    handleAddLog('【RECONNECT】直前のセーフドアから配信を再接続した。');
    pushComment({
      username: 'mod_taku',
      text: '戻ってきた！ 今度はTENSIONを上げすぎるな！',
      type: 'hype',
      badge: 'mod',
    });
  }, [handleAddLog, pushComment]);

  const resetAll = useCallback((nextPhase: GamePhase = 'TITLE') => {
    setChapterId(1);
    setViewerCount(237);
    setPlayer({ ...INITIAL_PLAYER });
    setItems(createInitialItems());
    setAnomalies(createInitialAnomalies());
    setLogs([...INITIAL_LOGS]);
    setComments(createInitialComments());
    setIntroStep(0);
    setEndingType('ESCAPED');
    setIsMuted(false);
    AudioSynth.setMuted(false);
    setPhase(nextPhase);
  }, []);

  const advanceIntro = useCallback(() => {
    if (introStep < INTRO_TEXTS.length - 1) {
      setIntroStep((previous) => previous + 1);
      AudioSynth.playNotification();
      return;
    }

    setPhase('PLAYING');
    AudioSynth.playNotification();
  }, [introStep]);

  useEffect(() => {
    if (phase !== 'INTRO_STORY') return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        advanceIntro();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advanceIntro, phase]);

  const progress = Math.min(1, Math.max(0, player.x / 5000));
  const signalBlocked = player.tension > 82;
  const canCapture = Boolean(
    nearest.anomaly &&
      nearest.distance < 350 &&
      !nearest.anomaly.captured &&
      player.flashlightOn &&
      player.battery > 0,
  );

  const endingCopy = {
    LOST_ARCHIVE: {
      code: 'ENDING A / TRUE ARCHIVE',
      title: '深淵の真実',
      body: 'すべての記録は一本の配信へ結び直された。失踪事件は、視聴者の視線を入口にする儀式だった。君は証拠を持ち帰った。しかしアーカイブを再生するたび、視聴者数は一人ずつ増え続ける。',
    },
    OVER_EXPLOITED: {
      code: 'ENDING B / NEVER OFFLINE',
      title: '終わらない配信',
      body: '同接は限界を超え、祭壇は歓声で満たされた。終了ボタンは消え、コメント欄には君の部屋の映像が流れ始める。次の配信者を待つまで、君はこのチャンネルの中でLIVEを続ける。',
    },
    ESCAPED: {
      code: 'ENDING C / SIGNAL SAVED',
      title: '朝まで生きる',
      body: '撮れ高より命を選び、君は夜明け前の道路へ転がり出た。コメント欄は「チキン」と笑ったが、背後の病院から聞こえる通知音には、もう振り返らなかった。',
    },
  }[endingType];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] text-zinc-100 selection:bg-red-600/40 selection:text-white">
      <div className="pointer-events-none fixed inset-0 broadcast-grid opacity-35" />
      <div className="pointer-events-none fixed inset-0 ambient-vignette" />
      <div className="pointer-events-none fixed inset-0 noise-layer opacity-[0.035]" />

      {phase === 'TITLE' && (
        <TitleScreenV2 onStartGame={() => setPhase('INTRO_STORY')} />
      )}

      {phase === 'INTRO_STORY' && (
        <section className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#050505] p-5 md:p-8">
          <div className="pointer-events-none absolute inset-0 broadcast-grid opacity-40" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-950/20 blur-[110px]" />
          <div className="screen-frame relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/10 bg-[#08080a]/95 p-5 shadow-[0_40px_120px_rgba(0,0,0,0.9)] md:p-8">
            <div className="signal-sweep pointer-events-none absolute inset-x-0 top-0 h-px" />
            <header className="flex items-center justify-between border-b border-white/8 pb-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                </span>
                <div>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-red-400">
                    pre-stream transmission
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {INTRO_TEXTS[introStep].label}
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] text-zinc-600">
                0{introStep + 1} / 0{INTRO_TEXTS.length}
              </span>
            </header>

            <div className="flex min-h-[250px] items-center py-10 md:min-h-[300px] md:px-7">
              <p className="font-serif text-lg font-semibold leading-[2] tracking-[0.04em] text-zinc-100 md:text-2xl">
                {INTRO_TEXTS[introStep].text}
              </p>
            </div>

            <div className="mb-5 flex gap-2">
              {INTRO_TEXTS.map((item, index) => (
                <span
                  key={item.label}
                  className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                    index <= introStep ? 'bg-red-600' : 'bg-white/8'
                  }`}
                />
              ))}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setPhase('PLAYING')}
                className="rounded-lg px-3 py-2 text-left font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600 transition hover:text-zinc-300"
              >
                skip briefing
              </button>
              <button
                type="button"
                onClick={advanceIntro}
                className="group inline-flex items-center justify-center gap-3 rounded-xl bg-red-600 px-6 py-3 text-[11px] font-black tracking-[0.18em] text-white shadow-[0_12px_35px_rgba(220,38,38,0.25)] transition hover:bg-red-500 active:scale-[0.98]"
              >
                {introStep < INTRO_TEXTS.length - 1 ? 'NEXT TRANSMISSION' : 'GO LIVE'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </footer>
          </div>
        </section>
      )}

      {phase === 'PLAYING' && (
        <div className="relative z-10 flex min-h-screen flex-col">
          <StreamHeaderV2
            viewerCount={viewerCount}
            battery={Math.ceil(player.battery)}
            tension={Math.floor(player.tension)}
            health={Math.ceil(player.health)}
            chapterTitle={CHAPTERS[chapterId - 1].title}
            chapterSubtitle={CHAPTERS[chapterId - 1].subtitle}
            chapterId={chapterId}
            totalChapters={CHAPTERS.length}
            progress={progress}
            onToggleMute={handleToggleMute}
            isMuted={isMuted}
          />

          <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-3 px-3 py-3 sm:px-5 sm:py-5">
            <section className="screen-frame flex flex-col gap-3 rounded-xl border border-white/8 bg-black/35 px-4 py-3 backdrop-blur-md md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <Radio className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div>
                  <p className="font-mono text-[9px] font-black uppercase tracking-[0.22em] text-red-400">
                    current objective
                  </p>
                  <p className="mt-1 text-xs font-semibold text-zinc-200">
                    {CHAPTERS[chapterId - 1].description}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-cyan-500" />
                  REC {anomalies.filter((anomaly) => anomaly.captured).length}/{anomalies.length}
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                  CLUES {items.filter((item) => item.found).length}/{items.length}
                </span>
              </div>
            </section>

            <main className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(290px,1fr)]">
              <div className="flex min-w-0 flex-col gap-4">
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

                <div className="min-h-[230px] flex-1">
                  <InvestigationJournal items={items} anomalies={anomalies} logs={logs} />
                </div>
              </div>

              <aside className="grid min-h-[620px] grid-rows-[auto_minmax(330px,1fr)] gap-4 xl:min-h-0">
                <PipCameraV2
                  currentAnomaly={nearest.anomaly}
                  anomalyDistance={nearest.distance}
                  tension={player.tension}
                  flashlightOn={player.flashlightOn && player.battery > 0}
                  onCaptureAnomaly={handleCaptureAnomaly}
                  canCapture={canCapture}
                />
                <LiveChatV2
                  comments={comments}
                  onAddComment={handleAddComment}
                  signalBlocked={signalBlocked}
                  flashlightOn={player.flashlightOn && player.battery > 0}
                  isRunning={player.isRunning}
                />
              </aside>
            </main>
          </div>

          {showChapterCard && (
            <div className="pointer-events-none fixed inset-x-0 top-28 z-40 flex justify-center px-4">
              <div className="chapter-toast rounded-xl border border-red-500/25 bg-black/85 px-6 py-4 text-center shadow-[0_18px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-red-400">
                  checkpoint {chapterId}/{CHAPTERS.length}
                </p>
                <p className="mt-1 text-sm font-black tracking-wide text-white">
                  {CHAPTERS[chapterId - 1].subtitle}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'ENDING' && (
        <section className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#040404] p-5 md:p-8">
          <div className="pointer-events-none absolute inset-0 broadcast-grid opacity-35" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-950/20 blur-[130px]" />
          <div className="screen-frame relative w-full max-w-2xl overflow-hidden rounded-[26px] border border-white/10 bg-[#08080a]/95 p-6 shadow-[0_45px_140px_rgba(0,0,0,0.95)] md:p-9">
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.28em] text-red-400">
              {endingCopy.code}
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold tracking-[0.04em] text-white md:text-5xl">
              {endingCopy.title}
            </h1>
            <p className="mt-6 border-l border-red-700/70 pl-5 text-sm leading-8 text-zinc-300 md:text-base">
              {endingCopy.body}
            </p>

            <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/8 bg-white/8">
              {[
                ['FINAL VIEWERS', viewerCount.toLocaleString()],
                ['CLUES', `${items.filter((item) => item.found).length}/${items.length}`],
                [
                  'RECORDED',
                  `${anomalies.filter((anomaly) => anomaly.captured).length}/${anomalies.length}`,
                ],
              ].map(([label, value]) => (
                <div key={label} className="bg-[#09090b] px-3 py-5 text-center">
                  <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-zinc-600">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-black text-zinc-100 md:text-lg">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => resetAll('INTRO_STORY')}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-red-500 active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4" />
                stream again
              </button>
              <button
                type="button"
                onClick={() => resetAll('TITLE')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 transition hover:border-white/20 hover:text-white"
              >
                <Home className="h-4 w-4" />
                title
              </button>
            </div>
          </div>
        </section>
      )}

      {phase === 'GAMEOVER' && (
        <section className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/90 p-5 backdrop-blur-md">
          <div className="pointer-events-none absolute inset-0 bg-red-950/20" />
          <div className="screen-frame relative w-full max-w-md overflow-hidden rounded-[24px] border border-red-900/50 bg-[#070708] p-7 text-center shadow-[0_35px_110px_rgba(0,0,0,0.95)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-950/30 text-red-500">
              <AlertCircle className="h-8 w-8" />
            </div>
            <p className="mt-6 font-mono text-[9px] font-black uppercase tracking-[0.3em] text-red-500">
              connection terminated
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">SIGNAL LOST</h1>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              精神同調率が限界を超えた。TENSIONを下げるには怪異から距離を取り、ライトと移動を使い分ける必要がある。
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-red-500 active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4" />
              reconnect from checkpoint
            </button>
            <button
              type="button"
              onClick={() => resetAll('TITLE')}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600 transition hover:text-zinc-300"
            >
              return to title
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
