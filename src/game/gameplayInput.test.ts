import assert from 'node:assert/strict';
import test from 'node:test';

import {
  shouldBeginGameplayFromKey,
  shouldHandleGameplayHotkey,
} from './gameplayInput.ts';

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

test('the first gameplay key starts an armed Main view without consuming that key', () => {
  for (const key of [
    'a',
    'd',
    's',
    'ArrowLeft',
    'ArrowRight',
    'ArrowDown',
    'Shift',
    'Control',
    'f',
    'e',
    ' ',
  ]) {
    assert.equal(
      shouldBeginGameplayFromKey({
        awaitingFirstInput: true,
        viewportFocused: true,
        interactiveTarget: false,
        key,
      }),
      true,
      key,
    );
  }

  for (const key of ['Tab', 'Enter', 'Escape']) {
    assert.equal(
      shouldBeginGameplayFromKey({
        awaitingFirstInput: true,
        viewportFocused: true,
        interactiveTarget: false,
        key,
      }),
      false,
      key,
    );
  }
  assert.equal(
    shouldBeginGameplayFromKey({
      awaitingFirstInput: true,
      viewportFocused: false,
      interactiveTarget: false,
      key: 'd',
    }),
    false,
  );
});
