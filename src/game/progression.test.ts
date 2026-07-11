import assert from 'node:assert/strict';
import test from 'node:test';
import { BOARD_DEFINITIONS } from './boardDefinitions.ts';
import {
  createProgression,
  isDeepBroadcastUnlocked,
  loadProgression,
  PROGRESSION_STORAGE_KEY,
  recordRun,
  recordRunAttempt,
  RUN_LEDGER_LIMIT,
  sanitizeProgression,
  saveProgression,
  type CompletedRun,
  type ProgressionStorage,
} from './progression.ts';

const completedRun = (
  overrides: Partial<CompletedRun> = {},
): CompletedRun => ({
  runId: 'run-hospital-1',
  boardId: 'hospital',
  mode: 'STANDARD',
  ending: 'ESCAPED',
  foundItemIds: [],
  recordedAnomalyIds: [],
  ...overrides,
});

test('corrupt, unknown-version, and invalid persisted data safely defaults', () => {
  const throwingStorage: ProgressionStorage = {
    getItem() {
      throw new Error('storage unavailable');
    },
    setItem() {},
  };
  assert.deepEqual(loadProgression(throwingStorage), createProgression());

  const malformedStorage: ProgressionStorage = {
    getItem() {
      return '{not json';
    },
    setItem() {},
  };
  assert.deepEqual(loadProgression(malformedStorage), createProgression());
  assert.deepEqual(
    sanitizeProgression({ version: 99, boards: {}, lastBoardId: 'moon' }),
    createProgression(),
  );

  const sanitized = sanitizeProgression({
    version: 1,
    lastBoardId: 'moon',
    boards: {
      hospital: {
        attempts: -4,
        clears: Number.NaN,
        deepClears: 50,
        endings: ['ESCAPED', 'UNKNOWN', 'ESCAPED'],
        foundItemIds: ['KEYCARD_BLUE', 'school.item.student-ledger', 'KEYCARD_BLUE'],
        recordedAnomalyIds: ['hospital.anomaly.footsteps', 'unknown'],
        challenges: ['NO_CAPTURE_ESCAPE', 'UNKNOWN'],
        bestArchivePercent: 980,
        attemptedRunIds: ['run-a', 'run-a', ''],
        completedRunIds: ['run-a'],
      },
      school: 'invalid',
      moon: { clears: 999 },
    },
  });

  assert.equal(sanitized.lastBoardId, 'hospital');
  assert.deepEqual(sanitized.boards.hospital.endings, ['ESCAPED']);
  assert.deepEqual(sanitized.boards.hospital.foundItemIds, ['KEYCARD_BLUE']);
  assert.deepEqual(sanitized.boards.hospital.recordedAnomalyIds, [
    'hospital.anomaly.footsteps',
  ]);
  assert.deepEqual(sanitized.boards.hospital.challenges, [
    'NO_CAPTURE_ESCAPE',
  ]);
  assert.equal(sanitized.boards.hospital.bestArchivePercent, 100);
  assert.equal(sanitized.boards.hospital.attempts, 1);
  assert.equal(sanitized.boards.hospital.clears, 1);
  assert.equal(sanitized.boards.hospital.deepBroadcastUnlocked, true);
  assert.deepEqual(sanitized.boards.school, createProgression().boards.school);
});

test('attempts and completed records stay isolated per board', () => {
  let progression = createProgression();
  progression = recordRunAttempt(progression, {
    runId: 'hospital-attempt',
    boardId: 'hospital',
  });
  progression = recordRun(
    progression,
    completedRun({
      runId: 'school-clear',
      boardId: 'school',
      ending: 'OVER_EXPLOITED',
    }),
  );

  assert.equal(progression.boards.hospital.attempts, 1);
  assert.equal(progression.boards.hospital.clears, 0);
  assert.equal(progression.boards.school.attempts, 1);
  assert.equal(progression.boards.school.clears, 1);
  assert.deepEqual(progression.boards.school.endings, ['OVER_EXPLOITED']);
  assert.equal(progression.lastBoardId, 'school');
});

test('recordRun is immutable, deduplicates evidence, and is idempotent by runId', () => {
  const initial = createProgression();
  const hospital = BOARD_DEFINITIONS.hospital;
  const result = completedRun({
    runId: 'same-ending-callback',
    ending: 'LOST_ARCHIVE',
    foundItemIds: [
      hospital.items[0].id,
      hospital.items[0].id,
      'school.item.student-ledger',
    ],
    recordedAnomalyIds: [
      hospital.anomalies[0].id,
      hospital.anomalies[0].id,
      'unknown',
    ],
  });
  const once = recordRun(initial, result);
  const twice = recordRun(once, result);

  assert.equal(initial.boards.hospital.attempts, 0);
  assert.equal(once.boards.hospital.attempts, 1);
  assert.equal(once.boards.hospital.clears, 1);
  assert.deepEqual(once.boards.hospital.foundItemIds, [hospital.items[0].id]);
  assert.deepEqual(once.boards.hospital.recordedAnomalyIds, [
    hospital.anomalies[0].id,
  ]);
  assert.deepEqual(twice, once);

  const reusedAcrossBoards = recordRun(
    twice,
    completedRun({
      runId: 'same-ending-callback',
      boardId: 'school',
    }),
  );
  assert.deepEqual(reusedAcrossBoards, twice);

  const repeatedEnding = recordRun(
    twice,
    completedRun({ runId: 'new-run-same-ending', ending: 'LOST_ARCHIVE' }),
  );
  assert.equal(repeatedEnding.boards.hospital.clears, 2);
  assert.deepEqual(repeatedEnding.boards.hospital.endings, ['LOST_ARCHIVE']);
});

test('first clear unlocks deep mode and challenge conditions are recorded once', () => {
  const hospital = BOARD_DEFINITIONS.hospital;
  let progression = createProgression();
  assert.equal(isDeepBroadcastUnlocked(progression, 'hospital'), false);

  progression = recordRun(
    progression,
    completedRun({
      runId: 'standard-no-capture',
      ending: 'ESCAPED',
    }),
  );
  assert.equal(isDeepBroadcastUnlocked(progression, 'hospital'), true);
  assert.equal(isDeepBroadcastUnlocked(progression, 'school'), false);
  assert.deepEqual(progression.boards.hospital.challenges, [
    'NO_CAPTURE_ESCAPE',
  ]);

  progression = recordRun(
    progression,
    completedRun({
      runId: 'deep-complete-archive',
      mode: 'DEEP_BROADCAST',
      ending: 'LOST_ARCHIVE',
      foundItemIds: hospital.items.map((item) => item.id),
      recordedAnomalyIds: hospital.anomalies.map((anomaly) => anomaly.id),
    }),
  );
  progression = recordRun(
    progression,
    completedRun({
      runId: 'deep-complete-archive',
      mode: 'DEEP_BROADCAST',
      ending: 'LOST_ARCHIVE',
      foundItemIds: hospital.items.map((item) => item.id),
      recordedAnomalyIds: hospital.anomalies.map((anomaly) => anomaly.id),
    }),
  );

  assert.equal(progression.boards.hospital.clears, 2);
  assert.equal(progression.boards.hospital.deepClears, 1);
  assert.equal(progression.boards.hospital.bestArchivePercent, 100);
  assert.deepEqual(progression.boards.hospital.challenges, [
    'NO_CAPTURE_ESCAPE',
    'COMPLETE_ARCHIVE',
    'DEEP_CLEAR',
  ]);
});

test('storage save is guarded and writes the sanitized versioned payload', () => {
  let storedKey = '';
  let storedValue = '';
  const storage: ProgressionStorage = {
    getItem(key) {
      return key === storedKey ? storedValue : null;
    },
    setItem(key, value) {
      storedKey = key;
      storedValue = value;
    },
  };
  const progression = recordRun(createProgression(), completedRun());

  assert.equal(saveProgression(progression, storage), true);
  assert.equal(storedKey, PROGRESSION_STORAGE_KEY);
  assert.deepEqual(loadProgression(storage), progression);

  const failingStorage: ProgressionStorage = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error('quota exceeded');
    },
  };
  assert.equal(saveProgression(progression, failingStorage), false);
});

test('a run id cannot migrate between boards', () => {
  const attempted = recordRunAttempt(createProgression(), {
    runId: 'board-owned-run',
    boardId: 'hospital',
  });
  const migrated = recordRun(
    attempted,
    completedRun({
      runId: 'board-owned-run',
      boardId: 'school',
    }),
  );

  assert.deepEqual(migrated, attempted);
});

test('run idempotency ledgers remain bounded during long-term replay', () => {
  let progression = createProgression();
  for (let index = 0; index < RUN_LEDGER_LIMIT + 5; index += 1) {
    progression = recordRunAttempt(progression, {
      runId: `long-run-${index}`,
      boardId: 'hospital',
    });
  }

  assert.equal(progression.boards.hospital.attempts, RUN_LEDGER_LIMIT + 5);
  assert.equal(
    progression.boards.hospital.attemptedRunIds.length,
    RUN_LEDGER_LIMIT,
  );
  assert.equal(progression.boards.hospital.attemptedRunIds[0], 'long-run-5');
});
