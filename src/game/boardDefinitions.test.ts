import assert from 'node:assert/strict';
import test from 'node:test';
import { VIEWER_BANDS } from './risk.ts';
import {
  BOARD_DEFINITIONS,
  BOARD_IDS,
  type BoardDefinition,
} from './boardDefinitions.ts';
import {
  getItemWorldPositions,
  getSceneDefinitions,
} from './sceneDefinitions.ts';

const boards = BOARD_IDS.map((boardId) => BOARD_DEFINITIONS[boardId]);

const assertUnique = (values: readonly string[], label: string) => {
  assert.equal(
    new Set(values).size,
    values.length,
    `${label} identifiers must be unique`,
  );
};

const assertContiguousBounds = (
  bounds: readonly { start: number; end: number }[],
  worldEnd: number,
  label: string,
) => {
  assert.ok(bounds.length > 0, `${label} must not be empty`);
  assert.equal(bounds[0].start, 0, `${label} must begin at zero`);

  bounds.forEach((bound, index) => {
    assert.ok(bound.end > bound.start, `${label}[${index}] must have positive length`);
    if (index > 0) {
      assert.equal(
        bound.start,
        bounds[index - 1].end,
        `${label}[${index}] must touch the preceding bound`,
      );
    }
  });

  const finalEnd = bounds[bounds.length - 1].end;
  assert.ok(finalEnd >= worldEnd, `${label} must cover the board endpoint`);
  assert.ok(finalEnd <= worldEnd + 1, `${label} must not extend beyond the endpoint sentinel`);
};

test('the board catalogue and authored identifiers are unique', () => {
  assert.deepEqual(BOARD_IDS, ['hospital', 'school']);
  assertUnique(boards.map((board) => board.id), 'board');
  assertUnique(boards.map((board) => board.code), 'board code');

  const allItemIds = boards.flatMap((board) => board.items.map((item) => item.id));
  const allAnomalyIds = boards.flatMap((board) =>
    board.anomalies.map((anomaly) => anomaly.id),
  );
  const allSceneIds = boards.flatMap((board) =>
    getSceneDefinitions(board.id).map((scene) => scene.id),
  );

  assertUnique(allItemIds, 'item');
  assertUnique(allAnomalyIds, 'anomaly');
  assertUnique(allSceneIds, 'scene');

  for (const board of boards) {
    assertUnique(board.chapters.map((chapter) => String(chapter.id)), `${board.id} chapter`);
    assertUnique(
      getSceneDefinitions(board.id).flatMap((scene) => scene.props.map((prop) => prop.id)),
      `${board.id} prop`,
    );
  }
});

test('chapter and scene bounds continuously cover each board', () => {
  for (const board of boards) {
    assertContiguousBounds(
      board.chapters.map((chapter) => ({
        start: chapter.startPos,
        end: chapter.endPos,
      })),
      board.worldEnd,
      `${board.id} chapters`,
    );

    assertContiguousBounds(
      getSceneDefinitions(board.id).map((scene) => ({
        start: scene.startX,
        end: scene.endX,
      })),
      board.worldEnd,
      `${board.id} scenes`,
    );
  }
});

test('every board item has exactly one in-bounds world coordinate', () => {
  for (const board of boards) {
    const positions = getItemWorldPositions(board.id);
    assert.deepEqual(
      Object.keys(positions).sort(),
      board.items.map((item) => item.id).sort(),
      `${board.id} item definitions and positions must match`,
    );

    for (const [itemId, worldX] of Object.entries(positions)) {
      assert.ok(Number.isFinite(worldX), `${itemId} position must be finite`);
      assert.ok(worldX >= 0 && worldX < board.worldEnd, `${itemId} must be inside the board`);
    }
  }
});

test('anomalies stay inside their owned scene and board', () => {
  for (const board of boards) {
    const scenes = getSceneDefinitions(board.id);

    for (const anomaly of board.anomalies) {
      assert.ok(anomaly.x >= 0 && anomaly.x < board.worldEnd, `${anomaly.id} must be in bounds`);
      assert.ok(anomaly.width > 0, `${anomaly.id} must have a positive capture width`);
      assert.ok(anomaly.sceneId, `${anomaly.id} must own a scene`);

      const scene = scenes.find((candidate) => candidate.id === anomaly.sceneId);
      assert.ok(scene, `${anomaly.id} references an unknown scene`);
      if (!scene) continue;
      assert.ok(
        anomaly.x >= scene.startX && anomaly.x < scene.endX,
        `${anomaly.id} must be positioned inside ${scene.id}`,
      );
    }
  }
});

test('route rules reference authored chapters and required items', () => {
  for (const board of boards) {
    const chapterIds = new Set(board.chapters.map((chapter) => chapter.id));
    const itemIds = new Set(board.items.map((item) => item.id));

    for (const rule of board.routeRules) {
      assert.equal(chapterIds.has(rule.chapterId), true, `${board.id} route chapter must exist`);
      assert.equal(itemIds.has(rule.requirementItemId), true, `${board.id} route item must exist`);
      assert.ok(rule.targetX >= 0 && rule.targetX < board.worldEnd, `${board.id} route target must be in bounds`);
    }
  }
});

test('every board authors the complete four-band risk escalation', () => {
  for (const board of boards) {
    const authoredBands = Object.keys(board.riskCues)
      .map(Number)
      .sort((left, right) => left - right);
    assert.deepEqual(authoredBands, [...VIEWER_BANDS], `${board.id} risk bands must be complete`);

    for (const band of VIEWER_BANDS) {
      const cue = board.riskCues[band];
      assert.ok(cue.username.length > 0);
      assert.ok(cue.text.length > 0);
      assert.ok(cue.log.length > 0);
    }
  }
});

test('Deep Broadcast is strictly harsher than Standard on every board', () => {
  const assertHarder = (board: BoardDefinition) => {
    const standard = board.modes.STANDARD;
    const deep = board.modes.DEEP_BROADCAST;

    assert.ok(deep.initialRiskTier > standard.initialRiskTier);
    assert.ok(deep.initialBattery < standard.initialBattery);
    assert.ok(deep.initialTension > standard.initialTension);
    assert.ok(deep.batteryDrainMultiplier > standard.batteryDrainMultiplier);
    assert.ok(deep.telegraphDurationMultiplier < standard.telegraphDurationMultiplier);
    assert.ok(deep.activeWindowMultiplier < standard.activeWindowMultiplier);
  };

  boards.forEach(assertHarder);
});

test('Standard mode can reach each board archive ending without a risk deadlock', () => {
  for (const board of boards) {
    let tier = board.modes.STANDARD.initialRiskTier;
    let recorded = 0;

    for (const anomaly of [...board.anomalies].sort((left, right) => left.x - right.x)) {
      if (anomaly.visibleOnlyInPip && tier < 1) continue;
      recorded += 1;
      tier = Math.min(3, tier + 1) as 0 | 1 | 2 | 3;
    }

    assert.ok(
      recorded >= Math.max(1, board.anomalies.length - 1),
      `${board.id} Standard run must be able to satisfy its archive threshold`,
    );
  }
});
