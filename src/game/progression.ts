import type { BoardId, EndingType, RunMode } from '../types';
import {
  BOARD_DEFINITIONS,
  BOARD_IDS,
  getBoardDefinition,
} from './boardDefinitions.ts';

export const PROGRESSION_VERSION = 1 as const;
export const PROGRESSION_STORAGE_KEY = 'horrolive.progress.v1';
export const RUN_LEDGER_LIMIT = 256;

export type ChallengeId =
  | 'COMPLETE_ARCHIVE'
  | 'NO_CAPTURE_ESCAPE'
  | 'DEEP_CLEAR';

export interface BoardProgress {
  attempts: number;
  clears: number;
  deepClears: number;
  endings: EndingType[];
  foundItemIds: string[];
  recordedAnomalyIds: string[];
  challenges: ChallengeId[];
  bestArchivePercent: number;
  deepBroadcastUnlocked: boolean;
  /** Internal idempotency ledger for explicit run-start actions. */
  attemptedRunIds: string[];
  /** Internal idempotency ledger for completed runs. */
  completedRunIds: string[];
}

export interface ProgressionState {
  version: typeof PROGRESSION_VERSION;
  lastBoardId: BoardId;
  boards: Record<BoardId, BoardProgress>;
}

export interface RunAttempt {
  runId: string;
  boardId: BoardId;
}

export interface CompletedRun {
  runId: string;
  boardId: BoardId;
  mode: RunMode;
  ending: EndingType;
  foundItemIds: readonly string[];
  recordedAnomalyIds: readonly string[];
}

export interface ProgressionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const ENDING_TYPES: readonly EndingType[] = [
  'OVER_EXPLOITED',
  'ESCAPED',
  'LOST_ARCHIVE',
];

const RUN_MODES: readonly RunMode[] = ['STANDARD', 'DEEP_BROADCAST'];

const CHALLENGE_IDS: readonly ChallengeId[] = [
  'COMPLETE_ARCHIVE',
  'NO_CAPTURE_ESCAPE',
  'DEEP_CLEAR',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isBoardId = (value: unknown): value is BoardId =>
  typeof value === 'string' && BOARD_IDS.includes(value as BoardId);

const isEndingType = (value: unknown): value is EndingType =>
  typeof value === 'string' && ENDING_TYPES.includes(value as EndingType);

const isRunMode = (value: unknown): value is RunMode =>
  typeof value === 'string' && RUN_MODES.includes(value as RunMode);

const isChallengeId = (value: unknown): value is ChallengeId =>
  typeof value === 'string' && CHALLENGE_IDS.includes(value as ChallengeId);

const finiteInteger = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;

const percentage = (value: unknown) =>
  Math.min(100, finiteInteger(value));

const uniqueStrings = (
  value: unknown,
  predicate: (candidate: string) => boolean = () => true,
): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.filter(
        (candidate): candidate is string =>
          typeof candidate === 'string' &&
          candidate.length > 0 &&
          predicate(candidate),
      ),
    ),
  );
};

const addUnique = <T extends string>(values: readonly T[], value: T): T[] =>
  values.includes(value) ? [...values] : [...values, value];

const unionStrings = (
  current: readonly string[],
  additional: readonly string[],
): string[] => Array.from(new Set([...current, ...additional]));

const appendRunId = (values: readonly string[], runId: string): string[] =>
  [...values, runId].slice(-RUN_LEDGER_LIMIT);

export function createBoardProgress(): BoardProgress {
  return {
    attempts: 0,
    clears: 0,
    deepClears: 0,
    endings: [],
    foundItemIds: [],
    recordedAnomalyIds: [],
    challenges: [],
    bestArchivePercent: 0,
    deepBroadcastUnlocked: false,
    attemptedRunIds: [],
    completedRunIds: [],
  };
}

export function createProgression(
  lastBoardId: BoardId = BOARD_IDS[0],
): ProgressionState {
  const boards = Object.fromEntries(
    BOARD_IDS.map((boardId) => [boardId, createBoardProgress()]),
  ) as Record<BoardId, BoardProgress>;

  return {
    version: PROGRESSION_VERSION,
    lastBoardId,
    boards,
  };
}

function sanitizeBoardProgress(
  boardId: BoardId,
  value: unknown,
): BoardProgress {
  if (!isRecord(value)) return createBoardProgress();

  const board = getBoardDefinition(boardId);
  const itemIds = new Set(board.items.map((item) => item.id));
  const anomalyIds = new Set(board.anomalies.map((anomaly) => anomaly.id));
  const endings = Array.isArray(value.endings)
    ? Array.from(new Set(value.endings.filter(isEndingType)))
    : [];
  const challenges = Array.isArray(value.challenges)
    ? Array.from(new Set(value.challenges.filter(isChallengeId)))
    : [];
  const completedRunIds = uniqueStrings(value.completedRunIds).slice(
    -RUN_LEDGER_LIMIT,
  );
  const attemptedRunIds = unionStrings(
    uniqueStrings(value.attemptedRunIds),
    completedRunIds,
  ).slice(-RUN_LEDGER_LIMIT);
  const clears = Math.max(
    finiteInteger(value.clears),
    completedRunIds.length,
  );
  const deepClears = Math.min(clears, finiteInteger(value.deepClears));
  const attempts = Math.max(
    clears,
    attemptedRunIds.length,
    finiteInteger(value.attempts),
  );

  return {
    attempts,
    clears,
    deepClears,
    endings,
    foundItemIds: uniqueStrings(value.foundItemIds, (id) => itemIds.has(id)),
    recordedAnomalyIds: uniqueStrings(
      value.recordedAnomalyIds,
      (id) => anomalyIds.has(id),
    ),
    challenges,
    bestArchivePercent: percentage(value.bestArchivePercent),
    deepBroadcastUnlocked: clears > 0,
    attemptedRunIds,
    completedRunIds,
  };
}

/**
 * Converts untrusted persisted data into the current schema. Unknown versions,
 * board identifiers, evidence identifiers, and enum values are discarded.
 */
export function sanitizeProgression(value: unknown): ProgressionState {
  if (
    !isRecord(value) ||
    value.version !== PROGRESSION_VERSION ||
    !isRecord(value.boards)
  ) {
    return createProgression();
  }

  const state = createProgression(
    isBoardId(value.lastBoardId) ? value.lastBoardId : BOARD_IDS[0],
  );

  BOARD_IDS.forEach((boardId) => {
    state.boards[boardId] = sanitizeBoardProgress(
      boardId,
      value.boards[boardId],
    );
  });

  return state;
}

/** Records a selected board once per run, independently from run completion. */
export function recordRunAttempt(
  progression: ProgressionState,
  attempt: RunAttempt,
): ProgressionState {
  if (
    !isBoardId(attempt.boardId) ||
    typeof attempt.runId !== 'string' ||
    attempt.runId.length === 0
  ) {
    return progression;
  }

  const alreadyAttempted = BOARD_IDS.some((boardId) =>
    progression.boards[boardId].attemptedRunIds.includes(attempt.runId),
  );
  if (alreadyAttempted) return progression;

  const current = progression.boards[attempt.boardId];
  return {
    ...progression,
    lastBoardId: attempt.boardId,
    boards: {
      ...progression.boards,
      [attempt.boardId]: {
        ...current,
        attempts: current.attempts + 1,
        attemptedRunIds: appendRunId(current.attemptedRunIds, attempt.runId),
      },
    },
  };
}

const calculateArchivePercent = (
  boardId: BoardId,
  foundItemIds: readonly string[],
  recordedAnomalyIds: readonly string[],
) => {
  const board = BOARD_DEFINITIONS[boardId];
  const total = board.items.length + board.anomalies.length;
  if (total === 0) return 100;
  return Math.round(
    ((foundItemIds.length + recordedAnomalyIds.length) / total) * 100,
  );
};

/**
 * Records one completed run. `runId` makes the update idempotent when an ENDING
 * callback is repeated or React StrictMode replays surrounding work.
 */
export function recordRun(
  progression: ProgressionState,
  completedRun: CompletedRun,
): ProgressionState {
  if (
    !isBoardId(completedRun.boardId) ||
    !isRunMode(completedRun.mode) ||
    !isEndingType(completedRun.ending) ||
    typeof completedRun.runId !== 'string' ||
    completedRun.runId.length === 0
  ) {
    return progression;
  }

  const alreadyCompleted = BOARD_IDS.some((boardId) =>
    progression.boards[boardId].completedRunIds.includes(completedRun.runId),
  );
  if (alreadyCompleted) return progression;

  const attemptedOnAnotherBoard = BOARD_IDS.some(
    (boardId) =>
      boardId !== completedRun.boardId &&
      progression.boards[boardId].attemptedRunIds.includes(completedRun.runId),
  );
  if (attemptedOnAnotherBoard) return progression;

  const withAttempt = recordRunAttempt(progression, completedRun);
  const current = withAttempt.boards[completedRun.boardId];

  const board = getBoardDefinition(completedRun.boardId);
  const itemIds = new Set(board.items.map((item) => item.id));
  const anomalyIds = new Set(board.anomalies.map((anomaly) => anomaly.id));
  const foundItemIds = uniqueStrings(
    completedRun.foundItemIds,
    (id) => itemIds.has(id),
  );
  const recordedAnomalyIds = uniqueStrings(
    completedRun.recordedAnomalyIds,
    (id) => anomalyIds.has(id),
  );
  const runArchivePercent = calculateArchivePercent(
    completedRun.boardId,
    foundItemIds,
    recordedAnomalyIds,
  );

  let challenges = [...current.challenges];
  if (
    foundItemIds.length === board.items.length &&
    recordedAnomalyIds.length === board.anomalies.length
  ) {
    challenges = addUnique(challenges, 'COMPLETE_ARCHIVE');
  }
  if (
    completedRun.ending === 'ESCAPED' &&
    recordedAnomalyIds.length === 0
  ) {
    challenges = addUnique(challenges, 'NO_CAPTURE_ESCAPE');
  }
  if (completedRun.mode === 'DEEP_BROADCAST') {
    challenges = addUnique(challenges, 'DEEP_CLEAR');
  }

  const clears = current.clears + 1;
  const nextBoardProgress: BoardProgress = {
    ...current,
    clears,
    deepClears:
      current.deepClears + (completedRun.mode === 'DEEP_BROADCAST' ? 1 : 0),
    endings: addUnique(current.endings, completedRun.ending),
    foundItemIds: unionStrings(current.foundItemIds, foundItemIds),
    recordedAnomalyIds: unionStrings(
      current.recordedAnomalyIds,
      recordedAnomalyIds,
    ),
    challenges,
    bestArchivePercent: Math.max(
      current.bestArchivePercent,
      runArchivePercent,
    ),
    deepBroadcastUnlocked: true,
    completedRunIds: appendRunId(
      current.completedRunIds,
      completedRun.runId,
    ),
  };

  return {
    ...withAttempt,
    lastBoardId: completedRun.boardId,
    boards: {
      ...withAttempt.boards,
      [completedRun.boardId]: nextBoardProgress,
    },
  };
}

export function isDeepBroadcastUnlocked(
  progression: ProgressionState,
  boardId: BoardId,
): boolean {
  return progression.boards[boardId]?.deepBroadcastUnlocked ?? false;
}

export function isRunModeUnlocked(
  progression: ProgressionState,
  boardId: BoardId,
  mode: RunMode,
): boolean {
  return mode === 'STANDARD' || isDeepBroadcastUnlocked(progression, boardId);
}

function browserStorage(): ProgressionStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadProgression(
  storage: ProgressionStorage | null = browserStorage(),
): ProgressionState {
  if (!storage) return createProgression();
  try {
    const serialized = storage.getItem(PROGRESSION_STORAGE_KEY);
    return serialized === null
      ? createProgression()
      : sanitizeProgression(JSON.parse(serialized));
  } catch {
    return createProgression();
  }
}

export function saveProgression(
  progression: ProgressionState,
  storage: ProgressionStorage | null = browserStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(
      PROGRESSION_STORAGE_KEY,
      JSON.stringify(sanitizeProgression(progression)),
    );
    return true;
  } catch {
    return false;
  }
}
