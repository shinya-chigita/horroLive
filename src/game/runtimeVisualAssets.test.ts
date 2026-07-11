import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAtlasSourceRect,
  getHospitalAssetAtlasCell,
  getObserverAtlasCell,
  getObserverTierForFragment,
  getPlayerAtlasCell,
  getRuntimeAtlasImage,
  getRuntimeAtlasLoadState,
  RUNTIME_ATLASES,
  selectPlayerAtlasCell,
  type HospitalAssetKey,
} from './runtimeVisualAssets.ts';

test('runtime registry exposes the three stable public atlas URLs', () => {
  assert.deepEqual(RUNTIME_ATLASES, {
    player: {
      url: '/assets/runtime/player-atlas-v1.png',
      width: 1672,
      height: 941,
      columns: 4,
      rows: 2,
    },
    'hospital-props': {
      url: '/assets/runtime/hospital-props-atlas-v1.png',
      width: 1448,
      height: 1086,
      columns: 4,
      rows: 4,
    },
    observer: {
      url: '/assets/runtime/observer-atlas-v1.png',
      width: 1672,
      height: 941,
      columns: 3,
      rows: 1,
    },
  });
});

test('player frames map every authored pose and use stepped walk cadence', () => {
  assert.deepEqual(getPlayerAtlasCell('idle'), { column: 0, row: 0 });
  assert.deepEqual(getPlayerAtlasCell('crouch'), { column: 0, row: 1 });
  assert.deepEqual(getPlayerAtlasCell('aim'), { column: 1, row: 1 });
  assert.deepEqual(getPlayerAtlasCell('startled'), { column: 2, row: 1 });
  assert.deepEqual(getPlayerAtlasCell('fatigued'), { column: 3, row: 1 });

  assert.deepEqual(getPlayerAtlasCell('walk', 0), { column: 1, row: 0 });
  assert.deepEqual(getPlayerAtlasCell('walk', 125), { column: 2, row: 0 });
  assert.deepEqual(getPlayerAtlasCell('walk', 250), { column: 3, row: 0 });
  assert.deepEqual(getPlayerAtlasCell('walk', 375), { column: 2, row: 0 });
  assert.deepEqual(getPlayerAtlasCell('walk', 100, true), {
    column: 2,
    row: 0,
  });
});

test('player selection prioritizes reactions, crouch, movement, then aim', () => {
  assert.deepEqual(
    selectPlayerAtlasCell({
      now: 0,
      isMoving: true,
      isCrouching: true,
      isAiming: true,
      reaction: 'startled',
    }),
    { column: 2, row: 1 },
  );
  assert.deepEqual(
    selectPlayerAtlasCell({ now: 0, isMoving: true, isCrouching: true }),
    { column: 0, row: 1 },
  );
  assert.deepEqual(
    selectPlayerAtlasCell({ now: 250, isMoving: true, isAiming: true }),
    { column: 3, row: 0 },
  );
  assert.deepEqual(
    selectPlayerAtlasCell({ now: 0, isMoving: false, isAiming: true }),
    { column: 1, row: 1 },
  );
  assert.deepEqual(selectPlayerAtlasCell({ now: 0, isMoving: false }), {
    column: 0,
    row: 0,
  });
});

test('hospital atlas keys cover every prop and inventory cell in row order', () => {
  const orderedKeys: readonly HospitalAssetKey[] = [
    'bed',
    'gurney',
    'wheelchair',
    'iv-stand',
    'medicine-cart',
    'locker-closed',
    'locker-open',
    'crt',
    'door',
    'curtain',
    'wet-reflection',
    'backpack',
    'keycard',
    'diary',
    'photo',
    'battery',
  ];

  orderedKeys.forEach((key, index) => {
    assert.deepEqual(getHospitalAssetAtlasCell(key), {
      column: index % 4,
      row: Math.floor(index / 4),
    });
  });
});

test('Observer tiers and fragment routing keep non-figures procedural', () => {
  assert.deepEqual(getObserverAtlasCell('far'), { column: 0, row: 0 });
  assert.deepEqual(getObserverAtlasCell('mid'), { column: 1, row: 0 });
  assert.deepEqual(getObserverAtlasCell('near'), { column: 2, row: 0 });
  assert.equal(getObserverTierForFragment('FULL_BODY'), 'far');
  assert.equal(getObserverTierForFragment('HAIR_AND_SHOULDER'), 'mid');
  assert.equal(getObserverTierForFragment('HEAD_AND_HAND'), 'near');
  assert.equal(getObserverTierForFragment('FRAME_EDGE_SHADOW'), 'near');
  assert.equal(getObserverTierForFragment('TRACE'), null);
  assert.equal(getObserverTierForFragment('WRITING_FRAGMENT'), null);
});

test('source rectangles use decoded dimensions without rounding generated atlases', () => {
  assert.deepEqual(
    getAtlasSourceRect('player', 1672, 941, { column: 3, row: 1 }),
    {
      sx: 1254,
      sy: 470.5,
      sWidth: 418,
      sHeight: 470.5,
    },
  );
  assert.deepEqual(
    getAtlasSourceRect('observer', 1672, 941, { column: 2, row: 0 }),
    {
      sx: (1672 / 3) * 2,
      sy: 0,
      sWidth: 1672 / 3,
      sHeight: 941,
    },
  );
  assert.equal(
    getAtlasSourceRect('hospital-props', 1448, 1086, {
      column: 4,
      row: 0,
    }),
    null,
  );
  assert.equal(
    getAtlasSourceRect('player', 0, 941, { column: 0, row: 0 }),
    null,
  );
});

test('image access remains inert in Node and leaves the cache idle', () => {
  assert.equal(typeof Image, 'undefined');
  assert.equal(getRuntimeAtlasImage('player'), null);
  assert.equal(getRuntimeAtlasLoadState('player'), 'idle');
});
