import type { Anomaly, RiskTier } from '../types';
import type { SceneSnapshot } from './sceneSnapshot';
import {
  isAnomalyCaptureActive,
  isAnomalyResolved,
} from './anomalyDirector.ts';
import {
  createCenteredCameraFrame,
  isInCameraFrame,
  projectPresentedAnomalyToCamera,
} from './cameraProjection.ts';
import type { ProjectedCameraTarget } from './cameraProjection.ts';
import { getAnomalyVisualProfile } from './anomalyPresentation.ts';
import { getPipCameraOcclusion } from './cameraOcclusion.ts';

export const CAPTURE_MAX_DISTANCE = 350;
export const PIP_LOGICAL_VIEW_WIDTH = 640;
export const PIP_LOGICAL_VIEW_HEIGHT = 300;
export const PIP_SOURCE_WIDTH = Math.round((PIP_LOGICAL_VIEW_HEIGHT * 16) / 9);

/**
 * The corridor camera has no free horizontal yaw: the player chooses corridor
 * direction and vertical pitch. A broad acquisition frame keeps side-wall
 * subjects recordable while still requiring them to be visibly on screen.
 * PipCameraV2 renders this exact frame, so the lock UI and gameplay decision
 * stay aligned.
 */
export const PIP_CAPTURE_FRAME_WIDTH_RATIO = 0.64;
export const PIP_CAPTURE_FRAME_HEIGHT_RATIO = 0.64;
export const PIP_CAPTURE_FRAME_WIDTH =
  PIP_SOURCE_WIDTH * PIP_CAPTURE_FRAME_WIDTH_RATIO;

export const createPipCaptureFrame = () =>
  createCenteredCameraFrame(
    undefined,
    PIP_CAPTURE_FRAME_WIDTH_RATIO,
    PIP_CAPTURE_FRAME_HEIGHT_RATIO,
  );

export type CaptureDecisionReason =
  | 'READY'
  | 'NO_TARGET'
  | 'RESOLVED'
  | 'RISK_LOCKED'
  | 'BATTERY_EMPTY'
  | 'FLASHLIGHT_OFF'
  | 'OUT_OF_RANGE'
  | 'OUT_OF_FRAME'
  | 'OCCLUDED';

export interface CameraCaptureTarget {
  targetId: string | null;
  distance: number | null;
  isFramed: boolean;
  canCapture: boolean;
  reason: CaptureDecisionReason;
  projection?: CameraTargetProjection;
}

export interface CameraTargetProjection {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}

export const toCameraTargetProjection = (
  projected: ProjectedCameraTarget,
): CameraTargetProjection => ({
  centerX: projected.centerX,
  centerY: projected.centerY,
  width: projected.width,
  height: projected.height,
  viewportWidth: projected.viewportWidth,
  viewportHeight: projected.viewportHeight,
});

/**
 * Evaluates capture against the frame the delayed PIP actually displays.
 * This function is intentionally pure so the same decision can drive the
 * capture prompt, input handler, and focused behavior tests.
 */
export function evaluatePipCapture(
  snapshot: SceneSnapshot,
  riskTier: RiskTier,
  loopCount = 0,
): CameraCaptureTarget {
  const activeCandidates = snapshot.anomalies.filter(isAnomalyCaptureActive);
  const candidates = activeCandidates.length > 0
    ? activeCandidates
    : snapshot.anomalies.filter(isAnomalyResolved);
  const frame = createPipCaptureFrame();
  const projectCandidate = (candidate: Anomaly) => {
    const visual = getAnomalyVisualProfile(candidate, 'pip', riskTier);
    const loopApproach =
      candidate.id === 'school.anomaly.landing'
        ? Math.max(0, loopCount) * 12
        : 0;
    return projectPresentedAnomalyToCamera(
      candidate,
      snapshot.player,
      visual.approachOffsetPx + loopApproach,
    );
  };
  const anomaly = candidates.reduce<Anomaly | null>((closest, candidate) => {
    if (!closest) return candidate;
    const projectedCandidate = projectCandidate(candidate);
    const projectedClosest = projectCandidate(closest);
    const candidateOffset = Math.hypot(
      projectedCandidate.centerX - frame.centerX,
      projectedCandidate.centerY - frame.centerY,
    );
    const closestOffset = Math.hypot(
      projectedClosest.centerX - frame.centerX,
      projectedClosest.centerY - frame.centerY,
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
  const projected = projectCandidate(anomaly);
  const isFramed = isInCameraFrame(projected, frame);
  const occlusion = getPipCameraOcclusion(
    projected,
    snapshot.player,
    snapshot.boardId,
  );

  const result = (reason: CaptureDecisionReason): CameraCaptureTarget => ({
    targetId: anomaly.id,
    distance,
    isFramed: reason === 'OCCLUDED' ? false : isFramed,
    canCapture: reason === 'READY',
    reason,
    projection: toCameraTargetProjection(projected),
  });

  if (isAnomalyResolved(anomaly)) return result('RESOLVED');
  if (occlusion.occluded) return result('OCCLUDED');
  if (anomaly.visibleOnlyInPip && riskTier < 1) return result('RISK_LOCKED');
  if (snapshot.player.battery <= 0) return result('BATTERY_EMPTY');
  if (!snapshot.player.flashlightOn) return result('FLASHLIGHT_OFF');
  if (distance >= CAPTURE_MAX_DISTANCE) return result('OUT_OF_RANGE');
  if (!isFramed) return result('OUT_OF_FRAME');
  return result('READY');
}
