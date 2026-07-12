import type { Anomaly, PlayerState } from '../types.ts';
import type { WorldPropDefinition } from './sceneDefinitions.ts';
import { MAX_AIM_TRANSITION_PITCH } from './aim.ts';

export type CameraSurface =
  | 'floor'
  | 'left-wall'
  | 'right-wall'
  | 'ceiling';

/**
 * A view-independent anchor inside the existing one-dimensional corridor.
 *
 * `lateral` is normalized from the world's left wall (-1) to right wall (+1),
 * while `elevation` is normalized from floor (0) to ceiling (1). The virtual
 * dimensions intentionally use the same loose world-unit scale as corridor X;
 * they are projected to pixels by the camera focal length.
 */
export interface CorridorCameraAnchor {
  readonly id: string;
  readonly worldX: number;
  readonly lateral: number;
  readonly elevation: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly surface: CameraSurface;
}

export interface CameraViewport {
  readonly width: number;
  readonly height: number;
}

export interface CameraProjectionConfig extends CameraViewport {
  readonly nearDistance: number;
  readonly farDistance: number;
  readonly focalLength: number;
  readonly corridorHalfWidth: number;
  readonly corridorHeight: number;
  readonly cameraElevation: number;
  readonly baseHorizonRatio: number;
  readonly pitchShiftRatio: number;
  readonly maxHorizonShiftRatio: number;
}

export interface CameraPose extends CameraViewport {
  readonly playerX: number;
  readonly facing: PlayerState['facing'];
  readonly pitch: number;
  readonly horizonY: number;
}

export interface ProjectedCameraTarget {
  readonly id: string;
  readonly surface: CameraSurface;
  readonly forwardDistance: number;
  /** 0 at the near plane, 1 at the far plane. */
  readonly depth: number;
  readonly scale: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly visible: boolean;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
}

export interface CameraFrame {
  readonly centerX: number;
  readonly centerY: number;
  readonly width: number;
  readonly height: number;
}

interface CameraProfile {
  readonly placement: 'floor' | 'wall' | 'ceiling' | 'center';
  readonly elevation: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly lateralSpread?: number;
}

export const DEFAULT_CAMERA_PROJECTION: CameraProjectionConfig = {
  width: 320,
  height: 180,
  nearDistance: 24,
  farDistance: 900,
  focalLength: 150,
  corridorHalfWidth: 120,
  corridorHeight: 220,
  cameraElevation: 0.55,
  baseHorizonRatio: 0.47,
  pitchShiftRatio: 0.58,
  maxHorizonShiftRatio: 0.28,
};

const PROP_CAMERA_PROFILES: Readonly<
  Record<WorldPropDefinition['kind'], CameraProfile>
> = {
  window: {
    placement: 'wall',
    elevation: 0.66,
    worldWidth: 92,
    worldHeight: 78,
  },
  bed: {
    placement: 'floor',
    elevation: 0.16,
    worldWidth: 132,
    worldHeight: 72,
    lateralSpread: 0.52,
  },
  wheelchair: {
    placement: 'floor',
    elevation: 0.24,
    worldWidth: 82,
    worldHeight: 106,
    lateralSpread: 0.58,
  },
  door: {
    placement: 'wall',
    elevation: 0.43,
    worldWidth: 94,
    worldHeight: 188,
  },
  locker: {
    placement: 'floor',
    elevation: 0.37,
    worldWidth: 72,
    worldHeight: 164,
    lateralSpread: 0.7,
  },
  gurney: {
    placement: 'floor',
    elevation: 0.17,
    worldWidth: 126,
    worldHeight: 78,
    lateralSpread: 0.48,
  },
  'iv-stand': {
    placement: 'floor',
    elevation: 0.34,
    worldWidth: 52,
    worldHeight: 154,
    lateralSpread: 0.62,
  },
  'medicine-cart': {
    placement: 'floor',
    elevation: 0.23,
    worldWidth: 84,
    worldHeight: 104,
    lateralSpread: 0.58,
  },
  crt: {
    placement: 'floor',
    elevation: 0.2,
    worldWidth: 76,
    worldHeight: 82,
    lateralSpread: 0.62,
  },
  curtain: {
    placement: 'center',
    elevation: 0.51,
    worldWidth: 144,
    worldHeight: 182,
    lateralSpread: 0.18,
  },
  'wet-reflection': {
    placement: 'floor',
    elevation: 0.01,
    worldWidth: 130,
    worldHeight: 16,
    lateralSpread: 0.28,
  },
  altar: {
    placement: 'center',
    elevation: 0.24,
    worldWidth: 158,
    worldHeight: 112,
  },
  exit: {
    placement: 'wall',
    elevation: 0.43,
    worldWidth: 98,
    worldHeight: 190,
  },
  'shoe-lockers': {
    placement: 'wall',
    elevation: 0.36,
    worldWidth: 138,
    worldHeight: 150,
  },
  blackboard: {
    placement: 'wall',
    elevation: 0.62,
    worldWidth: 154,
    worldHeight: 88,
  },
  'school-desks': {
    placement: 'floor',
    elevation: 0.16,
    worldWidth: 150,
    worldHeight: 76,
    lateralSpread: 0.38,
  },
  speaker: {
    placement: 'wall',
    elevation: 0.82,
    worldWidth: 48,
    worldHeight: 54,
  },
  stairs: {
    placement: 'center',
    elevation: 0.24,
    worldWidth: 190,
    worldHeight: 118,
  },
  graffiti: {
    placement: 'wall',
    elevation: 0.62,
    worldWidth: 106,
    worldHeight: 46,
  },
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Stable FNV-1a hash so authored IDs always select the same wall/lane. */
export function stableCameraHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const hashUnit = (value: string) => stableCameraHash(value) / 0xffffffff;

const deterministicSign = (value: string): -1 | 1 =>
  (stableCameraHash(value) & 1) === 0 ? -1 : 1;

const deterministicFloorLane = (id: string, spread: number) => {
  const unit = hashUnit(id);
  // Avoid pinning ordinary floor props exactly on the corridor center line.
  const signed = unit < 0.5 ? unit * 2 - 1 : (unit - 0.5) * 2;
  const minimumOffset = 0.18;
  const magnitude = minimumOffset + Math.abs(signed) * (spread - minimumOffset);
  return deterministicSign(`${id}:lane`) * magnitude;
};

export function getCameraForwardDistance(
  playerX: number,
  worldX: number,
  facing: PlayerState['facing'],
): number {
  return (worldX - playerX) * facing;
}

export function createCameraPose(
  player: Pick<PlayerState, 'x' | 'facing' | 'flashlightAngle'>,
  config: CameraProjectionConfig = DEFAULT_CAMERA_PROJECTION,
): CameraPose {
  const pitch = clamp(
    Number.isFinite(player.flashlightAngle) ? player.flashlightAngle : 0,
    -MAX_AIM_TRANSITION_PITCH,
    MAX_AIM_TRANSITION_PITCH,
  );
  const maxShift = config.height * config.maxHorizonShiftRatio;
  const pitchShift = clamp(
    -pitch * config.height * config.pitchShiftRatio,
    -maxShift,
    maxShift,
  );
  return {
    width: config.width,
    height: config.height,
    playerX: player.x,
    facing: player.facing,
    pitch,
    horizonY: config.height * config.baseHorizonRatio + pitchShift,
  };
}

/**
 * Gives existing props a stable pseudo-3D location without introducing a
 * second, unrelated PIP scene definition. Explicit authored placement can
 * replace this adapter later while preserving the projection API.
 */
export function derivePropCameraAnchor(
  prop: WorldPropDefinition,
): CorridorCameraAnchor {
  const profile = PROP_CAMERA_PROFILES[prop.kind];
  const side = deterministicSign(`${prop.kind}:${prop.id}:wall`);
  let lateral = 0;
  let surface: CameraSurface = 'floor';

  if (profile.placement === 'wall') {
    lateral = side * 0.94;
    surface = side < 0 ? 'left-wall' : 'right-wall';
  } else if (profile.placement === 'ceiling') {
    lateral = (hashUnit(`${prop.id}:ceiling`) - 0.5) * 0.5;
    surface = 'ceiling';
  } else if (profile.placement === 'floor') {
    lateral = deterministicFloorLane(
      prop.id,
      profile.lateralSpread ?? 0.56,
    );
  } else if (profile.lateralSpread) {
    lateral = (hashUnit(`${prop.id}:center`) - 0.5) * profile.lateralSpread * 2;
  }

  return {
    id: prop.id,
    worldX: prop.worldX,
    lateral: clamp(lateral, -1, 1),
    elevation: profile.elevation,
    worldWidth: profile.worldWidth,
    worldHeight: profile.worldHeight,
    surface,
  };
}

function anomalyBasePlacement(anomaly: Anomaly): {
  surface: CameraSurface;
  elevation: number;
  lateral: number;
  worldHeight: number;
} {
  if (anomaly.id.includes('ceiling')) {
    return {
      surface: 'ceiling',
      elevation: 0.94,
      lateral: (hashUnit(`${anomaly.id}:ceiling`) - 0.5) * 0.42,
      worldHeight: 96,
    };
  }

  if (anomaly.type === 'writing') {
    const side = deterministicSign(`${anomaly.id}:writing-wall`);
    return {
      surface: side < 0 ? 'left-wall' : 'right-wall',
      elevation: 0.62,
      lateral: side * 0.93,
      worldHeight: 52,
    };
  }

  if (anomaly.type === 'orb') {
    return {
      surface: 'floor',
      elevation: 0.06,
      lateral: deterministicFloorLane(anomaly.id, 0.48),
      worldHeight: 30,
    };
  }

  if (anomaly.id.includes('altar-shadow')) {
    return {
      surface: 'floor',
      elevation: 0.45,
      lateral: 0,
      worldHeight: 190,
    };
  }

  return {
    surface: 'floor',
    elevation: anomaly.type === 'doll' ? 0.27 : 0.42,
    lateral: deterministicFloorLane(anomaly.id, 0.68),
    worldHeight: anomaly.type === 'doll' ? 108 : 166,
  };
}

export function deriveAnomalyCameraAnchor(
  anomaly: Anomaly,
): CorridorCameraAnchor {
  const placement = anomalyBasePlacement(anomaly);
  // Existing negative yOffset values mean "higher on screen".
  const elevation = clamp(
    placement.elevation - (anomaly.yOffset ?? 0) / 220,
    0,
    1,
  );
  return {
    id: anomaly.id,
    worldX: anomaly.x,
    lateral: placement.lateral,
    elevation,
    worldWidth: Math.max(28, anomaly.width),
    worldHeight: placement.worldHeight,
    surface: placement.surface,
  };
}

export function projectCorridorAnchor(
  anchor: CorridorCameraAnchor,
  player: Pick<PlayerState, 'x' | 'facing' | 'flashlightAngle'>,
  config: CameraProjectionConfig = DEFAULT_CAMERA_PROJECTION,
): ProjectedCameraTarget {
  const pose = createCameraPose(player, config);
  const forwardDistance = getCameraForwardDistance(
    pose.playerX,
    anchor.worldX,
    pose.facing,
  );
  const safeDistance = Math.max(config.nearDistance, forwardDistance);
  const scale = config.focalLength / safeDistance;
  // Camera-right reverses when the player turns around in the same corridor.
  const cameraLateral = anchor.lateral * pose.facing;
  const lateralWorld = cameraLateral * config.corridorHalfWidth;
  const elevationWorld =
    (anchor.elevation - config.cameraElevation) * config.corridorHeight;
  const wallForeshortening =
    anchor.surface === 'left-wall' || anchor.surface === 'right-wall'
      ? 0.72
      : 1;
  const width = Math.max(1, anchor.worldWidth * scale * wallForeshortening);
  const height = Math.max(1, anchor.worldHeight * scale);
  const centerX = config.width / 2 + lateralWorld * scale;
  const centerY = pose.horizonY - elevationWorld * scale;
  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const top = centerY - height / 2;
  const bottom = centerY + height / 2;
  const insideDepth =
    forwardDistance >= config.nearDistance &&
    forwardDistance <= config.farDistance;
  const intersectsViewport =
    right >= 0 &&
    left <= config.width &&
    bottom >= 0 &&
    top <= config.height;

  return {
    id: anchor.id,
    surface: anchor.surface,
    forwardDistance,
    depth: clamp(
      (forwardDistance - config.nearDistance) /
        (config.farDistance - config.nearDistance),
      0,
      1,
    ),
    scale,
    centerX,
    centerY,
    width,
    height,
    left,
    top,
    right,
    bottom,
    visible: insideDepth && intersectsViewport,
    viewportWidth: config.width,
    viewportHeight: config.height,
  };
}

export function projectPropToCamera(
  prop: WorldPropDefinition,
  player: Pick<PlayerState, 'x' | 'facing' | 'flashlightAngle'>,
  config: CameraProjectionConfig = DEFAULT_CAMERA_PROJECTION,
): ProjectedCameraTarget {
  return projectCorridorAnchor(derivePropCameraAnchor(prop), player, config);
}

export function projectAnomalyToCamera(
  anomaly: Anomaly,
  player: Pick<PlayerState, 'x' | 'facing' | 'flashlightAngle'>,
  config: CameraProjectionConfig = DEFAULT_CAMERA_PROJECTION,
): ProjectedCameraTarget {
  return projectCorridorAnchor(
    deriveAnomalyCameraAnchor(anomaly),
    player,
    config,
  );
}

/**
 * Projects the authored PIP presentation position, including the restrained
 * "closer than Main" reveal offset. Capture logic and the PIP renderer must
 * call this same helper or the visible silhouette can drift away from its AF
 * target.
 */
export function projectPresentedAnomalyToCamera(
  anomaly: Anomaly,
  player: Pick<PlayerState, 'x' | 'facing' | 'flashlightAngle'>,
  approachOffsetPx = 0,
  config: CameraProjectionConfig = DEFAULT_CAMERA_PROJECTION,
): ProjectedCameraTarget {
  return projectAnomalyToCamera(
    {
      ...anomaly,
      x: anomaly.x - player.facing * approachOffsetPx * 0.35,
    },
    player,
    config,
  );
}

export function createCenteredCameraFrame(
  viewport: CameraViewport = DEFAULT_CAMERA_PROJECTION,
  widthRatio = 0.2,
  heightRatio = 4 / 9,
): CameraFrame {
  return {
    centerX: viewport.width / 2,
    centerY: viewport.height / 2,
    width: viewport.width * widthRatio,
    height: viewport.height * heightRatio,
  };
}

/** True when the projected target center falls inside the visible AF frame. */
export function isInCameraFrame(
  target: ProjectedCameraTarget,
  frame: CameraFrame = createCenteredCameraFrame({
    width: target.viewportWidth,
    height: target.viewportHeight,
  }),
): boolean {
  if (!target.visible) return false;
  return (
    target.centerX >= frame.centerX - frame.width / 2 &&
    target.centerX <= frame.centerX + frame.width / 2 &&
    target.centerY >= frame.centerY - frame.height / 2 &&
    target.centerY <= frame.centerY + frame.height / 2
  );
}
