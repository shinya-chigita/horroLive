import type { WorldPropDefinition } from './sceneDefinitions.ts';

export type FlashlightFacing = -1 | 1;
export type FlashlightBlockerKind = 'opaque' | 'partial' | 'slatted';

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MainViewMetrics {
  width: number;
  height: number;
  playerAnchorRatio: number;
}

export const MAIN_VIEW_METRICS: Readonly<MainViewMetrics> = Object.freeze({
  width: 640,
  height: 300,
  playerAnchorRatio: 0.42,
});

export interface NarrowLightAperture {
  kind: 'narrow-vertical-leak';
  /** Horizontal position inside the blocker, expressed from its left edge. */
  centerRatio: number;
  /** Width relative to the blocker. Kept narrow enough to read as a crack. */
  widthRatio: number;
  topInsetRatio: number;
  bottomInsetRatio: number;
  /** Fraction of the flashlight that reaches the far side of the blocker. */
  transmission: number;
}

export interface FlashlightBlockerProfile {
  kind: FlashlightBlockerKind;
  /** 0 is fully opaque; 1 transmits the complete flashlight beam. */
  transmission: number;
  aperture?: NarrowLightAperture;
  /** Open space between repeated solid members, for rail/desk-like props. */
  gapRatio?: number;
}

export interface MainViewFlashlightBlocker {
  propId: string;
  propKind: WorldPropDefinition['kind'];
  worldX: number;
  distance: number;
  bounds: ScreenRect;
  profile: FlashlightBlockerProfile;
}

export interface ForwardBlockerOptions {
  maxDistance?: number;
  maxCount?: number;
  metrics?: MainViewMetrics;
  includeOffscreen?: boolean;
}

const OPAQUE: Readonly<FlashlightBlockerProfile> = Object.freeze({
  kind: 'opaque',
  transmission: 0,
});

const PARTIAL_CURTAIN: Readonly<FlashlightBlockerProfile> = Object.freeze({
  kind: 'partial',
  transmission: 0.24,
});

const SLATTED_FURNITURE: Readonly<FlashlightBlockerProfile> = Object.freeze({
  kind: 'slatted',
  transmission: 0.14,
  gapRatio: 0.34,
});

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const normaliseFacing = (facing: FlashlightFacing): FlashlightFacing =>
  facing < 0 ? -1 : 1;

/**
 * Returns the light-blocking material authored for a world prop. A null return
 * means the prop remains readable in the cone but does not cast a gameplay
 * shadow. Doors are opaque planes with a separately renderable narrow leak.
 */
export function getFlashlightBlockerProfile(
  prop: WorldPropDefinition,
): FlashlightBlockerProfile | null {
  switch (prop.kind) {
    case 'door':
      return {
        kind: 'opaque',
        transmission: 0,
        aperture: {
          kind: 'narrow-vertical-leak',
          centerRatio: prop.sealed ? 0.5 : 0.82,
          widthRatio: prop.sealed ? 0.025 : 0.055,
          topInsetRatio: 0.08,
          bottomInsetRatio: 0.1,
          transmission: prop.sealed ? 0.08 : 0.68,
        },
      };
    case 'curtain':
      return PARTIAL_CURTAIN;
    case 'school-desks':
    case 'bed':
    case 'gurney':
      return SLATTED_FURNITURE;
    case 'locker':
    case 'shoe-lockers':
    case 'blackboard':
    case 'stairs':
    case 'medicine-cart':
    case 'crt':
    case 'altar':
    case 'exit':
      return OPAQUE;
    default:
      return null;
  }
}

export function worldToMainViewX(
  worldX: number,
  playerX: number,
  metrics: MainViewMetrics = MAIN_VIEW_METRICS,
): number {
  return Math.round(
    worldX - (playerX - metrics.width * metrics.playerAnchorRatio),
  );
}

interface LocalBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

function getLocalBlockerBounds(prop: WorldPropDefinition): LocalBounds | null {
  switch (prop.kind) {
    case 'door':
      return { left: -31, top: 58, width: 62, height: 171 };
    case 'locker':
      return prop.open
        ? { left: -41, top: 86, width: 63, height: 143 }
        : { left: -22, top: 86, width: 44, height: 143 };
    case 'curtain':
      return { left: -54, top: 63, width: 108, height: 103 };
    case 'shoe-lockers': {
      const columns = clamp(prop.columns ?? 6, 3, 8);
      const width = columns * 18 + 6;
      return { left: -width / 2, top: 104, width, height: 126 };
    }
    case 'blackboard':
      return { left: -80, top: 78, width: 160, height: 90 };
    case 'stairs':
      return { left: -83, top: 73, width: 180, height: 160 };
    case 'school-desks': {
      const rows = clamp(prop.rows ?? 2, 1, 3);
      const width = 62 + (rows - 1) * 23;
      const top = 169;
      return { left: -width / 2, top, width, height: 36 + rows * 18 };
    }
    case 'bed':
      return { left: -47, top: 168, width: 94, height: 64 };
    case 'gurney':
      return { left: -48, top: 185, width: 96, height: 45 };
    case 'medicine-cart':
      return { left: -27, top: 174, width: 54, height: 60 };
    case 'crt':
      return { left: -27, top: 185, width: 54, height: 45 };
    case 'altar':
      return { left: -70, top: 145, width: 140, height: 84 };
    case 'exit':
      return { left: -37, top: 48, width: 74, height: 181 };
    default:
      return null;
  }
}

/** Returns the semantic occluder rectangle in the 640x300 Main canvas. */
export function getMainViewBlockerBounds(
  prop: WorldPropDefinition,
  playerX: number,
  metrics: MainViewMetrics = MAIN_VIEW_METRICS,
): ScreenRect | null {
  if (!getFlashlightBlockerProfile(prop)) return null;
  const local = getLocalBlockerBounds(prop);
  if (!local) return null;
  const centerX = worldToMainViewX(prop.worldX, playerX, metrics);
  return {
    x: centerX + local.left,
    y: local.top,
    width: local.width,
    height: local.height,
  };
}

export function createMainViewFlashlightBlocker(
  prop: WorldPropDefinition,
  playerX: number,
  metrics: MainViewMetrics = MAIN_VIEW_METRICS,
): MainViewFlashlightBlocker | null {
  const profile = getFlashlightBlockerProfile(prop);
  const bounds = getMainViewBlockerBounds(prop, playerX, metrics);
  if (!profile || !bounds) return null;
  return {
    propId: prop.id,
    propKind: prop.kind,
    worldX: prop.worldX,
    distance: Math.abs(prop.worldX - playerX),
    bounds,
    profile,
  };
}

const intersectsViewport = (bounds: ScreenRect, metrics: MainViewMetrics) =>
  bounds.x + bounds.width >= 0 &&
  bounds.x <= metrics.width &&
  bounds.y + bounds.height >= 0 &&
  bounds.y <= metrics.height;

/**
 * Finds the closest authored occluders in the flashlight's facing direction.
 * Sorting is deterministic so rendering does not flicker when distances tie.
 */
export function getNearestForwardBlockers(
  props: readonly WorldPropDefinition[],
  playerX: number,
  facing: FlashlightFacing,
  options: ForwardBlockerOptions = {},
): MainViewFlashlightBlocker[] {
  const direction = normaliseFacing(facing);
  const metrics = options.metrics ?? MAIN_VIEW_METRICS;
  const maxDistance = Math.max(0, options.maxDistance ?? metrics.width);
  const maxCount = Math.max(0, Math.floor(options.maxCount ?? 4));

  return props
    .filter((prop) => (prop.worldX - playerX) * direction > 0)
    .map((prop) => createMainViewFlashlightBlocker(prop, playerX, metrics))
    .filter((blocker): blocker is MainViewFlashlightBlocker => blocker !== null)
    .filter((blocker) => blocker.distance <= maxDistance)
    .filter(
      (blocker) =>
        options.includeOffscreen || intersectsViewport(blocker.bounds, metrics),
    )
    .sort(
      (left, right) =>
        left.distance - right.distance || left.propId.localeCompare(right.propId),
    )
    .slice(0, maxCount);
}

/** Resolves the narrow lit crack authored by a door into screen coordinates. */
export function getBlockerApertureBounds(
  bounds: ScreenRect,
  profile: FlashlightBlockerProfile,
): ScreenRect | null {
  const aperture = profile.aperture;
  if (!aperture) return null;
  const width = Math.max(1, bounds.width * aperture.widthRatio);
  const topInset = bounds.height * aperture.topInsetRatio;
  const bottomInset = bounds.height * aperture.bottomInsetRatio;
  return {
    x: bounds.x + bounds.width * aperture.centerRatio - width / 2,
    y: bounds.y + topInset,
    width,
    height: Math.max(0, bounds.height - topInset - bottomInset),
  };
}

const rectCorners = (bounds: ScreenRect): ScreenPoint[] => [
  { x: bounds.x, y: bounds.y },
  { x: bounds.x + bounds.width, y: bounds.y },
  { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
  { x: bounds.x, y: bounds.y + bounds.height },
];

function projectThroughPointToViewport(
  origin: ScreenPoint,
  through: ScreenPoint,
  facing: FlashlightFacing,
  metrics: MainViewMetrics,
): ScreenPoint {
  const dx = through.x - origin.x;
  const dy = through.y - origin.y;
  const candidates: { t: number; point: ScreenPoint }[] = [];
  const addCandidate = (t: number) => {
    if (!Number.isFinite(t) || t < 1) return;
    const point = { x: origin.x + dx * t, y: origin.y + dy * t };
    const epsilon = 1e-7;
    if (
      point.x >= -epsilon &&
      point.x <= metrics.width + epsilon &&
      point.y >= -epsilon &&
      point.y <= metrics.height + epsilon &&
      (point.x - origin.x) * facing >= -epsilon
    ) {
      candidates.push({
        t,
        point: {
          x: clamp(point.x, 0, metrics.width),
          y: clamp(point.y, 0, metrics.height),
        },
      });
    }
  };

  if (dx !== 0) {
    const farX = facing > 0 ? metrics.width : 0;
    addCandidate((farX - origin.x) / dx);
  }
  if (dy < 0) addCandidate((0 - origin.y) / dy);
  if (dy > 0) addCandidate((metrics.height - origin.y) / dy);

  candidates.sort((left, right) => left.t - right.t);
  return candidates[0]?.point ?? through;
}

/**
 * Builds a clockwise four-point shadow wedge from the two silhouette corners
 * of a blocker to the canvas edge. Partial/slatted material strength is kept in
 * the blocker profile so the renderer can reuse this geometry with less alpha.
 */
export function createShadowPolygon(
  lightOrigin: ScreenPoint,
  blockerBounds: ScreenRect,
  facing: FlashlightFacing,
  metrics: MainViewMetrics = MAIN_VIEW_METRICS,
): ScreenPoint[] {
  const direction = normaliseFacing(facing);
  const forwardEdge =
    direction > 0
      ? blockerBounds.x
      : blockerBounds.x + blockerBounds.width;
  if ((forwardEdge - lightOrigin.x) * direction <= 0) return [];

  const candidates = rectCorners(blockerBounds)
    .filter((corner) => (corner.x - lightOrigin.x) * direction > 0)
    .map((corner) => ({
      corner,
      angle: Math.atan2(
        corner.y - lightOrigin.y,
        (corner.x - lightOrigin.x) * direction,
      ),
    }))
    .sort((left, right) => left.angle - right.angle);

  if (candidates.length < 2) return [];
  const upper = candidates[0].corner;
  const lower = candidates[candidates.length - 1].corner;
  const upperProjection = projectThroughPointToViewport(
    lightOrigin,
    upper,
    direction,
    metrics,
  );
  const lowerProjection = projectThroughPointToViewport(
    lightOrigin,
    lower,
    direction,
    metrics,
  );

  return [upper, upperProjection, lowerProjection, lower];
}
