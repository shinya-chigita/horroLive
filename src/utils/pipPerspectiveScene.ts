import type {
  Anomaly,
  GameItem,
  RiskTier,
} from '../types.ts';
import {
  DEFAULT_CAMERA_PROJECTION,
  createCameraPose,
  projectPresentedAnomalyToCamera,
  projectCorridorAnchor,
  projectPropToCamera,
  stableCameraHash,
  type CorridorCameraAnchor,
  type ProjectedCameraTarget,
} from '../game/cameraProjection.ts';
import { getAnomalyVisualProfile } from '../game/anomalyPresentation.ts';
import {
  getItemWorldPositions,
  getSceneDefinitionAt,
  getSceneDefinitions,
  type ScenePalette,
  type WorldPropDefinition,
} from '../game/sceneDefinitions.ts';
import type { SceneSnapshot } from '../game/sceneSnapshot.ts';
import {
  drawAtlasCell,
  getHospitalAssetAtlasCell,
  getObserverAtlasCell,
  getObserverTierForFragment,
  type HospitalAssetKey,
  type ObserverAtlasTier,
} from '../game/runtimeVisualAssets.ts';

export const PIP_PERSPECTIVE_WIDTH = 320;
export const PIP_PERSPECTIVE_HEIGHT = 180;

export interface PipViewerThreatProfile {
  readonly id: string;
  readonly visible: boolean;
  /** Forward corridor distance from the delayed camera snapshot. */
  readonly distance: number;
  /** World-side lateral position, normalized from -1 to +1. */
  readonly lateral: number;
  readonly elevation: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly alpha: number;
}

export interface RenderPipPerspectiveSceneInput {
  ctx: CanvasRenderingContext2D;
  snapshot: SceneSnapshot;
  riskTier: RiskTier;
  loopCount: number;
  now: number;
  /**
   * Undefined uses the local viewer-risk mapping. Null explicitly suppresses
   * the persistent observer; a partial profile can be supplied by a future
   * viewer-threat director without changing the renderer contract.
   */
  viewerThreat?: Partial<PipViewerThreatProfile> | null;
}

interface ProjectedPropEntry {
  readonly kind: 'prop';
  readonly projection: ProjectedCameraTarget;
  readonly prop: WorldPropDefinition;
}

interface ProjectedItemEntry {
  readonly kind: 'item';
  readonly projection: ProjectedCameraTarget;
  readonly item: GameItem;
}

interface ProjectedAnomalyEntry {
  readonly kind: 'anomaly';
  readonly projection: ProjectedCameraTarget;
  readonly anomaly: Anomaly;
  readonly alpha: number;
  readonly fragmentKind: ReturnType<
    typeof getAnomalyVisualProfile
  >['fragmentKind'];
}

interface ProjectedViewerEntry {
  readonly kind: 'viewer';
  readonly projection: ProjectedCameraTarget;
  readonly alpha: number;
}

type ProjectedEntry =
  | ProjectedPropEntry
  | ProjectedItemEntry
  | ProjectedAnomalyEntry
  | ProjectedViewerEntry;

const CAMERA_CONFIG = {
  ...DEFAULT_CAMERA_PROJECTION,
  width: PIP_PERSPECTIVE_WIDTH,
  height: PIP_PERSPECTIVE_HEIGHT,
};

const VIEWER_THREAT_BY_RISK: Readonly<
  Record<RiskTier, PipViewerThreatProfile>
> = {
  0: {
    id: 'viewer-observer',
    visible: true,
    distance: 820,
    lateral: 0.72,
    elevation: 0.42,
    worldWidth: 48,
    worldHeight: 158,
    alpha: 0.075,
  },
  1: {
    id: 'viewer-observer',
    visible: true,
    distance: 560,
    lateral: 0.68,
    elevation: 0.42,
    worldWidth: 54,
    worldHeight: 162,
    alpha: 0.18,
  },
  2: {
    id: 'viewer-observer',
    visible: true,
    distance: 320,
    lateral: -0.56,
    elevation: 0.43,
    worldWidth: 62,
    worldHeight: 170,
    alpha: 0.28,
  },
  3: {
    id: 'viewer-observer',
    visible: true,
    distance: 145,
    lateral: 0.12,
    elevation: 0.46,
    worldWidth: 76,
    worldHeight: 178,
    alpha: 0.4,
  },
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const pixel = (value: number) => Math.round(value);

function fillRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(pixel(x), pixel(y), pixel(width), pixel(height));
}

function strokeRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  lineWidth = 1,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(pixel(x) + 0.5, pixel(y) + 0.5, pixel(width), pixel(height));
}

function path(
  ctx: CanvasRenderingContext2D,
  points: readonly { x: number; y: number }[],
  fill: string,
  stroke?: string,
) {
  if (points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawCorridor(
  ctx: CanvasRenderingContext2D,
  snapshot: SceneSnapshot,
  palette: ScenePalette,
) {
  const pose = createCameraPose(snapshot.player, CAMERA_CONFIG);
  const centerX = PIP_PERSPECTIVE_WIDTH / 2;
  const horizonY = pose.horizonY;

  fillRect(
    ctx,
    0,
    0,
    PIP_PERSPECTIVE_WIDTH,
    PIP_PERSPECTIVE_HEIGHT,
    '#030504',
  );
  path(
    ctx,
    [
      { x: 0, y: 0 },
      { x: PIP_PERSPECTIVE_WIDTH, y: 0 },
      { x: centerX, y: horizonY },
    ],
    palette.wallDark,
  );
  path(
    ctx,
    [
      { x: 0, y: PIP_PERSPECTIVE_HEIGHT },
      { x: centerX, y: horizonY },
      { x: PIP_PERSPECTIVE_WIDTH, y: PIP_PERSPECTIVE_HEIGHT },
    ],
    palette.floor,
  );
  path(
    ctx,
    [
      { x: 0, y: 0 },
      { x: centerX, y: horizonY },
      { x: 0, y: PIP_PERSPECTIVE_HEIGHT },
    ],
    palette.wall,
  );
  path(
    ctx,
    [
      { x: PIP_PERSPECTIVE_WIDTH, y: 0 },
      { x: PIP_PERSPECTIVE_WIDTH, y: PIP_PERSPECTIVE_HEIGHT },
      { x: centerX, y: horizonY },
    ],
    palette.wall,
  );

  // A slight left/right value split prevents the corridor from reading as a
  // flat four-triangle graphic while keeping authored scene colors intact.
  ctx.globalAlpha = 0.12;
  path(
    ctx,
    [
      { x: 0, y: 0 },
      { x: centerX, y: horizonY },
      { x: 0, y: PIP_PERSPECTIVE_HEIGHT },
    ],
    '#8d927e',
  );
  ctx.globalAlpha = 0.08;
  path(
    ctx,
    [
      { x: PIP_PERSPECTIVE_WIDTH, y: 0 },
      { x: PIP_PERSPECTIVE_WIDTH, y: PIP_PERSPECTIVE_HEIGHT },
      { x: centerX, y: horizonY },
    ],
    '#050807',
  );
  ctx.globalAlpha = 1;

  ctx.strokeStyle = palette.wallLine;
  ctx.lineWidth = 1;
  [42, 92, 228, 278].forEach((nearX) => {
    ctx.beginPath();
    ctx.moveTo(nearX, PIP_PERSPECTIVE_HEIGHT);
    ctx.lineTo(centerX, horizonY);
    ctx.stroke();
  });
  [28, 102, 218, 292].forEach((nearX) => {
    ctx.beginPath();
    ctx.moveTo(nearX, 0);
    ctx.lineTo(centerX, horizonY);
    ctx.stroke();
  });

  // Distance-authored ribs remain stable when walking and make forward motion
  // legible without inventing a separate PIP environment.
  const firstGrid = Math.ceil(snapshot.player.x / 120) * 120;
  for (let index = 0; index < 8; index += 1) {
    const worldX = firstGrid + index * 120 * snapshot.player.facing;
    const distance = (worldX - snapshot.player.x) * snapshot.player.facing;
    if (distance < CAMERA_CONFIG.nearDistance || distance > 860) continue;
    const scale = CAMERA_CONFIG.focalLength / distance;
    const left = centerX - CAMERA_CONFIG.corridorHalfWidth * scale;
    const right = centerX + CAMERA_CONFIG.corridorHalfWidth * scale;
    const ceiling =
      horizonY -
      (1 - CAMERA_CONFIG.cameraElevation) *
        CAMERA_CONFIG.corridorHeight *
        scale;
    const floor =
      horizonY +
      CAMERA_CONFIG.cameraElevation * CAMERA_CONFIG.corridorHeight * scale;
    if (right < 0 || left > PIP_PERSPECTIVE_WIDTH) continue;
    ctx.globalAlpha = clamp(0.12 + (1 - distance / 900) * 0.2, 0.1, 0.32);
    ctx.strokeStyle = palette.wallLine;
    ctx.beginPath();
    ctx.moveTo(left, ceiling);
    ctx.lineTo(left, floor);
    ctx.lineTo(right, floor);
    ctx.lineTo(right, ceiling);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Ceiling pipes converge at the same vanishing point and visibly follow
  // upward flashlight pitch.
  ctx.strokeStyle = palette.metal;
  ctx.globalAlpha = 0.42;
  ctx.beginPath();
  ctx.moveTo(118, 0);
  ctx.lineTo(centerX - 5, horizonY);
  ctx.moveTo(126, 0);
  ctx.lineTo(centerX - 2, horizonY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  fillRect(ctx, centerX - 3, horizonY - 2, 6, 4, '#080b09');
}

function bounds(projection: ProjectedCameraTarget) {
  return {
    x: projection.left,
    y: projection.top,
    width: projection.width,
    height: projection.height,
  };
}

function hospitalAssetForProp(
  prop: WorldPropDefinition,
): HospitalAssetKey | null {
  switch (prop.kind) {
    case 'bed':
    case 'gurney':
    case 'wheelchair':
    case 'iv-stand':
    case 'medicine-cart':
    case 'crt':
    case 'door':
    case 'curtain':
    case 'wet-reflection':
      return prop.kind;
    case 'locker':
      return prop.open ? 'locker-open' : 'locker-closed';
    default:
      return null;
  }
}

function drawHospitalAtlasProp(
  ctx: CanvasRenderingContext2D,
  prop: WorldPropDefinition,
  projection: ProjectedCameraTarget,
  boardId: SceneSnapshot['boardId'],
) {
  if (boardId !== 'hospital') return false;
  const key = hospitalAssetForProp(prop);
  if (!key) return false;
  return drawAtlasCell(ctx, 'hospital-props', getHospitalAssetAtlasCell(key), {
    ...bounds(projection),
    alpha: prop.kind === 'curtain' ? 0.82 : 1,
    flipX:
      projection.surface === 'left-wall' &&
      (prop.kind === 'door' || prop.kind === 'locker'),
  });
}

function drawDoorDetails(
  ctx: CanvasRenderingContext2D,
  prop: Extract<WorldPropDefinition, { kind: 'door' | 'exit' }>,
  projection: ProjectedCameraTarget,
  palette: ScenePalette,
  bodyDrawn: boolean,
) {
  const { x, y, width, height } = bounds(projection);
  if (!bodyDrawn) {
    fillRect(ctx, x, y, width, height, '#171816');
    strokeRect(ctx, x, y, width, height, palette.metal);
    strokeRect(
      ctx,
      x + width * 0.12,
      y + height * 0.08,
      width * 0.76,
      height * 0.82,
      '#34352f',
    );
    fillRect(
      ctx,
      x + width * 0.74,
      y + height * 0.55,
      Math.max(1, width * 0.045),
      Math.max(1, width * 0.045),
      '#9a8050',
    );
  }
  const label = prop.kind === 'exit' ? 'EXIT' : prop.label;
  if (width > 18 && height > 34) {
    ctx.save();
    ctx.font = `${clamp(pixel(width * 0.095), 5, 8)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = prop.kind === 'exit' ? '#6f9f88' : '#a19e91';
    ctx.globalAlpha = 0.78;
    ctx.fillText(label, projection.centerX, y + height * 0.18, width * 0.76);
    ctx.restore();
  }
  if (prop.kind === 'door' && prop.sealed) {
    ctx.strokeStyle = '#69302a';
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = Math.max(1, width * 0.035);
    ctx.beginPath();
    ctx.moveTo(x + width * 0.08, y + height * 0.2);
    ctx.lineTo(x + width * 0.9, y + height * 0.84);
    ctx.moveTo(x + width * 0.9, y + height * 0.2);
    ctx.lineTo(x + width * 0.08, y + height * 0.84);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawProceduralProp(
  ctx: CanvasRenderingContext2D,
  prop: WorldPropDefinition,
  projection: ProjectedCameraTarget,
  palette: ScenePalette,
  pipDifferenceActive: boolean,
) {
  const { x, y, width: w, height: h } = bounds(projection);
  const line = Math.max(1, Math.min(2, w / 30));

  switch (prop.kind) {
    case 'window':
      fillRect(ctx, x, y, w, h, '#080d0d');
      strokeRect(ctx, x, y, w, h, palette.metal, line);
      fillRect(ctx, x + w * 0.49, y, Math.max(1, w * 0.035), h, palette.metal);
      fillRect(ctx, x, y + h * 0.48, w, Math.max(1, h * 0.035), palette.metal);
      ctx.globalAlpha = 0.12;
      fillRect(ctx, x + w * 0.08, y + h * 0.08, w * 0.34, h * 0.34, '#9bb5ac');
      ctx.globalAlpha = 1;
      break;
    case 'bed':
    case 'gurney':
      fillRect(ctx, x + w * 0.04, y + h * 0.24, w * 0.92, h * 0.28, '#5a5a51');
      fillRect(ctx, x + w * 0.08, y + h * 0.14, w * 0.78, h * 0.18, '#777269');
      [0.1, 0.84].forEach((ratio) =>
        fillRect(ctx, x + w * ratio, y + h * 0.48, Math.max(1, w * 0.035), h * 0.44, palette.metal),
      );
      strokeRect(ctx, x + w * 0.02, y + h * 0.15, w * 0.96, h * 0.47, palette.metal, line);
      break;
    case 'wheelchair':
      ctx.fillStyle = '#121514';
      ctx.strokeStyle = palette.metal;
      ctx.lineWidth = line;
      [0.28, 0.73].forEach((ratio) => {
        ctx.beginPath();
        ctx.arc(x + w * ratio, y + h * 0.72, Math.max(2, w * 0.22), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      fillRect(ctx, x + w * 0.25, y + h * 0.35, w * 0.45, h * 0.17, '#343832');
      fillRect(ctx, x + w * 0.22, y + h * 0.12, w * 0.18, h * 0.34, '#292d29');
      break;
    case 'iv-stand':
      fillRect(ctx, projection.centerX - Math.max(1, w * 0.035), y + h * 0.06, Math.max(1, w * 0.07), h * 0.82, palette.metal);
      fillRect(ctx, x + w * 0.22, y + h * 0.05, w * 0.56, Math.max(1, h * 0.025), palette.metal);
      fillRect(ctx, x + w * 0.15, y + h * 0.18, w * 0.25, h * 0.22, '#74827a');
      fillRect(ctx, x + w * 0.15, y + h * 0.88, w * 0.7, Math.max(1, h * 0.025), palette.metal);
      break;
    case 'medicine-cart':
      fillRect(ctx, x, y + h * 0.12, w, h * 0.72, '#3d433e');
      strokeRect(ctx, x, y + h * 0.12, w, h * 0.72, palette.metal, line);
      [0.36, 0.56].forEach((ratio) =>
        fillRect(ctx, x + w * 0.08, y + h * ratio, w * 0.84, Math.max(1, h * 0.025), '#171a18'),
      );
      fillRect(ctx, x - w * 0.05, y + h * 0.07, w * 1.1, h * 0.08, palette.metal);
      break;
    case 'locker':
      fillRect(ctx, x, y, w, h, '#272d29');
      strokeRect(ctx, x, y, w, h, palette.metal, line);
      if (prop.open) {
        fillRect(ctx, x + w * 0.08, y + h * 0.05, w * 0.68, h * 0.9, '#050706');
        path(
          ctx,
          [
            { x: x + w * 0.73, y: y + h * 0.04 },
            { x: x + w * 1.14, y: y + h * 0.11 },
            { x: x + w * 1.14, y: y + h * 0.92 },
            { x: x + w * 0.73, y: y + h * 0.96 },
          ],
          '#343a35',
          palette.metal,
        );
      } else {
        [0.16, 0.21, 0.26].forEach((ratio) =>
          fillRect(ctx, x + w * 0.22, y + h * ratio, w * 0.56, Math.max(1, h * 0.012), '#0c100e'),
        );
      }
      break;
    case 'crt':
      fillRect(ctx, x, y, w, h, '#272c29');
      strokeRect(ctx, x, y, w, h, palette.metal, line);
      fillRect(ctx, x + w * 0.12, y + h * 0.12, w * 0.76, h * 0.62, '#42504c');
      for (let scan = 0; scan < 5; scan += 1) {
        ctx.globalAlpha = 0.24 + ((stableCameraHash(`${prop.id}:${scan}`) % 20) / 100);
        fillRect(ctx, x + w * 0.17, y + h * (0.18 + scan * 0.1), w * (0.48 + (scan % 2) * 0.18), Math.max(1, h * 0.018), '#c3d2c8');
      }
      ctx.globalAlpha = 1;
      break;
    case 'curtain':
      ctx.save();
      ctx.globalAlpha = 0.78;
      fillRect(ctx, x, y, w, Math.max(1, h * 0.025), palette.metal);
      for (let strip = 0; strip < 9; strip += 1) {
        const stripWidth = w / 9;
        fillRect(
          ctx,
          x + strip * stripWidth,
          y + h * 0.03,
          stripWidth * 0.84,
          h * (0.88 - (strip % 3) * 0.04),
          strip % 2 ? '#3f4239' : '#515348',
        );
      }
      ctx.restore();
      break;
    case 'wet-reflection': {
      const gradient = ctx.createRadialGradient(
        projection.centerX,
        projection.centerY,
        1,
        projection.centerX,
        projection.centerY,
        Math.max(w, h),
      );
      gradient.addColorStop(0, 'rgba(126,154,148,0.4)');
      gradient.addColorStop(1, 'rgba(10,14,13,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, w, h);
      break;
    }
    case 'altar':
      fillRect(ctx, x, y + h * 0.3, w, h * 0.56, '#261c16');
      fillRect(ctx, x - w * 0.05, y + h * 0.24, w * 1.1, h * 0.1, '#493426');
      [0.24, 0.75].forEach((ratio) => {
        fillRect(ctx, x + w * ratio, y + h * 0.02, Math.max(1, w * 0.035), h * 0.24, '#936c38');
        fillRect(ctx, x + w * ratio - 1, y, 3, 3, '#d5b474');
      });
      break;
    case 'shoe-lockers':
      fillRect(ctx, x, y, w, h, '#242a26');
      strokeRect(ctx, x, y, w, h, palette.metal, line);
      for (let column = 1; column < (prop.columns ?? 6); column += 1) {
        fillRect(ctx, x + (w * column) / (prop.columns ?? 6), y, 1, h, '#101411');
      }
      for (let row = 1; row < 4; row += 1) {
        fillRect(ctx, x, y + (h * row) / 4, w, 1, '#101411');
      }
      break;
    case 'blackboard': {
      fillRect(ctx, x, y, w, h, '#18211c');
      strokeRect(ctx, x, y, w, h, '#5a5240', line);
      const text = pipDifferenceActive && prop.pipText ? prop.pipText : prop.text;
      if (w > 18 && h > 10) {
        ctx.save();
        ctx.font = `${clamp(pixel(h * 0.2), 5, 10)}px serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#b7b1a1';
        ctx.globalAlpha = 0.66;
        ctx.fillText(text, projection.centerX, projection.centerY + h * 0.08, w * 0.84);
        ctx.restore();
      }
      break;
    }
    case 'school-desks':
      for (let row = 0; row < (prop.rows ?? 2); row += 1) {
        const inset = row * w * 0.09;
        const rowY = y + row * h * 0.24;
        fillRect(ctx, x + inset, rowY, w - inset * 2, h * 0.13, '#4a3e2c');
        fillRect(ctx, x + inset + w * 0.05, rowY + h * 0.13, Math.max(1, w * 0.025), h * 0.2, palette.metal);
        fillRect(ctx, x + w - inset - w * 0.07, rowY + h * 0.13, Math.max(1, w * 0.025), h * 0.2, palette.metal);
      }
      break;
    case 'speaker':
      fillRect(ctx, x, y, w, h, '#252a27');
      strokeRect(ctx, x, y, w, h, palette.metal, line);
      ctx.fillStyle = '#080b09';
      ctx.beginPath();
      ctx.arc(projection.centerX, projection.centerY, Math.max(2, Math.min(w, h) * 0.28), 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'stairs':
      for (let step = 0; step < 7; step += 1) {
        fillRect(
          ctx,
          x + w * step * 0.04,
          y + h * (0.74 - step * 0.085),
          w * (1 - step * 0.08),
          h * 0.09,
          step % 2 ? '#292823' : '#34322c',
        );
      }
      break;
    case 'graffiti':
      if (w > 12) {
        ctx.save();
        ctx.font = `bold ${clamp(pixel(h * 0.34), 5, 11)}px serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = prop.color;
        ctx.globalAlpha = 0.62;
        ctx.fillText(prop.text, projection.centerX, projection.centerY, w);
        ctx.restore();
      }
      break;
    case 'door':
    case 'exit':
      drawDoorDetails(ctx, prop, projection, palette, false);
      break;
  }
}

function drawProp(
  ctx: CanvasRenderingContext2D,
  entry: ProjectedPropEntry,
  snapshot: SceneSnapshot,
  palette: ScenePalette,
  pipDifferenceActive: boolean,
) {
  const drawn = drawHospitalAtlasProp(
    ctx,
    entry.prop,
    entry.projection,
    snapshot.boardId,
  );
  if (!drawn) {
    drawProceduralProp(
      ctx,
      entry.prop,
      entry.projection,
      palette,
      pipDifferenceActive,
    );
    return;
  }
  if (entry.prop.kind === 'door') {
    drawDoorDetails(ctx, entry.prop, entry.projection, palette, true);
  }
}

function itemAnchor(item: GameItem, worldX: number): CorridorCameraAnchor {
  const hash = stableCameraHash(`${item.id}:pip-item`);
  return {
    id: item.id,
    worldX,
    lateral: ((hash % 1000) / 999 - 0.5) * 0.7,
    elevation: 0.065,
    worldWidth: item.type === 'photo' ? 38 : 32,
    worldHeight: item.type === 'battery' ? 22 : 28,
    surface: 'floor',
  };
}

function drawItem(
  ctx: CanvasRenderingContext2D,
  entry: ProjectedItemEntry,
  snapshot: SceneSnapshot,
) {
  const { x, y, width, height } = bounds(entry.projection);
  const key: HospitalAssetKey = entry.item.type;
  const atlasDrawn =
    snapshot.boardId === 'hospital' &&
    drawAtlasCell(ctx, 'hospital-props', getHospitalAssetAtlasCell(key), {
      x,
      y,
      width,
      height,
    });
  if (!atlasDrawn) {
    const color =
      entry.item.type === 'keycard'
        ? '#718f88'
        : entry.item.type === 'battery'
          ? '#3e4d4b'
          : '#aa946e';
    fillRect(ctx, x, y, width, height, color);
    strokeRect(ctx, x, y, width, height, '#d0bd8c');
  }
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#d8bd82';
  ctx.beginPath();
  ctx.arc(
    entry.projection.centerX,
    entry.projection.centerY,
    Math.max(4, width * 0.8),
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

function observerTierForRisk(riskTier: RiskTier): ObserverAtlasTier {
  if (riskTier >= 3) return 'near';
  if (riskTier >= 2) return 'mid';
  return 'far';
}

function drawObserverFigure(
  ctx: CanvasRenderingContext2D,
  projection: ProjectedCameraTarget,
  alpha: number,
  tier: ObserverAtlasTier,
) {
  const width = Math.max(projection.width, tier === 'near' ? 28 : 10);
  const height = Math.max(projection.height, tier === 'near' ? 58 : 24);
  const x = projection.centerX - width / 2;
  const y = projection.centerY - height / 2;
  const drawn = drawAtlasCell(
    ctx,
    'observer',
    getObserverAtlasCell(tier),
    { x, y, width, height, alpha },
  );
  if (drawn) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#030505';
  ctx.beginPath();
  ctx.ellipse(
    projection.centerX,
    y + height * 0.14,
    width * 0.17,
    height * 0.11,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  path(
    ctx,
    [
      { x: projection.centerX - width * 0.18, y: y + height * 0.2 },
      { x: projection.centerX + width * 0.16, y: y + height * 0.2 },
      { x: projection.centerX + width * 0.34, y: y + height * 0.92 },
      { x: projection.centerX - width * 0.37, y: y + height * 0.92 },
    ],
    '#030505',
  );
  // Wet edge pixels keep the silhouette readable without describing a face.
  ctx.globalAlpha = alpha * 0.7;
  fillRect(ctx, projection.centerX - width * 0.22, y + height * 0.24, 1, height * 0.55, '#83928a');
  ctx.restore();
}

function drawAnomaly(
  ctx: CanvasRenderingContext2D,
  entry: ProjectedAnomalyEntry,
  riskTier: RiskTier,
) {
  const projection = entry.projection;
  const { x, y, width: w, height: h } = bounds(projection);
  const observerTier = getObserverTierForFragment(entry.fragmentKind);
  if (observerTier) {
    drawObserverFigure(ctx, projection, entry.alpha, observerTier);
    return;
  }

  ctx.save();
  ctx.globalAlpha = entry.alpha;
  switch (entry.fragmentKind) {
    case 'TRACE':
      for (let step = 0; step < 4; step += 1) {
        const stepScale = 1 - step * 0.14;
        fillRect(
          ctx,
          x + w * (0.15 + step * 0.2),
          y + h * (0.62 + (step % 2) * 0.12),
          Math.max(2, w * 0.13 * stepScale),
          Math.max(3, h * 0.22 * stepScale),
          '#83958b',
        );
      }
      break;
    case 'WRITING_FRAGMENT':
      ctx.font = `bold ${clamp(pixel(h * 0.34), 6, 16)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9b4b42';
      ctx.fillText(
        entry.anomaly.id.startsWith('school.') ? '欠　席　2' : '2 3 : 4 7',
        projection.centerX,
        projection.centerY,
        Math.max(20, w * 1.8),
      );
      break;
    case 'HEAD_AND_HAND':
    case 'HAIR_AND_SHOULDER':
    case 'FRAME_EDGE_SHADOW':
    case 'FULL_BODY':
      break;
  }
  ctx.restore();
  void riskTier;
}

function resolveViewerThreat(
  riskTier: RiskTier,
  loopCount: number,
  override: Partial<PipViewerThreatProfile> | null | undefined,
): PipViewerThreatProfile | null {
  if (override === null) return null;
  const base = VIEWER_THREAT_BY_RISK[riskTier];
  const merged: PipViewerThreatProfile = {
    id: override?.id ?? base.id,
    visible: override?.visible ?? base.visible,
    distance: override?.distance ?? base.distance,
    lateral: override?.lateral ?? base.lateral,
    elevation: override?.elevation ?? base.elevation,
    worldWidth: override?.worldWidth ?? base.worldWidth,
    worldHeight: override?.worldHeight ?? base.worldHeight,
    alpha: override?.alpha ?? base.alpha,
  };
  return {
    ...merged,
    distance: Math.max(
      CAMERA_CONFIG.nearDistance + 8,
      merged.distance -
        (override?.distance === undefined ? Math.max(0, loopCount) * 14 : 0),
    ),
    lateral: clamp(merged.lateral, -1, 1),
    elevation: clamp(merged.elevation, 0, 1),
    alpha: clamp(merged.alpha, 0, 1),
  };
}

function projectedViewerEntry(
  snapshot: SceneSnapshot,
  riskTier: RiskTier,
  loopCount: number,
  override: Partial<PipViewerThreatProfile> | null | undefined,
): ProjectedViewerEntry | null {
  const threat = resolveViewerThreat(riskTier, loopCount, override);
  if (!threat?.visible) return null;
  const anchor: CorridorCameraAnchor = {
    id: threat.id,
    worldX: snapshot.player.x + snapshot.player.facing * threat.distance,
    lateral: threat.lateral,
    elevation: threat.elevation,
    worldWidth: threat.worldWidth,
    worldHeight: threat.worldHeight,
    surface: 'floor',
  };
  const projection = projectCorridorAnchor(
    anchor,
    snapshot.player,
    CAMERA_CONFIG,
  );
  if (!projection.visible) return null;
  return { kind: 'viewer', projection, alpha: threat.alpha };
}

function projectedEntries(
  snapshot: SceneSnapshot,
  riskTier: RiskTier,
  loopCount: number,
  viewerThreat: Partial<PipViewerThreatProfile> | null | undefined,
): ProjectedEntry[] {
  const entries: ProjectedEntry[] = [];
  getSceneDefinitions(snapshot.boardId).forEach((scene) => {
    scene.props.forEach((prop) => {
      const projection = projectPropToCamera(prop, snapshot.player, CAMERA_CONFIG);
      if (projection.visible) entries.push({ kind: 'prop', projection, prop });
    });
  });

  const itemPositions = getItemWorldPositions(snapshot.boardId);
  snapshot.items.forEach((item) => {
    if (item.found) return;
    const worldX = itemPositions[item.id];
    if (worldX === undefined) return;
    const projection = projectCorridorAnchor(
      itemAnchor(item, worldX),
      snapshot.player,
      CAMERA_CONFIG,
    );
    if (projection.visible) entries.push({ kind: 'item', projection, item });
  });

  snapshot.anomalies.forEach((anomaly) => {
    const visual = getAnomalyVisualProfile(anomaly, 'pip', riskTier);
    if (!visual.visible) return;
    const loopApproach =
      anomaly.id === 'school.anomaly.landing'
        ? Math.max(0, loopCount) * 12
        : 0;
    const projection = projectPresentedAnomalyToCamera(
      anomaly,
      snapshot.player,
      visual.approachOffsetPx + loopApproach,
      CAMERA_CONFIG,
    );
    if (!projection.visible) return;
    entries.push({
      kind: 'anomaly',
      projection,
      anomaly,
      alpha: visual.alpha,
      fragmentKind: visual.fragmentKind,
    });
  });

  const viewer = projectedViewerEntry(
    snapshot,
    riskTier,
    loopCount,
    viewerThreat,
  );
  if (viewer) entries.push(viewer);

  const tieOrder: Readonly<Record<ProjectedEntry['kind'], number>> = {
    anomaly: 0,
    viewer: 0,
    item: 1,
    prop: 2,
  };
  // Painter's algorithm: a nearer opaque prop is drawn after and therefore
  // naturally hides a farther anomaly occupying the same screen region.
  return entries.sort(
    (left, right) =>
      right.projection.forwardDistance - left.projection.forwardDistance ||
      tieOrder[left.kind] - tieOrder[right.kind] ||
      left.projection.id.localeCompare(right.projection.id),
  );
}

function drawLightAndExposure(
  ctx: CanvasRenderingContext2D,
  snapshot: SceneSnapshot,
  riskTier: RiskTier,
  now: number,
) {
  const flashlightAvailable =
    snapshot.player.flashlightOn && snapshot.player.battery > 0;
  const corruption = riskTier * 0.035 + snapshot.player.tension / 3600;
  const flicker =
    0.98 + Math.sin(now / 173 + riskTier * 0.9) * clamp(corruption, 0.01, 0.08);
  const centerX = PIP_PERSPECTIVE_WIDTH / 2;
  const centerY = PIP_PERSPECTIVE_HEIGHT * 0.52;

  if (flashlightAvailable) {
    // Draw darkness as one elliptical alpha field. This preserves the scene
    // beneath it; destination-out on the scene canvas would erase both the
    // darkness layer and the world pixels it is meant to reveal.
    ctx.save();
    const radiusX = 158;
    const radiusY = 98;
    const yScale = radiusY / radiusX;
    ctx.translate(centerX, centerY);
    ctx.scale(1, yScale);
    const darkness = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusX);
    // Three visibly distinct information bands: bright evidence core,
    // readable mid falloff, and a threatening outer fringe.
    darkness.addColorStop(0, `rgba(0,0,0,${0.035 / flicker})`);
    darkness.addColorStop(0.34, `rgba(0,0,0,${0.055 / flicker})`);
    darkness.addColorStop(0.38, `rgba(0,0,0,${0.22 / flicker})`);
    darkness.addColorStop(0.65, `rgba(0,0,0,${0.3 / flicker})`);
    darkness.addColorStop(0.7, `rgba(0,0,0,${0.57 / flicker})`);
    darkness.addColorStop(0.92, `rgba(0,0,0,${0.7 / flicker})`);
    darkness.addColorStop(1, 'rgba(0,0,0,0.86)');
    ctx.fillStyle = darkness;
    ctx.fillRect(
      -centerX,
      -centerY / yScale,
      PIP_PERSPECTIVE_WIDTH,
      PIP_PERSPECTIVE_HEIGHT / yScale,
    );
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, PIP_PERSPECTIVE_WIDTH, PIP_PERSPECTIVE_HEIGHT);
  }

  if (flashlightAvailable) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(centerX, centerY);
    ctx.scale(1, 0.68);
    const warmth = ctx.createRadialGradient(0, 0, 2, 0, 0, 92);
    warmth.addColorStop(0, `rgba(209,182,139,${0.2 * flicker})`);
    warmth.addColorStop(0.55, `rgba(209,182,139,${0.095 * flicker})`);
    warmth.addColorStop(1, 'rgba(209,182,139,0)');
    ctx.fillStyle = warmth;
    ctx.beginPath();
    ctx.arc(0, 0, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // Low-gain camera exposure keeps geometry barely navigable without making
    // an empty battery equivalent to a working flashlight.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const lowGain = ctx.createRadialGradient(centerX, centerY, 6, centerX, centerY, 130);
    lowGain.addColorStop(0, 'rgba(58,88,71,0.07)');
    lowGain.addColorStop(1, 'rgba(20,37,29,0)');
    ctx.fillStyle = lowGain;
    ctx.fillRect(0, 0, PIP_PERSPECTIVE_WIDTH, PIP_PERSPECTIVE_HEIGHT);
    ctx.restore();
  }

  const vignette = ctx.createRadialGradient(
    centerX,
    centerY,
    52,
    centerX,
    centerY,
    190,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.44)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, PIP_PERSPECTIVE_WIDTH, PIP_PERSPECTIVE_HEIGHT);
}

/**
 * Renders a delayed canonical SceneSnapshot as a chest-camera corridor view.
 * It deliberately owns no state, timers, randomness, React, or DVR selection;
 * callers may therefore reuse exactly the same projection for capture logic.
 */
export function renderPipPerspectiveScene({
  ctx,
  snapshot,
  riskTier,
  loopCount,
  now,
  viewerThreat,
}: RenderPipPerspectiveSceneInput): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, PIP_PERSPECTIVE_WIDTH, PIP_PERSPECTIVE_HEIGHT);

  const palette = getSceneDefinitionAt(
    snapshot.player.x,
    snapshot.boardId,
  ).palette;
  drawCorridor(ctx, snapshot, palette);

  const pipDifferenceActive = snapshot.anomalies.some(
    (anomaly) =>
      anomaly.id === 'school.anomaly.blackboard' &&
      anomaly.directorState?.phase === 'ACTIVE' &&
      !anomaly.captured &&
      !anomaly.resolution,
  );

  projectedEntries(
    snapshot,
    riskTier,
    loopCount,
    viewerThreat,
  ).forEach((entry) => {
    switch (entry.kind) {
      case 'prop':
        drawProp(
          ctx,
          entry,
          snapshot,
          palette,
          pipDifferenceActive,
        );
        break;
      case 'item':
        drawItem(ctx, entry, snapshot);
        break;
      case 'anomaly':
        drawAnomaly(ctx, entry, riskTier);
        break;
      case 'viewer':
        drawObserverFigure(
          ctx,
          entry.projection,
          entry.alpha,
          observerTierForRisk(riskTier),
        );
        break;
    }
  });

  drawLightAndExposure(ctx, snapshot, riskTier, now);
  ctx.restore();
}
