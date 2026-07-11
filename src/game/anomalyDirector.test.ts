import assert from 'node:assert/strict';
import test from 'node:test';
import type { AnomalyResolution } from '../types.ts';
import {
  advanceAnomalyDirector,
  anomalyDirectorReducer,
  createAnomalyDirectorState,
  getAnomalyRuntimeDefinition,
  isAnomalyCaptureActive,
  isAnomalyResolved,
  isAnomalyThreatening,
} from './anomalyDirector.ts';

const reachActive = () => {
  let state = createAnomalyDirectorState('pip-figure');
  state = anomalyDirectorReducer(state, { type: 'TRIGGER', atMs: 100 });
  state = anomalyDirectorReducer(state, { type: 'ACTIVATE', atMs: 500 });
  return state;
};

const RESOLUTIONS: readonly AnomalyResolution[] = [
  'RECORDED',
  'IGNORED',
  'MISSED',
];

for (const resolution of RESOLUTIONS) {
  test(`anomaly follows the complete ${resolution.toLowerCase()} path`, () => {
    let state = reachActive();
    assert.equal(state.phase, 'ACTIVE');

    state = anomalyDirectorReducer(state, {
      type: 'RESOLVE',
      resolution,
      atMs: 800,
    });
    assert.equal(state.phase, resolution);
    assert.equal(state.resolution, resolution);

    state = anomalyDirectorReducer(state, {
      type: 'BEGIN_AFTERMATH',
      atMs: 900,
    });
    assert.equal(state.phase, 'AFTERMATH');

    state = anomalyDirectorReducer(state, { type: 'COMPLETE', atMs: 1_200 });
    assert.equal(state.phase, 'COMPLETE');
    assert.equal(state.transitionCount, 5);
  });
}

test('active window expiry resolves the anomaly as missed', () => {
  const active = reachActive();
  const missed = anomalyDirectorReducer(active, {
    type: 'ACTIVE_WINDOW_EXPIRED',
    atMs: 1_500,
  });
  assert.equal(missed.phase, 'MISSED');
  assert.equal(missed.resolution, 'MISSED');
});

test('invalid, duplicate, and stale transitions are ignored', () => {
  const dormant = createAnomalyDirectorState('pip-figure', 100);
  assert.strictEqual(
    anomalyDirectorReducer(dormant, { type: 'ACTIVATE', atMs: 200 }),
    dormant,
  );
  assert.strictEqual(
    anomalyDirectorReducer(dormant, { type: 'TRIGGER', atMs: 99 }),
    dormant,
  );

  const active = reachActive();
  const recorded = anomalyDirectorReducer(active, {
    type: 'RESOLVE',
    resolution: 'RECORDED',
    atMs: 800,
  });
  assert.strictEqual(
    anomalyDirectorReducer(recorded, {
      type: 'ACTIVE_WINDOW_EXPIRED',
      atMs: 801,
    }),
    recorded,
    'capture wins and a later timeout cannot overwrite it',
  );
});

test('completed anomalies can reset for an allowed retry or cooldown cycle', () => {
  let state = reachActive();
  state = anomalyDirectorReducer(state, {
    type: 'RESOLVE',
    resolution: 'IGNORED',
    atMs: 800,
  });
  state = anomalyDirectorReducer(state, { type: 'BEGIN_AFTERMATH', atMs: 900 });
  state = anomalyDirectorReducer(state, { type: 'COMPLETE', atMs: 1_000 });
  state = anomalyDirectorReducer(state, { type: 'RESET', atMs: 2_000 });

  assert.equal(state.phase, 'DORMANT');
  assert.equal(state.resolution, null);
  assert.equal(state.cycle, 1);
});

test('runtime observation drives telegraph, active, recorded, aftermath, complete', () => {
  const definition = getAnomalyRuntimeDefinition('ANOMALY_2', 'fallback');
  let state = createAnomalyDirectorState('ANOMALY_2');
  const observe = (
    nowMs: number,
    overrides: Partial<{
      sceneId: string;
      distance: number;
      distancePast: number;
      captured: boolean;
    }> = {},
  ) => {
    state = advanceAnomalyDirector(state, definition, {
      nowMs,
      sceneId: definition.sceneId,
      distance: 400,
      distancePast: -400,
      captured: false,
      ...overrides,
    });
  };

  observe(0);
  assert.equal(state.phase, 'TELEGRAPH');
  observe(definition.telegraphDurationMs - 1);
  assert.equal(state.phase, 'TELEGRAPH');
  observe(definition.telegraphDurationMs);
  assert.equal(state.phase, 'ACTIVE');
  observe(definition.telegraphDurationMs + 1, { captured: true });
  assert.equal(state.phase, 'RECORDED');
  assert.equal(state.resolution, 'RECORDED');
  observe(state.phaseStartedAtMs + definition.resolutionHoldMs);
  assert.equal(state.phase, 'AFTERMATH');
  observe(state.phaseStartedAtMs + definition.aftermathDurationMs);
  assert.equal(state.phase, 'COMPLETE');
});

test('runtime differentiates deliberate ignore from an expired capture window', () => {
  const definition = getAnomalyRuntimeDefinition('ANOMALY_4', 'fallback');
  const activeAt = definition.telegraphDurationMs;

  let ignored = createAnomalyDirectorState('ANOMALY_4');
  ignored = advanceAnomalyDirector(ignored, definition, {
    nowMs: 0,
    sceneId: definition.sceneId,
    distance: 400,
    distancePast: -400,
    captured: false,
  });
  ignored = advanceAnomalyDirector(ignored, definition, {
    nowMs: activeAt,
    sceneId: definition.sceneId,
    distance: 100,
    distancePast: -100,
    captured: false,
  });
  ignored = advanceAnomalyDirector(ignored, definition, {
    nowMs: activeAt + 10,
    sceneId: definition.sceneId,
    distance: definition.ignorePastDistance,
    distancePast: definition.ignorePastDistance,
    captured: false,
  });
  assert.equal(ignored.phase, 'IGNORED');

  let missed = createAnomalyDirectorState('ANOMALY_4');
  missed = advanceAnomalyDirector(missed, definition, {
    nowMs: 0,
    sceneId: definition.sceneId,
    distance: 400,
    distancePast: -400,
    captured: false,
  });
  missed = advanceAnomalyDirector(missed, definition, {
    nowMs: activeAt,
    sceneId: definition.sceneId,
    distance: 100,
    distancePast: -100,
    captured: false,
  });
  missed = advanceAnomalyDirector(missed, definition, {
    nowMs: activeAt + definition.activeWindowMs,
    sceneId: definition.sceneId,
    distance: 100,
    distancePast: -100,
    captured: false,
  });
  assert.equal(missed.phase, 'MISSED');
});

test('resolved anomalies no longer contribute to threat decisions', () => {
  const anomaly = {
    id: 'ANOMALY_1',
    x: 600,
    width: 40,
    type: 'orb' as const,
    description: 'test',
    points: 1,
    captured: false,
    visibleOnlyInPip: false,
    directorState: {
      ...createAnomalyDirectorState('ANOMALY_1'),
      phase: 'IGNORED' as const,
      resolution: 'IGNORED' as const,
    },
    resolution: 'IGNORED' as const,
  };

  assert.equal(isAnomalyResolved(anomaly), true);
  assert.equal(isAnomalyThreatening(anomaly), false);
  assert.equal(isAnomalyCaptureActive(anomaly), false);
});
