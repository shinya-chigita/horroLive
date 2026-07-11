export const CHAT_BOTTOM_THRESHOLD_PX = 32;

export type ChatFollowMode = 'FOLLOWING' | 'PAUSED';

export interface ChatScrollMetrics {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
}

export interface ChatFollowState {
  mode: ChatFollowMode;
  unreadCount: number;
}

export type ChatFollowAction =
  | { type: 'SCROLLED'; metrics: ChatScrollMetrics }
  | { type: 'MESSAGES_ADDED'; count: number }
  | { type: 'FOLLOW_REQUESTED' };

export function getDistanceFromBottom(metrics: ChatScrollMetrics): number {
  const { scrollHeight, scrollTop, clientHeight } = metrics;
  if (![scrollHeight, scrollTop, clientHeight].every(Number.isFinite)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, scrollHeight - scrollTop - clientHeight);
}

export function getChatFollowMode(
  metrics: ChatScrollMetrics,
  thresholdPx = CHAT_BOTTOM_THRESHOLD_PX,
): ChatFollowMode {
  return getDistanceFromBottom(metrics) <= thresholdPx
    ? 'FOLLOWING'
    : 'PAUSED';
}

export function countAddedMessageIds(
  previousIds: readonly string[],
  nextIds: readonly string[],
): number {
  const previous = new Set(previousIds);
  return new Set(nextIds.filter((id) => !previous.has(id))).size;
}

export function chatFollowReducer(
  state: ChatFollowState,
  action: ChatFollowAction,
): ChatFollowState {
  switch (action.type) {
    case 'SCROLLED': {
      const mode = getChatFollowMode(action.metrics);
      return {
        mode,
        unreadCount: mode === 'FOLLOWING' ? 0 : state.unreadCount,
      };
    }
    case 'MESSAGES_ADDED': {
      const count = Number.isFinite(action.count)
        ? Math.max(0, Math.floor(action.count))
        : 0;
      return state.mode === 'PAUSED'
        ? { ...state, unreadCount: state.unreadCount + count }
        : state;
    }
    case 'FOLLOW_REQUESTED':
      return { mode: 'FOLLOWING', unreadCount: 0 };
  }
}
