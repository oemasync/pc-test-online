import { describe, it, expect } from 'vitest';
import {
    createCoverageGrid,
    pointToCell,
    lineCells,
    markPath,
    coveredCount,
    coverageRatio,
    isFullyCovered,
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

    it('handles non-positive dims', () => {
        const g = createCoverageGrid(0, 5);
        expect(g.rows * g.cols).toBe(0);
        expect(coverageRatio(g)).toBe(0);
        expect(isFullyCovered(g)).toBe(false);
    });

    it('pointToCell maps normalized coordinates', () => {
        expect(pointToCell(0, 0, 2, 2)).toEqual({ row: 0, col: 0 });
        expect(pointToCell(0.99, 0.99, 2, 2)).toEqual({ row: 1, col: 1 });
        expect(pointToCell(0.5, 0.5, 2, 2)).toEqual({ row: 1, col: 1 });
    });

    it('pointToCell returns null outside or invalid', () => {
        expect(pointToCell(-0.1, 0, 2, 2)).toBeNull();
        expect(pointToCell(0, 0, 0, 2)).toBeNull();
        expect(pointToCell(0, 0, 2, 0)).toBeNull();
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
        const g = createCoverageGrid(24, 40);
        const samples: NormalizedPoint[] = [];
        for (let i = 0; i < 100; i += 1) {
            samples.push({ x: i / 99, y: (i % 2 === 0 ? 0.1 : 0.9), pointerId: 1 });
        }
        const g2 = markPath(g, samples);
        expect(coveredCount(g2)).toBeGreaterThan(40);
    });

    it('two simultaneous pointers far apart do not fill between them', () => {
        const g = createCoverageGrid(10, 10);
        const samples: NormalizedPoint[] = [
            { x: 0.05, y: 0.05, pointerId: 1 },
            { x: 0.95, y: 0.95, pointerId: 2 },
        ];
        const g2 = markPath(g, samples);
        expect(coveredCount(g2)).toBe(2);
    });

    it('markPath with empty samples returns clone unchanged', () => {
        const g = createCoverageGrid(2, 2);
        const g2 = markPath(g, []);
        expect(coveredCount(g2)).toBe(0);
    });

    it('markPath interpolates a single finger path', () => {
        const g = createCoverageGrid(4, 4);
        const g2 = markPath(g, [
            { x: 0, y: 0, pointerId: 1 },
            { x: 1, y: 1, pointerId: 1 },
        ]);
        expect(coveredCount(g2)).toBeGreaterThan(1);
    });

    it('coverageReducer reset/markCell/markPoint/markPath', () => {
        let g = createCoverageGrid(2, 2);
        g = coverageReducer(g, { type: 'reset', rows: 3, cols: 3 });
        expect(g.rows * g.cols).toBe(9);
        g = coverageReducer(g, { type: 'markCell', row: 1, col: 1 });
        expect(coveredCount(g)).toBe(1);
        g = coverageReducer(g, { type: 'markPoint', x: 0, y: 0 });
        expect(coveredCount(g)).toBe(2);
        const before = coveredCount(g);
        g = coverageReducer(g, { type: 'markPath', samples: [{ x: 0, y: 0 }, { x: 1, y: 1 }] });
        expect(coveredCount(g)).toBeGreaterThanOrEqual(before);
    });

    it('coverageRatio and isFullyCovered', () => {
        const g = createCoverageGrid(2, 2);
        expect(coverageRatio(g)).toBe(0);
        let g2 = g;
        g2 = coverageReducer(g2, { type: 'markCell', row: 0, col: 0 });
        g2 = coverageReducer(g2, { type: 'markCell', row: 0, col: 1 });
        g2 = coverageReducer(g2, { type: 'markCell', row: 1, col: 0 });
        g2 = coverageReducer(g2, { type: 'markCell', row: 1, col: 1 });
        expect(coverageRatio(g2)).toBe(1);
        expect(isFullyCovered(g2)).toBe(true);
    });
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
