import { describe, it, expect } from 'vitest';
import {
  isMouseButton,
  initialButtonState,
  buttonReducer,
  isButtonPressed,
  isButtonTested,
  testedButtonCount,
  allButtonsTested,
  initialClickTrackerState,
  clickTrackerReducer,
  classifyWheel,
  deltaModeLabel,
  initialDragState,
  dragDistance,
  dragReducer,
  isDrag,
  DEFAULT_CHATTER_THRESHOLD_MS,
  initialChatterState,
  isChatter,
  chatterReducer,
  STANDARD_POLLING_RATES,
  intervalsFromTimestamps,
  estimatePollingRate,
  removeOutlierIntervals,
  nearestStandardPollingRate,
  MAX_CLICK_INTERVALS,
} from '../logic';

describe('isMouseButton', () => {
  it('valid range', () => {
    expect(isMouseButton(0)).toBe(true);
    expect(isMouseButton(4)).toBe(true);
    expect(isMouseButton(5)).toBe(false);
    expect(isMouseButton(-1)).toBe(false);
  });
});

describe('buttonReducer', () => {
  it('initial state all false', () => {
    const s = initialButtonState();
    expect(testedButtonCount(s)).toBe(0);
    expect(allButtonsTested(s)).toBe(false);
    for (let b = 0; b < 5; b += 1) {
      expect(isButtonPressed(s, b)).toBe(false);
      expect(isButtonTested(s, b)).toBe(false);
    }
  });
  it('mousedown marks pressed+tested', () => {
    let s = initialButtonState();
    s = buttonReducer(s, { type: 'mousedown', button: 2 });
    expect(isButtonPressed(s, 2)).toBe(true);
    expect(isButtonTested(s, 2)).toBe(true);
    expect(testedButtonCount(s)).toBe(1);
  });
  it('mouseup clears pressed but keeps tested', () => {
    let s = initialButtonState();
    s = buttonReducer(s, { type: 'mousedown', button: 0 });
    s = buttonReducer(s, { type: 'mouseup', button: 0 });
    expect(isButtonPressed(s, 0)).toBe(false);
    expect(isButtonTested(s, 0)).toBe(true);
  });
  it('ignores invalid buttons', () => {
    const s = initialButtonState();
    const s2 = buttonReducer(s, { type: 'mousedown', button: 9 });
    expect(s2).toBe(s);
  });
  it('reset clears', () => {
    let s = initialButtonState();
    s = buttonReducer(s, { type: 'mousedown', button: 1 });
    s = buttonReducer(s, { type: 'reset' });
    expect(testedButtonCount(s)).toBe(0);
  });
  it('allButtonsTested true when all pressed once', () => {
    let s = initialButtonState();
    for (let b = 0; b < 5; b += 1) {
      s = buttonReducer(s, { type: 'mousedown', button: b });
    }
    expect(allButtonsTested(s)).toBe(true);
  });
  it('immutability: original unchanged', () => {
    const s = initialButtonState();
    const s2 = buttonReducer(s, { type: 'mousedown', button: 0 });
    expect(isButtonTested(s, 0)).toBe(false);
    expect(isButtonTested(s2, 0)).toBe(true);
  });
  it('throws on unknown action', () => {
    const s = initialButtonState();
    expect(() => buttonReducer(s, { type: 'nope' } as never)).toThrow();
  });
});

describe('clickTrackerReducer', () => {
  it('records intervals', () => {
    let s = initialClickTrackerState();
    s = clickTrackerReducer(s, { type: 'click', timestamp: 100 });
    expect(s.clickCount).toBe(1);
    expect(s.lastIntervalMs).toBeNull();
    s = clickTrackerReducer(s, { type: 'click', timestamp: 260 });
    expect(s.clickCount).toBe(2);
    expect(s.lastIntervalMs).toBe(160);
    expect(s.intervals).toEqual([160]);
  });
  it('bounds intervals to MAX_CLICK_INTERVALS', () => {
    let s = initialClickTrackerState();
    for (let i = 0; i < MAX_CLICK_INTERVALS + 5; i += 1) {
      s = clickTrackerReducer(s, { type: 'click', timestamp: i * 10 });
    }
    expect(s.intervals.length).toBe(MAX_CLICK_INTERVALS);
  });
  it('reset clears', () => {
    let s = initialClickTrackerState();
    s = clickTrackerReducer(s, { type: 'click', timestamp: 1 });
    s = clickTrackerReducer(s, { type: 'reset' });
    expect(s.clickCount).toBe(0);
  });
  it('throws on unknown action', () => {
    const s = initialClickTrackerState();
    expect(() => clickTrackerReducer(s, { type: 'nope' } as never)).toThrow();
  });
});

describe('classifyWheel', () => {
  it('vertical up/down', () => {
    expect(classifyWheel(0, -10)).toBe('up');
    expect(classifyWheel(0, 10)).toBe('down');
  });
  it('horizontal left/right', () => {
    expect(classifyWheel(-10, 0)).toBe('left');
    expect(classifyWheel(10, 0)).toBe('right');
  });
  it('dominant axis wins', () => {
    expect(classifyWheel(2, -10)).toBe('up');
    expect(classifyWheel(-10, 2)).toBe('left');
  });
  it('zero returns null', () => {
    expect(classifyWheel(0, 0)).toBeNull();
  });
});

describe('deltaModeLabel', () => {
  it('maps modes', () => {
    expect(deltaModeLabel(0)).toBe('pixel');
    expect(deltaModeLabel(1)).toBe('line');
    expect(deltaModeLabel(2)).toBe('page');
    expect(deltaModeLabel(9)).toBe('unknown');
  });
});

describe('drag', () => {
  it('initial state', () => {
    const s = initialDragState();
    expect(s.dragging).toBe(false);
    expect(s.completed).toBe(false);
    expect(s.distance).toBe(0);
  });
  it('start/move/end flow', () => {
    let s = initialDragState();
    s = dragReducer(s, { type: 'start', x: 0, y: 0 });
    expect(s.dragging).toBe(true);
    s = dragReducer(s, { type: 'move', x: 3, y: 4 });
    expect(s.distance).toBe(5);
    s = dragReducer(s, { type: 'end', x: 3, y: 4 });
    expect(s.dragging).toBe(false);
    expect(s.completed).toBe(true);
    expect(s.distance).toBe(5);
  });
  it('dragDistance', () => {
    expect(dragDistance(0, 0, 3, 4)).toBe(5);
    expect(dragDistance(0, 0, 0, 0)).toBe(0);
  });
  it('isDrag threshold', () => {
    expect(isDrag(10, 5)).toBe(true);
    expect(isDrag(3, 5)).toBe(false);
  });
  it('reset', () => {
    let s = initialDragState();
    s = dragReducer(s, { type: 'start', x: 1, y: 1 });
    s = dragReducer(s, { type: 'reset' });
    expect(s.dragging).toBe(false);
  });
  it('end without start is ignored', () => {
    const s = initialDragState();
    const s2 = dragReducer(s, { type: 'end', x: 5, y: 5 });
    expect(s2.completed).toBe(false);
  });
  it('throws on unknown action', () => {
    const s = initialDragState();
    expect(() => dragReducer(s, { type: 'nope' } as never)).toThrow();
  });
});

describe('chatter', () => {
  it('default threshold is 30', () => {
    expect(DEFAULT_CHATTER_THRESHOLD_MS).toBe(30);
  });
  it('isChatter true within threshold', () => {
    expect(isChatter(100, 120, 30)).toBe(true);
    expect(isChatter(100, 200, 30)).toBe(false);
    expect(isChatter(null, 100, 30)).toBe(false);
  });
  it('reducer counts same-button chatter only', () => {
    let s = initialChatterState();
    s = chatterReducer(s, { type: 'mousedown', button: 0, timestamp: 100 });
    expect(s.chatterCount).toBe(0);
    s = chatterReducer(s, { type: 'mousedown', button: 0, timestamp: 120 });
    expect(s.chatterCount).toBe(1);
    expect(s.lastIntervalMs).toBe(20);
  });
  it('cross-button presses do not count as chatter', () => {
    let s = initialChatterState();
    s = chatterReducer(s, { type: 'mousedown', button: 0, timestamp: 100 });
    s = chatterReducer(s, { type: 'mousedown', button: 2, timestamp: 120 });
    expect(s.chatterCount).toBe(0);
  });
  it('reset clears and preserves threshold', () => {
    let s = initialChatterState(40);
    s = chatterReducer(s, { type: 'mousedown', button: 0, timestamp: 1 });
    s = chatterReducer(s, { type: 'reset' });
    expect(s.chatterCount).toBe(0);
    expect(s.thresholdMs).toBe(40);
  });
  it('throws on unknown action', () => {
    const s = initialChatterState();
    expect(() => chatterReducer(s, { type: 'nope' } as never)).toThrow();
  });
});

describe('polling rate', () => {
  it('intervalsFromTimestamps', () => {
    expect(intervalsFromTimestamps([0, 8, 16])).toEqual([8, 8]);
    expect(intervalsFromTimestamps([5])).toEqual([]);
    expect(intervalsFromTimestamps([0, 0, 5])).toEqual([5]);
  });
  it('estimatePollingRate ~125hz for 8ms intervals', () => {
    const ts = Array.from({ length: 50 }, (_, i) => i * 8);
    const est = estimatePollingRate(ts);
    expect(est.sampleCount).toBe(49);
    expect(est.estimatedHz).toBeCloseTo(125, 0);
    expect(est.nearestStandardHz).toBe(125);
    expect(est.medianIntervalMs).toBe(8);
  });
  it('estimatePollingRate ~1000hz for 1ms intervals', () => {
    const ts = Array.from({ length: 100 }, (_, i) => i * 1);
    const est = estimatePollingRate(ts);
    expect(est.estimatedHz).toBeCloseTo(1000, 0);
    expect(est.nearestStandardHz).toBe(1000);
  });
  it('quantized 0.1ms at 1000hz', () => {
    const ts = Array.from({ length: 100 }, (_, i) => Math.round(i * 1 * 10) / 10);
    const est = estimatePollingRate(ts);
    expect(est.nearestStandardHz).toBe(1000);
  });
  it('empty -> nulls', () => {
    const est = estimatePollingRate([]);
    expect(est.estimatedHz).toBeNull();
    expect(est.nearestStandardHz).toBeNull();
    expect(est.medianIntervalMs).toBeNull();
    expect(est.sampleCount).toBe(0);
  });
  it('nearestStandardPollingRate caps at 4000', () => {
    expect(nearestStandardPollingRate(120)).toBe(125);
    expect(nearestStandardPollingRate(0)).toBeNull();
    expect(nearestStandardPollingRate(5000)).toBe(4000);
    expect(nearestStandardPollingRate(8000)).toBe(4000);
  });
  it('STANDARD_POLLING_RATES contains expected', () => {
    expect(STANDARD_POLLING_RATES).toEqual([125, 250, 500, 1000, 2000, 4000, 8000]);
  });
  it('removeOutlierIntervals keeps valid', () => {
    const out = removeOutlierIntervals([8, 8, 8, 100]);
    expect(out.length).toBeLessThanOrEqual(4);
    expect(out).toContain(8);
  });
  it('outlier removal keeps all when few', () => {
    expect(removeOutlierIntervals([8, 8])).toEqual([8, 8]);
  });
  it('jittery 8ms intervals still ~125hz', () => {
    const base = Array.from({ length: 60 }, (_, i) => i * 8);
    const jittered = base.map((t, i) => t + (i % 5) - 2);
    const est = estimatePollingRate(jittered);
    expect(est.nearestStandardHz).toBe(125);
    expect(est.estimatedHz).toBeGreaterThan(100);
    expect(est.estimatedHz).toBeLessThan(160);
  });
  it('idle gaps are rejected as outliers', () => {
    const ts = [0, 8, 16, 24, 1000, 1008, 1016, 1024, 1032];
    const est = estimatePollingRate(ts);
    expect(est.nearestStandardHz).toBe(125);
  });
});
