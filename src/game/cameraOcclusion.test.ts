import assert from 'node:assert/strict';
import test from 'node:test';
import type { Anomaly, PlayerState } from '../types.ts';
import { getAnomalyVisualProfile } from './anomalyPresentation.ts';
import { createAnomalyDirectorState } from './anomalyDirector.ts';
import { createBoardAnomalies } from './boardDefinitions.ts';
import { getPipCameraOcclusion } from './cameraOcclusion.ts';
import {
  projectPresentedAnomalyToCamera,
} from './cameraProjection.ts';

const camera = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  x: 300,
  speed: 0,
  isRunning: false,
  isCrouching: false,
  flashlightOn: true,
  facing: 1,
  flashlightAngle: 0,
  battery: 100,
  tension: 10,
  health: 100,
  ...overrides,
});

const activate = (anomaly: Anomaly): Anomaly => ({
  ...anomaly,
  directorState: {
    ...createAnomalyDirectorState(anomaly.id, 0),
    phase: 'ACTIVE',
  },
});

test('a bed suppresses a fully covered floor anomaly in the PIP feed', () => {
  const player = camera();
  const footsteps = activate(
    createBoardAnomalies('hospital').find(
      (anomaly) => anomaly.id === 'hospital.anomaly.footsteps',
    )!,
  );
  const visual = getAnomalyVisualProfile(footsteps, 'pip', 0);
  const projection = projectPresentedAnomalyToCamera(
    footsteps,
    player,
    visual.approachOffsetPx,
  );
  const occlusion = getPipCameraOcclusion(
    projection,
    player,
    'hospital',
  );

  assert.equal(occlusion.occluded, true);
  assert.equal(occlusion.blockerId, 'entry-bed');
  assert.ok(occlusion.coverage >= 0.82);
});

test('a target in front of the same bed remains visible', () => {
  const player = camera({ x: 700, facing: -1 });
  const subject = activate({
    id: 'test.front-subject',
    x: 600,
    width: 46,
    type: 'ghost',
    description: 'front subject',
    points: 0,
    captured: false,
    visibleOnlyInPip: false,
  });
  const projection = projectPresentedAnomalyToCamera(subject, player);
  assert.equal(
    getPipCameraOcclusion(projection, player, 'hospital').occluded,
    false,
  );
});
