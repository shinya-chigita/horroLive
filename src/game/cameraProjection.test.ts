import assert from 'node:assert/strict';
import test from 'node:test';
import type { Anomaly, PlayerState } from '../types.ts';
import type { WorldPropDefinition } from './sceneDefinitions.ts';
import {
  createCameraPose,
  createCenteredCameraFrame,
  deriveAnomalyCameraAnchor,
  derivePropCameraAnchor,
  getCameraForwardDistance,
  isInCameraFrame,
  projectAnomalyToCamera,
  projectCorridorAnchor,
  projectPresentedAnomalyToCamera,
  projectPropToCamera,
  type CorridorCameraAnchor,
} from './cameraProjection.ts';

const player = (overrides: Partial<PlayerState> = {}): PlayerState => ({
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
  ...overrides,
});

const anchor = (
  overrides: Partial<CorridorCameraAnchor> = {},
): CorridorCameraAnchor => ({
  id: 'subject',
  worldX: 1_300,
  lateral: 0,
  elevation: 0.55,
  worldWidth: 60,
  worldHeight: 120,
  surface: 'floor',
  ...overrides,
});

const anomaly = (overrides: Partial<Anomaly> = {}): Anomaly => ({
  id: 'hospital.anomaly.door-figure',
  x: 1_300,
  width: 58,
  type: 'ghost',
  description: 'camera-only subject',
  points: 25_000,
  captured: false,
  visibleOnlyInPip: true,
  yOffset: -8,
  ...overrides,
});

test('forward distance follows the explicit player facing', () => {
  assert.equal(getCameraForwardDistance(1_000, 1_300, 1), 300);
  assert.equal(getCameraForwardDistance(1_000, 700, -1), 300);
  assert.equal(getCameraForwardDistance(1_000, 700, 1), -300);

  const behind = projectCorridorAnchor(
    anchor({ worldX: 700 }),
    player({ facing: 1 }),
  );
  assert.equal(behind.visible, false);
});

test('near targets are larger and wall anchors converge toward the horizon', () => {
  const camera = player();
  const near = projectCorridorAnchor(
    anchor({ worldX: 1_180, lateral: 0.9, surface: 'right-wall' }),
    camera,
  );
  const far = projectCorridorAnchor(
    anchor({ worldX: 1_650, lateral: 0.9, surface: 'right-wall' }),
    camera,
  );

  assert.ok(near.width > far.width);
  assert.ok(near.height > far.height);
  assert.ok(Math.abs(near.centerX - 160) > Math.abs(far.centerX - 160));
  assert.ok(near.depth < far.depth);
});

test('turning around mirrors a fixed world-side placement', () => {
  const lookingRight = projectCorridorAnchor(
    anchor({ worldX: 1_300, lateral: 0.6 }),
    player({ x: 1_000, facing: 1 }),
  );
  const lookingLeft = projectCorridorAnchor(
    anchor({ worldX: 700, lateral: 0.6 }),
    player({ x: 1_000, facing: -1 }),
  );

  assert.equal(lookingRight.forwardDistance, lookingLeft.forwardDistance);
  assert.ok(Math.abs(lookingRight.centerX - (320 - lookingLeft.centerX)) < 1e-9);
  assert.equal(lookingRight.width, lookingLeft.width);
});

test('negative flashlight pitch looks upward by moving the horizon down', () => {
  const level = createCameraPose(player({ flashlightAngle: 0 }));
  const upward = createCameraPose(player({ flashlightAngle: -0.5 }));
  const downward = createCameraPose(player({ flashlightAngle: 0.5 }));

  assert.ok(upward.horizonY > level.horizonY);
  assert.ok(downward.horizonY < level.horizonY);

  const ceiling = anchor({
    id: 'ceiling-subject',
    surface: 'ceiling',
    elevation: 0.94,
  });
  const levelProjection = projectCorridorAnchor(ceiling, player());
  const upwardProjection = projectCorridorAnchor(
    ceiling,
    player({ flashlightAngle: -0.5 }),
  );
  assert.ok(upwardProjection.centerY > levelProjection.centerY);
});

test('camera pose preserves the transient steep pitch used while turning', () => {
  const turning = createCameraPose(player({ flashlightAngle: 1.2 }));
  assert.equal(turning.pitch, 1.2);
});

test('prop placement is deterministic and derived from kind plus id', () => {
  const door: WorldPropDefinition = {
    id: 'ward-door',
    kind: 'door',
    worldX: 1_200,
    label: '第一病棟 A-3',
  };
  const first = derivePropCameraAnchor(door);
  const second = derivePropCameraAnchor({ ...door });

  assert.deepEqual(first, second);
  assert.ok(first.surface === 'left-wall' || first.surface === 'right-wall');
  assert.equal(Math.abs(first.lateral), 0.94);

  const projected = projectPropToCamera(door, player({ x: 900 }));
  assert.equal(projected.id, door.id);
  assert.equal(projected.forwardDistance, 300);
});

test('ceiling anomalies receive a high deterministic camera anchor', () => {
  const subject = anomaly({
    id: 'hospital.anomaly.ceiling',
    x: 4_100,
    yOffset: -58,
  });
  const first = deriveAnomalyCameraAnchor(subject);
  const second = deriveAnomalyCameraAnchor({ ...subject });

  assert.deepEqual(first, second);
  assert.equal(first.surface, 'ceiling');
  assert.ok(first.elevation >= 0.94);
});

test('presented anomaly offsets use one projection for rendering and capture', () => {
  const subject = anomaly();
  const camera = player();
  const raw = projectAnomalyToCamera(subject, camera);
  const approached = projectPresentedAnomalyToCamera(subject, camera, 40);

  assert.equal(raw.forwardDistance, 300);
  assert.equal(approached.forwardDistance, 286);
  assert.ok(approached.width > raw.width);
  assert.ok(approached.height > raw.height);
});

test('camera frame helper uses both horizontal and vertical framing', () => {
  const camera = player();
  const centered = projectCorridorAnchor(anchor(), camera);
  const side = projectCorridorAnchor(anchor({ lateral: 0.9 }), camera);
  const high = projectCorridorAnchor(anchor({ elevation: 1 }), camera);
  const frame = createCenteredCameraFrame();

  assert.equal(isInCameraFrame(centered, frame), true);
  assert.equal(isInCameraFrame(side, frame), false);
  assert.equal(isInCameraFrame(high, frame), false);
});

test('targets outside near and far planes never enter the camera frame', () => {
  const tooNear = projectCorridorAnchor(
    anchor({ worldX: 1_010 }),
    player(),
  );
  const tooFar = projectCorridorAnchor(
    anchor({ worldX: 2_000 }),
    player(),
  );

  assert.equal(tooNear.visible, false);
  assert.equal(tooFar.visible, false);
  assert.equal(isInCameraFrame(tooNear), false);
  assert.equal(isInCameraFrame(tooFar), false);
});
