import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const appSource = readSource('../AppV2.tsx');
const titleSource = readSource('../components/TitleScreenV2.tsx');
const boardSelectSource = readSource('../components/BoardSelectScreen.tsx');
const mainGameSource = readSource('../components/MainGameView.tsx');
const pipCameraSource = readSource('../components/PipCameraV2.tsx');

test('the player-facing primary route enters the hospital broadcast without QA copy or an extra intro gate', () => {
  const playerEntrySource = `${titleSource}\n${boardSelectSource}`;

  assert.doesNotMatch(
    playerEntrySource,
    /quality gate|改善プロトタイプ|品質ゲート|required route/i,
  );
  assert.match(titleSource, /data-route-id="hospital-standard-gate-2"/);
  assert.match(titleSource, /廃病院からLIVE配信を開始/);
  assert.match(appSource, /onStartGame=\{startImprovementPrototype\}/);
  assert.match(
    appSource,
    /prepareBoardSession\(\s*'hospital',\s*'STANDARD',\s*'PLAYING',\s*true\s*\)/,
  );
});

test('game simulation waits for input readiness and the first touch activates the viewport', () => {
  assert.match(
    appSource,
    /const isInterfacePaused =[\s\S]*?isAwaitingGameplayReady \|\|[\s\S]*?isPrototypeInputPaused;/,
  );
  assert.match(
    appSource,
    /const isBroadcastPaused =[\s\S]*?isAwaitingGameplayReady \|\|[\s\S]*?isPrototypeInputPaused\);/,
  );
  assert.match(
    mainGameSource,
    /const holdKey =[\s\S]*?if \(value\) \{\s*activateViewport\(\);/,
  );
  assert.match(
    mainGameSource,
    /const toggleFlashlight =[\s\S]*?activateViewport\(\);/,
  );
  assert.match(
    mainGameSource,
    /const handlePointerMove =[\s\S]*?event\.pointerType === 'mouse' && awaitingFirstInputRef\.current[\s\S]*?activateViewport\(\);/,
  );
  assert.match(
    mainGameSource,
    /onFocus=\{\(\) => \{[\s\S]*?setIsViewportFocused\(true\);[\s\S]*?onFocusChange\?\.\(true\);[\s\S]*?\}\}/,
  );
  assert.doesNotMatch(
    mainGameSource,
    /onFocus=\{[^}]*onFirstInput/,
  );
  assert.match(
    mainGameSource,
    /\{showFocusPrompt && !isViewportFocused && \(/,
  );
  assert.match(
    appSource,
    /isAwaitingGameplayReady =[\s\S]*?isImprovementPrototype && !isGameplayReady/,
  );
  assert.match(
    appSource,
    /const handlePipCaptureAnomaly =[\s\S]*?!isGameplayReady\) \{\s*setIsGameplayReady\(true\);/,
  );
  assert.match(
    appSource,
    /onFocusChange=\{[\s\S]*?isImprovementPrototype \? setIsGameplaySurfaceFocused : undefined/,
  );
  assert.match(
    pipCameraSource,
    /if \(metadata\.isPaused\) \{[\s\S]*?if \(hasRenderedFrame\) return;/,
  );
  assert.match(pipCameraSource, /ctx\.restore\(\);\s*hasRenderedFrame = true;/);
});
