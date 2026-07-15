import assert from 'node:assert/strict';
import test from 'node:test';
import type { PlayerState, RiskTier } from '../types.ts';

import {
  createImprovementPrototypeBoard,
  createImprovementPrototypeComments,
  evaluateImprovementPrototypeDuration,
  evaluateImprovementPrototypeGate,
  getResolvedCaptureFailureCopy,
  hasCompleteImprovementPrototypeSequence,
  IMPROVEMENT_PROTOTYPE_REQUIRED_CAPTURES,
  measurePrototypeActiveFrame,
  selectPrototypeScareType,
  shouldPublishPrototypeComment,
} from './improvementPrototype.ts';
import {
  createAnomalyDirectorState,
  getAnomalyRuntimeDefinition,
} from './anomalyDirector.ts';
import { MAX_FLASHLIGHT_PITCH } from './aim.ts';
import { getBoardDefinition } from './boardDefinitions.ts';
import { CAPTURE_MAX_DISTANCE, evaluatePipCapture } from './capture.ts';
import { createSceneSnapshot } from './sceneSnapshot.ts';

test('the prototype board isolates one four-zone hospital route', () => {
  const normalBoard = getBoardDefinition('hospital');
  const normalFootsteps = normalBoard.anomalies.find(
    (anomaly) => anomaly.id === 'hospital.anomaly.footsteps',
  );
  const board = createImprovementPrototypeBoard(normalBoard);
  const prototypeFootsteps = board.anomalies.find(
    (anomaly) => anomaly.id === 'hospital.anomaly.footsteps',
  );
  assert.equal(board.id, 'hospital');
  assert.equal(board.worldEnd, 5_000);
  assert.equal(board.chapters.length, 4);
  assert.equal(board.items.length, 0);
  assert.deepEqual(
    board.anomalies.map((anomaly) => anomaly.id),
    [
      'hospital.anomaly.footsteps',
      'hospital.anomaly.door-figure',
      'hospital.anomaly.wheelchair',
      'hospital.anomaly.ceiling',
    ],
  );
  assert.deepEqual(board.routeRules, []);
  assert.deepEqual(IMPROVEMENT_PROTOTYPE_REQUIRED_CAPTURES, [
    'hospital.anomaly.footsteps',
    'hospital.anomaly.door-figure',
    'hospital.anomaly.wheelchair',
  ]);
  assert.equal(normalFootsteps?.x, 600);
  assert.equal(prototypeFootsteps?.x, 400);
  assert.equal(
    getBoardDefinition('hospital').anomalies.find(
      (anomaly) => anomaly.id === 'hospital.anomaly.footsteps',
    )?.x,
    600,
  );
  assert.notStrictEqual(board.anomalies, normalBoard.anomalies);
});

test('prototype capture gates require the authored capture in the first three chapters', () => {
  const anomalies = [
    {
      id: 'hospital.anomaly.footsteps',
      captured: false,
      resolution: 'MISSED' as const,
    },
    {
      id: 'hospital.anomaly.door-figure',
      captured: false,
      resolution: null,
    },
  ];

  assert.deepEqual(evaluateImprovementPrototypeGate(1, anomalies), {
    status: 'BLOCK',
    anomalyId: 'hospital.anomaly.footsteps',
    retryX: 360,
    log: '【ROUTE LOCK】最初の異変を撮影するまで先へ進めない。PIPの照準を合わせてCAPTUREする。',
    chat: '今の足跡を右上で撮って。撮影しないと同接も危険度も動かない。',
  });

  const chapterOneRecorded = anomalies.map((anomaly) =>
    anomaly.id === 'hospital.anomaly.footsteps'
      ? { ...anomaly, captured: true, resolution: 'RECORDED' as const }
      : anomaly,
  );
  assert.deepEqual(
    evaluateImprovementPrototypeGate(1, chapterOneRecorded),
    { status: 'ALLOW' },
  );
  assert.equal(
    evaluateImprovementPrototypeGate(2, chapterOneRecorded).status,
    'BLOCK',
  );
  assert.equal(
    evaluateImprovementPrototypeGate(3, chapterOneRecorded).status,
    'BLOCK',
  );
});

test('player-facing route copy does not expose internal quality-gate language', () => {
  const board = createImprovementPrototypeBoard(getBoardDefinition('hospital'));
  const initialComments = createImprovementPrototypeComments(23_470);
  const blockedGateCopy = [1, 2, 3].flatMap((chapterId) => {
    const decision = evaluateImprovementPrototypeGate(chapterId, []);
    return decision.status === 'BLOCK' ? [decision.log, decision.chat] : [];
  });
  const playerFacingCopy = [
    board.title,
    board.subtitle,
    board.description,
    board.locationLabel,
    ...board.initialLogs,
    ...board.intros.flatMap((beat) => [beat.label, beat.text]),
    ...board.chapters.flatMap((chapter) => [
      chapter.title,
      chapter.subtitle,
      chapter.description,
    ]),
    ...blockedGateCopy,
    ...initialComments.flatMap((comment) => [comment.username, comment.text]),
  ].join('\n');

  assert.doesNotMatch(
    playerFacingCopy,
    /prototype|プロトタイプ|品質ゲート|required route|固定検証経路/i,
  );
  assert.equal(initialComments.length, 1);
  assert.equal(initialComments[0].type, 'system');
  assert.equal(initialComments[0].timestamp, 23_470);
});

test('the first 25 active seconds keep calibration Chat system-only', () => {
  assert.equal(shouldPublishPrototypeComment(0, 'system'), true);
  assert.equal(shouldPublishPrototypeComment(24_999, 'hint'), false);
  assert.equal(shouldPublishPrototypeComment(24_999, 'normal'), false);
  assert.equal(shouldPublishPrototypeComment(25_000, 'hint'), true);
});

test('a stale RECORDED resolution cannot satisfy a prototype capture gate', () => {
  const decision = evaluateImprovementPrototypeGate(1, [
    {
      id: 'hospital.anomaly.footsteps',
      captured: false,
      resolution: 'RECORDED',
    },
  ]);
  assert.equal(decision.status, 'BLOCK');
});

test('prototype duration classifies the inclusive 180 to 300 second target', () => {
  assert.equal(evaluateImprovementPrototypeDuration(179_999), 'UNDER_TARGET');
  assert.equal(evaluateImprovementPrototypeDuration(180_000), 'IN_TARGET');
  assert.equal(evaluateImprovementPrototypeDuration(300_000), 'IN_TARGET');
  assert.equal(evaluateImprovementPrototypeDuration(300_001), 'OVER_TARGET');
});

test('prototype active time keeps slow visible frames and excludes rebased hidden time', () => {
  assert.deepEqual(measurePrototypeActiveFrame(0, 1_000, true), {
    activeDeltaMs: 1_000,
    nextPreviousAtMs: 1_000,
  });
  assert.deepEqual(measurePrototypeActiveFrame(1_000, 241_000, false), {
    activeDeltaMs: 0,
    nextPreviousAtMs: 241_000,
  });
  assert.deepEqual(measurePrototypeActiveFrame(241_000, 241_016, true), {
    activeDeltaMs: 16,
    nextPreviousAtMs: 241_016,
  });
});

test('every required prototype anomaly has a reachable ACTIVE capture window before ignore', () => {
  const board = createImprovementPrototypeBoard(getBoardDefinition('hospital'));
  const basePlayer: Omit<PlayerState, 'x' | 'facing' | 'flashlightAngle'> = {
    speed: 0,
    isRunning: false,
    isCrouching: false,
    flashlightOn: true,
    battery: 100,
    tension: 10,
    health: 100,
  };

  IMPROVEMENT_PROTOTYPE_REQUIRED_CAPTURES.forEach((id, tierIndex) => {
    const authored = board.anomalies.find((anomaly) => anomaly.id === id);
    assert.ok(authored, `${id} is authored`);
    const anomaly = {
      ...authored,
      captured: false,
      resolution: null,
      directorState: {
        ...createAnomalyDirectorState(id, 0),
        phase: 'ACTIVE' as const,
      },
    };
    const definition = getAnomalyRuntimeDefinition(
      id,
      anomaly.sceneId ?? 'hospital-entry',
    );
    let reachable = false;

    for (
      let x = Math.max(0, anomaly.x - CAPTURE_MAX_DISTANCE + 1);
      x < anomaly.x + definition.ignorePastDistance && !reachable;
      x += 4
    ) {
      for (const facing of [1, -1] as const) {
        for (
          let pitch = -MAX_FLASHLIGHT_PITCH;
          pitch <= MAX_FLASHLIGHT_PITCH;
          pitch += 0.04
        ) {
          const player: PlayerState = {
            ...basePlayer,
            x,
            facing,
            flashlightAngle: pitch,
          };
          const snapshot = createSceneSnapshot({
            timestamp: 1_000,
            boardId: 'hospital',
            player,
            anomalies: [anomaly],
            items: [],
            mouse: { x: 0, y: 0 },
            isMoving: false,
          });
          if (evaluatePipCapture(snapshot, tierIndex as RiskTier).canCapture) {
            reachable = true;
            break;
          }
        }
        if (reachable) break;
      }
    }

    assert.equal(reachable, true, `${id} has a capture window before ignore`);
  });
});

test('resolved capture feedback distinguishes recorded, ignored and missed anomalies', () => {
  assert.match(getResolvedCaptureFailureCopy('RECORDED'), /記録済み/);
  assert.match(getResolvedCaptureFailureCopy('IGNORED'), /見送った/);
  assert.match(getResolvedCaptureFailureCopy('MISSED'), /撮影可能時間/);
});

test('the prototype ceiling encounter enters the reachable chase branch', () => {
  assert.equal(
    selectPrototypeScareType({
      improvementPrototype: true,
      anomalyX: 4_100,
      worldEnd: 5_000,
      currentChapterId: 4,
      totalChapters: 5,
    }),
    'chase',
  );
  assert.equal(
    selectPrototypeScareType({
      improvementPrototype: false,
      anomalyX: 4_100,
      worldEnd: 5_000,
      currentChapterId: 4,
      totalChapters: 5,
    }),
    'whisper',
  );
});

test('prototype completion requires the ordered capture, chase, exit and finish milestones', () => {
  const orderedIds = [
    'PLAYING_STARTED',
    'CAPTURED:hospital.anomaly.footsteps',
    'CAPTURED:hospital.anomaly.door-figure',
    'CAPTURED:hospital.anomaly.wheelchair',
    'CHASE_STARTED',
    'CHASE_CLEARED',
    'EXIT_USED',
    'RUN_FINISHED',
  ];
  const milestones = orderedIds.map((id, index) => ({
    id,
    elapsedMs: index * 1_000,
  }));
  assert.equal(hasCompleteImprovementPrototypeSequence(milestones), true);
  assert.equal(
    hasCompleteImprovementPrototypeSequence(
      milestones.filter((milestone) => milestone.id !== 'EXIT_USED'),
    ),
    false,
  );
  assert.equal(
    hasCompleteImprovementPrototypeSequence([
      ...milestones.slice(0, 4),
      milestones[6],
      milestones[4],
      milestones[5],
      milestones[7],
    ]),
    false,
  );
});
