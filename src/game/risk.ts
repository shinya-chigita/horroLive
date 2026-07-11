import type { RiskTier } from '../types';

export const VIEWER_BANDS = [237, 2_370, 23_700, 237_000] as const;

export type ViewerBand = (typeof VIEWER_BANDS)[number];

export interface ViewerRiskState {
  chapterId: string;
  viewerCount: number;
  tier: RiskTier;
  firedBands: readonly ViewerBand[];
}

export interface ViewerRiskUpdate {
  chapterId?: string;
  viewerCount: number;
}

export interface ViewerRiskTransition {
  state: ViewerRiskState;
  /** Threshold events to dispatch, in ascending order. */
  triggeredBands: readonly ViewerBand[];
}

const sanitizeViewerCount = (viewerCount: number) =>
  Number.isFinite(viewerCount) ? Math.max(0, Math.floor(viewerCount)) : 0;

export function getRiskTier(viewerCount: number): RiskTier {
  const count = sanitizeViewerCount(viewerCount);
  if (count >= VIEWER_BANDS[3]) return 3;
  if (count >= VIEWER_BANDS[2]) return 2;
  if (count >= VIEWER_BANDS[1]) return 1;
  return 0;
}

export function getViewerBand(tier: RiskTier): ViewerBand {
  return VIEWER_BANDS[tier];
}

/**
 * Creates a chapter-local risk state. Thresholds start unfired so the first
 * update can emit the chapter's opening band (normally 237).
 */
export function createViewerRiskState(
  chapterId: string,
  viewerCount = 0,
): ViewerRiskState {
  const count = sanitizeViewerCount(viewerCount);
  return {
    chapterId,
    viewerCount: count,
    tier: getRiskTier(count),
    firedBands: [],
  };
}

/**
 * Advances risk without allowing a same-chapter tier downgrade. Every reached
 * threshold is returned once; moving to another chapter resets that ledger.
 */
export function transitionViewerRisk(
  current: ViewerRiskState,
  update: ViewerRiskUpdate,
): ViewerRiskTransition {
  const chapterId = update.chapterId ?? current.chapterId;
  const viewerCount = sanitizeViewerCount(update.viewerCount);
  const changedChapter = chapterId !== current.chapterId;
  const previouslyFired = new Set<ViewerBand>(
    changedChapter ? [] : current.firedBands,
  );
  const triggeredBands = VIEWER_BANDS.filter(
    (band) => viewerCount >= band && !previouslyFired.has(band),
  );

  triggeredBands.forEach((band) => previouslyFired.add(band));

  const measuredTier = getRiskTier(viewerCount);
  const tier = changedChapter
    ? measuredTier
    : (Math.max(current.tier, measuredTier) as RiskTier);

  return {
    state: {
      chapterId,
      viewerCount,
      tier,
      firedBands: VIEWER_BANDS.filter((band) => previouslyFired.has(band)),
    },
    triggeredBands,
  };
}
