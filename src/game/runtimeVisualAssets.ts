import type { AnomalyFragmentKind } from './anomalyPresentation';

/**
 * Runtime atlases live in `public` so Canvas code and CSS previews can share
 * stable same-origin URLs without coupling the renderer to Vite imports.
 */
export const RUNTIME_ATLASES = {
  player: {
    url: '/assets/runtime/player-atlas-v1.png',
    width: 1672,
    height: 941,
    columns: 4,
    rows: 2,
  },
  'hospital-props': {
    url: '/assets/runtime/hospital-props-atlas-v1.png',
    width: 1448,
    height: 1086,
    columns: 4,
    rows: 4,
  },
  observer: {
    url: '/assets/runtime/observer-atlas-v1.png',
    width: 1672,
    height: 941,
    columns: 3,
    rows: 1,
  },
} as const;

export type RuntimeAtlasId = keyof typeof RUNTIME_ATLASES;
export type RuntimeAtlasLoadState = 'idle' | 'loading' | 'ready' | 'error';

export interface AtlasCell {
  readonly column: number;
  readonly row: number;
}

export interface AtlasSourceRect {
  readonly sx: number;
  readonly sy: number;
  readonly sWidth: number;
  readonly sHeight: number;
}

export interface AtlasDrawDestination {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly alpha?: number;
  readonly flipX?: boolean;
}

interface RuntimeAtlasCacheEntry {
  image: HTMLImageElement;
  state: Exclude<RuntimeAtlasLoadState, 'idle'>;
}

const imageCache = new Map<RuntimeAtlasId, RuntimeAtlasCacheEntry>();

const cell = (column: number, row: number): AtlasCell => ({ column, row });

/**
 * Returns a loaded atlas image. The first browser call begins loading and
 * returns null, allowing the caller to draw its procedural fallback until a
 * later animation frame. On Node/SSR, Image is never touched and null is
 * returned.
 */
export function getRuntimeAtlasImage(
  atlasId: RuntimeAtlasId,
): HTMLImageElement | null {
  const cached = imageCache.get(atlasId);
  if (cached) {
    if (
      cached.state === 'loading' &&
      cached.image.complete &&
      cached.image.naturalWidth > 0 &&
      cached.image.naturalHeight > 0
    ) {
      cached.state = 'ready';
    }
    return cached.state === 'ready' ? cached.image : null;
  }

  if (typeof Image === 'undefined') return null;

  const image = new Image();
  image.decoding = 'async';
  const entry: RuntimeAtlasCacheEntry = { image, state: 'loading' };
  imageCache.set(atlasId, entry);

  image.onload = () => {
    entry.state =
      image.naturalWidth > 0 && image.naturalHeight > 0 ? 'ready' : 'error';
  };
  image.onerror = () => {
    entry.state = 'error';
  };
  image.src = RUNTIME_ATLASES[atlasId].url;

  // Cached images may be complete synchronously before the load handler runs.
  if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
    entry.state = 'ready';
    return image;
  }

  return null;
}

export function getRuntimeAtlasLoadState(
  atlasId: RuntimeAtlasId,
): RuntimeAtlasLoadState {
  return imageCache.get(atlasId)?.state ?? 'idle';
}

/** Clears failed/stale image state so development HMR or callers can retry. */
export function resetRuntimeAtlasImageCache(atlasId?: RuntimeAtlasId): void {
  if (atlasId) {
    imageCache.delete(atlasId);
    return;
  }
  imageCache.clear();
}

/**
 * Resolves a grid cell against the actual decoded image size. Generated
 * atlases are not guaranteed to have dimensions divisible by their grid, so
 * source rectangles deliberately retain fractional values accepted by Canvas.
 */
export function getAtlasSourceRect(
  atlasId: RuntimeAtlasId,
  atlasWidth: number,
  atlasHeight: number,
  atlasCell: AtlasCell,
): AtlasSourceRect | null {
  const definition = RUNTIME_ATLASES[atlasId];
  if (
    !Number.isFinite(atlasWidth) ||
    !Number.isFinite(atlasHeight) ||
    atlasWidth <= 0 ||
    atlasHeight <= 0 ||
    !Number.isInteger(atlasCell.column) ||
    !Number.isInteger(atlasCell.row) ||
    atlasCell.column < 0 ||
    atlasCell.column >= definition.columns ||
    atlasCell.row < 0 ||
    atlasCell.row >= definition.rows
  ) {
    return null;
  }

  const sWidth = atlasWidth / definition.columns;
  const sHeight = atlasHeight / definition.rows;
  return {
    sx: atlasCell.column * sWidth,
    sy: atlasCell.row * sHeight,
    sWidth,
    sHeight,
  };
}

/**
 * Draws one atlas cell without leaking transforms/alpha to the caller.
 * Returns false while the image is loading, after an image error, or for an
 * invalid cell/destination so renderers can preserve their authored fallback.
 */
export function drawAtlasCell(
  ctx: CanvasRenderingContext2D,
  atlasId: RuntimeAtlasId,
  atlasCell: AtlasCell,
  destination: AtlasDrawDestination,
): boolean {
  if (
    !Number.isFinite(destination.x) ||
    !Number.isFinite(destination.y) ||
    !Number.isFinite(destination.width) ||
    !Number.isFinite(destination.height) ||
    destination.width <= 0 ||
    destination.height <= 0
  ) {
    return false;
  }

  const image = getRuntimeAtlasImage(atlasId);
  if (!image) return false;

  const source = getAtlasSourceRect(
    atlasId,
    image.naturalWidth,
    image.naturalHeight,
    atlasCell,
  );
  if (!source) return false;

  const requestedAlpha = destination.alpha ?? 1;
  if (!Number.isFinite(requestedAlpha)) return false;
  const alpha = Math.min(1, Math.max(0, requestedAlpha));
  ctx.save();
  try {
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;

    if (destination.flipX) {
      ctx.translate(destination.x + destination.width, destination.y);
      ctx.scale(-1, 1);
      ctx.drawImage(
        image,
        source.sx,
        source.sy,
        source.sWidth,
        source.sHeight,
        0,
        0,
        destination.width,
        destination.height,
      );
    } else {
      ctx.drawImage(
        image,
        source.sx,
        source.sy,
        source.sWidth,
        source.sHeight,
        destination.x,
        destination.y,
        destination.width,
        destination.height,
      );
    }

    return true;
  } catch {
    return false;
  } finally {
    ctx.restore();
  }
}

export type PlayerRuntimePose =
  | 'idle'
  | 'walk'
  | 'crouch'
  | 'aim'
  | 'startled'
  | 'fatigued';

/** @deprecated Prefer PlayerRuntimePose for new renderer code. */
export type PlayerAtlasPose = PlayerRuntimePose;

const PLAYER_STATIC_CELLS: Readonly<
  Record<Exclude<PlayerAtlasPose, 'walk'>, AtlasCell>
> = {
  idle: cell(0, 0),
  crouch: cell(0, 1),
  aim: cell(1, 1),
  startled: cell(2, 1),
  fatigued: cell(3, 1),
};

const PLAYER_WALK_CELLS: readonly AtlasCell[] = [
  cell(1, 0),
  cell(2, 0),
  cell(3, 0),
  cell(2, 0),
];

export interface PlayerAtlasFrameInput {
  readonly now: number;
  readonly isMoving: boolean;
  readonly isRunning?: boolean;
  readonly isCrouching?: boolean;
  readonly isAiming?: boolean;
  readonly reaction?: 'startled' | 'fatigued' | null;
}

export function getPlayerAtlasCell(
  pose: PlayerAtlasPose,
  now = 0,
  isRunning = false,
): AtlasCell {
  if (pose !== 'walk') return PLAYER_STATIC_CELLS[pose];
  const frameMs = isRunning ? 100 : 125;
  const frameIndex =
    Math.floor(Math.max(0, Number.isFinite(now) ? now : 0) / frameMs) %
    PLAYER_WALK_CELLS.length;
  return PLAYER_WALK_CELLS[frameIndex];
}

/** Selects the authored player pose with explicit reactions taking priority. */
export function selectPlayerAtlasCell(input: PlayerAtlasFrameInput): AtlasCell {
  if (input.reaction) return getPlayerAtlasCell(input.reaction, input.now);
  if (input.isCrouching) return getPlayerAtlasCell('crouch', input.now);
  if (input.isMoving) {
    return getPlayerAtlasCell('walk', input.now, input.isRunning ?? false);
  }
  if (input.isAiming) return getPlayerAtlasCell('aim', input.now);
  return getPlayerAtlasCell('idle', input.now);
}

export type HospitalAssetKey =
  | 'bed'
  | 'gurney'
  | 'wheelchair'
  | 'iv-stand'
  | 'medicine-cart'
  | 'locker-closed'
  | 'locker-open'
  | 'crt'
  | 'door'
  | 'curtain'
  | 'wet-reflection'
  | 'backpack'
  | 'keycard'
  | 'diary'
  | 'photo'
  | 'battery';

const HOSPITAL_ASSET_CELLS: Readonly<Record<HospitalAssetKey, AtlasCell>> = {
  bed: cell(0, 0),
  gurney: cell(1, 0),
  wheelchair: cell(2, 0),
  'iv-stand': cell(3, 0),
  'medicine-cart': cell(0, 1),
  'locker-closed': cell(1, 1),
  'locker-open': cell(2, 1),
  crt: cell(3, 1),
  door: cell(0, 2),
  curtain: cell(1, 2),
  'wet-reflection': cell(2, 2),
  backpack: cell(3, 2),
  keycard: cell(0, 3),
  diary: cell(1, 3),
  photo: cell(2, 3),
  battery: cell(3, 3),
};

export function getHospitalAssetAtlasCell(key: HospitalAssetKey): AtlasCell {
  return HOSPITAL_ASSET_CELLS[key];
}

export type ObserverAtlasTier = 'far' | 'mid' | 'near';

const OBSERVER_TIER_CELLS: Readonly<Record<ObserverAtlasTier, AtlasCell>> = {
  far: cell(0, 0),
  mid: cell(1, 0),
  near: cell(2, 0),
};

export function getObserverAtlasCell(tier: ObserverAtlasTier): AtlasCell {
  return OBSERVER_TIER_CELLS[tier];
}

/**
 * Only figure-like anomaly fragments use the Observer atlas. Trace and writing
 * remain renderer-native effects, preserving their legibility and behavior.
 */
export function getObserverTierForFragment(
  fragmentKind: AnomalyFragmentKind,
): ObserverAtlasTier | null {
  switch (fragmentKind) {
    case 'FULL_BODY':
      return 'far';
    case 'HAIR_AND_SHOULDER':
      return 'mid';
    case 'HEAD_AND_HAND':
    case 'FRAME_EDGE_SHADOW':
      return 'near';
    case 'TRACE':
    case 'WRITING_FRAGMENT':
      return null;
  }
}
