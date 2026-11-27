// Framework-free logic for the touch test module.
// No Vue imports, no src/core imports.

export type PointerType = 'mouse' | 'pen' | 'touch';

export interface PointerSample {
    pointerId: number;
    x: number;
    y: number;
    pressure?: number;
    tiltX?: number;
    tiltY?: number;
    width?: number;
    height?: number;
    pointerType: PointerType;
    timestamp: number;
}

export interface NormalizedPoint {
    x: number;
    y: number;
    pointerId: number;
}

export interface CoverageGrid {
    rows: number;
    cols: number;
    hit: boolean[];
}

export interface PointerTrackerState {
    active: Map<number, PointerSample>;
    maxSimultaneous: number;
}

// ---------- Support ----------

export function isTouchSupported(maxTouchPoints: number): boolean {
    return maxTouchPoints > 0;
}

// ---------- Coverage grid ----------

export function createCoverageGrid(rows: number, cols: number): CoverageGrid {
    const r = rows > 0 ? rows : 0;
    const c = cols > 0 ? cols : 0;
    return {
        rows: r,
        cols: c,
        hit: new Array<boolean>(r * c).fill(false),
    };
}

function cloneGrid(grid: CoverageGrid): CoverageGrid {
    return { rows: grid.rows, cols: grid.cols, hit: grid.hit.slice() };
}

export function pointToCell(
    x: number,
    y: number,
    rows: number,
    cols: number,
): { row: number; col: number } | null {
    if (rows <= 0 || cols <= 0) return null;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    const col = Math.min(cols - 1, Math.floor(x * cols));
    const row = Math.min(rows - 1, Math.floor(y * rows));
    return { row, col };
}

export function lineCells(
    r0: number,
    c0: number,
    r1: number,
    c1: number,
): Array<[number, number]> {
    const cells: Array<[number, number]> = [];
    const dr = Math.abs(r1 - r0);
    const dc = Math.abs(c1 - c0);
    const sr = r0 < r1 ? 1 : r0 > r1 ? -1 : 0;
    const sc = c0 < c1 ? 1 : c0 > c1 ? -1 : 0;
    let err = dr - dc;
    const maxSteps = dr + dc + 1;
    let r = r0;
    let c = c0;
    for (let step = 0; step < maxSteps; step += 1) {
        cells.push([r, c]);
        if (r === r1 && c === c1) break;
        const e2 = 2 * err;
        if (e2 > -dc) {
            err -= dc;
            r += sr;
        }
        if (e2 < dr) {
            err += dr;
            c += sc;
        }
    }
    return cells;
}

export function markPath(
    grid: CoverageGrid,
    samples: ReadonlyArray<NormalizedPoint>,
): CoverageGrid {
    if (samples.length === 0) return grid; // same grid, no clone

    const next = cloneGrid(grid);

    // Group by pointer so interpolation never crosses fingers.
    const byId = new Map<number, NormalizedPoint[]>();
    for (const s of samples) {
        const existing = byId.get(s.pointerId);
        if (existing) {
            existing.push(s);
        } else {
            byId.set(s.pointerId, [s]);
        }
    }

    for (const group of byId.values()) {
        let prevCell: { row: number; col: number } | null = null;
        for (const point of group) {
            const cell = pointToCell(point.x, point.y, next.rows, next.cols);
            if (!cell) {
                prevCell = null;
                continue;
            }
            next.hit[cell.row * next.cols + cell.col] = true;
            if (prevCell) {
                const cells = lineCells(prevCell.row, prevCell.col, cell.row, cell.col);
                for (const [r, c] of cells) {
                    next.hit[r * next.cols + c] = true;
                }
            }
            prevCell = cell;
        }
    }
    return next;
}

export function coveredCount(grid: CoverageGrid): number {
    let count = 0;
    for (const v of grid.hit) if (v) count += 1;
    return count;
}

export function coverageRatio(grid: CoverageGrid): number {
    const total = grid.rows * grid.cols;
    if (total === 0) return 0;
    return coveredCount(grid) / total;
}

// ---------- Reducer for coverage ----------

export type CoverageAction =
    | { type: 'reset'; rows: number; cols: number }
    | { type: 'markPath'; samples: ReadonlyArray<NormalizedPoint> };

export function coverageReducer(grid: CoverageGrid, action: CoverageAction): CoverageGrid {
    switch (action.type) {
        case 'reset':
            return createCoverageGrid(action.rows, action.cols);
        case 'markPath':
            return markPath(grid, action.samples);
        default: {
            const exhaustive: never = action;
            throw new Error(`Unhandled coverage action: ${String(exhaustive)}`);
        }
    }
}

// ---------- Active pointer tracker + max simultaneous ----------

export function createPointerTracker(): PointerTrackerState {
    return { active: new Map<number, PointerSample>(), maxSimultaneous: 0 };
}

export type PointerTrackerAction =
    | { type: 'down'; sample: PointerSample }
    | { type: 'move'; sample: PointerSample }
    | { type: 'up'; pointerId: number }
    | { type: 'cancel'; pointerId: number }
    | { type: 'clear' };

export function pointerTrackerReducer(
    state: PointerTrackerState,
    action: PointerTrackerAction,
): PointerTrackerState {
    switch (action.type) {
        case 'down': {
            const active = new Map(state.active);
            active.set(action.sample.pointerId, action.sample);
            const maxSimultaneous =
                active.size > state.maxSimultaneous ? active.size : state.maxSimultaneous;
            return { active, maxSimultaneous };
        }
        case 'move': {
            if (!state.active.has(action.sample.pointerId)) return state;
            const active = new Map(state.active);
            active.set(action.sample.pointerId, action.sample);
            return { active, maxSimultaneous: state.maxSimultaneous };
        }
        case 'up':
        case 'cancel': {
            if (!state.active.has(action.pointerId)) return state;
            const active = new Map(state.active);
            active.delete(action.pointerId);
            return { active, maxSimultaneous: state.maxSimultaneous };
        }
        case 'clear': {
            return { active: new Map<number, PointerSample>(), maxSimultaneous: state.maxSimultaneous };
        }
        default: {
            const exhaustive: never = action;
            throw new Error(`Unhandled pointer action: ${String(exhaustive)}`);
        }
    }
}
