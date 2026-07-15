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
  AnomalyDirectorPhase,
  BoardId,
  Comment,
  EndingType,
  GameItem,
  GamePhase,
  PlayerState,
  RiskTier,
  RunMode,
} from './types';
import BoardSelectScreen from './components/BoardSelectScreen';
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
} from './game/risk';
import { canonicalSceneHistory } from './game/sceneSnapshot';
import { CameraCaptureTarget } from './game/capture';
import {
  createAnomalyDirectorState,
  isAnomalyResolved,
} from './game/anomalyDirector';
import {
  createBoardAnomalies,
  createBoardComments,
  createBoardItems,
  getBoardDefinition,
} from './game/boardDefinitions';
import {
  createAnomalyChatBurst,
  createPipAlertBurst,
  createRiskTierHijack,
  type BroadcastAnomalyPhase,
  type BroadcastChatBurst,
} from './game/broadcastEventDirector';
import {
  loadProgression,
  recordRun,
  recordRunAttempt,
  saveProgression,
  type ProgressionState,
} from './game/progression';
import { evaluateRoute } from './game/route';
import { getItemWorldPositions } from './game/sceneDefinitions';
import {
  createImprovementPrototypeBoard,
  evaluateImprovementPrototypeDuration,
  evaluateImprovementPrototypeGate,
  getResolvedCaptureFailureCopy,
  hasCompleteImprovementPrototypeSequence,
  type ImprovementPrototypeDurationBand,
} from './game/improvementPrototype';
import { getViewerThreatProfile } from './game/viewerThreat';
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
  facing: 1,
  flashlightAngle: 0,
  battery: 100,
  tension: 10,
  health: 100,
};

const startPositionForChapter = (
  chapters: readonly { startPos: number }[],
  chapterId: number,
) => chapters[Math.max(0, chapterId - 1)]?.startPos ?? 10;

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

interface BroadcastTimerTask {
  timerId: number | null;
  remainingMs: number;
  startedAt: number;
  fire: () => void;
}

interface ImprovementPrototypeResult {
  durationMs: number;
  durationBand: ImprovementPrototypeDurationBand;
  milestones: readonly ImprovementPrototypeMilestone[];
  sequenceComplete: boolean;
}

interface ImprovementPrototypeMilestone {
  id: string;
  elapsedMs: number;
}

const createInitialViewerRisk = (
  boardId: BoardId = 'hospital',
  _chapterId = 1,
  tier: RiskTier = 0,
) =>
  transitionViewerRisk(createViewerRiskState(`${boardId}:stream`), {
    viewerCount: getViewerBand(tier),
  }).state;

export default function AppV2() {
  const loadedProgression = useMemo<ProgressionState>(
    () => loadProgression(),
    [],
  );
  const [phase, setPhase] = useState<GamePhase>('TITLE');
  const [progression, setProgression] = useState<ProgressionState>(
    loadedProgression,
  );
  const [selectedBoardId, setSelectedBoardId] = useState<BoardId>(
    loadedProgression.lastBoardId,
  );
  const [runMode, setRunMode] = useState<RunMode>('STANDARD');
  const [runId, setRunId] = useState(() => uniqueId('run-preview'));
  const [chapterId, setChapterId] = useState(1);
  const [viewerRisk, setViewerRisk] = useState(() =>
    createInitialViewerRisk(loadedProgression.lastBoardId),
  );
  const [isMuted, setIsMuted] = useState(false);
  const [introStep, setIntroStep] = useState(0);
  const [endingType, setEndingType] = useState<EndingType>('ESCAPED');
  const [isImprovementPrototype, setIsImprovementPrototype] = useState(false);
  const [isChaseActive, setIsChaseActive] = useState(false);
  const [hasChaseCompleted, setHasChaseCompleted] = useState(false);
  const [prototypeResult, setPrototypeResult] =
    useState<ImprovementPrototypeResult | null>(null);
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
  const [items, setItems] = useState<GameItem[]>(() =>
    createBoardItems(loadedProgression.lastBoardId),
  );
  const [anomalies, setAnomalies] = useState<Anomaly[]>(() =>
    createBoardAnomalies(loadedProgression.lastBoardId),
  );
  const [logs, setLogs] = useState<string[]>(() => [
    ...getBoardDefinition(loadedProgression.lastBoardId).initialLogs,
  ]);
  const [comments, setComments] = useState<Comment[]>(() =>
    createBoardComments(loadedProgression.lastBoardId),
  );
  const [routeLoopCount, setRouteLoopCount] = useState(0);
  const [isClimaxActive, setIsClimaxActive] = useState(false);
  const activeBoard = useMemo(
    () => {
      const board = getBoardDefinition(selectedBoardId);
      return isImprovementPrototype
        ? createImprovementPrototypeBoard(getBoardDefinition('hospital'))
        : board;
    },
    [isImprovementPrototype, selectedBoardId],
  );
  const modeDefinition = activeBoard.modes[runMode];
  const viewerCount = viewerRisk.viewerCount;
  const riskTier = viewerRisk.tier;
  const shouldShowRotateHint =
    phase === 'PLAYING' && isPortraitGameplay && !isRotateHintDismissed;
  const isInterfacePaused =
    phase === 'POST_LIVE' ||
    isJournalOpen ||
    isChatOpen ||
    isPageHidden ||
    shouldShowRotateHint;
  const isBroadcastPaused =
    phase === 'PLAYING' &&
    (isJournalOpen || isChatOpen || isPageHidden || shouldShowRotateHint);

  const playerRef = useRef(player);
  const phaseRef = useRef(phase);
  const itemsRef = useRef(items);
  const anomaliesRef = useRef(anomalies);
  const chapterRef = useRef(chapterId);
  const runIdRef = useRef(runId);
  const routeLoopCountRef = useRef(routeLoopCount);
  const climaxActiveRef = useRef(isClimaxActive);
  const riskTierRef = useRef(riskTier);
  const isImprovementPrototypeRef = useRef(isImprovementPrototype);
  const chaseActiveRef = useRef(isChaseActive);
  const chaseCompletedRef = useRef(hasChaseCompleted);
  const prototypeActiveElapsedRef = useRef(0);
  const prototypeMilestonesRef = useRef<ImprovementPrototypeMilestone[]>([]);
  const recentAmbientTextsRef = useRef<string[]>([]);
  const latestPipTargetRef = useRef<CameraCaptureTarget | null>(null);
  const announcedRiskBandsRef = useRef(new Set<string>());
  const nearestRef = useRef<{ anomaly: Anomaly | null; distance: number }>({
    anomaly: null,
    distance: Number.POSITIVE_INFINITY,
  });
  const transitionGuardRef = useRef<number | null>(null);
  const routeGuardTimerRef = useRef<number | null>(null);
  const chatSilenceUntilRef = useRef(0);
  const emptyBatteryLoggedRef = useRef(false);
  const gameOverTriggeredRef = useRef(false);
  const broadcastTasksRef = useRef<BroadcastTimerTask[]>([]);
  const broadcastPausedRef = useRef(isBroadcastPaused);
  const broadcastPauseStartedAtRef = useRef<number | null>(
    isBroadcastPaused ? Date.now() : null,
  );
  const alertedPipTargetIdsRef = useRef<ReadonlySet<string>>(new Set());
  const approachedItemIdsRef = useRef(new Set<string>());
  const passedItemIdsRef = useRef(new Set<string>());
  const journalDialogRef = useRef<HTMLDivElement | null>(null);
  const chatDialogRef = useRef<HTMLDivElement | null>(null);
  const rotateDialogRef = useRef<HTMLElement | null>(null);
  const journalReturnFocusRef = useRef<HTMLElement | null>(null);
  const chatReturnFocusRef = useRef<HTMLElement | null>(null);

  const getPrototypeActiveElapsedMs = useCallback(() => {
    return Math.max(0, Math.round(prototypeActiveElapsedRef.current));
  }, []);

  const nearest = useMemo(() => {
    let anomaly: Anomaly | null = null;
    let distance = Number.POSITIVE_INFINITY;

    for (const candidate of anomalies) {
      if (isAnomalyResolved(candidate)) continue;
      const candidatePhase = candidate.directorState?.phase;
      if (
        candidatePhase &&
        candidatePhase !== 'TELEGRAPH' &&
        candidatePhase !== 'ACTIVE'
      ) {
        continue;
      }
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
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (!isImprovementPrototype || phase !== 'PLAYING' || isInterfacePaused) {
      return undefined;
    }
    if (prototypeMilestonesRef.current.length === 0) {
      prototypeMilestonesRef.current = [
        { id: 'PLAYING_STARTED', elapsedMs: 0 },
      ];
    }
    let animationId = 0;
    let previousAt = performance.now();
    const countActiveFrame = (now: number) => {
      const deltaMs = Math.max(0, now - previousAt);
      previousAt = now;
      if (document.visibilityState === 'visible') {
        // A hidden tab resumes with a very large RAF gap. Capping one frame
        // prevents that paused time from becoming a false 3–5 minute pass.
        prototypeActiveElapsedRef.current += Math.min(250, deltaMs);
      }
      animationId = window.requestAnimationFrame(countActiveFrame);
    };
    animationId = window.requestAnimationFrame(countActiveFrame);
    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [isImprovementPrototype, isInterfacePaused, phase]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    anomaliesRef.current = anomalies;
  }, [anomalies]);

  useEffect(() => {
    runIdRef.current = runId;
  }, [runId]);

  useEffect(() => {
    routeLoopCountRef.current = routeLoopCount;
  }, [routeLoopCount]);

  useEffect(() => {
    climaxActiveRef.current = isClimaxActive;
  }, [isClimaxActive]);

  useEffect(() => {
    saveProgression(progression);
  }, [progression]);

  useEffect(
    () => () => {
      if (routeGuardTimerRef.current !== null) {
        window.clearTimeout(routeGuardTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    chapterRef.current = chapterId;
    transitionGuardRef.current = null;
  }, [chapterId]);

  useEffect(() => {
    riskTierRef.current = riskTier;
  }, [riskTier]);

  useEffect(() => {
    isImprovementPrototypeRef.current = isImprovementPrototype;
  }, [isImprovementPrototype]);

  useEffect(() => {
    chaseActiveRef.current = isChaseActive;
  }, [isChaseActive]);

  useEffect(() => {
    chaseCompletedRef.current = hasChaseCompleted;
  }, [hasChaseCompleted]);

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

  const recordPrototypeMilestone = useCallback((id: string) => {
    if (!isImprovementPrototypeRef.current) return;
    if (prototypeMilestonesRef.current.some((milestone) => milestone.id === id)) {
      return;
    }
    prototypeMilestonesRef.current = [
      ...prototypeMilestonesRef.current,
      { id, elapsedMs: getPrototypeActiveElapsedMs() },
    ];
  }, [getPrototypeActiveElapsedMs]);

  useEffect(() => {
    if (phase !== 'PLAYING' || isInterfacePaused) return;
    const positions = getItemWorldPositions(selectedBoardId);
    items.forEach((item) => {
      if (item.found || passedItemIdsRef.current.has(item.id)) return;
      const itemX = positions[item.id];
      if (itemX === undefined) return;
      const distance = Math.abs(player.x - itemX);
      if (distance <= 64) approachedItemIdsRef.current.add(item.id);
      if (distance > 92 && approachedItemIdsRef.current.has(item.id)) {
        approachedItemIdsRef.current.delete(item.id);
        passedItemIdsRef.current.add(item.id);
        pushComment({
          username: 'archive_watch',
          text: `戻って。さっきの足元、「${item.name}」を調べてない`,
          type: 'hint',
        });
      }
    });
  }, [isInterfacePaused, items, phase, player.x, pushComment, selectedBoardId]);

  const clearBroadcastTimers = useCallback(() => {
    broadcastTasksRef.current.forEach((task) => {
      if (task.timerId !== null) window.clearTimeout(task.timerId);
    });
    broadcastTasksRef.current = [];
  }, []);

  const armBroadcastTask = useCallback((task: BroadcastTimerTask) => {
    if (broadcastPausedRef.current || task.timerId !== null) return;
    task.startedAt = Date.now();
    task.timerId = window.setTimeout(() => {
      task.timerId = null;
      task.remainingMs = 0;
      broadcastTasksRef.current = broadcastTasksRef.current.filter(
        (candidate) => candidate !== task,
      );
      task.fire();
    }, Math.max(0, task.remainingMs));
  }, []);

  const scheduleBroadcastBurst = useCallback(
    (burst: BroadcastChatBurst) => {
      const scheduledRunId = runIdRef.current;
      const broadcastNow = broadcastPausedRef.current
        ? broadcastPauseStartedAtRef.current ?? Date.now()
        : Date.now();
      chatSilenceUntilRef.current = Math.max(
        chatSilenceUntilRef.current,
        broadcastNow + burst.ambientSuppressionMs,
      );
      burst.cues.forEach((cue) => {
        const task: BroadcastTimerTask = {
          timerId: null,
          remainingMs: cue.delayMs,
          startedAt: Date.now(),
          fire: () => {
            if (runIdRef.current !== scheduledRunId) return;
            if (
              phaseRef.current !== 'PLAYING' &&
              phaseRef.current !== 'POST_LIVE'
            ) {
              return;
            }
            pushComment({
              username: cue.username,
              text: cue.text,
              type: cue.type,
              badge: cue.username === 'mod_taku' ? 'mod' : undefined,
            });
            if (cue.truth === 'signal') AudioSynth.playNotification();
            if (cue.truth === 'corrupted' && !prefersReducedMotion) {
              AudioSynth.playGlitch();
            }
          },
        };
        broadcastTasksRef.current.push(task);
        armBroadcastTask(task);
      });
    },
    [armBroadcastTask, prefersReducedMotion, pushComment],
  );

  useEffect(() => {
    if (broadcastPausedRef.current === isBroadcastPaused) return;
    const now = Date.now();
    if (isBroadcastPaused) {
      broadcastPausedRef.current = true;
      broadcastPauseStartedAtRef.current = now;
      broadcastTasksRef.current.forEach((task) => {
        if (task.timerId === null) return;
        window.clearTimeout(task.timerId);
        task.timerId = null;
        task.remainingMs = Math.max(
          0,
          task.remainingMs - (now - task.startedAt),
        );
      });
      return;
    }

    const pausedAt = broadcastPauseStartedAtRef.current;
    if (pausedAt !== null && chatSilenceUntilRef.current > pausedAt) {
      chatSilenceUntilRef.current += now - pausedAt;
    }
    broadcastPauseStartedAtRef.current = null;
    broadcastPausedRef.current = false;
    broadcastTasksRef.current.forEach(armBroadcastTask);
  }, [armBroadcastTask, isBroadcastPaused]);

  useEffect(
    () => () => clearBroadcastTimers(),
    [clearBroadcastTimers],
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
      const delay = isImprovementPrototypeRef.current
        ? 4200 + Math.random() * 2600
        : 2000 + Math.random() * 2000;
      timerId = window.setTimeout(emitComment, delay);
    };

    const emitComment = () => {
      if (Date.now() < chatSilenceUntilRef.current) {
        schedule();
        return;
      }
      const currentPlayer = playerRef.current;
      const currentNearest = nearestRef.current;
      const currentChapter = chapterRef.current;
      let user = USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)];
      let badge = BADGES[Math.floor(Math.random() * BADGES.length)];

      const chooseLine = (lines: readonly string[]) => {
        if (!isImprovementPrototypeRef.current) {
          return lines[Math.floor(Math.random() * lines.length)];
        }
        const recent = recentAmbientTextsRef.current;
        const candidates = lines.filter((line) => !recent.includes(line));
        const pool = candidates.length > 0 ? candidates : lines;
        return pool[Math.floor(Math.random() * pool.length)];
      };

      let text = 'ここ、空気やばくない？';
      let type: Comment['type'] = 'normal';

      if (riskTierRef.current >= 3 || currentPlayer.tension > 82) {
        const lines = activeBoard.chatLines.hijack;
        text = chooseLine(lines);
        type = Math.random() > 0.35 ? 'spooky' : 'glitch';
      } else if (!currentPlayer.flashlightOn) {
        const lines = activeBoard.chatLines.dark;
        text = chooseLine(lines);
        type = 'spooky';
      } else if (currentPlayer.isRunning) {
        const lines = activeBoard.chatLines.running;
        text = chooseLine(lines);
      } else if (
        currentNearest.anomaly &&
        currentNearest.distance < 430 &&
        !currentNearest.anomaly.captured
      ) {
        const lines = activeBoard.chatLines.nearby;
        text = chooseLine(lines);
        type = 'hint';
      } else {
        const lines = activeBoard.chatLines.ambient;
        text = chooseLine(lines);
      }

      if ((riskTierRef.current >= 3 || currentChapter >= 4) && Math.random() < 0.32) {
        const lines = activeBoard.chatLines.hijack;
        text = chooseLine(lines);
        type = 'glitch';
      }

      if (
        isImprovementPrototypeRef.current &&
        getViewerThreatProfile(riskTierRef.current).suppressHumanChat
      ) {
        const corruptedUsers = ['SYSTEM_2347', 'room_2B', 'まだ見てる'];
        user = corruptedUsers[Math.floor(Math.random() * corruptedUsers.length)];
        badge = undefined;
        type = 'glitch';
      }

      if (
        isImprovementPrototypeRef.current &&
        text === '同接じわじわ増えてる'
      ) {
        text = '配信、ちゃんと届いてる？';
      }

      pushComment({ username: user, text, type, badge });
      if (isImprovementPrototypeRef.current) {
        recentAmbientTextsRef.current = [
          ...recentAmbientTextsRef.current.filter((line) => line !== text),
          text,
        ].slice(-3);
      }

      if (type !== 'glitch' && Math.random() < 0.22) {
        AudioSynth.playNotification();
      }

      schedule();
    };

    schedule();
    return () => window.clearTimeout(timerId);
  }, [activeBoard, isInterfacePaused, phase, pushComment, riskTier]);

  useEffect(() => {
    if (phase !== 'PLAYING') return;

    const cues = activeBoard.riskCues;

    viewerRisk.firedBands.forEach((band) => {
      const ledgerKey = `${selectedBoardId}:${runIdRef.current}:${band}`;
      if (announcedRiskBandsRef.current.has(ledgerKey)) return;
      announcedRiskBandsRef.current.add(ledgerKey);

      const cue = cues[band];
      const tier = VIEWER_BANDS.indexOf(band) as RiskTier;
      scheduleBroadcastBurst(
        createRiskTierHijack({
          eventId: `${runIdRef.current}:risk-${tier}`,
          tier,
        }),
      );
      handleAddLog(`【RISK TIER ${tier}】${cue.log}`);
      if (tier >= 2 && !prefersReducedMotion) AudioSynth.playGlitch();
    });
  }, [
    activeBoard,
    handleAddLog,
    phase,
    prefersReducedMotion,
    pushComment,
    scheduleBroadcastBurst,
    selectedBoardId,
    viewerRisk,
  ]);

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

  useEffect(() => {
    if (phase !== 'POST_LIVE') return undefined;
    if (isImprovementPrototype) return undefined;
    setShowObjective(false);
    const timer = window.setTimeout(() => setPhase('ENDING'), 7_200);
    return () => window.clearTimeout(timer);
  }, [isImprovementPrototype, phase]);

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
    const active = phase === 'PLAYING' || phase === 'POST_LIVE';
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
      if (type === 'whisper' || prefersReducedMotion) {
        AudioSynth.playNotification();
      } else {
        AudioSynth.playStinger();
        AudioSynth.playGlitch();
      }

      if (
        type === 'chase' &&
        isImprovementPrototypeRef.current &&
        !chaseActiveRef.current
      ) {
        chaseActiveRef.current = true;
        setIsChaseActive(true);
        recordPrototypeMilestone('CHASE_STARTED');
        handleAddLog('【CHASE】同接に引き寄せられた観測者がMain側へ侵入した。非常口まで走れ。');
        pushComment({
          username: 'mod_taku',
          text: '後ろにいる。止まるな、非常口まで走れ！',
          type: 'hint',
          badge: 'mod',
        });
      }
    },
    [handleAddLog, prefersReducedMotion, pushComment, recordPrototypeMilestone],
  );

  const handleAnomalyCue = useCallback(
    (
      anomaly: Anomaly,
      nextPhase: AnomalyDirectorPhase,
    ) => {
      const authoredPhases: readonly BroadcastAnomalyPhase[] = [
        'TELEGRAPH',
        'ACTIVE',
        'RECORDED',
        'IGNORED',
        'MISSED',
      ];
      if (!authoredPhases.includes(nextPhase as BroadcastAnomalyPhase)) return;
      scheduleBroadcastBurst(
        createAnomalyChatBurst({
          eventId: `${runIdRef.current}:${anomaly.id}:${anomaly.directorState?.cycle ?? 0}:${nextPhase}`,
          phase: nextPhase as BroadcastAnomalyPhase,
          subject: anomaly.description,
        }),
      );

      const isCalibrationAnomaly =
        anomaly.id === 'hospital.anomaly.footsteps' ||
        anomaly.id === 'school.anomaly.shoe-locker';
      if (
        !isImprovementPrototypeRef.current &&
        isCalibrationAnomaly &&
        riskTierRef.current === 0 &&
        (nextPhase === 'IGNORED' || nextPhase === 'MISSED')
      ) {
        advanceViewerRisk();
        handleAddLog('【DVR CALIBRATED】撮影成否にかかわらず、遅延映像の同期が確立した。');
      }

    },
    [advanceViewerRisk, handleAddLog, scheduleBroadcastBurst],
  );

  const handlePickupItem = useCallback(
    (itemId: string) => {
      const item = itemsRef.current.find((candidate) => candidate.id === itemId);
      if (!item || item.found) return;

      const nextItems = itemsRef.current.map((candidate) =>
        candidate.id === itemId ? { ...candidate, found: true } : candidate,
      );
      itemsRef.current = nextItems;
      setItems(nextItems);
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

  const finishRun = useCallback(
    (resolvedEnding: EndingType, nextPhase: 'ENDING' | 'POST_LIVE') => {
      setEndingType(resolvedEnding);
      if (isImprovementPrototypeRef.current) {
        if (prototypeMilestonesRef.current.length > 0) {
          const durationMs = getPrototypeActiveElapsedMs();
          const milestones = prototypeMilestonesRef.current.some(
            (milestone) => milestone.id === 'RUN_FINISHED',
          )
            ? prototypeMilestonesRef.current
            : [
                ...prototypeMilestonesRef.current,
                { id: 'RUN_FINISHED', elapsedMs: durationMs },
              ];
          prototypeMilestonesRef.current = milestones;
          setPrototypeResult({
            durationMs,
            durationBand: evaluateImprovementPrototypeDuration(durationMs),
            milestones,
            sequenceComplete: hasCompleteImprovementPrototypeSequence(milestones),
          });
        }
      } else {
        setProgression((current) =>
          recordRun(current, {
            runId: runIdRef.current,
            boardId: selectedBoardId,
            mode: runMode,
            ending: resolvedEnding,
            foundItemIds: itemsRef.current
              .filter((item) => item.found)
              .map((item) => item.id),
            recordedAnomalyIds: anomaliesRef.current
              .filter((anomaly) => anomaly.captured)
              .map((anomaly) => anomaly.id),
          }),
        );
      }
      climaxActiveRef.current = false;
      setIsClimaxActive(false);
      chaseActiveRef.current = false;
      setIsChaseActive(false);
      phaseRef.current = nextPhase;
      setPhase(nextPhase);
      AudioSynth.playStinger();
    },
    [getPrototypeActiveElapsedMs, runMode, selectedBoardId],
  );

  const handlePipTargetChange = useCallback(
    (target: CameraCaptureTarget | null) => {
      latestPipTargetRef.current = target;
      const anomaly = target?.targetId
        ? anomaliesRef.current.find(
            (candidate) => candidate.id === target.targetId,
          ) ?? null
        : null;
      const result = createPipAlertBurst({
        eventId: `${runIdRef.current}:pip-alert:${target?.targetId ?? 'none'}`,
        target,
        alertedTargetIds: alertedPipTargetIdsRef.current,
        isCameraOnlyTarget: anomaly?.visibleOnlyInPip === true,
        subject: anomaly?.description ?? '人のいない場所',
      });
      alertedPipTargetIdsRef.current = result.alertedTargetIds;
      if (result.burst) scheduleBroadcastBurst(result.burst);
    },
    [scheduleBroadcastBurst],
  );

  const handleCaptureAnomaly = useCallback((requestedTarget?: CameraCaptureTarget | null) => {
    if (phaseRef.current !== 'PLAYING') return false;
    const captureDecision = requestedTarget ?? latestPipTargetRef.current;
    const currentPlayer = playerRef.current;
    if (
      climaxActiveRef.current &&
      captureDecision?.targetId === 'stream.observer' &&
      captureDecision.canCapture
    ) {
      if (isImprovementPrototypeRef.current) {
        AudioSynth.playNotification();
        handleAddLog('【PROTOTYPE LOCK】証拠は揃った。観測者を撮らず、Eで非常口から脱出する。');
        pushComment({
          username: 'mod_taku',
          text: 'もう撮るな。同接を増やすな。Eで外へ出ろ！',
          type: 'hint',
          badge: 'mod',
        });
        return false;
      }
      setViewerRisk((current) =>
        transitionViewerRisk(current, {
          viewerCount: getViewerBand(3),
        }).state,
      );
      handleAddLog('【KEEP STREAMING】決定的な人影へカメラを向けた。終了操作が映像から消えた。');
      scheduleBroadcastBurst(
        createRiskTierHijack({
          eventId: `${runIdRef.current}:never-offline`,
          tier: 3,
        }),
      );
      recordPrototypeMilestone('CLIMAX_CAPTURED');
      finishRun('OVER_EXPLOITED', 'POST_LIVE');
      return true;
    }
    const target = captureDecision?.targetId
      ? anomaliesRef.current.find(
          (candidate) => candidate.id === captureDecision.targetId,
        ) ?? null
      : null;

    if (
      isImprovementPrototypeRef.current &&
      target?.id === 'hospital.anomaly.ceiling'
    ) {
      AudioSynth.playNotification();
      handleAddLog('【CHASE】天井の観測者は撮影対象ではない。非常口まで走る。');
      pushComment({
        username: 'mod_taku',
        text: '撮るな、もうMain側にいる。非常口まで走れ！',
        type: 'hint',
        badge: 'mod',
      });
      return false;
    }

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
      recordPrototypeMilestone(`CAPTURED:${target.id}`);
      handleAddLog(
        `【CAPTURE成功】${target.description} を記録した。配信の注目度が上昇した。`,
      );
      pushComment({
        username: 'mod_taku',
        text: `証拠映像きた！「${target.description}」をアーカイブした！`,
        type: 'hype',
        badge: 'mod',
      });
      scheduleBroadcastBurst(
        createAnomalyChatBurst({
          eventId: `${runIdRef.current}:${target.id}:recorded`,
          phase: 'RECORDED',
          subject: target.description,
        }),
      );
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
      OCCLUDED: '棚か扉で隠れてる。ライトを振って、死角から外して。',
      FLASHLIGHT_OFF: '真っ暗でピントが拾えてない。ライトを点けて。',
      RISK_LOCKED: 'まだ輪郭だけだ。カメラが対象として認識してない。',
      BATTERY_EMPTY: 'カメラ電池が空だ。撮影できてない。',
    };
    const reason = captureDecision?.reason ?? 'NO_TARGET';
    const failureCopy = reason === 'RESOLVED'
      ? getResolvedCaptureFailureCopy(target?.resolution)
      : reasonCopy[reason] ?? '今のは違う。対象を中央に捉えてから記録して。';
    AudioSynth.playNotification();
    handleAddLog(
      `【FOCUS LOST】撮影失敗。カメラ電池 -4。${reason}`,
    );
    pushComment({
      username: 'baka_camera',
      text: failureCopy,
      type: 'hint',
    });
    return false;
  }, [advanceViewerRisk, finishRun, handleAddLog, prefersReducedMotion, pushComment, recordPrototypeMilestone, scheduleBroadcastBurst]);

  const handleExit = useCallback(() => {
    if (!climaxActiveRef.current) return;
    if (
      isImprovementPrototypeRef.current &&
      !chaseCompletedRef.current
    ) {
      handleAddLog('【EXIT LOCKED】観測者を振り切るまで非常口を開けられない。');
      pushComment({
        username: 'mod_taku',
        text: 'まだ後ろにいる。走って距離を取れ！',
        type: 'hint',
        badge: 'mod',
      });
      return;
    }
    const totalFound = itemsRef.current.filter((item) => item.found).length;
    const totalCaptured = anomaliesRef.current.filter((anomaly) => anomaly.captured).length;
    const resolvedEnding: EndingType =
      totalFound === activeBoard.items.length &&
      totalCaptured >= Math.max(1, activeBoard.anomalies.length - 1)
        ? 'LOST_ARCHIVE'
        : 'ESCAPED';
    handleAddLog('【EXIT】撮影を打ち切り、非常口から建物の外へ脱出した。');
    recordPrototypeMilestone('EXIT_USED');
    finishRun(
      isImprovementPrototypeRef.current ? 'ESCAPED' : resolvedEnding,
      isImprovementPrototypeRef.current ? 'POST_LIVE' : 'ENDING',
    );
  }, [activeBoard, finishRun, handleAddLog, pushComment, recordPrototypeMilestone]);

  const handleChapterComplete = useCallback(() => {
    const currentChapter = chapterRef.current;
    if (transitionGuardRef.current === currentChapter) return;
    transitionGuardRef.current = currentChapter;

    const restartPrototypeAnomaly = (
      anomalyId: string,
      retryX: number,
      log: string,
      chat: string,
    ) => {
      setAnomalies((previous) => {
        const next = previous.map((anomaly) => {
          if (anomaly.id !== anomalyId) return anomaly;
          const currentTransitionCount =
            anomaly.directorState?.transitionCount ?? 0;
          const currentCycle = anomaly.directorState?.cycle ?? 0;
          return {
            ...anomaly,
            captured: false,
            resolution: null,
            directorState: {
              ...createAnomalyDirectorState(anomaly.id, 0),
              transitionCount: currentTransitionCount + 1,
              cycle: currentCycle + 1,
            },
          };
        });
        anomaliesRef.current = next;
        return next;
      });
      latestPipTargetRef.current = null;
      alertedPipTargetIdsRef.current = new Set(
        [...alertedPipTargetIdsRef.current].filter(
          (targetId) => targetId !== anomalyId,
        ),
      );
      setPlayer((previous) => {
        const next = {
          ...previous,
          x: retryX,
          tension: Math.min(previous.tension, 58),
          health: Math.max(previous.health, 45),
          battery: Math.max(previous.battery, 35),
          flashlightOn: true,
          isRunning: false,
        };
        playerRef.current = next;
        return next;
      });
      handleAddLog(log);
      pushComment({
        username: 'mod_taku',
        text: chat,
        type: 'hint',
        badge: 'mod',
      });
      if (routeGuardTimerRef.current !== null) {
        window.clearTimeout(routeGuardTimerRef.current);
      }
      const guardedRunId = runIdRef.current;
      routeGuardTimerRef.current = window.setTimeout(() => {
        if (
          runIdRef.current === guardedRunId &&
          transitionGuardRef.current === currentChapter
        ) {
          transitionGuardRef.current = null;
        }
        routeGuardTimerRef.current = null;
      }, 700);
    };

    if (isImprovementPrototypeRef.current) {
      const prototypeGate = evaluateImprovementPrototypeGate(
        currentChapter,
        anomaliesRef.current,
      );
      if (prototypeGate.status === 'BLOCK') {
        restartPrototypeAnomaly(
          prototypeGate.anomalyId,
          prototypeGate.retryX,
          prototypeGate.log,
          prototypeGate.chat,
        );
        return;
      }
    }

    const route = isImprovementPrototypeRef.current
      ? { status: 'ALLOW' as const }
      : evaluateRoute(
          activeBoard,
          currentChapter,
          itemsRef.current,
          routeLoopCountRef.current,
        );
    if (route.status === 'BLOCK') {
      handleAddLog(
        route.kind === 'LOOP'
          ? `${route.log} 【LOOP ${route.loopCount}】`
          : route.log,
      );
      if (route.kind === 'LOOP') {
        routeLoopCountRef.current = route.loopCount;
        setRouteLoopCount(route.loopCount);
      }
      setPlayer((previous) => {
        const next = {
          ...previous,
          x: route.targetX,
          tension: Math.min(
            100,
            previous.tension + (route.kind === 'LOOP' ? 9 : 0),
          ),
        };
        playerRef.current = next;
        return next;
      });
      pushComment({
        username: route.kind === 'LOOP' ? 'room_2B' : 'kage_99',
        text:
          route.kind === 'LOOP'
            ? `${route.chat}（${route.loopCount}周目）`
            : route.chat,
        type: 'hint',
      });
      if (route.kind === 'LOOP' && !prefersReducedMotion) {
        AudioSynth.playGlitch();
      }
      if (routeGuardTimerRef.current !== null) {
        window.clearTimeout(routeGuardTimerRef.current);
      }
      const guardedRunId = runIdRef.current;
      routeGuardTimerRef.current = window.setTimeout(() => {
        if (
          runIdRef.current === guardedRunId &&
          transitionGuardRef.current === currentChapter
        ) {
          transitionGuardRef.current = null;
        }
        routeGuardTimerRef.current = null;
      }, route.kind === 'LOOP' ? 900 : 600);
      return;
    }

    if (currentChapter < activeBoard.chapters.length) {
      const nextChapter = currentChapter + 1;
      handleAddLog(
        `【CHECKPOINT】${activeBoard.chapters[currentChapter - 1].subtitle} を突破した。`,
      );
      setChapterId(nextChapter);
      pushComment({
        username: 'SYSTEM_ARCHIVE',
        text: `${activeBoard.chapters[nextChapter - 1].title} — ${activeBoard.chapters[nextChapter - 1].subtitle}`,
        type: 'system',
      });
      AudioSynth.playNotification();
      return;
    }

    if (
      isImprovementPrototypeRef.current &&
      !chaseActiveRef.current
    ) {
      restartPrototypeAnomaly(
        'hospital.anomaly.ceiling',
        3_880,
        '【CHASE GATE】同接上昇で接近した観測者を振り切る必要がある。PIP上端の予兆を確認する。',
        '終わってない。右上の天井を見て――来たら非常口まで走れ。',
      );
      return;
    }

    if (isImprovementPrototypeRef.current) {
      chaseActiveRef.current = false;
      chaseCompletedRef.current = true;
      setIsChaseActive(false);
      setHasChaseCompleted(true);
      recordPrototypeMilestone('CHASE_CLEARED');
      handleAddLog('【CHASE CLEAR】観測者を振り切り、非常口へ到達した。');
      pushComment({
        username: 'mod_taku',
        text: '今だ、Eで出ろ。配信終了は外に出てから押せ！',
        type: 'hint',
        badge: 'mod',
      });
    }

    climaxActiveRef.current = true;
    setIsClimaxActive(true);
    setShowObjective(true);
    setViewerRisk((current) =>
      transitionViewerRisk(current, {
        viewerCount: Math.max(current.viewerCount, getViewerBand(2)),
      }).state,
    );
    if (isImprovementPrototypeRef.current) {
      handleAddLog('【FINAL GOAL】Eで非常口から脱出する。追加撮影は行わない。');
      pushComment({
        username: 'mod_taku',
        text: '非常口でE。もう撮るな、今すぐ外へ出ろ！',
        type: 'hint',
        badge: 'mod',
      });
    } else {
      handleAddLog('【FINAL CHOICE】Eで非常口から脱出するか、右上の人影をCAPTUREして配信を続ける。');
      pushComment({
        username: 'mod_taku',
        text: '非常口でEなら脱出。右上の人影を撮れば、たぶんもう配信は切れない。',
        type: 'hint',
        badge: 'mod',
      });
    }
  }, [
    activeBoard,
    handleAddLog,
    prefersReducedMotion,
    pushComment,
    recordPrototypeMilestone,
  ]);

  const handleRetry = useCallback(() => {
    const currentChapter = chapterRef.current;
    canonicalSceneHistory.clear();
    clearBroadcastTimers();
    latestPipTargetRef.current = null;
    alertedPipTargetIdsRef.current = new Set();
    approachedItemIdsRef.current.clear();
    passedItemIdsRef.current.clear();
    transitionGuardRef.current = null;
    if (routeGuardTimerRef.current !== null) {
      window.clearTimeout(routeGuardTimerRef.current);
      routeGuardTimerRef.current = null;
    }
    chatSilenceUntilRef.current = 0;
    setPlayer({
      ...INITIAL_PLAYER,
      x: Math.max(
        10,
        startPositionForChapter(activeBoard.chapters, currentChapter) + 20,
      ),
      battery: modeDefinition.initialBattery,
      tension: modeDefinition.initialTension,
    });
    setAnomalies((previous) => {
      const next = previous.map((anomaly) => {
        const resetState = createAnomalyDirectorState(anomaly.id, 0);
        if (
          isImprovementPrototypeRef.current &&
          anomaly.id === 'hospital.anomaly.ceiling' &&
          currentChapter >= 4
        ) {
          return {
            ...anomaly,
            captured: false,
            resolution: null,
            directorState: {
              ...resetState,
              transitionCount:
                (anomaly.directorState?.transitionCount ?? 0) + 1,
              cycle: (anomaly.directorState?.cycle ?? 0) + 1,
            },
          };
        }
        if (!isAnomalyResolved(anomaly)) {
          return {
            ...anomaly,
            directorState: {
              ...resetState,
              transitionCount:
                (anomaly.directorState?.transitionCount ?? 0) + 1,
              cycle: (anomaly.directorState?.cycle ?? 0) + 1,
            },
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
    climaxActiveRef.current = false;
    chaseActiveRef.current = false;
    chaseCompletedRef.current = false;
    setIsClimaxActive(false);
    setIsChaseActive(false);
    setHasChaseCompleted(false);
    setIsJournalOpen(false);
    setIsChatOpen(false);
    phaseRef.current = 'PLAYING';
    setPhase('PLAYING');
    handleAddLog('【RECONNECT】直前のセーフドアから配信を再接続した。');
    pushComment({
      username: 'mod_taku',
      text: '戻ってきた！ 今度はTENSIONを上げすぎるな！',
      type: 'hype',
      badge: 'mod',
    });
  }, [activeBoard.chapters, clearBroadcastTimers, handleAddLog, modeDefinition, pushComment]);

  const prepareBoardSession = useCallback(
    (
      boardId: BoardId,
      mode: RunMode,
      nextPhase: GamePhase = 'INTRO_STORY',
      improvementPrototype = false,
    ) => {
      const board = getBoardDefinition(boardId);
      const sessionBoard = improvementPrototype
        ? createImprovementPrototypeBoard(getBoardDefinition('hospital'))
        : board;
      const nextMode = sessionBoard.modes[mode];
      const nextRunId = uniqueId(`run-${boardId}`);
      const nextPlayer: PlayerState = {
        ...INITIAL_PLAYER,
        battery: nextMode.initialBattery,
        tension: nextMode.initialTension,
      };
      const nextItems = improvementPrototype
        ? sessionBoard.items.map((item) => ({ ...item, found: false }))
        : createBoardItems(boardId);
      const nextAnomalies = improvementPrototype
        ? sessionBoard.anomalies.map((anomaly) => ({
            ...anomaly,
            captured: false,
            resolution: null,
          }))
        : createBoardAnomalies(boardId);

      canonicalSceneHistory.clear();
      clearBroadcastTimers();
      latestPipTargetRef.current = null;
      alertedPipTargetIdsRef.current = new Set();
      approachedItemIdsRef.current.clear();
      passedItemIdsRef.current.clear();
      announcedRiskBandsRef.current.clear();
      recentAmbientTextsRef.current = [];
      transitionGuardRef.current = null;
      if (routeGuardTimerRef.current !== null) {
        window.clearTimeout(routeGuardTimerRef.current);
        routeGuardTimerRef.current = null;
      }
      chatSilenceUntilRef.current = 0;
      routeLoopCountRef.current = 0;
      isImprovementPrototypeRef.current = improvementPrototype;
      chaseActiveRef.current = false;
      chaseCompletedRef.current = false;
      prototypeActiveElapsedRef.current = 0;
      prototypeMilestonesRef.current = [];
      runIdRef.current = nextRunId;
      playerRef.current = nextPlayer;
      itemsRef.current = nextItems;
      anomaliesRef.current = nextAnomalies;
      setSelectedBoardId(boardId);
      setRunMode(mode);
      setRunId(nextRunId);
      setChapterId(1);
      setViewerRisk(
        createInitialViewerRisk(boardId, 1, nextMode.initialRiskTier),
      );
      setPlayer(nextPlayer);
      setItems(nextItems);
      setAnomalies(nextAnomalies);
      setLogs([...sessionBoard.initialLogs]);
      setComments(createBoardComments(boardId));
      setRouteLoopCount(0);
      climaxActiveRef.current = false;
      setIsClimaxActive(false);
      setIsImprovementPrototype(improvementPrototype);
      setIsChaseActive(false);
      setHasChaseCompleted(false);
      setPrototypeResult(null);
      setIntroStep(0);
      setEndingType('ESCAPED');
      setIsJournalOpen(false);
      setIsChatOpen(false);
      setShowObjective(false);
      setIsRotateHintDismissed(false);
      setIsMuted(false);
      gameOverTriggeredRef.current = false;
      emptyBatteryLoggedRef.current = false;
      AudioSynth.setMuted(false);
      if (!improvementPrototype) {
        setProgression((current) =>
          recordRunAttempt(current, { runId: nextRunId, boardId }),
        );
      }
      setPhase(nextPhase);
    },
    [clearBroadcastTimers],
  );

  const startSelectedBoard = useCallback(() => {
    prepareBoardSession(selectedBoardId, runMode, 'INTRO_STORY', false);
  }, [prepareBoardSession, runMode, selectedBoardId]);

  const startImprovementPrototype = useCallback(() => {
    prepareBoardSession('hospital', 'STANDARD', 'INTRO_STORY', true);
  }, [prepareBoardSession]);

  const returnToTitle = useCallback(() => {
    canonicalSceneHistory.clear();
    clearBroadcastTimers();
    latestPipTargetRef.current = null;
    setIsJournalOpen(false);
    setIsChatOpen(false);
    setPhase('TITLE');
  }, [clearBroadcastTimers]);

  const returnToBoardSelect = useCallback(() => {
    canonicalSceneHistory.clear();
    clearBroadcastTimers();
    latestPipTargetRef.current = null;
    setIsJournalOpen(false);
    setIsChatOpen(false);
    setPhase('BOARD_SELECT');
  }, [clearBroadcastTimers]);

  const advanceIntro = useCallback(() => {
    if (introStep < activeBoard.intros.length - 1) {
      setIntroStep((previous) => previous + 1);
      AudioSynth.playNotification();
      return;
    }

    setPhase('PLAYING');
    AudioSynth.playNotification();
  }, [activeBoard.intros.length, introStep]);

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

  const progress = Math.min(
    1,
    Math.max(0, player.x / activeBoard.worldEnd),
  );
  const signalBlocked = player.tension > 82;
  const endingCopy = activeBoard.endings[endingType];
  const isLiveSurface = phase === 'PLAYING' || phase === 'POST_LIVE';
  const showGameplaySurface =
    phase === 'PLAYING' ||
    (phase === 'POST_LIVE' && !isImprovementPrototype);
  const missionSteps = ['侵入', '異変', '撮影', '配信異常', '脱出'] as const;
  const missionStep = isClimaxActive || isChaseActive
    ? missionSteps.length - 1
    : Math.min(missionSteps.length - 2, Math.max(0, chapterId - 1));
  const currentObjectiveCopy = isChaseActive
    ? '観測者がMain側へ侵入した。止まらず非常口まで走る。'
    : activeBoard.chapters[chapterId - 1].description;

  return (
    <div
      className={`${isLiveSurface ? 'h-dvh overflow-hidden' : 'min-h-screen overflow-x-hidden'} bg-[#050505] text-zinc-100 selection:bg-red-600/40 selection:text-white`}
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
    >
      <div className="pointer-events-none fixed inset-0 broadcast-grid opacity-35" />
      <div className="pointer-events-none fixed inset-0 ambient-vignette" />
      <div className="pointer-events-none fixed inset-0 noise-layer opacity-[0.035]" />

      {phase === 'TITLE' && (
        <TitleScreenV2 onStartGame={() => setPhase('BOARD_SELECT')} />
      )}

      {phase === 'BOARD_SELECT' && (
        <BoardSelectScreen
          selectedBoardId={selectedBoardId}
          selectedMode={runMode}
          progression={progression}
          onSelectBoard={setSelectedBoardId}
          onSelectMode={setRunMode}
          onStart={startSelectedBoard}
          onStartPrototype={startImprovementPrototype}
          onBack={returnToTitle}
        />
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
                    {activeBoard.intros[introStep].label}
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] text-zinc-600">
                0{introStep + 1} / 0{activeBoard.intros.length}
              </span>
            </header>

            <div className="intro-copy flex min-h-[250px] items-center py-10 md:min-h-[300px] md:px-7">
              <p className="font-serif text-lg font-semibold leading-[2] tracking-[0.04em] text-zinc-100 md:text-2xl">
                {activeBoard.intros[introStep].text}
              </p>
            </div>

            <div className="mb-5 flex gap-2">
              {activeBoard.intros.map((item, index) => (
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
                {introStep < activeBoard.intros.length - 1 ? 'NEXT TRANSMISSION' : 'GO LIVE'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </footer>
          </div>
        </section>
      )}

      {showGameplaySurface && (
        <div className={`playing-shell relative z-10 ${phase === 'POST_LIVE' ? 'post-live-shell' : ''}`}>
          <StreamHeaderV2
            viewerCount={viewerCount}
            battery={Math.ceil(player.battery)}
            tension={Math.floor(player.tension)}
            health={Math.ceil(player.health)}
            chapterTitle={activeBoard.chapters[chapterId - 1].title}
            chapterSubtitle={activeBoard.chapters[chapterId - 1].subtitle}
            chapterId={chapterId}
            totalChapters={activeBoard.chapters.length}
            progress={progress}
            onToggleMute={handleToggleMute}
            isMuted={isMuted}
            onOpenJournal={openJournal}
            onOpenChat={openChat}
            onShowObjective={() => setShowObjective(true)}
            isInert={phase === 'POST_LIVE' || isJournalOpen || isChatOpen || shouldShowRotateHint}
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
            inert={phase === 'POST_LIVE' || isJournalOpen || shouldShowRotateHint ? true : undefined}
          >
            <div
              className="playing-main"
              inert={isChatOpen ? true : undefined}
            >
              <div className="playing-world">
                <MainGameView
                  key={`${runId}-main`}
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
                  boardId={selectedBoardId}
                  boardLabel={activeBoard.locationLabel}
                  chapters={activeBoard.chapters}
                  worldEnd={activeBoard.worldEnd}
                  riskTier={riskTier}
                  loopCount={routeLoopCount}
                  batteryDrainMultiplier={modeDefinition.batteryDrainMultiplier}
                  telegraphDurationMultiplier={modeDefinition.telegraphDurationMultiplier}
                  activeWindowMultiplier={modeDefinition.activeWindowMultiplier}
                  onAnomalyCue={handleAnomalyCue}
                  isPaused={isInterfacePaused}
                  climaxActive={isClimaxActive}
                  onExit={handleExit}
                  reducedMotion={prefersReducedMotion}
                  hidePlayer={phase === 'POST_LIVE'}
                  improvementPrototype={isImprovementPrototype}
                  chaseActive={isChaseActive}
                />

                <section className="mission-tracker" aria-label="配信ミッション進行">
                  <div className="mission-spine">
                    {missionSteps.map((step, index) => (
                      <span
                        key={step}
                        data-state={index < missionStep ? 'done' : index === missionStep ? 'active' : 'pending'}
                      >
                        {step}
                      </span>
                    ))}
                  </div>
                  <strong>
                    {isClimaxActive
                      ? isImprovementPrototype
                        ? 'E：非常口から脱出する（追加撮影禁止）'
                        : 'E：脱出 ／ 右上の人影をCAPTURE：配信継続'
                      : currentObjectiveCopy}
                  </strong>
                </section>

                {isChaseActive && (
                  <section className="chase-warning" role="status" aria-live="assertive">
                    <p>CHASE / SIGNAL BREACH</p>
                    <strong>止まるな。非常口まで走れ。</strong>
                    <span>SHIFT + D ／ 停止するとTENSIONが致死域へ上昇</span>
                  </section>
                )}

                {showObjective && (
                  <section className="current-objective" aria-label="現在の目的">
                    <div>
                      <p><Radio aria-hidden="true" /> CURRENT OBJECTIVE</p>
                      <strong>{currentObjectiveCopy}</strong>
                    </div>
                    <div className="objective-evidence" aria-label="記録状況">
                      <span><Camera aria-hidden="true" /> {anomalies.filter((anomaly) => anomaly.captured).length}/{anomalies.length}</span>
                      {!isImprovementPrototype && (
                        <span><BookOpen aria-hidden="true" /> {items.filter((item) => item.found).length}/{items.length}</span>
                      )}
                    </div>
                    <button type="button" onClick={() => setShowObjective(false)} aria-label="目的表示を閉じる">
                      <X aria-hidden="true" />
                    </button>
                  </section>
                )}

                {phase === 'POST_LIVE' && (
                  <section className="post-live-absence" aria-label="配信者消失後も続くライブ配信">
                    <p>SUBJECT NOT FOUND</p>
                    <strong>配信者は画面から消えた。</strong>
                    <span>LIVE SIGNAL CONTINUES / 終了操作を受け付けません</span>
                  </section>
                )}

              </div>

              {showChapterCard && (
                <div className="playing-chapter-toast">
                  <p>CHECKPOINT {chapterId}/{activeBoard.chapters.length}</p>
                  <strong>{activeBoard.chapters[chapterId - 1].subtitle}</strong>
                </div>
              )}
            </div>

            <aside className={`playing-rail ${isChatOpen ? 'chat-open' : ''}`} aria-label="配信補助画面">
              <div
                className="pip-slot"
                inert={isChatOpen ? true : undefined}
              >
                <PipCameraV2
                  key={`${runId}-pip`}
                  currentAnomaly={nearest.anomaly}
                  anomalyDistance={nearest.distance}
                  tension={player.tension}
                  flashlightOn={player.flashlightOn && player.battery > 0}
                  onCaptureAnomaly={handleCaptureAnomaly}
                  onTargetChange={handlePipTargetChange}
                  player={player}
                  anomalies={anomalies}
                  items={items}
                  boardId={selectedBoardId}
                  runId={runId}
                  loopCount={routeLoopCount}
                  riskTier={riskTier}
                  reducedMotion={prefersReducedMotion}
                  isPaused={isInterfacePaused && phase !== 'POST_LIVE'}
                  climaxActive={isClimaxActive}
                  subtleCaptureFeedback={isImprovementPrototype}
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

          {phase === 'POST_LIVE' && (
            <p
              className="sr-only"
              role="status"
              aria-live="assertive"
              aria-atomic="true"
            >
              配信者は画面から消えました。しかしLIVE配信は終了せず、映像とコメントだけが続いています。
            </p>
          )}

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

      {phase === 'POST_LIVE' && isImprovementPrototype && (
        <section
          className="post-live-only relative z-10"
          aria-label="配信者消失後も終了しないLIVE表示"
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          data-prototype-duration-ms={prototypeResult?.durationMs}
          data-prototype-duration-band={prototypeResult?.durationBand}
          data-prototype-sequence-complete={prototypeResult?.sequenceComplete}
        >
          <div className="post-live-only-mark">
            <span aria-hidden="true" />
            LIVE
          </div>
        </section>
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

            {isImprovementPrototype && prototypeResult && (
              <section className="mt-6 border border-white/10 bg-black/30 p-4" aria-label="改善プロトタイプ所要時間判定">
                <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-red-700">
                  quality gate 2 / duration check
                </p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <strong className="text-2xl text-zinc-100">
                    {Math.round(prototypeResult.durationMs / 1000)} sec
                  </strong>
                  <span className={`font-mono text-[9px] font-bold tracking-[0.14em] ${
                    prototypeResult.durationBand === 'IN_TARGET'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}>
                    {prototypeResult.durationBand.replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-2 text-[10px] leading-5 text-zinc-600">
                  合格時間帯は180〜300秒。操作感・視認性・怖さは人間オーナーの実機確認が必要です。
                </p>
                <dl className="mt-3 grid gap-x-4 gap-y-1 border-t border-white/8 pt-3 font-mono text-[7px] sm:grid-cols-2">
                  {prototypeResult.milestones.map((milestone) => (
                    <div key={milestone.id} className="flex justify-between gap-3 text-zinc-600">
                      <dt className="truncate">{milestone.id}</dt>
                      <dd>{(milestone.elapsedMs / 1000).toFixed(1)}s</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

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
                onClick={isImprovementPrototype ? startImprovementPrototype : startSelectedBoard}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 border border-red-900 bg-[#0b0808] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-200 transition hover:border-red-700 hover:bg-red-950/25 active:translate-y-px"
              >
                <RotateCcw className="h-4 w-4" />
                {isImprovementPrototype ? 'retry prototype' : 'stream again'}
              </button>
              <button
                type="button"
                onClick={returnToBoardSelect}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/10 bg-black/30 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 transition hover:border-white/20 hover:text-white"
              >
                <Radio className="h-4 w-4" />
                boards
              </button>
              <button
                type="button"
                onClick={returnToTitle}
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
              onClick={returnToTitle}
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
