import { Anomaly, BoardId, GameItem, PlayerState, RiskTier } from '../types';
import {
  getSceneDefinitionAt,
  getSceneDefinitions,
  getItemWorldPositions,
  HOSPITAL_ITEM_WORLD_POSITIONS,
  ScenePalette,
  WorldPropDefinition,
} from '../game/sceneDefinitions';
import { isAnomalyRenderable } from '../game/anomalyDirector';
import { getAnomalyVisualProfile } from '../game/anomalyPresentation';
import { canonicalSceneHistory } from '../game/sceneSnapshot';
import {
  createPlayerSpriteFrame,
  getPlayerSpritePose,
  PlayerSpriteFrameInput,
  PlayerSpritePose,
} from '../game/playerSprite';
import {
  drawAtlasCell,
  getHospitalAssetAtlasCell,
  getObserverAtlasCell,
  getRuntimeAtlasLoadState,
  selectPlayerAtlasCell,
  type HospitalAssetKey,
  type ObserverAtlasTier,
} from '../game/runtimeVisualAssets';

export const PIXEL_VIEW_WIDTH = 640;
export const PIXEL_VIEW_HEIGHT = 300;
export const PIXEL_FLOOR_Y = 238;

export const ITEM_WORLD_POSITIONS: Readonly<Record<string, number>> =
  HOSPITAL_ITEM_WORLD_POSITIONS;

interface RuntimePropLayout {
  readonly width: number;
  readonly height: number;
  readonly y: number;
}

const HOSPITAL_PROP_LAYOUTS: Readonly<
  Partial<Record<HospitalAssetKey, RuntimePropLayout>>
> = {
  bed: { width: 128, height: 84, y: 155 },
  gurney: { width: 112, height: 78, y: 160 },
  wheelchair: { width: 96, height: 86, y: 151 },
  'iv-stand': { width: 128, height: 95, y: 143 },
  'medicine-cart': { width: 116, height: 84, y: 153 },
  'locker-closed': { width: 166, height: 112, y: 135 },
  'locker-open': { width: 166, height: 112, y: 135 },
  crt: { width: 112, height: 86, y: 158 },
  door: { width: 178, height: 138, y: 117 },
  curtain: { width: 158, height: 143, y: 45 },
  'wet-reflection': { width: 145, height: 52, y: 216 },
};

export type SceneRenderChannel = 'main' | 'pip';

export interface PixelSceneInput {
  ctx: CanvasRenderingContext2D;
  player: PlayerState;
  anomalies: Anomaly[];
  items: GameItem[];
  mouse: { x: number; y: number };
  now: number;
  isMoving: boolean;
  boardId?: BoardId;
  riskTier?: RiskTier;
  loopCount?: number;
  channel?: SceneRenderChannel;
  recordSnapshot?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const hash = (value: number) => {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
const worldToScreen = (worldX: number, playerX: number) => Math.round(worldX - (playerX - PIXEL_VIEW_WIDTH * 0.42));

function fillPixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function drawWallTexture(ctx: CanvasRenderingContext2D, viewX: number, palette: ScenePalette) {
  fillPixelRect(ctx, 0, 0, PIXEL_VIEW_WIDTH, PIXEL_FLOOR_Y, palette.wall);
  for (let worldX = Math.floor(viewX / 64) * 64 - 64; worldX < viewX + PIXEL_VIEW_WIDTH + 64; worldX += 64) {
    const x = Math.round(worldX - viewX);
    fillPixelRect(ctx, x, 0, 1, PIXEL_FLOOR_Y, palette.wallLine);
    if (hash(worldX * 0.13) > 0.42) {
      const stainY = 40 + Math.floor(hash(worldX * 0.07) * 145);
      const stainW = 9 + Math.floor(hash(worldX * 0.19) * 22);
      const stainH = 3 + Math.floor(hash(worldX * 0.23) * 14);
      ctx.globalAlpha = 0.22 + hash(worldX * 0.31) * 0.18;
      fillPixelRect(ctx, x + 7, stainY, stainW, stainH, palette.stain);
      ctx.globalAlpha = 1;
    }
  }
  fillPixelRect(ctx, 0, 29, PIXEL_VIEW_WIDTH, 2, palette.wallDark);
  fillPixelRect(ctx, 0, 33, PIXEL_VIEW_WIDTH, 1, palette.wallLine);
  fillPixelRect(ctx, 0, PIXEL_FLOOR_Y - 10, PIXEL_VIEW_WIDTH, 10, palette.wallDark);
  for (let x = -Math.round(viewX % 23); x < PIXEL_VIEW_WIDTH; x += 23) {
    const worldX = viewX + x;
    if (hash(worldX * 0.77) > 0.58) {
      const y = 52 + Math.floor(hash(worldX * 0.51) * 144);
      ctx.fillStyle = `rgba(220,216,196,${0.018 + hash(worldX) * 0.026})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawFloor(ctx: CanvasRenderingContext2D, viewX: number, palette: ScenePalette) {
  fillPixelRect(ctx, 0, PIXEL_FLOOR_Y, PIXEL_VIEW_WIDTH, PIXEL_VIEW_HEIGHT - PIXEL_FLOOR_Y, palette.floor);
  fillPixelRect(ctx, 0, PIXEL_FLOOR_Y, PIXEL_VIEW_WIDTH, 2, palette.floorLine);
  for (let y = PIXEL_FLOOR_Y + 14; y < PIXEL_VIEW_HEIGHT; y += 14) {
    ctx.globalAlpha = 0.45;
    fillPixelRect(ctx, 0, y, PIXEL_VIEW_WIDTH, 1, palette.floorLine);
    ctx.globalAlpha = 1;
  }
  for (let worldX = Math.floor(viewX / 48) * 48 - 48; worldX < viewX + PIXEL_VIEW_WIDTH + 48; worldX += 48) {
    const x = Math.round(worldX - viewX);
    ctx.strokeStyle = palette.floorLine;
    ctx.globalAlpha = 0.54;
    ctx.beginPath();
    ctx.moveTo(x, PIXEL_FLOOR_Y);
    ctx.lineTo(x - 15, PIXEL_VIEW_HEIGHT);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (let x = -Math.round(viewX % 31); x < PIXEL_VIEW_WIDTH; x += 31) {
    if (hash((viewX + x) * 0.43) > 0.52) {
      const y = PIXEL_FLOOR_Y + 7 + Math.floor(hash((viewX + x) * 0.29) * 46);
      fillPixelRect(ctx, x, y, 3 + Math.floor(hash(x) * 7), 1, '#090a09');
    }
  }
}

function drawCeilingPipes(ctx: CanvasRenderingContext2D, viewX: number, palette: ScenePalette) {
  ctx.strokeStyle = palette.metal;
  ctx.globalAlpha = 0.54;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 19);
  ctx.lineTo(PIXEL_VIEW_WIDTH, 19);
  ctx.moveTo(0, 24);
  ctx.lineTo(PIXEL_VIEW_WIDTH, 24);
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let worldX = Math.floor(viewX / 96) * 96 - 96; worldX < viewX + PIXEL_VIEW_WIDTH + 96; worldX += 96) {
    const x = Math.round(worldX - viewX);
    fillPixelRect(ctx, x, 15, 3, 13, palette.wallDark);
    fillPixelRect(ctx, x + 1, 16, 1, 11, palette.metal);
  }
}

function drawDoor(ctx: CanvasRenderingContext2D, screenX: number, label: string, palette: ScenePalette, sealed = false) {
  const x = Math.round(screenX);
  if (x < -80 || x > PIXEL_VIEW_WIDTH + 80) return;
  fillPixelRect(ctx, x - 31, 58, 62, 171, palette.wallDark);
  fillPixelRect(ctx, x - 27, 62, 54, 167, '#1b1a17');
  fillPixelRect(ctx, x - 22, 69, 44, 142, '#24221e');
  fillPixelRect(ctx, x - 18, 76, 36, 18, '#0b0b0a');
  fillPixelRect(ctx, x + 16, 147, 3, 3, '#9a8050');
  fillPixelRect(ctx, x - 25, 211, 50, 3, '#0a0a09');
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8e8c82';
  ctx.globalAlpha = 0.68;
  ctx.fillText(label, x, 88);
  ctx.globalAlpha = 1;
  if (sealed) {
    ctx.strokeStyle = '#40231f';
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.68;
    ctx.beginPath();
    ctx.moveTo(x - 28, 93);
    ctx.lineTo(x + 25, 190);
    ctx.moveTo(x + 25, 96);
    ctx.lineTo(x - 26, 188);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, palette: ScenePalette) {
  fillPixelRect(ctx, x - 3, y - 3, width + 6, height + 6, palette.wallDark);
  fillPixelRect(ctx, x, y, width, height, '#090d0e');
  fillPixelRect(ctx, x + Math.floor(width / 2), y, 2, height, palette.metal);
  fillPixelRect(ctx, x, y + Math.floor(height / 2), width, 2, palette.metal);
  ctx.globalAlpha = 0.1;
  fillPixelRect(ctx, x + 4, y + 4, width - 8, height - 8, '#9cb0a8');
  ctx.globalAlpha = 1;
}

function drawBed(ctx: CanvasRenderingContext2D, screenX: number, palette: ScenePalette) {
  const x = Math.round(screenX);
  if (x < -100 || x > PIXEL_VIEW_WIDTH + 100) return;
  fillPixelRect(ctx, x - 42, 190, 84, 7, '#59564d');
  fillPixelRect(ctx, x - 39, 181, 72, 10, '#44453f');
  fillPixelRect(ctx, x - 37, 177, 28, 5, '#77756b');
  fillPixelRect(ctx, x - 36, 198, 3, 34, palette.metal);
  fillPixelRect(ctx, x + 31, 198, 3, 34, palette.metal);
  fillPixelRect(ctx, x - 47, 168, 3, 64, palette.metal);
  fillPixelRect(ctx, x + 42, 168, 3, 64, palette.metal);
  ctx.globalAlpha = 0.34;
  fillPixelRect(ctx, x - 8, 184, 30, 4, palette.stain);
  ctx.globalAlpha = 1;
}

function drawLocker(ctx: CanvasRenderingContext2D, screenX: number, open: boolean, palette: ScenePalette) {
  const x = Math.round(screenX);
  if (x < -80 || x > PIXEL_VIEW_WIDTH + 80) return;
  fillPixelRect(ctx, x - 22, 86, 44, 143, '#252a28');
  fillPixelRect(ctx, x - 19, 90, 38, 135, '#303531');
  fillPixelRect(ctx, x - 12, 101, 24, 2, '#111514');
  fillPixelRect(ctx, x - 12, 109, 24, 2, '#111514');
  fillPixelRect(ctx, x + 11, 154, 2, 7, palette.metal);
  if (open) {
    fillPixelRect(ctx, x - 17, 94, 31, 127, '#070908');
    fillPixelRect(ctx, x - 41, 91, 23, 135, '#282d2a');
    fillPixelRect(ctx, x - 39, 95, 19, 127, '#343a36');
    ctx.globalAlpha = 0.35;
    fillPixelRect(ctx, x - 8, 190, 2, 2, '#9c2c25');
    fillPixelRect(ctx, x + 2, 190, 2, 2, '#9c2c25');
    ctx.globalAlpha = 1;
  }
}

function drawWheelchair(ctx: CanvasRenderingContext2D, screenX: number) {
  const x = Math.round(screenX);
  if (x < -70 || x > PIXEL_VIEW_WIDTH + 70) return;
  ctx.strokeStyle = '#444741';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 15, 178);
  ctx.lineTo(x - 8, 209);
  ctx.lineTo(x + 20, 209);
  ctx.lineTo(x + 25, 228);
  ctx.stroke();
  ctx.fillStyle = '#151816';
  ctx.beginPath();
  ctx.arc(x + 4, 218, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 28, 226, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  fillPixelRect(ctx, x - 14, 172, 24, 10, '#282c28');
}

function drawGurney(ctx: CanvasRenderingContext2D, screenX: number, palette: ScenePalette) {
  const x = Math.round(screenX);
  if (x < -100 || x > PIXEL_VIEW_WIDTH + 100) return;
  fillPixelRect(ctx, x - 48, 193, 96, 8, '#565b58');
  fillPixelRect(ctx, x - 43, 185, 83, 8, '#78796f');
  fillPixelRect(ctx, x - 36, 201, 3, 27, palette.metal);
  fillPixelRect(ctx, x + 34, 201, 3, 27, palette.metal);
  fillPixelRect(ctx, x - 39, 228, 11, 2, palette.metal);
  fillPixelRect(ctx, x + 29, 228, 11, 2, palette.metal);
  ctx.globalAlpha = 0.3;
  fillPixelRect(ctx, x - 8, 187, 27, 3, '#6b2c24');
  ctx.globalAlpha = 1;
}

function drawAltar(ctx: CanvasRenderingContext2D, screenX: number, palette: ScenePalette) {
  const x = Math.round(screenX);
  if (x < -120 || x > PIXEL_VIEW_WIDTH + 120) return;
  fillPixelRect(ctx, x - 70, 170, 140, 8, '#29211a');
  fillPixelRect(ctx, x - 62, 178, 124, 51, '#1d1713');
  fillPixelRect(ctx, x - 54, 184, 108, 37, '#261d16');
  fillPixelRect(ctx, x - 47, 222, 94, 7, '#100d0b');
  fillPixelRect(ctx, x - 42, 149, 5, 22, '#8d6336');
  fillPixelRect(ctx, x + 37, 149, 5, 22, '#8d6336');
  fillPixelRect(ctx, x - 41, 145, 3, 4, palette.lamp);
  fillPixelRect(ctx, x + 38, 145, 3, 4, palette.lamp);
  fillPixelRect(ctx, x - 9, 151, 18, 18, '#c2b6a0');
  fillPixelRect(ctx, x - 5, 155, 3, 4, '#171310');
  fillPixelRect(ctx, x + 3, 155, 3, 4, '#171310');
}

function drawGraffiti(ctx: CanvasRenderingContext2D, screenX: number, text: string, color: string) {
  const x = Math.round(screenX);
  if (x < -100 || x > PIXEL_VIEW_WIDTH + 100) return;
  ctx.font = 'bold 13px serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.36;
  ctx.fillText(text, x, 133);
  ctx.globalAlpha = 1;
}

function drawEmergencyExit(ctx: CanvasRenderingContext2D, screenX: number) {
  const x = Math.round(screenX);
  if (x < -90 || x > PIXEL_VIEW_WIDTH + 90) return;
  fillPixelRect(ctx, x - 37, 48, 74, 181, '#0a1815');
  fillPixelRect(ctx, x - 32, 54, 64, 175, '#0f2420');
  fillPixelRect(ctx, x - 23, 68, 46, 17, '#124e3d');
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#83b8a2';
  ctx.globalAlpha = 0.72;
  ctx.fillText('非常口 EXIT', x, 80);
  ctx.globalAlpha = 1;
}

function drawShoeLockers(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  columns: number,
  palette: ScenePalette,
) {
  const x = Math.round(screenX);
  const safeColumns = Math.max(3, Math.min(8, columns));
  const cellWidth = 18;
  const totalWidth = safeColumns * cellWidth;
  if (x < -totalWidth || x > PIXEL_VIEW_WIDTH + totalWidth) return;
  fillPixelRect(ctx, x - totalWidth / 2 - 3, 104, totalWidth + 6, 126, palette.wallDark);
  for (let column = 0; column < safeColumns; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      const cellX = x - totalWidth / 2 + column * cellWidth;
      const cellY = 108 + row * 29;
      const open = column === safeColumns - 2 && row === 2;
      fillPixelRect(ctx, cellX, cellY, 16, 26, open ? '#080a08' : '#29302b');
      fillPixelRect(ctx, cellX + 2, cellY + 4, 12, 1, palette.metal);
      if (open) {
        fillPixelRect(ctx, cellX + 13, cellY + 2, 7, 24, '#333b35');
      } else {
        fillPixelRect(ctx, cellX + 7, cellY + 17, 2, 2, '#757269');
      }
    }
  }
  ctx.globalAlpha = 0.32;
  fillPixelRect(ctx, x - 37, 231, 13, 3, '#202720');
  fillPixelRect(ctx, x + 16, 233, 17, 2, '#202720');
  ctx.globalAlpha = 1;
}

function drawBlackboard(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  text: string,
  palette: ScenePalette,
) {
  const x = Math.round(screenX);
  if (x < -110 || x > PIXEL_VIEW_WIDTH + 110) return;
  fillPixelRect(ctx, x - 78, 78, 156, 88, palette.wallDark);
  fillPixelRect(ctx, x - 73, 83, 146, 76, '#14201b');
  fillPixelRect(ctx, x - 80, 164, 160, 4, palette.metal);
  ctx.save();
  ctx.font = '10px serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#a7aaa0';
  ctx.globalAlpha = 0.46;
  ctx.fillText(text, x, 116);
  ctx.font = '7px monospace';
  ctx.fillText('0:13　日直：　　　　　', x - 7, 143);
  ctx.restore();
}

function drawSchoolDesks(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  rows: number,
  palette: ScenePalette,
) {
  const x = Math.round(screenX);
  const safeRows = Math.max(1, Math.min(3, rows));
  if (x < -130 || x > PIXEL_VIEW_WIDTH + 130) return;
  for (let row = 0; row < safeRows; row += 1) {
    const y = 181 + row * 18;
    const width = 62 + row * 13;
    const offset = row * 10;
    fillPixelRect(ctx, x - width / 2 + offset, y, width, 5, '#4a3c2b');
    fillPixelRect(ctx, x - width / 2 + offset + 4, y + 5, 3, 24, palette.metal);
    fillPixelRect(ctx, x + width / 2 + offset - 7, y + 5, 3, 24, palette.metal);
    fillPixelRect(ctx, x - width / 2 + offset + 10, y - 12, 26, 10, '#27231d');
  }
}

function drawSpeaker(ctx: CanvasRenderingContext2D, screenX: number) {
  const x = Math.round(screenX);
  if (x < -50 || x > PIXEL_VIEW_WIDTH + 50) return;
  fillPixelRect(ctx, x - 17, 48, 34, 28, '#252b29');
  fillPixelRect(ctx, x - 13, 52, 26, 20, '#0b0e0d');
  ctx.strokeStyle = '#4b514d';
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(x, 62, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  fillPixelRect(ctx, x - 1, 76, 2, 13, '#303735');
}

function drawStairs(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  palette: ScenePalette,
) {
  const x = Math.round(screenX);
  if (x < -150 || x > PIXEL_VIEW_WIDTH + 150) return;
  for (let step = 0; step < 7; step += 1) {
    fillPixelRect(
      ctx,
      x - 80 + step * 15,
      219 - step * 14,
      100 - step * 7,
      14,
      step % 2 === 0 ? '#24211c' : '#1d1b17',
    );
    fillPixelRect(ctx, x - 80 + step * 15, 219 - step * 14, 100 - step * 7, 1, palette.metal);
  }
  ctx.strokeStyle = palette.metal;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 83, 184);
  ctx.lineTo(x + 72, 73);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function getHospitalRuntimePropKey(
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

function drawHospitalRuntimeProp(
  ctx: CanvasRenderingContext2D,
  prop: WorldPropDefinition,
  screenX: number,
  boardId: BoardId,
): boolean {
  if (boardId !== 'hospital') return false;
  const key = getHospitalRuntimePropKey(prop);
  if (!key) return false;
  const layout = HOSPITAL_PROP_LAYOUTS[key];
  if (!layout) return false;
  return drawAtlasCell(
    ctx,
    'hospital-props',
    getHospitalAssetAtlasCell(key),
    {
      x: Math.round(screenX - layout.width / 2),
      y: layout.y,
      width: layout.width,
      height: layout.height,
    },
  );
}

function drawIvStandFallback(ctx: CanvasRenderingContext2D, screenX: number) {
  const x = Math.round(screenX);
  ctx.strokeStyle = '#50534c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 151);
  ctx.lineTo(x, 231);
  ctx.moveTo(x - 12, 154);
  ctx.lineTo(x + 12, 154);
  ctx.moveTo(x, 231);
  ctx.lineTo(x - 10, 237);
  ctx.moveTo(x, 231);
  ctx.lineTo(x + 10, 237);
  ctx.stroke();
  fillPixelRect(ctx, x - 9, 158, 8, 18, '#66736d');
  fillPixelRect(ctx, x - 8, 160, 6, 13, '#89938b');
}

function drawMedicineCartFallback(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  palette: ScenePalette,
) {
  const x = Math.round(screenX);
  fillPixelRect(ctx, x - 27, 174, 54, 48, palette.metal);
  fillPixelRect(ctx, x - 24, 178, 48, 12, '#272b27');
  fillPixelRect(ctx, x - 24, 194, 48, 3, '#151715');
  fillPixelRect(ctx, x - 24, 206, 48, 3, '#151715');
  fillPixelRect(ctx, x - 23, 222, 3, 12, palette.metal);
  fillPixelRect(ctx, x + 20, 222, 3, 12, palette.metal);
}

function drawCrtFallback(ctx: CanvasRenderingContext2D, screenX: number) {
  const x = Math.round(screenX);
  fillPixelRect(ctx, x - 27, 185, 54, 45, '#292d2b');
  fillPixelRect(ctx, x - 21, 191, 42, 29, '#54615f');
  for (let line = 0; line < 8; line += 1) {
    fillPixelRect(
      ctx,
      x - 18 + (line % 2) * 5,
      194 + line * 3,
      31 - (line % 3) * 4,
      1,
      'rgba(196,211,204,0.44)',
    );
  }
}

function drawCurtainFallback(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  palette: ScenePalette,
) {
  const x = Math.round(screenX);
  fillPixelRect(ctx, x - 54, 63, 108, 3, palette.metal);
  for (let strip = 0; strip < 8; strip += 1) {
    fillPixelRect(
      ctx,
      x - 48 + strip * 13,
      67,
      10,
      96 - (strip % 3) * 7,
      strip % 2 ? '#343630' : '#3e4037',
    );
  }
}

function drawWetReflectionFallback(
  ctx: CanvasRenderingContext2D,
  screenX: number,
) {
  const x = Math.round(screenX);
  ctx.globalAlpha = 0.28;
  fillPixelRect(ctx, x - 46, PIXEL_FLOOR_Y + 5, 92, 16, '#4e6666');
  fillPixelRect(ctx, x - 4, PIXEL_FLOOR_Y + 2, 8, 27, '#809592');
  fillPixelRect(ctx, x - 29, PIXEL_FLOOR_Y + 26, 58, 2, '#263635');
  ctx.globalAlpha = 1;
}

function drawWorldProp(
  ctx: CanvasRenderingContext2D,
  prop: WorldPropDefinition,
  playerX: number,
  palette: ScenePalette,
  channel: SceneRenderChannel,
  boardDifferenceActive: boolean,
  boardId: BoardId,
) {
  const screenX = worldToScreen(prop.worldX, playerX);
  if (drawHospitalRuntimeProp(ctx, prop, screenX, boardId)) return;
  switch (prop.kind) {
    case 'window':
      drawWindow(
        ctx,
        screenX - Math.floor(prop.width / 2),
        prop.y,
        prop.width,
        prop.height,
        palette,
      );
      break;
    case 'bed':
      drawBed(ctx, screenX, palette);
      break;
    case 'wheelchair':
      drawWheelchair(ctx, screenX);
      break;
    case 'door':
      drawDoor(ctx, screenX, prop.label, palette, prop.sealed);
      break;
    case 'locker':
      drawLocker(ctx, screenX, prop.open, palette);
      break;
    case 'gurney':
      drawGurney(ctx, screenX, palette);
      break;
    case 'iv-stand':
      drawIvStandFallback(ctx, screenX);
      break;
    case 'medicine-cart':
      drawMedicineCartFallback(ctx, screenX, palette);
      break;
    case 'crt':
      drawCrtFallback(ctx, screenX);
      break;
    case 'curtain':
      drawCurtainFallback(ctx, screenX, palette);
      break;
    case 'wet-reflection':
      drawWetReflectionFallback(ctx, screenX);
      break;
    case 'altar':
      drawAltar(ctx, screenX, palette);
      break;
    case 'exit':
      drawEmergencyExit(ctx, screenX);
      break;
    case 'graffiti':
      drawGraffiti(ctx, screenX, prop.text, prop.color);
      break;
    case 'shoe-lockers':
      drawShoeLockers(ctx, screenX, prop.columns ?? 6, palette);
      break;
    case 'blackboard':
      drawBlackboard(
        ctx,
        screenX,
        channel === 'pip' && boardDifferenceActive && prop.pipText
          ? prop.pipText
          : prop.text,
        palette,
      );
      break;
    case 'school-desks':
      drawSchoolDesks(ctx, screenX, prop.rows ?? 2, palette);
      break;
    case 'speaker':
      drawSpeaker(ctx, screenX);
      break;
    case 'stairs':
      drawStairs(ctx, screenX, palette);
      break;
  }
}

function drawEnvironment(
  ctx: CanvasRenderingContext2D,
  playerX: number,
  boardId: BoardId,
  channel: SceneRenderChannel,
  boardDifferenceActive: boolean,
) {
  const viewX = playerX - PIXEL_VIEW_WIDTH * 0.42;
  const palette = getSceneDefinitionAt(playerX, boardId).palette;
  drawWallTexture(ctx, viewX, palette);
  drawFloor(ctx, viewX, palette);
  drawCeilingPipes(ctx, viewX, palette);

  getSceneDefinitions(boardId).forEach((scene) => {
    scene.ambientLights.forEach((ambientLight) => {
      const x = worldToScreen(ambientLight.worldX, playerX);
      if (x < -110 || x > PIXEL_VIEW_WIDTH + 110) return;
      const radius = ambientLight.radius ?? 90;
      fillPixelRect(ctx, x - 12, 37, 24, 4, '#34332e');
      fillPixelRect(ctx, x - 7, 41, 14, 3, scene.palette.lamp);
      ctx.globalAlpha = ambientLight.alpha ?? 0.06;
      const light = ctx.createRadialGradient(x, 48, 2, x, 48, radius);
      light.addColorStop(0, scene.palette.lamp);
      light.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = light;
      ctx.fillRect(x - radius - 10, 40, radius * 2 + 20, 160);
      ctx.globalAlpha = 1;
    });
    scene.props.forEach((prop) =>
      drawWorldProp(
        ctx,
        prop,
        playerX,
        scene.palette,
        channel,
        boardDifferenceActive,
        boardId,
      ),
    );
  });
}

function drawItem(
  ctx: CanvasRenderingContext2D,
  item: GameItem,
  playerX: number,
  now: number,
  itemPositions: Readonly<Record<string, number>>,
  boardId: BoardId,
) {
  if (item.found) return;
  const worldX = itemPositions[item.id];
  if (worldX === undefined) return;
  const x = worldToScreen(worldX, playerX);
  if (x < -30 || x > PIXEL_VIEW_WIDTH + 30) return;
  const y = 221 + Math.round(Math.sin(now / 230 + worldX) * 2);
  const near = Math.abs(playerX - worldX) < 70;
  ctx.globalAlpha = near ? 0.34 : 0.16;
  const glow = ctx.createRadialGradient(x, y, 1, x, y, near ? 24 : 15);
  glow.addColorStop(0, 'rgba(202,170,105,0.9)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 28, y - 28, 56, 56);
  ctx.globalAlpha = 1;
  const runtimeItemDrawn =
    boardId === 'hospital' &&
    drawAtlasCell(
      ctx,
      'hospital-props',
      getHospitalAssetAtlasCell(item.type),
      { x: x - 26, y: y - 18, width: 52, height: 40 },
    );
  if (!runtimeItemDrawn) {
    if (item.type === 'keycard') {
      fillPixelRect(ctx, x - 7, y - 4, 14, 9, '#5e7775');
      fillPixelRect(ctx, x - 5, y - 2, 4, 2, '#b7c8bf');
    } else {
      fillPixelRect(ctx, x - 6, y - 7, 12, 14, '#a9946d');
      fillPixelRect(ctx, x - 4, y - 4, 8, 1, '#5c4e37');
      fillPixelRect(ctx, x - 4, y - 1, 7, 1, '#5c4e37');
    }
  }
  if (near) {
    fillPixelRect(ctx, x - 34, y - 28, 68, 13, 'rgba(3,3,3,0.86)');
    ctx.strokeStyle = 'rgba(205,196,171,0.38)';
    ctx.strokeRect(x - 34.5, y - 28.5, 68, 13);
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = '#bdb6a6';
    ctx.textAlign = 'center';
    ctx.fillText('[ E ] 調べる', x, y - 19);
  }
}

const OBSERVER_ANOMALY_ID = 'hospital.anomaly.door-figure';

function getObserverTierForRisk(riskTier: RiskTier): ObserverAtlasTier {
  if (riskTier >= 3) return 'near';
  if (riskTier >= 2) return 'mid';
  return 'far';
}

function drawRuntimeObserver(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorOffset: number,
  riskTier: RiskTier,
  alpha: number,
): boolean {
  const tier = getObserverTierForRisk(riskTier);
  const layout: Readonly<Record<ObserverAtlasTier, RuntimePropLayout>> = {
    far: { width: 76, height: 90, y: 0 },
    mid: { width: 90, height: 94, y: 0 },
    near: { width: 80, height: 104, y: 0 },
  };
  const anchorRatio: Readonly<Record<ObserverAtlasTier, number>> = {
    far: 0.86,
    mid: 0.86,
    near: 0.885,
  };
  const { width, height } = layout[tier];
  const y = Math.round(
    PIXEL_FLOOR_Y + floorOffset - height * anchorRatio[tier],
  );
  return drawAtlasCell(ctx, 'observer', getObserverAtlasCell(tier), {
    x: Math.round(x - width / 2),
    y,
    width,
    height,
    alpha,
  });
}

function drawAnomaly(
  ctx: CanvasRenderingContext2D,
  anomaly: Anomaly,
  player: PlayerState,
  now: number,
  channel: SceneRenderChannel,
  riskTier: RiskTier,
  loopCount: number,
) {
  if (!isAnomalyRenderable(anomaly)) return;
  const profile = getAnomalyVisualProfile(anomaly, channel, riskTier);
  if (!profile.visible) return;
  const rawX = worldToScreen(anomaly.x, player.x);
  const towardLens = rawX < PIXEL_VIEW_WIDTH / 2 ? 1 : -1;
  const loopApproach =
    channel === 'pip' && anomaly.id === 'school.anomaly.landing'
      ? Math.min(42, Math.max(0, loopCount) * 12)
      : 0;
  const x = rawX + towardLens * (profile.approachOffsetPx + loopApproach);
  if (x < -90 || x > PIXEL_VIEW_WIDTH + 90) return;
  const distance = Math.abs(player.x - anomaly.x);
  const detectionRange = channel === 'pip' ? 680 : 520;
  const proximity = clamp((detectionRange - distance) / detectionRange, 0, 1);
  if (proximity <= 0) return;
  const y = PIXEL_FLOOR_Y - 64 + (anomaly.yOffset ?? 0);
  const presentationAlpha = profile.alpha * (0.45 + proximity * 0.55);
  if (
    anomaly.id === OBSERVER_ANOMALY_ID &&
    drawRuntimeObserver(
      ctx,
      x,
      anomaly.yOffset ?? 0,
      riskTier,
      presentationAlpha,
    )
  ) {
    return;
  }
  ctx.save();
  ctx.globalAlpha = presentationAlpha;
  switch (profile.fragmentKind) {
    case 'TRACE': {
      const pulse = 0.75 + Math.sin(now / 420) * 0.08;
      const visibleSteps = channel === 'main' ? 1 : 4;
      for (let step = 0; step < visibleSteps; step += 1) {
        const stepX = x - 25 + step * 16;
        const stepY = Math.min(PIXEL_FLOOR_Y + 27, y + 42 + (step % 2) * 5);
        ctx.globalAlpha = profile.alpha * pulse * (0.35 + step * 0.14);
        fillPixelRect(ctx, stepX, stepY, 5, 9, '#6d8179');
        fillPixelRect(ctx, stepX + (step % 2 ? -3 : 5), stepY + 7, 3, 3, '#87958c');
      }
      break;
    }
    case 'WRITING_FRAGMENT':
      ctx.font = 'bold 14px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#783b34';
      ctx.fillText(anomaly.id.startsWith('school.') ? '欠　席　　2' : '2 3 : 4', x, y + 17);
      ctx.globalAlpha *= 0.55;
      fillPixelRect(ctx, x + 30, y + 8, 9, 1, '#a7584d');
      break;
    case 'HEAD_AND_HAND':
      // Only a crown of wet hair and fingers clear the foreground edge.
      fillPixelRect(ctx, x - 12, y + 8, 24, 8, '#080909');
      fillPixelRect(ctx, x - 9, y + 1, 18, 9, '#111312');
      fillPixelRect(ctx, x - 15, y + 16, 3, 13, '#4e4b43');
      fillPixelRect(ctx, x - 9, y + 17, 2, 15, '#5b574e');
      fillPixelRect(ctx, x + 7, y + 18, 2, 14, '#554f47');
      break;
    case 'HAIR_AND_SHOULDER':
      // The face remains outside the crop; silhouette and material carry the cue.
      fillPixelRect(ctx, x - 18, y - 28, 31, 11, '#050606');
      fillPixelRect(ctx, x - 15, y - 19, 25, 18, '#070808');
      fillPixelRect(ctx, x - 17, y - 11, 4, 31, '#090a09');
      fillPixelRect(ctx, x - 10, y - 7, 3, 37, '#0b0c0b');
      fillPixelRect(ctx, x + 5, y - 12, 4, 26, '#0a0b0a');
      fillPixelRect(ctx, x - 29, y + 16, 39, 13, '#101210');
      fillPixelRect(ctx, x - 34, y + 23, 26, 9, '#0a0b0a');
      break;
    case 'FRAME_EDGE_SHADOW': {
      const edgeX = x < PIXEL_VIEW_WIDTH / 2 ? Math.max(-2, x - 22) : Math.min(PIXEL_VIEW_WIDTH - 10, x + 8);
      fillPixelRect(ctx, edgeX, y - 50, 18, 102, '#020303');
      fillPixelRect(ctx, edgeX + (x < PIXEL_VIEW_WIDTH / 2 ? 14 : -10), y - 32, 15, 74, '#050606');
      fillPixelRect(ctx, edgeX + (x < PIXEL_VIEW_WIDTH / 2 ? 7 : -5), y - 57, 14, 13, '#070808');
      break;
    }
    case 'FULL_BODY':
      // Intentionally unsupported for authored horror anomalies.
      break;
  }
  ctx.restore();
}

function drawFlashlightMask(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  mouse: { x: number; y: number },
  channel: SceneRenderChannel,
  pose: PlayerSpritePose,
) {
  const playerX = PIXEL_VIEW_WIDTH * 0.42;
  const direction = mouse.x >= playerX ? 1 : -1;
  const flashlightSocketX =
    getRuntimeAtlasLoadState('player') === 'ready'
      ? 30
      : pose.flashlightSocket.x;
  const startX = playerX + direction * flashlightSocketX;
  const startY = PIXEL_FLOOR_Y + pose.flashlightSocket.y;
  const dx = mouse.x - startX;
  const dy = mouse.y - startY;
  const angle = clamp(Math.atan2(dy, Math.abs(dx)), -0.52, 0.52);
  const length = 285;
  const spread = 0.29;
  ctx.save();
  ctx.fillStyle = channel === 'pip' ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.83)';
  ctx.fillRect(0, 0, PIXEL_VIEW_WIDTH, PIXEL_VIEW_HEIGHT);
  if (player.flashlightOn && player.battery > 0) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + Math.cos(angle - spread) * length * direction, startY + Math.sin(angle - spread) * length);
    ctx.lineTo(startX + Math.cos(angle + spread) * length * direction, startY + Math.sin(angle + spread) * length);
    ctx.closePath();
    ctx.clip();
    const gradient = ctx.createRadialGradient(startX, startY, 4, startX, startY, length);
    gradient.addColorStop(0, 'rgba(0,0,0,0.96)');
    gradient.addColorStop(0.55, 'rgba(0,0,0,0.76)');
    gradient.addColorStop(0.9, 'rgba(0,0,0,0.22)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, PIXEL_VIEW_WIDTH, PIXEL_VIEW_HEIGHT);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(201,174,124,0.075)';
    ctx.fillRect(0, 0, PIXEL_VIEW_WIDTH, PIXEL_VIEW_HEIGHT);
  }
  ctx.restore();
  const vignette = ctx.createRadialGradient(PIXEL_VIEW_WIDTH / 2, PIXEL_VIEW_HEIGHT / 2, 70, PIXEL_VIEW_WIDTH / 2, PIXEL_VIEW_HEIGHT / 2, 390);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, channel === 'pip' ? 'rgba(0,0,0,0.56)' : 'rgba(0,0,0,0.72)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, PIXEL_VIEW_WIDTH, PIXEL_VIEW_HEIGHT);
}

function drawPixelCharacter(
  ctx: CanvasRenderingContext2D,
  mouse: { x: number; y: number },
  spriteInput: PlayerSpriteFrameInput,
  player: PlayerState,
) {
  const x = Math.round(PIXEL_VIEW_WIDTH * 0.42);
  const direction = mouse.x >= x ? 1 : -1;
  const runtimeCell = selectPlayerAtlasCell({
    now: spriteInput.now,
    isMoving: spriteInput.isMoving,
    isRunning: spriteInput.isRunning,
    isCrouching: spriteInput.isCrouching,
    isAiming: player.flashlightOn && player.battery > 0,
    reaction:
      player.tension >= 90
        ? 'startled'
        : player.tension >= 70 && !spriteInput.isMoving
          ? 'fatigued'
          : null,
  });
  const runtimeY = runtimeCell.row === 0 ? 144 : 158;
  if (
    drawAtlasCell(ctx, 'player', runtimeCell, {
      x: x - 59,
      y: runtimeY,
      width: 118,
      height: 104,
      flipX: direction < 0,
    })
  ) {
    return;
  }
  const frame = createPlayerSpriteFrame(spriteInput);
  ctx.save();
  ctx.translate(x, PIXEL_FLOOR_Y);
  ctx.scale(direction, 1);
  frame.forEach((item) => {
    ctx.globalAlpha = item.opacity ?? 1;
    fillPixelRect(
      ctx,
      item.x,
      item.y,
      item.width,
      item.height,
      item.color,
    );
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawScreenNoise(ctx: CanvasRenderingContext2D, now: number, tension: number) {
  const intensity = 0.015 + tension / 3600;
  for (let i = 0; i < 80; i += 1) {
    const seed = Math.floor(now / 70) * 97 + i * 13;
    if (hash(seed) > 0.58) {
      const x = Math.floor(hash(seed * 1.7) * PIXEL_VIEW_WIDTH);
      const y = Math.floor(hash(seed * 2.3) * PIXEL_VIEW_HEIGHT);
      ctx.fillStyle = `rgba(220,220,210,${intensity * hash(seed * 3.1)})`;
      ctx.fillRect(x, y, hash(seed * 4.2) > 0.82 ? 3 : 1, 1);
    }
  }
  ctx.fillStyle = `rgba(0,0,0,${0.12 + tension / 650})`;
  for (let y = 0; y < PIXEL_VIEW_HEIGHT; y += 3) ctx.fillRect(0, y, PIXEL_VIEW_WIDTH, 1);
}

export function renderPixelScene({
  ctx,
  player,
  anomalies,
  items,
  mouse,
  now,
  isMoving,
  boardId = 'hospital',
  riskTier = 0,
  loopCount = 0,
  channel = 'main',
  recordSnapshot = channel === 'main',
}: PixelSceneInput) {
  if (recordSnapshot) {
    canonicalSceneHistory.record({
      timestamp: now,
      boardId,
      player,
      anomalies,
      items,
      mouse,
      isMoving,
    });
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, PIXEL_VIEW_WIDTH, PIXEL_VIEW_HEIGHT);
  const spriteInput: PlayerSpriteFrameInput = {
    now,
    isMoving,
    isRunning: player.isRunning,
    isCrouching: player.isCrouching,
    tension: player.tension,
  };
  const playerPose = getPlayerSpritePose(spriteInput);
  const itemPositions = getItemWorldPositions(boardId);
  const boardDifferenceActive = anomalies.some(
    (anomaly) =>
      anomaly.id === 'school.anomaly.blackboard' &&
      anomaly.directorState?.phase === 'ACTIVE' &&
      !anomaly.captured &&
      !anomaly.resolution,
  );
  drawEnvironment(
    ctx,
    player.x,
    boardId,
    channel,
    boardDifferenceActive,
  );
  items.forEach((item) =>
    drawItem(ctx, item, player.x, now, itemPositions, boardId),
  );
  anomalies.forEach((anomaly) => {
    if (anomaly.id === OBSERVER_ANOMALY_ID) return;
    drawAnomaly(
      ctx,
      anomaly,
      player,
      now,
      channel,
      riskTier,
      loopCount,
    );
  });
  if (channel === 'main') {
    drawPixelCharacter(ctx, mouse, spriteInput, player);
  }
  drawFlashlightMask(ctx, player, mouse, channel, playerPose);
  anomalies.forEach((anomaly) => {
    if (anomaly.id !== OBSERVER_ANOMALY_ID) return;
    drawAnomaly(
      ctx,
      anomaly,
      player,
      now,
      channel,
      riskTier,
      loopCount,
    );
  });
  if (channel === 'main') {
    drawScreenNoise(ctx, now, player.tension);
  }
  ctx.restore();
}

export function renderTitleScene(ctx: CanvasRenderingContext2D, now: number) {
  const player: PlayerState = { x: 1840, speed: 1.8, isRunning: false, isCrouching: false, flashlightOn: true, flashlightAngle: 0, battery: 82, tension: 32, health: 100 };
  const anomalies: Anomaly[] = [{ id: 'title-ghost', x: 2100, width: 55, type: 'ghost', description: 'camera-only apparition', points: 0, captured: false, visibleOnlyInPip: false, yOffset: 0, directorState: { anomalyId: 'title-ghost', phase: 'ACTIVE', resolution: null, phaseStartedAtMs: 0, transitionCount: 1, cycle: 0 } }];
  renderPixelScene({
    ctx,
    player,
    anomalies,
    items: [],
    mouse: { x: 535, y: 158 },
    now,
    isMoving: false,
    riskTier: 2,
    recordSnapshot: false,
  });
}
