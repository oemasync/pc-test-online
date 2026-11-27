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

export interface Cell {
    row: number;
    col: number;
}

export interface CoverageGrid {
    rows: number;
    cols: number;
    hit: boolean[];
}

export interface CoverageState {
    grid: CoverageGrid;
    lastCell: Map<number, Cell>;
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
    return {
        rows,
        cols,
        hit: new Array<boolean>(rows * cols).fill(false),
    };
}

export function createCoverageState(rows: number, cols: number): CoverageState {
    return {
        grid: createCoverageGrid(rows, cols),
        lastCell: new Map<number, Cell>(),
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
    state: CoverageState,
    samples: ReadonlyArray<NormalizedPoint>,
): CoverageState {
    if (samples.length === 0) return state;

    const grid = { rows: state.grid.rows, cols: state.grid.cols, hit: state.grid.hit.slice() };
    const lastCell = new Map(state.lastCell);

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

    for (const [pointerId, group] of byId) {
        let prevCell = lastCell.get(pointerId) ?? null;
        for (const point of group) {
            const cell = pointToCell(point.x, point.y, grid.rows, grid.cols);
            if (!cell) {
                prevCell = null;
                continue;
            }
            grid.hit[cell.row * grid.cols + cell.col] = true;
            if (prevCell) {
                const cells = lineCells(prevCell.row, prevCell.col, cell.row, cell.col);
                for (const [r, c] of cells) {
                    grid.hit[r * grid.cols + c] = true;
                }
            }
            prevCell = cell;
        }
        if (prevCell) lastCell.set(pointerId, prevCell);
    }
    return { grid, lastCell };
}

export function coveredCount(state: CoverageGrid | CoverageState): number {
    const grid = 'grid' in state ? state.grid : state;
    let count = 0;
    for (const v of grid.hit) if (v) count += 1;
    return count;
}

export function coverageRatio(state: CoverageGrid | CoverageState): number {
    const grid = 'grid' in state ? state.grid : state;
    const total = grid.rows * grid.cols;
    if (total === 0) return 0;
    return coveredCount(grid) / total;
}

// ---------- Reducer for coverage ----------

export type CoverageAction =
    | { type: 'reset'; rows: number; cols: number }
    | { type: 'markPath'; samples: ReadonlyArray<NormalizedPoint> }
    | { type: 'end'; pointerId: number };

export function coverageReducer(state: CoverageState, action: CoverageAction): CoverageState {
    switch (action.type) {
        case 'reset':
            return createCoverageState(action.rows, action.cols);
        case 'markPath':
            return markPath(state, action.samples);
        case 'end': {
            const lastCell = new Map(state.lastCell);
            lastCell.delete(action.pointerId);
            return { grid: state.grid, lastCell };
        }
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
