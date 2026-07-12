import assert from 'node:assert/strict';
import test from 'node:test';
import type { BoardId, PlayerState } from '../types.ts';
import {
  createSceneSnapshot,
  SceneSnapshotHistory,
  type SceneSnapshotInput,
} from './sceneSnapshot.ts';

const player = (x: number): PlayerState => ({
  x,
  speed: 1.8,
  isRunning: false,
  isCrouching: false,
  flashlightOn: true,
  facing: 1,
  flashlightAngle: 0,
  battery: 100,
  tension: 10,
  health: 100,
});

const input = (
  boardId: BoardId,
  timestamp: number,
  x: number,
): SceneSnapshotInput => ({
  boardId,
  timestamp,
  player: player(x),
  anomalies: [],
  items: [],
  mouse: { x: 520, y: 150 },
  isMoving: false,
});

test('scene lookup is scoped to the selected board', () => {
  const hospital = createSceneSnapshot(input('hospital', 100, 1_500));
  const school = createSceneSnapshot(input('school', 100, 1_500));

  assert.equal(hospital.sceneId, 'hospital-ward-a');
  assert.equal(school.sceneId, 'school-classrooms');
  assert.notEqual(hospital.sceneId, school.sceneId);
});

test('history discards the previous board even when coordinates are nearby', () => {
  const history = new SceneSnapshotHistory();
  history.record(input('hospital', 100, 1_000));
  history.record(input('school', 200, 1_010));

  assert.equal(history.latest()?.boardId, 'school');
  assert.equal(history.atOrBefore(100)?.boardId, 'school');
});

test('snapshots clone mutable player state', () => {
  const source = input('school', 100, 2_000);
  const snapshot = createSceneSnapshot(source);
  source.player.x = 400;

  assert.equal(snapshot.player.x, 2_000);
});
