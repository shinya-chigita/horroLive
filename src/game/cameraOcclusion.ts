import type { BoardId, PlayerState } from '../types.ts';
import {
  getFlashlightBlockerProfile,
  type FlashlightBlockerProfile,
} from './flashlightOcclusion.ts';
import {
  projectPropToCamera,
  type ProjectedCameraTarget,
} from './cameraProjection.ts';
import { getSceneDefinitions } from './sceneDefinitions.ts';

export interface PipCameraOcclusion {
  occluded: boolean;
  blockerId: string | null;
  coverage: number;
}

const NO_OCCLUSION: PipCameraOcclusion = {
  occluded: false,
  blockerId: null,
  coverage: 0,
};

const intersectionCoverage = (
  target: ProjectedCameraTarget,
  blocker: ProjectedCameraTarget,
) => {
  const width = Math.max(
    0,
    Math.min(target.right, blocker.right) - Math.max(target.left, blocker.left),
  );
  const height = Math.max(
    0,
    Math.min(target.bottom, blocker.bottom) - Math.max(target.top, blocker.top),
  );
  const targetArea = Math.max(1, target.width * target.height);
  return (width * height) / targetArea;
};

const containsTargetCenter = (
  target: ProjectedCameraTarget,
  blocker: ProjectedCameraTarget,
) =>
  target.centerX >= blocker.left &&
  target.centerX <= blocker.right &&
  target.centerY >= blocker.top &&
  target.centerY <= blocker.bottom;

export function doesProjectedBlockerOcclude(
  target: ProjectedCameraTarget,
  blocker: ProjectedCameraTarget,
  profile: FlashlightBlockerProfile,
): number {
  if (
    !target.visible ||
    !blocker.visible ||
    blocker.forwardDistance >= target.forwardDistance ||
    blocker.forwardDistance <= 0 ||
    profile.kind === 'partial'
  ) {
    return 0;
  }

  const coverage = intersectionCoverage(target, blocker);
  if (coverage <= 0) return 0;
  if (profile.kind === 'opaque') {
    return containsTargetCenter(target, blocker) || coverage >= 0.5
      ? coverage
      : 0;
  }
  // Beds, gurneys, and desks have visible gaps. They only suppress recognition
  // when their projected silhouette covers nearly the complete subject.
  return coverage >= 0.82 ? coverage : 0;
}

/**
 * Uses the same authored props and perspective projection as the PIP painter.
 * A nearer semantic blocker can therefore suppress AF/capture for a target
 * that the renderer has physically covered.
 */
export function getPipCameraOcclusion(
  target: ProjectedCameraTarget,
  player: Pick<PlayerState, 'x' | 'facing' | 'flashlightAngle'>,
  boardId: BoardId,
): PipCameraOcclusion {
  if (!target.visible) return NO_OCCLUSION;

  const hits = getSceneDefinitions(boardId)
    .flatMap((scene) => scene.props)
    .map((prop) => {
      const profile = getFlashlightBlockerProfile(prop);
      if (!profile) return null;
      const projection = projectPropToCamera(prop, player);
      const coverage = doesProjectedBlockerOcclude(
        target,
        projection,
        profile,
      );
      return coverage > 0
        ? {
            blockerId: prop.id,
            distance: projection.forwardDistance,
            coverage,
          }
        : null;
    })
    .filter((hit): hit is NonNullable<typeof hit> => hit !== null)
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        left.blockerId.localeCompare(right.blockerId),
    );

  const nearest = hits[0];
  return nearest
    ? {
        occluded: true,
        blockerId: nearest.blockerId,
        coverage: nearest.coverage,
      }
    : NO_OCCLUSION;
}
