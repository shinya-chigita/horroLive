import type {
  Anomaly,
  AnomalyDirectorPhase,
  BoardId,
  RiskTier,
} from '../types';

export type AnomalyPresentationChannel = 'main' | 'pip';

/**
 * FULL_BODY remains part of the vocabulary as an explicit guardrail: the
 * renderer may support it for non-horror subjects, but this module never
 * assigns it to an authored anomaly.
 */
export type AnomalyFragmentKind =
  | 'TRACE'
  | 'WRITING_FRAGMENT'
  | 'HEAD_AND_HAND'
  | 'HAIR_AND_SHOULDER'
  | 'FRAME_EDGE_SHADOW'
  | 'FULL_BODY';

export interface AnomalyVisualProfile {
  visible: boolean;
  alpha: number;
  fragmentKind: AnomalyFragmentKind;
  /** Positive logical pixels for the renderer to apply toward the camera. */
  approachOffsetPx: number;
}

export interface ActivePipCameraEffectInput {
  boardId: BoardId;
  anomaly: Anomaly;
  previousPhase: AnomalyDirectorPhase;
  reducedEffects: boolean;
}

export interface ActivePipCameraEffectDescriptor {
  key: string;
  boardId: BoardId;
  anomalyId: string;
  cycle: number;
  phase: 'ACTIVE';
  effect: 'FREEZE';
  durationMs: number;
  oneShot: true;
}

const PIP_ONLY_ALPHA_BY_RISK: Readonly<Record<RiskTier, number>> = {
  0: 0,
  1: 0.26,
  2: 0.34,
  3: 0.42,
};

const SHARED_PIP_ALPHA_BY_RISK: Readonly<Record<RiskTier, number>> = {
  0: 0.22,
  1: 0.27,
  2: 0.32,
  3: 0.38,
};

const MAIN_ALPHA_BY_RISK: Readonly<Record<RiskTier, number>> = {
  0: 0.08,
  1: 0.1,
  2: 0.12,
  3: 0.14,
};

const ACTIVE_PIP_APPROACH_BY_RISK: Readonly<Record<RiskTier, number>> = {
  0: 0,
  1: 30,
  2: 38,
  3: 44,
};

const FRAGMENT_BY_TYPE: Readonly<
  Record<Anomaly['type'], Exclude<AnomalyFragmentKind, 'FULL_BODY'>>
> = {
  orb: 'TRACE',
  writing: 'WRITING_FRAGMENT',
  doll: 'HEAD_AND_HAND',
  ghost: 'HAIR_AND_SHOULDER',
  shadow: 'FRAME_EDGE_SHADOW',
};

const HIDDEN_PHASES: ReadonlySet<AnomalyDirectorPhase> = new Set([
  'DORMANT',
  'RECORDED',
  'IGNORED',
  'MISSED',
  'AFTERMATH',
  'COMPLETE',
]);

/**
 * Resolves a restrained, channel-aware presentation for an anomaly.
 * TELEGRAPH deliberately remains visual silence so Chat can lead the reveal.
 */
export function getAnomalyVisualProfile(
  anomaly: Anomaly,
  channel: AnomalyPresentationChannel,
  riskTier: RiskTier,
): AnomalyVisualProfile {
  const fragmentKind = FRAGMENT_BY_TYPE[anomaly.type];
  const phase = anomaly.directorState?.phase ?? 'DORMANT';
  const resolved = Boolean(anomaly.captured || anomaly.resolution);

  const hidden = (): AnomalyVisualProfile => ({
    visible: false,
    alpha: 0,
    fragmentKind,
    approachOffsetPx: 0,
  });

  if (resolved || HIDDEN_PHASES.has(phase) || phase === 'TELEGRAPH') {
    return hidden();
  }

  if (phase !== 'ACTIVE') return hidden();

  if (anomaly.visibleOnlyInPip) {
    if (channel === 'main' || riskTier < 1) return hidden();
    return {
      visible: true,
      alpha: PIP_ONLY_ALPHA_BY_RISK[riskTier],
      fragmentKind,
      approachOffsetPx: ACTIVE_PIP_APPROACH_BY_RISK[riskTier],
    };
  }

  return {
    visible: true,
    alpha:
      channel === 'pip'
        ? SHARED_PIP_ALPHA_BY_RISK[riskTier]
        : MAIN_ALPHA_BY_RISK[riskTier],
    fragmentKind,
    approachOffsetPx: 0,
  };
}

/**
 * Describes the single authored freeze that accompanies a camera-only reveal.
 * The stable key is the one-shot identity; callers keep it in their fired-cue
 * ledger. Returning a zero-duration descriptor in reduced-effects mode still
 * consumes that identity without removing the narrative cue.
 */
export function getActivePipCameraEffect({
  boardId,
  anomaly,
  previousPhase,
  reducedEffects,
}: ActivePipCameraEffectInput): ActivePipCameraEffectDescriptor | null {
  const state = anomaly.directorState;
  if (
    !anomaly.visibleOnlyInPip ||
    !state ||
    previousPhase !== 'TELEGRAPH' ||
    state.phase !== 'ACTIVE'
  ) {
    return null;
  }

  const phase = 'ACTIVE' as const;
  return {
    key: `${boardId}:${anomaly.id}:${state.cycle}:${phase}`,
    boardId,
    anomalyId: anomaly.id,
    cycle: state.cycle,
    phase,
    effect: 'FREEZE',
    durationMs: reducedEffects ? 0 : 420,
    oneShot: true,
  };
}
