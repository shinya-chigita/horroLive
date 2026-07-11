import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createViewerRiskState,
  getRiskTier,
  getViewerBand,
  transitionViewerRisk,
  VIEWER_BANDS,
} from './risk.ts';

test('viewer thresholds map to the four risk tiers at exact boundaries', () => {
  assert.equal(getRiskTier(0), 0);
  assert.equal(getRiskTier(236), 0);
  assert.equal(getRiskTier(237), 0);
  assert.equal(getRiskTier(2_369), 0);
  assert.equal(getRiskTier(2_370), 1);
  assert.equal(getRiskTier(23_699), 1);
  assert.equal(getRiskTier(23_700), 2);
  assert.equal(getRiskTier(236_999), 2);
  assert.equal(getRiskTier(237_000), 3);
  assert.equal(getRiskTier(Number.NaN), 0);
  assert.deepEqual(VIEWER_BANDS.map((_, tier) => getViewerBand(tier as 0 | 1 | 2 | 3)), VIEWER_BANDS);
});

test('reached viewer bands fire exactly once per chapter', () => {
  let state = createViewerRiskState('hospital');

  let result = transitionViewerRisk(state, { viewerCount: 237 });
  assert.deepEqual(result.triggeredBands, [237]);
  state = result.state;

  result = transitionViewerRisk(state, { viewerCount: 237 });
  assert.deepEqual(result.triggeredBands, []);
  state = result.state;

  result = transitionViewerRisk(state, { viewerCount: 237_000 });
  assert.deepEqual(result.triggeredBands, [2_370, 23_700, 237_000]);
  assert.equal(result.state.tier, 3);
  state = result.state;

  result = transitionViewerRisk(state, { viewerCount: 10 });
  assert.deepEqual(result.triggeredBands, []);
  assert.equal(result.state.tier, 3, 'same-chapter tier must be monotonic');
  state = result.state;

  result = transitionViewerRisk(state, {
    chapterId: 'basement',
    viewerCount: 2_370,
  });
  assert.deepEqual(result.triggeredBands, [237, 2_370]);
  assert.equal(result.state.tier, 1);
  assert.equal(result.state.chapterId, 'basement');
});

test('viewer input is normalised before risk logic runs', () => {
  const initial = createViewerRiskState('hospital', -50);
  assert.equal(initial.viewerCount, 0);

  const result = transitionViewerRisk(initial, { viewerCount: 2_370.9 });
  assert.equal(result.state.viewerCount, 2_370);
  assert.equal(result.state.tier, 1);
  assert.deepEqual(result.triggeredBands, [237, 2_370]);
});
