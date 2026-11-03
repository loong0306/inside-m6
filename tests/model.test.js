import test from 'node:test';
import assert from 'node:assert/strict';
import { clockMetrics, communicationSteps, clockVisual } from '../src/model.js';

test('4.8 GHz means 4.8 billion cycles, not necessarily instructions', () => {
  const m = clockMetrics(4.8, 2);
  assert.equal(m.cyclesPerSecond, 4_800_000_000);
  assert.ok(Math.abs(m.periodNs - 0.20833333333333334) < 1e-12);
  assert.equal(m.instructionsPerSecond, 9_600_000_000);
  assert.equal(clockMetrics(2.4, 0.5).instructionsPerSecond, 1_200_000_000);
});
test('non-positive and non-finite clock values cannot create invalid output', () => {
  for (const value of [0, -1, NaN, Infinity]) assert.throws(() => clockMetrics(value, 1), RangeError);
});
test('a cache hit returns data without contacting unified memory', () => {
  const steps = communicationSteps('hit');
  assert.ok(steps.some(s => s.from === 'cache' && s.to === 'cpu'));
  assert.ok(steps.every(s => s.from !== 'memory' && s.to !== 'memory'));
});
test('a cache miss requests memory before data comes back to the CPU', () => {
  const steps = communicationSteps('miss');
  const request = steps.findIndex(s => s.to === 'memory');
  const reply = steps.findIndex(s => s.from === 'memory');
  assert.ok(request >= 0 && reply > request);
  assert.equal(steps.at(-1).to, 'cpu');
});
test('GPU shared-memory read follows CPU publication and synchronization', () => {
  const steps = communicationSteps('gpu');
  const write = steps.findIndex(s => s.kind === 'write');
  const sync = steps.findIndex(s => s.kind === 'sync');
  const read = steps.findIndex(s => s.from === 'memory' && s.to === 'gpu');
  assert.ok(write >= 0 && sync > write && read > sync);
});

test('one manual clock cycle moves the cursor exactly one waveform period', () => {
  const before = clockVisual(0.25, 2.4);
  const after = clockVisual(1.25, 2.4);
  assert.equal(before.periodPx, 145);
  assert.equal(after.cursorX - before.cursorX, 145);
  assert.equal(before.phase, after.phase);
  assert.equal(clockVisual(1, 4.8).cursorX, 72.5);
});

test('cursor wraps at a complete cycle so the waveform stays in phase', () => {
  const state = clockVisual(5.25, 2.4);
  assert.equal(state.cursorX,181.25);
  assert.equal(state.phase,0.25);
});
