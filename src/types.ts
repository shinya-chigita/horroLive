/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Comment {
  id: string;
  username: string;
  text: string;
  type: 'normal' | 'hype' | 'spooky' | 'glitch' | 'hint' | 'system';
  timestamp: number;
  badge?: 'mod' | 'subscriber' | 'supporter';
}

export type GamePhase = 'TITLE' | 'INTRO_STORY' | 'PLAYING' | 'ENDING' | 'GAMEOVER';

export type EndingType = 'OVER_EXPLOITED' | 'ESCAPED' | 'LOST_ARCHIVE';

export interface GameItem {
  id: string;
  name: string;
  description: string;
  found: boolean;
  type: 'keycard' | 'diary' | 'photo' | 'battery';
  content?: string; // For diary entries
}

export interface Anomaly {
  id: string;
  x: number; // relative corridor coordinate (e.g. 0 to 4000)
  width: number;
  type: 'shadow' | 'ghost' | 'writing' | 'orb' | 'doll';
  description: string;
  points: number;
  captured: boolean;
  visibleOnlyInPip: boolean;
  yOffset?: number;
  /** Semantic scene ownership and runtime state for the v3.1 anomaly director. */
  sceneId?: string;
  directorState?: AnomalyDirectorState;
  resolution?: AnomalyResolution | null;
}

/** Narrative risk bands. The tier may advance, but never falls within a chapter. */
export type RiskTier = 0 | 1 | 2 | 3;

export type AnomalyResolution = 'RECORDED' | 'IGNORED' | 'MISSED';

export type AnomalyDirectorPhase =
  | 'DORMANT'
  | 'TELEGRAPH'
  | 'ACTIVE'
  | AnomalyResolution
  | 'AFTERMATH'
  | 'COMPLETE';

export type TriggerDefinition =
  | { type: 'SCENE_ENTER'; sceneId: string }
  | { type: 'OBJECT_INTERACTION'; objectId: string }
  | { type: 'RISK_TIER'; tier: RiskTier }
  | { type: 'SCRIPTED'; cueId: string };

export interface ChannelCue {
  atMs: number;
  channel: 'WORLD' | 'PIP' | 'CHAT' | 'AUDIO';
  cueId: string;
  visible?: boolean;
}

export interface ResolutionRule {
  captureWindowMs?: number;
  allowIgnore: boolean;
  missedWhenWindowEnds: boolean;
}

export interface ChatCue {
  atMs: number;
  username: string;
  text: string;
  type: Comment['type'];
}

export interface CameraEffectCue {
  atMs: number;
  effect: 'FREEZE' | 'REPEAT' | 'SKIP' | 'EXPOSURE' | 'DISPLACE';
  durationMs: number;
  strength?: number;
}

export interface ReducedEffectDefinition {
  channelTimeline: ChannelCue[];
  cameraEffects: CameraEffectCue[];
}

/**
 * Data-driven anomaly definition. Scene/object identifiers intentionally replace
 * raw corridor-coordinate checks in game logic.
 */
export interface AnomalyDefinition {
  id: string;
  sceneId: string;
  trigger: TriggerDefinition;
  channelTimeline: ChannelCue[];
  activeWindowMs: number;
  resolution: ResolutionRule;
  repeatPolicy: 'once' | 'retry' | 'cooldown';
  cooldownMs?: number;
  priority: number;
  chatScript: ChatCue[];
  cameraEffects: CameraEffectCue[];
  reducedEffectsVariant: ReducedEffectDefinition;
}

export interface AnomalyDirectorState {
  anomalyId: string;
  phase: AnomalyDirectorPhase;
  resolution: AnomalyResolution | null;
  phaseStartedAtMs: number;
  transitionCount: number;
  cycle: number;
}

export interface PlayerState {
  x: number; // player corridor position (0 to 4500)
  speed: number;
  isRunning: boolean;
  isCrouching: boolean;
  flashlightOn: boolean;
  flashlightAngle: number; // in radians
  battery: number; // 0 to 100
  tension: number; // 0 to 100 (increases near ghost or if flashlight off)
  health: number; // 0 to 100
}

export interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  startPos: number;
  endPos: number;
  description: string;
}

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: "Chapter 1: LIVE ON AIR",
    subtitle: "廃病院「白鳴霊園付属病棟」入口",
    startPos: 0,
    endPos: 1200,
    description: "視聴者を集めるため、封鎖された廃墟へ不法侵入。恐怖の配信が今、始まる。"
  },
  {
    id: 2,
    title: "Chapter 2: EYE IN THE SKY",
    subtitle: "第一病棟・長い回廊",
    startPos: 1200,
    endPos: 2400,
    description: "光の届かない闇。カメラを注視せよ、そこには肉眼で見えぬものが映る。"
  },
  {
    id: 3,
    title: "Chapter 3: CLOSED ROOMS",
    subtitle: "診察室と遺体安置所",
    startPos: 2400,
    endPos: 3600,
    description: "閉ざされた扉と過去のカルテ。コメント欄の警告は嘘か、真か。"
  },
  {
    id: 4,
    title: "Chapter 4: SYSTEM INVASION",
    subtitle: "地下電波管理室・変電所",
    startPos: 3600,
    endPos: 4500,
    description: "激化するノイズ。誰かが配信のアカウントを、精神を侵食し始めている。"
  },
  {
    id: 5,
    title: "Chapter 5: ESCAPE OR STREAM",
    subtitle: "最奥の祭壇・非常口",
    startPos: 4500,
    endPos: 5000,
    description: "生きて帰るか、それとも100万再生を掴んで消えるか。選択の時。"
  }
];
