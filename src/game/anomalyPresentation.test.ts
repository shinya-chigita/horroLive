import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  Anomaly,
  AnomalyDirectorPhase,
  RiskTier,
} from '../types.ts';
import { createAnomalyDirectorState } from './anomalyDirector.ts';
import {
  getActivePipCameraEffect,
  getAnomalyVisualProfile,
  type AnomalyPresentationChannel,
} from './anomalyPresentation.ts';

const makeAnomaly = (
  overrides: Partial<Anomaly> = {},
  phase: AnomalyDirectorPhase = 'ACTIVE',
): Anomaly => ({
  id: 'hospital.anomaly.door-figure',
  x: 1_500,
  width: 58,
  type: 'ghost',
  description: '扉の陰に髪と肩だけを残す遠景人物',
  points: 25_000,
  captured: false,
  visibleOnlyInPip: true,
  directorState: {
    ...createAnomalyDirectorState('hospital.anomaly.door-figure'),
    phase,
  },
  resolution: null,
  ...overrides,
});

test('a PIP-only anomaly never renders in Main and lets Chat lead TELEGRAPH', () => {
  const active = makeAnomaly();
  const telegraph = makeAnomaly({}, 'TELEGRAPH');

  for (const tier of [0, 1, 2, 3] as const) {
    assert.deepEqual(getAnomalyVisualProfile(active, 'main', tier), {
      visible: false,
      alpha: 0,
      fragmentKind: 'HAIR_AND_SHOULDER',
      approachOffsetPx: 0,
    });
    assert.equal(
      getAnomalyVisualProfile(telegraph, 'pip', tier).visible,
      false,
    );
  }
});

test('camera-only visibility begins at tier one and stays inside PIP alpha bounds', () => {
  const anomaly = makeAnomaly();
  const locked = getAnomalyVisualProfile(anomaly, 'pip', 0);
  assert.equal(locked.visible, false);
  assert.equal(locked.alpha, 0);

  const profiles = ([1, 2, 3] as const).map((tier) =>
    getAnomalyVisualProfile(anomaly, 'pip', tier),
  );
  for (const profile of profiles) {
    assert.equal(profile.visible, true);
    assert.ok(profile.alpha >= 0.22);
    assert.ok(profile.alpha <= 0.45);
  }
  assert.deepEqual(
    profiles.map((profile) => profile.approachOffsetPx),
    [30, 38, 44],
  );
});

test('ghost and shadow profiles never request a full-body reveal', () => {
  const channels: readonly AnomalyPresentationChannel[] = ['main', 'pip'];
  const tiers: readonly RiskTier[] = [0, 1, 2, 3];

  for (const type of ['ghost', 'shadow'] as const) {
    const anomaly = makeAnomaly({ type });
    for (const channel of channels) {
      for (const tier of tiers) {
        assert.notEqual(
          getAnomalyVisualProfile(anomaly, channel, tier).fragmentKind,
          'FULL_BODY',
        );
      }
    }
  }
});

test('resolved and dormant anomalies are visually silent', () => {
  assert.equal(
    getAnomalyVisualProfile(makeAnomaly({}, 'DORMANT'), 'pip', 3).visible,
    false,
  );
  assert.equal(
    getAnomalyVisualProfile(makeAnomaly({ captured: true }), 'pip', 3).visible,
    false,
  );
  assert.equal(
    getAnomalyVisualProfile(
      makeAnomaly({ resolution: 'IGNORED' }, 'AFTERMATH'),
      'pip',
      3,
    ).visible,
    false,
  );
});

test('ACTIVE entry yields a deterministic board-scoped one-shot freeze', () => {
  const anomaly = makeAnomaly({
    directorState: {
      ...createAnomalyDirectorState('hospital.anomaly.door-figure'),
      phase: 'ACTIVE',
      cycle: 2,
    },
  });
  const input = {
    boardId: 'hospital' as const,
    anomaly,
    previousPhase: 'TELEGRAPH' as const,
    reducedEffects: false,
  };

  const first = getActivePipCameraEffect(input);
  const second = getActivePipCameraEffect(input);
  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    key: 'hospital:hospital.anomaly.door-figure:2:ACTIVE',
    boardId: 'hospital',
    anomalyId: 'hospital.anomaly.door-figure',
    cycle: 2,
    phase: 'ACTIVE',
    effect: 'FREEZE',
    durationMs: 420,
    oneShot: true,
  });
});

test('reduced effects consume the same cue identity without freezing', () => {
  const anomaly = makeAnomaly();
  const standard = getActivePipCameraEffect({
    boardId: 'hospital',
    anomaly,
    previousPhase: 'TELEGRAPH',
    reducedEffects: false,
  });
  const reduced = getActivePipCameraEffect({
    boardId: 'hospital',
    anomaly,
    previousPhase: 'TELEGRAPH',
    reducedEffects: true,
  });

  assert.equal(standard?.key, reduced?.key);
  assert.equal(standard?.durationMs, 420);
  assert.equal(reduced?.durationMs, 0);
});

test('camera effect is absent without a camera-only TELEGRAPH to ACTIVE transition', () => {
  const active = makeAnomaly();
  const shared = makeAnomaly({ visibleOnlyInPip: false });
  const telegraph = makeAnomaly({}, 'TELEGRAPH');

  assert.equal(
    getActivePipCameraEffect({
      boardId: 'hospital',
      anomaly: active,
      previousPhase: 'ACTIVE',
      reducedEffects: false,
    }),
    null,
  );
  assert.equal(
    getActivePipCameraEffect({
      boardId: 'hospital',
      anomaly: shared,
      previousPhase: 'TELEGRAPH',
      reducedEffects: false,
    }),
    null,
  );
  assert.equal(
    getActivePipCameraEffect({
      boardId: 'hospital',
      anomaly: telegraph,
      previousPhase: 'DORMANT',
      reducedEffects: false,
    }),
    null,
  );
});
