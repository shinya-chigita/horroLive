import type { BoardId } from '../types';

export interface ScenePalette {
  wall: string;
  wallDark: string;
  wallLine: string;
  floor: string;
  floorLine: string;
  metal: string;
  stain: string;
  lamp: string;
}

export type WorldPropDefinition =
  | { id: string; kind: 'window'; worldX: number; y: number; width: number; height: number }
  | { id: string; kind: 'bed'; worldX: number }
  | { id: string; kind: 'wheelchair'; worldX: number }
  | { id: string; kind: 'door'; worldX: number; label: string; sealed?: boolean }
  | { id: string; kind: 'locker'; worldX: number; open: boolean }
  | { id: string; kind: 'gurney'; worldX: number }
  | { id: string; kind: 'iv-stand'; worldX: number }
  | { id: string; kind: 'medicine-cart'; worldX: number }
  | { id: string; kind: 'crt'; worldX: number }
  | { id: string; kind: 'curtain'; worldX: number }
  | { id: string; kind: 'wet-reflection'; worldX: number }
  | { id: string; kind: 'altar'; worldX: number }
  | { id: string; kind: 'exit'; worldX: number }
  | { id: string; kind: 'shoe-lockers'; worldX: number; columns?: number }
  | { id: string; kind: 'blackboard'; worldX: number; text: string; pipText?: string }
  | { id: string; kind: 'school-desks'; worldX: number; rows?: number }
  | { id: string; kind: 'speaker'; worldX: number }
  | { id: string; kind: 'stairs'; worldX: number }
  | { id: string; kind: 'graffiti'; worldX: number; text: string; color: string };

export interface AmbientLightDefinition {
  id: string;
  worldX: number;
  radius?: number;
  alpha?: number;
}

export interface SceneDefinition {
  id: string;
  startX: number;
  endX: number;
  palette: ScenePalette;
  ambientLights: AmbientLightDefinition[];
  props: WorldPropDefinition[];
}

const ENTRY_PALETTE: ScenePalette = {
  wall: '#171a18',
  wallDark: '#0d100f',
  wallLine: '#252925',
  floor: '#151715',
  floorLine: '#262823',
  metal: '#3d413c',
  stain: '#3a2921',
  lamp: '#c7ad7b',
};

const WARD_PALETTE: ScenePalette = {
  wall: '#191713',
  wallDark: '#0e0d0b',
  wallLine: '#2b2821',
  floor: '#171510',
  floorLine: '#2d291f',
  metal: '#45433d',
  stain: '#442b23',
  lamp: '#d2b784',
};

const CLINICAL_PALETTE: ScenePalette = {
  wall: '#17140f',
  wallDark: '#0c0b09',
  wallLine: '#29241c',
  floor: '#17140f',
  floorLine: '#2d271d',
  metal: '#403c35',
  stain: '#4a2d21',
  lamp: '#c9aa71',
};

const BASEMENT_PALETTE: ScenePalette = {
  wall: '#111719',
  wallDark: '#080c0d',
  wallLine: '#20292b',
  floor: '#0f1517',
  floorLine: '#233033',
  metal: '#344347',
  stain: '#2a3230',
  lamp: '#94a69d',
};

const ALTAR_PALETTE: ScenePalette = {
  wall: '#18130f',
  wallDark: '#0d0907',
  wallLine: '#2d2118',
  floor: '#17110d',
  floorLine: '#35271c',
  metal: '#43372f',
  stain: '#4f251e',
  lamp: '#d0a865',
};

const SCHOOL_ENTRY_PALETTE: ScenePalette = {
  wall: '#151713',
  wallDark: '#090b09',
  wallLine: '#252920',
  floor: '#121511',
  floorLine: '#242b22',
  metal: '#3a443d',
  stain: '#303b35',
  lamp: '#a9a276',
};

const SCHOOL_CLASSROOM_PALETTE: ScenePalette = {
  wall: '#181710',
  wallDark: '#0b0b08',
  wallLine: '#2b291d',
  floor: '#17150f',
  floorLine: '#322c20',
  metal: '#45443a',
  stain: '#3f3526',
  lamp: '#c0aa79',
};

const SCHOOL_BROADCAST_PALETTE: ScenePalette = {
  wall: '#121719',
  wallDark: '#080b0c',
  wallLine: '#20292b',
  floor: '#101416',
  floorLine: '#253035',
  metal: '#3b484c',
  stain: '#2f3030',
  lamp: '#8f9e8f',
};

const SCHOOL_STAIR_PALETTE: ScenePalette = {
  wall: '#14120f',
  wallDark: '#090806',
  wallLine: '#282219',
  floor: '#12100d',
  floorLine: '#31271c',
  metal: '#413b33',
  stain: '#3b2921',
  lamp: '#b99d68',
};

/**
 * The vertical slice still uses one continuous hospital corridor, but its
 * authored content lives here instead of being coupled to renderer branches.
 * Future locations can add scene definitions without changing draw order.
 */
export const HOSPITAL_SCENE_DEFINITIONS: readonly SceneDefinition[] = [
  {
    id: 'hospital-entry',
    startX: 0,
    endX: 1200,
    palette: ENTRY_PALETTE,
    ambientLights: [
      { id: 'entry-light-01', worldX: 330 },
      { id: 'entry-light-02', worldX: 970 },
    ],
    props: [
      { id: 'entry-window', kind: 'window', worldX: 260, y: 71, width: 72, height: 68 },
      { id: 'entry-bed', kind: 'bed', worldX: 520 },
      { id: 'entry-iv-stand', kind: 'iv-stand', worldX: 645 },
      { id: 'entry-warning', kind: 'graffiti', worldX: 710, text: 'ハシレ', color: '#8a2f27' },
      { id: 'entry-wheelchair', kind: 'wheelchair', worldX: 850 },
      { id: 'entry-reflection', kind: 'wet-reflection', worldX: 1040 },
    ],
  },
  {
    id: 'hospital-ward-a',
    startX: 1200,
    endX: 2400,
    palette: WARD_PALETTE,
    ambientLights: [
      { id: 'ward-light-01', worldX: 1640 },
      { id: 'ward-light-02', worldX: 2280 },
    ],
    props: [
      { id: 'ward-door', kind: 'door', worldX: 1200, label: '第一病棟 A-3' },
      { id: 'ward-locker', kind: 'locker', worldX: 1450, open: true },
      { id: 'ward-camera-warning', kind: 'graffiti', worldX: 1610, text: '右上ヲ見ロ', color: '#8a2f27' },
      { id: 'ward-medicine-cart', kind: 'medicine-cart', worldX: 1710 },
      { id: 'ward-window', kind: 'window', worldX: 1820, y: 65, width: 84, height: 72 },
      { id: 'ward-gurney', kind: 'gurney', worldX: 2050 },
      { id: 'ward-curtain', kind: 'curtain', worldX: 2240 },
    ],
  },
  {
    id: 'hospital-clinical-wing',
    startX: 2400,
    endX: 3600,
    palette: CLINICAL_PALETTE,
    ambientLights: [{ id: 'clinical-light-01', worldX: 3020 }],
    props: [
      { id: 'clinical-door', kind: 'door', worldX: 2400, label: '診察室', sealed: true },
      { id: 'clinical-bed', kind: 'bed', worldX: 2690 },
      { id: 'clinical-writing', kind: 'graffiti', worldX: 2710, text: 'お前の名前', color: '#8a2f27' },
      { id: 'clinical-wheelchair', kind: 'wheelchair', worldX: 2895 },
      { id: 'clinical-window', kind: 'window', worldX: 3100, y: 68, width: 60, height: 86 },
      { id: 'clinical-crt', kind: 'crt', worldX: 3290 },
      { id: 'clinical-reflection', kind: 'wet-reflection', worldX: 3440 },
    ],
  },
  {
    id: 'hospital-signal-basement',
    startX: 3600,
    endX: 4500,
    palette: BASEMENT_PALETTE,
    ambientLights: [{ id: 'basement-light-01', worldX: 3890 }],
    props: [
      { id: 'basement-door', kind: 'door', worldX: 3600, label: '地下電波室' },
      { id: 'basement-crt', kind: 'crt', worldX: 3705 },
      { id: 'basement-gurney', kind: 'gurney', worldX: 3820 },
      { id: 'basement-signal', kind: 'graffiti', worldX: 3880, text: 'NO SIGNAL', color: '#707875' },
      { id: 'basement-reflection', kind: 'wet-reflection', worldX: 3985 },
      { id: 'basement-locker', kind: 'locker', worldX: 4090, open: false },
      { id: 'basement-curtain', kind: 'curtain', worldX: 4320 },
    ],
  },
  {
    id: 'hospital-altar',
    startX: 4500,
    endX: 5001,
    palette: ALTAR_PALETTE,
    ambientLights: [{ id: 'altar-light-01', worldX: 4670 }],
    props: [
      { id: 'altar-door', kind: 'door', worldX: 4500, label: '最奥祭壇' },
      { id: 'altar-table', kind: 'altar', worldX: 4750 },
      { id: 'altar-exit', kind: 'exit', worldX: 4980 },
    ],
  },
];

export const HOSPITAL_ITEM_WORLD_POSITIONS: Readonly<Record<string, number>> = {
  KEYCARD_BLUE: 1450,
  DIARY_1: 800,
  DIARY_2: 3100,
  PHOTO_OLD: 4750,
};

export const SCHOOL_SCENE_DEFINITIONS: readonly SceneDefinition[] = [
  {
    id: 'school-entrance',
    startX: 0,
    endX: 900,
    palette: SCHOOL_ENTRY_PALETTE,
    ambientLights: [
      { id: 'school-entry-light-01', worldX: 220, radius: 76, alpha: 0.05 },
      { id: 'school-entry-light-02', worldX: 790, radius: 68, alpha: 0.045 },
    ],
    props: [
      { id: 'school-main-door', kind: 'door', worldX: 70, label: '黒羽分校 昇降口' },
      { id: 'school-shoe-lockers', kind: 'shoe-lockers', worldX: 330, columns: 6 },
      { id: 'school-entry-window', kind: 'window', worldX: 660, y: 63, width: 82, height: 74 },
      { id: 'school-entry-note', kind: 'graffiti', worldX: 770, text: 'カサヲ数エルナ', color: '#6f4a37' },
    ],
  },
  {
    id: 'school-classrooms',
    startX: 900,
    endX: 1800,
    palette: SCHOOL_CLASSROOM_PALETTE,
    ambientLights: [
      { id: 'school-class-light-01', worldX: 1180, radius: 76, alpha: 0.045 },
      { id: 'school-class-light-02', worldX: 1680, radius: 64, alpha: 0.04 },
    ],
    props: [
      { id: 'school-class-door', kind: 'door', worldX: 940, label: '2年B組' },
      { id: 'school-class-desks', kind: 'school-desks', worldX: 1210, rows: 3 },
      { id: 'school-class-window', kind: 'window', worldX: 1380, y: 61, width: 96, height: 77 },
      { id: 'school-blackboard', kind: 'blackboard', worldX: 1580, text: '欠席　1', pipText: '欠席　2' },
      { id: 'school-hall-speaker', kind: 'speaker', worldX: 1730 },
    ],
  },
  {
    id: 'school-broadcast-room',
    startX: 1800,
    endX: 2700,
    palette: SCHOOL_BROADCAST_PALETTE,
    ambientLights: [{ id: 'school-broadcast-light-01', worldX: 2240, radius: 82, alpha: 0.05 }],
    props: [
      { id: 'school-broadcast-door', kind: 'door', worldX: 1840, label: '放送室' },
      { id: 'school-broadcast-window', kind: 'window', worldX: 2040, y: 70, width: 72, height: 62 },
      { id: 'school-broadcast-desk', kind: 'school-desks', worldX: 2250, rows: 1 },
      { id: 'school-broadcast-speaker', kind: 'speaker', worldX: 2380 },
      { id: 'school-broadcast-board', kind: 'blackboard', worldX: 2530, text: '放送終了', pipText: '出席確認' },
    ],
  },
  {
    id: 'school-stairwell',
    startX: 2700,
    endX: 3601,
    palette: SCHOOL_STAIR_PALETTE,
    ambientLights: [
      { id: 'school-stair-light-01', worldX: 2910, radius: 68, alpha: 0.04 },
      { id: 'school-roof-light-01', worldX: 3470, radius: 86, alpha: 0.055 },
    ],
    props: [
      { id: 'school-stairs', kind: 'stairs', worldX: 2860 },
      { id: 'school-stair-window', kind: 'window', worldX: 3140, y: 57, width: 68, height: 94 },
      { id: 'school-roof-speaker', kind: 'speaker', worldX: 3300 },
      { id: 'school-roof-exit', kind: 'exit', worldX: 3560 },
    ],
  },
];

export const SCHOOL_ITEM_WORLD_POSITIONS: Readonly<Record<string, number>> = {
  SCHOOL_ROLL: 520,
  SCHOOL_TAPE: 1_520,
  SCHOOL_NOTE: 2_350,
  SCHOOL_PHOTO: 3_300,
};

export const BOARD_SCENE_DEFINITIONS: Readonly<
  Record<BoardId, readonly SceneDefinition[]>
> = {
  hospital: HOSPITAL_SCENE_DEFINITIONS,
  school: SCHOOL_SCENE_DEFINITIONS,
};

export const BOARD_ITEM_WORLD_POSITIONS: Readonly<
  Record<BoardId, Readonly<Record<string, number>>>
> = {
  hospital: HOSPITAL_ITEM_WORLD_POSITIONS,
  school: SCHOOL_ITEM_WORLD_POSITIONS,
};

export function getSceneDefinitions(boardId: BoardId): readonly SceneDefinition[] {
  return BOARD_SCENE_DEFINITIONS[boardId];
}

export function getItemWorldPositions(
  boardId: BoardId,
): Readonly<Record<string, number>> {
  return BOARD_ITEM_WORLD_POSITIONS[boardId];
}

export function getSceneDefinitionAt(
  worldX: number,
  boardId: BoardId = 'hospital',
): SceneDefinition {
  const scenes = BOARD_SCENE_DEFINITIONS[boardId];
  return (
    scenes.find(
      (scene) => worldX >= scene.startX && worldX < scene.endX,
    ) ?? (worldX < scenes[0].startX ? scenes[0] : scenes[scenes.length - 1])
  );
}
