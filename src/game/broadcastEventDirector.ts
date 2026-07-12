import type { CameraCaptureTarget } from './capture.ts';
import { CAPTURE_MAX_DISTANCE } from './capture.ts';
import type {
  AnomalyDirectorPhase,
  Comment,
  RiskTier,
} from '../types.ts';

export type BroadcastTruth = 'signal' | 'noise' | 'corrupted';

export type BroadcastAnomalyPhase = Extract<
  AnomalyDirectorPhase,
  'TELEGRAPH' | 'ACTIVE' | 'RECORDED' | 'IGNORED' | 'MISSED'
>;

export type BroadcastBurstKind = 'ANOMALY' | 'RISK_HIJACK' | 'PIP_ALERT';

export interface BroadcastChatCue {
  /** Stable encounter identity shared by every cue in the burst. */
  eventId: string;
  /** Stable identity for scheduling and deduping an individual cue. */
  cueId: string;
  /** Relative delay from the beginning of the burst. */
  delayMs: number;
  username: string;
  text: string;
  type: Comment['type'];
  truth: BroadcastTruth;
}

export interface BroadcastChatBurst {
  eventId: string;
  kind: BroadcastBurstKind;
  phase: BroadcastAnomalyPhase | 'RISK_HIJACK' | 'PIP_ALERT';
  /** Ambient/random Chat must remain silent for this long from burst start. */
  ambientSuppressionMs: number;
  cues: readonly BroadcastChatCue[];
}

export interface AnomalyChatBurstInput {
  eventId: string;
  phase: BroadcastAnomalyPhase;
  /** Human-readable fragment used by the deterministic script. */
  subject?: string;
}

export interface RiskTierHijackInput {
  eventId: string;
  tier: RiskTier;
  /** Fixed in-world handle only. Never pass a real account identifier. */
  playerHandle?: string;
}

export interface PipAlertBurstInput {
  eventId: string;
  target: CameraCaptureTarget | null;
  alertedTargetIds: ReadonlySet<string>;
  /** Required to distinguish an authored camera-only lock from an arbitrary lock. */
  isCameraOnlyTarget: boolean;
  subject?: string;
}

export type PipAlertStatus =
  | 'EMITTED'
  | 'NO_TARGET'
  | 'NOT_FRAMED'
  | 'UNMEANINGFUL_RISK_LOCK'
  | 'DUPLICATE';

export interface PipAlertBurstResult {
  status: PipAlertStatus;
  burst: BroadcastChatBurst | null;
  /** A new Set is returned only when an alert is emitted. */
  alertedTargetIds: ReadonlySet<string>;
}

interface CueTemplate {
  delayMs: number;
  username: string;
  text: (subject: string) => string;
  type: Comment['type'];
  truth: BroadcastTruth;
}

interface BurstTemplate {
  ambientSuppressionMs: number;
  cues: readonly CueTemplate[];
}

const ANOMALY_BURSTS: Readonly<Record<BroadcastAnomalyPhase, BurstTemplate>> = {
  TELEGRAPH: {
    ambientSuppressionMs: 2_600,
    cues: [
      {
        delayMs: 0,
        username: 'nanashi',
        text: (subject) => `待って。${subject}、右上が先に変わった`,
        type: 'hint',
        truth: 'signal',
      },
      {
        delayMs: 720,
        username: 'anti_ghost',
        text: () => '圧縮ノイズだろ。止まる必要ない',
        type: 'normal',
        truth: 'noise',
      },
      {
        delayMs: 1_480,
        username: 'uro_27',
        text: () => 'いや、ノイズならライトと一緒に動くはず',
        type: 'hint',
        truth: 'signal',
      },
    ],
  },
  ACTIVE: {
    ambientSuppressionMs: 2_100,
    cues: [
      {
        delayMs: 0,
        username: 'kage_99',
        text: (subject) => `映像が一瞬乱れた。${subject}の近く、足を止めて確認して`,
        type: 'spooky',
        truth: 'signal',
      },
      {
        delayMs: 420,
        username: 'mod_taku',
        text: () => '走るな。MainとPIPを止めて比較して',
        type: 'hint',
        truth: 'signal',
      },
      {
        delayMs: 980,
        username: 'goma_shio',
        text: () => '左じゃない？　棚の手前に見える',
        type: 'normal',
        truth: 'noise',
      },
    ],
  },
  RECORDED: {
    ambientSuppressionMs: 1_500,
    cues: [
      {
        delayMs: 0,
        username: 'SYSTEM_ARCHIVE',
        text: (subject) => `${subject}をアーカイブしました`,
        type: 'system',
        truth: 'signal',
      },
      {
        delayMs: 620,
        username: 'uro_27',
        text: () => '撮れた。でも右上では、さっきより近い',
        type: 'spooky',
        truth: 'signal',
      },
    ],
  },
  IGNORED: {
    ambientSuppressionMs: 1_800,
    cues: [
      {
        delayMs: 0,
        username: 'anti_ghost',
        text: () => '何もなかった。進め進め',
        type: 'normal',
        truth: 'noise',
      },
      {
        delayMs: 760,
        username: 'nanashi',
        text: (subject) => `${subject}、通り過ぎたのに右上へ残ってる`,
        type: 'spooky',
        truth: 'signal',
      },
    ],
  },
  MISSED: {
    ambientSuppressionMs: 2_200,
    cues: [
      {
        delayMs: 0,
        username: 'mod_taku',
        text: (subject) => `${subject}の撮影タイミングを逃した`,
        type: 'hint',
        truth: 'signal',
      },
      {
        delayMs: 560,
        username: 'uro_27',
        text: () => 'フレームは戻った。でも距離だけ戻ってない',
        type: 'spooky',
        truth: 'signal',
      },
      {
        delayMs: 1_120,
        username: 'SYSTEM_2347',
        text: () => '記録済み　記録済み　記録済み',
        type: 'glitch',
        truth: 'corrupted',
      },
    ],
  },
};

const assertEventId = (eventId: string) => {
  if (eventId.trim().length === 0) {
    throw new TypeError('broadcast eventId must not be empty');
  }
};

const freezeBurst = (
  eventId: string,
  kind: BroadcastBurstKind,
  phase: BroadcastChatBurst['phase'],
  ambientSuppressionMs: number,
  templates: readonly CueTemplate[],
  subject: string,
): BroadcastChatBurst => {
  assertEventId(eventId);
  const cues = templates.map((template, index) =>
    Object.freeze<BroadcastChatCue>({
      eventId,
      cueId: `${eventId}:${phase.toLowerCase()}:${index + 1}`,
      delayMs: template.delayMs,
      username: template.username,
      text: template.text(subject),
      type: template.type,
      truth: template.truth,
    }),
  );
  return Object.freeze({
    eventId,
    kind,
    phase,
    ambientSuppressionMs,
    cues: Object.freeze(cues),
  });
};

/**
 * Returns an authored, deterministic Chat burst for one anomaly transition.
 * It performs no scheduling and reads no clock, random source, or external state.
 */
export function createAnomalyChatBurst({
  eventId,
  phase,
  subject = '画面端の異変',
}: AnomalyChatBurstInput): BroadcastChatBurst {
  const template = ANOMALY_BURSTS[phase];
  return freezeBurst(
    eventId,
    'ANOMALY',
    phase,
    template.ambientSuppressionMs,
    template.cues,
    subject,
  );
}

const riskTemplates = (
  tier: RiskTier,
  playerHandle: string,
): BurstTemplate => {
  switch (tier) {
    case 0:
      return {
        ambientSuppressionMs: 900,
        cues: [
          {
            delayMs: 0,
            username: 'SYSTEM_LIVE',
            text: () => '同時視聴 237。映像同期を開始します',
            type: 'system',
            truth: 'signal',
          },
        ],
      };
    case 1:
      return {
        ambientSuppressionMs: 1_600,
        cues: [
          {
            delayMs: 0,
            username: 'nanashi',
            text: () => '同接が増えた瞬間、右上の奥に影が出た',
            type: 'hint',
            truth: 'signal',
          },
          {
            delayMs: 680,
            username: 'anti_ghost',
            text: () => '人が増えて画質落ちただけ',
            type: 'normal',
            truth: 'noise',
          },
        ],
      };
    case 2:
      return {
        ambientSuppressionMs: 2_000,
        cues: [
          {
            delayMs: 0,
            username: 'uro_27',
            text: () => '同じ影が三歩近い',
            type: 'spooky',
            truth: 'signal',
          },
          {
            delayMs: 480,
            username: 'uro_27',
            text: () => '同じ影が三歩近い',
            type: 'spooky',
            truth: 'signal',
          },
          {
            delayMs: 960,
            username: 'room_2347',
            text: () => `${playerHandle}は映像の内側にいます`,
            type: 'glitch',
            truth: 'corrupted',
          },
        ],
      };
    case 3: {
      const repeated = `${playerHandle}を退出させました。視聴者は中にいます`;
      return {
        ambientSuppressionMs: 3_200,
        cues: [0, 420, 840, 1_260].map((delayMs) => ({
          delayMs,
          username: 'SYSTEM_237000',
          text: () => repeated,
          type: 'glitch' as const,
          truth: 'corrupted' as const,
        })),
      };
    }
  }
};

/** Creates the deterministic takeover burst associated with a viewer-risk band. */
export function createRiskTierHijack({
  eventId,
  tier,
  playerHandle = 'PLAYER_HANDLE',
}: RiskTierHijackInput): BroadcastChatBurst {
  const template = riskTemplates(tier, playerHandle);
  return freezeBurst(
    eventId,
    'RISK_HIJACK',
    'RISK_HIJACK',
    template.ambientSuppressionMs,
    template.cues,
    playerHandle,
  );
}

const pipAlertTemplates = (riskLocked: boolean): BurstTemplate =>
  riskLocked
    ? {
        ambientSuppressionMs: 1_900,
        cues: [
          {
            delayMs: 0,
            username: 'cam_watch',
            text: (subject) => `右上の枠だけ反応した。${subject}はまだ像になってない`,
            type: 'hint',
            truth: 'signal',
          },
          {
            delayMs: 620,
            username: 'nanashi',
            text: () => '見えないなら、今は近づかない方がいい',
            type: 'spooky',
            truth: 'signal',
          },
        ],
      }
    : {
        ambientSuppressionMs: 1_800,
        cues: [
          {
            delayMs: 0,
            username: 'kage_99',
            text: (subject) => `右上。${subject}が枠に入った`,
            type: 'hint',
            truth: 'signal',
          },
          {
            delayMs: 420,
            username: 'mod_taku',
            text: () => 'その向きで止まって。Mainにはいない',
            type: 'spooky',
            truth: 'signal',
          },
          {
            delayMs: 920,
            username: 'anti_ghost',
            text: () => '枠が誤認しただけだろ',
            type: 'normal',
            truth: 'noise',
          },
        ],
      };

/**
 * Creates at most one PIP alert per target. Normal alerts require a genuinely
 * framed target. The sole exception is a nearby, explicitly camera-only target
 * hidden behind `RISK_LOCKED`, whose framing signal is not otherwise observable.
 * The input ledger is never mutated.
 */
export function createPipAlertBurst({
  eventId,
  target,
  alertedTargetIds,
  isCameraOnlyTarget,
  subject = '人影',
}: PipAlertBurstInput): PipAlertBurstResult {
  assertEventId(eventId);
  if (!target?.targetId) {
    return { status: 'NO_TARGET', burst: null, alertedTargetIds };
  }

  const isRiskLocked = target.reason === 'RISK_LOCKED';
  const meaningfulRiskLock = Boolean(
    isRiskLocked &&
      isCameraOnlyTarget &&
      target.distance !== null &&
      target.distance < CAPTURE_MAX_DISTANCE,
  );
  const genuinelyFramed = Boolean(
    target.isFramed &&
      target.reason !== 'RESOLVED' &&
      target.reason !== 'NO_TARGET',
  );

  if (!genuinelyFramed && !meaningfulRiskLock) {
    return {
      status: isRiskLocked ? 'UNMEANINGFUL_RISK_LOCK' : 'NOT_FRAMED',
      burst: null,
      alertedTargetIds,
    };
  }

  if (alertedTargetIds.has(target.targetId)) {
    return { status: 'DUPLICATE', burst: null, alertedTargetIds };
  }

  const template = pipAlertTemplates(meaningfulRiskLock);
  const nextLedger = new Set(alertedTargetIds);
  nextLedger.add(target.targetId);
  return {
    status: 'EMITTED',
    burst: freezeBurst(
      eventId,
      'PIP_ALERT',
      'PIP_ALERT',
      template.ambientSuppressionMs,
      template.cues,
      subject,
    ),
    alertedTargetIds: nextLedger,
  };
}
