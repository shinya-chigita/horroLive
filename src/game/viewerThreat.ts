import type { CameraCaptureTarget } from './capture.ts';
import {
  CAPTURE_MAX_DISTANCE,
  toCameraTargetProjection,
} from './capture.ts';
import {
  DEFAULT_CAMERA_PROJECTION,
  createCenteredCameraFrame,
  isInCameraFrame,
  projectCorridorAnchor,
} from './cameraProjection.ts';
import type { PlayerState, RiskTier } from '../types.ts';
import type { BoardId } from '../types.ts';
import { getPipCameraOcclusion } from './cameraOcclusion.ts';

export type ViewerThreatStage = 'absent' | 'far' | 'mid' | 'shoulder';

export interface ViewerThreatProfile {
  riskTier: RiskTier;
  stage: ViewerThreatStage;
  /** Approximate world-space distance between the stream observer and player. */
  distance: number | null;
  pipVisible: boolean;
  /** Duration of one partial Main-channel appearance. Zero disables bleeding. */
  mainBleedDurationMs: number;
  /** Deterministic interval between Main-channel appearances. */
  mainBleedPeriodMs: number;
  suppressHumanChat: boolean;
}

export interface ViewerThreatRigState {
  flashlightOn: boolean;
  battery: number;
}

export type ViewerThreatCameraState = ViewerThreatRigState &
  Pick<PlayerState, 'x' | 'facing' | 'flashlightAngle'>;

export interface ViewerThreatCameraPresentation {
  id: 'stream.observer';
  visible: true;
  distance: number;
  lateral: number;
  elevation: number;
  worldWidth: number;
  worldHeight: number;
  alpha: number;
}

const VIEWER_THREAT_PROFILES: Readonly<Record<RiskTier, ViewerThreatProfile>> =
  Object.freeze({
    0: Object.freeze({
      riskTier: 0,
      stage: 'absent',
      distance: null,
      pipVisible: false,
      mainBleedDurationMs: 0,
      mainBleedPeriodMs: 0,
      suppressHumanChat: false,
    }),
    1: Object.freeze({
      riskTier: 1,
      stage: 'far',
      distance: 520,
      pipVisible: true,
      mainBleedDurationMs: 0,
      mainBleedPeriodMs: 0,
      suppressHumanChat: false,
    }),
    2: Object.freeze({
      riskTier: 2,
      stage: 'mid',
      distance: 240,
      pipVisible: true,
      mainBleedDurationMs: 160,
      mainBleedPeriodMs: 3_600,
      suppressHumanChat: false,
    }),
    3: Object.freeze({
      riskTier: 3,
      stage: 'shoulder',
      distance: 80,
      pipVisible: true,
      mainBleedDurationMs: 260,
      mainBleedPeriodMs: 2_400,
      suppressHumanChat: true,
    }),
  });

/** Returns the immutable physical-threat contract for one viewer-risk tier. */
export function getViewerThreatProfile(
  riskTier: RiskTier,
): ViewerThreatProfile {
  return VIEWER_THREAT_PROFILES[riskTier];
}

const VIEWER_THREAT_TENSION_FLOORS: Readonly<Record<RiskTier, number>> =
  Object.freeze({
    0: 9,
    1: 18,
    2: 32,
    3: 48,
  });

/**
 * Turns stream growth into persistent gameplay pressure. The observer never
 * causes unavoidable damage by itself, but every successful capture raises the
 * calm-state floor before the authored chase supplies the lethal pressure.
 */
export function getViewerThreatTensionFloor(riskTier: RiskTier): number {
  return VIEWER_THREAT_TENSION_FLOORS[riskTier];
}

/**
 * Owns the single camera-space presentation used by both PIP rendering and
 * synthetic capture framing. Keeping this mapping here prevents a drawn
 * observer and its AF target from drifting apart.
 */
export function getViewerThreatCameraPresentation(
  profile: ViewerThreatProfile,
  loopCount = 0,
): ViewerThreatCameraPresentation | null {
  if (!profile.pipVisible || profile.distance === null) return null;
  return {
    id: 'stream.observer',
    visible: true,
    distance: Math.max(
      DEFAULT_CAMERA_PROJECTION.nearDistance + 8,
      profile.distance - Math.max(0, loopCount) * 14,
    ),
    lateral:
      profile.stage === 'far'
        ? 0.68
        : profile.stage === 'mid'
          ? -0.4
          : 0.1,
    elevation: profile.stage === 'shoulder' ? 0.48 : 0.42,
    worldWidth: profile.stage === 'shoulder' ? 76 : 58,
    worldHeight: profile.stage === 'shoulder' ? 178 : 164,
    alpha:
      profile.stage === 'shoulder'
        ? 0.44
        : profile.stage === 'mid'
          ? 0.3
          : 0.2,
  };
}

/**
 * Returns true only inside the authored periodic bleed window. Reduced-motion
 * mode removes the brief Main-channel flash while preserving PIP distance and
 * Chat suppression through the rest of the profile.
 */
export function shouldRenderMainBleed(
  nowMs: number,
  riskTier: RiskTier,
  reducedMotion: boolean,
): boolean {
  if (!Number.isFinite(nowMs) || nowMs < 0 || reducedMotion) return false;
  const profile = getViewerThreatProfile(riskTier);
  if (
    profile.mainBleedDurationMs <= 0 ||
    profile.mainBleedPeriodMs <= 0
  ) {
    return false;
  }

  return nowMs % profile.mainBleedPeriodMs < profile.mainBleedDurationMs;
}

const noThreatTarget = (): CameraCaptureTarget => ({
  targetId: null,
  distance: null,
  isFramed: false,
  canCapture: false,
  reason: 'NO_TARGET',
});

/**
 * Exposes the persistent stream observer as a capture target only during the
 * authored climax. It deliberately reuses the normal CameraCaptureTarget
 * contract so PIP UI and capture feedback do not need a special code path.
 */
export function createSyntheticThreatCaptureTarget(
  profile: ViewerThreatProfile,
  climaxActive: boolean,
  camera: ViewerThreatCameraState,
  loopCount = 0,
  boardId?: BoardId,
): CameraCaptureTarget {
  const presentation = getViewerThreatCameraPresentation(profile, loopCount);
  if (!climaxActive || !presentation) {
    return noThreatTarget();
  }

  const projection = projectCorridorAnchor(
    {
      id: presentation.id,
      worldX: camera.x + camera.facing * presentation.distance,
      lateral: presentation.lateral,
      elevation: presentation.elevation,
      worldWidth: presentation.worldWidth,
      worldHeight: presentation.worldHeight,
      surface: 'floor',
    },
    camera,
  );
  // Matches the visible 64%-by-64% acquisition frame on the PIP canvas. The
  // smaller face-recognition box is a presentation cue, not the capture gate.
  const isFramed = isInCameraFrame(
    projection,
    createCenteredCameraFrame(undefined, 0.64, 0.64),
  );
  const isOccluded = boardId
    ? getPipCameraOcclusion(projection, camera, boardId).occluded
    : false;

  const result = (
    reason: CameraCaptureTarget['reason'],
  ): CameraCaptureTarget => ({
    targetId: 'stream.observer',
    distance: presentation.distance,
    isFramed: reason === 'OCCLUDED' ? false : isFramed,
    canCapture: reason === 'READY',
    reason,
    projection: toCameraTargetProjection(projection),
  });

  if (!Number.isFinite(camera.battery) || camera.battery <= 0) {
    return result('BATTERY_EMPTY');
  }
  if (!camera.flashlightOn) return result('FLASHLIGHT_OFF');
  if (presentation.distance >= CAPTURE_MAX_DISTANCE) {
    return result('OUT_OF_RANGE');
  }
  if (isOccluded) return result('OCCLUDED');
  if (!isFramed) return result('OUT_OF_FRAME');
  return result('READY');
}
