import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldHandleGameplayHotkey } from './gameplayInput.ts';

test('gameplay hotkeys require the active Main viewport', () => {
  assert.equal(
    shouldHandleGameplayHotkey({
      paused: false,
      viewportFocused: false,
      interactiveTarget: false,
    }),
    false,
  );
  assert.equal(
    shouldHandleGameplayHotkey({
      paused: false,
      viewportFocused: true,
      interactiveTarget: false,
    }),
    true,
  );
});

test('paused gameplay and interactive controls retain their own keys', () => {
  assert.equal(
    shouldHandleGameplayHotkey({
      paused: true,
      viewportFocused: true,
      interactiveTarget: false,
    }),
    false,
  );
  assert.equal(
    shouldHandleGameplayHotkey({
      paused: false,
      viewportFocused: true,
      interactiveTarget: true,
    }),
    false,
  );
});
