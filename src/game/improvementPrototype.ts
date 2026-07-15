import type { Anomaly, AnomalyResolution, Chapter, Comment } from '../types';
import type { BoardDefinition } from './boardDefinitions';

export const IMPROVEMENT_PROTOTYPE_ID = 'hospital-standard-gate-2';
export const IMPROVEMENT_PROTOTYPE_MIN_DURATION_MS = 180_000;
export const IMPROVEMENT_PROTOTYPE_MAX_DURATION_MS = 300_000;

export const IMPROVEMENT_PROTOTYPE_REQUIRED_CAPTURES = [
  'hospital.anomaly.footsteps',
  'hospital.anomaly.door-figure',
  'hospital.anomaly.wheelchair',
] as const;

export const IMPROVEMENT_PROTOTYPE_WORLD_END = 5_000;
export const IMPROVEMENT_PROTOTYPE_CALIBRATION_MS = 25_000;

export function shouldPublishPrototypeComment(
  activeElapsedMs: number,
  type: Comment['type'],
): boolean {
  return type === 'system' || activeElapsedMs >= IMPROVEMENT_PROTOTYPE_CALIBRATION_MS;
}

export function createImprovementPrototypeComments(now = Date.now()): Comment[] {
  return [
    {
      id: 'hospital-gate-2-system-calibration',
      username: 'SYSTEM_LIVE',
      text: '回線校正中。Main同期、PIP遅延520ms。入力信号を待っています。',
      type: 'system',
      timestamp: now,
    },
  ];
}

export const IMPROVEMENT_PROTOTYPE_CHAPTERS: readonly Chapter[] = [
  {
    id: 1,
    title: 'Chapter 1: CALIBRATION',
    subtitle: '侵入口・濡れた廊下',
    startPos: 0,
    endPos: 1_200,
    description: 'ライトで足跡を探し、PIPの取得枠へ入れて最初の証拠を撮影する。',
  },
  {
    id: 2,
    title: 'Chapter 2: SECOND VIEW',
    subtitle: '第一病棟・扉の死角',
    startPos: 1_200,
    endPos: 2_400,
    description: 'コメントを手掛かりに、Mainにはいない人影をPIPで撮影する。',
  },
  {
    id: 3,
    title: 'Chapter 3: SIGNAL RISE',
    subtitle: '診療棟・反復する映像',
    startPos: 2_400,
    endPos: 3_600,
    description: '反復映像の怪異を記録し、同接の向こうから近づく気配に備える。',
  },
  {
    id: 4,
    title: 'Chapter 4: EXIT SIGNAL',
    subtitle: '電波管理室・非常口',
    startPos: 3_600,
    endPos: IMPROVEMENT_PROTOTYPE_WORLD_END,
    description: '侵入してきた観測者を振り切り、非常口から脱出する。',
  },
];

const IMPROVEMENT_PROTOTYPE_ANOMALY_IDS = new Set([
  'hospital.anomaly.footsteps',
  'hospital.anomaly.door-figure',
  'hospital.anomaly.wheelchair',
  'hospital.anomaly.ceiling',
]);

const IMPROVEMENT_PROTOTYPE_ANOMALY_X: Readonly<Record<string, number>> = {
  // Keep the first floor evidence before the entry bed so it has a visible,
  // capturable approach window. The normal hospital route stays untouched.
  'hospital.anomaly.footsteps': 400,
};

export function createImprovementPrototypeBoard(
  hospital: BoardDefinition,
): BoardDefinition {
  return {
    ...hospital,
    worldEnd: IMPROVEMENT_PROTOTYPE_WORLD_END,
    chapters: IMPROVEMENT_PROTOTYPE_CHAPTERS,
    intros: [
      {
        label: 'MISSION',
        text: '失踪配信者の最後の映像を追い、PIPにだけ残る決定的証拠を撮影して脱出する。',
      },
      {
        label: 'WARNING',
        text: '撮影で同接が増えるほど、映像の向こう側にいる観測者は現実へ近づく。',
      },
    ],
    items: [],
    anomalies: hospital.anomalies
      .filter((anomaly) => IMPROVEMENT_PROTOTYPE_ANOMALY_IDS.has(anomaly.id))
      .map((anomaly) => {
        const prototypeX = IMPROVEMENT_PROTOTYPE_ANOMALY_X[anomaly.id];
        return prototypeX === undefined
          ? anomaly
          : { ...anomaly, x: prototypeX };
      }),
    routeRules: [],
    initialLogs: [
      '【SYSTEM】白鳴霊園付属病棟・深夜回線へ接続。三系統の記録を開始する。',
      '【ROUTE】校正撮影→PIP限定撮影→同接上昇→追跡→非常口。',
    ],
  };
}

interface PrototypeCaptureGate {
  chapterId: number;
  anomalyId: (typeof IMPROVEMENT_PROTOTYPE_REQUIRED_CAPTURES)[number];
  retryX: number;
  log: string;
  chat: string;
}

const PROTOTYPE_CAPTURE_GATES: readonly PrototypeCaptureGate[] = [
  {
    chapterId: 1,
    anomalyId: 'hospital.anomaly.footsteps',
    retryX: 360,
    log: '【ROUTE LOCK】最初の異変を撮影するまで先へ進めない。PIPの照準を合わせてCAPTUREする。',
    chat: '今の足跡を右上で撮って。撮影しないと同接も危険度も動かない。',
  },
  {
    chapterId: 2,
    anomalyId: 'hospital.anomaly.door-figure',
    retryX: 1_260,
    log: '【ROUTE LOCK】Mainにいない人影をPIPで記録するまで先へ進めない。',
    chat: 'Mainじゃなく右上。扉の陰の人影を枠の中央に入れてCAPTURE。',
  },
  {
    chapterId: 3,
    anomalyId: 'hospital.anomaly.wheelchair',
    retryX: 2_620,
    log: '【ROUTE LOCK】反復する車椅子を撮影し、同接リスクを最大段階まで上げる。',
    chat: '車椅子、フレームごとに向きが違う。今のうちに撮ってから先へ。',
  },
];

export type ImprovementPrototypeGateDecision =
  | { status: 'ALLOW' }
  | {
      status: 'BLOCK';
      anomalyId: PrototypeCaptureGate['anomalyId'];
      retryX: number;
      log: string;
      chat: string;
    };

export function evaluateImprovementPrototypeGate(
  chapterId: number,
  anomalies: readonly Pick<Anomaly, 'id' | 'captured' | 'resolution'>[],
): ImprovementPrototypeGateDecision {
  const gate = PROTOTYPE_CAPTURE_GATES.find(
    (candidate) => candidate.chapterId === chapterId,
  );
  if (!gate) return { status: 'ALLOW' };

  const target = anomalies.find((anomaly) => anomaly.id === gate.anomalyId);
  if (target?.captured && target.resolution === 'RECORDED') {
    return { status: 'ALLOW' };
  }

  return {
    status: 'BLOCK',
    anomalyId: gate.anomalyId,
    retryX: gate.retryX,
    log: gate.log,
    chat: gate.chat,
  };
}

export function getResolvedCaptureFailureCopy(
  resolution: AnomalyResolution | null | undefined,
): string {
  if (resolution === 'RECORDED') {
    return 'その映像は記録済みだ。次の異変を探して。';
  }
  if (resolution === 'IGNORED') {
    return '見送った異変はもう消えた。次の予兆を待って。';
  }
  if (resolution === 'MISSED') {
    return '撮影可能時間を逃した。次の出現まで映像を見直して。';
  }
  return 'その異変はもう画角から消えている。';
}

export type ImprovementPrototypeDurationBand =
  | 'UNDER_TARGET'
  | 'IN_TARGET'
  | 'OVER_TARGET';

export function evaluateImprovementPrototypeDuration(
  durationMs: number,
): ImprovementPrototypeDurationBand {
  if (durationMs < IMPROVEMENT_PROTOTYPE_MIN_DURATION_MS) {
    return 'UNDER_TARGET';
  }
  if (durationMs > IMPROVEMENT_PROTOTYPE_MAX_DURATION_MS) {
    return 'OVER_TARGET';
  }
  return 'IN_TARGET';
}

export interface PrototypeActiveFrameMeasurement {
  activeDeltaMs: number;
  nextPreviousAtMs: number;
}

/** Counts the complete visible interval; callers rebase on visibility change. */
export function measurePrototypeActiveFrame(
  previousAtMs: number,
  nowMs: number,
  isVisible: boolean,
): PrototypeActiveFrameMeasurement {
  return {
    activeDeltaMs: isVisible ? Math.max(0, nowMs - previousAtMs) : 0,
    nextPreviousAtMs: nowMs,
  };
}

export type PrototypeScareType = 'jumpscare' | 'chase' | 'whisper';

export interface ImprovementPrototypeMilestoneLike {
  id: string;
  elapsedMs: number;
}

export const IMPROVEMENT_PROTOTYPE_REQUIRED_MILESTONES = [
  'PLAYING_STARTED',
  'CAPTURED:hospital.anomaly.footsteps',
  'CAPTURED:hospital.anomaly.door-figure',
  'CAPTURED:hospital.anomaly.wheelchair',
  'CHASE_STARTED',
  'CHASE_CLEARED',
  'EXIT_USED',
  'RUN_FINISHED',
] as const;

export function hasCompleteImprovementPrototypeSequence(
  milestones: readonly ImprovementPrototypeMilestoneLike[],
): boolean {
  let previousIndex = -1;
  for (const requiredId of IMPROVEMENT_PROTOTYPE_REQUIRED_MILESTONES) {
    const nextIndex = milestones.findIndex(
      (milestone, index) => index > previousIndex && milestone.id === requiredId,
    );
    if (nextIndex < 0) return false;
    previousIndex = nextIndex;
  }
  return true;
}

export function selectPrototypeScareType(input: {
  improvementPrototype: boolean;
  anomalyX: number;
  worldEnd: number;
  currentChapterId: number;
  totalChapters: number;
}): PrototypeScareType {
  if (
    input.improvementPrototype &&
    input.anomalyX >= input.worldEnd - 1_000
  ) {
    return 'chase';
  }
  if (
    input.currentChapterId === input.totalChapters &&
    input.anomalyX >= input.worldEnd - 600
  ) {
    return 'jumpscare';
  }
  return 'whisper';
}
