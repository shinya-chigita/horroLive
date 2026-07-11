import type {
  Anomaly,
  AnomalyDirectorPhase,
  AnomalyDirectorState,
  AnomalyResolution,
} from '../types';

export type AnomalyDirectorAction =
  | { type: 'TRIGGER'; atMs: number }
  | { type: 'ACTIVATE'; atMs: number }
  | { type: 'RESOLVE'; resolution: AnomalyResolution; atMs: number }
  | { type: 'ACTIVE_WINDOW_EXPIRED'; atMs: number }
  | { type: 'BEGIN_AFTERMATH'; atMs: number }
  | { type: 'COMPLETE'; atMs: number }
  | { type: 'RESET'; atMs: number };

export interface AnomalyRuntimeDefinition {
  anomalyId: string;
  sceneId: string;
  priority: number;
  telegraphDistance: number;
  telegraphDurationMs: number;
  activeWindowMs: number;
  ignorePastDistance: number;
  leaveDistance: number;
  resolutionHoldMs: number;
  aftermathDurationMs: number;
}

export interface AnomalyRuntimeObservation {
  nowMs: number;
  sceneId: string;
  distance: number;
  /** Positive once the player has deliberately moved beyond the anomaly. */
  distancePast: number;
  captured: boolean;
}

const DEFAULT_RUNTIME_TIMING = {
  telegraphDistance: 520,
  telegraphDurationMs: 1_650,
  activeWindowMs: 9_000,
  ignorePastDistance: 140,
  leaveDistance: 680,
  resolutionHoldMs: 260,
  aftermathDurationMs: 760,
} as const;

const AUTHORED_RUNTIME_DEFINITIONS: Readonly<
  Record<string, Pick<AnomalyRuntimeDefinition, 'sceneId' | 'priority'> & Partial<AnomalyRuntimeDefinition>>
> = {
  // Legacy identifiers remain readable for old saved/test fixtures.
  ANOMALY_1: { sceneId: 'hospital-entry', priority: 10 },
  ANOMALY_2: { sceneId: 'hospital-ward-a', priority: 20 },
  ANOMALY_3: { sceneId: 'hospital-ward-a', priority: 10 },
  ANOMALY_4: { sceneId: 'hospital-clinical-wing', priority: 10 },
  ANOMALY_5: { sceneId: 'hospital-signal-basement', priority: 10 },
  ANOMALY_6: {
    sceneId: 'hospital-altar',
    priority: 10,
    telegraphDistance: 430,
    activeWindowMs: 11_000,
  },
  'hospital.anomaly.footsteps': { sceneId: 'hospital-entry', priority: 12 },
  'hospital.anomaly.door-figure': {
    sceneId: 'hospital-ward-a',
    priority: 24,
    telegraphDurationMs: 1_850,
  },
  'hospital.anomaly.2347': { sceneId: 'hospital-ward-a', priority: 10 },
  'hospital.anomaly.wheelchair': {
    sceneId: 'hospital-clinical-wing',
    priority: 12,
  },
  'hospital.anomaly.ceiling': {
    sceneId: 'hospital-signal-basement',
    priority: 22,
    telegraphDurationMs: 1_900,
  },
  'hospital.anomaly.altar-shadow': {
    sceneId: 'hospital-altar',
    priority: 20,
    telegraphDistance: 430,
    telegraphDurationMs: 2_050,
    activeWindowMs: 11_000,
  },
  'school.anomaly.shoe-locker': {
    sceneId: 'school-entrance',
    priority: 12,
  },
  'school.anomaly.window-student': {
    sceneId: 'school-classrooms',
    priority: 24,
    telegraphDurationMs: 1_850,
  },
  'school.anomaly.blackboard': {
    sceneId: 'school-classrooms',
    priority: 10,
  },
  'school.anomaly.microphone': {
    sceneId: 'school-broadcast-room',
    priority: 22,
    telegraphDurationMs: 1_900,
  },
  'school.anomaly.landing': {
    sceneId: 'school-stairwell',
    priority: 25,
    telegraphDistance: 560,
    telegraphDurationMs: 2_100,
    activeWindowMs: 10_500,
  },
};

const RESOLUTION_PHASES: ReadonlySet<AnomalyDirectorPhase> = new Set([
  'RECORDED',
  'IGNORED',
  'MISSED',
]);

export function createAnomalyDirectorState(
  anomalyId: string,
  atMs = 0,
): AnomalyDirectorState {
  return {
    anomalyId,
    phase: 'DORMANT',
    resolution: null,
    phaseStartedAtMs: atMs,
    transitionCount: 0,
    cycle: 0,
  };
}

const transition = (
  state: AnomalyDirectorState,
  phase: AnomalyDirectorPhase,
  atMs: number,
  resolution = state.resolution,
): AnomalyDirectorState => ({
  ...state,
  phase,
  resolution,
  phaseStartedAtMs: atMs,
  transitionCount: state.transitionCount + 1,
});

/**
 * Pure, strict state-machine reducer. Out-of-order and stale actions are
 * intentionally ignored so capture/timeout races can resolve only once.
 */
export function anomalyDirectorReducer(
  state: AnomalyDirectorState,
  action: AnomalyDirectorAction,
): AnomalyDirectorState {
  if (!Number.isFinite(action.atMs) || action.atMs < state.phaseStartedAtMs) {
    return state;
  }

  switch (action.type) {
    case 'TRIGGER':
      return state.phase === 'DORMANT'
        ? transition(state, 'TELEGRAPH', action.atMs, null)
        : state;
    case 'ACTIVATE':
      return state.phase === 'TELEGRAPH'
        ? transition(state, 'ACTIVE', action.atMs, null)
        : state;
    case 'RESOLVE':
      return state.phase === 'ACTIVE'
        ? transition(state, action.resolution, action.atMs, action.resolution)
        : state;
    case 'ACTIVE_WINDOW_EXPIRED':
      return state.phase === 'ACTIVE'
        ? transition(state, 'MISSED', action.atMs, 'MISSED')
        : state;
    case 'BEGIN_AFTERMATH':
      return RESOLUTION_PHASES.has(state.phase)
        ? transition(state, 'AFTERMATH', action.atMs)
        : state;
    case 'COMPLETE':
      return state.phase === 'AFTERMATH'
        ? transition(state, 'COMPLETE', action.atMs)
        : state;
    case 'RESET':
      return state.phase === 'COMPLETE'
        ? {
            ...transition(state, 'DORMANT', action.atMs, null),
            cycle: state.cycle + 1,
          }
        : state;
  }
}

export function getAnomalyRuntimeDefinition(
  anomalyId: string,
  fallbackSceneId: string,
): AnomalyRuntimeDefinition {
  const authored = AUTHORED_RUNTIME_DEFINITIONS[anomalyId];
  return {
    anomalyId,
    sceneId: authored?.sceneId ?? fallbackSceneId,
    priority: authored?.priority ?? 0,
    telegraphDistance:
      authored?.telegraphDistance ?? DEFAULT_RUNTIME_TIMING.telegraphDistance,
    telegraphDurationMs:
      authored?.telegraphDurationMs ?? DEFAULT_RUNTIME_TIMING.telegraphDurationMs,
    activeWindowMs:
      authored?.activeWindowMs ?? DEFAULT_RUNTIME_TIMING.activeWindowMs,
    ignorePastDistance:
      authored?.ignorePastDistance ?? DEFAULT_RUNTIME_TIMING.ignorePastDistance,
    leaveDistance: authored?.leaveDistance ?? DEFAULT_RUNTIME_TIMING.leaveDistance,
    resolutionHoldMs:
      authored?.resolutionHoldMs ?? DEFAULT_RUNTIME_TIMING.resolutionHoldMs,
    aftermathDurationMs:
      authored?.aftermathDurationMs ?? DEFAULT_RUNTIME_TIMING.aftermathDurationMs,
  };
}

const elapsedInPhase = (state: AnomalyDirectorState, nowMs: number) =>
  Math.max(0, nowMs - state.phaseStartedAtMs);

/**
 * Converts one simulation observation into at most one normal timed transition.
 * A successful capture is the exception: it is reconciled immediately through
 * the prerequisite phases so an external camera callback cannot strand state.
 */
export function advanceAnomalyDirector(
  state: AnomalyDirectorState,
  definition: AnomalyRuntimeDefinition,
  observation: AnomalyRuntimeObservation,
): AnomalyDirectorState {
  const { nowMs } = observation;

  if (observation.captured && state.resolution === null) {
    let recorded = state;
    if (recorded.phase === 'DORMANT') {
      recorded = anomalyDirectorReducer(recorded, { type: 'TRIGGER', atMs: nowMs });
    }
    if (recorded.phase === 'TELEGRAPH') {
      recorded = anomalyDirectorReducer(recorded, { type: 'ACTIVATE', atMs: nowMs });
    }
    if (recorded.phase === 'ACTIVE') {
      recorded = anomalyDirectorReducer(recorded, {
        type: 'RESOLVE',
        resolution: 'RECORDED',
        atMs: nowMs,
      });
    }
    return recorded;
  }

  switch (state.phase) {
    case 'DORMANT':
      return observation.sceneId === definition.sceneId &&
        observation.distance <= definition.telegraphDistance
        ? anomalyDirectorReducer(state, { type: 'TRIGGER', atMs: nowMs })
        : state;
    case 'TELEGRAPH':
      return elapsedInPhase(state, nowMs) >= definition.telegraphDurationMs
        ? anomalyDirectorReducer(state, { type: 'ACTIVATE', atMs: nowMs })
        : state;
    case 'ACTIVE':
      if (
        observation.distancePast >= definition.ignorePastDistance ||
        (observation.sceneId !== definition.sceneId &&
          observation.distance >= definition.leaveDistance)
      ) {
        return anomalyDirectorReducer(state, {
          type: 'RESOLVE',
          resolution: 'IGNORED',
          atMs: nowMs,
        });
      }
      return elapsedInPhase(state, nowMs) >= definition.activeWindowMs
        ? anomalyDirectorReducer(state, {
            type: 'ACTIVE_WINDOW_EXPIRED',
            atMs: nowMs,
          })
        : state;
    case 'RECORDED':
    case 'IGNORED':
    case 'MISSED':
      return elapsedInPhase(state, nowMs) >= definition.resolutionHoldMs
        ? anomalyDirectorReducer(state, { type: 'BEGIN_AFTERMATH', atMs: nowMs })
        : state;
    case 'AFTERMATH':
      return elapsedInPhase(state, nowMs) >= definition.aftermathDurationMs
        ? anomalyDirectorReducer(state, { type: 'COMPLETE', atMs: nowMs })
        : state;
    case 'COMPLETE':
      return state;
  }
}

export function isAnomalyResolved(anomaly: Anomaly): boolean {
  const phase = anomaly.directorState?.phase;
  return Boolean(
    anomaly.captured ||
      anomaly.resolution ||
      phase === 'RECORDED' ||
      phase === 'IGNORED' ||
      phase === 'MISSED' ||
      phase === 'AFTERMATH' ||
      phase === 'COMPLETE',
  );
}

export function isAnomalyThreatening(anomaly: Anomaly): boolean {
  if (isAnomalyResolved(anomaly)) return false;
  const phase = anomaly.directorState?.phase;
  return phase ? phase === 'TELEGRAPH' || phase === 'ACTIVE' : true;
}

export function isAnomalyRenderable(anomaly: Anomaly): boolean {
  if (isAnomalyResolved(anomaly)) return false;
  const phase = anomaly.directorState?.phase;
  return phase ? phase === 'TELEGRAPH' || phase === 'ACTIVE' : true;
}

export function isAnomalyCaptureActive(anomaly: Anomaly): boolean {
  if (isAnomalyResolved(anomaly)) return false;
  const phase = anomaly.directorState?.phase;
  return phase ? phase === 'ACTIVE' : true;
}
