import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AIM_RESPONSE_SECONDS,
  MAX_FLASHLIGHT_PITCH,
  aimTargetToPoint,
  pointerToAimTarget,
  smoothAim,
  type AimTarget,
} from './aim.ts';

test('pointer aim shares an explicit facing and clamped vertical pitch', () => {
  const origin = { x: 268, y: 208 };
  const right = pointerToAimTarget({ x: 600, y: 20 }, origin, 1);
  const left = pointerToAimTarget({ x: 30, y: 290 }, origin, 1);

  assert.equal(right.facing, 1);
  assert.equal(left.facing, -1);
  assert.ok(right.pitch < 0);
  assert.ok(left.pitch > 0);
  assert.ok(Math.abs(right.pitch) <= MAX_FLASHLIGHT_PITCH);
  assert.ok(Math.abs(left.pitch) <= MAX_FLASHLIGHT_PITCH);
});

test('the dead zone does not make the character flip at the flashlight socket', () => {
  const origin = { x: 268, y: 208 };
  assert.equal(
    pointerToAimTarget({ x: 260, y: 20 }, origin, 1).facing,
    1,
  );
  assert.equal(
    pointerToAimTarget({ x: 276, y: 280 }, origin, -1).facing,
    -1,
  );
});

test('aim smoothing is frame-rate independent and does not jump to its target', () => {
  const current = { facing: 1 as const, pitch: 0 };
  const target = { facing: 1 as const, pitch: MAX_FLASHLIGHT_PITCH };
  const oneFrame = smoothAim(current, target, 1 / 60);
  let sixtyFrames: AimTarget = current;
  for (let index = 0; index < 60; index += 1) {
    sixtyFrames = smoothAim(sixtyFrames, target, 1 / 60);
  }

  assert.ok(oneFrame.pitch > 0 && oneFrame.pitch < target.pitch);
  assert.ok(sixtyFrames.pitch > target.pitch * 0.99);
  assert.equal(AIM_RESPONSE_SECONDS, 0.105);
});

test('turning around rotates through an intermediate beam instead of teleporting', () => {
  const current = { facing: 1 as const, pitch: 0 };
  const target = { facing: -1 as const, pitch: 0 };
  const first = smoothAim(current, target, 1 / 60);
  let halfway: AimTarget = current;
  for (let index = 0; index < 5; index += 1) {
    halfway = smoothAim(halfway, target, 1 / 60);
  }

  assert.equal(first.facing, 1);
  assert.ok(Math.abs(first.pitch) > 0);
  assert.ok(Math.abs(halfway.pitch) > Math.abs(first.pitch));
});

test('a smoothed aim can be converted back to the shared scene pointer', () => {
  const origin = { x: 268, y: 208 };
  const point = aimTargetToPoint({ facing: -1, pitch: -0.25 }, origin);
  assert.ok(point.x < origin.x);
  assert.ok(point.y < origin.y);
});
