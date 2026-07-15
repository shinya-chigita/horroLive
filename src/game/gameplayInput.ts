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

/** Keep gameplay shortcuts inside the activated Main viewport. */
export function shouldHandleGameplayHotkey(
  context: GameplayHotkeyContext,
): boolean {
  return !context.paused && context.viewportFocused && !context.interactiveTarget;
}
