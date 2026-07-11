import type { Anomaly, RiskTier } from '../types';
import type { SceneSnapshot } from './sceneSnapshot';
import {
  isAnomalyCaptureActive,
  isAnomalyResolved,
} from './anomalyDirector.ts';

export const CAPTURE_MAX_DISTANCE = 350;
export const PIP_LOGICAL_VIEW_WIDTH = 640;
export const PIP_LOGICAL_VIEW_HEIGHT = 300;
export const PIP_SOURCE_WIDTH = Math.round((PIP_LOGICAL_VIEW_HEIGHT * 16) / 9);

/**
 * The visible PIP crosshair is 64px wide on a 320px feed. Expressing the same
 * 20% window in scene pixels keeps capture framing aligned with that overlay.
 */
export const PIP_CAPTURE_FRAME_WIDTH = PIP_SOURCE_WIDTH * 0.2;

export type CaptureDecisionReason =
  | 'READY'
  | 'NO_TARGET'
  | 'RESOLVED'
  | 'RISK_LOCKED'
  | 'BATTERY_EMPTY'
  | 'FLASHLIGHT_OFF'
  | 'OUT_OF_RANGE'
  | 'OUT_OF_FRAME';

export interface CameraCaptureTarget {
  targetId: string | null;
  distance: number | null;
  isFramed: boolean;
  canCapture: boolean;
  reason: CaptureDecisionReason;
}

const worldToScreenX = (worldX: number, playerX: number) =>
  Math.round(worldX - (playerX - PIP_LOGICAL_VIEW_WIDTH * 0.42));

/**
 * Evaluates capture against the frame the delayed PIP actually displays.
 * This function is intentionally pure so the same decision can drive the
 * capture prompt, input handler, and focused behavior tests.
 */
export function evaluatePipCapture(
  snapshot: SceneSnapshot,
  riskTier: RiskTier,
): CameraCaptureTarget {
  const lookingRight = snapshot.mouse.x >= PIP_LOGICAL_VIEW_WIDTH * 0.42;
  const sourceX = lookingRight ? PIP_LOGICAL_VIEW_WIDTH - PIP_SOURCE_WIDTH : 0;
  const feedCenterX = sourceX + PIP_SOURCE_WIDTH / 2;
  const activeCandidates = snapshot.anomalies.filter(isAnomalyCaptureActive);
  const candidates = activeCandidates.length > 0
    ? activeCandidates
    : snapshot.anomalies.filter(isAnomalyResolved);
  const anomaly = candidates.reduce<Anomaly | null>((closest, candidate) => {
    if (!closest) return candidate;
    const candidateOffset = Math.abs(
      worldToScreenX(candidate.x, snapshot.player.x) - feedCenterX,
    );
    const closestOffset = Math.abs(
      worldToScreenX(closest.x, snapshot.player.x) - feedCenterX,
    );
    if (candidateOffset !== closestOffset) {
      return candidateOffset < closestOffset ? candidate : closest;
    }
    const candidateDistance = Math.abs(snapshot.player.x - candidate.x);
    const closestDistance = Math.abs(snapshot.player.x - closest.x);
    if (candidateDistance !== closestDistance) {
      return candidateDistance < closestDistance ? candidate : closest;
    }
    return candidate.id.localeCompare(closest.id) < 0 ? candidate : closest;
  }, null);

  if (!anomaly) {
    return {
      targetId: null,
      distance: null,
      isFramed: false,
      canCapture: false,
      reason: 'NO_TARGET',
    };
  }

  const distance = Math.abs(snapshot.player.x - anomaly.x);
  const anomalyScreenX = worldToScreenX(anomaly.x, snapshot.player.x);
  const isFramed =
    Math.abs(anomalyScreenX - feedCenterX) <= PIP_CAPTURE_FRAME_WIDTH / 2;

  const result = (reason: CaptureDecisionReason): CameraCaptureTarget => ({
    targetId: anomaly.id,
    distance,
    isFramed,
    canCapture: reason === 'READY',
    reason,
  });

  if (isAnomalyResolved(anomaly)) return result('RESOLVED');
  if (anomaly.visibleOnlyInPip && riskTier < 1) return result('RISK_LOCKED');
  if (snapshot.player.battery <= 0) return result('BATTERY_EMPTY');
  if (!snapshot.player.flashlightOn) return result('FLASHLIGHT_OFF');
  if (distance >= CAPTURE_MAX_DISTANCE) return result('OUT_OF_RANGE');
  if (!isFramed) return result('OUT_OF_FRAME');
  return result('READY');
}
