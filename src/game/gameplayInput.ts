export const GAMEPLAY_INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="radio"]',
  '[role="checkbox"]',
  '[role="link"]',
].join(',');

export interface GameplayHotkeyContext {
  paused: boolean;
  viewportFocused: boolean;
  interactiveTarget: boolean;
}

const GAMEPLAY_START_KEYS = new Set([
  'a',
  'd',
  's',
  'arrowleft',
  'arrowright',
  'arrowdown',
  'shift',
  'control',
  'f',
  'e',
  ' ',
]);

export interface GameplayFirstKeyContext {
  awaitingFirstInput: boolean;
  viewportFocused: boolean;
  interactiveTarget: boolean;
  key: string;
}

/** Start an armed run only from a gameplay key inside Main, never from Tab or UI controls. */
export function shouldBeginGameplayFromKey(
  context: GameplayFirstKeyContext,
): boolean {
  return (
    context.awaitingFirstInput &&
    context.viewportFocused &&
    !context.interactiveTarget &&
    GAMEPLAY_START_KEYS.has(context.key.toLowerCase())
  );
}

/** Keep gameplay shortcuts inside the activated Main viewport. */
export function shouldHandleGameplayHotkey(
  context: GameplayHotkeyContext,
): boolean {
  return !context.paused && context.viewportFocused && !context.interactiveTarget;
}
