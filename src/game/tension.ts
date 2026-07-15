export type ScareType = 'jumpscare' | 'chase' | 'whisper';

export function applyScareTension(
  currentTension: number,
  scareType: ScareType,
  reducedMotion: boolean,
): number {
  const current = Math.min(100, Math.max(0, currentTension));
  if (scareType === 'chase') {
    return Math.max(current, reducedMotion ? 84 : 95);
  }
  const increase = scareType === 'jumpscare'
    ? reducedMotion ? 20 : 35
    : reducedMotion ? 9 : 15;
  return Math.min(100, current + increase);
}

