import { Anomaly, GameItem, PlayerState } from '../types';
import {
  getSceneDefinitionAt,
  HOSPITAL_ITEM_WORLD_POSITIONS,
  HOSPITAL_SCENE_DEFINITIONS,
  ScenePalette,
  WorldPropDefinition,
} from '../game/sceneDefinitions';
import { isAnomalyRenderable } from '../game/anomalyDirector';
import { canonicalSceneHistory } from '../game/sceneSnapshot';

export const PIXEL_VIEW_WIDTH = 640;
export const PIXEL_VIEW_HEIGHT = 300;
export const PIXEL_FLOOR_Y = 238;

export const ITEM_WORLD_POSITIONS: Readonly<Record<string, number>> =
  HOSPITAL_ITEM_WORLD_POSITIONS;

export type SceneRenderChannel = 'main' | 'pip';

export interface PixelSceneInput {
  ctx: CanvasRenderingContext2D;
  player: PlayerState;
  anomalies: Anomaly[];
  items: GameItem[];
  mouse: { x: number; y: number };
  now: number;
  isMoving: boolean;
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

function drawWorldProp(
  ctx: CanvasRenderingContext2D,
  prop: WorldPropDefinition,
  playerX: number,
  palette: ScenePalette,
) {
  const screenX = worldToScreen(prop.worldX, playerX);
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
    case 'altar':
      drawAltar(ctx, screenX, palette);
      break;
    case 'exit':
      drawEmergencyExit(ctx, screenX);
      break;
    case 'graffiti':
      drawGraffiti(ctx, screenX, prop.text, prop.color);
      break;
  }
}

function drawEnvironment(ctx: CanvasRenderingContext2D, playerX: number) {
  const viewX = playerX - PIXEL_VIEW_WIDTH * 0.42;
  const palette = getSceneDefinitionAt(playerX).palette;
  drawWallTexture(ctx, viewX, palette);
  drawFloor(ctx, viewX, palette);
  drawCeilingPipes(ctx, viewX, palette);

  HOSPITAL_SCENE_DEFINITIONS.forEach((scene) => {
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
    scene.props.forEach((prop) => drawWorldProp(ctx, prop, playerX, scene.palette));
  });
}

function drawItem(ctx: CanvasRenderingContext2D, item: GameItem, playerX: number, now: number) {
  if (item.found) return;
  const worldX = ITEM_WORLD_POSITIONS[item.id];
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
  if (item.type === 'keycard') {
    fillPixelRect(ctx, x - 7, y - 4, 14, 9, '#5e7775');
    fillPixelRect(ctx, x - 5, y - 2, 4, 2, '#b7c8bf');
  } else {
    fillPixelRect(ctx, x - 6, y - 7, 12, 14, '#a9946d');
    fillPixelRect(ctx, x - 4, y - 4, 8, 1, '#5c4e37');
    fillPixelRect(ctx, x - 4, y - 1, 7, 1, '#5c4e37');
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

function drawAnomaly(
  ctx: CanvasRenderingContext2D,
  anomaly: Anomaly,
  player: PlayerState,
  now: number,
  channel: SceneRenderChannel,
) {
  if (!isAnomalyRenderable(anomaly) || (channel === 'main' && anomaly.visibleOnlyInPip)) return;
  const x = worldToScreen(anomaly.x, player.x);
  if (x < -90 || x > PIXEL_VIEW_WIDTH + 90) return;
  const distance = Math.abs(player.x - anomaly.x);
  const detectionRange = channel === 'pip' ? 680 : 520;
  const proximity = clamp((detectionRange - distance) / detectionRange, 0, 1);
  if (proximity <= 0) return;
  const visible =
    channel === 'pip'
      ? anomaly.visibleOnlyInPip
        ? 0.22 + proximity * 0.23
        : 0.12 + proximity * 0.3
      : player.flashlightOn
        ? 0.08 + proximity * 0.38
        : 0.035 + proximity * 0.12;
  const phaseOpacity = anomaly.directorState?.phase === 'TELEGRAPH' ? 0.36 : 1;
  const y = PIXEL_FLOOR_Y - 64 + (anomaly.yOffset ?? 0);
  ctx.save();
  ctx.globalAlpha = visible * phaseOpacity;
  if (anomaly.type === 'orb') {
    const pulse = 5 + Math.sin(now / 130) * 2;
    const gradient = ctx.createRadialGradient(x, y, 1, x, y, 19 + pulse);
    gradient.addColorStop(0, 'rgba(223,231,217,0.9)');
    gradient.addColorStop(0.22, 'rgba(117,148,146,0.5)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - 28, y - 28, 56, 56);
  } else if (anomaly.type === 'writing') {
    ctx.font = 'bold 15px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7c3029';
    ctx.fillText('助　け　て', x, y + 18);
  } else if (anomaly.type === 'doll') {
    fillPixelRect(ctx, x - 6, y + 5, 12, 21, '#3d3330');
    fillPixelRect(ctx, x - 7, y - 7, 14, 14, '#b0a38d');
    fillPixelRect(ctx, x - 5, y - 2, 2, 2, '#121212');
    fillPixelRect(ctx, x + 3, y - 2, 2, 2, '#121212');
    fillPixelRect(ctx, x - 9, y - 10, 18, 5, '#17191a');
  } else {
    fillPixelRect(ctx, x - 11, y - 12, 22, 55, '#050505');
    fillPixelRect(ctx, x - 8, y - 25, 16, 16, '#8a8980');
    fillPixelRect(ctx, x - 5, y - 20, 2, 3, '#080808');
    fillPixelRect(ctx, x + 3, y - 20, 2, 3, '#080808');
  }
  ctx.restore();
}

function drawFlashlightMask(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  mouse: { x: number; y: number },
  channel: SceneRenderChannel,
) {
  const playerX = PIXEL_VIEW_WIDTH * 0.42;
  const playerY = player.isCrouching ? PIXEL_FLOOR_Y - 34 : PIXEL_FLOOR_Y - 49;
  const direction = mouse.x >= playerX ? 1 : -1;
  const dx = mouse.x - playerX;
  const dy = mouse.y - playerY;
  const angle = clamp(Math.atan2(dy, Math.abs(dx)), -0.52, 0.52);
  const length = 285;
  const spread = 0.29;
  const startX = playerX + direction * 14;
  const startY = playerY - 5;
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

function drawPixelCharacter(ctx: CanvasRenderingContext2D, player: PlayerState, mouse: { x: number; y: number }, now: number, isMoving: boolean) {
  const x = Math.round(PIXEL_VIEW_WIDTH * 0.42);
  const direction = mouse.x >= x ? 1 : -1;
  const cycle = isMoving ? now / (player.isRunning ? 72 : 112) : 0;
  const step = isMoving ? Math.round(Math.sin(cycle) * (player.isRunning ? 4 : 2)) : 0;
  const crouchOffset = player.isCrouching ? 12 : 0;
  const baseY = PIXEL_FLOOR_Y - crouchOffset;
  const blink = Math.floor(now / 2100) % 7 === 0;
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(direction, 1);
  ctx.globalAlpha = 0.48;
  fillPixelRect(ctx, -17, -1, 34, 4, '#000000');
  ctx.globalAlpha = 1;
  fillPixelRect(ctx, -8 + step, -22, 7, 21, '#141615');
  fillPixelRect(ctx, -10 + step, -3, 11, 4, '#080908');
  fillPixelRect(ctx, 2 - step, -22, 7, 21, '#1d201e');
  fillPixelRect(ctx, 1 - step, -3, 12, 4, '#090a09');
  fillPixelRect(ctx, -17, -63, 13, 34, '#222923');
  fillPixelRect(ctx, -19, -57, 3, 21, '#111512');
  fillPixelRect(ctx, -15, -58, 9, 2, '#3d463e');
  fillPixelRect(ctx, -15, -39, 9, 2, '#111512');
  fillPixelRect(ctx, -10, -64, 24, 43, '#353a33');
  fillPixelRect(ctx, -7, -61, 18, 37, '#3e443b');
  fillPixelRect(ctx, 1, -61, 2, 37, '#171a17');
  fillPixelRect(ctx, -8, -46, 7, 8, '#2b302a');
  fillPixelRect(ctx, 5, -46, 7, 8, '#2b302a');
  fillPixelRect(ctx, -10, -22, 24, 3, '#161815');
  fillPixelRect(ctx, -9, -68, 20, 8, '#252a26');
  fillPixelRect(ctx, -6, -67, 14, 3, '#4a5047');
  fillPixelRect(ctx, -8, -87, 19, 20, '#a6937c');
  fillPixelRect(ctx, -10, -89, 21, 8, '#171b1d');
  fillPixelRect(ctx, -12, -84, 5, 14, '#181c1e');
  fillPixelRect(ctx, -7, -92, 16, 5, '#1c2022');
  fillPixelRect(ctx, 7, -84, 6, 16, '#202426');
  fillPixelRect(ctx, 10, -78, 3, 4, '#121416');
  if (!blink) fillPixelRect(ctx, 4, -79, 2, 2, player.tension > 78 ? '#d9c0ad' : '#2a2723');
  if (player.tension > 75) fillPixelRect(ctx, -1, -73, 6, 1, '#5f4138');
  fillPixelRect(ctx, 11, -57, 12, 7, '#353a33');
  fillPixelRect(ctx, 18, -55, 9, 5, '#171a19');
  fillPixelRect(ctx, 25, -58, 9, 8, '#252b2b');
  fillPixelRect(ctx, 32, -56, 3, 4, '#6c7773');
  fillPixelRect(ctx, 16, -48, 5, 13, '#8e7d69');
  fillPixelRect(ctx, 19, -43, 12, 5, '#2a2d2a');
  fillPixelRect(ctx, 29, -44, 8, 7, '#3b403d');
  fillPixelRect(ctx, 36, -42, 4, 3, '#b7a780');
  fillPixelRect(ctx, -5, -60, 2, 28, '#171a17');
  fillPixelRect(ctx, 8, -60, 2, 28, '#171a17');
  fillPixelRect(ctx, -1, -35, 6, 7, '#1c211e');
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
  channel = 'main',
  recordSnapshot = channel === 'main',
}: PixelSceneInput) {
  if (recordSnapshot) {
    canonicalSceneHistory.record({
      timestamp: now,
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
  drawEnvironment(ctx, player.x);
  items.forEach((item) => drawItem(ctx, item, player.x, now));
  anomalies.forEach((anomaly) => drawAnomaly(ctx, anomaly, player, now, channel));
  drawFlashlightMask(ctx, player, mouse, channel);
  if (channel === 'main') {
    drawPixelCharacter(ctx, player, mouse, now, isMoving);
    drawScreenNoise(ctx, now, player.tension);
  }
  ctx.restore();
}

export function renderTitleScene(ctx: CanvasRenderingContext2D, now: number) {
  const player: PlayerState = { x: 1840, speed: 1.8, isRunning: false, isCrouching: false, flashlightOn: true, flashlightAngle: 0, battery: 82, tension: 32, health: 100 };
  const anomalies: Anomaly[] = [{ id: 'title-ghost', x: 2100, width: 55, type: 'ghost', description: 'camera-only apparition', points: 0, captured: false, visibleOnlyInPip: true, yOffset: 0 }];
  renderPixelScene({
    ctx,
    player,
    anomalies,
    items: [],
    mouse: { x: 535, y: 158 },
    now,
    isMoving: false,
    recordSnapshot: false,
  });
}
