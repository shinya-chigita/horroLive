import assert from 'node:assert/strict';
import test from 'node:test';
import type { CameraCaptureTarget } from './capture.ts';
import {
  createAnomalyChatBurst,
  createPipAlertBurst,
  createRiskTierHijack,
  type BroadcastAnomalyPhase,
  type BroadcastTruth,
} from './broadcastEventDirector.ts';

const phases: readonly BroadcastAnomalyPhase[] = [
  'TELEGRAPH',
  'ACTIVE',
  'RECORDED',
  'IGNORED',
  'MISSED',
];

const makeTarget = (
  overrides: Partial<CameraCaptureTarget> = {},
): CameraCaptureTarget => ({
  targetId: 'hospital.anomaly.door-figure',
  distance: 180,
  isFramed: true,
  canCapture: true,
  reason: 'READY',
  ...overrides,
});

test('every anomaly phase creates a deterministic, schedulable burst', () => {
  const acceptedTruth = new Set<BroadcastTruth>([
    'signal',
    'noise',
    'corrupted',
  ]);

  for (const phase of phases) {
    const input = {
      eventId: `encounter:${phase.toLowerCase()}`,
      phase,
      subject: '扉の陰の人影',
    } as const;
    const first = createAnomalyChatBurst(input);
    const second = createAnomalyChatBurst(input);

    assert.deepEqual(first, second);
    assert.equal(first.kind, 'ANOMALY');
    assert.equal(first.phase, phase);
    assert.ok(first.cues.length > 0);
    assert.ok(
      first.ambientSuppressionMs >=
        Math.max(...first.cues.map((cue) => cue.delayMs)),
    );

    let previousDelay = -1;
    for (const cue of first.cues) {
      assert.equal(cue.eventId, input.eventId);
      assert.match(cue.cueId, new RegExp(`^${input.eventId}:`));
      assert.ok(cue.delayMs >= previousDelay);
      assert.ok(cue.username.length > 0);
      assert.ok(cue.text.length > 0);
      assert.equal(acceptedTruth.has(cue.truth), true);
      previousDelay = cue.delayMs;
    }
  }
});

test('telegraph mixes a real signal with explicit noise instead of random hints', () => {
  const burst = createAnomalyChatBurst({
    eventId: 'event:pip-corner-observer',
    phase: 'TELEGRAPH',
    subject: 'ロッカー奥の輪郭',
  });

  assert.deepEqual(
    burst.cues.map((cue) => cue.truth),
    ['signal', 'noise', 'signal'],
  );
  assert.match(burst.cues[0].text, /ロッカー奥の輪郭/);
  assert.equal(burst.cues[0].delayMs, 0);
});

test('tier-three risk hijack is a deterministic same-message flood', () => {
  const burst = createRiskTierHijack({
    eventId: 'risk:237000',
    tier: 3,
    playerHandle: 'STREAMER_01',
  });

  assert.equal(burst.kind, 'RISK_HIJACK');
  assert.equal(burst.phase, 'RISK_HIJACK');
  assert.deepEqual(
    burst.cues.map((cue) => cue.delayMs),
    [0, 420, 840, 1_260],
  );
  assert.equal(new Set(burst.cues.map((cue) => cue.text)).size, 1);
  assert.equal(burst.cues.every((cue) => cue.truth === 'corrupted'), true);
  assert.equal(
    burst.cues.every((cue) => cue.username === 'SYSTEM_237000'),
    true,
  );
});

test('all risk tiers have deterministic authored cues and ambient suppression', () => {
  for (const tier of [0, 1, 2, 3] as const) {
    const first = createRiskTierHijack({ eventId: `risk:${tier}`, tier });
    const second = createRiskTierHijack({ eventId: `risk:${tier}`, tier });
    assert.deepEqual(first, second);
    assert.ok(first.ambientSuppressionMs > 0);
    assert.ok(first.cues.length > 0);
  }
});

test('PIP alert rejects missing and ordinary out-of-frame targets', () => {
  const ledger = new Set<string>();
  const missing = createPipAlertBurst({
    eventId: 'pip:missing',
    target: null,
    alertedTargetIds: ledger,
    isCameraOnlyTarget: false,
  });
  assert.equal(missing.status, 'NO_TARGET');
  assert.equal(missing.burst, null);
  assert.equal(missing.alertedTargetIds, ledger);

  const outOfFrame = createPipAlertBurst({
    eventId: 'pip:out-of-frame',
    target: makeTarget({ isFramed: false, canCapture: false, reason: 'OUT_OF_FRAME' }),
    alertedTargetIds: ledger,
    isCameraOnlyTarget: false,
  });
  assert.equal(outOfFrame.status, 'NOT_FRAMED');
  assert.equal(outOfFrame.burst, null);
  assert.equal(ledger.size, 0);
});

test('a framed target emits once and updates a copied per-target ledger', () => {
  const originalLedger = new Set<string>();
  const first = createPipAlertBurst({
    eventId: 'pip:door-figure',
    target: makeTarget(),
    alertedTargetIds: originalLedger,
    isCameraOnlyTarget: true,
    subject: '扉の陰の人影',
  });

  assert.equal(first.status, 'EMITTED');
  assert.equal(first.burst?.kind, 'PIP_ALERT');
  assert.match(first.burst?.cues[0].text ?? '', /扉の陰の人影/);
  assert.equal(originalLedger.size, 0, 'the input ledger must remain immutable');
  assert.notEqual(first.alertedTargetIds, originalLedger);
  assert.equal(first.alertedTargetIds.has('hospital.anomaly.door-figure'), true);

  const duplicate = createPipAlertBurst({
    eventId: 'pip:door-figure-again',
    target: makeTarget(),
    alertedTargetIds: first.alertedTargetIds,
    isCameraOnlyTarget: true,
  });
  assert.equal(duplicate.status, 'DUPLICATE');
  assert.equal(duplicate.burst, null);
  assert.equal(duplicate.alertedTargetIds, first.alertedTargetIds);
});

test('only a nearby explicitly camera-only RISK_LOCKED target gets the exception', () => {
  const ledger = new Set<string>();
  const lockedTarget = makeTarget({
    isFramed: false,
    canCapture: false,
    reason: 'RISK_LOCKED',
    distance: 220,
  });

  const ordinaryLock = createPipAlertBurst({
    eventId: 'pip:ordinary-lock',
    target: lockedTarget,
    alertedTargetIds: ledger,
    isCameraOnlyTarget: false,
  });
  assert.equal(ordinaryLock.status, 'UNMEANINGFUL_RISK_LOCK');
  assert.equal(ordinaryLock.burst, null);

  const cameraOnlyLock = createPipAlertBurst({
    eventId: 'pip:camera-only-lock',
    target: lockedTarget,
    alertedTargetIds: ledger,
    isCameraOnlyTarget: true,
  });
  assert.equal(cameraOnlyLock.status, 'EMITTED');
  assert.match(cameraOnlyLock.burst?.cues[0].text ?? '', /枠だけ反応/);

  const distantLock = createPipAlertBurst({
    eventId: 'pip:distant-lock',
    target: makeTarget({
      targetId: 'hospital.anomaly.ceiling',
      isFramed: false,
      canCapture: false,
      reason: 'RISK_LOCKED',
      distance: 900,
    }),
    alertedTargetIds: ledger,
    isCameraOnlyTarget: true,
  });
  assert.equal(distantLock.status, 'UNMEANINGFUL_RISK_LOCK');
  assert.equal(distantLock.burst, null);
});

test('resolved framed targets do not create stale PIP alerts', () => {
  const result = createPipAlertBurst({
    eventId: 'pip:resolved',
    target: makeTarget({ canCapture: false, reason: 'RESOLVED' }),
    alertedTargetIds: new Set<string>(),
    isCameraOnlyTarget: true,
  });

  assert.equal(result.status, 'NOT_FRAMED');
  assert.equal(result.burst, null);
});

test('empty event identifiers are rejected without consulting external state', () => {
  assert.throws(
    () =>
      createAnomalyChatBurst({
        eventId: '   ',
        phase: 'ACTIVE',
      }),
    /eventId/,
  );
});
