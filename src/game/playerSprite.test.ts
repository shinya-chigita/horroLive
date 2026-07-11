import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPlayerSpriteFrame,
  getPlayerSpritePhase,
  PLAYER_SPRITE_BOUNDS,
  type PlayerSpritePart,
} from './playerSprite.ts';

const frame = (overrides: Partial<Parameters<typeof createPlayerSpriteFrame>[0]> = {}) =>
  createPlayerSpriteFrame({
    now: 250,
    isMoving: false,
    isRunning: false,
    isCrouching: false,
    tension: 10,
    ...overrides,
  });

test('reference-defining equipment remains present in the sprite silhouette', () => {
  const parts = new Set(frame().map((item) => item.part));
  const requiredParts: PlayerSpritePart[] = [
    'hair',
    'backpack',
    'strap',
    'chest-camera',
    'flashlight',
  ];
  for (const required of requiredParts) {
    assert.equal(parts.has(required), true, `${required} must be authored`);
  }
});

test('the standing sprite stays inside its documented logical bounds', () => {
  for (const item of frame()) {
    assert.ok(item.x >= PLAYER_SPRITE_BOUNDS.left);
    assert.ok(item.x + item.width <= PLAYER_SPRITE_BOUNDS.right);
    assert.ok(item.y >= PLAYER_SPRITE_BOUNDS.top);
    assert.ok(item.y + item.height <= PLAYER_SPRITE_BOUNDS.bottom);
  }
});

test('all authored movement poses remain inside the sprite envelope', () => {
  const samples = [
    frame({ now: 0, isMoving: true }),
    frame({ now: 125, isMoving: true }),
    frame({ now: 250, isMoving: true, isRunning: true }),
    frame({ now: 300, isMoving: true, isRunning: true }),
    frame({ now: 125, isMoving: true, isCrouching: true }),
  ];

  for (const sample of samples) {
    for (const item of sample) {
      assert.ok(item.x >= PLAYER_SPRITE_BOUNDS.left);
      assert.ok(item.x + item.width <= PLAYER_SPRITE_BOUNDS.right);
      assert.ok(item.y >= PLAYER_SPRITE_BOUNDS.top);
      assert.ok(item.y + item.height <= PLAYER_SPRITE_BOUNDS.bottom);
    }
  }
});

test('walk and run animation use restrained 8fps and 10fps stepped cadence', () => {
  assert.equal(getPlayerSpritePhase(0, true, false), 0);
  assert.equal(getPlayerSpritePhase(124, true, false), 0);
  assert.equal(getPlayerSpritePhase(125, true, false), 1);
  assert.equal(getPlayerSpritePhase(99, true, true), 0);
  assert.equal(getPlayerSpritePhase(100, true, true), 1);
  assert.equal(getPlayerSpritePhase(9_999, false, true), 0);
});

test('crouching lowers the head while keeping boots on the floor', () => {
  const standing = frame();
  const crouching = frame({ isCrouching: true });
  const standingTop = Math.min(...standing.filter((item) => item.part !== 'shadow').map((item) => item.y));
  const crouchingTop = Math.min(...crouching.filter((item) => item.part !== 'shadow').map((item) => item.y));
  const crouchingBottom = Math.max(...crouching.filter((item) => item.part === 'legs').map((item) => item.y + item.height));

  assert.ok(crouchingTop > standingTop);
  assert.equal(crouchingBottom, PLAYER_SPRITE_BOUNDS.bottom);
});
