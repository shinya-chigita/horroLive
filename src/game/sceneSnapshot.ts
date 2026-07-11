import { Anomaly, GameItem, PlayerState } from '../types';
import { getSceneDefinitionAt } from './sceneDefinitions';

export interface ScenePointer {
  x: number;
  y: number;
}

export interface SceneSnapshot {
  timestamp: number;
  sceneId: string;
  player: PlayerState;
  anomalies: Anomaly[];
  items: GameItem[];
  mouse: ScenePointer;
  isMoving: boolean;
}

export interface SceneSnapshotInput {
  timestamp: number;
  player: PlayerState;
  anomalies: Anomaly[];
  items: GameItem[];
  mouse: ScenePointer;
  isMoving: boolean;
}

export function createSceneSnapshot(input: SceneSnapshotInput): SceneSnapshot {
  return {
    timestamp: input.timestamp,
    sceneId: getSceneDefinitionAt(input.player.x).id,
    player: { ...input.player },
    anomalies: input.anomalies.map((anomaly) => ({ ...anomaly })),
    items: input.items.map((item) => ({ ...item })),
    mouse: { ...input.mouse },
    isMoving: input.isMoving,
  };
}

/**
 * A small in-memory DVR for the camera feed. RAF timestamps use the same
 * monotonic clock in the main view and PIP, so delayed lookup stays stable.
 */
export class SceneSnapshotHistory {
  private snapshots: SceneSnapshot[] = [];

  constructor(
    private readonly retentionMs = 2600,
    private readonly maxSamples = 180,
  ) {}

  record(input: SceneSnapshotInput): SceneSnapshot {
    const snapshot = createSceneSnapshot(input);
    const previous = this.snapshots[this.snapshots.length - 1];

    if (
      previous &&
      (snapshot.timestamp < previous.timestamp ||
        Math.abs(snapshot.player.x - previous.player.x) > 1200)
    ) {
      this.snapshots = [];
    } else if (previous && snapshot.timestamp === previous.timestamp) {
      this.snapshots[this.snapshots.length - 1] = snapshot;
      return snapshot;
    }

    this.snapshots.push(snapshot);
    const cutoff = snapshot.timestamp - this.retentionMs;
    while (this.snapshots.length > 1 && this.snapshots[0].timestamp < cutoff) {
      this.snapshots.shift();
    }
    if (this.snapshots.length > this.maxSamples) {
      this.snapshots.splice(0, this.snapshots.length - this.maxSamples);
    }
    return snapshot;
  }

  atOrBefore(timestamp: number): SceneSnapshot | null {
    if (this.snapshots.length === 0) return null;
    if (timestamp <= this.snapshots[0].timestamp) return this.snapshots[0];

    let low = 0;
    let high = this.snapshots.length - 1;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (this.snapshots[middle].timestamp <= timestamp) low = middle + 1;
      else high = middle - 1;
    }
    return this.snapshots[Math.max(0, high)] ?? null;
  }

  latest(): SceneSnapshot | null {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }

  clear() {
    this.snapshots = [];
  }
}

export const canonicalSceneHistory = new SceneSnapshotHistory();
