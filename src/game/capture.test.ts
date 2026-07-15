import assert from 'node:assert/strict';
import test from 'node:test';
import type { Anomaly, PlayerState, RiskTier } from '../types.ts';
import type { SceneSnapshot } from './sceneSnapshot.ts';
import {
  CAPTURE_MAX_DISTANCE,
  createPipCaptureFrame,
  evaluatePipCapture,
  normalizeCaptureTargetForBattery,
  PIP_LOGICAL_VIEW_HEIGHT,
  PIP_LOGICAL_VIEW_WIDTH,
} from './capture.ts';
import { createAnomalyDirectorState } from './anomalyDirector.ts';

const BASE_PLAYER: PlayerState = {
  x: 1_000,
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

const makeAnomaly = (overrides: Partial<Anomaly> = {}): Anomaly => ({
  id: 'pip-subject',
  x: 1_000,
  width: 50,
  type: 'ghost',
  description: 'camera subject',
  points: 10_000,
  captured: false,
  visibleOnlyInPip: false,
  ...overrides,
});

const makeSnapshot = (
  anomaly: Anomaly | null,
  playerOverrides: Partial<PlayerState> = {},
  mouseX = PIP_LOGICAL_VIEW_WIDTH * 0.82,
): SceneSnapshot => ({
  timestamp: 1_000,
  boardId: 'hospital',
  sceneId: 'hospital-entry',
  player: { ...BASE_PLAYER, ...playerOverrides },
  anomalies: anomaly ? [anomaly] : [],
  items: [],
  mouse: { x: mouseX, y: PIP_LOGICAL_VIEW_HEIGHT * 0.52 },
  isMoving: false,
});

const centeredWorldX = (
  playerX = BASE_PLAYER.x,
  lookingRight = true,
) => playerX + (lookingRight ? 120 : -120);

const evaluate = (
  anomaly: Anomaly,
  riskTier: RiskTier = 0,
  playerOverrides: Partial<PlayerState> = {},
) => evaluatePipCapture(makeSnapshot(anomaly, playerOverrides), riskTier);

test('a centered, nearby, lit unresolved subject is capturable', () => {
  const anomaly = makeAnomaly({ x: centeredWorldX() });
  const decision = evaluate(anomaly);

  assert.equal(decision.targetId, anomaly.id);
  assert.ok(decision.distance !== null && decision.distance < CAPTURE_MAX_DISTANCE);
  assert.equal(decision.isFramed, true);
  assert.equal(decision.canCapture, true);
  assert.equal(decision.reason, 'READY');
});

test('the exported acquisition frame matches the visible PIP lock box', () => {
  const frame = createPipCaptureFrame();
  assert.equal(frame.centerX, 160);
  assert.equal(frame.centerY, 90);
  assert.equal(frame.width, 204.8);
  assert.equal(frame.height, 115.2);
});

test('director state opens capture only during the ACTIVE phase', () => {
  const baseState = createAnomalyDirectorState('pip-subject', 0);
  const x = centeredWorldX();
  const dormant = evaluate(
    makeAnomaly({ x, directorState: baseState }),
  );
  const telegraph = evaluate(
    makeAnomaly({
      x,
      directorState: { ...baseState, phase: 'TELEGRAPH' },
    }),
  );
  const active = evaluate(
    makeAnomaly({
      x,
      directorState: { ...baseState, phase: 'ACTIVE' },
    }),
  );

  assert.equal(dormant.reason, 'NO_TARGET');
  assert.equal(telegraph.reason, 'NO_TARGET');
  assert.equal(active.reason, 'READY');
});

test('a nearby subject behind the right-facing camera is out of frame', () => {
  const anomaly = makeAnomaly({ x: BASE_PLAYER.x - 300 });
  const decision = evaluate(anomaly);

  assert.equal(decision.distance, 300);
  assert.equal(decision.isFramed, false);
  assert.equal(decision.canCapture, false);
  assert.equal(decision.reason, 'OUT_OF_FRAME');
});

test('a fully covered PIP subject cannot lock or capture through furniture', () => {
  const baseState = createAnomalyDirectorState(
    'hospital.anomaly.footsteps',
    0,
  );
  const hiddenBehindBed = makeAnomaly({
    id: 'hospital.anomaly.footsteps',
    x: 600,
    type: 'orb',
    directorState: { ...baseState, phase: 'ACTIVE' },
  });
  const decision = evaluatePipCapture(
    makeSnapshot(hiddenBehindBed, { x: 300 }),
    0,
  );

  assert.equal(decision.reason, 'OCCLUDED');
  assert.equal(decision.isFramed, false);
  assert.equal(decision.canCapture, false);
});

test('the shared player facing selects the matching first-person corridor', () => {
  const rightSubject = makeAnomaly({ x: centeredWorldX() });
  const leftSubject = makeAnomaly({ x: centeredWorldX(BASE_PLAYER.x, false) });

  const rightFacing = evaluatePipCapture(makeSnapshot(rightSubject), 0);
  const wrongCrop = evaluatePipCapture(
    makeSnapshot(rightSubject, { facing: -1 }),
    0,
  );
  const leftFacing = evaluatePipCapture(
    makeSnapshot(leftSubject, { facing: -1 }),
    0,
  );

  assert.equal(rightFacing.reason, 'READY');
  assert.equal(wrongCrop.reason, 'OUT_OF_FRAME');
  assert.equal(leftFacing.reason, 'READY');
});

test('vertical flashlight pitch changes whether a ceiling subject is framed', () => {
  const ceiling = makeAnomaly({
    id: 'hospital.anomaly.ceiling',
    x: BASE_PLAYER.x + 150,
    yOffset: -58,
  });
  const level = evaluate(ceiling, 1, { flashlightAngle: 0 });
  const upward = evaluate(ceiling, 1, { flashlightAngle: -0.5 });

  assert.equal(level.isFramed, false);
  assert.equal(upward.isFramed, true);
});

test('the candidate closest to the visible crosshair is selected deterministically', () => {
  const offscreen = makeAnomaly({ id: 'offscreen', x: BASE_PLAYER.x - 250 });
  const centered = makeAnomaly({ id: 'centered', x: centeredWorldX() });
  const snapshot = {
    ...makeSnapshot(centered),
    anomalies: [offscreen, centered],
  };

  const decision = evaluatePipCapture(snapshot, 0);

  assert.equal(decision.targetId, 'centered');
  assert.equal(decision.reason, 'READY');
});

test('distance at the exact 350-unit boundary is out of range', () => {
  const anomaly = makeAnomaly({ x: BASE_PLAYER.x + CAPTURE_MAX_DISTANCE });
  const decision = evaluate(anomaly);

  assert.equal(decision.distance, CAPTURE_MAX_DISTANCE);
  assert.equal(decision.canCapture, false);
  assert.equal(decision.reason, 'OUT_OF_RANGE');
});

test('camera-only subjects remain risk locked at tier zero', () => {
  const anomaly = makeAnomaly({
    x: centeredWorldX(),
    visibleOnlyInPip: true,
  });

  const locked = evaluate(anomaly, 0);
  const unlocked = evaluate(anomaly, 1);

  assert.equal(locked.isFramed, true);
  assert.equal(locked.canCapture, false);
  assert.equal(locked.reason, 'RISK_LOCKED');
  assert.equal(unlocked.canCapture, true);
  assert.equal(unlocked.reason, 'READY');
});

test('resolved subjects cannot be captured again', () => {
  const captured = makeAnomaly({ x: centeredWorldX(), captured: true });
  const ignored = makeAnomaly({
    x: centeredWorldX(),
    captured: false,
    resolution: 'IGNORED',
  });
  const capturedDecision = evaluate(captured, 3);
  const ignoredDecision = evaluate(ignored, 3);

  assert.equal(capturedDecision.isFramed, true);
  assert.equal(capturedDecision.canCapture, false);
  assert.equal(capturedDecision.reason, 'RESOLVED');
  assert.equal(ignoredDecision.canCapture, false);
  assert.equal(ignoredDecision.reason, 'RESOLVED');
});

test('flashlight and battery state independently block capture', () => {
  const anomaly = makeAnomaly({ x: centeredWorldX() });

  const unlit = evaluate(anomaly, 0, { flashlightOn: false, battery: 80 });
  assert.equal(unlit.reason, 'FLASHLIGHT_OFF');
  assert.equal(unlit.canCapture, false);

  const empty = evaluate(anomaly, 0, { flashlightOn: true, battery: 0 });
  assert.equal(empty.reason, 'BATTERY_EMPTY');
  assert.equal(empty.canCapture, false);
});

test('current battery overrides a READY decision from the delayed PIP frame', () => {
  const delayedReady = evaluate(makeAnomaly({ x: centeredWorldX() }));
  assert.equal(delayedReady.reason, 'READY');

  const normalized = normalizeCaptureTargetForBattery(delayedReady, 0);
  assert.equal(normalized?.canCapture, false);
  assert.equal(normalized?.reason, 'BATTERY_EMPTY');
  assert.strictEqual(
    normalizeCaptureTargetForBattery(delayedReady, 1),
    delayedReady,
  );
});

test('a missing target returns a stable non-capturable decision', () => {
  const decision = evaluatePipCapture(makeSnapshot(null), 0);

  assert.deepEqual(decision, {
    targetId: null,
    distance: null,
    isFramed: false,
    canCapture: false,
    reason: 'NO_TARGET',
  });
});
