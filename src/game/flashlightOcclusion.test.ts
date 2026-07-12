import assert from 'node:assert/strict';
import test from 'node:test';
import type { WorldPropDefinition } from './sceneDefinitions.ts';
import {
  createMainViewFlashlightBlocker,
  createShadowPolygon,
  getBlockerApertureBounds,
  getFlashlightBlockerProfile,
  getMainViewBlockerBounds,
  getNearestForwardBlockers,
  MAIN_VIEW_METRICS,
  worldToMainViewX,
} from './flashlightOcclusion.ts';

const door = (
  id: string,
  worldX: number,
  sealed = false,
): WorldPropDefinition => ({
  id,
  kind: 'door',
  worldX,
  label: id,
  sealed,
});

test('authored blocker materials distinguish opaque, partial, and slatted props', () => {
  const opaqueProps: WorldPropDefinition[] = [
    { id: 'locker', kind: 'locker', worldX: 100, open: false },
    door('door', 110),
    { id: 'shoes', kind: 'shoe-lockers', worldX: 120 },
    { id: 'board', kind: 'blackboard', worldX: 130, text: '欠席 1' },
    { id: 'stairs', kind: 'stairs', worldX: 140 },
  ];
  for (const prop of opaqueProps) {
    assert.equal(getFlashlightBlockerProfile(prop)?.kind, 'opaque');
    assert.equal(getFlashlightBlockerProfile(prop)?.transmission, 0);
  }

  const curtain: WorldPropDefinition = {
    id: 'curtain',
    kind: 'curtain',
    worldX: 150,
  };
  const desks: WorldPropDefinition = {
    id: 'desks',
    kind: 'school-desks',
    worldX: 160,
    rows: 3,
  };
  assert.equal(getFlashlightBlockerProfile(curtain)?.kind, 'partial');
  assert.ok((getFlashlightBlockerProfile(curtain)?.transmission ?? 0) > 0);
  assert.equal(getFlashlightBlockerProfile(desks)?.kind, 'slatted');
  assert.ok((getFlashlightBlockerProfile(desks)?.gapRatio ?? 0) > 0);

  assert.equal(
    getFlashlightBlockerProfile({
      id: 'window',
      kind: 'window',
      worldX: 170,
      y: 60,
      width: 80,
      height: 70,
    }),
    null,
  );
});

test('main-view bounds use the same player anchor and prop silhouette coordinates', () => {
  const centerX = worldToMainViewX(1_100, 1_000);
  assert.equal(centerX, 369);

  assert.deepEqual(getMainViewBlockerBounds(door('ward-door', 1_100), 1_000), {
    x: 338,
    y: 58,
    width: 62,
    height: 171,
  });

  const shoes: WorldPropDefinition = {
    id: 'shoes',
    kind: 'shoe-lockers',
    worldX: 1_100,
    columns: 8,
  };
  assert.deepEqual(getMainViewBlockerBounds(shoes, 1_000), {
    x: 294,
    y: 104,
    width: 150,
    height: 126,
  });
});

test('nearest forward blockers exclude rear, decorative, distant, and offscreen props', () => {
  const props: WorldPropDefinition[] = [
    door('rear', 900),
    door('far', 1_420),
    door('nearest-b', 1_100),
    door('nearest-a', 1_100),
    { id: 'decorative', kind: 'graffiti', worldX: 1_050, text: 'LIVE', color: '#fff' },
    { id: 'curtain', kind: 'curtain', worldX: 1_220 },
  ];

  assert.deepEqual(
    getNearestForwardBlockers(props, 1_000, 1, {
      maxDistance: 300,
      maxCount: 3,
    }).map((blocker) => blocker.propId),
    ['nearest-a', 'nearest-b', 'curtain'],
  );
  assert.deepEqual(
    getNearestForwardBlockers(props, 1_000, -1).map(
      (blocker) => blocker.propId,
    ),
    ['rear'],
  );
});

test('door profile exposes a narrow in-bounds light leak', () => {
  const blocker = createMainViewFlashlightBlocker(
    door('door-with-crack', 1_100),
    1_000,
  );
  assert.ok(blocker);
  if (!blocker) return;

  const aperture = getBlockerApertureBounds(
    blocker.bounds,
    blocker.profile,
  );
  assert.ok(aperture);
  if (!aperture) return;
  assert.ok(aperture.width > 0 && aperture.width < blocker.bounds.width * 0.1);
  assert.ok(aperture.x >= blocker.bounds.x);
  assert.ok(aperture.x + aperture.width <= blocker.bounds.x + blocker.bounds.width);
  assert.ok(aperture.y > blocker.bounds.y);
  assert.ok(
    aperture.y + aperture.height < blocker.bounds.y + blocker.bounds.height,
  );
  assert.ok((blocker.profile.aperture?.transmission ?? 0) > 0.5);

  const sealed = getFlashlightBlockerProfile(door('sealed', 1_100, true));
  assert.ok(
    (sealed?.aperture?.transmission ?? 1) <
      (blocker.profile.aperture?.transmission ?? 0),
  );
});

test('shadow polygon extends silhouette rays to the forward viewport edges', () => {
  const bounds = { x: 338, y: 58, width: 62, height: 171 };
  const polygon = createShadowPolygon(
    { x: 290, y: 210 },
    bounds,
    1,
  );

  assert.equal(polygon.length, 4);
  assert.ok(polygon[0].x >= bounds.x && polygon[0].x <= bounds.x + bounds.width);
  assert.ok(polygon[3].x >= bounds.x && polygon[3].x <= bounds.x + bounds.width);
  assert.ok(
    polygon[1].x === MAIN_VIEW_METRICS.width || polygon[1].y === 0,
  );
  assert.ok(
    polygon[2].x === MAIN_VIEW_METRICS.width ||
      polygon[2].y === MAIN_VIEW_METRICS.height,
  );
  assert.ok(polygon[1].x >= polygon[0].x);
  assert.ok(polygon[2].x >= polygon[3].x);
});

test('left-facing shadow geometry mirrors toward x=0 and rejects rear blockers', () => {
  const leftBounds = { x: 120, y: 90, width: 50, height: 120 };
  const polygon = createShadowPolygon(
    { x: 270, y: 205 },
    leftBounds,
    -1,
  );
  assert.equal(polygon.length, 4);
  assert.ok(polygon[1].x === 0 || polygon[1].y === 0);
  assert.ok(polygon[2].x === 0 || polygon[2].y === MAIN_VIEW_METRICS.height);

  assert.deepEqual(
    createShadowPolygon(
      { x: 270, y: 205 },
      { x: 330, y: 90, width: 50, height: 120 },
      -1,
    ),
    [],
  );
});
