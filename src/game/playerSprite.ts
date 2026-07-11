export const PLAYER_SPRITE_PALETTE = {
  shadow: 'rgba(0, 0, 0, 0.52)',
  outline: '#090c0d',
  hairDark: '#10171b',
  hair: '#1c252a',
  hairLight: '#30393d',
  skinShadow: '#806d5e',
  skin: '#aa9178',
  skinLight: '#c0a588',
  jacketShadow: '#20251f',
  jacket: '#30372f',
  jacketLight: '#454c41',
  strap: '#141816',
  trousers: '#171b19',
  trousersLight: '#262b28',
  boot: '#2a251f',
  bootSole: '#080908',
  pack: '#28251f',
  packLight: '#443d33',
  metal: '#68716b',
  lens: '#79242a',
  lamp: '#c5b28c',
  tenseEye: '#d6c5af',
} as const;

export type PlayerSpritePart =
  | 'shadow'
  | 'backpack'
  | 'legs'
  | 'jacket'
  | 'strap'
  | 'chest-camera'
  | 'head'
  | 'hair'
  | 'earpiece'
  | 'arms'
  | 'flashlight';

export interface PlayerSpriteRect {
  part: PlayerSpritePart;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity?: number;
}

export interface PlayerSpriteFrameInput {
  now: number;
  isMoving: boolean;
  isRunning: boolean;
  isCrouching: boolean;
  tension: number;
}

export interface PlayerSpritePose {
  phase: number;
  frontStep: number;
  backStep: number;
  upperX: number;
  upperY: number;
  flashlightSocket: { x: number; y: number };
}

export const PLAYER_SPRITE_BOUNDS = {
  left: -19,
  right: 40,
  top: -67,
  bottom: 2,
} as const;

const WALK_FRAME_MS = 125;
const RUN_FRAME_MS = 100;
const STEP_PHASES = [0, 1, 0, -1] as const;

export function getPlayerSpritePhase(
  now: number,
  isMoving: boolean,
  isRunning: boolean,
) {
  if (!isMoving) return 0;
  const frameMs = isRunning ? RUN_FRAME_MS : WALK_FRAME_MS;
  return Math.floor(Math.max(0, now) / frameMs) % STEP_PHASES.length;
}

const rect = (
  part: PlayerSpritePart,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  opacity?: number,
): PlayerSpriteRect => ({ part, x, y, width, height, color, opacity });

export function getPlayerSpritePose(
  input: PlayerSpriteFrameInput,
): PlayerSpritePose {
  const phase = getPlayerSpritePhase(input.now, input.isMoving, input.isRunning);
  const rawStep = STEP_PHASES[phase];
  const stride = rawStep * (input.isRunning ? 3 : input.isMoving ? 2 : 0);
  const movementBob = input.isMoving && phase === 1 ? 1 : 0;
  const crouchDrop = input.isCrouching ? 9 : 0;
  const upperY = crouchDrop + movementBob;
  const upperX = input.isRunning && input.isMoving ? 1 : 0;

  return {
    phase,
    frontStep: stride,
    backStep: -stride,
    upperX,
    upperY,
    flashlightSocket: {
      x: 38 + upperX,
      y: -34 + upperY,
    },
  };
}

/**
 * One coherent side-view sprite in a 59×69 logical-pixel equipment silhouette.
 * The authored parts mirror the reference turn-around: shaggy dark hair,
 * field jacket, chest camera, cross-body strap, backpack, pouch and torch.
 */
export function createPlayerSpriteFrame(
  input: PlayerSpriteFrameInput,
): PlayerSpriteRect[] {
  const { frontStep, backStep, upperY, upperX } =
    getPlayerSpritePose(input);
  const blink = Math.max(0, input.now) % 4300 >= 4200;
  const p = PLAYER_SPRITE_PALETTE;
  const parts: PlayerSpriteRect[] = [];

  parts.push(rect('shadow', -18, -2, 36, 4, p.shadow));

  if (input.isCrouching) {
    parts.push(
      rect('legs', -8, -14, 10, 7, p.trousers),
      rect('legs', -5, -8, 7, 7, p.trousersLight),
      rect('legs', -8, -3, 11, 4, p.boot),
      rect('legs', -9, 0, 13, 2, p.bootSole),
      rect('legs', 1, -14, 10, 7, p.trousersLight),
      rect('legs', 6, -8, 7, 7, p.trousers),
      rect('legs', 5, -3, 12, 4, p.boot),
      rect('legs', 4, 0, 14, 2, p.bootSole),
    );
  } else {
    parts.push(
      rect('legs', -7 + backStep, -20, 7, 18, p.trousers),
      rect('legs', -6 + backStep, -18, 2, 11, p.trousersLight),
      rect('legs', -9 + backStep, -4, 11, 4, p.boot),
      rect('legs', -10 + backStep, -1, 13, 2, p.bootSole),
      rect('legs', 2 + frontStep, -20, 7, 18, p.trousersLight),
      rect('legs', 3 + frontStep, -18, 2, 11, p.trousers),
      rect('legs', 1 + frontStep, -4, 12, 4, p.boot),
      rect('legs', 0 + frontStep, -1, 14, 2, p.bootSole),
    );
  }

  // Backpack and waist pouch remain readable as the rear silhouette.
  parts.push(
    rect('backpack', -18 + upperX, -48 + upperY, 11, 29, p.outline),
    rect('backpack', -16 + upperX, -46 + upperY, 8, 25, p.pack),
    rect('backpack', -15 + upperX, -44 + upperY, 6, 4, p.packLight),
    rect('backpack', -17 + upperX, -37 + upperY, 3, 11, p.packLight),
    rect('backpack', -15 + upperX, -36 + upperY, 3, 8, p.metal),
    rect('backpack', -18 + upperX, -26 + upperY, 9, 7, p.outline),
    rect('backpack', -16 + upperX, -25 + upperY, 7, 5, p.packLight),
  );

  // Short, heavy field jacket with collar, zipper, hem and two pockets.
  parts.push(
    rect('jacket', -11 + upperX, -51 + upperY, 26, 33, p.outline),
    rect('jacket', -9 + upperX, -49 + upperY, 22, 29, p.jacket),
    rect('jacket', -7 + upperX, -48 + upperY, 18, 4, p.jacketLight),
    rect('jacket', -8 + upperX, -25 + upperY, 21, 5, p.jacketShadow),
    rect('jacket', 1 + upperX, -46 + upperY, 2, 23, p.strap),
    rect('jacket', -7 + upperX, -34 + upperY, 7, 7, p.jacketShadow),
    rect('jacket', 5 + upperX, -34 + upperY, 7, 7, p.jacketShadow),
    rect('jacket', -6 + upperX, -33 + upperY, 5, 2, p.jacketLight),
    rect('jacket', 6 + upperX, -33 + upperY, 5, 2, p.jacketLight),
    rect('jacket', -8 + upperX, -21 + upperY, 23, 3, p.outline),
    rect('jacket', -10 + upperX, -58 + upperY, 22, 11, p.outline),
    rect('jacket', -8 + upperX, -56 + upperY, 18, 8, p.jacketShadow),
    rect('jacket', -6 + upperX, -54 + upperY, 8, 5, p.jacketShadow),
    rect('jacket', 3 + upperX, -54 + upperY, 8, 5, p.jacketLight),
  );

  // Diagonal harness and the small chest-mounted camera from the board.
  parts.push(
    rect('strap', -7 + upperX, -48 + upperY, 3, 5, p.strap),
    rect('strap', -4 + upperX, -45 + upperY, 3, 5, p.strap),
    rect('strap', -1 + upperX, -42 + upperY, 3, 5, p.strap),
    rect('strap', 2 + upperX, -39 + upperY, 3, 5, p.strap),
    rect('chest-camera', 3 + upperX, -43 + upperY, 9, 7, p.outline),
    rect('chest-camera', 5 + upperX, -42 + upperY, 6, 4, p.metal),
    rect('chest-camera', 8 + upperX, -41 + upperY, 2, 2, p.lens),
  );

  // Neck and side-profile face are framed by an oversized shaggy bob.
  parts.push(
    rect('head', -2 + upperX, -55 + upperY, 7, 6, p.skinShadow),
    rect('hair', -10 + upperX, -66 + upperY, 21, 16, p.outline),
    rect('hair', -8 + upperX, -67 + upperY, 16, 4, p.hairDark),
    rect('hair', -5 + upperX, -67 + upperY, 10, 2, p.hair),
    rect('hair', -12 + upperX, -65 + upperY, 6, 14, p.hairDark),
    rect('head', -6 + upperX, -66 + upperY, 14, 15, p.skinShadow),
    rect('head', -4 + upperX, -65 + upperY, 13, 13, p.skin),
    rect('head', 7 + upperX, -61 + upperY, 4, 6, p.skinLight),
    rect('hair', -8 + upperX, -66 + upperY, 18, 4, p.hair),
    rect('hair', -7 + upperX, -65 + upperY, 6, 8, p.hairDark),
    rect('hair', -1 + upperX, -66 + upperY, 5, 5, p.hair),
    rect('hair', 4 + upperX, -65 + upperY, 6, 4, p.hairDark),
    rect('hair', -9 + upperX, -57 + upperY, 5, 8, p.hair),
    rect('hair', -5 + upperX, -52 + upperY, 7, 4, p.hairDark),
    rect('hair', -4 + upperX, -67 + upperY, 8, 2, p.hairLight),
    rect('head', 4 + upperX, -63 + upperY, 4, 1, p.skinLight),
  );

  if (!blink) {
    parts.push(
      rect(
        'head',
        5 + upperX,
        -60 + upperY,
        2,
        2,
        input.tension > 78 ? p.tenseEye : p.outline,
      ),
    );
  }
  parts.push(
    rect('head', 8 + upperX, -56 + upperY, 2, 1, p.skinLight),
    rect('head', 4 + upperX, -53 + upperY, 5, 1, input.tension > 72 ? '#5f4138' : '#4b3932'),
    rect('earpiece', -6 + upperX, -59 + upperY, 2, 3, p.metal),
    rect('earpiece', -7 + upperX, -56 + upperY, 1, 7, p.metal),
  );

  // Back arm, forward braced arm and battery torch.
  parts.push(
    rect('arms', -13 + upperX, -46 + upperY, 6, 21, p.outline),
    rect('arms', -11 + upperX, -44 + upperY, 4, 17, p.jacketShadow),
    rect('arms', -10 + upperX, -27 + upperY, 4, 5, p.skinShadow),
    rect('arms', 11 + upperX, -46 + upperY, 7, 15, p.outline),
    rect('arms', 12 + upperX, -44 + upperY, 5, 12, p.jacket),
    rect('arms', 15 + upperX, -35 + upperY, 13, 7, p.outline),
    rect('arms', 17 + upperX, -34 + upperY, 10, 5, p.skin),
    rect('flashlight', 24 + upperX, -37 + upperY, 12, 7, p.outline),
    rect('flashlight', 26 + upperX, -36 + upperY, 9, 5, p.metal),
    rect('flashlight', 35 + upperX, -35 + upperY, 3, 3, p.lamp),
    rect('flashlight', 27 + upperX, -35 + upperY, 2, 2, p.lens),
  );

  return parts;
}
