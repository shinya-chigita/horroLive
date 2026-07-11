import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateRoute, type RouteBoard } from './route.ts';

const HOSPITAL_BOARD = {
  id: 'hospital',
  worldEnd: 5_000,
  routeRules: [
    {
      chapterId: 2,
      requirementItemId: 'KEYCARD_BLUE',
      kind: 'LOCK',
      targetX: 2_320,
      log: '【LOCKED】診察室は施錠されている。第一病棟でカードキーを探せ。',
      chat: 'カードキー取り忘れてる。開いたロッカーの近く！',
    },
  ],
} satisfies RouteBoard;

const SCHOOL_BOARD = {
  id: 'school',
  worldEnd: 3_600,
  routeRules: [
    {
      chapterId: 2,
      requirementItemId: 'SCHOOL_TAPE',
      kind: 'LOOP',
      targetX: 980,
      log: '【ROUTE LOOP】階段を上ったはずが、2年B組前へ戻っている。録音テープを探せ。',
      chat: 'また同じ廊下。右上だけ、戻る前の映像が残ってる',
    },
  ],
} satisfies RouteBoard;

const missingItem = (id: string) => [{ id, found: false }];
const foundItem = (id: string) => [{ id, found: true }];

test('hospital blocks the clinical-wing route until the blue keycard is found', () => {
  const decision = evaluateRoute(
    HOSPITAL_BOARD,
    2,
    missingItem('KEYCARD_BLUE'),
  );

  assert.equal(decision.status, 'BLOCK');
  if (decision.status !== 'BLOCK') return;
  assert.equal(decision.kind, 'LOCK');
  assert.equal(decision.targetX, 2_320);
  assert.match(decision.log, /LOCKED/);
  assert.match(decision.chat, /カードキー/);
  assert.equal(decision.loopCount, 0);
});

test('hospital allows the route after its required keycard is found', () => {
  assert.deepEqual(
    evaluateRoute(HOSPITAL_BOARD, 2, foundItem('KEYCARD_BLUE')),
    { status: 'ALLOW' },
  );
});

test('school loops the corridor and advances the loop count without its tape', () => {
  const decision = evaluateRoute(
    SCHOOL_BOARD,
    2,
    missingItem('SCHOOL_TAPE'),
    2,
  );

  assert.equal(decision.status, 'BLOCK');
  if (decision.status !== 'BLOCK') return;
  assert.equal(decision.kind, 'LOOP');
  assert.equal(decision.targetX, 980);
  assert.match(decision.log, /ROUTE LOOP/);
  assert.match(decision.chat, /同じ廊下/);
  assert.equal(decision.loopCount, 3);
});

test('school allows the route after its required recording tape is found', () => {
  assert.deepEqual(
    evaluateRoute(SCHOOL_BOARD, 2, foundItem('SCHOOL_TAPE'), 4),
    { status: 'ALLOW' },
  );
});

test('a chapter without a route rule is allowed', () => {
  assert.deepEqual(
    evaluateRoute(SCHOOL_BOARD, 1, missingItem('SCHOOL_TAPE')),
    { status: 'ALLOW' },
  );
});

test('every authored blocking target remains inside its board bounds', () => {
  for (const board of [HOSPITAL_BOARD, SCHOOL_BOARD]) {
    for (const rule of board.routeRules) {
      const decision = evaluateRoute(
        board,
        rule.chapterId,
        missingItem(rule.requirementItemId),
      );
      assert.equal(decision.status, 'BLOCK');
      if (decision.status !== 'BLOCK') continue;
      assert.ok(decision.targetX >= 0);
      assert.ok(decision.targetX < board.worldEnd);
    }
  }
});
