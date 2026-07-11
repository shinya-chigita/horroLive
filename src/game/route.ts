import type { GameItem } from '../types';
import type { BoardDefinition, BoardRouteRule } from './boardDefinitions';

export type RouteBoard = Pick<
  BoardDefinition,
  'id' | 'worldEnd' | 'routeRules'
>;

export type RouteDecision =
  | { status: 'ALLOW' }
  | {
      status: 'BLOCK';
      kind: BoardRouteRule['kind'];
      targetX: number;
      log: string;
      chat: string;
      loopCount: number;
    };

type RouteItem = Pick<GameItem, 'id' | 'found'>;

const normaliseLoopCount = (loopCount: number) =>
  Number.isFinite(loopCount) ? Math.max(0, Math.floor(loopCount)) : 0;

const hasRequirement = (
  items: readonly RouteItem[],
  requirementItemId: string,
) => items.some((item) => item.id === requirementItemId && item.found);

const assertTargetInBounds = (
  board: RouteBoard,
  rule: BoardRouteRule,
) => {
  if (
    !Number.isFinite(rule.targetX) ||
    rule.targetX < 0 ||
    rule.targetX >= board.worldEnd
  ) {
    throw new RangeError(
      `Route target ${rule.targetX} is outside board "${board.id}" (0-${board.worldEnd}).`,
    );
  }
};

/**
 * Evaluates chapter-exit rules without mutating run state. When more than one
 * rule is authored for a chapter, the first unmet requirement owns the route.
 */
export function evaluateRoute(
  board: RouteBoard,
  chapterId: number,
  items: readonly RouteItem[],
  loopCount = 0,
): RouteDecision {
  const rule = board.routeRules.find(
    (candidate) =>
      candidate.chapterId === chapterId &&
      !hasRequirement(items, candidate.requirementItemId),
  );

  if (!rule) return { status: 'ALLOW' };

  assertTargetInBounds(board, rule);
  const currentLoopCount = normaliseLoopCount(loopCount);

  return {
    status: 'BLOCK',
    kind: rule.kind,
    targetX: rule.targetX,
    log: rule.log,
    chat: rule.chat,
    loopCount: rule.kind === 'LOOP' ? currentLoopCount + 1 : currentLoopCount,
  };
}
