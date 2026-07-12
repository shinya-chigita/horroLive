import type { PlayerState } from '../types.ts';

export const MAX_FLASHLIGHT_PITCH = 0.58;
// A left/right turn briefly travels through a vertical beam. Camera projection
// accepts that transient range even though direct pointer aiming stays tighter.
export const MAX_AIM_TRANSITION_PITCH = Math.PI / 2;
export const AIM_RESPONSE_SECONDS = 0.105;

export interface AimTarget {
  facing: PlayerState['facing'];
  pitch: number;
}

export interface AimPoint {
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function pointerToAimTarget(
  pointer: AimPoint,
  origin: AimPoint,
  currentFacing: PlayerState['facing'],
  deadZone = 18,
): AimTarget {
  const dx = pointer.x - origin.x;
  const facing =
    Math.abs(dx) <= deadZone ? currentFacing : dx < 0 ? -1 : 1;
  const pitch = clamp(
    Math.atan2(pointer.y - origin.y, Math.max(48, Math.abs(dx))),
    -MAX_FLASHLIGHT_PITCH,
    MAX_FLASHLIGHT_PITCH,
  );
  return { facing, pitch };
}

/** Frame-rate independent 90–140ms flashlight follow. */
export function smoothAim(
  current: AimTarget,
  target: AimTarget,
  deltaSeconds: number,
): AimTarget {
  const safeDelta = clamp(deltaSeconds, 0, 0.1);
  const alpha = 1 - Math.exp(-safeDelta / AIM_RESPONSE_SECONDS);
  const toBearing = (aim: AimTarget) =>
    aim.facing > 0 ? aim.pitch : Math.PI - aim.pitch;
  const currentBearing = toBearing(current);
  const targetBearing = toBearing(target);
  const deltaBearing = Math.atan2(
    Math.sin(targetBearing - currentBearing),
    Math.cos(targetBearing - currentBearing),
  );
  const bearing = currentBearing + deltaBearing * alpha;
  const x = Math.cos(bearing);
  const y = Math.sin(bearing);
  return {
    facing: x < 0 ? -1 : 1,
    // During a turn the beam travels through the vertical instead of jumping
    // 180 degrees. Normal pointer targets remain inside MAX_FLASHLIGHT_PITCH.
    pitch: Math.atan2(y, Math.max(0.0001, Math.abs(x))),
  };
}

export function aimTargetToPoint(
  aim: AimTarget,
  origin: AimPoint,
  length = 330,
): AimPoint {
  return {
    x: origin.x + Math.cos(aim.pitch) * length * aim.facing,
    y: origin.y + Math.sin(aim.pitch) * length,
  };
}
