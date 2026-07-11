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
  | { id: string; kind: 'altar'; worldX: number }
  | { id: string; kind: 'exit'; worldX: number }
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
      { id: 'entry-warning', kind: 'graffiti', worldX: 710, text: 'ハシレ', color: '#8a2f27' },
      { id: 'entry-wheelchair', kind: 'wheelchair', worldX: 850 },
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
      { id: 'ward-window', kind: 'window', worldX: 1820, y: 65, width: 84, height: 72 },
      { id: 'ward-gurney', kind: 'gurney', worldX: 2050 },
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
      { id: 'basement-gurney', kind: 'gurney', worldX: 3820 },
      { id: 'basement-signal', kind: 'graffiti', worldX: 3880, text: 'NO SIGNAL', color: '#707875' },
      { id: 'basement-locker', kind: 'locker', worldX: 4090, open: false },
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

export function getSceneDefinitionAt(worldX: number): SceneDefinition {
  return (
    HOSPITAL_SCENE_DEFINITIONS.find(
      (scene) => worldX >= scene.startX && worldX < scene.endX,
    ) ?? HOSPITAL_SCENE_DEFINITIONS[HOSPITAL_SCENE_DEFINITIONS.length - 1]
  );
}
