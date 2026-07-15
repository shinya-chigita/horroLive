import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSyntheticThreatCaptureTarget,
  getViewerThreatCameraPresentation,
  getViewerThreatProfile,
  getViewerThreatTensionFloor,
  shouldRenderMainBleed,
} from './viewerThreat.ts';

test('viewer growth raises the persistent tension floor without becoming lethal alone', () => {
  assert.deepEqual(
    ([0, 1, 2, 3] as const).map(getViewerThreatTensionFloor),
    [9, 18, 32, 48],
  );
  assert.ok(getViewerThreatTensionFloor(3) < 92);
});

const camera = (
  overrides: Partial<{
    x: number;
    facing: -1 | 1;
    flashlightAngle: number;
    flashlightOn: boolean;
    battery: number;
  }> = {},
) => ({
  x: 1_000,
  facing: 1 as const,
  flashlightAngle: 0,
  flashlightOn: true,
  battery: 100,
  ...overrides,
});

test('viewer tiers map to absent, far, mid, and shoulder threat profiles', () => {
  assert.deepEqual(getViewerThreatProfile(0), {
    riskTier: 0,
    stage: 'absent',
    distance: null,
    pipVisible: false,
    mainBleedDurationMs: 0,
    mainBleedPeriodMs: 0,
    suppressHumanChat: false,
  });
  assert.deepEqual(getViewerThreatProfile(1), {
    riskTier: 1,
    stage: 'far',
    distance: 520,
    pipVisible: true,
    mainBleedDurationMs: 0,
    mainBleedPeriodMs: 0,
    suppressHumanChat: false,
  });
  assert.deepEqual(getViewerThreatProfile(2), {
    riskTier: 2,
    stage: 'mid',
    distance: 240,
    pipVisible: true,
    mainBleedDurationMs: 160,
    mainBleedPeriodMs: 3_600,
    suppressHumanChat: false,
  });
  assert.deepEqual(getViewerThreatProfile(3), {
    riskTier: 3,
    stage: 'shoulder',
    distance: 80,
    pipVisible: true,
    mainBleedDurationMs: 260,
    mainBleedPeriodMs: 2_400,
    suppressHumanChat: true,
  });

  for (const tier of [0, 1, 2, 3] as const) {
    assert.equal(Object.isFrozen(getViewerThreatProfile(tier)), true);
  }
});

test('tier two Main bleed uses a deterministic brief periodic window', () => {
  assert.equal(shouldRenderMainBleed(0, 2, false), true);
  assert.equal(shouldRenderMainBleed(159.999, 2, false), true);
  assert.equal(shouldRenderMainBleed(160, 2, false), false);
  assert.equal(shouldRenderMainBleed(3_599, 2, false), false);
  assert.equal(shouldRenderMainBleed(3_600, 2, false), true);
  assert.equal(shouldRenderMainBleed(3_760, 2, false), false);
});

test('tier three bleeds more often and suppresses human Chat', () => {
  const profile = getViewerThreatProfile(3);
  assert.equal(profile.suppressHumanChat, true);
  assert.equal(shouldRenderMainBleed(259.999, 3, false), true);
  assert.equal(shouldRenderMainBleed(260, 3, false), false);
  assert.equal(shouldRenderMainBleed(2_400, 3, false), true);
});

test('absent/far tiers, reduced motion, and invalid clocks never flash Main', () => {
  for (const tier of [0, 1] as const) {
    assert.equal(shouldRenderMainBleed(0, tier, false), false);
    assert.equal(shouldRenderMainBleed(100_000, tier, false), false);
  }
  assert.equal(shouldRenderMainBleed(0, 2, true), false);
  assert.equal(shouldRenderMainBleed(0, 3, true), false);
  assert.equal(shouldRenderMainBleed(-1, 3, false), false);
  assert.equal(shouldRenderMainBleed(Number.NaN, 3, false), false);
  assert.equal(shouldRenderMainBleed(Number.POSITIVE_INFINITY, 3, false), false);
});

test('the synthetic observer is absent outside the climax at every tier', () => {
  for (const tier of [0, 1, 2, 3] as const) {
    assert.deepEqual(
      createSyntheticThreatCaptureTarget(
        getViewerThreatProfile(tier),
        false,
        camera(),
      ),
      {
        targetId: null,
        distance: null,
        isFramed: false,
        canCapture: false,
        reason: 'NO_TARGET',
      },
    );
  }
});

test('an absent tier stays targetless even if the climax is active', () => {
  assert.deepEqual(
    createSyntheticThreatCaptureTarget(
      getViewerThreatProfile(0),
      true,
      camera(),
    ),
    {
      targetId: null,
      distance: null,
      isFramed: false,
      canCapture: false,
      reason: 'NO_TARGET',
    },
  );
});

test('a far climax observer is framed but remains out of capture range', () => {
  const target = createSyntheticThreatCaptureTarget(
    getViewerThreatProfile(1),
    true,
    camera(),
  );
  assert.equal(target.targetId, 'stream.observer');
  assert.equal(target.distance, 520);
  assert.equal(target.isFramed, true);
  assert.equal(target.canCapture, false);
  assert.equal(target.reason, 'OUT_OF_RANGE');
  assert.ok(target.projection);
});

test('mid and shoulder observers become valid climax capture targets', () => {
  for (const tier of [2, 3] as const) {
    const target = createSyntheticThreatCaptureTarget(
      getViewerThreatProfile(tier),
      true,
      camera({ battery: 54 }),
    );
    assert.equal(target.targetId, 'stream.observer');
    assert.equal(target.isFramed, true);
    assert.equal(target.canCapture, true);
    assert.equal(target.reason, 'READY');
  }
});

test('synthetic capture reports rig failures before range readiness', () => {
  const profile = getViewerThreatProfile(2);
  assert.equal(
    createSyntheticThreatCaptureTarget(profile, true, camera({
      flashlightOn: false,
      battery: 50,
    })).reason,
    'FLASHLIGHT_OFF',
  );
  assert.equal(
    createSyntheticThreatCaptureTarget(profile, true, camera({
      flashlightOn: true,
      battery: 0,
    })).reason,
    'BATTERY_EMPTY',
  );
  assert.equal(
    createSyntheticThreatCaptureTarget(profile, true, camera({
      flashlightOn: false,
      battery: Number.NaN,
    })).reason,
    'BATTERY_EMPTY',
  );
});

test('PIP rendering and synthetic capture share one authored presentation', () => {
  assert.equal(getViewerThreatCameraPresentation(getViewerThreatProfile(0)), null);
  assert.deepEqual(
    getViewerThreatCameraPresentation(getViewerThreatProfile(2)),
    {
      id: 'stream.observer',
      visible: true,
      distance: 240,
      lateral: -0.4,
      elevation: 0.42,
      worldWidth: 58,
      worldHeight: 164,
      alpha: 0.3,
    },
  );

  assert.equal(
    getViewerThreatCameraPresentation(getViewerThreatProfile(2), 3)?.distance,
    198,
  );
});

test('climax capture follows the actual projected observer and visible AF box', () => {
  const profile = getViewerThreatProfile(2);
  const level = createSyntheticThreatCaptureTarget(profile, true, camera());
  assert.equal(level.targetId, 'stream.observer');
  assert.equal(level.isFramed, true);
  assert.equal(level.canCapture, true);
  assert.equal(level.reason, 'READY');

  const aimedTooHigh = createSyntheticThreatCaptureTarget(
    profile,
    true,
    camera({ flashlightAngle: -0.52 }),
  );
  assert.equal(aimedTooHigh.targetId, 'stream.observer');
  assert.equal(aimedTooHigh.isFramed, false);
  assert.equal(aimedTooHigh.canCapture, false);
  assert.equal(aimedTooHigh.reason, 'OUT_OF_FRAME');
});
