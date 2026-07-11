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
  MessageSquareText,
  Radio,
  RotateCcw,
  RotateCw,
  X,
} from 'lucide-react';
import {
  Anomaly,
  CHAPTERS,
  Comment,
  EndingType,
  GameItem,
  GamePhase,
  PlayerState,
  RiskTier,
} from './types';
import InvestigationJournal from './components/InvestigationJournal';
import MainGameView from './components/MainGameView';
import LiveChatV2 from './components/LiveChatV2';
import PipCameraV2 from './components/PipCameraV2';
import StreamHeaderV2 from './components/StreamHeaderV2';
import TitleScreenV2 from './components/TitleScreenV2';
import {
  createViewerRiskState,
  getViewerBand,
  transitionViewerRisk,
  VIEWER_BANDS,
  ViewerBand,
} from './game/risk';
import { canonicalSceneHistory } from './game/sceneSnapshot';
import { CameraCaptureTarget } from './game/capture';
import {
  createAnomalyDirectorState,
  isAnomalyResolved,
} from './game/anomalyDirector';
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

const mediaMatches = (query: string) =>
  typeof window !== 'undefined' && window.matchMedia(query).matches;

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const getFocusableElements = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute('inert') &&
      !element.closest('[inert]') &&
      element.getClientRects().length > 0,
  );

const trapDialogFocus = (event: React.KeyboardEvent<HTMLElement>) => {
  if (event.key !== 'Tab') return;
  const focusable = getFocusableElements(event.currentTarget);
  if (focusable.length === 0) {
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !event.currentTarget.contains(active))) {
    event.preventDefault();
    last.focus({ preventScroll: true });
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus({ preventScroll: true });
  }
};

const createInitialViewerRisk = () =>
  transitionViewerRisk(createViewerRiskState('chapter-1'), {
    viewerCount: getViewerBand(0),
  }).state;

export default function AppV2() {
  const [phase, setPhase] = useState<GamePhase>('TITLE');
  const [chapterId, setChapterId] = useState(1);
  const [viewerRisk, setViewerRisk] = useState(createInitialViewerRisk);
  const [isMuted, setIsMuted] = useState(false);
  const [introStep, setIntroStep] = useState(0);
  const [endingType, setEndingType] = useState<EndingType>('ESCAPED');
  const [showChapterCard, setShowChapterCard] = useState(false);
  const [showObjective, setShowObjective] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPageHidden, setIsPageHidden] = useState(false);
  const [isRotateHintDismissed, setIsRotateHintDismissed] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(() =>
    mediaMatches('(max-width: 1179px)'),
  );
  const [isPortraitGameplay, setIsPortraitGameplay] = useState(() =>
    mediaMatches('(orientation: portrait) and (max-width: 767px)'),
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    mediaMatches('(prefers-reduced-motion: reduce)'),
  );

  const [player, setPlayer] = useState<PlayerState>({ ...INITIAL_PLAYER });
  const [items, setItems] = useState<GameItem[]>(createInitialItems);
  const [anomalies, setAnomalies] = useState<Anomaly[]>(createInitialAnomalies);
  const [logs, setLogs] = useState<string[]>([...INITIAL_LOGS]);
  const [comments, setComments] = useState<Comment[]>(createInitialComments);
  const viewerCount = viewerRisk.viewerCount;
  const riskTier = viewerRisk.tier;
  const shouldShowRotateHint =
    phase === 'PLAYING' && isPortraitGameplay && !isRotateHintDismissed;
  const isInterfacePaused =
    isJournalOpen || isChatOpen || isPageHidden || shouldShowRotateHint;

  const playerRef = useRef(player);
  const itemsRef = useRef(items);
  const anomaliesRef = useRef(anomalies);
  const chapterRef = useRef(chapterId);
  const viewerRef = useRef(viewerCount);
  const riskTierRef = useRef(riskTier);
  const latestPipTargetRef = useRef<CameraCaptureTarget | null>(null);
  const announcedRiskBandsRef = useRef(new Set<string>());
  const nearestRef = useRef<{ anomaly: Anomaly | null; distance: number }>({
    anomaly: null,
    distance: Number.POSITIVE_INFINITY,
  });
  const transitionGuardRef = useRef<number | null>(null);
  const emptyBatteryLoggedRef = useRef(false);
  const gameOverTriggeredRef = useRef(false);
  const journalDialogRef = useRef<HTMLDivElement | null>(null);
  const chatDialogRef = useRef<HTMLDivElement | null>(null);
  const rotateDialogRef = useRef<HTMLElement | null>(null);
  const journalReturnFocusRef = useRef<HTMLElement | null>(null);
  const chatReturnFocusRef = useRef<HTMLElement | null>(null);

  const nearest = useMemo(() => {
    let anomaly: Anomaly | null = null;
    let distance = Number.POSITIVE_INFINITY;

    for (const candidate of anomalies) {
      if (isAnomalyResolved(candidate)) continue;
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
    setViewerRisk((current) =>
      transitionViewerRisk(current, {
        chapterId: `chapter-${chapterId}`,
        viewerCount: current.viewerCount,
      }).state,
    );
  }, [chapterId]);

  useEffect(() => {
    viewerRef.current = viewerCount;
  }, [viewerCount]);

  useEffect(() => {
    riskTierRef.current = riskTier;
  }, [riskTier]);

  useEffect(() => {
    nearestRef.current = nearest;
  }, [nearest]);

  const handleAddLog = useCallback((logText: string) => {
    setLogs((previous) => [...previous.slice(-79), logText]);
  }, []);

  const pushComment = useCallback(
    (comment: Omit<Comment, 'id' | 'timestamp'>) => {
      setComments((previous) => [
        // Keep the session transcript intact. LiveChat virtualises the visible
        // window while following; retaining rows prevents paused reading from
        // jumping when older comments would otherwise be pruned.
        ...previous,
        {
          ...comment,
          id: uniqueId('chat'),
          timestamp: Date.now(),
        },
      ]);
    },
    [],
  );

  const advanceViewerRisk = useCallback(() => {
    setViewerRisk((current) => {
      const nextTier = Math.min(3, current.tier + 1) as RiskTier;
      return transitionViewerRisk(current, {
        viewerCount: getViewerBand(nextTier),
      }).state;
    });
  }, []);

  useEffect(() => {
    if (phase !== 'PLAYING' || isInterfacePaused) return undefined;

    let timerId = 0;

    const schedule = () => {
      const delay = 2000 + Math.random() * 2000;
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

      if ((riskTier >= 3 || currentChapter >= 4) && Math.random() < 0.32) {
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

      if (type !== 'glitch' && Math.random() < 0.22) {
        AudioSynth.playNotification();
      }

      schedule();
    };

    schedule();
    return () => window.clearTimeout(timerId);
  }, [isInterfacePaused, phase, pushComment, riskTier]);

  useEffect(() => {
    if (phase !== 'PLAYING') return;

    const cues: Record<ViewerBand, { username: string; text: string; log: string }> = {
      237: {
        username: 'SYSTEM_LIVE',
        text: '同時視聴 237。映像と現場音声の同期を確認しています。',
        log: '視聴者数が237人に到達。遠方の不一致監視を開始した。',
      },
      2_370: {
        username: 'nanashi',
        text: '右上だけ見て。さっきまで、あそこには誰もいなかった。',
        log: '視聴者数が2,370人に到達。PIPが未知の輪郭を検出した。',
      },
      23_700: {
        username: 'uro_27',
        text: '止まって。後ろの距離が、肉眼とカメラで合ってない。',
        log: '視聴者数が23,700人に到達。映像遅延が不規則に増幅している。',
      },
      237_000: {
        username: 'SYSTEM_237000',
        text: '配信者を退出させました。視聴者は、もう中にいます。',
        log: '視聴者数が237,000人に到達。配信制御権が外部へ移行した。',
      },
    };

    viewerRisk.firedBands.forEach((band) => {
      const ledgerKey = `${viewerRisk.chapterId}:${band}`;
      if (announcedRiskBandsRef.current.has(ledgerKey)) return;
      announcedRiskBandsRef.current.add(ledgerKey);

      const cue = cues[band];
      const tier = VIEWER_BANDS.indexOf(band) as RiskTier;
      pushComment({
        username: cue.username,
        text: cue.text,
        type: tier === 3 ? 'glitch' : tier === 0 ? 'system' : 'hint',
      });
      handleAddLog(`【RISK TIER ${tier}】${cue.log}`);
      if (tier >= 2 && !prefersReducedMotion) AudioSynth.playGlitch();
    });
  }, [handleAddLog, phase, prefersReducedMotion, pushComment, viewerRisk]);

  useEffect(() => {
    const handleVisibility = () => {
      setIsPageHidden(document.visibilityState !== 'visible');
    };
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (phase !== 'PLAYING' || isInterfacePaused) return undefined;

    const timer = window.setInterval(() => {
      setPlayer((previous) => {
        if (previous.tension <= 92 || previous.health <= 0) return previous;
        const damage = previous.tension >= 99 ? 3 : previous.tension >= 96 ? 2 : 1;
        return { ...previous, health: Math.max(0, previous.health - damage) };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isInterfacePaused, phase]);

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
    if (phase !== 'PLAYING' || isInterfacePaused) return;

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
  }, [handleAddLog, isInterfacePaused, phase, player.battery, player.flashlightOn, pushComment]);

  useEffect(() => {
    if (phase !== 'PLAYING') return undefined;
    setShowChapterCard(true);
    const timer = window.setTimeout(
      () => setShowChapterCard(false),
      prefersReducedMotion ? 900 : 1800,
    );
    return () => window.clearTimeout(timer);
  }, [chapterId, phase, prefersReducedMotion]);

  useEffect(() => {
    if (phase !== 'PLAYING') {
      setShowObjective(false);
      return undefined;
    }

    setShowObjective(true);
    const timer = window.setTimeout(() => setShowObjective(false), 5000);
    return () => window.clearTimeout(timer);
  }, [chapterId, phase]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((previous) => {
      const next = !previous;
      AudioSynth.setMuted(next);
      return next;
    });
  }, []);

  const suspendPlayerInput = useCallback(() => {
    setPlayer((previous) => ({
      ...previous,
      isRunning: false,
      isCrouching: false,
    }));
  }, []);

  const restoreFocus = useCallback(
    (returnFocusRef: { current: HTMLElement | null }) => {
      const requestedTarget = returnFocusRef.current;
      returnFocusRef.current = null;
      window.requestAnimationFrame(() => {
        const fallback = document.getElementById('main-game-viewport');
        const target =
          requestedTarget?.isConnected && requestedTarget.getClientRects().length > 0
            ? requestedTarget
            : fallback;
        target?.focus({ preventScroll: true });
      });
    },
    [],
  );

  const closeJournal = useCallback(() => {
    setIsJournalOpen(false);
    restoreFocus(journalReturnFocusRef);
  }, [restoreFocus]);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    restoreFocus(chatReturnFocusRef);
  }, [restoreFocus]);

  const openJournal = useCallback(() => {
    if (shouldShowRotateHint) return;
    journalReturnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    suspendPlayerInput();
    setIsChatOpen(false);
    setIsJournalOpen(true);
  }, [shouldShowRotateHint, suspendPlayerInput]);

  const openChat = useCallback(() => {
    if (!isCompactViewport || shouldShowRotateHint) return;
    chatReturnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    suspendPlayerInput();
    setIsJournalOpen(false);
    setIsChatOpen(true);
  }, [isCompactViewport, shouldShowRotateHint, suspendPlayerInput]);

  const continueInPortrait = useCallback(() => {
    setIsRotateHintDismissed(true);
    window.requestAnimationFrame(() => {
      document.getElementById('main-game-viewport')?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    const compactQuery = window.matchMedia('(max-width: 1179px)');
    const portraitQuery = window.matchMedia(
      '(orientation: portrait) and (max-width: 767px)',
    );
    const reducedMotionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );

    const syncCompact = () => setIsCompactViewport(compactQuery.matches);
    const syncPortrait = () => setIsPortraitGameplay(portraitQuery.matches);
    const syncReducedMotion = () =>
      setPrefersReducedMotion(reducedMotionQuery.matches);

    syncCompact();
    syncPortrait();
    syncReducedMotion();
    compactQuery.addEventListener('change', syncCompact);
    portraitQuery.addEventListener('change', syncPortrait);
    reducedMotionQuery.addEventListener('change', syncReducedMotion);
    return () => {
      compactQuery.removeEventListener('change', syncCompact);
      portraitQuery.removeEventListener('change', syncPortrait);
      reducedMotionQuery.removeEventListener('change', syncReducedMotion);
    };
  }, []);

  useEffect(() => {
    const active = phase === 'PLAYING';
    document.documentElement.classList.toggle('gameplay-active', active);
    document.body.classList.toggle('gameplay-active', active);
    return () => {
      document.documentElement.classList.remove('gameplay-active');
      document.body.classList.remove('gameplay-active');
    };
  }, [phase]);

  useEffect(() => {
    if (!shouldShowRotateHint) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const dialog = rotateDialogRef.current;
      const initialTarget = dialog ? getFocusableElements(dialog)[0] : null;
      (initialTarget ?? dialog)?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [shouldShowRotateHint]);

  useEffect(() => {
    if (!isCompactViewport && isChatOpen) closeChat();
  }, [closeChat, isChatOpen, isCompactViewport]);

  useEffect(() => {
    if (!isJournalOpen) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const dialog = journalDialogRef.current;
      const initialTarget = dialog ? getFocusableElements(dialog)[0] : null;
      (initialTarget ?? dialog)?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isJournalOpen]);

  useEffect(() => {
    if (!isChatOpen || !isCompactViewport) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const dialog = chatDialogRef.current;
      const initialTarget = dialog ? getFocusableElements(dialog)[0] : null;
      (initialTarget ?? dialog)?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isChatOpen, isCompactViewport]);

  useEffect(() => {
    if (!isJournalOpen && !isChatOpen && !shouldShowRotateHint) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      if (shouldShowRotateHint) continueInPortrait();
      else if (isJournalOpen) closeJournal();
      else closeChat();
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [
    closeChat,
    closeJournal,
    continueInPortrait,
    isChatOpen,
    isJournalOpen,
    shouldShowRotateHint,
  ]);

  const handleTriggerScare = useCallback(
    (type: 'jumpscare' | 'chase' | 'whisper') => {
      if (prefersReducedMotion) {
        AudioSynth.playNotification();
      } else {
        AudioSynth.playStinger();
        AudioSynth.playGlitch();
      }

      setPlayer((previous) => {
        if (type === 'chase') {
          return {
            ...previous,
            tension: Math.max(
              prefersReducedMotion ? 84 : 95,
              previous.tension,
            ),
          };
        }
        const increase = type === 'jumpscare'
          ? prefersReducedMotion ? 20 : 35
          : prefersReducedMotion ? 9 : 15;
        return {
          ...previous,
          tension: Math.min(100, previous.tension + increase),
        };
      });
    },
    [prefersReducedMotion],
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
      pushComment({
        username: 'archive_watch',
        text: `その「${item.name}」、絶対に最後まで持っていって。`,
        type: 'hint',
      });
    },
    [handleAddLog, pushComment],
  );

  const handlePipTargetChange = useCallback(
    (target: CameraCaptureTarget | null) => {
      latestPipTargetRef.current = target;
    },
    [],
  );

  const handleCaptureAnomaly = useCallback((requestedTarget?: CameraCaptureTarget | null) => {
    const captureDecision = requestedTarget ?? latestPipTargetRef.current;
    const currentPlayer = playerRef.current;
    const target = captureDecision?.targetId
      ? anomaliesRef.current.find(
          (candidate) => candidate.id === captureDecision.targetId,
        ) ?? null
      : null;

    if (
      target &&
      captureDecision?.canCapture &&
      !target.captured &&
      !target.resolution &&
      (!target.visibleOnlyInPip || riskTierRef.current >= 1) &&
      currentPlayer.battery > 0
    ) {
      setAnomalies((previous) =>
        {
          const next = previous.map((candidate) =>
            candidate.id === target.id
              ? { ...candidate, captured: true, resolution: 'RECORDED' as const }
              : candidate,
          );
          anomaliesRef.current = next;
          return next;
        },
      );
      AudioSynth.playCaptureSuccess();
      if (!prefersReducedMotion) AudioSynth.playGlitch();
      advanceViewerRisk();
      handleAddLog(
        `【CAPTURE成功】${target.description} を記録した。配信の注目度が上昇した。`,
      );
      pushComment({
        username: 'mod_taku',
        text: `証拠映像きた！「${target.description}」をアーカイブした！`,
        type: 'hype',
        badge: 'mod',
      });
      return true;
    }

    setPlayer((previous) => {
      const next = {
        ...previous,
        battery: Math.max(0, previous.battery - 4),
        tension: Math.min(100, previous.tension + 6),
      };
      playerRef.current = next;
      return next;
    });
    const reasonCopy: Partial<Record<CameraCaptureTarget['reason'], string>> = {
      NO_TARGET: '何もいない所を撮ってる。今のノイズ、増えたぞ。',
      OUT_OF_FRAME: '中央から外れてる。右上の照準を見て。',
      OUT_OF_RANGE: '遠すぎる。近づくなら走らないほうがいい。',
      FLASHLIGHT_OFF: '真っ暗でピントが拾えてない。ライトを点けて。',
      RISK_LOCKED: 'まだ輪郭だけだ。カメラが対象として認識してない。',
      RESOLVED: 'その映像はもう記録済みだ。電池を無駄にするな。',
      BATTERY_EMPTY: 'カメラ電池が空だ。撮影できてない。',
    };
    AudioSynth.playNotification();
    handleAddLog(
      `【FOCUS LOST】撮影失敗。カメラ電池 -4。${captureDecision?.reason ?? 'NO_TARGET'}`,
    );
    pushComment({
      username: 'baka_camera',
      text:
        reasonCopy[captureDecision?.reason ?? 'NO_TARGET'] ??
        '今のは違う。対象を中央に捉えてから記録して。',
      type: 'hint',
    });
    return false;
  }, [advanceViewerRisk, handleAddLog, prefersReducedMotion, pushComment]);

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
    canonicalSceneHistory.clear();
    latestPipTargetRef.current = null;
    setPlayer({
      ...INITIAL_PLAYER,
      x: Math.max(10, startPositionForChapter(currentChapter) + 20),
    });
    setAnomalies((previous) => {
      const next = previous.map((anomaly) => {
        const resetState = createAnomalyDirectorState(anomaly.id, 0);
        if (!isAnomalyResolved(anomaly)) {
          return {
            ...anomaly,
            directorState: resetState,
            resolution: null,
          };
        }

        const resolution =
          anomaly.resolution ??
          anomaly.directorState?.resolution ??
          (anomaly.captured ? 'RECORDED' : 'IGNORED');
        return {
          ...anomaly,
          resolution,
          directorState: {
            ...resetState,
            phase: 'COMPLETE' as const,
            resolution,
            transitionCount:
              (anomaly.directorState?.transitionCount ?? 0) + 1,
          },
        };
      });
      anomaliesRef.current = next;
      return next;
    });
    gameOverTriggeredRef.current = false;
    setIsJournalOpen(false);
    setIsChatOpen(false);
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
    canonicalSceneHistory.clear();
    latestPipTargetRef.current = null;
    announcedRiskBandsRef.current.clear();
    setChapterId(1);
    setViewerRisk(createInitialViewerRisk());
    setPlayer({ ...INITIAL_PLAYER });
    setItems(createInitialItems());
    setAnomalies(createInitialAnomalies());
    setLogs([...INITIAL_LOGS]);
    setComments(createInitialComments());
    setIntroStep(0);
    setEndingType('ESCAPED');
    setIsJournalOpen(false);
    setIsChatOpen(false);
    setShowObjective(false);
    setIsRotateHintDismissed(false);
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
    <div
      className={`${phase === 'PLAYING' ? 'h-dvh overflow-hidden' : 'min-h-screen overflow-x-hidden'} bg-[#050505] text-zinc-100 selection:bg-red-600/40 selection:text-white`}
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
    >
      <div className="pointer-events-none fixed inset-0 broadcast-grid opacity-35" />
      <div className="pointer-events-none fixed inset-0 ambient-vignette" />
      <div className="pointer-events-none fixed inset-0 noise-layer opacity-[0.035]" />

      {phase === 'TITLE' && (
        <TitleScreenV2 onStartGame={() => setPhase('INTRO_STORY')} />
      )}

      {phase === 'INTRO_STORY' && (
        <section className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#050505] p-5 md:p-8">
          <div className="pointer-events-none absolute inset-0 broadcast-grid opacity-40" />
          <div className="screen-frame transmission-panel intro-panel relative max-h-full w-full max-w-2xl overflow-y-auto border border-[#242824] bg-[#060806] p-5 md:p-8">
            <div className="signal-sweep pointer-events-none absolute inset-x-0 top-0 h-px" />
            <header className="flex items-center justify-between border-b border-white/8 pb-4">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 bg-red-800" />
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

            <div className="intro-copy flex min-h-[250px] items-center py-10 md:min-h-[300px] md:px-7">
              <p className="font-serif text-lg font-semibold leading-[2] tracking-[0.04em] text-zinc-100 md:text-2xl">
                {INTRO_TEXTS[introStep].text}
              </p>
            </div>

            <div className="mb-5 flex gap-2">
              {INTRO_TEXTS.map((item, index) => (
                <span
                  key={item.label}
                  className={`h-px flex-1 transition-colors duration-500 ${
                    index <= introStep ? 'bg-red-800' : 'bg-white/8'
                  }`}
                />
              ))}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setPhase('PLAYING')}
                className="min-h-11 border border-transparent px-3 py-2 text-left font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600 transition hover:border-white/10 hover:text-zinc-300"
              >
                skip briefing
              </button>
              <button
                type="button"
                onClick={advanceIntro}
                className="group inline-flex min-h-11 items-center justify-center gap-3 border border-red-900 bg-[#0b0808] px-6 py-3 text-[10px] font-semibold tracking-[0.18em] text-zinc-200 transition hover:border-red-700 hover:bg-red-950/25 active:translate-y-px"
              >
                {introStep < INTRO_TEXTS.length - 1 ? 'NEXT TRANSMISSION' : 'GO LIVE'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </footer>
          </div>
        </section>
      )}

      {phase === 'PLAYING' && (
        <div className="playing-shell relative z-10">
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
            onOpenJournal={openJournal}
            onOpenChat={openChat}
            onShowObjective={() => setShowObjective(true)}
            isInert={isJournalOpen || isChatOpen || shouldShowRotateHint}
          />

          {shouldShowRotateHint && (
            <aside
              ref={rotateDialogRef}
              className="rotate-recommendation"
              role="dialog"
              aria-modal="true"
              aria-label="横画面でのプレイを推奨"
              tabIndex={-1}
              onKeyDown={trapDialogFocus}
            >
              <RotateCw aria-hidden="true" />
              <span>横画面でのプレイを推奨します</span>
              <button type="button" onClick={continueInPortrait}>
                縦画面で続ける
              </button>
            </aside>
          )}

          <main
            className="playing-layout"
            inert={isJournalOpen || shouldShowRotateHint ? true : undefined}
          >
            <div
              className="playing-main"
              inert={isChatOpen ? true : undefined}
            >
              <div className="playing-world">
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
                  isPaused={isInterfacePaused}
                />

                {showObjective && (
                  <section className="current-objective" aria-label="現在の目的">
                    <div>
                      <p><Radio aria-hidden="true" /> CURRENT OBJECTIVE</p>
                      <strong>{CHAPTERS[chapterId - 1].description}</strong>
                    </div>
                    <div className="objective-evidence" aria-label="記録状況">
                      <span><Camera aria-hidden="true" /> {anomalies.filter((anomaly) => anomaly.captured).length}/{anomalies.length}</span>
                      <span><BookOpen aria-hidden="true" /> {items.filter((item) => item.found).length}/{items.length}</span>
                    </div>
                    <button type="button" onClick={() => setShowObjective(false)} aria-label="目的表示を閉じる">
                      <X aria-hidden="true" />
                    </button>
                  </section>
                )}
              </div>

              {showChapterCard && (
                <div className="playing-chapter-toast">
                  <p>CHECKPOINT {chapterId}/{CHAPTERS.length}</p>
                  <strong>{CHAPTERS[chapterId - 1].subtitle}</strong>
                </div>
              )}
            </div>

            <aside className={`playing-rail ${isChatOpen ? 'chat-open' : ''}`} aria-label="配信補助画面">
              <div
                className="pip-slot"
                inert={isChatOpen ? true : undefined}
              >
                <PipCameraV2
                  currentAnomaly={nearest.anomaly}
                  anomalyDistance={nearest.distance}
                  tension={player.tension}
                  flashlightOn={player.flashlightOn && player.battery > 0}
                  onCaptureAnomaly={handleCaptureAnomaly}
                  onTargetChange={handlePipTargetChange}
                  player={player}
                  anomalies={anomalies}
                  items={items}
                  riskTier={riskTier}
                  reducedMotion={prefersReducedMotion}
                />
              </div>

              <button
                type="button"
                className="compact-drawer-scrim"
                onClick={closeChat}
                aria-label="コメント欄を閉じる"
                aria-hidden="true"
                tabIndex={-1}
              />

              <div
                ref={chatDialogRef}
                className="chat-slot"
                role={isCompactViewport ? 'dialog' : 'region'}
                aria-modal={isCompactViewport && isChatOpen ? true : undefined}
                aria-hidden={isCompactViewport && !isChatOpen ? true : undefined}
                aria-label="ライブコメント"
                inert={isCompactViewport && !isChatOpen ? true : undefined}
                tabIndex={isCompactViewport && isChatOpen ? -1 : undefined}
                onKeyDown={isCompactViewport && isChatOpen ? trapDialogFocus : undefined}
              >
                <button
                  type="button"
                  className="compact-panel-close"
                  onClick={closeChat}
                  aria-label="コメント欄を閉じる"
                  title="閉じる (Esc)"
                  tabIndex={isCompactViewport && isChatOpen ? 0 : -1}
                >
                  <MessageSquareText aria-hidden="true" />
                  <span>LIVE CHAT</span>
                  <X aria-hidden="true" />
                </button>
                <LiveChatV2
                  comments={comments}
                  signalBlocked={signalBlocked}
                  flashlightOn={player.flashlightOn && player.battery > 0}
                  isRunning={player.isRunning}
                  readOnly
                />
              </div>
            </aside>
          </main>

          {isJournalOpen && (
            <div
              ref={journalDialogRef}
              className="journal-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="調査記録"
              tabIndex={-1}
              onKeyDown={trapDialogFocus}
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) closeJournal();
              }}
            >
              <div className="journal-drawer">
                <InvestigationJournal
                  items={items}
                  anomalies={anomalies}
                  logs={logs}
                  onClose={closeJournal}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'ENDING' && (
        <section className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#040404] p-5 md:p-8">
          <div className="pointer-events-none absolute inset-0 broadcast-grid opacity-35" />
          <div className="screen-frame transmission-panel relative w-full max-w-2xl overflow-hidden border border-[#242824] bg-[#060806] p-6 md:p-9">
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.28em] text-red-400">
              {endingCopy.code}
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold tracking-[0.04em] text-white md:text-5xl">
              {endingCopy.title}
            </h1>
            <p className="mt-6 border-l border-red-700/70 pl-5 text-sm leading-8 text-zinc-300 md:text-base">
              {endingCopy.body}
            </p>

            <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden border border-white/8 bg-white/8">
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
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 border border-red-900 bg-[#0b0808] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-200 transition hover:border-red-700 hover:bg-red-950/25 active:translate-y-px"
              >
                <RotateCcw className="h-4 w-4" />
                stream again
              </button>
              <button
                type="button"
                onClick={() => resetAll('TITLE')}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/10 bg-black/30 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 transition hover:border-white/20 hover:text-white"
              >
                <Home className="h-4 w-4" />
                title
              </button>
            </div>
          </div>
        </section>
      )}

      {phase === 'GAMEOVER' && (
        <section className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/94 p-5">
          <div className="pointer-events-none absolute inset-0 broadcast-grid opacity-20" />
          <div className="screen-frame transmission-panel resolution-panel relative w-full max-w-md overflow-hidden border border-red-950 bg-[#060706] p-7 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center border border-red-900/60 bg-black text-red-700">
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
              className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 border border-red-900 bg-[#0b0808] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-200 transition hover:border-red-700 hover:bg-red-950/25 active:translate-y-px"
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
