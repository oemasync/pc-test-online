import { describe, it, expect } from 'vitest';
import {
    createCoverageGrid,
    createCoverageState,
    pointToCell,
    lineCells,
    markPath,
    coveredCount,
    coverageRatio,
    coverageReducer,
    createPointerTracker,
    pointerTrackerReducer,
    isTouchSupported,
    type PointerSample,
    type NormalizedPoint,
} from '../logic';

describe('coverage grid', () => {
    it('creates grid with all cells false', () => {
        const g = createCoverageGrid(2, 3);
        expect(g.rows).toBe(2);
        expect(g.cols).toBe(3);
        expect(g.rows * g.cols).toBe(6);
        expect(coveredCount(g)).toBe(0);
        for (const v of g.hit) expect(v).toBe(false);
    });

    it('pointToCell maps normalized coordinates', () => {
        expect(pointToCell(0, 0, 2, 2)).toEqual({ row: 0, col: 0 });
        expect(pointToCell(0.99, 0.99, 2, 2)).toEqual({ row: 1, col: 1 });
        expect(pointToCell(0.5, 0.5, 2, 2)).toEqual({ row: 1, col: 1 });
    });

    it('pointToCell returns null outside', () => {
        expect(pointToCell(-0.1, 0, 2, 2)).toBeNull();
        expect(pointToCell(1.1, 0, 2, 2)).toBeNull();
    });

    it('pointToCell includes right/bottom edge', () => {
        expect(pointToCell(1, 1, 2, 2)).toEqual({ row: 1, col: 1 });
    });

    it('lineCells covers straight horizontal', () => {
        const cells = lineCells(0, 0, 0, 3);
        expect(cells).toEqual([[0, 0], [0, 1], [0, 2], [0, 3]]);
    });

    it('lineCells covers diagonal', () => {
        const cells = lineCells(0, 0, 2, 2);
        expect(cells.length).toBe(3);
        expect(cells[0]).toEqual([0, 0]);
        expect(cells[cells.length - 1]).toEqual([2, 2]);
    });

    it('markPath covers a 100-point path on 40x24', () => {
        const s = createCoverageState(24, 40);
        const samples: NormalizedPoint[] = [];
        for (let i = 0; i < 100; i += 1) {
            samples.push({ x: i / 99, y: (i % 2 === 0 ? 0.1 : 0.9), pointerId: 1 });
        }
        const s2 = markPath(s, samples);
        expect(coveredCount(s2)).toBe(800);
    });

    it('two simultaneous pointers far apart do not fill between them', () => {
        const s = createCoverageState(10, 10);
        const samples: NormalizedPoint[] = [
            { x: 0.05, y: 0.05, pointerId: 1 },
            { x: 0.95, y: 0.95, pointerId: 2 },
        ];
        const s2 = markPath(s, samples);
        expect(coveredCount(s2)).toBe(2);
    });

    it('markPath with empty samples returns the same state', () => {
        const s = createCoverageState(2, 2);
        const s2 = markPath(s, []);
        expect(s2).toBe(s);
    });

    it('markPath interpolates a single finger path', () => {
        const s = createCoverageState(4, 4);
        const s2 = markPath(s, [
            { x: 0, y: 0, pointerId: 1 },
            { x: 1, y: 1, pointerId: 1 },
        ]);
        expect(coveredCount(s2)).toBe(4);
    });

    it('consecutive batches from one pointer fill between them', () => {
        let s = createCoverageState(10, 10);
        s = coverageReducer(s, { type: 'markPath', samples: [{ x: 0.05, y: 0.05, pointerId: 1 }] });
        s = coverageReducer(s, { type: 'markPath', samples: [{ x: 0.95, y: 0.95, pointerId: 1 }] });
        expect(coveredCount(s)).toBe(10);
        for (let i = 0; i < 10; i += 1) {
            expect(s.grid.hit[i * 10 + i]).toBe(true);
        }
    });

    it('end forgets last cell so next touch does not connect', () => {
        let s = createCoverageState(10, 10);
        s = coverageReducer(s, { type: 'markPath', samples: [{ x: 0.05, y: 0.05, pointerId: 1 }] });
        s = coverageReducer(s, { type: 'end', pointerId: 1 });
        s = coverageReducer(s, { type: 'markPath', samples: [{ x: 0.95, y: 0.95, pointerId: 1 }] });
        expect(coveredCount(s)).toBe(2);
    });

    it('interleaved pointers across batches never connect', () => {
        let s = createCoverageState(10, 10);
        s = coverageReducer(s, { type: 'markPath', samples: [{ x: 0.05, y: 0.05, pointerId: 1 }] });
        s = coverageReducer(s, { type: 'markPath', samples: [{ x: 0.95, y: 0.95, pointerId: 2 }] });
        expect(coveredCount(s)).toBe(2);
    });

    it('coverageReducer reset/markPath', () => {
        let s = createCoverageState(2, 2);
        s = coverageReducer(s, { type: 'reset', rows: 3, cols: 3 });
        expect(s.grid.rows * s.grid.cols).toBe(9);
        s = coverageReducer(s, { type: 'markPath', samples: [{ x: 0.5, y: 0.5, pointerId: 1 }] });
        expect(coveredCount(s)).toBe(1);
        const before = coveredCount(s);
        s = coverageReducer(s, { type: 'markPath', samples: [{ x: 0, y: 0, pointerId: 1 }, { x: 1, y: 1, pointerId: 1 }] });
        expect(coveredCount(s)).toBeGreaterThanOrEqual(before);
    });

    it('coverageRatio reaches 1 when all cells covered', () => {
        const s = createCoverageState(2, 2);
        const samples: NormalizedPoint[] = [
            { x: 0.25, y: 0.25, pointerId: 1 },
            { x: 0.75, y: 0.25, pointerId: 1 },
            { x: 0.25, y: 0.75, pointerId: 1 },
            { x: 0.75, y: 0.75, pointerId: 1 },
        ];
        const s2 = markPath(s, samples);
        expect(coverageRatio(s2)).toBe(1);
    });
});

    it('pointToCell returns null for y out of range', () => {
        expect(pointToCell(0, -0.1, 2, 2)).toBeNull();
        expect(pointToCell(0, 1.1, 2, 2)).toBeNull();
    });

    it('coverageRatio returns 0 for empty grid', () => {
        const g = createCoverageGrid(0, 0);
        expect(coverageRatio(g)).toBe(0);
    });

describe('pointer tracker', () => {
    const sample = (id: number, type: PointerSample['pointerType'] = 'touch'): PointerSample => ({
        pointerId: id,
        x: id * 10,
        y: id * 10,
        pointerType: type,
        timestamp: 1000 + id,
    });

    it('starts empty', () => {
        const s = createPointerTracker();
        expect(s.active.size).toBe(0);
        expect(s.maxSimultaneous).toBe(0);
    });

    it('down adds and updates max', () => {
        let s = createPointerTracker();
        s = pointerTrackerReducer(s, { type: 'down', sample: sample(1) });
        expect(s.active.size).toBe(1);
        expect(s.maxSimultaneous).toBe(1);
        s = pointerTrackerReducer(s, { type: 'down', sample: sample(2) });
        expect(s.active.size).toBe(2);
        expect(s.maxSimultaneous).toBe(2);
    });

    it('max stays after removal', () => {
        let s = createPointerTracker();
        s = pointerTrackerReducer(s, { type: 'down', sample: sample(1) });
        s = pointerTrackerReducer(s, { type: 'down', sample: sample(2) });
        s = pointerTrackerReducer(s, { type: 'up', pointerId: 1 });
        expect(s.active.size).toBe(1);
        expect(s.maxSimultaneous).toBe(2);
    });

    it('move updates existing only', () => {
        let s = createPointerTracker();
        s = pointerTrackerReducer(s, { type: 'down', sample: sample(1) });
        const moved = { ...sample(1), x: 999 };
        s = pointerTrackerReducer(s, { type: 'move', sample: moved });
        expect(s.active.get(1)?.x).toBe(999);
        const beforeSize = s.active.size;
        s = pointerTrackerReducer(s, { type: 'move', sample: sample(99) });
        expect(s.active.size).toBe(beforeSize);
    });

    it('cancel and clear', () => {
        let s = createPointerTracker();
        s = pointerTrackerReducer(s, { type: 'down', sample: sample(1) });
        s = pointerTrackerReducer(s, { type: 'cancel', pointerId: 1 });
        expect(s.active.size).toBe(0);
        s = pointerTrackerReducer(s, { type: 'down', sample: sample(2) });
        s = pointerTrackerReducer(s, { type: 'clear' });
        expect(s.active.size).toBe(0);
    });

    it('up on unknown pointer is no-op', () => {
        const s0 = createPointerTracker();
        const s = pointerTrackerReducer(s0, { type: 'up', pointerId: 42 });
        expect(s).toBe(s0);
    });

    it('clear preserves maxSimultaneous', () => {
        let s = createPointerTracker();
        s = pointerTrackerReducer(s, { type: 'down', sample: sample(1) });
        s = pointerTrackerReducer(s, { type: 'clear' });
        expect(s.maxSimultaneous).toBe(1);
    });

    it('pen pointer type accepted', () => {
        const s0 = createPointerTracker();
        const s = pointerTrackerReducer(s0, { type: 'down', sample: sample(7, 'pen') });
        expect(s.active.get(7)?.pointerType).toBe('pen');
    });
});

describe('support', () => {
    it('isTouchSupported', () => {
        expect(isTouchSupported(0)).toBe(false);
        expect(isTouchSupported(5)).toBe(true);
    });
});
