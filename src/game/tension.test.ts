import assert from 'node:assert/strict';
import test from 'node:test';

import { applyScareTension } from './tension.ts';

test('authored scares apply their intended tension exactly once', () => {
  assert.equal(applyScareTension(10, 'whisper', false), 25);
  assert.equal(applyScareTension(10, 'jumpscare', false), 45);
  assert.equal(applyScareTension(10, 'chase', false), 95);
  assert.equal(applyScareTension(98, 'jumpscare', false), 100);
});

test('reduced motion preserves pressure with the authored lower spike', () => {
  assert.equal(applyScareTension(10, 'whisper', true), 19);
  assert.equal(applyScareTension(10, 'jumpscare', true), 30);
  assert.equal(applyScareTension(10, 'chase', true), 84);
});

