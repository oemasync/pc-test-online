import { describe, it, expect } from 'vitest';
import {
    createCoverageGrid,
    markCell,
    pointToCell,
    lineCells,
    markPoint,
    markPath,
    coveredCount,
    totalCells,
    coverageRatio,
    isFullyCovered,
    coverageReducer,
    createPointerTracker,
    pointerTrackerReducer,
    isTouchPointer,
    isPenPointer,
    isTouchSupported,
    isReported,
    clampTilt,
    addPointer,
    movePointer,
    removePointer,
    activeCount,
    getPointer,
    maxSimultaneousValue,
    type PointerSample,
} from '../logic';

describe('coverage grid', () => {
    it('creates grid with all cells false', () => {
        const g = createCoverageGrid(2, 3);
        expect(g.rows).toBe(2);
        expect(g.cols).toBe(3);
        expect(totalCells(g)).toBe(6);
        expect(coveredCount(g)).toBe(0);
        for (const v of g.hit) expect(v).toBe(false);
    });

    it('handles non-positive dims', () => {
        const g = createCoverageGrid(0, 5);
        expect(totalCells(g)).toBe(0);
        expect(coverageRatio(g)).toBe(0);
        expect(isFullyCovered(g)).toBe(false);
    });

    it('markCell marks in-bounds cell', () => {
        const g = createCoverageGrid(2, 2);
        const g2 = markCell(g, 0, 1);
        expect(coveredCount(g2)).toBe(1);
        // original unchanged
        expect(coveredCount(g)).toBe(0);
    });

    it('markCell ignores out-of-bounds', () => {
        const g = createCoverageGrid(2, 2);
        const g2 = markCell(g, 5, 5);
        expect(coveredCount(g2)).toBe(0);
    });

    it('pointToCell maps coordinates', () => {
        expect(pointToCell(0, 0, 100, 100, 2, 2)).toEqual({ row: 0, col: 0 });
        expect(pointToCell(99, 99, 100, 100, 2, 2)).toEqual({ row: 1, col: 1 });
        expect(pointToCell(50, 50, 100, 100, 2, 2)).toEqual({ row: 1, col: 1 });
    });

    it('pointToCell returns null outside or invalid', () => {
        expect(pointToCell(-1, 0, 100, 100, 2, 2)).toBeNull();
        expect(pointToCell(0, 0, 0, 100, 2, 2)).toBeNull();
        expect(pointToCell(0, 0, 100, 100, 0, 2)).toBeNull();
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

    it('markPoint marks single cell', () => {
        const g = createCoverageGrid(4, 4);
        const g2 = markPoint(g, 10, 10, 100, 100);
        expect(coveredCount(g2)).toBe(1);
    });

    it('markPath interpolates between sparse points', () => {
        const g = createCoverageGrid(4, 4);
        // two corner points; interpolation should cover diagonal cells
        const g2 = markPath(g, [{ x: 0, y: 0 }, { x: 99, y: 99 }], 100, 100);
        expect(coveredCount(g2)).toBeGreaterThan(1);
    });

    it('markPath with empty points returns clone unchanged', () => {
        const g = createCoverageGrid(2, 2);
        const g2 = markPath(g, [], 100, 100);
        expect(coveredCount(g2)).toBe(0);
    });

    it('coverageRatio and isFullyCovered', () => {
        const g = createCoverageGrid(2, 2);
        expect(coverageRatio(g)).toBe(0);
        let g2 = g;
        for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) g2 = markCell(g2, r, c);
        expect(coverageRatio(g2)).toBe(1);
        expect(isFullyCovered(g2)).toBe(true);
    });

    it('coverageReducer reset/markCell/markPoint/markPath', () => {
        let g = createCoverageGrid(2, 2);
        g = coverageReducer(g, { type: 'reset', rows: 3, cols: 3 });
        expect(totalCells(g)).toBe(9);
        g = coverageReducer(g, { type: 'markCell', row: 1, col: 1 });
        expect(coveredCount(g)).toBe(1);
        g = coverageReducer(g, { type: 'markPoint', x: 0, y: 0, width: 300, height: 300 });
        expect(coveredCount(g)).toBe(2);
        const before = coveredCount(g);
        g = coverageReducer(g, { type: 'markPath', points: [{ x: 0, y: 0 }, { x: 299, y: 299 }], width: 300, height: 300 });
        expect(coveredCount(g)).toBeGreaterThanOrEqual(before);
    });
});

describe('pointer tracker', () => {
    const sample = (id: number, type = 'touch'): PointerSample => ({
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
        expect(getPointer(s.active, 1)?.x).toBe(999);
        // move for unknown id ignored
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

    it('standalone helpers', () => {
        let m = new Map<number, PointerSample>();
        m = addPointer(m, sample(1));
        expect(activeCount(m)).toBe(1);
        m = movePointer(m, { ...sample(1), x: 5 });
        expect(getPointer(m, 1)?.x).toBe(5);
        m = removePointer(m, 1);
        expect(activeCount(m)).toBe(0);
        expect(maxSimultaneousValue(1, 3)).toBe(3);
        expect(maxSimultaneousValue(3, 1)).toBe(3);
    });
});

describe('helpers', () => {
    it('pointer type classification', () => {
        expect(isTouchPointer('touch')).toBe(true);
        expect(isTouchPointer('pen')).toBe(false);
        expect(isPenPointer('pen')).toBe(true);
    });

    it('isTouchSupported', () => {
        expect(isTouchSupported(0)).toBe(false);
        expect(isTouchSupported(5)).toBe(true);
    });

    it('isReported', () => {
        expect(isReported(undefined)).toBe(false);
        expect(isReported(null)).toBe(false);
        expect(isReported(0)).toBe(true);
    });

    it('clampTilt', () => {
        expect(clampTilt(200)).toBe(90);
        expect(clampTilt(-200)).toBe(-90);
        expect(clampTilt(30)).toBe(30);
    });
});
