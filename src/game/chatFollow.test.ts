import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChatFollowState } from './chatFollow.ts';
import {
  chatFollowReducer,
  countAddedMessageIds,
  getChatFollowMode,
  getDistanceFromBottom,
} from './chatFollow.ts';

test('32px from the bottom is FOLLOWING and 32px plus epsilon is PAUSED', () => {
  const base = { scrollHeight: 1_000, clientHeight: 300 };
  assert.equal(getDistanceFromBottom({ ...base, scrollTop: 668 }), 32);
  assert.equal(getChatFollowMode({ ...base, scrollTop: 668 }), 'FOLLOWING');
  assert.equal(getChatFollowMode({ ...base, scrollTop: 667.99 }), 'PAUSED');
});

test('unread messages accrue only while paused and clear at the bottom', () => {
  let state: ChatFollowState = { mode: 'FOLLOWING', unreadCount: 0 };
  state = chatFollowReducer(state, {
    type: 'SCROLLED',
    metrics: { scrollHeight: 1_000, scrollTop: 500, clientHeight: 300 },
  });
  assert.deepEqual(state, { mode: 'PAUSED', unreadCount: 0 });

  state = chatFollowReducer(state, { type: 'MESSAGES_ADDED', count: 5 });
  assert.deepEqual(state, { mode: 'PAUSED', unreadCount: 5 });

  state = chatFollowReducer(state, {
    type: 'SCROLLED',
    metrics: { scrollHeight: 1_200, scrollTop: 868, clientHeight: 300 },
  });
  assert.deepEqual(state, { mode: 'FOLLOWING', unreadCount: 0 });

  state = chatFollowReducer(state, { type: 'MESSAGES_ADDED', count: 3 });
  assert.deepEqual(state, { mode: 'FOLLOWING', unreadCount: 0 });
});

test('resume action clears unread count without waiting for time', () => {
  const state = chatFollowReducer(
    { mode: 'PAUSED', unreadCount: 12 },
    { type: 'FOLLOW_REQUESTED' },
  );
  assert.deepEqual(state, { mode: 'FOLLOWING', unreadCount: 0 });
});

test('new-message counting remains exact when old rows are pruned', () => {
  assert.equal(
    countAddedMessageIds(['old-1', 'old-2', 'old-3'], ['old-2', 'old-3', 'new-1', 'new-2']),
    2,
  );
  assert.equal(countAddedMessageIds(['a'], ['a', 'b', 'b']), 1);
});

test('invalid scroll geometry fails safely into PAUSED', () => {
  assert.equal(
    getChatFollowMode({
      scrollHeight: Number.NaN,
      scrollTop: 0,
      clientHeight: 100,
    }),
    'PAUSED',
  );
});
